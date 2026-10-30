import assert from 'node:assert/strict';
import { applyEditAPI } from '../lib/slightnudge/client';

const originalFetch = globalThis.fetch;
let tokenReads = 0;
let applies = 0;
let writes = 0;
let statusReads = 0;
try {
  globalThis.fetch = async (input, options) => {
    const url = String(input);
    if (url.endsWith('/token')) return Response.json({ token: ++tokenReads === 1 ? 'expired-session' : 'current-session' });
    if (url.endsWith('/apply/status')) { statusReads++; return Response.json({ success: false, code: 'APPLY_UNCERTAIN' }, { status: 409 }); }
    assert.ok(url.endsWith('/apply'));
    applies++;
    if ((options?.headers as Record<string, string>)['x-slightnudge-token'] !== 'current-session') return Response.json({ error: 'Access denied.' }, { status: 403 });
    writes++; return Response.json({ success: true });
  };
  const denied = await applyEditAPI('reviewed-change');
  assert.equal(denied.success, false);
  assert.equal(denied.code, 'AUTH_REQUIRED', 'A confirmed pre-write denial must not trap the review in an unknown outcome');
  assert.equal(applies, 1, 'Refreshing authorization must not repeat Apply');
  assert.equal(writes, 0);
  assert.equal(statusReads, 0);
  assert.equal(tokenReads, 2);
  const retried = await applyEditAPI('reviewed-change');
  assert.equal(retried.success, true, 'A subsequent explicit Apply uses refreshed authorization');
  assert.equal(applies, 2);
  assert.equal(writes, 1);
  console.log('PASS: pre-write authorization denial, preserved review, no automatic write retry, explicit authorized Apply');
} finally { globalThis.fetch = originalFetch; }
