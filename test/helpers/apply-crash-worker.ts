import fs from 'node:fs';
import path from 'node:path';
import { applyPendingSourceEdit, getSourceApplyOutcome } from '../../lib/slightnudge/edit-history';
import { SourceOperationBusyError } from '../../lib/slightnudge/source-operation-lock';

const [phase, id, file, repositoryId, sourcePath, groupId] = process.argv.slice(2);
const history = path.join(process.env.SLIGHTNUDGE_DATA_DIR!, 'history/edits.json');
const rename = fs.renameSync;
fs.renameSync = (from, to) => {
  const target = String(to);
  if (phase === 'before-source' && target === file) process.exit(73);
  rename(from, to);
  if ((phase === 'source-written' && target === file) || (phase === 'history-written' && target === history)) process.exit(73);
};
try {
  const result = phase === 'query'
    ? getSourceApplyOutcome(id, repositoryId || undefined, sourcePath || undefined, repositoryId ? file : undefined)
    : await applyPendingSourceEdit(id, groupId || undefined, repositoryId || undefined, sourcePath || undefined, repositoryId ? file : undefined);
  process.stdout.write(JSON.stringify(result));
} catch (error) {
  if (phase !== 'query' || !(error instanceof SourceOperationBusyError)) throw error;
  process.stdout.write(JSON.stringify({ success: false, code: error.code }));
}
