import assert from 'node:assert/strict';
import { undoEditAPI, checkUndoOutcomeAPI } from '../lib/slightnudge/client';

const originalFetch = globalThis.fetch;
let writes = 0;
let reads = 0;
let tokenReads = 0;
let available = true;
let restarted = false;
let mode = 'lost';
let statusCode = '';
const context = { previewId: 'accepted-edit', editId: 'history-edit', repositoryId: 'project', sourcePath: 'page.tsx' };
try {
  globalThis.fetch = async (input, options) => {
    assert.ok(options?.signal, 'Every request must have a bounded wait');
    const url = String(input);
    if (url.endsWith('/token')) { tokenReads++; return Response.json({ token: restarted ? 'new-session' : 'old-session' }); }
    const body = JSON.parse(options?.body as string);
    assert.equal(body.repositoryId, context.repositoryId);
    assert.equal(body.sourcePath, context.sourcePath);
    assert.equal(body.previewId, context.previewId);
    assert.equal(body.editId, context.editId);
    if (url.endsWith('/undo')) {
      writes++;
      if (mode === 'denied') return Response.json({ error: 'Denied' }, { status: 403 });
      if (mode === 'success') return Response.json({ success: true, editId: context.editId, sourceCurrent: true });
      throw new TypeError('The server wrote Undo but its response was lost');
    }
    assert.ok(url.endsWith('/undo/status')); reads++;
    assert.equal(options?.cache, 'no-store');
    if (!available) throw new TypeError('Status unavailable');
    if (restarted && (options?.headers as Record<string, string>)['x-slightnudge-token'] !== 'new-session') return Response.json({ error: 'Denied' }, { status: 403 });
    if (statusCode) return Response.json({ success: false, code: statusCode }, { status: 409 });
    return Response.json({ success: true, previewId: context.previewId, editId: context.editId, sourceCurrent: false });
  };
  assert.equal((await undoEditAPI()).code, 'UNDO_TARGET_REQUIRED');
  assert.equal(writes + reads + tokenReads, 0);
  assert.equal((await undoEditAPI(undefined, context)).sourceCurrent, false);
  assert.equal(writes, 1); assert.equal(reads, 1);
  context.previewId = 'second-edit'; available = false;
  assert.equal((await undoEditAPI(undefined, context)).code, 'UNDO_UNCERTAIN');
  assert.equal(writes, 2);
  assert.equal((await undoEditAPI(undefined, context)).code, 'UNDO_UNCERTAIN');
  assert.equal(writes, 2, 'A repeated click during uncertainty only checks status');
  available = true; restarted = true;
  assert.equal((await checkUndoOutcomeAPI(undefined, context)).success, true);
  assert.equal(tokenReads, 2, 'A status check refreshes authorization after restart');
  assert.equal(writes, 2);
  context.previewId = 'unwritten-edit'; statusCode = 'UNDO_NOT_APPLIED';
  assert.equal((await undoEditAPI(undefined, context)).code, 'UNDO_NOT_APPLIED');
  assert.equal(writes, 3);
  mode = 'success'; statusCode = '';
  assert.equal((await undoEditAPI(undefined, context)).success, true);
  assert.equal(writes, 4, 'Only an explicit retry writes after confirmed NOT_APPLIED');
  context.previewId = 'conflict-edit'; mode = 'lost'; statusCode = 'UNDO_RECOVERY_REQUIRED';
  assert.equal((await undoEditAPI(undefined, context)).code, 'UNDO_RECOVERY_REQUIRED');
  assert.equal((await undoEditAPI(undefined, context)).code, 'UNDO_RECOVERY_REQUIRED');
  assert.equal(writes, 5);
  context.previewId = 'denied-edit'; mode = 'denied';
  const readsBefore = reads;
  assert.equal((await undoEditAPI(undefined, context)).code, 'AUTH_REQUIRED');
  assert.equal(writes, 6); assert.equal(reads, readsBefore);
  mode = 'success';
  assert.equal((await undoEditAPI(undefined, context)).success, true);
  assert.equal(writes, 7);
  console.log('PASS: bound client Undo, lost-response recovery, read-only retries, restarted authorization, explicit retry, conflict, and denied write');
} finally { globalThis.fetch = originalFetch; }
