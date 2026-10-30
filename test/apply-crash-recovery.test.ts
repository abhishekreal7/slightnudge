import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { applyPendingSourceEdit, createPendingSourceEdit, discardPendingSourceEdit, getSourceApplyOutcome, readHistory, undoSourceEdit } from '../lib/slightnudge/edit-history';

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-apply-crash-'));
process.env.SLIGHTNUDGE_TEST = '1';
process.env.SLIGHTNUDGE_WORKSPACE_ROOT = workspace;
process.env.SLIGHTNUDGE_DATA_DIR = path.join(workspace, '.slightnudge');
let file = path.join(workspace, 'page.tsx');
const before = 'export default function Page() { return <h1>Before</h1>; }\n';
const after = before.replace('>Before<', '>After<');
try {
  fs.writeFileSync(file, before);
  const proposal = createPendingSourceEdit({ filePath: file, before, after, oldValue: 'Before', newValue: 'After', summary: 'Change heading', previewType: 'textContent' });
  assert.ok(proposal.changed);
  const crashed = spawnSync(process.execPath, ['--import', 'tsx', 'test/helpers/apply-crash-worker.ts', 'source-written', proposal.id, file], { env: process.env, encoding: 'utf8', timeout: 30000 });
  assert.equal(crashed.status, 73, crashed.stderr);
  assert.equal(fs.readFileSync(file, 'utf8'), after, 'The child must actually exit after writing the source');
  assert.equal(readHistory().length, 0, 'The child exited before journaling the accepted edit');
  const recovered = getSourceApplyOutcome(proposal.id);
  assert.equal(recovered?.success, true, 'A fresh process must recover the written source and its missing Undo record');
  assert.equal(readHistory().length, 1);
  assert.equal((await applyPendingSourceEdit(proposal.id)).success, true);
  assert.equal(readHistory().length, 1);
  assert.equal(undoSourceEdit(file).success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  const setup = (name: string, context: { repositoryId?: string; sourcePath?: string } = {}) => {
    const root = path.join(workspace, name); fs.mkdirSync(root);
    file = path.join(root, 'page.tsx'); fs.writeFileSync(file, before);
    process.env.SLIGHTNUDGE_WORKSPACE_ROOT = root;
    process.env.SLIGHTNUDGE_DATA_DIR = path.join(root, '.slightnudge');
    const proposal = createPendingSourceEdit({ filePath: file, before, after, oldValue: 'Before', newValue: 'After', summary: 'Change heading', previewType: 'textContent', ...context });
    assert.ok(proposal.changed);
    return { root, id: proposal.id, file, context };
  };
  const crash = (scenario: ReturnType<typeof setup>, phase: string, groupId = '') => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'test/helpers/apply-crash-worker.ts', phase, scenario.id, scenario.file, scenario.context.repositoryId || '', scenario.context.sourcePath || '', groupId], { env: process.env, encoding: 'utf8', timeout: 30000 });
    assert.equal(result.status, 73, result.stderr);
  };
  const unwritten = setup('before-write'); crash(unwritten, 'before-source');
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.equal(getSourceApplyOutcome(unwritten.id)?.code, 'APPLY_NOT_APPLIED');
  assert.equal(readHistory().length, 0, 'Checking an unwritten intent must not create an accepted edit');
  assert.equal(fs.readFileSync(file, 'utf8'), before, 'Status must never replay the write');
  assert.equal((await applyPendingSourceEdit(unwritten.id)).success, true, 'Only a subsequent explicit Apply writes an unwritten intent');
  assert.equal(undoSourceEdit(file).success, true); assert.equal(fs.readFileSync(file, 'utf8'), before);
  const grouped = setup('grouped-recovery');
  const groupId = randomUUID();
  const first = await applyPendingSourceEdit(grouped.id, groupId);
  assert.equal(first.success, true);
  const third = after.replace('After', 'Third');
  const nextGrouped = createPendingSourceEdit({ filePath: file, before: after, after: third, oldValue: 'After', newValue: 'Third', summary: 'Change again', previewType: 'textContent' });
  assert.ok(nextGrouped.changed);
  crash({ ...grouped, id: nextGrouped.id }, 'source-written', groupId);
  assert.equal(getSourceApplyOutcome(nextGrouped.id)?.editId, first.editId);
  assert.equal(readHistory().length, 1, 'Recovery must preserve the accepted group rather than duplicate it');
  assert.equal(readHistory()[0].previewIds?.length, 2);
  assert.equal(undoSourceEdit(file).success, true); assert.equal(fs.readFileSync(file, 'utf8'), before);

  const independent = setup('other-file-history'); crash(independent, 'source-written');
  const independentFile = path.join(independent.root, 'other.tsx'); fs.writeFileSync(independentFile, before);
  const otherProposal = createPendingSourceEdit({ filePath: independentFile, before, after, oldValue: 'Before', newValue: 'After', summary: 'Other file edit', previewType: 'textContent' });
  assert.ok(otherProposal.changed);
  assert.equal((await applyPendingSourceEdit(otherProposal.id)).success, true);
  assert.equal(getSourceApplyOutcome(independent.id)?.success, true);
  assert.equal(readHistory().length, 2, 'Recovery must retain accepted edits to other files');
  assert.equal(undoSourceEdit(file).success, true); assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.equal(fs.readFileSync(independentFile, 'utf8'), after);

  const changedHistory = setup('changed-history'); crash(changedHistory, 'source-written');
  const changedHistoryPath = path.join(process.env.SLIGHTNUDGE_DATA_DIR!, 'history/edits.json');
  const outsideHistory = JSON.stringify([{ id: randomUUID(), filePath: 'page.tsx', before, after, summary: 'Outside history change', status: 'undone', createdAt: new Date().toISOString() }]);
  fs.writeFileSync(changedHistoryPath, outsideHistory);
  assert.equal(getSourceApplyOutcome(changedHistory.id)?.code, 'SOURCE_RECOVERY_REQUIRED');
  assert.equal(fs.readFileSync(changedHistoryPath, 'utf8'), outsideHistory);
  assert.equal(fs.readFileSync(file, 'utf8'), after);

  const neverOurs = setup('unwritten-external'); crash(neverOurs, 'before-source');
  assert.equal(getSourceApplyOutcome(neverOurs.id)?.code, 'APPLY_NOT_APPLIED');
  fs.writeFileSync(file, after); // An outside editor independently wrote these bytes.
  assert.equal(getSourceApplyOutcome(neverOurs.id)?.code, 'SOURCE_CHANGED');
  assert.equal(readHistory().length, 0, 'An unwritten intent cannot claim later matching outside bytes');
  discardPendingSourceEdit(neverOurs.id); assert.equal(fs.readFileSync(file, 'utf8'), after);

  const recorded = setup('after-history'); crash(recorded, 'history-written');
  assert.equal(readHistory().length, 1);
  const recordedId = readHistory()[0].id;
  assert.equal(getSourceApplyOutcome(recorded.id)?.editId, recordedId);
  assert.equal((await applyPendingSourceEdit(recorded.id)).editId, recordedId);
  assert.equal(readHistory().length, 1);
  assert.equal(undoSourceEdit(file).success, true); assert.equal(fs.readFileSync(file, 'utf8'), before);

  const conflict = setup('outside-change'); crash(conflict, 'source-written');
  const outside = after + '// Outside edit\n'; fs.writeFileSync(file, outside);
  assert.equal(getSourceApplyOutcome(conflict.id)?.code, 'SOURCE_RECOVERY_REQUIRED');
  assert.equal(fs.readFileSync(file, 'utf8'), outside);
  assert.equal(readHistory().length, 0);
  assert.throws(() => discardPendingSourceEdit(conflict.id), /interrupted save/i, 'Discard must not erase the only recovery record');
  assert.equal(undoSourceEdit(file).success, false);
  const next = createPendingSourceEdit({ filePath: file, before: outside, after: outside + '// New proposal\n', oldValue: 'After', newValue: 'After', summary: 'Later edit', previewType: 'textContent' });
  assert.ok(next.changed);
  assert.equal((await applyPendingSourceEdit(next.id)).success, false, 'A later save cannot bypass unfinished recovery on the same file');
  assert.equal(fs.readFileSync(file, 'utf8'), outside);
  fs.writeFileSync(file, after); // Test owner explicitly resolves the outside conflict.
  assert.equal(getSourceApplyOutcome(conflict.id)?.success, true);
  assert.equal(undoSourceEdit(file).success, true); assert.equal(fs.readFileSync(file, 'utf8'), before);

  const scoped = setup('project-scope', { repositoryId: 'project-a', sourcePath: 'page.tsx' }); crash(scoped, 'source-written');
  assert.equal(getSourceApplyOutcome(scoped.id)?.code, 'OUTCOME_SCOPE_MISMATCH');
  assert.equal(getSourceApplyOutcome(scoped.id, 'project-b', 'page.tsx', file)?.code, 'OUTCOME_SCOPE_MISMATCH');
  assert.equal(getSourceApplyOutcome(scoped.id, 'project-a', 'other.tsx', file)?.code, 'OUTCOME_SCOPE_MISMATCH');
  const repointed = path.join(scoped.root, 'repointed.tsx'); fs.writeFileSync(repointed, after);
  assert.equal(getSourceApplyOutcome(scoped.id, 'project-a', 'page.tsx', repointed)?.code, 'OUTCOME_SCOPE_MISMATCH');
  assert.equal(readHistory().length, 0);
  assert.equal(getSourceApplyOutcome(scoped.id, 'project-a', 'page.tsx', file)?.success, true);
  assert.equal(readHistory().length, 1);

  const expired = setup('expiry'); crash(expired, 'source-written');
  const pendingFile = path.join(process.env.SLIGHTNUDGE_DATA_DIR!, 'pending', `${expired.id}.json`);
  fs.utimesSync(pendingFile, new Date(0), new Date(0));
  const otherFile = path.join(expired.root, 'other.tsx'); fs.writeFileSync(otherFile, before);
  createPendingSourceEdit({ filePath: otherFile, before, after, oldValue: 'Before', newValue: 'After', summary: 'Other edit', previewType: 'textContent' });
  assert.equal(fs.existsSync(pendingFile), true, 'Ordinary preview expiry must preserve interrupted saves');
  fs.unlinkSync(pendingFile); // Even loss of the pending cache must not lose the recovery snapshots.
  assert.equal(getSourceApplyOutcome(expired.id)?.success, true);
  assert.equal(undoSourceEdit(file).success, true); assert.equal(fs.readFileSync(file, 'utf8'), before);

  const io = setup('history-io-failure');
  const historyPath = path.join(process.env.SLIGHTNUDGE_DATA_DIR!, 'history/edits.json');
  const rename = fs.renameSync;
  fs.renameSync = (from, to) => {
    if (String(to) === historyPath) { fs.writeFileSync(file, outside); throw Object.assign(new Error('Injected history failure'), { code: 'EIO' }); }
    rename(from, to);
  };
  try { assert.equal((await applyPendingSourceEdit(io.id)).code, 'APPLY_UNCERTAIN'); }
  finally { fs.renameSync = rename; }
  assert.equal(fs.readFileSync(file, 'utf8'), outside, 'A journaling failure must never roll back over a later outside edit');
  assert.equal(getSourceApplyOutcome(io.id)?.code, 'SOURCE_RECOVERY_REQUIRED');
  assert.equal(readHistory().length, 0);
  const concurrent = setup('concurrent-recovery'); crash(concurrent, 'source-written');
  const query = promisify(execFile);
  const queries = await Promise.all(Array.from({ length: 4 }, () => query(process.execPath, ['--import', 'tsx', 'test/helpers/apply-crash-worker.ts', 'query', concurrent.id, file], { env: process.env, encoding: 'utf8', timeout: 30000 })));
  const receipt = getSourceApplyOutcome(concurrent.id);
  assert.equal(receipt?.success, true);
  assert.equal(readHistory().length, 1, 'Concurrent reconciliation must create exactly one history entry');
  for (const result of queries) {
    const value = JSON.parse(result.stdout);
    if (value?.success) assert.equal(value.editId, receipt?.editId);
    else assert.equal(value?.code, 'SOURCE_OPERATION_BUSY');
  }
  assert.equal(undoSourceEdit(file).success, true); assert.equal(fs.readFileSync(file, 'utf8'), before);
  console.log('PASS: crash boundaries; no replay; exact Undo; grouped recovery; unrelated history preserved; conflict refusal; project/file scope; expiry/cache loss; history I/O failure; concurrent reconciliation');
} finally {
  const resolved = path.resolve(workspace);
  assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith('sn-apply-crash-'));
  fs.rmSync(resolved, { recursive: true, force: true });
}
