import assert from 'node:assert';
import { setupIsolatedEnv } from './helpers/test-server';
import { validateMutatingRequest } from '../lib/slightnudge/auth';

console.log('🧪 RUNNING AUTH BYPASS UNIT TEST');

const env = setupIsolatedEnv('auth-bypass-test');
const originalArgv = [...process.argv];
const originalEnv = { ...process.env };

try {
  // Case 1: SLIGHTNUDGE_TEST unset, argv contains 'reorder-safety'
  // Under the old code, this passed through as valid: true!
  delete process.env.SLIGHTNUDGE_TEST;
  process.env.NODE_ENV = 'development';
  process.argv = ['node', 'server.js', 'reorder-safety'];

  const unauthenticatedReq1 = new Request('http://localhost:3000/api/slightnudge/preview', {
    method: 'POST',
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      // No token!
    },
    body: JSON.stringify({ kind: 'reorder' }),
  });

  const res1 = validateMutatingRequest(unauthenticatedReq1);
  assert.strictEqual(
    res1.valid,
    false,
    'Requests lacking token must be refused when SLIGHTNUDGE_TEST is unset, even if argv contains reorder-safety'
  );
  if (!res1.valid) {
    assert.strictEqual(res1.response.status, 403, 'Refused request must return 403');
  }

  // Case 2: In production mode (NODE_ENV=production), test overrides and argv bypass must be refused
  process.env.SLIGHTNUDGE_TEST = '1';
  process.env.NODE_ENV = 'production';
  process.argv = ['node', 'server.js', 'reorder-safety'];

  const unauthenticatedReq2 = new Request('http://localhost:3000/api/slightnudge/preview', {
    method: 'POST',
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify({ kind: 'reorder' }),
  });

  const res2 = validateMutatingRequest(unauthenticatedReq2);
  assert.strictEqual(
    res2.valid,
    false,
    'Requests lacking token must be refused in production even with SLIGHTNUDGE_TEST=1 and reorder-safety in argv'
  );

  console.log('  ✅ [PASS] All auth-bypass guard assertions held');
} finally {
  process.argv = originalArgv;
  for (const k in process.env) {
    if (!(k in originalEnv)) delete process.env[k];
  }
  Object.assign(process.env, originalEnv);
  env.cleanup();
}
