import { describe, it } from 'node:test';
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
  readHistory,
} from '../lib/slightnudge/edit-history';

describe('Mutant M3 Closeout: Restored Token Refusal Battery', () => {
  it('case 1 (elementId recorded): user restores removed token by hand -> only token check refuses with specific restored-token error', async () => {
    const wsRoot = path.join(os.tmpdir(), `m3-test-case1-${crypto.randomUUID()}`);
    fs.mkdirSync(path.join(wsRoot, 'fixtures'), { recursive: true });

    const relPath = 'fixtures/test-m3-case1.tsx';
    const fullPath = path.join(wsRoot, relPath);

    const initialSource = [
      'export default function TestCase1() {',
      '  return (',
      '    <div id="target-element" className="p-4 text-sm font-normal">',
      '      Hello M3 Case 1',
      '    </div>',
      '  );',
      '}',
      '',
    ].join('\n');

    fs.writeFileSync(fullPath, initialSource, 'utf8');

    const env = setupIsolatedEnv('m3-env-case1', wsRoot);

    try {
      // 1. Create edit through real preview/apply path so elementId is recorded
      const updatedSource = initialSource.replace('font-normal', 'font-bold');
      const pending = createPendingSourceEdit({
        filePath: fullPath,
        before: initialSource,
        after: updatedSource,
        summary: 'font-normal → font-bold',
        oldValue: 'font-normal',
        newValue: 'font-bold',
        line: 3,
        elementId: 'target-element',
        tagName: 'div',
        previewType: 'className',
        removedTokens: ['font-normal'],
        addedTokens: ['font-bold'],
      });

      const applyRes = await applyPendingSourceEdit(pending.id);
      assert.strictEqual(applyRes.success, true, 'Apply must succeed');
      const postApplyContent = fs.readFileSync(fullPath, 'utf8');
      assert.strictEqual(postApplyContent, updatedSource, 'File updated to applied state');

      // 2. User restores the removed token ('font-normal') by hand while keeping added token ('font-bold')
      const manualRestoredSource = initialSource.replace('font-normal', 'font-bold font-normal');
      fs.writeFileSync(fullPath, manualRestoredSource, 'utf8');
      const manualBytesBeforeUndo = fs.readFileSync(fullPath);

      // 3. Attempt undo
      const undoRes = await undoSourceEdit(relPath);

      // Assertions per spec:
      // - Refused (success === false)
      assert.strictEqual(undoRes.success, false, 'Undo must be REFUSED when removed token was restored by user');

      // - Specific restored-token refusal message (not candidate lookup message)
      const errorMsg = undoRes.error || '';
      console.log('Case 1 refusal message:', errorMsg);
      assert.strictEqual(
        errorMsg.includes('the token was modified by the user'),
        true,
        `Expected specific restored-token refusal, got: ${errorMsg}`
      );
      assert.strictEqual(
        errorMsg.includes('element could not be found'),
        false,
        `Must NOT refuse with lookup fallback message: ${errorMsg}`
      );

      // - Names file, line and the token
      assert.strictEqual(
        errorMsg.includes(path.normalize(relPath)) || errorMsg.includes(relPath),
        true,
        `Refusal message must name file (${relPath})`
      );
      assert.strictEqual(errorMsg.includes('3'), true, 'Refusal message must name line 3');
      assert.strictEqual(errorMsg.includes('font-normal'), true, 'Refusal message must name restored token font-normal');
      assert.strictEqual(errorMsg.includes('font-bold'), true, 'Refusal message must name added token font-bold');

      // - File bytes identical
      const postUndoBytes = fs.readFileSync(fullPath);
      assert.strictEqual(
        Buffer.compare(postUndoBytes, manualBytesBeforeUndo),
        0,
        'File bytes must remain identical on refusal'
      );

      // - No temp file left
      const wsFiles = fs.readdirSync(wsRoot);
      const tempFiles = wsFiles.filter(f => f.includes('.tmp-'));
      assert.strictEqual(tempFiles.length, 0, 'No temp files should be left behind in workspace');

      // - History status unchanged (remains 'applied')
      const history = readHistory();
      assert.strictEqual(history.length, 1, 'History must contain 1 record');
      assert.strictEqual(history[0].status, 'applied', 'History status must remain "applied" on refusal');
    } finally {
      env.cleanup();
      try { fs.rmSync(wsRoot, { recursive: true, force: true }); } catch {}
    }
  });

  it('case 2 (candidate scanning fallback): without elementId, restored token causes candidate scanning to miss target element', async () => {
    const wsRoot = path.join(os.tmpdir(), `m3-test-case2-${crypto.randomUUID()}`);
    fs.mkdirSync(path.join(wsRoot, 'fixtures'), { recursive: true });

    const relPath = 'fixtures/test-m3-case2.tsx';
    const fullPath = path.join(wsRoot, relPath);

    const initialSource = [
      'export default function TestCase2() {',
      '  return (',
      '    <div className="p-4 text-sm font-normal">',
      '      Hello M3 Case 2',
      '    </div>',
      '  );',
      '}',
      '',
    ].join('\n');

    fs.writeFileSync(fullPath, initialSource, 'utf8');

    const env = setupIsolatedEnv('m3-env-case2', wsRoot);

    try {
      // 1. Create edit WITHOUT elementId
      const updatedSource = initialSource.replace('font-normal', 'font-bold');
      const pending = createPendingSourceEdit({
        filePath: fullPath,
        before: initialSource,
        after: updatedSource,
        summary: 'font-normal → font-bold',
        oldValue: 'font-normal',
        newValue: 'font-bold',
        line: 3,
        tagName: 'div',
        previewType: 'className',
        removedTokens: ['font-normal'],
        addedTokens: ['font-bold'],
      });

      const applyRes = await applyPendingSourceEdit(pending.id);
      assert.strictEqual(applyRes.success, true, 'Apply must succeed');

      // 2. User restores removed token by hand
      const manualRestoredSource = initialSource.replace('font-normal', 'font-bold font-normal');
      fs.writeFileSync(fullPath, manualRestoredSource, 'utf8');
      const manualBytesBeforeUndo = fs.readFileSync(fullPath);

      // 3. Attempt undo -> candidate lookup fails because candidate filter requires !currentTokens.includes(removed)
      const undoRes = await undoSourceEdit(relPath);

      assert.strictEqual(undoRes.success, false, 'Undo must be refused');
      const errorMsg = undoRes.error || '';
      console.log('Case 2 fallback refusal message:', errorMsg);

      // Shows which message appears when lookup falls back to candidate scanning
      assert.strictEqual(
        errorMsg.includes('element could not be found'),
        true,
        `Candidate scanning fallback must produce 'element could not be found', got: ${errorMsg}`
      );
      assert.strictEqual(
        errorMsg.includes(path.normalize(relPath)) || errorMsg.includes(relPath),
        true,
        'Error must name the file'
      );

      // - File bytes identical
      const postUndoBytes = fs.readFileSync(fullPath);
      assert.strictEqual(
        Buffer.compare(postUndoBytes, manualBytesBeforeUndo),
        0,
        'File bytes must remain identical on refusal'
      );

      // - History status unchanged
      const history = readHistory();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].status, 'applied');
    } finally {
      env.cleanup();
      try { fs.rmSync(wsRoot, { recursive: true, force: true }); } catch {}
    }
  });
});
