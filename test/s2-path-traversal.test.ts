import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { applyPendingSourceEdit, discardPendingSourceEdit } from '../lib/slightnudge/edit-history';
import { setupIsolatedEnv, IsolatedEnv } from './helpers/test-server';

describe('S2: Path traversal refusal regression test', () => {
  const scratchDir = path.join(process.cwd(), 'scratch');
  let env: IsolatedEnv;

  before(() => {
    env = setupIsolatedEnv('s2-test');
  });

  after(() => {
    if (env) env.cleanup();
  });

  it('refuses pending-preview with ..\\ traversing outside project root, leaving target file unchanged', async () => {
    fs.mkdirSync(scratchDir, { recursive: true });
    const outsideFile = path.join(os.tmpdir(), `s2-outside-${randomUUID()}.txt`);
    const initialContent = 'OUTSIDE TARGET BYTE-FOR-BYTE INITIAL CONTENT';
    fs.writeFileSync(outsideFile, initialContent, 'utf8');

    // Construct path with ..\ that reaches outsideFile from process.cwd()
    const relWithDots = path.join('..', path.relative(path.resolve(process.cwd(), '..'), outsideFile));

    const pendingId = randomUUID();
    const pending = {
      id: pendingId,
      filePath: relWithDots,
      createdAt: new Date().toISOString(),
      summary: 'Malicious dot-dot traversal',
      oldValue: initialContent,
      newValue: 'OVERWRITTEN MALICIOUS CONTENT',
      previewType: 'textContent' as const,
      before: initialContent,
      after: 'OVERWRITTEN MALICIOUS CONTENT',
    };
    const pendingFile = path.join(env.pendingDir, `${pendingId}.json`);
    fs.writeFileSync(pendingFile, JSON.stringify(pending), 'utf8');

    try {
      let errorThrown: any = null;
      try {
        const res = await applyPendingSourceEdit(pendingId);
        if (res && !res.success) {
          errorThrown = new Error(res.error);
        }
      } catch (err: any) {
        errorThrown = err;
      }

      assert.ok(errorThrown, 'Apply must throw or refuse path traversal');
      assert.match(errorThrown.message, /must be inside the SlightNudge workspace/i, 'Error must indicate file outside workspace');

      const finalOutsideContent = fs.readFileSync(outsideFile, 'utf8');
      assert.strictEqual(finalOutsideContent, initialContent, 'External file MUST remain byte-for-byte unchanged');
    } finally {
      try { discardPendingSourceEdit(pendingId); } catch {}
      try { fs.unlinkSync(outsideFile); } catch {}
    }
  });

  it('refuses pending-preview using symlink/junction pointing outside project root, leaving target file unchanged', async () => {
    fs.mkdirSync(scratchDir, { recursive: true });
    const outsideFile = path.join(os.tmpdir(), `s2-outside-symlink-${randomUUID()}.txt`);
    const initialContent = 'OUTSIDE SYMLINK TARGET UNTOUCHED';
    fs.writeFileSync(outsideFile, initialContent, 'utf8');

    const linkDir = path.join(scratchDir, `link-${randomUUID()}`);
    let linkCreated = false;
    try {
      // Windows directory junction to os.tmpdir()
      fs.symlinkSync(os.tmpdir(), linkDir, 'junction');
      linkCreated = true;
    } catch (err: any) {
      console.warn('Could not create symlink/junction:', err.message);
    }

    if (!linkCreated) {
      console.log('UNVERIFIED: Symlink/junction creation not permitted on this host environment without elevated privileges.');
      try { fs.unlinkSync(outsideFile); } catch {}
      return;
    }

    // Relative path inside project that goes through junction to outsideFile
    const targetInLink = path.relative(process.cwd(), path.join(linkDir, path.basename(outsideFile)));

    const pendingId = randomUUID();
    const pending = {
      id: pendingId,
      filePath: targetInLink,
      createdAt: new Date().toISOString(),
      summary: 'Malicious junction traversal',
      oldValue: initialContent,
      newValue: 'OVERWRITTEN MALICIOUS CONTENT VIA JUNCTION',
      previewType: 'textContent' as const,
      before: initialContent,
      after: 'OVERWRITTEN MALICIOUS CONTENT VIA JUNCTION',
    };
    const pendingFile = path.join(env.pendingDir, `${pendingId}.json`);
    fs.writeFileSync(pendingFile, JSON.stringify(pending), 'utf8');

    try {
      let errorThrown: any = null;
      try {
        const res = await applyPendingSourceEdit(pendingId);
        if (res && !res.success) {
          errorThrown = new Error(res.error);
        }
      } catch (err: any) {
        errorThrown = err;
      }

      assert.ok(errorThrown, 'Apply must throw or refuse junction traversal');
      assert.match(errorThrown.message, /must be inside the SlightNudge workspace/i, 'Error must indicate file outside workspace');

      const finalOutsideContent = fs.readFileSync(outsideFile, 'utf8');
      assert.strictEqual(finalOutsideContent, initialContent, 'External file via junction MUST remain byte-for-byte unchanged');
    } finally {
      try { discardPendingSourceEdit(pendingId); } catch {}
      try { fs.unlinkSync(linkDir); } catch {}
      try { fs.unlinkSync(outsideFile); } catch {}
    }
  });
});
