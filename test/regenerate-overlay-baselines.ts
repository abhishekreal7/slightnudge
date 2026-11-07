import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

assert.ok(process.argv.includes('--update'), 'Pass --update to deliberately generate baseline candidates');
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', 'test/overlay-contract.test.ts'], {
  env: { ...process.env, SLIGHTNUDGE_UPDATE_BASELINES: '1' },
  stdio: 'inherit', windowsHide: true,
});
process.exitCode = result.status ?? 1;
