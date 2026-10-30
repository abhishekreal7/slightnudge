import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createPendingSourceEdit, readHistory, applyPendingSourceEdit, undoReviewedSourceEdit, setPreWriteTestHook } from '../lib/slightnudge/edit-history';
import { saveSourceGroup, sourceGroupStatus, undoSourceGroup, setSourceGroupTestHook } from '../lib/slightnudge/source-group';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-multi-file-'));
process.env.SLIGHTNUDGE_TEST = '1';
process.env.SLIGHTNUDGE_WORKSPACE_ROOT = root;
process.env.SLIGHTNUDGE_DATA_DIR = path.join(root, '.slightnudge');
const scope = { root };
function pair() {
    const targets = [];
    const sources = [];
    for (let i = 0; i < 2; i++) {
        const file = path.join(root, randomUUID() + '.tsx'), before = 'export default function Part(){return <p>Before</p>}', after = before.replace('Before', 'After');
        fs.writeFileSync(file, before);
        const p = createPendingSourceEdit({ filePath: file, before, after, draft: true, summary: 'Text', oldValue: 'Before', newValue: 'After', previewType: 'textContent' });
        assert.ok(p.id);
        targets.push({ previewId: p.id!, filePath: file });
        sources.push({ file, before, after });
    }
    return { targets, sources };
}
try {
    const a = pair(), id = randomUUID();
    assert.equal((await saveSourceGroup(id, a.targets, scope)).success, true);
    assert.deepEqual(a.sources.map(s => fs.readFileSync(s.file, 'utf8')), a.sources.map(s => s.after));
    assert.equal((await saveSourceGroup(id, a.targets, scope)).success, true);
    assert.equal(readHistory().filter(r => r.groupId === id).length, 2);
    const acceptedJournal = path.join(root, '.slightnudge/history/groups', id + '.json'), acceptedData = fs.readFileSync(acceptedJournal, 'utf8');
    fs.unlinkSync(acceptedJournal);
    assert.equal(undoReviewedSourceEdit(a.targets[0].previewId).success, false, 'A missing group journal must not permit member-only Undo');
    fs.writeFileSync(acceptedJournal, acceptedData);
    assert.equal(undoReviewedSourceEdit(a.targets[0].previewId).success, false, 'Single-file Undo must not split a group');
    assert.equal(undoSourceGroup(id, scope).success, true);
    assert.equal(undoSourceGroup(id, scope).success, true);
    assert.deepEqual(a.sources.map(s => fs.readFileSync(s.file, 'utf8')), a.sources.map(s => s.before));
    for (const phase of ['after-journal', 'after-file', 'after-sources', 'after-receipt']) {
        const b = pair(), tx = randomUUID();
        let once = false;
        setSourceGroupTestHook(point => { if (point === phase && !once) {
            once = true;
            throw new Error('Simulated interruption');
        } });
        assert.equal((await saveSourceGroup(tx, b.targets, scope)).success, false);
        setSourceGroupTestHook(null);
        const beforeStatus = b.sources.map(s => fs.readFileSync(s.file, 'utf8'));
        const status = sourceGroupStatus(tx, scope);
        assert.deepEqual(b.sources.map(s => fs.readFileSync(s.file, 'utf8')), beforeStatus, 'Status must not write project source');
        if (phase === 'after-journal' || phase === 'after-file') {
            assert.equal(status.success, false);
            assert.equal((await applyPendingSourceEdit(b.targets[1].previewId)).success, false, 'An unfinished group blocks single-file writes');
        }
        assert.equal((await saveSourceGroup(tx, b.targets, scope)).success, true);
        assert.equal(readHistory().filter(r => r.groupId === tx).length, 2);
        setSourceGroupTestHook(point => { if (point === 'after-file')
            throw new Error('Interrupted Undo'); });
        assert.equal(undoSourceGroup(tx, scope).success, false);
        setSourceGroupTestHook(null);
        const partial = b.sources.map(s => fs.readFileSync(s.file, 'utf8'));
        assert.equal(sourceGroupStatus(tx, scope).success, false);
        assert.deepEqual(b.sources.map(s => fs.readFileSync(s.file, 'utf8')), partial);
        assert.equal(undoSourceGroup(tx, scope).success, true);
        assert.deepEqual(b.sources.map(s => fs.readFileSync(s.file, 'utf8')), b.sources.map(s => s.before));
    }
    const c = pair(), conflict = randomUUID();
    setSourceGroupTestHook(phase => { if (phase === 'after-file')
        throw new Error('Stop'); });
    await saveSourceGroup(conflict, c.targets, scope);
    setSourceGroupTestHook(null);
    fs.writeFileSync(c.sources[1].file, 'export default function Part(){return <p>External work</p>}');
    const external = c.sources.map(s => fs.readFileSync(s.file, 'utf8'));
    assert.equal(sourceGroupStatus(conflict, scope).state, 'conflict');
    assert.equal((await saveSourceGroup(conflict, c.targets, scope)).success, false);
    assert.deepEqual(c.sources.map(s => fs.readFileSync(s.file, 'utf8')), external);
    const d = pair();
    assert.equal((await saveSourceGroup(randomUUID(), [d.targets[0], d.targets[0]], scope)).success, false);
    assert.equal((await saveSourceGroup(randomUUID(), d.targets, { root, repositoryId: 'other' })).success, false);
    const changed = pair();
    fs.writeFileSync(changed.sources[1].file, 'export default function P(){return null}');
    assert.equal((await saveSourceGroup(randomUUID(), changed.targets, scope)).success, false);
    assert.equal(fs.readFileSync(changed.sources[0].file, 'utf8'), changed.sources[0].before);
    const missing = pair(), missingId = randomUUID();
    setSourceGroupTestHook(phase => { if (phase === 'after-journal')
        throw new Error('Stop before writes'); });
    await saveSourceGroup(missingId, missing.targets, scope);
    setSourceGroupTestHook(null);
    fs.unlinkSync(path.join(root, '.slightnudge/pending', missing.targets[0].previewId + '.json'));
    assert.equal((await saveSourceGroup(missingId, missing.targets, scope)).success, true, 'Durable group snapshots survive missing original preview files');
    const corrupt = pair(), corruptId = randomUUID();
    setSourceGroupTestHook(phase => { if (phase === 'after-journal')
        throw new Error('Stop'); });
    await saveSourceGroup(corruptId, corrupt.targets, scope);
    setSourceGroupTestHook(null);
    const journalFile = path.join(root, '.slightnudge/history/groups', corruptId + '.json'), journal = fs.readFileSync(journalFile, 'utf8'), broken = JSON.parse(journal);
    delete broken.members[0].before;
    fs.writeFileSync(journalFile, JSON.stringify(broken));
    assert.equal(sourceGroupStatus(corruptId, scope).state, 'conflict');
    assert.equal((await applyPendingSourceEdit(corrupt.targets[1].previewId)).success, false);
    assert.equal(fs.readFileSync(corrupt.sources[1].file, 'utf8'), corrupt.sources[1].before);
    fs.writeFileSync(journalFile, journal);
    assert.equal((await saveSourceGroup(corruptId, corrupt.targets, scope)).success, true);
    const alias = pair(), aliasFile = path.join(root, randomUUID() + '.tsx');
    fs.linkSync(alias.sources[0].file, aliasFile);
    const aliased = createPendingSourceEdit({ filePath: aliasFile, before: alias.sources[0].before, after: alias.sources[0].after, draft: true, summary: 'Text', oldValue: 'Before', newValue: 'After', previewType: 'textContent' });
    assert.equal((await saveSourceGroup(randomUUID(), [alias.targets[0], { previewId: aliased.id!, filePath: aliasFile }], scope)).success, false);
    const raced = pair();
    setPreWriteTestHook(file => { if (file === raced.sources[1].file)
        fs.writeFileSync(raced.sources[1].file, 'export default function P(){return <p>Outside edit</p>}'); });
    assert.equal((await saveSourceGroup(randomUUID(), raced.targets, scope)).success, false);
    setPreWriteTestHook(null);
    assert.ok(fs.readFileSync(raced.sources[1].file, 'utf8').includes('Outside edit'));
    console.log('PASS grouped Save/Undo: two files, idempotency, group ownership, interruption at journal/member/source/receipt boundaries, read-only source status, explicit resume, exact Undo recovery, third-version preservation, duplicate/mixed-scope refusal, whole-group prevalidation');
}
finally {
    setSourceGroupTestHook(null);
    setPreWriteTestHook(null);
}
