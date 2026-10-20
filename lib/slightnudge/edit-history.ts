import { randomUUID } from 'node:crypto';
import fs, { chmodSync, closeSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, statSync, unlinkSync, writeSync } from 'node:fs';
import path from 'node:path';
import { verifyTailwindClass, verifySyntacticParse, findProjectRoot } from './tailwind-verifier';

const historyDirectory = path.join(process.cwd(), '.slightnudge', 'history');
const historyPath = path.join(historyDirectory, 'edits.json');
const pendingDirectory = path.join(process.cwd(), '.slightnudge', 'pending');
const maxHistoryEntries = 100;
const maxSnapshotBytes = 1024 * 1024;

type EditStatus = 'applied' | 'undoing' | 'undone';

interface EditRecord {
  id: string;
  filePath: string;
  createdAt: string;
  summary: string;
  groupId?: string;
  changeCount?: number;
  before: string;
  after: string;
  status: EditStatus;
}

interface PendingEdit {
  id: string;
  filePath: string;
  createdAt: string;
  summary: string;
  oldValue: string;
  newValue: string;
  previewType?: 'className' | 'textContent' | 'imageSource' | 'reorder';
  line?: number;
  before: string;
  after: string;
  repositoryId?: string;
  sourcePath?: string;
}

function readHistory(): EditRecord[] {
  let contents: string;
  try {
    contents = readFileSync(historyPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  const records = JSON.parse(contents);
  if (!Array.isArray(records)) throw new Error('The local edit history is invalid.');
  for (const record of records) {
    if (!record || typeof record.id !== 'string' || typeof record.filePath !== 'string' ||
        typeof record.before !== 'string' || typeof record.after !== 'string' ||
        typeof record.summary !== 'string' || !['applied', 'undoing', 'undone'].includes(record.status)) {
      throw new Error('The local edit history is invalid.');
    }
    relativeFilePath(path.resolve(process.cwd(), record.filePath));
  }
  return records;
}

function sleepSync(ms: number) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const start = Date.now();
    while (Date.now() - start < ms) {}
  }
}

export function atomicWrite(filePath: string, contents: string) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  const existingMode = (() => {
    try { return statSync(filePath).mode; } catch { return undefined; }
  })();

  const fd = openSync(tempPath, 'w', existingMode);
  try {
    writeSync(fd, contents, 0, 'utf8');
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  if (existingMode !== undefined) {
    try { chmodSync(tempPath, existingMode); } catch {}
  }

  const backoffs = [50, 100, 200, 400, 800];
  let renameSucceeded = false;
  let lastError: any = null;

  for (let attempt = 0; attempt <= backoffs.length; attempt++) {
    try {
      fs.renameSync(tempPath, filePath);
      renameSucceeded = true;
      break;
    } catch (err: any) {
      lastError = err;
      const isLockError = err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'EACCES';
      if (isLockError && attempt < backoffs.length) {
        sleepSync(backoffs[attempt]);
      } else {
        break;
      }
    }
  }

  if (!renameSucceeded) {
    try { unlinkSync(tempPath); } catch {}
    throw new Error(`The file is locked and nothing was changed (${lastError?.code || 'locked'}).`);
  }
}

function writeHistory(records: EditRecord[]) {
  atomicWrite(historyPath, JSON.stringify(records.slice(-maxHistoryEntries), null, 2));
}

function relativeFilePath(filePath: string) {
  const workspacePath = realpathSync(process.cwd());
  const absolutePath = realpathSync(filePath);
  const relativePath = path.relative(workspacePath, absolutePath);
  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    throw new Error('The edited file must be inside the SlightNudge workspace.');
  }
  return relativePath;
}

/** Record a source edit without staging or committing any repository files. */
export function recordSourceEdit(filePath: string, before: string, after: string, summary: string, groupId?: string) {
  if (before === after) return { editId: undefined };
  if (Buffer.byteLength(before) > maxSnapshotBytes || Buffer.byteLength(after) > maxSnapshotBytes) {
    throw new Error('This source file is too large for safe local edit history. No change was recorded.');
  }

  const record: EditRecord = {
    id: randomUUID(),
    filePath: relativeFilePath(filePath),
    createdAt: new Date().toISOString(),
    summary,
    groupId,
    changeCount: 1,
    before,
    after,
    status: 'applied',
  };
  const records = readHistory();
  const last = records.at(-1);
  if (groupId && last?.status === 'applied' && last.groupId === groupId && last.filePath === record.filePath && last.after === before) {
    const changeCount = (last.changeCount || 1) + 1;
    records[records.length - 1] = { ...last, after, summary: `${changeCount} visual adjustments`, changeCount };
    writeHistory(records);
    return { editId: last.id };
  }
  writeHistory([...records, record]);
  return { editId: record.id };
}

/** Capture the exact file before/after an AST edit; restore it if journaling fails. */
export function withRecordedSourceEdit<T extends { success: boolean }>(filePath: string, summary: string, edit: () => T): T & { editId?: string } {
  const before = readFileSync(filePath, 'utf8');
  try {
    const result = edit();
    if (!result.success) return result;
    const after = readFileSync(filePath, 'utf8');
    try {
      return { ...result, ...recordSourceEdit(filePath, before, after, summary) };
    } catch (error) {
      atomicWrite(filePath, before);
      throw error;
    }
  } catch (error) {
    const current = readFileSync(filePath, 'utf8');
    if (current !== before) atomicWrite(filePath, before);
    throw error;
  }
}

function pendingPath(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('That preview is no longer available.');
  return path.join(pendingDirectory, `${id}.json`);
}

function pruneExpiredPreviews() {
  try {
    for (const entry of readdirSync(pendingDirectory)) {
      if (!/^[0-9a-f-]{36}\.json$/i.test(entry)) continue;
      const entryPath = path.join(pendingDirectory, entry);
      if (Date.now() - statSync(entryPath).mtimeMs > 30 * 60 * 1000) unlinkSync(entryPath);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

export function createPendingSourceEdit(options: {
  filePath: string;
  before: string;
  after: string;
  summary: string;
  oldValue: string;
  newValue: string;
  previewType?: 'className' | 'textContent' | 'imageSource' | 'reorder';
  line?: number;
  repositoryId?: string;
  sourcePath?: string;
}) {
  const safeFilePath = realpathSync(options.filePath);
  const relativePath = relativeFilePath(safeFilePath);
  const current = readFileSync(safeFilePath, 'utf8');
  if (current !== options.before) throw new Error('This source changed while the preview was being prepared. Try again.');
  if (options.before === options.after) return { changed: false as const };
  if (Buffer.byteLength(options.before) > maxSnapshotBytes || Buffer.byteLength(options.after) > maxSnapshotBytes) {
    throw new Error('This source file is too large for a safe preview.');
  }
  pruneExpiredPreviews();
  const pending: PendingEdit = {
    id: randomUUID(), filePath: relativePath, createdAt: new Date().toISOString(),
    summary: options.summary, oldValue: options.oldValue, newValue: options.newValue, previewType: options.previewType,
    line: options.line, before: options.before, after: options.after,
    repositoryId: options.repositoryId, sourcePath: options.sourcePath,
  };
  atomicWrite(pendingPath(pending.id), JSON.stringify(pending));
  return { changed: true as const, id: pending.id, filePath: pending.filePath, line: pending.line, summary: pending.summary, oldValue: pending.oldValue, newValue: pending.newValue, previewType: pending.previewType || 'className' };
}

function readPendingSourceEdit(id: string): PendingEdit {
  const pending = JSON.parse(readFileSync(pendingPath(id), 'utf8')) as PendingEdit;
  if (pending.id !== id || typeof pending.before !== 'string' || typeof pending.after !== 'string' || typeof pending.filePath !== 'string') {
    throw new Error('The preview data is invalid. Discard it and try again.');
  }
  relativeFilePath(path.resolve(process.cwd(), pending.filePath));
  return pending;
}

export function discardPendingSourceEdit(id: string) {
  try { unlinkSync(pendingPath(id)); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

export async function applyPendingSourceEdit(id: string, groupId?: string, repositoryId?: string, sourcePath?: string, validatedFilePath?: string) {
  const pending = readPendingSourceEdit(id);
  if (pending.repositoryId !== repositoryId) return { success: false as const, error: 'This preview belongs to a different project. Review the change again.' };
  if (pending.repositoryId && (pending.sourcePath !== sourcePath || !validatedFilePath)) return { success: false as const, error: 'This preview belongs to a different source file. Review the change again.' };
  const filePath = pending.repositoryId ? validatedFilePath! : path.resolve(process.cwd(), pending.filePath);
  const current = readFileSync(filePath, 'utf8');
  if (current !== pending.before) {
    return { success: false as const, error: 'This source changed after the preview. Review it again before applying.' };
  }
  if (groupId && !/^[0-9a-f-]{36}$/i.test(groupId)) {
    return { success: false as const, error: 'The edit session is invalid. Preview this change again.' };
  }

  if (!pending.previewType || pending.previewType === 'className') {
    const oldTokens = new Set((pending.oldValue || '').trim().split(/\s+/).filter(Boolean));
    const newTokens = (pending.newValue || '').trim().split(/\s+/).filter(Boolean);
    const addedTokens = newTokens.filter(t => !oldTokens.has(t));
    if (addedTokens.length > 0) {
      const projectDir = findProjectRoot(filePath);
      for (const token of addedTokens) {
        const check = await verifyTailwindClass(token, projectDir);
        if (!check.verified) {
          return {
            success: false as const,
            error: check.error || `can't verify this class: ${token}`,
          };
        }
      }
    }
  }

  const parseCheck = verifySyntacticParse(filePath, pending.after);
  if (!parseCheck.valid) {
    return {
      success: false as const,
      error: `can't verify this content: parse failed (${parseCheck.error})`,
    };
  }

  try {
    atomicWrite(filePath, pending.after);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'The file is locked and nothing was changed.',
    };
  }
  let history: { editId?: string };
  try {
    history = recordSourceEdit(filePath, pending.before, pending.after, pending.summary, groupId);
  } catch (error) {
    atomicWrite(filePath, pending.before);
    throw error;
  }
  // Applying and recording the source change is the transaction's success condition.
  // A failed cleanup only leaves an expiring preview file; it must not report the
  // applied edit as failed after the source and undo history have already changed.
  try { discardPendingSourceEdit(id); } catch { /* expires with the pending preview */ }
  return { success: true as const, editId: history.editId, filePath: pending.filePath, line: pending.line, previewType: pending.previewType || 'className', value: pending.newValue, className: pending.previewType === 'textContent' ? undefined : pending.newValue, message: `Applied ${pending.summary}.` };
}

/** Undo only the most recent SlightNudge edit, and refuse if the file changed afterward. */
export function undoSourceEdit(filePath?: string) {
  const records = readHistory();
  const wantedPath = filePath ? relativeFilePath(filePath) : undefined;
  const index = records.findLastIndex((record) => record.status !== 'undone' && (!wantedPath || record.filePath === wantedPath));
  if (index < 0) return { success: false as const, error: 'There is no visual edit to undo.' };

  const record = records[index];
  const absolutePath = path.resolve(process.cwd(), record.filePath);
  const current = readFileSync(absolutePath, 'utf8');

  // Recover a partially completed undo after a process interruption.
  if (record.status === 'undoing' && current === record.before) {
    records[index] = { ...record, status: 'undone' };
    writeHistory(records);
    return { success: true as const, editId: record.id, message: `Undid ${record.summary}.` };
  }
  if (current !== record.after) {
    return { success: false as const, error: 'This file changed after the visual edit. Nothing was overwritten; review the source before undoing.' };
  }

  records[index] = { ...record, status: 'undoing' };
  writeHistory(records);
  try {
    atomicWrite(absolutePath, record.before);
    records[index] = { ...record, status: 'undone' };
    writeHistory(records);
  } catch (error) {
    try {
      records[index] = { ...record, status: 'applied' };
      writeHistory(records);
    } catch { /* Keep the recovery record if the history store itself is unavailable. */ }
    throw error;
  }

  return { success: true as const, editId: record.id, message: `Undid ${record.summary}.` };
}

export function canUndoSourceEdit(filePath: string) {
  const wantedPath = relativeFilePath(filePath);
  const records = readHistory();
  const record = records.findLast((entry) => entry.status !== 'undone' && entry.filePath === wantedPath);
  if (!record) return false;
  try { return readFileSync(filePath, 'utf8') === record.after; } catch { return false; }
}
