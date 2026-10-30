import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyPendingSourceEdit, createPendingSourceEdit, discardPendingSourceEdit, readHistory, setPreWriteTestHook, undoSourceEdit } from '../lib/slightnudge/edit-history';

// A fresh, throwaway source file; never the editor fixtures or user projects.
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-review-race-'));
const file = path.join(workspace, 'page.tsx');
process.env.SLIGHTNUDGE_TEST = '1';
process.env.SLIGHTNUDGE_WORKSPACE_ROOT = workspace;
process.env.SLIGHTNUDGE_DATA_DIR = path.join(workspace, '.slightnudge');
const before = 'export default function Page() { return <h1>Before</h1>; }\n';
const after = before.replace('>Before<', '>After<');
const external = before + '// Someone edited this while validation ran.\n';
const prepare = () => {
  const proposal = createPendingSourceEdit({ filePath: file, before, after, oldValue: 'Before', newValue: 'After', summary: 'Change heading', previewType: 'textContent', line: 1 });
  assert.ok(proposal.changed);
  return proposal.id;
};
try {
  fs.writeFileSync(file, before);
  const id = prepare();
  setPreWriteTestHook(target => fs.writeFileSync(target, external));
  const result = await applyPendingSourceEdit(id);
  assert.equal(result.success, false, 'An outside edit arriving after validation must refuse Apply');
  assert.equal(fs.readFileSync(file, 'utf8'), external, 'Apply must preserve the outside bytes');
  assert.equal(readHistory().length, 0, 'A refused Apply must not record a successful edit');
  setPreWriteTestHook(null);
  fs.writeFileSync(file, before);
  const clean = await applyPendingSourceEdit(prepare());
  assert.equal(clean.success, true, 'Unchanged source must still apply successfully');
  assert.equal(fs.readFileSync(file, 'utf8'), after);
  const undone = undoSourceEdit(file);
  assert.equal(undone.success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), before, 'Undo must restore the exact original source');
  const discardedId = prepare();
  const historyBeforeDiscard = readHistory().length;
  setPreWriteTestHook(() => discardPendingSourceEdit(discardedId));
  const cancelled = await applyPendingSourceEdit(discardedId);
  assert.equal(cancelled.success, false, 'Discard during validation must win before the source commit');
  assert.equal(cancelled.code, 'PREVIEW_EXPIRED');
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.equal(readHistory().length, historyBeforeDiscard);
  console.log('PASS: 4 Apply race cases (late outside edit, normal Apply, exact Undo, discard during validation; disposable source)');
} finally {
  setPreWriteTestHook(null);
  const resolved = path.resolve(workspace);
  assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith('sn-review-race-'));
  try { fs.rmSync(resolved, { recursive: true, force: true }); }
  catch { console.log(`Temporary source requires manual cleanup: ${resolved}`); }
}
