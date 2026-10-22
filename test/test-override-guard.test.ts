import assert from 'node:assert';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { getSessionToken } from '../lib/slightnudge/auth';
import { readHistory } from '../lib/slightnudge/edit-history';

// Isolated canary directories in OS temp (NEVER write to or touch real .slightnudge)
const tmpBase = path.join(os.tmpdir(), `test-override-guard-${crypto.randomBytes(6).toString('hex')}`);
const canaryHistoryFile = path.join(tmpBase, 'canary-history.json');
const canaryId = 'canary-prod-guard-' + crypto.randomBytes(4).toString('hex');

try {
  fs.mkdirSync(tmpBase, { recursive: true });
  fs.writeFileSync(
    canaryHistoryFile,
    JSON.stringify([
      {
        id: canaryId,
        filePath: 'app/page.tsx',
        createdAt: new Date().toISOString(),
        summary: 'canary record',
        before: '',
        after: '',
        status: 'applied',
      },
    ]),
    'utf8'
  );

  const prevEnv = { ...process.env };

  function setOverrides() {
    process.env.SLIGHTNUDGE_SESSION_TOKEN = 'canary-secret-token-12345';
    process.env.SLIGHTNUDGE_WORKSPACE_ROOT = tmpBase;
    process.env.SLIGHTNUDGE_DATA_DIR = tmpBase;
    process.env.SLIGHTNUDGE_HISTORY_PATH = canaryHistoryFile;
    process.env.SLIGHTNUDGE_PENDING_DIR = tmpBase;
  }

  function resetToken() {
    const g = globalThis as any;
    delete g[Symbol.for('slightnudge.sessionToken')];
  }

  console.log('🧪 RUNNING TEST OVERRIDE GUARD SUITE');

  // Test 1: In production mode (NODE_ENV=production), SLIGHTNUDGE_TEST=1 MUST BE IGNORED
  {
    setOverrides();
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.SLIGHTNUDGE_TEST = '1';
    resetToken();

    // 1a. Session token check
    const token = getSessionToken();
    assert.notStrictEqual(token, 'canary-secret-token-12345', 'Session token override MUST be ignored when NODE_ENV=production');
    assert.strictEqual(token.length, 64, 'Session token must be 64-char hex in production');

    // 1b. History path check via readHistory()
    const history = readHistory();
    const hasCanary = history.some(r => r.id === canaryId);
    assert.strictEqual(hasCanary, false, 'History path override MUST be ignored when NODE_ENV=production');

    console.log('  ✅ [PASS] NODE_ENV=production strictly ignores all SLIGHTNUDGE_* overrides even when SLIGHTNUDGE_TEST=1');
  }

  // Test 2: In development / test mode (NODE_ENV=development, SLIGHTNUDGE_TEST=1), overrides ARE honored
  {
    setOverrides();
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    process.env.SLIGHTNUDGE_TEST = '1';
    resetToken();

    const token = getSessionToken();
    assert.strictEqual(token, 'canary-secret-token-12345', 'Session token override honored in dev/test mode');

    const history = readHistory();
    const hasCanary = history.some(r => r.id === canaryId);
    assert.strictEqual(hasCanary, true, 'History path override honored in dev/test mode');

    console.log('  ✅ [PASS] NODE_ENV=development with SLIGHTNUDGE_TEST=1 honors overrides');
  }

  // Test 3: In development mode when SLIGHTNUDGE_TEST is unset or not '1', overrides are IGNORED
  {
    setOverrides();
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    delete process.env.SLIGHTNUDGE_TEST;
    resetToken();

    const token = getSessionToken();
    assert.notStrictEqual(token, 'canary-secret-token-12345', 'Session token override ignored when SLIGHTNUDGE_TEST unset');

    const history = readHistory();
    const hasCanary = history.some(r => r.id === canaryId);
    assert.strictEqual(hasCanary, false, 'History path override ignored when SLIGHTNUDGE_TEST unset');

    console.log('  ✅ [PASS] SLIGHTNUDGE_TEST unset ignores overrides even in development');
  }

  // Restore env
  for (const k in process.env) {
    if (!(k in prevEnv)) delete process.env[k];
  }
  Object.assign(process.env, prevEnv);
  resetToken();

  console.log('🎉 ALL TEST OVERRIDE GUARD CHECKS PASSED!\n');
} finally {
  try {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  } catch {}
}
