import assert from 'node:assert/strict';
import { backUpConflictedDraft } from '../lib/slightnudge/draft-conflict-recovery';

const key = 'project-draft';
const raw = '{"frames":["original","unsaved edit"]}';
function fixture(failure?: 'quota' | 'readback') {
  const values = new Map([[key, raw], ['other-project', 'untouched']]);
  return { values, storage: {
    getItem: (k: string) => failure === 'readback' && k.includes(':backup:') ? null : values.get(k) ?? null,
    setItem: (k: string, value: string) => { if (failure === 'quota') throw new Error('Quota exceeded'); values.set(k, value); },
    removeItem: (k: string) => { values.delete(k); },
  } };
}
const success = fixture();
const backup = backUpConflictedDraft(success.storage, key, 'unique');
assert.equal(success.values.get(backup), raw);
assert.equal(success.values.has(key), false);
assert.equal(success.values.get('other-project'), 'untouched');
const memory = fixture();
const memoryBackup = backUpConflictedDraft(memory.storage, key, 'memory', 'newer in-memory draft');
assert.equal(memory.values.get(memoryBackup), 'newer in-memory draft');
for (const failure of ['quota', 'readback'] as const) {
  const f = fixture(failure);
  assert.throws(() => backUpConflictedDraft(f.storage, key, 'unique'));
  assert.equal(f.values.get(key), raw);
}
const collision = fixture();
collision.values.set(`${key}:backup:existing`, 'older backup');
assert.throws(() => backUpConflictedDraft(collision.storage, key, 'existing'));
assert.equal(collision.values.get(key), raw);
assert.equal(collision.values.get(`${key}:backup:existing`), 'older backup');
console.log('PASS exact backup, project isolation, quota failure, failed verification and backup collision');
