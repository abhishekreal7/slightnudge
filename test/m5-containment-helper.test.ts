import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {
  assertWriteTargetInsideWorkspace,
  setPreWriteTestHook,
  undoSourceEdit,
  readHistory,
} from '../lib/slightnudge/edit-history';
import { setupIsolatedEnv } from './helpers/test-server';

describe('M5: Pre-write containment check & helper verification', () => {
  let env: ReturnType<typeof setupIsolatedEnv>;
  let outsideDir: string;
  let sentinelFile: string;
  let sentinelHash: string;

  before(() => {
    // Isolated workspace
    const wsRoot = path.join(os.tmpdir(), `m5-ws-${crypto.randomUUID()}`);
    fs.mkdirSync(wsRoot, { recursive: true });

    // Copy a fixture into the temp workspace
    const fixturesDir = path.join(wsRoot, 'fixtures');
    fs.mkdirSync(fixturesDir, { recursive: true });
    fs.copyFileSync(
      path.join(process.cwd(), 'fixtures', '1-plain-static.tsx'),
      path.join(fixturesDir, '1-plain-static.tsx')
    );

    env = setupIsolatedEnv('m5-test', wsRoot);

    // Outside directory & sentinel
    outsideDir = path.join(os.tmpdir(), `m5-outside-${crypto.randomUUID()}`);
    fs.mkdirSync(outsideDir, { recursive: true });
    sentinelFile = path.join(outsideDir, 'outside-sentinel.tsx');
    fs.writeFileSync(sentinelFile, '// OUTSIDE SENTINEL - DO NOT OVERWRITE', 'utf8');
    sentinelHash = crypto.createHash('sha256').update(fs.readFileSync(sentinelFile)).digest('hex');
  });

  after(() => {
    setPreWriteTestHook(null);
    if (env) env.cleanup();
    try {
      fs.rmSync(outsideDir, { recursive: true, force: true });
    } catch {}
  });

  describe('Unit tests for assertWriteTargetInsideWorkspace', () => {
    it('refuses path with .. segments escaping workspace root', () => {
      assert.throws(() => {
        assertWriteTargetInsideWorkspace(path.join(process.env.SLIGHTNUDGE_WORKSPACE_ROOT!, '..', 'escape.tsx'));
      }, /must be inside the SlightNudge workspace/);
    });

    it('refuses relative .. path traversal', () => {
      assert.throws(() => {
        assertWriteTargetInsideWorkspace('../escape.tsx');
      }, /must be inside the SlightNudge workspace/);
    });

    it('refuses UNC paths', () => {
      assert.throws(() => {
        assertWriteTargetInsideWorkspace('\\\\localhost\\c$\\escape.tsx');
      }, /must be inside the SlightNudge workspace/);

      assert.throws(() => {
        assertWriteTargetInsideWorkspace('//127.0.0.1/c$/escape.tsx');
      }, /must be inside the SlightNudge workspace/);
    });

    it('refuses \\\\?\\ paths pointing outside workspace', () => {
      assert.throws(() => {
        assertWriteTargetInsideWorkspace(`\\\\?\\${sentinelFile}`);
      }, /must be inside the SlightNudge workspace/);
    });

    it('refuses 8.3 short names pointing outside workspace', () => {
      assert.throws(() => {
        assertWriteTargetInsideWorkspace('C:\\PROGRA~1\\outside.tsx');
      }, /must be inside the SlightNudge workspace/);
    });

    it('refuses junction to an outside directory', () => {
      const junctionPath = path.join(process.env.SLIGHTNUDGE_WORKSPACE_ROOT!, 'outside-junc');
      try {
        fs.symlinkSync(outsideDir, junctionPath, 'junction');
      } catch (e) {
        // If junction creation fails, skip
        return;
      }

      try {
        const targetInJunction = path.join(junctionPath, 'outside-sentinel.tsx');
        assert.throws(() => {
          assertWriteTargetInsideWorkspace(targetInJunction);
        }, /must be inside the SlightNudge workspace/);
      } finally {
        try { fs.unlinkSync(junctionPath); } catch {}
      }
    });

    it('verifies or marks symlink test UNVERIFIED if admin rights are missing', () => {
      const symlinkPath = path.join(process.env.SLIGHTNUDGE_WORKSPACE_ROOT!, 'outside-sym');
      try {
        fs.symlinkSync(outsideDir, symlinkPath, 'dir');
        const targetInSymlink = path.join(symlinkPath, 'outside-sentinel.tsx');
        assert.throws(() => {
          assertWriteTargetInsideWorkspace(targetInSymlink);
        }, /must be inside the SlightNudge workspace/);
        fs.unlinkSync(symlinkPath);
      } catch (err: any) {
        if (err.code === 'EPERM' || err.code === 'EACCES') {
          console.log('Symlink creation requires elevated privileges (marked UNVERIFIED per instructions)');
        } else {
          throw err;
        }
      }
    });

    it('accepts valid path inside workspace', () => {
      const validRel = assertWriteTargetInsideWorkspace('fixtures/1-plain-static.tsx');
      assert.strictEqual(validRel, path.join('fixtures', '1-plain-static.tsx'));
    });
  });

  describe('Wiring test for TOCTOU pre-write swap via hook', () => {
    it('refuses undo and preserves outside sentinel when target is swapped for junction before write', async () => {
      const wsRoot = process.env.SLIGHTNUDGE_WORKSPACE_ROOT!;
      const targetRel = 'fixtures/1-plain-static.tsx';
      const targetAbs = path.join(wsRoot, targetRel);

      // Create a valid history entry in isolated edits.json
      const beforeContent = fs.readFileSync(targetAbs, 'utf8');
      const afterContent = beforeContent.replace('ml-2.5', 'ml-3');
      fs.writeFileSync(targetAbs, afterContent, 'utf8');

      const editId = crypto.randomUUID();
      fs.writeFileSync(
        env.editsPath,
        JSON.stringify([
          {
            id: editId,
            filePath: targetRel,
            createdAt: new Date().toISOString(),
            summary: 'ml-2.5 -> ml-3',
            before: beforeContent,
            after: afterContent,
            status: 'applied',
            line: 8,
            addedTokens: ['ml-3'],
            removedTokens: ['ml-2.5'],
          },
        ]),
        'utf8'
      );

      // Set pre-write hook to swap the target directory/file with a junction to outsideDir
      let hookTriggered = false;
      const targetDir = path.dirname(targetAbs);
      const backupFile = path.join(wsRoot, 'fixtures-backup.tsx');

      setPreWriteTestHook(() => {
        hookTriggered = true;
        // Move target file away and junction fixtures folder or file to outside
        fs.copyFileSync(targetAbs, backupFile);
        fs.unlinkSync(targetAbs);
        fs.symlinkSync(outsideDir, targetAbs, 'junction');
      });

      try {
        let threw = false;
        try {
          const res = await undoSourceEdit(targetRel);
          if (!res.success) threw = true;
        } catch {
          threw = true;
        }

        assert.ok(hookTriggered, 'Pre-write hook must have been triggered');
        assert.ok(threw, 'undoSourceEdit MUST throw or refuse when target resolves outside workspace');

        // Sentinel check
        const currentSentinelHash = crypto.createHash('sha256').update(fs.readFileSync(sentinelFile)).digest('hex');
        assert.strictEqual(
          currentSentinelHash,
          sentinelHash,
          'Outside sentinel file MUST BE UNCHANGED after attempted exploit'
        );

        // Check no temp files left
        const tempFiles = fs.readdirSync(wsRoot).filter((f) => f.includes('.tmp-'));
        assert.strictEqual(tempFiles.length, 0, 'No temp files should remain in workspace');
      } finally {
        setPreWriteTestHook(null);
        try {
          fs.unlinkSync(targetAbs);
          if (fs.existsSync(backupFile)) {
            fs.copyFileSync(backupFile, targetAbs);
            fs.unlinkSync(backupFile);
          }
        } catch {}
      }
    });
  });
});
