import assert from 'node:assert';
import { setPreWriteTestHook, invokePreWriteHook } from '../lib/slightnudge/edit-history';

console.log('🧪 RUNNING PRE-WRITE HOOK GUARD SUITE');

const prevEnv = { ...process.env };

try {
  // Test 1: In production mode (NODE_ENV=production), setPreWriteTestHook MUST BE IGNORED even if SLIGHTNUDGE_TEST=1
  {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.SLIGHTNUDGE_TEST = '1';

    let invoked = false;
    setPreWriteTestHook(() => {
      invoked = true;
    });

    invokePreWriteHook('some/file.tsx');
    assert.strictEqual(invoked, false, 'Pre-write test hook MUST NOT be invoked when NODE_ENV=production');
  }

  // Test 2: In development mode when SLIGHTNUDGE_TEST is unset, hook is IGNORED
  {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    delete process.env.SLIGHTNUDGE_TEST;

    let invoked = false;
    setPreWriteTestHook(() => {
      invoked = true;
    });

    invokePreWriteHook('some/file.tsx');
    assert.strictEqual(invoked, false, 'Pre-write test hook MUST NOT be set or invoked when SLIGHTNUDGE_TEST is unset');
  }

  // Test 3: In development mode when SLIGHTNUDGE_TEST is not '1' (e.g. '0' or 'true'), hook is IGNORED
  {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    process.env.SLIGHTNUDGE_TEST = '0';

    let invoked = false;
    setPreWriteTestHook(() => {
      invoked = true;
    });

    invokePreWriteHook('some/file.tsx');
    assert.strictEqual(invoked, false, 'Pre-write test hook MUST NOT be set or invoked when SLIGHTNUDGE_TEST=0');

    process.env.SLIGHTNUDGE_TEST = 'true';
    setPreWriteTestHook(() => {
      invoked = true;
    });
    invokePreWriteHook('some/file.tsx');
    assert.strictEqual(invoked, false, 'Pre-write test hook MUST NOT be set or invoked when SLIGHTNUDGE_TEST=true');
  }

  // Test 4: In test/dev mode when NODE_ENV !== production and SLIGHTNUDGE_TEST === '1', hook IS honored
  {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    process.env.SLIGHTNUDGE_TEST = '1';

    let invokedTarget = '';
    setPreWriteTestHook((filePath: string) => {
      invokedTarget = filePath;
    });

    invokePreWriteHook('test/target.tsx');
    assert.strictEqual(invokedTarget, 'test/target.tsx', 'Pre-write test hook must be invoked when SLIGHTNUDGE_TEST=1');

    // Test clearing
    setPreWriteTestHook(null);
    invokedTarget = '';
    invokePreWriteHook('test/target.tsx');
    assert.strictEqual(invokedTarget, '', 'Pre-write test hook must be clearable');
  }

  console.log('✅ ALL PRE-WRITE HOOK GUARD TESTS PASSED');
} finally {
  for (const [k, v] of Object.entries(prevEnv)) {
    if (v !== undefined) process.env[k] = v;
    else delete process.env[k];
  }
}
