import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { withSourceOperationLock } from '../lib/slightnudge/source-operation-lock';

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-source-lock-'));
const workers: Array<ReturnType<typeof start>> = [];
function start(root: string, mode = 'once') {
  const child = spawn(process.execPath, ['--import', 'tsx', 'test/helpers/source-lock-worker.ts', root, mode], { env: process.env, stdio: ['ignore', 'ignore', 'pipe'] });
  let error = ''; child.stderr.on('data', data => { error += data; });
  const done = new Promise<{ code: number | null; error: string }>(resolve => {
    child.once('error', cause => resolve({ code: -1, error: cause.message }));
    child.once('exit', code => resolve({ code, error }));
  });
  return { child, done };
}
const launch = (root: string, mode = 'once') => { const worker = start(root, mode); workers.push(worker); return worker; };
const waitReady = async (root: string) => {
  const deadline = Date.now() + 10000;
  while (!fs.existsSync(path.join(root, 'ready'))) { assert.ok(Date.now() < deadline, 'Worker must reach its lock barrier'); await new Promise(resolve => setTimeout(resolve, 20)); }
};
try {
  const active = path.join(workspace, 'active'); fs.mkdirSync(active);
  const first = launch(active, 'hold'); await waitReady(active);
  assert.equal((await launch(active).done).code, 75, 'A second process must not enter a live owner’s critical section');
  fs.writeFileSync(path.join(active, 'go'), 'go');
  assert.equal((await first.done).code, 0);
  assert.equal((await launch(active).done).code, 0);
  assert.equal(fs.readFileSync(path.join(active, 'counter'), 'utf8'), '2');

  const crashed = path.join(workspace, 'crashed'); fs.mkdirSync(crashed);
  const owner = launch(crashed, 'hold'); await waitReady(crashed);
  owner.child.kill(); await owner.done;
  assert.equal((await launch(crashed).done).code, 0, 'A dead owner must not strand its lock');
  assert.equal(fs.readFileSync(path.join(crashed, 'counter'), 'utf8'), '1');

  for (let wave = 0; wave < 3; wave++) {
    const root = path.join(workspace, `race-${wave}`); fs.mkdirSync(root);
    const results = await Promise.all(Array.from({ length: 6 }, () => launch(root).done));
    for (const result of results) assert.ok(result.code === 0 || result.code === 75, result.error || `Unexpected worker exit ${result.code}`);
    const entered = results.filter(result => result.code === 0).length;
    assert.ok(entered > 0);
    assert.equal(Number(fs.readFileSync(path.join(root, 'counter'), 'utf8')), entered, 'Concurrent entry or lost updates are forbidden');
  }
  withSourceOperationLock(path.join(workspace, 'nested'), () => withSourceOperationLock(path.join(workspace, 'nested'), () => {}));
  const nativeRename = fs.renameSync;
  let denied = false, enteredAfterRetry = false;
  fs.renameSync = ((...args: Parameters<typeof fs.renameSync>) => {
    if (!denied) { denied = true; throw Object.assign(new Error('Transient Windows reader'), { code: 'EPERM' }); }
    return nativeRename(...args);
  }) as typeof fs.renameSync;
  try { withSourceOperationLock(path.join(workspace, 'transient-reader'), () => { enteredAfterRetry = true; }); }
  finally { fs.renameSync = nativeRename; }
  assert.ok(denied && enteredAfterRetry, 'A transient ticket reader must not break publication or permit unprotected entry');
  const reused = path.join(workspace, 'reused-pid'); fs.mkdirSync(reused);
  const oldTicket = path.join(reused, `${process.pid}-${randomUUID()}.json`);
  fs.writeFileSync(oldTicket, JSON.stringify({ pid: process.pid, processStart: performance.timeOrigin - 100000, ticket: 1 }));
  withSourceOperationLock(reused, () => {});
  assert.equal(fs.existsSync(oldTicket), false, 'A prior process with the restarted process’s PID must not strand recovery');
  const threadSignal = new Int32Array(new SharedArrayBuffer(8));
  const threadRoot = path.join(workspace, 'threads');
  const worker = new Worker(`(async () => {
    const {workerData} = await import('node:worker_threads');
    const signal = new Int32Array(workerData.signal);
    try {
      const {tsImport} = await import('tsx/esm/api');
      const {withSourceOperationLock} = await tsImport(workerData.module, workerData.module);
      while (!Atomics.load(signal, 0)) Atomics.wait(signal, 0, 0, 100);
      try { withSourceOperationLock(workerData.root, () => Atomics.store(signal, 1, 1)); }
      catch (error) { Atomics.store(signal, 1, error.code === 'SOURCE_OPERATION_BUSY' ? 2 : 3); }
    } catch { Atomics.store(signal, 1, 3); }
    Atomics.notify(signal, 1);
  })()`, { eval: true, workerData: { signal: threadSignal.buffer, root: threadRoot, module: pathToFileURL(path.resolve('lib/slightnudge/source-operation-lock.ts')).href } });
  try {
    withSourceOperationLock(threadRoot, () => {
      Atomics.store(threadSignal, 0, 1); Atomics.notify(threadSignal, 0);
      Atomics.wait(threadSignal, 1, 0, 10000);
      assert.equal(Atomics.load(threadSignal, 1), 2, 'A live worker thread shares the PID and must not steal its parent’s lock');
    });
  } finally { await worker.terminate(); }
  console.log('PASS: live-owner exclusion, dead/reused-PID recovery, live worker-thread exclusion, 18 competing processes without overlapping mutation/lost updates, synchronous nesting');
} finally {
  for (const worker of workers) if (worker.child.exitCode === null && worker.child.signalCode === null) worker.child.kill();
  await Promise.all(workers.map(worker => worker.done));
  const resolved = path.resolve(workspace);
  assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith('sn-source-lock-'));
  fs.rmSync(resolved, { recursive: true, force: true });
}
