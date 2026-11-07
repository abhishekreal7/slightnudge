import { createHash } from 'node:crypto';
import { StoreError } from './errors';
import type { StoreIO } from './io';

export interface BlobReference { sha256: string; size: number }
const digest = (value: Buffer) => createHash('sha256').update(value).digest('hex');
export function createBlobStore(io: StoreIO) {
  function location(ref: BlobReference) {
    if (!ref || !/^[a-f0-9]{64}$/.test(ref.sha256) || !Number.isSafeInteger(ref.size) || ref.size < 0) throw new StoreError('STORE_BLOB_INVALID');
    return `blobs/${ref.sha256.slice(0, 2)}/${ref.sha256}`;
  }
  function get(ref: BlobReference): Buffer {
    const value = io.read(location(ref));
    if (value.length !== ref.size || digest(value) !== ref.sha256) throw new StoreError('STORE_BLOB_INVALID');
    return value;
  }
  return {
    get,
    put(value: Buffer): BlobReference {
      const ref = { sha256: digest(value), size: value.length };
      const target = location(ref);
      if (io.exists(target)) get(ref);
      else io.atomicWrite(target, value);
      return ref;
    },
  };
}
