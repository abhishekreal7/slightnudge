import { randomUUID } from 'node:crypto';
import fs, { chmodSync, closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, statSync, unlinkSync, writeSync } from 'node:fs';
import path from 'node:path';
import { Project, SyntaxKind, Node, JsxOpeningElement, JsxSelfClosingElement, StringLiteral } from 'ts-morph';
import { verifyTailwindClass, verifySyntacticParse, findProjectRoot } from './tailwind-verifier';
import { isElementInsideLoop, isComponentUsedMultipleTimes } from './ast-nudger';

function isTestMode(): boolean {
  return process.env.SLIGHTNUDGE_TEST === '1' && process.env.NODE_ENV !== 'production';
}

function getWorkspacePath(): string {
  return (isTestMode() && process.env.SLIGHTNUDGE_WORKSPACE_ROOT) || process.cwd();
}

function getHistoryPath(): string {
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

export interface EditRecord {
  id: string;
  filePath: string;
  createdAt: string;
  summary: string;
  groupId?: string;
  changeCount?: number;
  before: string;
  after: string;
  status: EditStatus;
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

interface PendingEdit {
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

    // Check if the file currently exists on disk
    if (existsSync(resolvedPath)) {
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

function writeHistory(records: EditRecord[]) {
  atomicWrite(getHistoryPath(), JSON.stringify(records.slice(-maxHistoryEntries), null, 2));
}

function relativeFilePath(filePath: string) {
  const workspacePath = realpathSync(getWorkspacePath());
  const absolutePath = realpathSync(filePath);
  const relativePath = path.relative(workspacePath, absolutePath);
  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    throw new Error('The edited file must be inside the SlightNudge workspace.');
  }
  return relativePath;
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
export function recordSourceEdit(
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
    records[records.length - 1] = { ...last, after, summary: `${changeCount} visual adjustments`, changeCount, ...metadata };
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
  return path.join(getPendingDirectory(), `${id}.json`);
}

function pruneExpiredPreviews() {
  const dir = getPendingDirectory();
  try {
    for (const entry of readdirSync(dir)) {
      if (!/^[0-9a-f-]{36}\.json$/i.test(entry)) continue;
      const entryPath = path.join(dir, entry);
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
  };
}

function readPendingSourceEdit(id: string): PendingEdit {
  const pending = JSON.parse(readFileSync(pendingPath(id), 'utf8')) as PendingEdit;
  if (pending.id !== id || typeof pending.before !== 'string' || typeof pending.after !== 'string' || typeof pending.filePath !== 'string') {
    throw new Error('The preview data is invalid. Discard it and try again.');
  }
  relativeFilePath(path.resolve(getWorkspacePath(), pending.filePath));
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
  const filePath = pending.repositoryId ? validatedFilePath! : path.resolve(getWorkspacePath(), pending.filePath);
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
    history = recordSourceEdit(filePath, pending.before, pending.after, pending.summary, groupId, {
      previewType: pending.previewType,
      line: pending.line,
      column: pending.column,
      elementId: pending.elementId,
      tagName: pending.tagName,
      oldClassName: pending.oldClassName,
      newClassName: pending.newClassName,
      removedTokens: pending.removedTokens,
      addedTokens: pending.addedTokens,
      oldValue: pending.oldValue,
      newValue: pending.newValue,
    });
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

/** Undo only the most recent SlightNudge edit, or a specified edit if valid, using token-level revert where possible. */
export function undoSourceEdit(target?: string | { filePath?: string; editId?: string }, maybeEditId?: string) {
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
    const normalized = path.normalize(wantedPath);
    if (path.isAbsolute(normalized) || normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
      return { success: false as const, error: 'The edited file must be inside the SlightNudge workspace.' };
    }
    const resolvedPath = path.resolve(getWorkspacePath(), wantedPath);
    if (!existsSync(resolvedPath)) {
      return { success: false as const, error: 'That file no longer exists.' };
    }
    try {
      wantedPath = relativeFilePath(resolvedPath);
    } catch {
      return { success: false as const, error: 'The edited file must be inside the SlightNudge workspace.' };
    }
  }

  const records = readHistory();
  let index = -1;
  if (wantedEditId) {
    index = records.findLastIndex((record) => record.id === wantedEditId && record.status !== 'undone' && (!wantedPath || record.filePath === wantedPath));
  } else {
    index = records.findLastIndex((record) => record.status !== 'undone' && (!wantedPath || record.filePath === wantedPath));
  }

  if (index < 0) return { success: false as const, error: 'There is no visual edit to undo.' };

  const record = records[index];
  const absolutePath = path.resolve(getWorkspacePath(), record.filePath);
  if (!existsSync(absolutePath)) {
    return { success: false as const, error: 'That file no longer exists.' };
  }

  // Check 4: If the same element was edited twice, undoing the older edit while a newer one is on top must refuse
  for (let i = index + 1; i < records.length; i++) {
    const newer = records[i];
    if (newer.status !== 'undone' && newer.filePath === record.filePath) {
      const sameElement = (record.elementId && newer.elementId && record.elementId === newer.elementId) ||
        (record.line && newer.line && record.line === newer.line && record.tagName === newer.tagName) ||
        (newer.before === record.after);
      if (sameElement) {
        return {
          success: false as const,
          error: 'Cannot undo this edit because a newer edit on the same element depends on it. Undo the newer edit first.',
        };
      }
    }
  }

  const current = readFileSync(absolutePath, 'utf8');

  // Recover a partially completed undo after a process interruption
  if (record.status === 'undoing' && current === record.before) {
    records[index] = { ...record, status: 'undone' };
    writeHistory(records);
    return { success: true as const, editId: record.id, message: `Undid ${record.summary}.` };
  }

  // Step (i): Exact-match path
  if (current === record.after) {
    records[index] = { ...record, status: 'undoing' };
    writeHistory(records);
    try {
      relativeFilePath(absolutePath);
      atomicWrite(absolutePath, record.before);
      records[index] = { ...record, status: 'undone' };
      writeHistory(records);
    } catch (error) {
      try {
        records[index] = { ...record, status: 'applied' };
        writeHistory(records);
      } catch {}
      throw error;
    }
    return { success: true as const, editId: record.id, message: `Undid ${record.summary}.` };
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

  // Containment check
  relativeFilePath(absolutePath);

  // Write through atomic write path
  records[index] = { ...record, status: 'undoing' };
  writeHistory(records);
  try {
    atomicWrite(absolutePath, newContent);
    records[index] = { ...record, status: 'undone' };
    writeHistory(records);
  } catch (error) {
    try {
      records[index] = { ...record, status: 'applied' };
      writeHistory(records);
    } catch {}
    throw error;
  }

  return { success: true as const, editId: record.id, message: `Undid ${record.summary}.` };
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
