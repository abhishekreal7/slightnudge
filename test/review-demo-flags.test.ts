import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['--import', 'tsx', 'test/review-consent.browser.ts', '--source-project', '--demo'], { cwd: process.cwd(), encoding: 'utf8', timeout: 10000 });
assert.equal(result.status, 1);
assert.match(result.stderr, /Imported-project interactive demos are not available yet/);
console.log('PASS: unsupported imported-project demo refuses before creating a disposable workspace');
