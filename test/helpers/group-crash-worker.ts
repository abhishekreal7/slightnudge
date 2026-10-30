import fs from 'node:fs';
import { saveSourceGroup, undoSourceGroup, sourceGroupStatus, setSourceGroupTestHook } from '../../lib/slightnudge/source-group';
const [file, operation, phase] = process.argv.slice(2);
const input = JSON.parse(fs.readFileSync(file, 'utf8'));
if (phase)
    setSourceGroupTestHook((at, _id, index) => { if (at === phase && (phase !== 'after-file' || index === 0))
        process.exit(47); });
const scope = { root: input.scopeRoot || input.root, repositoryId: input.repositoryId };
const result = operation === 'status' ? sourceGroupStatus(input.id, scope) : operation === 'undo' ? undoSourceGroup(input.id, scope) : await saveSourceGroup(input.id, input.targets, scope);
process.stdout.write(JSON.stringify(result));
