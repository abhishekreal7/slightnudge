import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { createPendingSourceEdit, applyPendingSourceEdit, discardPendingSourceEdit } from '../lib/slightnudge/edit-history';

describe('S3: Atomic or refuse in atomicWrite', () => {
  const scratchDir = path.join(process.cwd(), 'scratch');

  before(() => {
    fs.mkdirSync(scratchDir, { recursive: true });
  });

  it('refuses and leaves target file unchanged when rename fails permanently without fallback overwrite', async () => {
    const targetFile = path.join(scratchDir, 's3-permanent-fail.txt');
    const initialContent = 'ORIGINAL UNCHANGED CONTENT';
    fs.writeFileSync(targetFile, initialContent, 'utf8');

    const pending = createPendingSourceEdit({
      filePath: targetFile,
      before: initialContent,
      after: 'ATTEMPTED OVERWRITE',
      summary: 'Test atomic failure',
      oldValue: initialContent,
      newValue: 'ATTEMPTED OVERWRITE',
      previewType: 'textContent'
    });
    assert.strictEqual(pending.changed, true);

    const originalRename = fs.renameSync;
    fs.renameSync = () => {
      const err = new Error('EBUSY: resource locked, rename') as any;
      err.code = 'EBUSY';
      throw err;
    };

    try {
      const res = await applyPendingSourceEdit(pending.id);

      // S3 requirement: API must refuse and return error, original file unchanged, no temp files
      assert.strictEqual(res.success, false, 'API must return success: false when rename fails');
      assert.match((res as any).error, /locked|nothing was changed/i, 'Error message must state file is locked and nothing was changed');

      const finalContent = fs.readFileSync(targetFile, 'utf8');
      assert.strictEqual(finalContent, initialContent, 'Target file MUST remain byte-for-byte unchanged');

      const files = fs.readdirSync(scratchDir);
      const tmpFiles = files.filter(f => f.includes('s3-permanent-fail') && f.endsWith('.tmp'));
      assert.strictEqual(tmpFiles.length, 0, 'No .tmp files should be left behind');
    } finally {
      fs.renameSync = originalRename;
      try { discardPendingSourceEdit(pending.id); } catch {}
      try { fs.unlinkSync(targetFile); } catch {}
    }
  });

  it('retries with backoff and succeeds when rename fails twice then succeeds', async () => {
    const targetFile = path.join(scratchDir, 's3-retry-success.txt');
    const initialContent = 'INITIAL';
    const updatedContent = 'SUCCESSFULLY UPDATED AFTER RETRIES';
    fs.writeFileSync(targetFile, initialContent, 'utf8');

    const pending = createPendingSourceEdit({
      filePath: targetFile,
      before: initialContent,
      after: updatedContent,
      summary: 'Test retry backoff',
      oldValue: initialContent,
      newValue: updatedContent,
      previewType: 'textContent'
    });
    assert.strictEqual(pending.changed, true);

    const originalRename = fs.renameSync;
    let failCount = 0;
    fs.renameSync = (oldPath, newPath) => {
      if (failCount < 2) {
        failCount++;
        const err = new Error('EPERM: file locked temporarily') as any;
        err.code = 'EPERM';
        throw err;
      }
      return originalRename(oldPath, newPath);
    };

    try {
      const res = await applyPendingSourceEdit(pending.id);
      assert.strictEqual(failCount, 2, 'Should have retried after 2 failures');
      assert.strictEqual(res.success, true, 'Edit should succeed after retries');

      const finalContent = fs.readFileSync(targetFile, 'utf8');
      assert.strictEqual(finalContent, updatedContent, 'File should have updated successfully');

      const files = fs.readdirSync(scratchDir);
      const tmpFiles = files.filter(f => f.includes('s3-retry-success') && f.endsWith('.tmp'));
      assert.strictEqual(tmpFiles.length, 0, 'Temporary file should be cleaned up');
    } finally {
      fs.renameSync = originalRename;
      try { discardPendingSourceEdit(pending.id); } catch {}
      try {
        const editsFile = path.join(process.cwd(), '.slightnudge', 'history', 'edits.json');
        if (fs.existsSync(editsFile)) {
          const raw = fs.readFileSync(editsFile, 'utf8');
          const records = JSON.parse(raw).filter((r: any) => !r.filePath.includes('s3-retry-success'));
          fs.writeFileSync(editsFile, JSON.stringify(records, null, 2), 'utf8');
        }
      } catch {}
      try { fs.unlinkSync(targetFile); } catch {}
    }
  });
});
