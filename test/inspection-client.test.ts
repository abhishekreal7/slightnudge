import assert from 'node:assert/strict';
import { inspectElementAPI } from '../lib/slightnudge/client';

const originalFetch = globalThis.fetch;
const target = { repositoryId: 'example', filePath: 'components/hero.tsx', line: 12, column: 5, tagName: 'h1' };
const ready = { found: true, safeToEdit: true, textEditable: true, tagName: 'h1', line: 12, column: 5 };
try {
  for (const failure of ['timeout', 'gateway'] as const) {
    let calls = 0;
    globalThis.fetch = (async (url, options) => {
      assert.equal(url, '/api/slightnudge/repositories/example/inspect');
      assert.equal(options?.method, 'POST'); assert.equal(JSON.parse(String(options?.body)).path, target.filePath);
      if (++calls === 1) {
        if (failure === 'timeout') throw new DOMException('Cold local compilation', 'TimeoutError');
        return new Response('{}', { status: 504 });
      }
      return Response.json(ready);
    }) as typeof fetch;
    assert.deepEqual(await inspectElementAPI(target), ready); assert.equal(calls, 2);
  }
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return Response.json({ found: false, reason: 'Forbidden' }, { status: 403 }); }) as typeof fetch;
  assert.equal((await inspectElementAPI(target)).found, false); assert.equal(calls, 1, 'Authorization failures must not be retried');
  calls = 0;
  globalThis.fetch = (async () => { calls++; throw new DOMException('Still compiling', 'TimeoutError'); }) as typeof fetch;
  const refused = await inspectElementAPI(target); assert.equal(refused.found, false); assert.equal(refused.refusedSafely, true); assert.equal(calls, 2, 'Read retries stay bounded');
  console.log('PASS inspection client: one bounded read-only retry for cold timeouts/gateway failures; exact source target preserved; denials not retried; persistent failure refuses safely');
} finally { globalThis.fetch = originalFetch; }
