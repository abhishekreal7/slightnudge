import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { snapshot, assertUnchanged } from './helpers/real-state';

describe('Real state integrity guard v2', () => {
  it('matches every fixture to its Git HEAD blob', () => {
    const state = snapshot();
    const tracked = execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD', '--', 'fixtures/'], { encoding: 'utf8' })
      .split(/\r?\n/).filter(Boolean);
    const actual = Object.keys(state.files).filter((file) => file.startsWith('fixtures/'));
    assert.deepEqual(actual.sort(), tracked.sort(), 'Fixture additions and deletions must be detected');
    for (const file of tracked) {
      const blob = execFileSync('git', ['show', `HEAD:${file}`]);
      const hash = createHash('sha256').update(blob).digest('hex');
      const observed = state.files[file];
      assert.notEqual(observed, 'absent', `${file} must exist`);
      assert.equal(typeof observed === 'object' && observed.sha256, hash, `${file} must equal HEAD`);
    }
  });

  it('has no tracked modification beyond the allowed generated imports', () => {
    assert.deepEqual(snapshot().status.filter((line) => !line.startsWith('?? ')), []);
  });

  it('detects modification, deletion, creation, history changes and metadata changes in a temporary directory', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-real-state-self-test-'));
    try {
      fs.mkdirSync(path.join(root, 'fixtures', 'nested'), { recursive: true });
      const fixture = path.join(root, 'fixtures', 'nested', 'example.tsx');
      fs.writeFileSync(fixture, 'original');
      const original = snapshot(root);
      assertUnchanged(original, snapshot(root));
      fs.writeFileSync(fixture, 'modified');
      assert.throws(() => assertUnchanged(original, snapshot(root)), /fixtures\/nested\/example\.tsx/);
      const modified = snapshot(root);
      fs.unlinkSync(fixture);
      assert.throws(() => assertUnchanged(modified, snapshot(root)), /fixtures\/nested\/example\.tsx/);
      const deleted = snapshot(root);
      fs.writeFileSync(fixture, 'created');
      assert.throws(() => assertUnchanged(deleted, snapshot(root)), /fixtures\/nested\/example\.tsx/);
      const created = snapshot(root);
      fs.utimesSync(fixture, new Date(0), new Date(0));
      assert.throws(() => assertUnchanged(created, snapshot(root)), /fixtures\/nested\/example\.tsx/);
      const beforeHistory = snapshot(root);
      assert.equal(beforeHistory.files['.slightnudge/history/edits.json'], 'absent');
      fs.mkdirSync(path.join(root, '.slightnudge', 'history'), { recursive: true });
      fs.writeFileSync(path.join(root, '.slightnudge', 'history', 'edits.json'), '[]');
      assert.throws(() => assertUnchanged(beforeHistory, snapshot(root)), /edits\.json/);
      const withHistory = snapshot(root);
      fs.writeFileSync(path.join(root, '.slightnudge', 'history', 'edits.json'), '[{}]');
      assert.throws(() => assertUnchanged(withHistory, snapshot(root)), /edits\.json/);
      assert.throws(() => assertUnchanged(withHistory, { ...withHistory, status: ['?? new-file'] }), /Git status/);
    } finally {
      assert.equal(fs.realpathSync(root), root, 'Cleanup stays in the created temporary directory');
      assert.equal(path.dirname(root), fs.realpathSync(os.tmpdir()));
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
