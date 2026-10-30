import assert from 'node:assert/strict';
import { applyEditAPI, checkApplyOutcomeAPI } from '../lib/slightnudge/client';

const originalFetch = globalThis.fetch;
let applyCount = 0;
let statusAvailable = true;
let restarted = false;
let tokenReads = 0;
let confirmedChanged = false;
let notApplied = false;
let recoveryConflict = false;
try {
  globalThis.fetch = async (input, options) => {
    assert.ok(options?.signal, 'Network requests need a bounded wait');
    const url = String(input);
    if (url.endsWith('/token')) { tokenReads++; return Response.json({ token: restarted ? 'new-session' : 'old-session' }); }
    if (url.endsWith('/apply')) { applyCount++; throw new TypeError('Response lost after the server saved'); }
    assert.ok(url.endsWith('/apply/status'));
    if (!statusAvailable) throw new TypeError('Status connection unavailable');
    if (restarted && (options?.headers as Record<string, string>)['x-slightnudge-token'] !== 'new-session') return Response.json({ error: 'Access denied' }, { status: 403 });
    if (notApplied) return Response.json({ success: false, code: 'APPLY_NOT_APPLIED', error: 'Original source is unchanged' }, { status: 409 });
    if (recoveryConflict) return Response.json({ success: false, code: 'SOURCE_RECOVERY_REQUIRED', error: 'Outside source changed' }, { status: 409 });
    if (confirmedChanged) return Response.json({ success: false, code: 'SOURCE_CHANGED', error: 'Source changed after saving' }, { status: 409 });
    return Response.json({ success: true });
  };
  assert.equal((await applyEditAPI('reviewed-change')).success, true, 'A lost response should reconcile the accepted save');
  assert.equal(applyCount, 1);
  statusAvailable = false;
  assert.equal((await applyEditAPI('second-change')).code, 'APPLY_UNCERTAIN', 'Unavailable status cannot be called a failed save');
  assert.equal(applyCount, 2);
  statusAvailable = true;
  restarted = true;
  assert.equal((await checkApplyOutcomeAPI('second-change')).success, true, 'Status can refresh authorization after a server restart');
  assert.equal(tokenReads, 2);
  assert.equal(applyCount, 2, 'Checking status must never repeat Apply');
  confirmedChanged = true;
  assert.equal((await checkApplyOutcomeAPI('second-change')).code, 'SOURCE_CHANGED');
  assert.equal(applyCount, 2);
  confirmedChanged = false; notApplied = true;
  assert.equal((await checkApplyOutcomeAPI('second-change')).code, 'APPLY_NOT_APPLIED');
  assert.equal(applyCount, 2, 'An unwritten intent cannot be replayed by a status check');
  notApplied = false; recoveryConflict = true;
  assert.equal((await checkApplyOutcomeAPI('second-change')).code, 'SOURCE_RECOVERY_REQUIRED');
  assert.equal(applyCount, 2);
  console.log('PASS: client lost-response reconciliation, unknown outcome, read-only retry, restarted-session authorization, and changed-source result');
} finally { globalThis.fetch = originalFetch; }
