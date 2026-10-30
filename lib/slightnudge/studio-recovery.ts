/** Tab-local references for a write whose response or UI confirmation may be lost.
 * This cache is never evidence that source was saved; only server status is. */
export interface StudioRecoveryRecord {
  version: 1;
  operationId: string;
  kind: 'apply' | 'undo';
  previewId: string;
  editId?: string;
  repositoryId?: string;
  sourcePath?: string;
  filePath: string;
  startedAt: number;
  view: unknown;
}

export interface RecoveryStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
const maxBytes = 256 * 1024;
const keyFor = (repositoryId?: string) => `slightnudge:write-recovery:v1:${repositoryId === undefined ? 'workspace' : `project:${encodeURIComponent(repositoryId)}`}`;
const shortString = (value: unknown, max = 1000): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;
const browserStorage = () => window.sessionStorage;

export type RecoveryRead = { status: 'empty' } | { status: 'found'; record: StudioRecoveryRecord } | { status: 'unavailable'; error: string };

export function readStudioRecovery(repositoryId?: string, storage?: RecoveryStorage): RecoveryRead {
  try {
    const raw = (storage || browserStorage()).getItem(keyFor(repositoryId));
    if (!raw) return { status: 'empty' };
    if (raw.length > maxBytes) throw new Error('Oversized recovery record');
    const record = JSON.parse(raw) as StudioRecoveryRecord;
    if (record.version !== 1 || !shortString(record.operationId, 128) || !['apply', 'undo'].includes(record.kind) ||
      !shortString(record.previewId, 128) || !shortString(record.filePath) || !Number.isFinite(record.startedAt) ||
      record.repositoryId !== repositoryId || (record.editId !== undefined && !shortString(record.editId, 128)) ||
      (repositoryId && !shortString(record.sourcePath))) throw new Error('Invalid recovery record');
    return { status: 'found', record };
  } catch {
    return { status: 'unavailable', error: 'The browser recovery record could not be read. Inspect the current source before starting another editing session.' };
  }
}

export function saveStudioRecovery(record: Omit<StudioRecoveryRecord, 'version' | 'operationId' | 'startedAt'>, storage?: RecoveryStorage): StudioRecoveryRecord {
  const next: StudioRecoveryRecord = { ...record, version: 1, operationId: crypto.randomUUID(), startedAt: Date.now() };
  const serialized = JSON.stringify(next);
  if (serialized.length > maxBytes) throw new Error('This editing session is too large to preserve for recovery. No write was sent.');
  try { (storage || browserStorage()).setItem(keyFor(record.repositoryId), serialized); }
  catch { throw new Error('The browser could not preserve this operation for recovery. No write was sent. Enable session storage, then try again.'); }
  return next;
}

export function clearStudioRecovery(record: StudioRecoveryRecord, storage?: RecoveryStorage): boolean {
  try {
    const target = storage || browserStorage();
    const current = readStudioRecovery(record.repositoryId, target);
    if (current.status === 'empty') return true;
    // A late result must never remove another operation's recovery reference.
    if (current.status !== 'found' || current.record.operationId !== record.operationId) return false;
    target.removeItem(keyFor(record.repositoryId));
    return true;
  } catch { return false; }
}
