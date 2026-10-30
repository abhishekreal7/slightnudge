import path from 'node:path';
import { getHistoryPath, getWorkspacePath, readHistory, type EditRecord } from './edit-history';
import { readGroupJournal } from './source-group-journal';

export interface HistoryEntry {
  id: string;
  createdAt: string;
  summary: string;
  files: string[];
  state: 'saved' | 'undone' | 'attention';
}

/** Never send source snapshots or arbitrary history metadata to the browser. */
export function summarizeHistory(records: EditRecord[], root: string, repositoryId?: string): HistoryEntry[] {
  const workspace = getWorkspacePath();
  const grouped = new Map<string, EditRecord[]>();
  for (const record of records) {
    if (record.repositoryId !== repositoryId) continue;
    const relative = path.relative(root, path.resolve(workspace, record.filePath));
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) continue;
    if (!repositoryId && /^\.slightnudge(?:[\\/]|$)/.test(relative)) continue;
    const key = record.changeSetId || record.id;
    grouped.set(key, [...(grouped.get(key) || []), record]);
  }
  const recent = Array.from(grouped).sort((a, b) => String(b[1][0].createdAt || '').localeCompare(String(a[1][0].createdAt || ''))).slice(0, 50);
  return recent.map(([id, members]) => {
    const states = new Set(members.map(member => member.status));
    let state: HistoryEntry['state'] = states.size !== 1 || states.has('undoing') || members.some(member => member.missing) ? 'attention' : states.has('undone') ? 'undone' : 'saved';
    if (members[0].changeSetId) {
      try {
        const journal = readGroupJournal(path.join(path.dirname(getHistoryPath()), 'groups'), id);
        if (!journal || journal.repositoryId !== repositoryId || path.resolve(workspace, journal.root) !== path.resolve(root) || !['saved', 'undone'].includes(journal.phase) || journal.members.length !== members.length || !journal.members.every(member => members.some(record => record.id === member.editId)) || journal.phase === 'undone' && state !== 'undone' || journal.phase === 'saved' && state === 'undone') state = 'attention';
      } catch { state = 'attention'; }
    }
    return {
      id,
      createdAt: Number.isFinite(Date.parse(members[0].createdAt)) ? members[0].createdAt : '',
      summary: members.length > 1 ? `Saved changes across ${members.length} files` : members[0].summary.slice(0, 500),
      files: [...new Set(members.map(member => path.relative(root, path.resolve(workspace, member.filePath)).split(path.sep).join('/')))],
      state,
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
}

export function getHistorySummary(root: string, repositoryId?: string) { return summarizeHistory(readHistory(), root, repositoryId); }
