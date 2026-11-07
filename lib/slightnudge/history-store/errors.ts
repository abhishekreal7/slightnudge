export type StoreReason = 'STORE_IO' | 'STORE_CONTAINMENT' | 'STORE_BLOB_INVALID';
/** Never attach causes, filenames or payload values to public store errors. */
export class StoreError extends Error {
  constructor(readonly code: StoreReason) { super(code); this.name = 'StoreError'; }
}
