import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { POST } from '../app/api/slightnudge/preview/route';
import { applyPendingSourceEdit, getSourceApplyOutcome, readHistory, undoReviewedSourceEdit } from '../lib/slightnudge/edit-history';
import { getSessionToken } from '../lib/slightnudge/auth';

const previous = process.cwd();
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-continuous-draft-'));
process.env.SLIGHTNUDGE_TEST = '1'; process.env.SLIGHTNUDGE_WORKSPACE_ROOT = root;
process.env.SLIGHTNUDGE_DATA_DIR = path.join(root, '.slightnudge'); process.env.PORT = '3000';
try {
  fs.symlinkSync(path.join(previous, 'node_modules'), path.join(root, 'node_modules'), 'junction');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ private: true, dependencies: { tailwindcss: JSON.parse(fs.readFileSync(path.join(previous, 'node_modules/tailwindcss/package.json'), 'utf8')).version } }));
  fs.writeFileSync(path.join(root, 'styles.css'), '@import "tailwindcss";');
  process.chdir(root);
  const file = path.join(root, 'page.tsx');
  const before = 'export default function Page() { return <div><h1 id="heading" className="text-xl">Heading</h1><p id="paragraph" className="text-base">{"Original paragraph"}</p></div>; }\n';
  fs.writeFileSync(file, before);
  const preview = async (body: Record<string, unknown>) => {
    const response = await POST(new Request('http://127.0.0.1:3000/api/slightnudge/preview', { method: 'POST', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', 'content-type': 'application/json', 'x-slightnudge-token': getSessionToken() }, body: JSON.stringify({ filePath: 'page.tsx', draft: true, ...body }) }));
    return response.json();
  };
  const first = await preview({ kind: 'move', elementId: 'heading', x: 24, y: 16 }); assert.equal(first.success, true, first.error);
  const second = await preview({ kind: 'style', elementId: 'heading', property: 'fontWeight', value: 'font-bold', parentPreviewId: first.id }); assert.equal(second.success, true, second.error);
  const third = await preview({ kind: 'text', elementId: 'paragraph', value: 'Draft text with <symbols> & quotes', parentPreviewId: second.id }); assert.equal(third.success, true, third.error);
  assert.match(third.renderPatches.find((patch: any) => patch.before.elementId === 'heading').className, /font-bold/, 'Mixed drafts still replay and verify actual class edits');
  assert.equal(fs.readFileSync(file, 'utf8'), before, 'Multiple draft gestures leave source untouched');
  assert.equal(readHistory().length, 0);
  const saved = await applyPendingSourceEdit(third.id); assert.equal(saved.success, true, saved.error || 'Draft must save');
  const after = fs.readFileSync(file, 'utf8');
  assert.ok(after.includes('translate-x-[24px]') && after.includes('font-bold') && after.includes('Draft text'));
  assert.equal(readHistory().length, 1, 'One Save produces one receipt');
  assert.equal((await applyPendingSourceEdit(third.id)).success, true, 'Duplicate Save reconciles its original receipt');
  assert.equal(readHistory().length, 1);
  assert.equal(undoReviewedSourceEdit(third.id).success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), before, 'Saved batch Undo restores all targets');
  // Branch from the first revision, as draft Undo followed by a new gesture does.
  const branch = await preview({ kind: 'move', elementId: 'paragraph', x: 8, y: 4, parentPreviewId: first.id }); assert.equal(branch.success, true, branch.error);
  fs.appendFileSync(file, '// outside edit\n');
  const conflict = await applyPendingSourceEdit(branch.id); assert.equal(conflict.success, false); assert.equal(conflict.code, 'SOURCE_CHANGED');
  assert.equal(fs.readFileSync(file, 'utf8'), before + '// outside edit\n');
  assert.equal(getSourceApplyOutcome(branch.id)?.code, 'SOURCE_CHANGED', 'Conflicting draft remains recoverable');
  fs.writeFileSync(file, before);
  assert.equal((await applyPendingSourceEdit(branch.id)).success, true);
  const branched = fs.readFileSync(file, 'utf8');
  assert.ok(branched.includes('translate-x-[24px]') && branched.includes('translate-x-[8px]'));
  assert.ok(!branched.includes('font-bold') && !branched.includes('Draft text'));
  assert.equal(undoReviewedSourceEdit(branch.id).success, true);
  // Net-zero text drafts need no empty source save.
  const textOnly = await preview({ kind: 'text', elementId: 'paragraph', value: 'Temporary text' }); assert.equal(textOnly.success, true);
  const reset = await preview({ kind: 'text', elementId: 'paragraph', value: 'Original paragraph', parentPreviewId: textOnly.id });
  assert.equal(reset.success, true); assert.equal(reset.draftClean, true); assert.equal(reset.id, undefined);
  const unrelated = path.join(root, 'other.tsx'); fs.writeFileSync(unrelated, before);
  const wrongScope = await preview({ filePath: 'other.tsx', kind: 'move', elementId: 'heading', x: 8, y: 0, parentPreviewId: first.id }); assert.equal(wrongScope.success, undefined); assert.match(wrongScope.error, /different source/);
  const unsafe = await preview({ kind: 'style', elementId: 'heading', property: 'fontWeight', value: 'arbitrary-injection', parentPreviewId: first.id }); assert.ok(unsafe.error);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  const multiline = 'export default function Page(){return <p id="copy" className="text-base">\n  A clean &amp; focused\n  change.\n</p>;}';
  fs.writeFileSync(file, multiline);
  const copy = await preview({ kind: 'text', elementId: 'copy', value: 'Updated copy' });
  assert.equal(copy.success, true, copy.error);
  assert.equal(copy.renderPatches[0].beforeText, 'A clean & focused change.', 'Undo verifies rendered JSX text, not raw source indentation or entities');
  assert.equal(copy.renderPatches[0].text, 'Updated copy');
  assert.equal(copy.renderPatches[0].className, undefined, 'Text-only replay must not replace unchanged classes owned by runtime animations');
  assert.equal(copy.renderPatches[0].beforeClassName, undefined, 'Text-only Undo must not verify or rewrite unrelated runtime classes');
  assert.equal((await applyPendingSourceEdit(copy.id)).success, true);
  assert.equal(undoReviewedSourceEdit(copy.id).success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), multiline, 'Undo preserves the exact multiline original');
  console.log('PASS continuous draft: multi-target composition, immutable previews, one-save receipt, idempotent Save, batch Undo, branch after Undo, source-conflict preservation, scope/refusal guards, multiline JSX/entity render verification');
} finally {
  process.chdir(previous);
  assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(root).startsWith('sn-continuous-draft-'));
  if (fs.existsSync(path.join(root, 'node_modules'))) fs.unlinkSync(path.join(root, 'node_modules'));
  fs.rmSync(root, { recursive: true, force: true });
}
