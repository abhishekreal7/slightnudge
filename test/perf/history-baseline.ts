import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { readHistory } from '../../lib/slightnudge/edit-history';
import { syntheticHistory, syntheticSource, summarize } from './fixtures';

// Test-only entry point; no product instrumentation or persistence changes.
// Large histories can exceed 60s on slow storage: 8 cells x 20 full reads.
const output = process.argv[2];
assert.ok(output, 'Pass a new JSON output path');
assert.equal(fs.existsSync(output), false, 'Never overwrite a prior measurement');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-perf-history-'));
console.log('Owned measurement workspace: ' + root);
const previous = { ...process.env };
const rows: unknown[] = [];
try {
  Object.assign(process.env, { NODE_ENV: 'test' });
  process.env.SLIGHTNUDGE_TEST = '1';
  process.env.SLIGHTNUDGE_WORKSPACE_ROOT = root;
  process.env.SLIGHTNUDGE_HISTORY_PATH = path.join(root, 'history.json');
  for (const lines of [20, 2000]) {
    const source = syntheticSource(lines);
    fs.writeFileSync(path.join(root, 'sample.tsx'), source);
    for (const count of [0, 100, 500, 2000]) {
      // Stream setup so the harness can generate a history larger than V8's
      // single-string limit and observe the engine's actual read failure.
      const fd = fs.openSync(process.env.SLIGHTNUDGE_HISTORY_PATH, 'w');
      try {
        fs.writeSync(fd, '[\n');
        for (const [index, record] of syntheticHistory(count, source).entries()) {
          fs.writeSync(fd, (index ? ',\n' : '') + JSON.stringify(record, null, 2));
        }
        fs.writeSync(fd, '\n]');
      } finally { fs.closeSync(fd); }
      const samples: number[] = [];
      const cpu: number[] = [];
      const errors: Record<string, number> = {};
      for (let run = 0; run < 20; run++) {
        const cpuStart = process.cpuUsage();
        const start = performance.now();
        let records;
        try { records = readHistory(); }
        catch (error) {
          const failure = error as NodeJS.ErrnoException;
          const key = failure.code || failure.name;
          errors[key] = (errors[key] || 0) + 1;
        }
        samples.push(performance.now() - start);
        const used = process.cpuUsage(cpuStart);
        cpu.push((used.user + used.system) / 1000);
        if (records) {
          assert.equal(records.length, count);
          assert.ok(records.every(record => record.missing === false));
        }
      }
      const row = { sourceLines: lines, historyRecords: count, historyBytes: fs.statSync(process.env.SLIGHTNUDGE_HISTORY_PATH).size, successfulReads: 20 - Object.values(errors).reduce((a, b) => a + b, 0), errors, attemptMs: summarize(samples), cpuMs: summarize(cpu), samples };
      rows.push(row);
      console.log(JSON.stringify({ ...row, samples: undefined }));
    }
  }
  fs.writeFileSync(output, JSON.stringify({ scope: 'Node engine readHistory only; not dev/production HTTP or browser latency', revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), node: process.version, platform: process.platform, capturedAt: new Date().toISOString(), rows }, null, 2), { flag: 'wx' });
} finally {
  for (const key of ['NODE_ENV', 'SLIGHTNUDGE_TEST', 'SLIGHTNUDGE_WORKSPACE_ROOT', 'SLIGHTNUDGE_HISTORY_PATH']) {
    if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
  }
  assert.equal(fs.realpathSync(root), root);
  assert.equal(path.dirname(root), fs.realpathSync(os.tmpdir()));
  fs.rmSync(root, { recursive: true });
  assert.equal(fs.existsSync(root), false);
  console.log('Confirmed measurement workspace removed: ' + root);
}
