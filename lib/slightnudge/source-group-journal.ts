import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { EditRecord } from './edit-history';
export interface GroupMember {
    previewId: string;
    editId: string;
    filePath: string;
    sourcePath?: string;
    before: string;
    after: string;
    historyDigest: string;
    metadata: Partial<EditRecord>;
}
export interface SourceGroupJournal {
    version: 1;
    id: string;
    repositoryId?: string;
    root: string;
    phase: 'saving' | 'saved' | 'undoing' | 'undone';
    members: GroupMember[];
    digest: string;
    createdAt: string;
}
export const validGroupId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export const groupDigest = (members: GroupMember[]) => createHash('sha256').update(JSON.stringify(members)).digest('hex');
export function groupJournalPath(directory: string, id: string) {
    if (!validGroupId(id))
        throw new Error('Invalid change-set identity.');
    return path.join(directory, id + '.json');
}
export function readGroupJournal(directory: string, id: string): SourceGroupJournal | null {
    const file = groupJournalPath(directory, id);
    try {
        if (fs.statSync(file).size > 20 * 1024 * 1024)
            throw new Error('Change-set recovery record is too large.');
    }
    catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT')
            return null;
        throw error;
    }
    const value = JSON.parse(fs.readFileSync(file, 'utf8')) as SourceGroupJournal;
    if (value.version !== 1 || value.id !== id || !['saving', 'saved', 'undoing', 'undone'].includes(value.phase) || typeof value.root !== 'string' || path.isAbsolute(value.root) || typeof value.createdAt !== 'string' || value.repositoryId !== undefined && typeof value.repositoryId !== 'string' || !Array.isArray(value.members) || !value.members.length || value.members.length > 16 || value.digest !== groupDigest(value.members))
        throw new Error('Change-set recovery data is invalid. Source writes are paused.');
    const paths = new Set<string>(), ids = new Set<string>();
    for (const m of value.members) {
        if (!validGroupId(m.previewId) || !validGroupId(m.editId) || typeof m.filePath !== 'string' || path.isAbsolute(m.filePath) || m.filePath.split(/[\\/]/).includes('..') || typeof m.before !== 'string' || typeof m.after !== 'string' || m.before === m.after || Buffer.byteLength(m.before) > 1024 * 1024 || Buffer.byteLength(m.after) > 1024 * 1024 || !/^[a-f0-9]{64}$/.test(m.historyDigest) || !m.metadata || m.metadata.previewIds?.length !== 1 || m.metadata.previewIds[0] !== m.previewId || m.metadata.repositoryId !== value.repositoryId || m.metadata.sourcePath !== m.sourcePath || paths.has(m.filePath.toLowerCase()) || ids.has(m.previewId) || ids.has(m.editId))
            throw new Error('A change-set member is invalid or missing. Source writes are paused.');
        paths.add(m.filePath.toLowerCase());
        ids.add(m.previewId);
        ids.add(m.editId);
    }
    return value;
}
export function guardUnfinishedGroups(directory: string, workspace: string, filePath: string, exceptId?: string) {
    if (!fs.existsSync(directory))
        return;
    const target = path.resolve(workspace, filePath).toLowerCase();
    for (const name of fs.readdirSync(directory)) {
        if (!name.endsWith('.json') || !validGroupId(name.slice(0, -5)))
            continue;
        const journal = readGroupJournal(directory, name.slice(0, -5));
        if (!journal || journal.id === exceptId || journal.phase === 'saved' || journal.phase === 'undone')
            continue;
        if (journal.members.some(m => path.resolve(workspace, m.filePath).toLowerCase() === target))
            throw new Error('An interrupted change set owns this file. Check and explicitly resume that change set first.');
    }
}
