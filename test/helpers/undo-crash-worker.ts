import fs from 'node:fs';
import path from 'node:path';
import { undoReviewedSourceEdit } from '../../lib/slightnudge/edit-history';

const [phase, previewId, file] = process.argv.slice(2);
const history = path.join(process.env.SLIGHTNUDGE_DATA_DIR!, 'history/edits.json');
const rename = fs.renameSync;
let historyWrites = 0;
fs.renameSync = (from, to) => {
  const target = String(to);
  if (phase === 'before-source' && target === file) process.exit(74);
  rename(from, to);
  if (target === history) historyWrites++;
  if ((phase === 'source-written' && target === file) || (phase === 'history-written' && target === history && historyWrites === 2)) process.exit(74);
};
process.stdout.write(JSON.stringify(undoReviewedSourceEdit(previewId)));
