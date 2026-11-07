import { it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createBlobStore } from '../lib/slightnudge/history-store/blobs';
import { createNodeIO } from '../lib/slightnudge/history-store/io';

function temporary(run: (root: string) => void) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-blob-contract-'));
  try { run(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
const sentinel = 'private-token-RECORD-123';
const bytes = Buffer.from('source-' + sentinel + '\r\n');
it('shares identical byte snapshots and verifies exact bytes', () => temporary(root => {
  const io = createNodeIO(root); const store = createBlobStore(io);
  const first = store.put(bytes); const writes = io.stats.bytesWritten;
  assert.deepEqual(store.put(bytes), first);
  assert.equal(io.stats.bytesWritten, writes);
  assert.deepEqual(store.get(first), bytes);
  assert.equal(first.sha256, createHash('sha256').update(bytes).digest('hex'));
}));
it('rejects wrong hashes, missing blobs and bad sizes without private diagnostics', () => temporary(root => {
  const io = createNodeIO(root); const store = createBlobStore(io); const blob = store.put(bytes);
  fs.writeFileSync(path.join(root, 'blobs', blob.sha256.slice(0, 2), blob.sha256), Buffer.alloc(bytes.length, 65));
  for (const descriptor of [blob, { sha256: 'a'.repeat(64), size: 9 }, { ...blob, size: -1 }]) {
    assert.throws(() => store.get(descriptor), (e: unknown) => {
      assert.match(String(e), /STORE_[A-Z_]+/);
      for (const value of [root, sentinel, blob.sha256, bytes.toString()]) assert.equal(String(e).includes(value), false);
      return true;
    });
  }
}));
it('rejects path escapes and junction reads before reading outside bytes', () => temporary(root => {
  const outside = path.join(root, 'outside'); const inside = path.join(root, 'inside');
  fs.mkdirSync(outside); fs.mkdirSync(inside); fs.writeFileSync(path.join(outside, 'secret'), bytes);
  fs.symlinkSync(outside, path.join(inside, 'link'), 'junction');
  try {
    const io = createNodeIO(inside);
    for (const target of ['../outside/secret', 'link/secret', 'C:/secret']) {
      assert.throws(() => io.read(target), /STORE_CONTAINMENT/);
    }
    assert.equal(io.stats.bytesRead, 0);
  } finally { fs.unlinkSync(path.join(inside, 'link')); }
}));
it('a fault before rename leaves the old value intact and removes temporary files', () => temporary(root => {
  const io = createNodeIO(root); io.atomicWrite('head.json', Buffer.from('old'));
  const broken = createNodeIO(root, () => { throw new Error(root + sentinel); });
  assert.throws(() => broken.atomicWrite('head.json', bytes), /STORE_IO/);
  assert.equal(fs.readFileSync(path.join(root, 'head.json'), 'utf8'), 'old');
  assert.deepEqual(fs.readdirSync(root), ['head.json']);
}));
it('privacy: every primitive failure emits only fixed reason codes and no log lines', () => temporary(root => {
  const io = createNodeIO(root); const store = createBlobStore(io); const blob = store.put(bytes);
  const logs: unknown[][] = [];
  const originals = [console.log, console.warn, console.error];
  const messages: string[] = [];
  console.log = console.warn = console.error = (...args: unknown[]) => { logs.push(args); };
  try {
    for (const fail of [
      () => io.read('../' + sentinel),
      () => io.read('absent-' + sentinel),
      () => store.get({ sha256: sentinel, size: bytes.length }),
      () => store.get({ ...blob, size: bytes.length + 1 }),
      () => store.get({ sha256: 'f'.repeat(64), size: bytes.length }),
      () => createNodeIO(root, () => { throw new Error(sentinel + root + blob.sha256); }).atomicWrite('failure', bytes),
    ]) {
      assert.throws(fail, (error: unknown) => { messages.push(String(error)); return true; });
    }
  } finally { [console.log, console.warn, console.error] = originals; }
  assert.equal(messages.length, 6);
  for (const message of messages) assert.match(message, /^StoreError: STORE_(IO|CONTAINMENT|BLOB_INVALID)$/);
  assert.deepEqual(logs, []);
}));
