import { it } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { openPagedStore } from '../lib/slightnudge/history-store/pages';
import type { StoreIO } from '../lib/slightnudge/history-store/io';

function memory() {
  const files = new Map<string, Buffer>(); const reads: string[] = [];
  const stats = { bytesRead: 0, bytesWritten: 0, writes: 0 };
  let boundary = -1; let phase = 0;
  const io: StoreIO = {
    stats, exists: key => files.has(key),
    read(key) { reads.push(key); const b = files.get(key); if (!b) throw new Error('private failure'); stats.bytesRead += b.length; return Buffer.from(b); },
    atomicWrite(key, bytes) {
      if (phase++ === boundary) throw new Error('simulated process death');
      files.set(key, Buffer.from(bytes)); stats.bytesWritten += bytes.length; stats.writes++;
      if (phase++ === boundary) throw new Error('simulated process death');
    },
  };
  return { io, files, reads, fault(index: number) { boundary = index; phase = 0; } };
}
const edit = (id: number) => ({ id: 'record-' + id, filePath: 'sample.tsx', status: 'applied' as const, summary: 'spacing', before: Buffer.from('before'), after: Buffer.from('after') });
const open = (m: ReturnType<typeof memory>) => openPagedStore(m.io, file => { if (file !== 'sample.tsx') throw new Error('private path'); });

it('append bytes stay bounded at 10 and 2000 records; listing reads only a bounded metadata page', () => {
  const costs: number[] = [];
  for (const count of [10, 2000, 1999]) {
    const m = memory(); const store = open(m); store.initializeEmpty();
    for (let i = 0; i < count; i++) store.append(edit(i));
    const before = m.io.stats.bytesWritten; const start = performance.now();
    store.append(edit(count)); const elapsed = performance.now() - start;
    const written = m.io.stats.bytesWritten - before; costs.push(written);
    assert.ok(written <= 50 * 8192 + 4096 + 11, 'Physical append bytes must be bounded independently of history length');
    console.log(JSON.stringify({ existingRecords: count, appendBytes: written, appendMs: elapsed }));
    m.reads.length = 0;
    const page = store.listPage({ limit: 50 });
    assert.equal(page.records.length, Math.min(count + 1, 50));
    assert.ok(m.reads.length <= 3);
    assert.equal(m.reads.some(key => key.startsWith('blobs/')), false);
    assert.equal(new Set(page.records.map(record => record.id)).size, page.records.length);
    assert.equal(store.getRecord('record-0')?.before.toString(), 'before');
  }
  assert.ok(costs[1] <= costs[0] + 8192, 'A longer history cannot make append rewrite the whole index');
});
it('replaces a different uncommitted tail and ignores its obsolete locator', () => {
  const m = memory(); let store = open(m); store.initializeEmpty();
  m.fault(7); assert.throws(() => store.append(edit(0))); // Locator published; head not published.
  m.fault(-1); store = open(m); store.append(edit(1));
  assert.equal(store.getRecord('record-0'), null);
  assert.deepEqual(store.listPage().records.map(record => record.id), ['record-1']);
});
it('publishes blobs before pages, locators and head', () => {
  const m = memory(); const store = open(m); store.initializeEmpty();
  const order: string[] = []; const original = m.io.atomicWrite;
  m.io.atomicWrite = (key, bytes) => {
    if (key.startsWith('pages/')) {
      for (const entry of JSON.parse(bytes.toString())) for (const ref of [entry.before, entry.after]) {
        assert.equal(m.files.has(`blobs/${ref.sha256.slice(0, 2)}/${ref.sha256}`), true, 'An index page must never precede its payload blobs');
      }
    }
    order.push(key.split('/')[0]); original(key, bytes);
  };
  store.append(edit(0)); assert.deepEqual(order, ['blobs', 'blobs', 'pages', 'locators', 'head.json']);
});
it('cursor revisions restart after append/status change, and status rewrites only one bounded page', () => {
  const m = memory(); const store = open(m); store.initializeEmpty();
  for (let i = 0; i < 60; i++) store.append(edit(i));
  const first = store.listPage({ limit: 50 }); assert.ok(first.next);
  assert.equal(store.listPage({ cursor: first.next, limit: 50 }).records.length, 10);
  const writes = m.io.stats.writes;
  store.updateStatus('record-0', 'undone');
  assert.equal(m.io.stats.writes - writes, 2);
  assert.equal(store.listPage({ cursor: first.next, limit: 50 }).restart, true);
  assert.equal(store.getRecord('record-0')?.status, 'undone');
  assert.equal(store.getRecord('missing'), null);
});
it('every before/after blob, page, locator and head crash boundary reopens without missing blobs or duplicate tails', () => {
  for (let boundary = 0; boundary < 10; boundary++) {
    const m = memory(); let store = open(m); store.initializeEmpty(); m.fault(boundary);
    assert.throws(() => store.append(edit(0)));
    m.fault(-1); store = open(m);
    const committed = store.listPage({ limit: 50 }).records;
    assert.ok(committed.length <= 1);
    for (const record of committed) assert.deepEqual(store.getRecord(record.id)?.after, Buffer.from('after'));
    // Retrying a committed id is idempotent; an uncommitted tail is replaced.
    store.append(edit(0)); store.append(edit(1));
    assert.deepEqual(store.listPage({ limit: 50 }).records.map(record => record.id), ['record-0', 'record-1']);
    assert.equal(store.getRecord('record-1')?.after.toString(), 'after');
  }
});
it('a corrupt head or page refuses without writing and a tampered record is skipped with aggregate reasons', () => {
  for (const target of ['head.json', 'pages/00000000.json']) {
    const m = memory(); const store = open(m); store.initializeEmpty(); store.append(edit(0));
    m.files.set(target, Buffer.from('{broken')); const before = m.io.stats.writes;
    assert.throws(() => store.append(edit(1)), /STORE_INDEX/);
    assert.equal(m.io.stats.writes, before);
  }
  const m = memory(); const store = open(m); store.initializeEmpty(); store.append(edit(0));
  const page = JSON.parse(m.files.get('pages/00000000.json')!.toString());
  page[0].metadata.filePath = '../../private'; m.files.set('pages/00000000.json', Buffer.from(JSON.stringify(page)));
  assert.equal(store.getRecord('record-0'), null);
  assert.deepEqual(store.report(), { STORE_RECORD_INVALID: 1 });
});
