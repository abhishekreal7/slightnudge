import { randomUUID } from 'node:crypto';
import { createNodeIO, type StoreIO } from './io';
import { openPagedStore, type SnapshotRecord, type HistoryStatus, type PageCursor } from './pages';
import { StoreError } from './errors';
import type { BlobReference } from './blobs';

type Mode = 'legacy-only' | 'migrating' | 'v2-active';
interface Manifest { version: 2; mode: Mode; generation: string }
const manifestFile = 'store-v2/active.json';
const marker = 'edits.json.migrated-to-v2';

/** Explicit generated/deployment root only. No engine integration, migration
 * or implicit workspace resolver. Intent/recovery and migration APIs pending. */
export function openStore(options: { directory: string; validateSource: (relative: string) => void }) {
  const io = createNodeIO(options.directory);
  function load(): Manifest | null {
    if (!io.exists(manifestFile)) return null; // Missing manifest is legacy-only.
    try {
      const manifest = JSON.parse(io.read(manifestFile).toString()) as Manifest;
      if (!manifest || manifest.version !== 2 || !['legacy-only', 'migrating', 'v2-active'].includes(manifest.mode) || typeof manifest.generation !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(manifest.generation)) throw new StoreError('STORE_INDEX');
      return manifest;
    } catch { throw new StoreError('STORE_INDEX'); }
  }
  function publish(manifest: Manifest) { io.atomicWrite(manifestFile, Buffer.from(JSON.stringify(manifest))); }
  function pages(manifest: Manifest) {
    const key = (relative: string) => relative.startsWith('blobs/') ? `store-v2/${relative}` : `store-v2/generations/${manifest.generation}/${relative}`;
    const scoped: StoreIO = {
      stats: io.stats, exists: relative => io.exists(key(relative)), read: relative => io.read(key(relative)), atomicWrite: (relative, value) => io.atomicWrite(key(relative), value),
    };
    return openPagedStore(scoped, options.validateSource);
  }
  function active() {
    const manifest = load();
    if (!manifest || manifest.mode !== 'v2-active' || !io.exists(marker)) throw new StoreError('STORE_MODE');
    return pages(manifest);
  }
  function writable() {
    const manifest = load(); // Called only while holding the store mutation lock.
    if (manifest?.mode === 'v2-active') return active();
    if (manifest?.mode === 'migrating' || io.exists('edits.json') || io.exists(marker)) throw new StoreError('STORE_MODE');
    // Empty-store activation has no legacy data to migrate or implicitly consent to.
    const initial: Manifest = manifest ?? { version: 2, mode: 'legacy-only', generation: randomUUID() };
    if (!manifest) publish(initial);
    const store = pages(initial); store.initializeEmpty();
    io.atomicWrite(marker, Buffer.from('STORE_V2_ACTIVE\n')); io.markReadOnly(marker);
    publish({ ...initial, mode: 'v2-active' });
    return store;
  }
  function legacyAllowed() {
    const manifest = load();
    if ((manifest && manifest.mode !== 'legacy-only') || io.exists(marker)) throw new StoreError('STORE_MODE');
  }
  return {
    mode(): Mode { return load()?.mode ?? 'legacy-only'; },
    stats: io.stats,
    append(record: SnapshotRecord) { return io.withMutationLock(() => writable().append(record)); },
    updateStatus(id: string, status: HistoryStatus) { return io.withMutationLock(() => writable().updateStatus(id, status)); },
    listPage(options?: { cursor?: PageCursor; limit?: number }) { return active().listPage(options); },
    getRecord(id: string) { return active().getRecord(id); },
    getBlob(reference: BlobReference) { return active().getBlob(reference); },
    /** Diagnostic only: a successful check must not authorize a later write. */
    assertLegacyWritable() { return io.withMutationLock(legacyAllowed); },
    /** Cooperating legacy writers must keep check and write in this one lock. */
    withLegacyWrite<T>(operation: () => T): T {
      return io.withMutationLock(() => {
        legacyAllowed();
        if (!load()) publish({ version: 2, mode: 'legacy-only', generation: randomUUID() });
        return operation();
      });
    },
  };
}
