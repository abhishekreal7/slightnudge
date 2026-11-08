import { perfSync } from './perf-stages';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { atomicWrite, assertWriteTargetInsideWorkspace, assertNoUnfinishedApply, fileHistoryDigest, getHistoryPath, getWorkspacePath, invokePreWriteHook, pendingMetadata, readHistory, readPendingSourceEdit, withHistoryMutation, writeHistory, type EditRecord } from './edit-history';
import { findProjectRoot, verifySyntacticParse, verifyTailwindClass } from './tailwind-verifier';
import { groupDigest, groupJournalPath, readGroupJournal, validGroupId, type GroupMember, type SourceGroupJournal } from './source-group-journal';
import { validateComponentDependencies, componentOverlayKey } from './component-ownership';
export interface GroupScope {
    repositoryId?: string;
    root: string;
}
export interface GroupTarget {
    previewId: string;
    filePath: string;
    sourcePath?: string;
}
export interface SourceGroupResult {
    success: boolean;
    transactionId: string;
    state?: 'saving' | 'partial' | 'saved' | 'undoing' | 'undone' | 'conflict';
    code?: string;
    error?: string;
    sourceCurrent?: boolean;
    members?: {
        previewId: string;
        filePath: string;
        sourcePath?: string;
        editId: string;
        written: boolean;
    }[];
}
const directory = () => path.join(path.dirname(getHistoryPath()), 'groups');
let testHook: ((phase: string, id: string, index?: number) => void) | null = null;
export function setSourceGroupTestHook(hook: typeof testHook) { if (process.env.SLIGHTNUDGE_TEST !== '1' || process.env.NODE_ENV === 'production')
    throw new Error('Test hooks are unavailable.'); testHook = hook; }
const checkpoint = (phase: string, id: string, index?: number) => { if (process.env.SLIGHTNUDGE_TEST === '1' && process.env.NODE_ENV !== 'production')
    testHook?.(phase, id, index); };
const fail = (id: string, error: unknown, code = 'GROUP_REFUSED'): SourceGroupResult => ({ success: false, transactionId: id, code, error: error instanceof Error ? error.message : String(error) });
const absolute = (m: GroupMember) => path.resolve(getWorkspacePath(), m.filePath);
const persist = (j: SourceGroupJournal) => perfSync('journal-write', () => atomicWrite(groupJournalPath(directory(), j.id), JSON.stringify(j)));
function bind(j: SourceGroupJournal, scope: GroupScope) {
    const root = fs.realpathSync(scope.root), stored = path.resolve(getWorkspacePath(), j.root);
    if (j.repositoryId !== scope.repositoryId || fs.realpathSync(stored) !== root)
        throw new Error('This change set belongs to a different project.');
    const inodes = new Set<string>();
    for (const m of j.members) {
        const file = absolute(m), canonical = fs.realpathSync(file), rel = path.relative(root, canonical);
        if (assertWriteTargetInsideWorkspace(file) !== path.normalize(m.filePath) || !rel || rel.startsWith('..' + path.sep) || rel === '..' || path.isAbsolute(rel) || scope.repositoryId && (!m.sourcePath || path.isAbsolute(m.sourcePath) || path.resolve(root, m.sourcePath) !== canonical))
            throw new Error('A change-set source path changed or escaped its project.');
        const stat = fs.statSync(file), inode = stat.dev + ':' + stat.ino;
        if (inodes.has(inode))
            throw new Error('Two change-set members alias the same file.');
        inodes.add(inode);
    }
}
function versions(j: SourceGroupJournal) { return j.members.map(m => { const value = fs.readFileSync(absolute(m), 'utf8'); if (value === m.before)
    return 'before'; if (value === m.after)
    return 'after'; throw new Error('A source file changed outside this change set. Your source and draft are preserved; resolve the conflict before resuming.'); }); }
function result(j: SourceGroupJournal): SourceGroupResult {
    const desired = j.phase === 'undone' || j.phase === 'undoing' ? 'before' : 'after';
    let sourceCurrent = true;
    const members = j.members.map(m => { let current = ''; try {
        current = fs.readFileSync(absolute(m), 'utf8');
    }
    catch { } const written = current === (desired === 'before' ? m.before : m.after); sourceCurrent &&= written; return { previewId: m.previewId, filePath: m.filePath, sourcePath: m.sourcePath, editId: m.editId, written }; });
    return { success: j.phase === 'saved' || j.phase === 'undone', transactionId: j.id, state: j.phase, sourceCurrent, members, ...(j.phase === 'saving' || j.phase === 'undoing' ? { code: 'GROUP_RESUME_REQUIRED', error: 'The change set is incomplete. Explicitly resume it to continue.' } : {}) };
}
function checkHistory(j: SourceGroupJournal, undo = false) {
    const records = readHistory();
    for (const m of j.members) {
        const own = records.find(r => r.id === m.editId), latest = records.findLast(r => path.resolve(getWorkspacePath(), r.filePath) === absolute(m));
        if (own) {
            if (own.groupId !== j.id || own.before !== m.before || own.after !== m.after || latest?.id !== own.id || own.status === 'undoing' || !undo && own.status !== 'applied')
                throw new Error('Change-set history no longer matches its recovery record.');
        }
        else if (undo || fileHistoryDigest(m.filePath) !== m.historyDigest)
            throw new Error('Source history changed while this change set was interrupted.');
    }
    return records;
}
function finish(j: SourceGroupJournal, undo = false) {
    const records = checkHistory(j, undo);
    const additions: EditRecord[] = [];
    for (const m of j.members) {
        const index = records.findIndex(r => r.id === m.editId);
        if (undo) {
            if (index < 0)
                throw new Error('A saved change-set receipt is missing.');
            records[index] = { ...records[index], status: 'undone', undoBefore: m.after, undoAfter: m.before };
        }
        else if (index < 0)
            additions.push({ ...m.metadata, id: m.editId, filePath: m.filePath, createdAt: j.createdAt, summary: `Save ${j.members.length}-file change set`, groupId: j.id, changeSetId: j.id, changeCount: 1, before: m.before, after: m.after, status: 'applied' } as EditRecord);
    }
    checkpoint('before-receipt', j.id);
    writeHistory([...records, ...additions]);
    checkpoint('after-receipt', j.id);
    const complete = { ...j, phase: undo ? 'undone' as const : 'saved' as const };
    persist(complete);
    return result(complete);
}
async function verify(m: GroupMember) {
    const check = verifySyntacticParse(absolute(m), m.after);
    if (!check.valid)
        throw new Error('A change-set file does not parse: ' + check.error);
    for (const token of m.metadata.addedTokens || []) {
        const compiled = await verifyTailwindClass(token, findProjectRoot(absolute(m)));
        if (!compiled.verified)
            throw new Error(compiled.error || 'An added utility could not be compiled.');
    }
}
function resume(j: SourceGroupJournal, undo = false): SourceGroupResult {
    versions(j);
    checkHistory(j, undo);
    const overlays=Object.fromEntries(j.members.map(member=>[componentOverlayKey(absolute(member)),undo?member.before:member.after]));
    for(const member of j.members) validateComponentDependencies(member.metadata.componentDependencies,overlays,{root:path.resolve(getWorkspacePath(),j.root),caller:absolute(member)});
    for (const m of j.members)
        assertNoUnfinishedApply(absolute(m), m.previewId, undefined, j.id);
    checkpoint('before-first-write', j.id);
    versions(j);
    for (const [index, m] of j.members.entries()) {
        const desired = undo ? m.before : m.after, previous = undo ? m.after : m.before;
        if (fs.readFileSync(absolute(m), 'utf8') === desired)
            continue;
        invokePreWriteHook(absolute(m));
        for(const member of j.members) validateComponentDependencies(member.metadata.componentDependencies,overlays,{root:path.resolve(getWorkspacePath(),j.root),caller:absolute(member)});
        if (fs.readFileSync(absolute(m), 'utf8') !== previous)
            throw new Error('A source file changed immediately before writing. Nothing was overwritten.');
        atomicWrite(absolute(m), desired);
        checkpoint('after-file', j.id, index);
    }
    if (!versions(j).every(version => version === (undo ? 'before' : 'after')))
        throw new Error('A source revision changed before this change set completed. Resume only after checking its current state.');
    checkpoint('after-sources', j.id);
    return finish(j, undo);
}
export async function saveSourceGroup(id: string, targets: GroupTarget[], scope: GroupScope): Promise<SourceGroupResult> {
    try {
        if (!validGroupId(id) || !Array.isArray(targets) || targets.length < 1 || targets.length > 16)
            throw new Error('Choose 1–16 draft files and a valid transaction identity.');
        let journal = readGroupJournal(directory(), id);
        if (journal) {
            bind(journal, scope);
            const requested = targets.map(t => t.previewId + '|' + fs.realpathSync(t.filePath)).sort();
            const expected = journal.members.map(m => m.previewId + '|' + fs.realpathSync(absolute(m))).sort();
            if (JSON.stringify(requested) !== JSON.stringify(expected))
                throw new Error('This transaction identity already belongs to a different change set.');
            if (journal.phase !== 'saving')
                return result(journal);
        }
        else {
            const members = targets.map(t => {
                const p = readPendingSourceEdit(t.previewId), canonical = fs.realpathSync(t.filePath);
                if (!p.draft || p.repositoryId !== scope.repositoryId || p.sourcePath !== t.sourcePath || path.resolve(getWorkspacePath(), p.filePath) !== canonical)
                    throw new Error('A draft belongs to a different source file or project.');
                return { previewId: p.id, editId: randomUUID(), filePath: p.filePath, sourcePath: p.sourcePath, before: p.before, after: p.after, historyDigest: fileHistoryDigest(p.filePath), metadata: pendingMetadata(p) };
            });
            if (members.reduce((sum, m) => sum + Buffer.byteLength(m.before) + Buffer.byteLength(m.after), 0) > 8 * 1024 * 1024)
                throw new Error('This change set is too large for safe recovery.');
            const root = path.relative(fs.realpathSync(getWorkspacePath()), fs.realpathSync(scope.root)) || '.';
            journal = { version: 1, id, repositoryId: scope.repositoryId, root, phase: 'saving', members, digest: groupDigest(members), createdAt: new Date().toISOString() };
            bind(journal, scope);
            if (new Set(members.map(m => m.filePath.toLowerCase())).size !== members.length || new Set(members.map(m => m.previewId)).size !== members.length)
                throw new Error('Each change-set file must appear exactly once.');
        }
        for (const m of journal.members)
            await verify(m);
        const prepared = journal;
        return withHistoryMutation(() => {
            const existing = readGroupJournal(directory(), id);
            if (existing) {
                bind(existing, scope);
                if (existing.digest !== prepared.digest)
                    throw new Error('This transaction identity changed during validation.');
                if (existing.phase !== 'saving')
                    return result(existing);
                return resume(existing);
            }
            bind(prepared, scope);
            for (const m of prepared.members) {
                assertNoUnfinishedApply(absolute(m));
                const pending = readPendingSourceEdit(m.previewId);
                if (pending.before !== m.before || pending.after !== m.after || fs.readFileSync(absolute(m), 'utf8') !== m.before || fileHistoryDigest(m.filePath) !== m.historyDigest || readHistory().some(r => r.previewIds?.includes(m.previewId)))
                    throw new Error('A draft or source changed before this Save. Nothing was written.');
            }
            const overlays=Object.fromEntries(prepared.members.map(member=>[componentOverlayKey(absolute(member)),member.after]));
            for(const member of prepared.members) validateComponentDependencies(member.metadata.componentDependencies,overlays,{root:path.resolve(getWorkspacePath(),prepared.root),caller:absolute(member)});
            persist(prepared);
            checkpoint('after-journal', id);
            return resume(prepared);
        });
    }
    catch (error) {
        const journal = readGroupJournalSafe(id);
        if (journal)
            try {
                bind(journal, scope);
                return { ...result(journal), ...fail(id, error, 'GROUP_RECOVERY_REQUIRED') };
            }
            catch { }
        let absent = false;
        try { fs.statSync(groupJournalPath(directory(), id)); }
        catch (failure) { absent = (failure as NodeJS.ErrnoException).code === 'ENOENT'; }
        return fail(id, error, absent ? 'GROUP_REFUSED' : 'GROUP_RECOVERY_REQUIRED');
    }
}
function readGroupJournalSafe(id: string) { try {
    return readGroupJournal(directory(), id);
}
catch {
    return null;
} }
export function sourceGroupStatus(id: string, scope: GroupScope): SourceGroupResult {
    try {
        return withHistoryMutation(() => { const j = readGroupJournal(directory(), id); if (!j)
            return fail(id, 'No save journal exists for this change set.', 'GROUP_NOT_STARTED'); bind(j, scope); if (j.phase === 'saved' || j.phase === 'undone')
            return result(j); const state = versions(j); checkHistory(j, j.phase === 'undoing'); if (state.every(v => v === (j.phase === 'undoing' ? 'before' : 'after')))
            return finish(j, j.phase === 'undoing'); const value = result(j); return { ...value, state: state.some(v => v === 'after') && state.some(v => v === 'before') ? 'partial' : j.phase }; });
    }
    catch (error) {
        return { ...fail(id, error, 'GROUP_CONFLICT'), state: 'conflict' };
    }
}
export function undoSourceGroup(id: string, scope: GroupScope): SourceGroupResult {
    try {
        return withHistoryMutation(() => {
            let j = readGroupJournal(directory(), id);
            if (!j)
                throw new Error('This saved change set is unavailable.');
            bind(j, scope);
            if (j.phase === 'undone')
                return result(j);
            if (j.phase === 'saving')
                throw new Error('Resume this Save before undoing the change set.');
            versions(j);
            checkHistory(j, true);
            if (j.phase === 'saved') {
                if (j.members.some(m => fs.readFileSync(absolute(m), 'utf8') !== m.after))
                    throw new Error('A source file changed after Save. The change set cannot be undone automatically.');
                for (const m of j.members)
                    assertNoUnfinishedApply(absolute(m), undefined, undefined, j.id);
                j = { ...j, phase: 'undoing' };
                persist(j);
                checkpoint('after-undo-journal', id);
            }
            return resume(j, true);
        });
    }
    catch (error) {
        const journal = readGroupJournalSafe(id);
        if (journal)
            try {
                bind(journal, scope);
                return { ...result(journal), ...fail(id, error, 'GROUP_UNDO_RECOVERY_REQUIRED') };
            }
            catch { }
        return fail(id, error, 'GROUP_UNDO_RECOVERY_REQUIRED');
    }
}
