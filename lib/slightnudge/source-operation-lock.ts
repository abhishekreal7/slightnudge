import { perfTimer } from './perf-stages';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const heldKey = Symbol.for('slightnudge.sourceOperationLocks');
const globalLocks = globalThis as typeof globalThis & { [heldKey]?: Set<string> };
// Native process start identity is shared by worker threads and survives module
// reloads. A VM-local UUID cannot distinguish a live worker from a reused PID.
const processStart = performance.timeOrigin;

export class SourceOperationBusyError extends Error {
  readonly code = 'SOURCE_OPERATION_BUSY';
  constructor() { super('Another source operation is in progress. Wait for it to finish, then try again.'); }
}

function alive(pid: number) {
  try { process.kill(pid, 0); return true; }
  catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
}

/**
 * Non-waiting bakery lock for synchronous local-filesystem mutations.
 * Each attempt owns a unique entry; a dead process's entry is never reused.
 * This avoids unlinking/reclaiming a shared lock path while a new owner enters.
 * Choosing entries, unreadable live entries and unknown process liveness refuse.
 * Algorithm reference: https://lamport.azurewebsites.net/pubs/bakery.pdf
 */
export function withSourceOperationLock<T>(directory: string, operation: () => T): T {
  const finishAcquisition = perfTimer('lock');
  fs.mkdirSync(directory, { recursive: true });
  const root = fs.realpathSync(directory);
  const held = globalLocks[heldKey] ||= new Set<string>();
  if (held.has(root)) { finishAcquisition(); return operation(); } // Nested synchronous history helpers.
  const name = `${process.pid}-${randomUUID()}.json`;
  const own = path.join(root, name);
  const readOthers = () => {
    const entries: Array<{ name: string; ticket: number | null }> = [];
    for (const entry of fs.readdirSync(root)) {
      const match = /^(\d+)-[0-9a-f-]{36}\.json$/i.exec(entry);
      if (!match || entry === name) continue;
      const pid = Number(match[1]);
      if (!Number.isSafeInteger(pid) || pid < 1) throw new SourceOperationBusyError();
      if (!alive(pid)) {
        // Unique filenames cannot refer to a replacement owner. No lease expiry
        // is used, so a slow/live process is never mistaken for a dead owner.
        try { fs.unlinkSync(path.join(root, entry)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        continue;
      }
      let contents: string;
      try { contents = fs.readFileSync(path.join(root, entry), 'utf8'); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
      try {
        const data = JSON.parse(contents);
        if (data.pid !== pid || (data.ticket !== null && (!Number.isSafeInteger(data.ticket) || data.ticket < 1))) throw new Error('Invalid ticket');
        if (pid === process.pid && typeof data.processStart === 'number' && data.processStart !== processStart) {
          // A restarted process can reuse its predecessor's PID. In the same
          // PID namespace that predecessor cannot still be alive. Module reloads
          // share the same native process origin, so live workers are not stolen.
          try { fs.unlinkSync(path.join(root, entry)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
          continue;
        }
        entries.push({ name: entry, ticket: data.ticket });
      } catch { throw new SourceOperationBusyError(); }
    }
    return entries;
  };
  // Publish choosing before observing other tickets; partial choosing writes
  // fail closed in other processes. Updates below use atomic replacement.
  const fd = fs.openSync(own, 'wx');
  try {
    try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, processStart, ticket: null })); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    const ticket = Math.max(0, ...readOthers().map(entry => entry.ticket || 0)) + 1;
    if (!Number.isSafeInteger(ticket)) throw new SourceOperationBusyError();
    const temporary = `${own}.tmp`;
    const update = fs.openSync(temporary, 'wx');
    try { fs.writeFileSync(update, JSON.stringify({ pid: process.pid, processStart, ticket })); fs.fsyncSync(update); }
    finally { fs.closeSync(update); }
    // Windows can briefly deny replacement while another contender reads our
    // choosing ticket. Keep that ticket published while retrying; never enter
    // the critical section until the final ticket has been replaced atomically.
    for (let attempt = 0; ; attempt++) {
      try { fs.renameSync(temporary, own); break; }
      catch (error) {
        if (!['EPERM', 'EBUSY', 'EACCES'].includes((error as NodeJS.ErrnoException).code || '')) throw error;
        if (attempt >= 3) throw new SourceOperationBusyError();
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10 * 2 ** attempt);
      }
    }
    for (const other of readOthers()) {
      if (other.ticket === null || other.ticket < ticket || (other.ticket === ticket && other.name < name)) throw new SourceOperationBusyError();
    }
    held.add(root); finishAcquisition();
    try { return operation(); }
    finally { held.delete(root); }
  } finally {
    finishAcquisition();
    // Cleanup failure cannot turn an accepted source/history mutation into a
    // reported failed write. An undeleted live ticket blocks further mutations.
    try { fs.unlinkSync(own); } catch { /* A dead owner's unique ticket can be cleared on restart. */ }
    try { fs.unlinkSync(`${own}.tmp`); } catch { /* Not an active ticket. */ }
  }
}
