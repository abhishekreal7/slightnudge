import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { applyPendingSourceEdit, createPendingSourceEdit, getSourceUndoOutcome, undoReviewedSourceEdit, readHistory, recordSourceEdit } from '../lib/slightnudge/edit-history';
import { POST as undoPOST } from '../app/api/slightnudge/undo/route';
import { POST as statusPOST } from '../app/api/slightnudge/undo/status/route';
import { getSessionToken } from '../lib/slightnudge/auth';

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-undo-recovery-'));
process.env.SLIGHTNUDGE_TEST = '1';
process.env.SLIGHTNUDGE_WORKSPACE_ROOT = workspace;
process.env.SLIGHTNUDGE_DATA_DIR = path.join(workspace, '.slightnudge');
process.env.PORT = '3000';
const file = path.join(workspace, 'page.tsx');
const original = 'export default function Page() { return <h1>Original</h1>; }\n';
const first = original.replace('Original', 'First');
const second = original.replace('Original', 'Second');
const prepare = (before: string, after: string) => {
  const pending = createPendingSourceEdit({ filePath: file, before, after, summary: 'Change heading', oldValue: before, newValue: after, previewType: 'textContent' });
  assert.ok(pending.changed); return pending.id;
};
const request = (previewId: string) => new Request('http://127.0.0.1:3000/api/slightnudge/undo', {
  method: 'POST', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000', 'content-type': 'application/json', 'x-slightnudge-token': getSessionToken() }, body: JSON.stringify({ previewId }),
});
try {
  fs.writeFileSync(file, original);
  const older = prepare(original, first); assert.equal((await applyPendingSourceEdit(older)).success, true);
  const newer = prepare(first, second); assert.equal((await applyPendingSourceEdit(newer)).success, true);
  assert.equal((await (await undoPOST(request(newer))).json()).success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), first);
  // The response was lost: a repeated request still names the same accepted edit.
  assert.equal((await (await undoPOST(request(newer))).json()).success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), first, 'A repeated Undo must never fall through to an older edit');
  assert.equal(readHistory()[0].status, 'applied');
  assert.equal(readHistory()[1].status, 'undone');
  console.log('PASS: duplicate bound Undo retains the older accepted edit');
  const unbound = request(newer);
  const missing = new Request(unbound, { body: '{}' });
  assert.equal((await (await undoPOST(missing)).json()).code, 'UNDO_TARGET_REQUIRED');
  assert.equal(fs.readFileSync(file, 'utf8'), first);
  assert.equal((await statusPOST(request(newer))).headers.get('cache-control'), 'no-store');
  for (const handler of [undoPOST, statusPOST]) {
    for (const [header, value] of [['x-slightnudge-token', 'wrong'], ['origin', 'http://evil.test'], ['host', 'evil.test']]) {
      const denied = request(older); denied.headers.set(header, value);
      assert.equal((await handler(denied)).status, 403);
      assert.equal(fs.readFileSync(file, 'utf8'), first);
    }
  }
  assert.equal(getSourceUndoOutcome(older).code, 'UNDO_NOT_APPLIED');
  assert.equal(getSourceUndoOutcome(randomUUID()).code, 'UNDO_UNKNOWN');
  assert.equal(undoReviewedSourceEdit(older, { editId: randomUUID() }).code, 'UNDO_TARGET_CHANGED');
  assert.equal(undoReviewedSourceEdit(older, { repositoryId: 'another-project' }).code, 'OUTCOME_SCOPE_MISMATCH');
  assert.equal(undoReviewedSourceEdit(older).success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  fs.writeFileSync(file, original + '// Later outside change\n');
  assert.equal(getSourceUndoOutcome(newer).sourceCurrent, false);
  assert.equal(undoReviewedSourceEdit(newer).success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), original + '// Later outside change\n');
  console.log('PASS: required target, authorization, scope, read-only status, and historical receipts');

  for (const tokenUndo of [false, true]) {
    for (const phase of ['before-source', 'source-written', 'history-written', 'outside-change']) {
      const root = path.join(workspace, `${tokenUndo ? 'token' : 'exact'}-${phase}`);
      fs.mkdirSync(root);
      process.env.SLIGHTNUDGE_WORKSPACE_ROOT = root;
      process.env.SLIGHTNUDGE_DATA_DIR = path.join(root, '.slightnudge');
      const target = path.join(root, 'page.tsx');
      const before = 'export default function Page() { return <h1 id="target" className="text-sm">Title</h1>; }\n';
      const after = before.replace('text-sm', 'text-lg');
      fs.writeFileSync(target, before);
      const proposal = createPendingSourceEdit({ filePath: target, before, after, summary: 'Resize heading', oldValue: 'text-sm', newValue: 'text-lg', previewType: 'className', line: 1, tagName: 'h1' });
      assert.ok(proposal.changed);
      assert.equal((await applyPendingSourceEdit(proposal.id)).success, true);
      const outside = tokenUndo ? '// Preserve this outside edit\n' : '';
      fs.writeFileSync(target, after + outside);
      const crashed = spawnSync(process.execPath, ['--import', 'tsx', 'test/helpers/undo-crash-worker.ts', phase === 'outside-change' ? 'source-written' : phase, proposal.id, target], { env: process.env, encoding: 'utf8', timeout: 30000 });
      assert.equal(crashed.status, 74, crashed.stderr || crashed.stdout);
      assert.equal(readHistory()[0].status, phase === 'history-written' ? 'undone' : 'undoing');
      if (phase === 'outside-change') fs.writeFileSync(target, before + outside + '// Conflict after interruption\n');
      const source = fs.readFileSync(target, 'utf8');
      const outcome = getSourceUndoOutcome(proposal.id);
      assert.equal(fs.readFileSync(target, 'utf8'), source, 'Status must never write source');
      if (phase === 'before-source') {
        assert.equal(outcome.code, 'UNDO_NOT_APPLIED');
        assert.equal(source, after + outside);
        assert.equal(readHistory()[0].status, 'applied');
        assert.equal(undoReviewedSourceEdit(proposal.id).success, true, 'An explicit retry can perform the unwritten Undo');
      } else if (phase === 'outside-change') {
        assert.equal(outcome.code, 'UNDO_RECOVERY_REQUIRED');
        const later = createPendingSourceEdit({ filePath: target, before: source, after: source + '// Later\n', summary: 'Later edit', oldValue: '', newValue: '', previewType: 'textContent' });
        assert.ok(later.changed);
        assert.equal((await applyPendingSourceEdit(later.id)).success, false, 'Unresolved Undo must block a later source write');
        assert.equal(fs.readFileSync(target, 'utf8'), source);
        fs.writeFileSync(target, before + outside); // Explicitly resolve the conflict owned by this test.
        assert.equal(getSourceUndoOutcome(proposal.id).success, true);
      } else {
        assert.equal(outcome.success, true);
        assert.equal(outcome.sourceCurrent, true);
        assert.equal(source, before + outside);
      }
      assert.equal(undoReviewedSourceEdit(proposal.id).success, true);
      assert.equal(fs.readFileSync(target, 'utf8'), before + outside);
      assert.equal(readHistory().length, 1);
      assert.equal(readHistory()[0].status, 'undone');
    }
  }
  console.log('PASS: eight real process-exit cases; exact and token Undo preserve outside edits, recover receipts, and block conflicts');

  const groupedRoot = path.join(workspace, 'grouped'); fs.mkdirSync(groupedRoot);
  process.env.SLIGHTNUDGE_WORKSPACE_ROOT = groupedRoot;
  process.env.SLIGHTNUDGE_DATA_DIR = path.join(groupedRoot, '.slightnudge');
  const groupedFile = path.join(groupedRoot, 'page.tsx'); fs.writeFileSync(groupedFile, original);
  const group = randomUUID();
  const acceptGrouped = async (before: string, after: string) => {
    const proposal = createPendingSourceEdit({ filePath: groupedFile, before, after, summary: 'Grouped edit', oldValue: before, newValue: after, previewType: 'textContent' });
    assert.ok(proposal.changed); assert.equal((await applyPendingSourceEdit(proposal.id, group)).success, true); return proposal.id;
  };
  const firstGrouped = await acceptGrouped(original, first);
  const lastGrouped = await acceptGrouped(first, second);
  assert.equal(undoReviewedSourceEdit(firstGrouped).code, 'UNDO_TARGET_CHANGED');
  assert.equal(fs.readFileSync(groupedFile, 'utf8'), second);
  assert.equal(undoReviewedSourceEdit(lastGrouped).success, true);
  assert.equal(fs.readFileSync(groupedFile, 'utf8'), original);
  console.log('PASS: an obsolete proposal cannot Undo an extended edit group');
  const retentionRoot = path.join(workspace, 'retention'); fs.mkdirSync(retentionRoot);
  process.env.SLIGHTNUDGE_WORKSPACE_ROOT = retentionRoot;
  process.env.SLIGHTNUDGE_DATA_DIR = path.join(retentionRoot, '.slightnudge');
  const retainedFile = path.join(retentionRoot, 'page.tsx'); fs.writeFileSync(retainedFile, original);
  const retained = createPendingSourceEdit({ filePath: retainedFile, before: original, after: first, summary: 'Retained Undo', oldValue: 'Original', newValue: 'First', previewType: 'textContent' });
  assert.ok(retained.changed); assert.equal((await applyPendingSourceEdit(retained.id)).success, true);
  const retentionCrash = spawnSync(process.execPath, ['--import', 'tsx', 'test/helpers/undo-crash-worker.ts', 'source-written', retained.id, retainedFile], { env: process.env, encoding: 'utf8', timeout: 30000 });
  assert.equal(retentionCrash.status, 74, retentionCrash.stderr);
  const other = path.join(retentionRoot, 'other.tsx'); fs.writeFileSync(other, original);
  for (let index = 0; index < 105; index++) recordSourceEdit(other, original, first, `Other edit ${index}`);
  assert.equal(readHistory().some(record => record.previewIds?.includes(retained.id) && record.status === 'undoing'), true, 'History retention must pin unfinished Undo intents');
  assert.equal(getSourceUndoOutcome(retained.id).success, true);
  assert.equal(fs.readFileSync(retainedFile, 'utf8'), original);
  console.log('PASS: unrelated history growth preserves unfinished Undo recovery');
} finally {
  const resolved = path.resolve(workspace);
  assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith('sn-undo-recovery-'));
  fs.rmSync(resolved, { recursive: true, force: true });
}
