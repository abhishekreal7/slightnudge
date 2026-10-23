import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { setupIsolatedEnv } from './helpers/test-server';
import {
  createPendingSourceEdit,
  applyPendingSourceEdit,
  undoSourceEdit,
  setPreWriteTestHook,
  assertWriteTargetInsideWorkspace,
} from '../lib/slightnudge/edit-history';

describe('Mutant M5 Closeout: Parent Directory Junction TOCTOU Attack Battery', () => {
  const originalEnv = { ...process.env };

  before(() => {
    process.env.SLIGHTNUDGE_TEST = '1';
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
  });

  after(() => {
    setPreWriteTestHook(null);
    for (const [k, v] of Object.entries(originalEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('case 1 (undoSourceEdit): swaps PARENT directory for junction to outside folder -> containment refusal identifies guard, outside sentinel unchanged', async () => {
    const wsRoot = path.join(os.tmpdir(), `m5-undo-ws-${crypto.randomUUID()}`);
    const outsideDir = path.join(os.tmpdir(), `m5-undo-outside-${crypto.randomUUID()}`);

    const wsSubDir = path.join(wsRoot, 'sub');
    const outsideSubDir = path.join(outsideDir, 'sub');
    fs.mkdirSync(wsSubDir, { recursive: true });
    fs.mkdirSync(outsideSubDir, { recursive: true });

    const targetRel = path.join('sub', 'page.tsx');
    const wsPagePath = path.join(wsRoot, targetRel);
    const outsidePagePath = path.join(outsideDir, targetRel);

    const initialSource = [
      'export default function SubPage() {',
      '  return (',
      '    <div id="sub-target" className="p-4 text-sm font-normal">',
      '      Sub Page Content',
      '    </div>',
      '  );',
      '}',
      '',
    ].join('\n');

    const outsideSentinelContent = '// SENTINEL IN OUTSIDE DIRECTORY - MUST REMAIN UNMODIFIED\n';
    fs.writeFileSync(wsPagePath, initialSource, 'utf8');
    fs.writeFileSync(outsidePagePath, outsideSentinelContent, 'utf8');

    const sentinelShaBefore = crypto.createHash('sha256').update(fs.readFileSync(outsidePagePath)).digest('hex');

    const env = setupIsolatedEnv('m5-undo-env', wsRoot);

    try {
      // 1. Create and apply edit so we have a valid history record
      const updatedSource = initialSource.replace('font-normal', 'font-bold');
      const pending = createPendingSourceEdit({
        filePath: wsPagePath,
        before: initialSource,
        after: updatedSource,
        summary: 'font-normal → font-bold',
        oldValue: 'font-normal',
        newValue: 'font-bold',
        line: 3,
        elementId: 'sub-target',
        tagName: 'div',
        previewType: 'className',
        removedTokens: ['font-normal'],
        addedTokens: ['font-bold'],
      });

      const applyRes = await applyPendingSourceEdit(pending.id!);
      assert.strictEqual(applyRes.success, true, 'Initial apply must succeed');

      // 2. Setup pre-write hook to execute the real TOCTOU attack:
      // Swap the PARENT directory (wsRoot/sub) for a directory junction to outsideSubDir
      const backupSubDir = path.join(wsRoot, 'sub-real-backup');
      let hookFired = false;

      setPreWriteTestHook(() => {
        hookFired = true;
        // Move original sub directory away
        fs.renameSync(wsSubDir, backupSubDir);
        // Create junction: wsSubDir -> outsideSubDir
        fs.symlinkSync(outsideSubDir, wsSubDir, 'junction');
      });

      let threw = false;
      let caughtError: any = null;
      let undoResult: any = null;

      try {
        undoResult = await undoSourceEdit(targetRel);
        if (!undoResult.success) {
          threw = true;
          caughtError = new Error(undoResult.error);
        }
      } catch (err: any) {
        threw = true;
        caughtError = err;
      } finally {
        setPreWriteTestHook(null);
      }

      // Assertions per spec:
      // (a) Must refuse
      assert.strictEqual(hookFired, true, 'Pre-write hook must have triggered before write');
      assert.strictEqual(threw, true, 'Undo must be refused when parent directory escapes workspace');

      // (b) Error identity: MUST assert containment refusal (not generic "threw" or OS error)
      const errorText = caughtError ? String(caughtError.message || caughtError) : '';
      console.log('Case 1 parent junction refusal message:', errorText);
      const isContainmentError = errorText.includes('inside the SlightNudge workspace') || errorText.includes('Path traversal');
      assert.strictEqual(
        isContainmentError,
        true,
        `Error must specifically identify containment guard, got: ${errorText}`
      );

      // (c) Outside sentinel SHA-256 completely unchanged
      const sentinelShaAfter = crypto.createHash('sha256').update(fs.readFileSync(outsidePagePath)).digest('hex');
      assert.strictEqual(
        sentinelShaAfter,
        sentinelShaBefore,
        'CRITICAL SECURITY INVARIANT: Outside sentinel was modified by escaped write!'
      );

      // (d) No temp files in outside directory
      const outsideFiles = fs.readdirSync(outsideSubDir);
      const outsideTemps = outsideFiles.filter(f => f.includes('.tmp-'));
      assert.strictEqual(outsideTemps.length, 0, 'No temp files should exist in outside directory');

      // (e) Clean up junction and restore workspace
      if (fs.existsSync(wsSubDir)) {
        fs.rmSync(wsSubDir, { recursive: true, force: true });
      }
      if (fs.existsSync(backupSubDir)) {
        fs.renameSync(backupSubDir, wsSubDir);
      }

      // (f) Workspace file in real sub directory remains unchanged
      const wsBytesAfter = fs.readFileSync(wsPagePath, 'utf8');
      assert.strictEqual(wsBytesAfter, updatedSource, 'Workspace file must remain in post-apply state');

      // (g) No temp files in workspace
      const wsFiles = fs.readdirSync(wsSubDir);
      assert.strictEqual(wsFiles.filter(f => f.includes('.tmp-')).length, 0);
    } finally {
      setPreWriteTestHook(null);
      env.cleanup();
      try { fs.rmSync(wsRoot, { recursive: true, force: true }); } catch {}
      try { fs.rmSync(outsideDir, { recursive: true, force: true }); } catch {}
    }
  });

  it('case 2 (applyPendingSourceEdit): swaps PARENT directory for junction -> containment refusal identifies guard, outside file unchanged', async () => {
    const wsRoot = path.join(os.tmpdir(), `m5-apply-ws-${crypto.randomUUID()}`);
    const outsideDir = path.join(os.tmpdir(), `m5-apply-outside-${crypto.randomUUID()}`);

    const wsSubDir = path.join(wsRoot, 'sub');
    const outsideSubDir = path.join(outsideDir, 'sub');
    fs.mkdirSync(wsSubDir, { recursive: true });
    fs.mkdirSync(outsideSubDir, { recursive: true });

    const targetRel = path.join('sub', 'page.tsx');
    const wsPagePath = path.join(wsRoot, targetRel);
    const outsidePagePath = path.join(outsideDir, targetRel);

    const initialSource = [
      'export default function SubPage() {',
      '  return (',
      '    <div id="sub-target" className="p-4 text-sm font-normal">',
      '      Sub Page Content',
      '    </div>',
      '  );',
      '}',
      '',
    ].join('\n');

    const outsideSentinelContent = '// OUTSIDE SENTINEL - DO NOT TOUCH\n';
    fs.writeFileSync(wsPagePath, initialSource, 'utf8');
    fs.writeFileSync(outsidePagePath, outsideSentinelContent, 'utf8');

    const sentinelShaBefore = crypto.createHash('sha256').update(fs.readFileSync(outsidePagePath)).digest('hex');

    const env = setupIsolatedEnv('m5-apply-env', wsRoot);

    try {
      const updatedSource = initialSource.replace('font-normal', 'font-bold');
      const pending = createPendingSourceEdit({
        filePath: wsPagePath,
        before: initialSource,
        after: updatedSource,
        summary: 'font-normal → font-bold',
        oldValue: 'font-normal',
        newValue: 'font-bold',
        line: 3,
        elementId: 'sub-target',
        tagName: 'div',
        previewType: 'className',
        removedTokens: ['font-normal'],
        addedTokens: ['font-bold'],
      });

      const backupSubDir = path.join(wsRoot, 'sub-real-backup');
      let hookFired = false;

      setPreWriteTestHook(() => {
        hookFired = true;
        fs.renameSync(wsSubDir, backupSubDir);
        fs.symlinkSync(outsideSubDir, wsSubDir, 'junction');
      });

      const applyRes = await applyPendingSourceEdit(pending.id!);
      setPreWriteTestHook(null);

      // Assertions per spec:
      assert.strictEqual(hookFired, true, 'Pre-write hook must have triggered before write');
      assert.strictEqual(applyRes.success, false, 'applyPendingSourceEdit must be refused on parent directory swap');

      const errorText = (applyRes as any).error || '';
      console.log('Case 2 apply parent junction refusal message:', errorText);
      assert.strictEqual(
        errorText.includes('inside the SlightNudge workspace'),
        true,
        `applyPendingSourceEdit must identify containment guard: ${errorText}`
      );

      // Outside sentinel completely unchanged
      const sentinelShaAfter = crypto.createHash('sha256').update(fs.readFileSync(outsidePagePath)).digest('hex');
      assert.strictEqual(sentinelShaAfter, sentinelShaBefore, 'Outside sentinel was touched during apply!');

      // No temp file in outside folder
      const outsideFiles = fs.readdirSync(outsideSubDir);
      assert.strictEqual(outsideFiles.filter(f => f.includes('.tmp-')).length, 0);

      // Clean up junction
      if (fs.existsSync(wsSubDir)) {
        fs.rmSync(wsSubDir, { recursive: true, force: true });
      }
      if (fs.existsSync(backupSubDir)) {
        fs.renameSync(backupSubDir, wsSubDir);
      }
    } finally {
      setPreWriteTestHook(null);
      env.cleanup();
      try { fs.rmSync(wsRoot, { recursive: true, force: true }); } catch {}
      try { fs.rmSync(outsideDir, { recursive: true, force: true }); } catch {}
    }
  });

  it('case 3 (swapping file itself - old test case with error identity): asserts specific containment guard identity', async () => {
    const wsRoot = path.join(os.tmpdir(), `m5-file-ws-${crypto.randomUUID()}`);
    const outsideDir = path.join(os.tmpdir(), `m5-file-outside-${crypto.randomUUID()}`);
    fs.mkdirSync(path.join(wsRoot, 'fixtures'), { recursive: true });
    fs.mkdirSync(outsideDir, { recursive: true });

    const targetRel = path.join('fixtures', 'target.tsx');
    const wsTargetAbs = path.join(wsRoot, targetRel);
    const outsideSentinel = path.join(outsideDir, 'outside-sentinel.tsx');
    fs.writeFileSync(outsideSentinel, '// SENTINEL FILE\n', 'utf8');
    const sentinelShaBefore = crypto.createHash('sha256').update(fs.readFileSync(outsideSentinel)).digest('hex');

    const initialSource = [
      'export default function Target() {',
      '  return (',
      '    <div id="target-el" className="p-4 font-normal">',
      '      Content',
      '    </div>',
      '  );',
      '}',
      '',
    ].join('\n');
    fs.writeFileSync(wsTargetAbs, initialSource, 'utf8');

    const env = setupIsolatedEnv('m5-file-env', wsRoot);

    try {
      const updatedSource = initialSource.replace('font-normal', 'font-bold');
      const pending = createPendingSourceEdit({
        filePath: wsTargetAbs,
        before: initialSource,
        after: updatedSource,
        summary: 'font-normal → font-bold',
        oldValue: 'font-normal',
        newValue: 'font-bold',
        line: 3,
        elementId: 'target-el',
        tagName: 'div',
        previewType: 'className',
        removedTokens: ['font-normal'],
        addedTokens: ['font-bold'],
      });

      await applyPendingSourceEdit(pending.id!);

      const backupFile = path.join(wsRoot, 'target-backup.tsx');
      let hookTriggered = false;

      setPreWriteTestHook(() => {
        hookTriggered = true;
        fs.renameSync(wsTargetAbs, backupFile);
        // Swap file itself for junction to outsideDir
        fs.symlinkSync(outsideDir, wsTargetAbs, 'junction');
      });

      let threw = false;
      let errorText = '';
      try {
        const res = await undoSourceEdit(targetRel);
        if (!res.success) {
          threw = true;
          errorText = res.error || '';
        }
      } catch (err: any) {
        threw = true;
        errorText = err.message || String(err);
      } finally {
        setPreWriteTestHook(null);
      }

      assert.strictEqual(hookTriggered, true);
      assert.strictEqual(threw, true);
      console.log('Case 3 file swap refusal message:', errorText);

      // Crucial difference from the defective test:
      // We assert that the error is specifically the containment guard, NOT an OS error like EISDIR or EPERM!
      assert.strictEqual(
        errorText.includes('inside the SlightNudge workspace'),
        true,
        `Must be containment guard error, got: ${errorText}`
      );

      const sentinelShaAfter = crypto.createHash('sha256').update(fs.readFileSync(outsideSentinel)).digest('hex');
      assert.strictEqual(sentinelShaAfter, sentinelShaBefore);

      if (fs.existsSync(wsTargetAbs)) {
        fs.rmSync(wsTargetAbs, { recursive: true, force: true });
      }
      if (fs.existsSync(backupFile)) {
        fs.renameSync(backupFile, wsTargetAbs);
      }
    } finally {
      setPreWriteTestHook(null);
      env.cleanup();
      try { fs.rmSync(wsRoot, { recursive: true, force: true }); } catch {}
      try { fs.rmSync(outsideDir, { recursive: true, force: true }); } catch {}
    }
  });

  it('case 4 (symlink privilege audit): checks Developer Mode / SeCreateSymbolicLinkPrivilege', () => {
    const testDir = path.join(os.tmpdir(), `m5-symlink-check-${crypto.randomUUID()}`);
    fs.mkdirSync(testDir, { recursive: true });
    const targetFile = path.join(testDir, 'target.txt');
    const linkFile = path.join(testDir, 'link.txt');
    fs.writeFileSync(targetFile, 'test');

    let canCreateFileSymlink = false;
    try {
      fs.symlinkSync(targetFile, linkFile, 'file');
      canCreateFileSymlink = true;
      fs.unlinkSync(linkFile);
    } catch (err: any) {
      if (err.code === 'EPERM') {
        console.log('[INFO UNVERIFIED] Windows file symlinks require Developer Mode (SeCreateSymbolicLinkPrivilege).');
        console.log('To enable: Settings -> System -> For developers -> Developer Mode: ON.');
      } else {
        throw err;
      }
    } finally {
      try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
    }

    if (canCreateFileSymlink) {
      console.log('[INFO CONFIRMED] Developer Mode is active: file symlinks supported without admin.');
    } else {
      console.log('[INFO CONFIRMED] Directory junctions verified without admin; file symlinks marked UNVERIFIED as expected.');
    }
  });
});
