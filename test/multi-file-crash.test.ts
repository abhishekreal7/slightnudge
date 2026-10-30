import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createPendingSourceEdit } from '../lib/slightnudge/edit-history';
import { saveSourceGroup, sourceGroupStatus, undoSourceGroup } from '../lib/slightnudge/source-group';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-group-crash-'));
process.env.SLIGHTNUDGE_TEST = '1';
process.env.SLIGHTNUDGE_WORKSPACE_ROOT = root;
process.env.SLIGHTNUDGE_DATA_DIR = path.join(root, '.slightnudge');
function pair(files?: string[], suffix = 'After') {
    const sources = (files || [path.join(root, randomUUID() + '.tsx'), path.join(root, randomUUID() + '.tsx')]).map(file => {
        const before = 'export default function P(){return <p>Before</p>}', after = before.replace('Before', suffix);
        if (!files)
            fs.writeFileSync(file, before);
        const pending = createPendingSourceEdit({ filePath: file, before, after, draft: true, summary: 'Text', oldValue: 'Before', newValue: suffix, previewType: 'textContent' });
        assert.ok(pending.id);
        return { file, before, after, id: pending.id! };
    });
    return { root, id: randomUUID(), sources, targets: sources.map(s => ({ filePath: s.file, previewId: s.id })) };
}
async function worker(input: ReturnType<typeof pair>, operation = 'save', phase = '') {
    const file = path.join(root, randomUUID() + '.json');
    fs.writeFileSync(file, JSON.stringify(input));
    return new Promise<{
        code: number | null;
        output: string;
    }>((resolve, reject) => {
        const child = spawn(process.execPath, ['--import', 'tsx', 'test/helpers/group-crash-worker.ts', file, operation, phase], { cwd: process.cwd(), env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'] });
        let output = '';
        child.stdout.on('data', c => output += c);
        child.stderr.on('data', c => output += c);
        child.on('error', reject);
        child.on('exit', code => resolve({ code, output }));
    });
}
for (const phase of ['after-journal', 'after-file', 'after-sources', 'after-receipt']) {
    const input = pair();
    assert.equal((await worker(input, 'save', phase)).code, 47);
    const actual = input.sources.map(s => fs.readFileSync(s.file, 'utf8'));
    const status = sourceGroupStatus(input.id, { root });
    assert.deepEqual(input.sources.map(s => fs.readFileSync(s.file, 'utf8')), actual);
    if (phase === 'after-journal' || phase === 'after-file')
        assert.equal(status.success, false);
    else
        assert.equal(status.success, true);
    assert.equal((await saveSourceGroup(input.id, input.targets, { root })).success, true);
    assert.equal((await worker(input, 'undo', 'after-file')).code, 47);
    assert.equal(sourceGroupStatus(input.id, { root }).success, false);
    assert.equal(undoSourceGroup(input.id, { root }).success, true);
    assert.deepEqual(input.sources.map(s => fs.readFileSync(s.file, 'utf8')), input.sources.map(s => s.before));
}
const first = pair(), second = pair(first.sources.map(s => s.file), 'Other');
const competing = await Promise.all([worker(first), worker(second)]);
const accepted = competing.map(value => JSON.parse(value.output).success);
assert.equal(accepted.filter(Boolean).length, 1);
const winner = accepted[0] ? first : second;
assert.deepEqual(winner.sources.map(s => fs.readFileSync(s.file, 'utf8')), winner.sources.map(s => s.after));
console.log('PASS multi-process group recovery: process death after intent/first file/all source/history receipt, dead-owner lock recovery, source-read-only status, resumed Save/Undo, competing writers accept exactly one complete change set');
