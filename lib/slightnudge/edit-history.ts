import { createHash, randomUUID } from 'node:crypto';
import fs, { chmodSync, closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, statSync, unlinkSync, writeSync } from 'node:fs';
import path from 'node:path';
import { Project, SyntaxKind, Node, JsxOpeningElement, JsxSelfClosingElement, StringLiteral } from 'ts-morph';
import { verifyTailwindClass, verifySyntacticParse, findProjectRoot } from './tailwind-verifier';
import { isElementInsideLoop, isComponentUsedMultipleTimes } from './ast-nudger';
import { guardUnfinishedGroups, readGroupJournal, validGroupId } from './source-group-journal';
import { SourceOperationBusyError, withSourceOperationLock } from './source-operation-lock';
import { validateComponentDependencies } from './component-ownership';
import { assertSourceScope } from './source-paths';

function isTestMode(): boolean {
  return process.env.SLIGHTNUDGE_TEST === '1' && process.env.NODE_ENV !== 'production';
}

export function getWorkspacePath(): string {
  return (isTestMode() && process.env.SLIGHTNUDGE_WORKSPACE_ROOT) || process.cwd();
}

export function getHistoryPath(): string {
  if (isTestMode() && process.env.SLIGHTNUDGE_HISTORY_PATH) {
    return process.env.SLIGHTNUDGE_HISTORY_PATH;
  }
  const dataDir = (isTestMode() && process.env.SLIGHTNUDGE_DATA_DIR) || path.join(getWorkspacePath(), '.slightnudge');
  return path.join(dataDir, 'history', 'edits.json');
}

function getPendingDirectory(): string {
  if (isTestMode() && process.env.SLIGHTNUDGE_PENDING_DIR) {
    return process.env.SLIGHTNUDGE_PENDING_DIR;
  }
  const dataDir = (isTestMode() && process.env.SLIGHTNUDGE_DATA_DIR) || path.join(getWorkspacePath(), '.slightnudge');
  return path.join(dataDir, 'pending');
}

const maxHistoryEntries = 100;
const maxSnapshotBytes = 1024 * 1024;

export type EditStatus = 'applied' | 'undoing' | 'undone';

interface SourceApplyDetails {
  code?: string;
  error?: string;
  editId?: string;
  filePath?: string;
  line?: number;
  previewType?: 'className' | 'textContent' | 'imageSource' | 'reorder';
  value?: string;
  className?: string;
  message?: string;
}

export type SourceApplyResult = SourceApplyDetails & ({ success: true; editId: string } | { success: false; error: string });

export interface EditRecord {
  componentDependencies?: import('./component-ownership').ComponentDependency[];
  id: string;
  /** Correlate accepted proposals even after their pending files are removed. */
  previewIds?: string[];
  repositoryId?: string;
  sourcePath?: string;
  filePath: string;
  createdAt: string;
  summary: string;
  groupId?: string;
  /** Explicit grouped-transaction identity, distinct from gesture grouping. */
  changeSetId?: string;
  changeCount?: number;
  before: string;
  after: string;
  status: EditStatus;
  undoBefore?: string;
  undoAfter?: string;
  missing?: boolean;
  previewType?: 'className' | 'textContent' | 'imageSource' | 'reorder';
  line?: number;
  column?: number;
  elementId?: string;
  tagName?: string;
  oldClassName?: string;
  newClassName?: string;
  removedTokens?: string[];
  addedTokens?: string[];
  oldValue?: string;
  newValue?: string;
}

export interface PendingEdit {
  componentDependencies?: import('./component-ownership').ComponentDependency[];
  draft?: boolean;
  sourceOrder?: number[];
  id: string;
  filePath: string;
  createdAt: string;
  summary: string;
  oldValue: string;
  newValue: string;
  previewType?: 'className' | 'textContent' | 'imageSource' | 'reorder';
  line?: number;
  column?: number;
  elementId?: string;
  tagName?: string;
  oldClassName?: string;
  newClassName?: string;
  removedTokens?: string[];
  addedTokens?: string[];
  before: string;
  after: string;
  repositoryId?: string;
  sourcePath?: string;
}

interface ApplyIntent {
  version: 1;
  phase: 'applying' | 'not-applied';
  pending: PendingEdit;
  groupId?: string;
  historyDigest: string;
}

class SourceRecoveryRequiredError extends Error {
  readonly code = 'SOURCE_RECOVERY_REQUIRED';
  constructor(kind = 'save') { super(`An interrupted ${kind} needs recovery before this file can be changed. Check the status of the reviewed change first.`); }
}

export function withHistoryMutation<T>(operation: () => T): T {
  return withSourceOperationLock(path.join(path.dirname(getHistoryPath()), 'mutation-locks'), operation);
}

export function readHistory(): EditRecord[] {
  let contents: string;
  try {
    contents = readFileSync(getHistoryPath(), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  let rawRecords: any;
  try {
    rawRecords = JSON.parse(contents);
  } catch (err: any) {
    throw new Error(`The local edit history is invalid or corrupted: ${err.message}`);
  }

  if (!Array.isArray(rawRecords)) throw new Error('The local edit history is invalid.');

  const workspaceRoot = getWorkspacePath();
  let realWorkspacePath: string | null = null;
  try {
    realWorkspacePath = realpathSync(workspaceRoot);
  } catch {}

  const validRecords: EditRecord[] = [];

  for (const record of rawRecords) {
    if (!record || typeof record.id !== 'string' || typeof record.filePath !== 'string' ||
        typeof record.before !== 'string' || typeof record.after !== 'string' ||
        typeof record.summary !== 'string' || !['applied', 'undoing', 'undone'].includes(record.status)) {
      console.warn('Skipping malformed edit history record:', record);
      continue;
    }

    // Path safety check: ensure record.filePath cannot escape workspace root
    const rawPath = record.filePath;
    const normalized = path.normalize(rawPath);
    if (path.isAbsolute(normalized) || normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
      console.warn(`Skipping history record whose path escapes workspace root: ${rawPath}`);
      continue;
    }

    const resolvedPath = path.resolve(workspaceRoot, normalized);
    const relFromWs = path.relative(workspaceRoot, resolvedPath);
    if (!relFromWs || relFromWs === '..' || relFromWs.startsWith(`..${path.sep}`) || path.isAbsolute(relFromWs)) {
      console.warn(`Skipping history record whose path escapes workspace root: ${rawPath}`);
      continue;
    }

    if (record.repositoryId !== undefined) assertSourceScope(workspaceRoot, resolvedPath, record.repositoryId, record.sourcePath);

    // Check if the file currently exists on disk
    if (existsSync(resolvedPath)) {
      if (record.repositoryId === undefined) assertSourceScope(workspaceRoot, resolvedPath);
      if (realWorkspacePath) {
        try {
          const realFile = realpathSync(resolvedPath);
          const realRel = path.relative(realWorkspacePath, realFile);
          if (!realRel || realRel === '..' || realRel.startsWith(`..${path.sep}`) || path.isAbsolute(realRel)) {
            console.warn(`Skipping history record whose symlink escapes workspace root: ${rawPath}`);
            continue;
          }
        } catch {
          validRecords.push({ ...record, missing: true });
          continue;
        }
      }
      validRecords.push({ ...record, missing: false });
    } else {
      // File missing on disk: keep record in history, mark as missing so UI can show unavailable
      validRecords.push({ ...record, missing: true });
    }
  }

  return validRecords;
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

export function writeHistory(records: EditRecord[]) {
  // An interrupted Undo is a recovery intent, so ordinary history retention
  // must not erase it while edits to other files continue.
  const retained = records.filter((record, index) => record.status === 'undoing' || index >= records.length - maxHistoryEntries);
  atomicWrite(getHistoryPath(), JSON.stringify(retained, null, 2));
}

let preWriteTestHook: ((filePath: string) => void) | null = null;

export function setPreWriteTestHook(hook: ((filePath: string) => void) | null): void {
  if (process.env.SLIGHTNUDGE_TEST === '1' && process.env.NODE_ENV !== 'production') {
    preWriteTestHook = hook;
  }
}

export function invokePreWriteHook(filePath: string): void {
  if (process.env.SLIGHTNUDGE_TEST === '1' && process.env.NODE_ENV !== 'production' && preWriteTestHook) {
    preWriteTestHook(filePath);
  }
}

export function assertWriteTargetInsideWorkspace(targetPath: string): string {
  if (!targetPath || typeof targetPath !== 'string') {
    throw new Error('The target file must be inside the SlightNudge workspace.');
  }

  // Reject UNC paths
  if (targetPath.startsWith('\\\\') || targetPath.startsWith('//')) {
    throw new Error('The target file must be inside the SlightNudge workspace.');
  }

  let cleanPath = targetPath;
  if (cleanPath.startsWith('\\\\?\\UNC\\')) {
    throw new Error('The target file must be inside the SlightNudge workspace.');
  }
  if (cleanPath.startsWith('\\\\?\\')) {
    cleanPath = cleanPath.slice(4);
  }

  const workspaceRoot = getWorkspacePath();
  const realWorkspace = realpathSync(workspaceRoot);

  const resolved = path.resolve(workspaceRoot, cleanPath);
  const relSimple = path.relative(workspaceRoot, resolved);
  if (!relSimple || relSimple === '..' || relSimple.startsWith(`..${path.sep}`) || path.isAbsolute(relSimple)) {
    throw new Error('The target file must be inside the SlightNudge workspace.');
  }

  let realTarget: string;
  try {
    if (existsSync(resolved)) {
      realTarget = realpathSync(resolved);
    } else {
      const parentDir = path.dirname(resolved);
      const realParent = realpathSync(parentDir);
      realTarget = path.join(realParent, path.basename(resolved));
    }
  } catch (err: any) {
    throw new Error(`The target file must be inside the SlightNudge workspace: ${err.message}`);
  }

  const relReal = path.relative(realWorkspace, realTarget);
  if (!relReal || relReal === '..' || relReal.startsWith(`..${path.sep}`) || path.isAbsolute(relReal)) {
    throw new Error('The target file must be inside the SlightNudge workspace.');
  }

  return relReal;
}

function relativeFilePath(filePath: string) {
  return assertWriteTargetInsideWorkspace(filePath);
}

export function deriveClassEditDetails(before: string, after: string, lineHint?: number) {
  try {
    const project = new Project({ useInMemoryFileSystem: true, skipAddingFilesFromTsConfig: true });
    const beforeFile = project.createSourceFile('before.tsx', before);
    const afterFile = project.createSourceFile('after.tsx', after);

    const beforeEls = [
      ...beforeFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
      ...beforeFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
    ];
    const afterEls = [
      ...afterFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
      ...afterFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
    ];

    let candidateBefore: (JsxOpeningElement | JsxSelfClosingElement) | null = null;
    let candidateAfter: (JsxOpeningElement | JsxSelfClosingElement) | null = null;

    for (let i = 0; i < beforeEls.length && i < afterEls.length; i++) {
      const b = beforeEls[i];
      const a = afterEls[i];
      const bAttr = b.getAttribute('className');
      const aAttr = a.getAttribute('className');
      const bInit = bAttr && Node.isJsxAttribute(bAttr) ? bAttr.getInitializer() : null;
      const aInit = aAttr && Node.isJsxAttribute(aAttr) ? aAttr.getInitializer() : null;
      const bLit = bInit && Node.isStringLiteral(bInit) ? bInit : (bInit && Node.isJsxExpression(bInit) && bInit.getExpression() && Node.isStringLiteral(bInit.getExpression()!) ? (bInit.getExpression() as StringLiteral) : null);
      const aLit = aInit && Node.isStringLiteral(aInit) ? aInit : (aInit && Node.isJsxExpression(aInit) && aInit.getExpression() && Node.isStringLiteral(aInit.getExpression()!) ? (aInit.getExpression() as StringLiteral) : null);

      if (bLit && aLit && bLit.getLiteralValue() !== aLit.getLiteralValue()) {
        candidateBefore = b;
        candidateAfter = a;
        break;
      }
    }

    if (!candidateBefore || !candidateAfter) {
      if (lineHint) {
        const b = beforeEls.find(el => el.getStartLineNumber() === lineHint);
        const a = afterEls.find(el => el.getStartLineNumber() === lineHint);
        if (b && a) {
          candidateBefore = b;
          candidateAfter = a;
        }
      }
    }

    if (!candidateBefore || !candidateAfter) return null;

    const bAttr = candidateBefore.getAttribute('className');
    const aAttr = candidateAfter.getAttribute('className');
    const bInit = bAttr && Node.isJsxAttribute(bAttr) ? bAttr.getInitializer() : null;
    const aInit = aAttr && Node.isJsxAttribute(aAttr) ? aAttr.getInitializer() : null;
    const bLit = bInit && Node.isStringLiteral(bInit) ? bInit : (bInit && Node.isJsxExpression(bInit) && bInit.getExpression() && Node.isStringLiteral(bInit.getExpression()!) ? (bInit.getExpression() as StringLiteral) : null);
    const aLit = aInit && Node.isStringLiteral(aInit) ? aInit : (aInit && Node.isJsxExpression(aInit) && aInit.getExpression() && Node.isStringLiteral(aInit.getExpression()!) ? (aInit.getExpression() as StringLiteral) : null);

    if (!bLit || !aLit) return null;

    const oldClassName = bLit.getLiteralValue();
    const newClassName = aLit.getLiteralValue();

    const oldTokens = oldClassName.trim().split(/\s+/).filter(Boolean);
    const newTokens = newClassName.trim().split(/\s+/).filter(Boolean);
    const addedTokens = newTokens.filter(t => !oldTokens.includes(t));
    const removedTokens = oldTokens.filter(t => !newTokens.includes(t));

    if (addedTokens.length === 0 && removedTokens.length === 0) return null;

    const idAttr = candidateBefore.getAttribute('id');
    const elementId = idAttr && Node.isJsxAttribute(idAttr) && idAttr.getInitializer() && Node.isStringLiteral(idAttr.getInitializer()!) ? (idAttr.getInitializer() as StringLiteral).getLiteralValue() : undefined;
    const pos = beforeFile.getLineAndColumnAtPos(candidateBefore.getStart());

    return {
      previewType: 'className' as const,
      line: pos.line,
      column: pos.column,
      elementId,
      tagName: candidateBefore.getTagNameNode().getText(),
      oldClassName,
      newClassName,
      addedTokens,
      removedTokens,
    };
  } catch {
    return null;
  }
}

/** Record a source edit without staging or committing any repository files. */
export function recordSourceEdit(filePath: string, before: string, after: string, summary: string, groupId?: string, metadata?: Partial<EditRecord>) {
  return withHistoryMutation(() => {
    assertNoUnfinishedApply(filePath, metadata?.previewIds?.at(-1));
    return recordSourceEditUnlocked(filePath, before, after, summary, groupId, metadata);
  });
}

function recordSourceEditUnlocked(
  filePath: string,
  before: string,
  after: string,
  summary: string,
  groupId?: string,
  metadata?: Partial<EditRecord>
) {
  if (before === after) return { editId: undefined };
  if (Buffer.byteLength(before) > maxSnapshotBytes || Buffer.byteLength(after) > maxSnapshotBytes) {
    throw new Error('This source file is too large for safe local edit history. No change was recorded.');
  }

  let classDetails: Partial<EditRecord> = {};
  if (!metadata?.addedTokens && !metadata?.removedTokens) {
    const derived = deriveClassEditDetails(before, after, metadata?.line);
    if (derived) {
      classDetails = derived;
    }
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
    ...classDetails,
    ...metadata,
  };
  const records = readHistory();
  const last = records.at(-1);
  if (groupId && last?.status === 'applied' && last.groupId === groupId && last.filePath === record.filePath && last.after === before) {
    const changeCount = (last.changeCount || 1) + 1;
    records[records.length - 1] = { ...last, after, summary: `${changeCount} visual adjustments`, changeCount, ...metadata,
      previewIds: [...(last.previewIds || []), ...(metadata?.previewIds || [])],
    };
    writeHistory(records);
    return { editId: last.id };
  }
  writeHistory([...records, record]);
  return { editId: record.id };
}

/** Capture the exact file before/after an AST edit; restore it if journaling fails. */
export function withRecordedSourceEdit<T extends { success: boolean }>(filePath: string, summary: string, edit: () => T): T & { editId?: string } {
  return withHistoryMutation(() => {
    assertNoUnfinishedApply(filePath);
    return withRecordedSourceEditUnlocked(filePath, summary, edit);
  });
}

function withRecordedSourceEditUnlocked<T extends { success: boolean }>(filePath: string, summary: string, edit: () => T): T & { editId?: string } {
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
  return path.join(getPendingDirectory(), `${id}.json`);
}

function pruneExpiredPreviews() {
  const dir = getPendingDirectory();
  try {
    for (const entry of readdirSync(dir)) {
      if (!/^[0-9a-f-]{36}\.json$/i.test(entry)) continue;
      const entryPath = path.join(dir, entry);
      const age = Date.now() - statSync(entryPath).mtimeMs;
      if (!existsSync(applyIntentPath(entry.slice(0, -5))) && age > 30 * 60 * 1000) {
        const persisted = JSON.parse(readFileSync(entryPath, 'utf8'));
        if (!persisted.draft || age > 30 * 24 * 60 * 60 * 1000) unlinkSync(entryPath);
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

export function createPendingSourceEdit(options: {
  componentDependencies?: import('./component-ownership').ComponentDependency[];
  draft?: boolean;
  sourceOrder?: number[];
  filePath: string;
  before: string;
  after: string;
  summary: string;
  oldValue: string;
  newValue: string;
  previewType?: 'className' | 'textContent' | 'imageSource' | 'reorder';
  line?: number;
  column?: number;
  elementId?: string;
  tagName?: string;
  oldClassName?: string;
  newClassName?: string;
  removedTokens?: string[];
  addedTokens?: string[];
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
    componentDependencies: options.componentDependencies,
    draft: options.draft,
    sourceOrder: options.sourceOrder,
    id: randomUUID(),
    filePath: relativePath,
    createdAt: new Date().toISOString(),
    summary: options.summary,
    oldValue: options.oldValue,
    newValue: options.newValue,
    previewType: options.previewType,
    line: options.line,
    column: options.column,
    elementId: options.elementId,
    tagName: options.tagName,
    oldClassName: options.oldClassName,
    newClassName: options.newClassName,
    removedTokens: options.removedTokens,
    addedTokens: options.addedTokens,
    before: options.before,
    after: options.after,
    repositoryId: options.repositoryId,
    sourcePath: options.sourcePath,
  };
  atomicWrite(pendingPath(pending.id), JSON.stringify(pending));
  return {
    changed: true as const,
    id: pending.id,
    filePath: pending.filePath,
    line: pending.line,
    summary: pending.summary,
    oldValue: pending.oldValue,
    newValue: pending.newValue,
    previewType: pending.previewType || 'className',
    oldClassName: pending.oldClassName,
    newClassName: pending.newClassName,
  };
}

export function readPendingSourceEdit(id: string): PendingEdit {
  const pending = JSON.parse(readFileSync(pendingPath(id), 'utf8')) as PendingEdit;
  validatePending(pending, id);
  return pending;
}

/** Only server-produced snapshots can become a draft's next revision. */
export function readDraftSource(id: string, filePath: string, repositoryId?: string) {
  const pending = readPendingSourceEdit(id);
  if (!pending.draft || pending.repositoryId !== repositoryId || realpathSync(filePath) !== realpathSync(path.resolve(getWorkspacePath(), pending.filePath))) throw new Error('This draft belongs to a different source file or project.');
  if (readFileSync(filePath, 'utf8') !== pending.before) throw new Error('The source changed outside this draft. Your draft is preserved; resolve the source change before saving.');
  return pending;
}

function validatePending(pending: PendingEdit, id: string) {
  if (!pending || pending.id !== id || typeof pending.before !== 'string' || typeof pending.after !== 'string' || pending.before === pending.after || typeof pending.filePath !== 'string' || path.isAbsolute(pending.filePath) ||
      typeof pending.summary !== 'string' || typeof pending.oldValue !== 'string' || typeof pending.newValue !== 'string' ||
      Buffer.byteLength(pending.before) > maxSnapshotBytes || Buffer.byteLength(pending.after) > maxSnapshotBytes ||
      (pending.previewType !== undefined && !['className', 'textContent', 'imageSource', 'reorder'].includes(pending.previewType))) {
    throw new Error('The preview data is invalid. Discard it and try again.');
  }
  relativeFilePath(path.resolve(getWorkspacePath(), pending.filePath));
  assertSourceScope(getWorkspacePath(), pending.filePath, pending.repositoryId, pending.sourcePath);
}

function applyIntentPath(id: string) {
  pendingPath(id);
  return path.join(path.dirname(getHistoryPath()), 'apply-journal', `${id}.json`);
}

function readApplyIntent(id: string): ApplyIntent | null {
  let contents: string;
  try {
    if (statSync(applyIntentPath(id)).size > maxSnapshotBytes * 32) throw new Error('The save recovery record is too large.');
    contents = readFileSync(applyIntentPath(id), 'utf8');
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  const intent = JSON.parse(contents) as ApplyIntent;
  if (intent.version !== 1 || !['applying', 'not-applied'].includes(intent.phase) || typeof intent.historyDigest !== 'string' || !/^[a-f0-9]{64}$/.test(intent.historyDigest) ||
      (intent.groupId !== undefined && !/^[0-9a-f-]{36}$/i.test(intent.groupId))) throw new Error('The save recovery record is invalid. No source was changed.');
  validatePending(intent.pending, id);
  return intent;
}

export function fileHistoryDigest(filePath: string) {
  const absolute = path.resolve(getWorkspacePath(), filePath);
  const entries = readHistory().filter(record => path.resolve(getWorkspacePath(), record.filePath) === absolute);
  return createHash('sha256').update(JSON.stringify(entries.map(record => ({ id: record.id, status: record.status, before: record.before, after: record.after, previewIds: record.previewIds })))).digest('hex');
}

function hasAcceptedPreview(id: string) {
  return readHistory().some(record => Array.isArray(record.previewIds) && record.previewIds.includes(id));
}

export function assertNoUnfinishedApply(filePath: string, exceptId?: string, exceptUndoId?: string, exceptGroupId?: string) {
  guardUnfinishedGroups(path.join(path.dirname(getHistoryPath()), 'groups'), getWorkspacePath(), filePath, exceptGroupId);
  for (const record of readHistory().filter(record => record.changeSetId && record.status !== 'undone' && path.resolve(getWorkspacePath(), record.filePath) === path.resolve(getWorkspacePath(), filePath))) {
    if (!readGroupJournal(path.join(path.dirname(getHistoryPath()), 'groups'), record.changeSetId!)) throw new SourceRecoveryRequiredError('change-set recovery');
  }
  if (readHistory().some(record => record.status === 'undoing' && record.id !== exceptUndoId && path.resolve(getWorkspacePath(), record.filePath) === path.resolve(getWorkspacePath(), filePath))) {
    throw new SourceRecoveryRequiredError('Undo');
  }
  const directory = path.dirname(applyIntentPath('00000000-0000-0000-0000-000000000000'));
  let files: string[];
  try { files = readdirSync(directory); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  for (const name of files) {
    if (!/^[0-9a-f-]{36}\.json$/i.test(name)) continue;
    const id = name.slice(0, -5);
    if (id === exceptId) continue;
    const intent = readApplyIntent(id);
    if (!intent || path.resolve(getWorkspacePath(), intent.pending.filePath) !== path.resolve(getWorkspacePath(), filePath)) continue;
    if (hasAcceptedPreview(id)) { try { unlinkSync(applyIntentPath(id)); } catch { /* A receipt already protects this operation. */ } continue; }
    if (intent.phase !== 'not-applied') throw new SourceRecoveryRequiredError();
  }
}

export function pendingMetadata(pending: PendingEdit): Partial<EditRecord> {
  return {
    componentDependencies: pending.componentDependencies,
    previewIds: [pending.id], repositoryId: pending.repositoryId, sourcePath: pending.sourcePath,
    previewType: pending.previewType, line: pending.line, column: pending.column, elementId: pending.elementId, tagName: pending.tagName,
    oldClassName: pending.oldClassName, newClassName: pending.newClassName, removedTokens: pending.removedTokens, addedTokens: pending.addedTokens,
    oldValue: pending.oldValue, newValue: pending.newValue,
  };
}

function matchesPendingScope(pending: PendingEdit, repositoryId?: string, sourcePath?: string, validatedFilePath?: string) {
  return pending.repositoryId === repositoryId && (!repositoryId || (pending.sourcePath === sourcePath && !!validatedFilePath && relativeFilePath(validatedFilePath) === path.normalize(pending.filePath)));
}

function finishApplyCleanup(id: string) {
  try { unlinkSync(applyIntentPath(id)); } catch { /* Durable history is the accepted receipt. */ }
  try { discardPendingSourceEdit(id); } catch { /* Pending cleanup cannot revoke an accepted write. */ }
}

export function discardPendingSourceEdit(id: string) {
  return withHistoryMutation(() => {
    const intent = readApplyIntent(id);
    if (intent?.phase === 'applying' && !hasAcceptedPreview(id)) throw new SourceRecoveryRequiredError();
    if (intent?.phase === 'not-applied') unlinkSync(applyIntentPath(id));
    try { unlinkSync(pendingPath(id)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  });
}

function readSourceApplyOutcome(id: string, repositoryId?: string, sourcePath?: string, validatedFilePath?: string): SourceApplyResult | null {
  pendingPath(id); // Validate the identifier before consulting history.
  const record = readHistory().findLast(entry => Array.isArray(entry.previewIds) && entry.previewIds.includes(id));
  if (!record) return null;
  if (record.repositoryId !== repositoryId || (repositoryId && (record.sourcePath !== sourcePath || !validatedFilePath || path.normalize(record.filePath) !== relativeFilePath(validatedFilePath)))) {
    return { success: false as const, code: 'OUTCOME_SCOPE_MISMATCH' as const, error: 'This change belongs to a different project or source file.' };
  }
  if (record.status !== 'applied') {
    return { success: false as const, code: 'APPLY_ALREADY_UNDONE' as const, error: 'This change was already undone or is being restored. It was not applied again.' };
  }
  const filePath = repositoryId ? validatedFilePath! : path.resolve(getWorkspacePath(), record.filePath);
  assertWriteTargetInsideWorkspace(filePath);
  if (record.previewIds?.at(-1) !== id || !existsSync(filePath) || readFileSync(filePath, 'utf8') !== record.after) {
    return { success: false as const, code: 'SOURCE_CHANGED' as const, error: 'This change was saved, but its source changed afterward. Review the current source before editing again.' };
  }
  return { success: true as const, editId: record.id, filePath: record.filePath, line: record.line, previewType: record.previewType || 'className', value: record.newValue, className: record.previewType === 'textContent' ? undefined : record.newClassName ?? record.newValue, message: `Applied ${record.summary}.` };
}

/** Reconcile journal/history only. Status lookup never writes a source file. */
export function getSourceApplyOutcome(id: string, repositoryId?: string, sourcePath?: string, validatedFilePath?: string): SourceApplyResult | null {
  const accepted = readSourceApplyOutcome(id, repositoryId, sourcePath, validatedFilePath);
  if (accepted) {
    if (accepted.success && existsSync(applyIntentPath(id))) {
      try { withHistoryMutation(() => { if (hasAcceptedPreview(id)) finishApplyCleanup(id); }); } catch { /* A receipt is valid even while its original writer finishes cleanup. */ }
    }
    return accepted;
  }
  // Another process may finish recovery between the first history read and
  // journal lookup. Cleanup always follows the durable receipt.
  if (!readApplyIntent(id)) return withHistoryMutation(() => {
    const receipt = readSourceApplyOutcome(id, repositoryId, sourcePath, validatedFilePath);
    if (receipt) return receipt;
    // The browser persists its reference before sending Apply. A reload can
    // therefore precede any server write intent. Prove the original still
    // exists under the same mutation lock; a status read never replays Apply.
    if (readApplyIntent(id)) return getSourceApplyOutcome(id, repositoryId, sourcePath, validatedFilePath);
    if (!existsSync(pendingPath(id))) return null;
    const pending = readPendingSourceEdit(id);
    if (!matchesPendingScope(pending, repositoryId, sourcePath, validatedFilePath)) return { success: false as const, code: 'OUTCOME_SCOPE_MISMATCH', error: 'This change belongs to a different project or source file.' };
    const filePath = path.resolve(getWorkspacePath(), pending.filePath);
    assertWriteTargetInsideWorkspace(filePath);
    if (relativeFilePath(filePath) !== path.normalize(pending.filePath) || readFileSync(filePath, 'utf8') !== pending.before) return { success: false as const, code: 'SOURCE_CHANGED', error: 'The source changed after review. Inspect its current version before continuing.' };
    return { success: false as const, code: 'APPLY_NOT_APPLIED', error: 'The reviewed source is unchanged and no save is recorded. Explicitly apply the review when you are ready.' };
  });
  return withHistoryMutation(() => {
    const recorded = readSourceApplyOutcome(id, repositoryId, sourcePath, validatedFilePath);
    if (recorded) return recorded;
    const intent = readApplyIntent(id);
    if (!intent) return null;
    const pending = intent.pending;
    if (!matchesPendingScope(pending, repositoryId, sourcePath, validatedFilePath)) {
      return { success: false as const, code: 'OUTCOME_SCOPE_MISMATCH' as const, error: 'This change belongs to a different project or source file.' };
    }
    const filePath = path.resolve(getWorkspacePath(), pending.filePath);
    assertWriteTargetInsideWorkspace(filePath);
    if (relativeFilePath(filePath) !== path.normalize(pending.filePath) || !existsSync(filePath) || fileHistoryDigest(pending.filePath) !== intent.historyDigest) {
      return { success: false as const, code: intent.phase === 'not-applied' ? 'SOURCE_CHANGED' as const : 'SOURCE_RECOVERY_REQUIRED' as const, error: 'This file or its history changed after the interrupted save. Nothing was overwritten; review its source before continuing.' };
    }
    const current = readFileSync(filePath, 'utf8');
    if (intent.phase === 'not-applied' && current !== pending.before) {
      return { success: false as const, code: 'SOURCE_CHANGED' as const, error: 'The interrupted save was not applied, and the source changed afterward. Review the current source before editing again.' };
    }
    if (current === pending.before) {
      if (intent.phase !== 'not-applied') atomicWrite(applyIntentPath(id), JSON.stringify({ ...intent, phase: 'not-applied' }));
      return { success: false as const, code: 'APPLY_NOT_APPLIED' as const, error: 'The source still matches the reviewed original. Apply the reviewed change again, or discard it.' };
    }
    if (current !== pending.after) {
      return { success: false as const, code: 'SOURCE_RECOVERY_REQUIRED' as const, error: 'The source changed after the interrupted save. Nothing was overwritten; review its source before continuing.' };
    }
    recordSourceEdit(filePath, pending.before, pending.after, pending.summary, intent.groupId, pendingMetadata(pending));
    finishApplyCleanup(id);
    return readSourceApplyOutcome(id, repositoryId, sourcePath, validatedFilePath);
  });
}

export async function applyPendingSourceEdit(id: string, groupId?: string, repositoryId?: string, sourcePath?: string, validatedFilePath?: string): Promise<SourceApplyResult> {
  const accepted = getSourceApplyOutcome(id, repositoryId, sourcePath, validatedFilePath);
  if (accepted && (accepted.success || accepted.code !== 'APPLY_NOT_APPLIED')) return accepted;
  const pending = readPendingSourceEdit(id);
  if (!matchesPendingScope(pending, repositoryId, sourcePath, validatedFilePath)) return { success: false as const, error: 'This preview belongs to a different project or source file. Review the change again.' };
  const filePath = pending.repositoryId ? validatedFilePath! : path.resolve(getWorkspacePath(), pending.filePath);
  const current = readFileSync(filePath, 'utf8');
  if (current !== pending.before) {
    if (!pending.draft) try { discardPendingSourceEdit(id); } catch { /* Invalid proposals remain unusable and expire automatically. */ }
    return { success: false as const, code: 'SOURCE_CHANGED' as const, error: 'This source changed after the preview. Review it again before applying.' };
  }
  if (groupId && !/^[0-9a-f-]{36}$/i.test(groupId)) {
    return { success: false as const, error: 'The edit session is invalid. Preview this change again.' };
  }

  if (pending.draft || !pending.previewType || pending.previewType === 'className') {
    const oldTokens = new Set((pending.oldValue || '').trim().split(/\s+/).filter(Boolean));
    const newTokens = (pending.newValue || '').trim().split(/\s+/).filter(Boolean);
    const addedTokens = pending.draft ? pending.addedTokens || [] : newTokens.filter(t => !oldTokens.has(t));
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

  try { validateComponentDependencies(pending.componentDependencies,{}, {root:findProjectRoot(filePath),caller:filePath}); }
  catch(error) { return {success:false as const,error:error instanceof Error?error.message:'Component ownership changed.'}; }

  invokePreWriteHook(filePath);
  try {
    return withHistoryMutation(() => {
      assertWriteTargetInsideWorkspace(filePath);
      if (relativeFilePath(filePath) !== path.normalize(pending.filePath)) throw new Error('The source target changed after review. Nothing was written.');
      const concurrentlyAccepted = readSourceApplyOutcome(id, repositoryId, sourcePath, validatedFilePath);
      if (concurrentlyAccepted) return concurrentlyAccepted;
      assertNoUnfinishedApply(filePath, id);
      validateComponentDependencies(pending.componentDependencies,{}, {root:findProjectRoot(filePath),caller:filePath});
      if (!existsSync(pendingPath(id))) {
        return { success: false as const, code: 'PREVIEW_EXPIRED' as const, error: 'This review was discarded or expired. Prepare the change again before applying.' };
      }
      // Validation can compile Tailwind asynchronously. Recheck while holding
      // the mutation lock, then journal the approved snapshots before the write.
      if (readFileSync(filePath, 'utf8') !== pending.before) {
        try { discardPendingSourceEdit(id); } catch { /* Invalid proposals expire automatically. */ }
        return { success: false as const, code: 'SOURCE_CHANGED' as const, error: 'This source changed after the preview. Review it again before applying.' };
      }
      const intent: ApplyIntent = { version: 1, phase: 'applying', pending, groupId, historyDigest: fileHistoryDigest(pending.filePath) };
      atomicWrite(applyIntentPath(id), JSON.stringify(intent));
      // Journal persistence can take time. Preserve an outside edit arriving
      // during it, without turning that outside edit into our accepted receipt.
      if (readFileSync(filePath, 'utf8') !== pending.before) {
        atomicWrite(applyIntentPath(id), JSON.stringify({ ...intent, phase: 'not-applied' }));
        return { success: false as const, code: 'SOURCE_CHANGED' as const, error: 'This source changed while the save was being prepared. Nothing was overwritten.' };
      }
      try {
        atomicWrite(filePath, pending.after);
        const history = recordSourceEdit(filePath, pending.before, pending.after, pending.summary, groupId, pendingMetadata(pending));
        if (!history.editId) throw new Error('The accepted history receipt is unavailable.');
        finishApplyCleanup(id);
        return { success: true as const, editId: history.editId, filePath: pending.filePath, line: pending.line, previewType: pending.previewType || 'className', value: pending.newValue, className: pending.previewType === 'textContent' ? undefined : pending.newClassName ?? pending.newValue, message: `Applied ${pending.summary}.` };
      } catch {
        // Never roll a source file back over a possible outside edit. The
        // durable intent retains the exact snapshots for status reconciliation.
        return { success: false as const, code: 'APPLY_UNCERTAIN' as const, error: 'The save could not be fully recorded. Check save status before continuing.' };
      }
    });
  } catch (error) {
    return {
      success: false as const,
      code: error instanceof SourceOperationBusyError || error instanceof SourceRecoveryRequiredError ? error.code : undefined,
      error: error instanceof Error ? error.message : 'The file is locked and nothing was changed.',
    };
  }
}

/** Undo only the most recent SlightNudge edit, or a specified edit if valid, using token-level revert where possible. */
export function undoSourceEdit(target?: string | { filePath?: string; editId?: string }, maybeEditId?: string) {
  try {
    return withHistoryMutation(() => {
      const requestedPath = typeof target === 'string' ? target : target?.filePath;
      const requestedId = typeof target === 'object' ? target.editId || maybeEditId : maybeEditId;
      const record = readHistory().findLast(entry => entry.status !== 'undone' && (!requestedId || entry.id === requestedId) && (!requestedPath || path.resolve(getWorkspacePath(), requestedPath) === path.resolve(getWorkspacePath(), entry.filePath)));
      if (record?.changeSetId || record?.groupId && validGroupId(record.groupId) && readGroupJournal(path.join(path.dirname(getHistoryPath()), 'groups'), record.groupId)) return { success: false as const, error: 'Undo this saved change set together, rather than undoing an individual file.' };
      const filePath = requestedPath || record?.filePath;
      if (filePath) assertNoUnfinishedApply(filePath, undefined, record?.id);
      return undoSourceEditUnlocked(target, maybeEditId);
    });
  } catch (error) {
    if (error instanceof SourceOperationBusyError || error instanceof SourceRecoveryRequiredError) return { success: false as const, error: error.message };
    throw error;
  }
}

function undoSourceEditUnlocked(target?: string | { filePath?: string; editId?: string }, maybeEditId?: string) {
  let wantedPath: string | undefined;
  let wantedEditId: string | undefined;

  if (typeof target === 'string') {
    wantedPath = target;
    wantedEditId = maybeEditId;
  } else if (target && typeof target === 'object') {
    wantedPath = target.filePath;
    wantedEditId = target.editId || maybeEditId;
  }

  if (wantedPath) {
    const workspaceRoot = getWorkspacePath();
    const resolvedPath = path.resolve(workspaceRoot, wantedPath);
    const relFromWs = path.relative(workspaceRoot, resolvedPath);
    if (!relFromWs || relFromWs === '..' || relFromWs.startsWith(`..${path.sep}`) || path.isAbsolute(relFromWs)) {
      return { success: false as const, error: 'The edited file must be inside the SlightNudge workspace.' };
    }
    if (!existsSync(resolvedPath)) {
      return { success: false as const, error: 'That file no longer exists.' };
    }
    try {
      wantedPath = relativeFilePath(resolvedPath);
    } catch {
      return { success: false as const, error: 'The edited file must be inside the SlightNudge workspace.' };
    }
  }

  const isSamePath = (a?: string, b?: string) => {
    if (!a || !b) return false;
    return path.resolve(getWorkspacePath(), a) === path.resolve(getWorkspacePath(), b);
  };

  const records = readHistory();
  let index = -1;
  if (wantedEditId) {
    index = records.findLastIndex((record) => record.id === wantedEditId && record.status !== 'undone' && (!wantedPath || isSamePath(record.filePath, wantedPath)));
  } else {
    index = records.findLastIndex((record) => record.status !== 'undone' && (!wantedPath || isSamePath(record.filePath, wantedPath)));
  }

  if (index < 0) return { success: false as const, error: 'There is no visual edit to undo.' };

  const record = records[index];
  const absolutePath = path.resolve(getWorkspacePath(), record.filePath);
  if (!existsSync(absolutePath)) {
    return { success: false as const, error: 'That file no longer exists.' };
  }

  // Helper to establish identity and structural nature of an edit record
  function getEditIdentity(rec: EditRecord) {
    const isStructural = rec.previewType === 'reorder' ||
      Boolean(rec.summary && /\b(reorder|move|insert|delete)\b/i.test(rec.summary));

    if (isStructural) {
      return { known: true, isStructural: true, elementId: rec.elementId, line: rec.line, tagName: rec.tagName };
    }

    if (rec.elementId) {
      return {
        known: true,
        isStructural: false,
        elementId: rec.elementId,
        line: rec.line,
        tagName: rec.tagName,
      };
    }

    // Try deriving identity from AST before/after diff
    if (rec.before && rec.after) {
      const derived = deriveClassEditDetails(rec.before, rec.after, rec.line);
      if (derived) {
        return {
          known: true,
          isStructural: false,
          elementId: derived.elementId,
          line: derived.line,
          tagName: derived.tagName,
        };
      }
    }

    if (rec.line && rec.tagName) {
      return {
        known: true,
        isStructural: false,
        elementId: undefined,
        line: rec.line,
        tagName: rec.tagName,
      };
    }

    return {
      known: false,
      isStructural: false,
      elementId: undefined,
      line: undefined,
      tagName: undefined,
    };
  }

  const recordIdentity = getEditIdentity(record);

  // Check 4: Identity-based dependency check on newer applied edits in the same file
  for (let i = index + 1; i < records.length; i++) {
    const newer = records[i];
    if (newer.status !== 'undone' && isSamePath(newer.filePath, record.filePath)) {
      const newerIdentity = getEditIdentity(newer);

      // Rule 1: A newer structural edit (reorder/move) blocks undo of older edits
      if (recordIdentity.isStructural || newerIdentity.isStructural) {
        return {
          success: false as const,
          error: `Cannot undo this edit because a structural edit ("${newer.summary}") was applied to this file. Undo the structural edit first.`,
        };
      }

      // Rule 2: If either record's identity cannot be established (legacy records), refuse conservatively with manual instructions
      if (!recordIdentity.known || !newerIdentity.known) {
        const toRemoveStr = record.addedTokens?.length ? record.addedTokens.join(' ') : 'none';
        const toRestoreStr = record.removedTokens?.length ? record.removedTokens.join(' ') : 'none';
        return {
          success: false as const,
          error: `This file changed after the visual edit: element identity cannot be established. Open ${record.filePath} near line ${record.line || 1} and change the className to remove "${toRemoveStr}" and restore "${toRestoreStr}". Nothing was changed.`,
        };
      }

      // Rule 3: Edits targeting the same element block undo
      const sameElementId = Boolean(
        recordIdentity.elementId &&
        newerIdentity.elementId &&
        recordIdentity.elementId === newerIdentity.elementId
      );
      const sameDerivedLocator = Boolean(
        (!recordIdentity.elementId || !newerIdentity.elementId) &&
        recordIdentity.line &&
        newerIdentity.line &&
        recordIdentity.line === newerIdentity.line &&
        recordIdentity.tagName &&
        newerIdentity.tagName &&
        recordIdentity.tagName.toLowerCase() === newerIdentity.tagName.toLowerCase()
      );

      const sameElement = sameElementId || sameDerivedLocator;
      if (sameElement) {
        return {
          success: false as const,
          error: `Cannot undo this edit because a newer edit ("${newer.summary}") on the same element depends on it. Undo the newer edit first.`,
        };
      }

      // Rule 4: Edits sharing a line (same-line siblings) block undo
      if (recordIdentity.line && newerIdentity.line && recordIdentity.line === newerIdentity.line) {
        return {
          success: false as const,
          error: `Cannot undo this edit because a newer edit on the same line depends on it. Undo the newer edit first.`,
        };
      }
    }
  }

  const current = readFileSync(absolutePath, 'utf8');

  // Recover a partially completed undo after a process interruption
  if (record.status === 'undoing' && current === (record.undoAfter ?? record.before)) {
    records[index] = { ...record, status: 'undone' };
    writeHistory(records);
    return { success: true as const, editId: record.id, message: `Undid ${record.summary}.` };
  }

  // Step (i): Exact-match path
  if (current === record.after) {
    return commitSourceUndo(records, index, absolutePath, current, record.before);
  }

  // Step (ii): Token-level undo for class/style edits
  const details = (record.addedTokens && record.removedTokens)
    ? record
    : deriveClassEditDetails(record.before, record.after, record.line);

  if (!details || (!details.addedTokens?.length && !details.removedTokens?.length)) {
    if (record.previewType === 'textContent' || record.summary.startsWith('"')) {
      const oldVal = record.oldValue || 'original text';
      const newVal = record.newValue || 'current text';
      return {
        success: false as const,
        error: `This file changed after the visual edit. Open ${record.filePath} near line ${record.line || 1} and change the text from "${newVal}" to "${oldVal}". Nothing was changed.`,
      };
    }
    if (record.previewType === 'imageSource' || record.summary.includes('image')) {
      const oldVal = record.oldValue || '';
      const newVal = record.newValue || '';
      return {
        success: false as const,
        error: `This file changed after the visual edit. Open ${record.filePath} near line ${record.line || 1} and change the image src from "${newVal}" to "${oldVal}". Nothing was changed.`,
      };
    }
    return {
      success: false as const,
      error: 'This file changed after the visual edit. Nothing was overwritten; review the source before undoing.',
    };
  }

  const addedTokens = details.addedTokens || [];
  const removedTokens = details.removedTokens || [];
  const recordLine = details.line || 1;

  function refuseWithInstructions(reason: string, line = recordLine) {
    const toRemoveStr = addedTokens.length > 0 ? addedTokens.join(' ') : 'none';
    const toRestoreStr = removedTokens.length > 0 ? removedTokens.join(' ') : 'none';
    return {
      success: false as const,
      error: `This file changed after the visual edit: ${reason}. Open ${record.filePath} near line ${line} and change the className to remove "${toRemoveStr}" and restore "${toRestoreStr}". Nothing was changed.`,
    };
  }

  const currentParse = verifySyntacticParse(absolutePath, current);
  if (!currentParse.valid) {
    return refuseWithInstructions(`parse failure (${currentParse.error})`);
  }

  let project: Project;
  let sourceFile: any;
  try {
    project = new Project({ useInMemoryFileSystem: true, skipAddingFilesFromTsConfig: true });
    sourceFile = project.createSourceFile('current.tsx', current);
  } catch (err: any) {
    return refuseWithInstructions(`parse failure (${err.message})`);
  }

  const jsxElements = [
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];

  let candidates: (JsxOpeningElement | JsxSelfClosingElement)[] = [];

  if (details.elementId) {
    candidates = jsxElements.filter((el) => {
      const idAttr = el.getAttribute('id');
      return idAttr && Node.isJsxAttribute(idAttr) && idAttr.getInitializer() && Node.isStringLiteral(idAttr.getInitializer()!) && (idAttr.getInitializer() as StringLiteral).getLiteralValue() === details.elementId;
    });
  } else {
    candidates = jsxElements.filter((el) => {
      if (details.tagName && el.getTagNameNode().getText().toLowerCase() !== details.tagName.toLowerCase()) {
        return false;
      }
      const classAttr = el.getAttribute('className');
      if (!classAttr || !Node.isJsxAttribute(classAttr)) return false;
      const init = classAttr.getInitializer();
      const literal = init && Node.isStringLiteral(init) ? init : (init && Node.isJsxExpression(init) && init.getExpression() && Node.isStringLiteral(init.getExpression()!) ? (init.getExpression() as StringLiteral) : null);
      if (!literal) return false;
      const toks = literal.getLiteralValue().trim().split(/\s+/).filter(Boolean);
      const hasAdded = addedTokens.every(t => toks.includes(t));
      const hasNoRemoved = removedTokens.every(t => !toks.includes(t));
      return hasAdded && hasNoRemoved;
    });
  }

  if (candidates.length === 0) {
    return refuseWithInstructions(`element could not be found`);
  }
  if (candidates.length > 1) {
    return refuseWithInstructions(`multiple matching elements found where uniqueness cannot be established`);
  }

  const targetEl = candidates[0];
  const targetLine = targetEl.getStartLineNumber();

  // Safety checks on candidate element
  if (isElementInsideLoop(targetEl)) {
    return refuseWithInstructions('element is inside a repeating list', targetLine);
  }
  if (isComponentUsedMultipleTimes(targetEl, project)) {
    return refuseWithInstructions('element is in a component used in several places', targetLine);
  }

  // Check conditional ancestor
  let ancestor: Node | undefined = targetEl.getParent();
  while (ancestor) {
    if (Node.isConditionalExpression(ancestor) || (Node.isBinaryExpression(ancestor) && ['&&', '||'].includes(ancestor.getOperatorToken().getText()))) {
      return refuseWithInstructions('element is in a conditional expression', targetLine);
    }
    if (Node.isIfStatement(ancestor)) {
      return refuseWithInstructions('element is in a conditional statement', targetLine);
    }
    ancestor = ancestor.getParent();
  }

  // Check same-line sibling ambiguity
  const sameLineSiblings = jsxElements.filter(el => el !== targetEl && el.getStartLineNumber() === targetLine && el.getTagNameNode().getText().toLowerCase() === targetEl.getTagNameNode().getText().toLowerCase());
  if (sameLineSiblings.length > 0 && details.column === undefined && !details.elementId) {
    return refuseWithInstructions('same-line sibling ambiguity', targetLine);
  }

  // Check current className attribute
  const classAttr = targetEl.getAttribute('className');
  if (!classAttr || !Node.isJsxAttribute(classAttr)) {
    return refuseWithInstructions('className attribute missing', targetLine);
  }
  const init = classAttr.getInitializer();
  const literal = init && Node.isStringLiteral(init) ? init : (init && Node.isJsxExpression(init) && init.getExpression() && Node.isStringLiteral(init.getExpression()!) ? (init.getExpression() as StringLiteral) : null);
  if (!literal) {
    return refuseWithInstructions('className is dynamic and cannot be edited safely', targetLine);
  }

  const currentClassVal = literal.getLiteralValue();
  const currentTokens = currentClassVal.trim().split(/\s+/).filter(Boolean);

  const hasAllAdded = addedTokens.every(t => currentTokens.includes(t));
  const hasNoRemoved = removedTokens.every(t => !currentTokens.includes(t));

  if (!hasAllAdded || !hasNoRemoved) {
    return refuseWithInstructions('the token was modified by the user', targetLine);
  }

  // Revert in place: remove addedTokens, restore removedTokens at original positions where possible
  const remainingToRemove = new Set(addedTokens);
  let removedToRestore = [...removedTokens];

  const newTokens: string[] = [];
  for (const tok of currentTokens) {
    if (remainingToRemove.has(tok)) {
      remainingToRemove.delete(tok);
      if (removedToRestore.length > 0) {
        newTokens.push(removedToRestore.shift()!);
      }
    } else {
      newTokens.push(tok);
    }
  }
  if (removedToRestore.length > 0) {
    newTokens.push(...removedToRestore);
  }

  const updatedClassVal = newTokens.join(' ');

  // Direct string slice replacement in current source code
  const litStart = literal.getStart();
  const litEnd = literal.getEnd();
  const quote = current[litStart];
  const newLiteralSnippet = `${quote}${updatedClassVal}${quote}`;
  const newContent = current.slice(0, litStart) + newLiteralSnippet + current.slice(litEnd);

  // Re-parse verification
  const parseCheck = verifySyntacticParse(absolutePath, newContent);
  if (!parseCheck.valid) {
    return refuseWithInstructions(`re-parse verification failed (${parseCheck.error})`, targetLine);
  }

  // M6 post-condition check: confirm only target element's className literal range changed
  const beforeSlice = current.slice(0, litStart);
  const afterSlice = current.slice(litEnd);
  const newBeforeSlice = newContent.slice(0, litStart);
  const newAfterSlice = newContent.slice(litStart + newLiteralSnippet.length);
  if (beforeSlice !== newBeforeSlice || afterSlice !== newAfterSlice) {
    return refuseWithInstructions('scope violation outside className literal', targetLine);
  }

  // M6 post-condition check: confirm target element's token multiset equals (currentTokens minus addedTokens plus removedTokens)
  const expectedTokens = [...currentTokens];
  for (const t of addedTokens) {
    const idx = expectedTokens.indexOf(t);
    if (idx >= 0) expectedTokens.splice(idx, 1);
  }
  expectedTokens.push(...removedTokens);
  expectedTokens.sort();

  const actualTokens = [...newTokens].sort();
  if (expectedTokens.length !== actualTokens.length || !expectedTokens.every((t, i) => t === actualTokens[i])) {
    return refuseWithInstructions('token multiset mismatch after substitution', targetLine);
  }

  return commitSourceUndo(records, index, absolutePath, current, newContent);
}

function commitSourceUndo(records: EditRecord[], index: number, filePath: string, before: string, after: string) {
  const record = records[index];
  try{validateComponentDependencies(record.componentDependencies,{}, {root:findProjectRoot(filePath),caller:filePath})}catch(error){return {success:false as const,error:error instanceof Error?error.message:'Component ownership changed.'};}
  if (Buffer.byteLength(before) > maxSnapshotBytes || Buffer.byteLength(after) > maxSnapshotBytes) return { success: false as const, error: 'This file is too large for a recoverable Undo. Nothing was changed.' };
  const intent: EditRecord = { ...record, status: 'undoing', undoBefore: before, undoAfter: after };
  records[index] = intent;
  writeHistory(records);
  try {
    invokePreWriteHook(filePath);
    validateComponentDependencies(record.componentDependencies,{}, {root:findProjectRoot(filePath),caller:filePath});
    assertWriteTargetInsideWorkspace(filePath);
    if (readFileSync(filePath, 'utf8') !== before) {
      records[index] = { ...record, status: 'applied', undoBefore: undefined, undoAfter: undefined };
      writeHistory(records);
      return { success: false as const, error: 'The source changed while Undo was being prepared. Nothing was overwritten.' };
    }
    atomicWrite(filePath, after);
    records[index] = { ...intent, status: 'undone' };
    writeHistory(records);
  } catch (error) {
    // Reset only when the source is still the exact Undo input. If a source
    // replacement completed, retain the durable intent for status reconciliation.
    try {
      if (readFileSync(filePath, 'utf8') === before) {
        records[index] = { ...record, status: 'applied', undoBefore: undefined, undoAfter: undefined };
        writeHistory(records);
      }
    } catch { /* Preserve the original durable intent when storage is unavailable. */ }
    throw error;
  }
  return { success: true as const, editId: record.id, message: `Undid ${record.summary}.` };
}

export interface ReviewedUndoContext {
  repositoryId?: string;
  sourcePath?: string;
  filePath?: string;
  editId?: string;
}

export interface ReviewedUndoResult {
  success: boolean;
  previewId?: string;
  editId?: string;
  code?: string;
  error?: string;
  message?: string;
  sourceCurrent?: boolean;
}

function bindReviewedUndo(previewId: string, context: ReviewedUndoContext): { record: EditRecord } | { error: ReviewedUndoResult } {
  pendingPath(previewId);
  const record = readHistory().findLast(entry => Array.isArray(entry.previewIds) && entry.previewIds.includes(previewId));
  if (!record) return { error: { success: false, code: 'UNDO_UNKNOWN', error: 'The accepted edit could not be found. Inspect the current source before undoing.' } };
  const filePath = path.resolve(getWorkspacePath(), record.filePath);
  if (record.repositoryId !== context.repositoryId || (record.repositoryId && (record.sourcePath !== context.sourcePath || !context.filePath)) ||
      (context.filePath && path.resolve(getWorkspacePath(), context.filePath) !== filePath) ||
      (existsSync(filePath) && relativeFilePath(filePath) !== path.normalize(record.filePath))) {
    return { error: { success: false, code: 'OUTCOME_SCOPE_MISMATCH', error: 'This Undo belongs to a different project or source file.' } };
  }
  if ((context.editId && context.editId !== record.id) || record.previewIds?.at(-1) !== previewId) {
    return { error: { success: false, code: 'UNDO_TARGET_CHANGED', error: 'This edit group changed after the accepted review. Inspect its latest change before undoing.' } };
  }
  return { record };
}

function undoReceipt(record: EditRecord, previewId: string): ReviewedUndoResult {
  let sourceCurrent = false;
  try { sourceCurrent = readFileSync(path.resolve(getWorkspacePath(), record.filePath), 'utf8') === (record.undoAfter ?? record.before); } catch { /* The receipt remains true even when the current revision cannot be read. */ }
  return { success: true, previewId, editId: record.id, sourceCurrent, message: sourceCurrent ? `Undid ${record.summary}.` : 'Undo is recorded, but the current source revision could not be confirmed. Inspect the current page before continuing.' };
}

/** Reconcile only the requested Undo receipt. Never writes or retries source. */
export function getSourceUndoOutcome(previewId: string, context: ReviewedUndoContext = {}): ReviewedUndoResult {
  return withHistoryMutation(() => {
    const bound = bindReviewedUndo(previewId, context);
    if ('error' in bound) return bound.error;
    const record = bound.record;
    if (record.status === 'undone') return undoReceipt(record, previewId);
    if (record.status === 'applied') return { success: false, previewId, editId: record.id, code: 'UNDO_NOT_APPLIED', error: 'Undo is not recorded for this edit. You can explicitly retry Undo.' };
    const before = record.undoBefore ?? record.after;
    const after = record.undoAfter ?? record.before;
    const current = readFileSync(path.resolve(getWorkspacePath(), record.filePath), 'utf8');
    const records = readHistory();
    const index = records.findIndex(entry => entry.id === record.id);
    if (index < 0) return { success: false, code: 'UNDO_UNKNOWN', error: 'The accepted edit could not be found. Inspect the current source before undoing.' };
    if (current === after) {
      records[index] = { ...record, status: 'undone', undoBefore: before, undoAfter: after };
      writeHistory(records);
      return undoReceipt(records[index], previewId);
    }
    if (current === before) {
      records[index] = { ...record, status: 'applied', undoBefore: undefined, undoAfter: undefined };
      writeHistory(records);
      return { success: false, previewId, editId: record.id, code: 'UNDO_NOT_APPLIED', error: 'Undo did not change the source. Explicitly retry Undo when you are ready.' };
    }
    return { success: false, previewId, editId: record.id, code: 'UNDO_RECOVERY_REQUIRED', error: 'The source changed after Undo was interrupted. Nothing was overwritten; review the current source before continuing.' };
  });
}

/** HTTP-facing Undo always targets an immutable accepted proposal, never latest. */
export function undoReviewedSourceEdit(previewId: string, context: ReviewedUndoContext = {}): ReviewedUndoResult {
  try {
    return withHistoryMutation(() => {
      let bound = bindReviewedUndo(previewId, context);
      if ('error' in bound) return bound.error;
      if (bound.record.status === 'undone') return undoReceipt(bound.record, previewId);
      if (bound.record.status === 'undoing') {
        const recovered = getSourceUndoOutcome(previewId, context);
        if (recovered.success || recovered.code !== 'UNDO_NOT_APPLIED') return recovered;
        bound = bindReviewedUndo(previewId, context);
        if ('error' in bound) return bound.error;
      }
      const result = undoSourceEdit({ filePath: bound.record.filePath, editId: bound.record.id });
      if (!result.success) return { success: false, previewId, editId: bound.record.id, code: 'UNDO_REFUSED', error: result.error };
      return getSourceUndoOutcome(previewId, context);
    });
  } catch (error) {
    if (error instanceof SourceOperationBusyError) return { success: false, code: error.code, error: error.message };
    if (error instanceof SourceRecoveryRequiredError) return { success: false, code: 'UNDO_RECOVERY_REQUIRED', error: error.message };
    return { success: false, code: 'UNDO_UNCERTAIN', error: 'Undo could not be fully confirmed. Check Undo status before continuing.' };
  }
}

export function getLatestUndoTarget(filePath: string, repositoryId?: string, sourcePath?: string) {
  if (!canUndoSourceEdit(filePath)) return null;
  const absolute = path.resolve(getWorkspacePath(), filePath);
  const record = readHistory().findLast(entry => entry.status !== 'undone' && path.resolve(getWorkspacePath(), entry.filePath) === absolute);
  const previewId = record?.previewIds?.at(-1);
  if (!record || !previewId || record.repositoryId !== repositoryId || (repositoryId && record.sourcePath !== sourcePath)) return null;
  return { previewId, editId: record.id };
}

export function canUndoSourceEdit(filePath: string) {
  try {
    const resolvedPath = path.resolve(getWorkspacePath(), filePath);
    if (!existsSync(resolvedPath)) return false;
    const wantedPath = relativeFilePath(resolvedPath);
    const records = readHistory();
    const record = records.findLast((entry) => entry.status !== 'undone' && entry.filePath === wantedPath);
    if (!record || record.missing) return false;
    const current = readFileSync(resolvedPath, 'utf8');
    if (current === record.after) return true;
    const details = (record.addedTokens && record.removedTokens)
      ? record
      : deriveClassEditDetails(record.before, record.after, record.line);
    if (!details || (!details.addedTokens?.length && !details.removedTokens?.length)) return false;
    return true;
  } catch {
    return false;
  }
}
