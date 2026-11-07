import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setupIsolatedEnv } from './helpers/test-server';
import { applyPendingSourceEdit, createPendingSourceEdit, readHistory, setPreWriteTestHook, undoSourceEdit } from '../lib/slightnudge/edit-history';

const before = 'export default function Page() { return <h1 id="target" className="p-2 font-normal">Title</h1>; }\n';
const after = before.replace('p-2', 'p-4');

async function withWorkspace(run: (root: string, target: string) => Promise<void>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-prewrite-cas-'));
  const modules = path.join(root, 'node_modules');
  fs.symlinkSync(path.resolve('node_modules'), modules, 'junction');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'cas-fixture', dependencies: { tailwindcss: '4.3.3' } }));
  fs.mkdirSync(path.join(root, 'app'));
  fs.writeFileSync(path.join(root, 'app/globals.css'), '@import "tailwindcss";\n');
  const target = path.join(root, 'page.tsx');
  fs.writeFileSync(target, before);
  const env = setupIsolatedEnv('sn-prewrite-cas-data', root);
  try {
    await run(root, target);
  } finally {
    setPreWriteTestHook(null);
    env.cleanup();
    assert.equal(fs.realpathSync(root), root);
    assert.equal(path.dirname(root), fs.realpathSync(os.tmpdir()));
    fs.unlinkSync(modules);
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function preview(target: string) {
  return createPendingSourceEdit({
    filePath: target, before, after, summary: 'p-2 to p-4', oldValue: 'p-2', newValue: 'p-4',
    line: 1, elementId: 'target', tagName: 'h1', previewType: 'className',
    oldClassName: 'p-2 font-normal', newClassName: 'p-4 font-normal', removedTokens: ['p-2'], addedTokens: ['p-4'],
  });
}

describe('Write-time compare-and-swap', () => {
  it('Apply preserves an external edit inserted after verification, without history or temporary source files', async () => {
    await withWorkspace(async (root, target) => {
      const pending = preview(target);
      const external = before + '// changed after verification\n';
      let fired = false;
      setPreWriteTestHook((file) => { fired = true; fs.writeFileSync(file, external); });
      const result = await applyPendingSourceEdit(pending.id!);
      assert.equal(fired, true, 'Guarded hook must run after verification');
      assert.equal(result.success, false, 'Apply must refuse the concurrent edit');
      assert.match(result.error || '', /changed/i);
      assert.equal(fs.readFileSync(target, 'utf8'), external);
      assert.equal(readHistory().length, 0);
      assert.deepEqual(fs.readdirSync(root).filter((file) => file.endsWith('.tmp')), []);
    });
  });

  for (const tokenUndo of [false, true]) {
    it(`${tokenUndo ? 'Token' : 'Exact'} undo preserves a concurrent edit and remains retryable`, async () => {
      await withWorkspace(async (root, target) => {
        const pending = preview(target);
        assert.equal((await applyPendingSourceEdit(pending.id!)).success, true);
        if (tokenUndo) fs.writeFileSync(target, after + '// earlier external edit\n');
        const external = after + '// concurrent external edit\n';
        let fired = false;
        setPreWriteTestHook((file) => { fired = true; fs.writeFileSync(file, external); });
        const result = undoSourceEdit('page.tsx');
        assert.equal(fired, true, 'Guarded hook must run immediately before the source write');
        assert.equal(result.success, false, 'Undo must refuse the concurrent edit');
        assert.match(result.error || '', /changed/i);
        assert.equal(fs.readFileSync(target, 'utf8'), external);
        assert.equal(readHistory().at(-1)?.status, 'applied', 'A refused undo must remain retryable');
        assert.deepEqual(fs.readdirSync(root).filter((file) => file.endsWith('.tmp')), []);
        setPreWriteTestHook(null);
        assert.equal(undoSourceEdit('page.tsx').success, true, 'Retry must undo only the recorded class token');
        assert.equal(fs.readFileSync(target, 'utf8'), before + '// concurrent external edit\n');
      });
    });
  }
});
