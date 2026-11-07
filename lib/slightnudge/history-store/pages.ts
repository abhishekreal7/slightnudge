import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { createBlobStore, type BlobReference } from './blobs';
import { StoreError, type StoreReason } from './errors';
import type { StoreIO } from './io';

export type HistoryStatus = 'applied' | 'undoing' | 'undone';
export interface RecordMetadata { id: string; filePath: string; status: HistoryStatus; [key: string]: unknown }
export type SnapshotRecord = RecordMetadata & { before: Buffer; after: Buffer };
interface StoredRecord { metadata: RecordMetadata; before: BlobReference; after: BlobReference }
interface Head { version: 2; count: string; revision: string }
export interface PageCursor { revision: string; ordinal: number }
const pageSize = 50;
const json = (value: unknown) => Buffer.from(JSON.stringify(value));
const identity = (id: string) => createHash('sha256').update(id).digest('hex');

/** Internal single-writer storage primitive. Mode/lock owner must wrap every
 * mutation before this becomes the public store; do not wire to an engine yet.
 * I/O is generation-relative. Source validation is supplied by its owner. */
export function openPagedStore(io: StoreIO, validateSource: (relative: string) => void) {
  const blobs = createBlobStore(io);
  const reasons: Partial<Record<StoreReason, number>> = {};
  function boundary<T>(run: () => T): T {
    try { return run(); } catch (error) { throw error instanceof StoreError ? error : new StoreError('STORE_INDEX'); }
  }
  function parse<T>(file: string): T { return JSON.parse(io.read(file).toString('utf8')) as T; }
  function head(): Head {
    const h = parse<Head>('head.json');
    if (!h || h.version !== 2 || typeof h.count !== 'string' || !/^\d{16}$/.test(h.count) || !Number.isSafeInteger(Number(h.count)) || !/^[a-f0-9-]{36}$/.test(h.revision)) throw new StoreError('STORE_INDEX');
    return h;
  }
  function publish(count: number) {
    if (!Number.isSafeInteger(count) || count < 0) throw new StoreError('STORE_INDEX');
    io.atomicWrite('head.json', json({ version: 2, count: String(count).padStart(16, '0'), revision: randomUUID() }));
  }
  const pageName = (ordinal: number) => `pages/${String(Math.floor(ordinal / pageSize)).padStart(8, '0')}.json`;
  function page(h: Head, ordinal: number): StoredRecord[] {
    const first = Math.floor(ordinal / pageSize) * pageSize;
    const committed = Math.min(pageSize, Math.max(0, Number(h.count) - first));
    if (!committed) return [];
    const entries = parse<StoredRecord[]>(pageName(ordinal));
    if (!Array.isArray(entries) || entries.length < committed || entries.length > pageSize) throw new StoreError('STORE_INDEX');
    return entries.slice(0, committed); // Never expose or preserve uncommitted tails.
  }
  function validMetadata(value: RecordMetadata): boolean {
    return !!value && typeof value.id === 'string' && value.id.length > 0 && value.id.length <= 256 &&
      typeof value.filePath === 'string' && value.filePath.length > 0 && value.filePath.length <= 1024 &&
      !path.win32.isAbsolute(value.filePath) && !path.posix.isAbsolute(value.filePath) &&
      !value.filePath.split(/[\\/]/).some(s => !s || s === '..' || s === '.') && !/[:\x00]/.test(value.filePath) &&
      ['applied', 'undoing', 'undone'].includes(value.status);
  }
  function validStored(value: StoredRecord): boolean {
    const ref = (r: BlobReference) => !!r && typeof r.sha256 === 'string' && /^[a-f0-9]{64}$/.test(r.sha256) && Number.isSafeInteger(r.size) && r.size >= 0;
    return !!value && validMetadata(value.metadata) && !('before' in value.metadata) && !('after' in value.metadata) && ref(value.before) && ref(value.after) && json(value).length <= 8192;
  }
  function skip(reason: StoreReason) { reasons[reason] = (reasons[reason] || 0) + 1; }
  function locate(h: Head, id: string): { ordinal: number; records: StoredRecord[]; entry: StoredRecord } | null {
    if (typeof id !== 'string' || !id || id.length > 256) throw new StoreError('STORE_RECORD_INVALID');
    const key = `locators/${identity(id)}.json`;
    if (!io.exists(key)) return null;
    const loc = parse<{ ordinal: number }>(key);
    if (!loc || !Number.isSafeInteger(loc.ordinal) || loc.ordinal < 0) throw new StoreError('STORE_INDEX');
    if (loc.ordinal >= Number(h.count)) return null;
    const records = page(h, loc.ordinal); const entry = records[loc.ordinal % pageSize];
    if (!validStored(entry)) { skip('STORE_RECORD_INVALID'); return null; }
    if (entry.metadata.id !== id) return null; // A stale locator for an overwritten tail.
    return { ordinal: loc.ordinal, records, entry };
  }
  const api = {
    initializeEmpty() { return boundary(() => { if (io.exists('head.json')) head(); else publish(0); }); },
    append(record: SnapshotRecord) {
      return boundary(() => {
        const h = head();
        const { before, after, ...metadata } = record;
        if (!validMetadata(metadata) || !Buffer.isBuffer(before) || !Buffer.isBuffer(after)) throw new StoreError('STORE_RECORD_INVALID');
        const reference = (bytes: Buffer) => ({ sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length });
        const entry: StoredRecord = { metadata, before: reference(before), after: reference(after) };
        if (!validStored(entry)) throw new StoreError('STORE_RECORD_INVALID');
        validateSource(metadata.filePath);
        const previous = locate(h, metadata.id);
        if (previous) {
          if (!isDeepStrictEqual(previous.entry, entry)) throw new StoreError('STORE_DUPLICATE');
          blobs.get(previous.entry.before); blobs.get(previous.entry.after);
          return previous.ordinal;
        }
        const ordinal = Number(h.count); const records = page(h, ordinal);
        // All payloads are durable before any index or locator is published.
        blobs.put(before); blobs.put(after);
        records.push(entry);
        io.atomicWrite(pageName(ordinal), json(records));
        io.atomicWrite(`locators/${identity(metadata.id)}.json`, json({ ordinal }));
        publish(ordinal + 1);
        return ordinal;
      });
    },
    listPage(options: { cursor?: PageCursor; limit?: number } = {}) {
      return boundary(() => {
        const h = head(); const limit = options.limit ?? pageSize; const cursor = options.cursor;
        if (!Number.isInteger(limit) || limit < 1 || limit > pageSize) throw new StoreError('STORE_INDEX');
        if (cursor && (cursor.revision !== h.revision || !Number.isSafeInteger(cursor.ordinal) || cursor.ordinal < 0 || cursor.ordinal > Number(h.count))) return { restart: true, records: [] as RecordMetadata[], next: undefined };
        let ordinal = cursor?.ordinal ?? 0; const end = Math.min(ordinal + limit, Number(h.count));
        const records: RecordMetadata[] = []; let cache: StoredRecord[] = []; let loaded = -1;
        while (ordinal < end) {
          const pageIndex = Math.floor(ordinal / pageSize);
          if (pageIndex !== loaded) { cache = page(h, ordinal); loaded = pageIndex; }
          const entry = cache[ordinal % pageSize];
          if (validStored(entry)) records.push(entry.metadata); else skip('STORE_RECORD_INVALID');
          ordinal++;
        }
        return { restart: false, records, next: ordinal < Number(h.count) ? { revision: h.revision, ordinal } : undefined };
      });
    },
    getRecord(id: string): SnapshotRecord | null {
      return boundary(() => {
        const found = locate(head(), id); if (!found) return null;
        try {
          validateSource(found.entry.metadata.filePath);
          return { ...found.entry.metadata, before: blobs.get(found.entry.before), after: blobs.get(found.entry.after) };
        } catch (error) { skip(error instanceof StoreError ? error.code : 'STORE_RECORD_INVALID'); return null; }
      });
    },
    updateStatus(id: string, status: HistoryStatus) {
      return boundary(() => {
        const h = head(); const found = locate(h, id);
        if (!found || !['applied', 'undoing', 'undone'].includes(status)) throw new StoreError('STORE_RECORD_INVALID');
        validateSource(found.entry.metadata.filePath);
        found.entry.metadata.status = status;
        io.atomicWrite(pageName(found.ordinal), json(found.records));
        publish(Number(h.count));
      });
    },
    getBlob: blobs.get,
    report() { return { ...reasons }; },
  };
  return api;
}
