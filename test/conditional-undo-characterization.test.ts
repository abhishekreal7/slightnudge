import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setupIsolatedEnv } from './helpers/test-server';
import { inspectElement, updateStaticTailwindClass } from '../lib/slightnudge/ast-nudger';
import { applyPendingSourceEdit, createPendingSourceEdit, readHistory, undoSourceEdit } from '../lib/slightnudge/edit-history';

const heading = '<h1 id="target" className="p-2 text-sm">Title</h1>';
const sibling = '<h2 id="other" className="p-2 text-sm">Keep</h2>';
const cases = {
  ternary: `export default function Page() { const show = true; return <main>{show ? ${heading} : <p>Other</p>}${sibling}</main>; }\n`,
  and: `export default function Page() { const show = true; return <main>{show && ${heading}}${sibling}</main>; }\n`,
  if: `export default function Page() { const show = true; if (show) return <main>${heading}${sibling}</main>; return <p>Other</p>; }\n`,
  once: `function Title() { return ${heading}; } export default function Page() { return <main><Title/>${sibling}</main>; }\n`,
};

describe('Conditional ancestor apply and undo characterization', () => {
  for (const [name, original] of Object.entries(cases)) {
    for (const changed of [false, true]) {
      it(`${name}: ${changed ? 'external change permits token undo or manual refusal without a stuck record' : 'unchanged source undoes byte-identically'}`, async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-conditional-undo-'));
        const modules = path.join(root, 'node_modules');
        fs.symlinkSync(path.resolve('node_modules'), modules, 'junction');
        fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'conditional-fixture', dependencies: { tailwindcss: '4.3.3' } }));
        fs.mkdirSync(path.join(root, 'app'));
        fs.writeFileSync(path.join(root, 'app/globals.css'), '@import "tailwindcss";\n');
        const target = path.join(root, 'page.tsx');
        fs.writeFileSync(target, original);
        const env = setupIsolatedEnv('sn-conditional-data', root);
        try {
          const inspected = inspectElement({ filePath: target, elementId: 'target' });
          assert.equal(inspected.safeToEdit, true, inspected.reason || 'Selection must be editable');
          const style = updateStaticTailwindClass({ filePath: target, elementId: 'target', property: 'padding', value: 'p-4', dryRun: true });
          assert.equal(style.success, true);
          assert.ok(style.updatedSource && style.originalSource);
          const expected = original.replace('id="target" className="p-2 text-sm"', 'id="target" className="p-4 text-sm"');
          assert.equal(style.updatedSource, expected, 'Only the intended element class must change');
          const pending = createPendingSourceEdit({
            filePath: target, before: style.originalSource, after: style.updatedSource,
            summary: 'p-2 to p-4', oldValue: 'p-2', newValue: 'p-4', line: style.line,
            elementId: 'target', tagName: 'h1', previewType: 'className',
            oldClassName: style.oldClassName, newClassName: style.newClassName,
            addedTokens: ['p-4'], removedTokens: ['p-2'],
          });
          assert.equal((await applyPendingSourceEdit(pending.id!)).success, true);
          assert.equal(fs.readFileSync(target, 'utf8'), expected);
          const external = '\n// independent external text\n';
          if (changed) fs.writeFileSync(target, expected + external);
          const result = undoSourceEdit('page.tsx');
          if (!changed || result.success) {
            assert.equal(result.success, true, result.error || 'Undo must succeed');
            assert.equal(fs.readFileSync(target, 'utf8'), original + (changed ? external : ''));
            assert.equal(readHistory().at(-1)?.status, 'undone');
            console.log(`CONFIRMED ${name}: ${changed ? 'token undo preserved external text' : 'exact byte-identical undo'}`);
          } else {
            assert.equal(fs.readFileSync(target, 'utf8'), expected + external, 'Refusal must preserve all file bytes');
            assert.match(result.error || '', /Open page\.tsx near line/);
            assert.match(result.error || '', /remove "p-4" and restore "p-2"/);
            assert.equal(readHistory().at(-1)?.status, 'applied');
            fs.writeFileSync(target, expected);
            assert.equal(undoSourceEdit('page.tsx').success, true, 'Restoring the reviewed file permits retry');
            assert.equal(fs.readFileSync(target, 'utf8'), original);
            console.log(`CONFIRMED ${name}: manual refusal preserved external text and remained retryable`);
          }
        } finally {
          env.cleanup();
          assert.equal(fs.realpathSync(root), root);
          assert.equal(path.dirname(root), fs.realpathSync(os.tmpdir()));
          fs.unlinkSync(modules);
          fs.rmSync(root, { recursive: true, force: true });
        }
      });
    }
  }
});
