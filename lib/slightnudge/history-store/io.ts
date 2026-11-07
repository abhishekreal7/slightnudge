import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { StoreError } from './errors';

export interface StoreIO {
  readonly stats: { bytesRead: number; bytesWritten: number; writes: number };
  read(relative: string): Buffer;
  exists(relative: string): boolean;
  atomicWrite(relative: string, value: Buffer): void;
}
export interface NodeStoreIO extends StoreIO {
  withMutationLock<T>(operation: () => T): T;
  markReadOnly(relative: string): void;
}

/** Explicit root only: never resolves the developer's history implicitly. */
export function createNodeIO(directory: string, beforeRename?: () => void): NodeStoreIO {
  let root: string;
  try { root = fs.realpathSync(directory); } catch { throw new StoreError('STORE_IO'); }
  const stats = { bytesRead: 0, bytesWritten: 0, writes: 0 };
  function locate(relative: string, createParents = false) {
    const segments = relative.split('/');
    if (!segments.length || segments.some(s => !/^[a-zA-Z0-9._-]+$/.test(s) || s === '.' || s === '..')) throw new StoreError('STORE_CONTAINMENT');
    if (fs.lstatSync(root).isSymbolicLink() || fs.realpathSync(root) !== root) throw new StoreError('STORE_CONTAINMENT');
    let current = root;
    for (let i = 0; i < segments.length; i++) {
      current = path.join(current, segments[i]);
      let info;
      try { info = fs.lstatSync(current); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        if (createParents && i < segments.length - 1) { fs.mkdirSync(current); info = fs.lstatSync(current); }
      }
      if (info && (info.isSymbolicLink() || (i < segments.length - 1 ? !info.isDirectory() : !info.isFile()))) throw new StoreError('STORE_CONTAINMENT');
    }
    return current;
  }
  function protect<T>(run: () => T): T {
    try { return run(); } catch (error) { throw error instanceof StoreError ? error : new StoreError('STORE_IO'); }
  }
  return {
    stats,
    markReadOnly(relative) { protect(() => { fs.chmodSync(locate(relative), 0o444); }); },
    withMutationLock<T>(operation: () => T): T {
      return protect(() => {
        const relative = 'store-v2-mutation.lock'; const lock = locate(relative);
        let descriptor: number;
        try { descriptor = fs.openSync(lock, 'wx', 0o600); }
        catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new StoreError('STORE_BUSY'); throw error; }
        try { return operation(); }
        finally { fs.closeSync(descriptor); fs.unlinkSync(locate(relative)); }
      });
    },
    read(relative) { return protect(() => { const value = fs.readFileSync(locate(relative)); stats.bytesRead += value.length; return value; }); },
    exists(relative) { return protect(() => { const target = locate(relative); return fs.existsSync(target); }); },
    atomicWrite(relative, value) {
      protect(() => {
        const target = locate(relative, true);
        const temp = target + '.' + randomUUID() + '.tmp';
        let descriptor: number | undefined;
        try {
          const mode = fs.existsSync(target) ? fs.statSync(target).mode : 0o600;
          descriptor = fs.openSync(temp, 'wx', mode);
          let offset = 0;
          while (offset < value.length) {
            const written = fs.writeSync(descriptor, value, offset, value.length - offset);
            if (!written) throw new StoreError('STORE_IO');
            offset += written; stats.bytesWritten += written;
          }
          fs.fsyncSync(descriptor); fs.closeSync(descriptor); descriptor = undefined;
          fs.chmodSync(temp, mode);
          beforeRename?.();
          const backoffs = [50, 100, 200, 400, 800];
          for (let attempt = 0; ; attempt++) {
            locate(relative);
            try { fs.renameSync(temp, target); break; }
            catch (error) {
              if (!['EPERM', 'EBUSY', 'EACCES'].includes((error as NodeJS.ErrnoException).code || '') || attempt === backoffs.length) throw error;
              Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, backoffs[attempt]);
            }
          }
          stats.writes++;
        } finally {
          if (descriptor !== undefined) fs.closeSync(descriptor);
          if (fs.existsSync(temp)) fs.unlinkSync(temp);
        }
      });
    },
  };
}
