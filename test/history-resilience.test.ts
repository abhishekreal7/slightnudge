import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import {
  readHistory,
  undoSourceEdit,
  createPendingSourceEdit,
  applyPendingSourceEdit,
  discardPendingSourceEdit,
  EditRecord
} from '../lib/slightnudge/edit-history';

describe('History Resilience: Resilient readHistory and Safe File Validation', () => {
  const rootNodeModules = path.resolve('node_modules');

  function createTestWorkspace() {
    const wsId = randomUUID();
    const wsDir = path.join(os.tmpdir(), `hist-ws-${wsId}`);
    fs.mkdirSync(wsDir, { recursive: true });

    // Link node_modules for tailwind
    const nmDir = path.join(wsDir, 'node_modules');
    try {
      fs.symlinkSync(rootNodeModules, nmDir, 'junction');
    } catch {}

    fs.writeFileSync(
      path.join(wsDir, 'package.json'),
      JSON.stringify({
        name: `ws-${wsId}`,
        dependencies: { tailwindcss: '^4.3.3', '@tailwindcss/node': '^4.3.3' }
      }, null, 2),
      'utf8'
    );

    const historyDir = path.join(wsDir, '.slightnudge', 'history');
    const pendingDir = path.join(wsDir, '.slightnudge', 'pending');
    fs.mkdirSync(historyDir, { recursive: true });
    fs.mkdirSync(pendingDir, { recursive: true });

    const editsPath = path.join(historyDir, 'edits.json');
    fs.writeFileSync(editsPath, '[]', 'utf8');

    // Create a CSS entry so tailwind verifier succeeds for valid edits
    fs.mkdirSync(path.join(wsDir, 'app'), { recursive: true });
    fs.writeFileSync(path.join(wsDir, 'app', 'globals.css'), '@import "tailwindcss";\n', 'utf8');

    // Set environment overrides for isolation
    const prevWs = process.env.SLIGHTNUDGE_WORKSPACE_ROOT;
    const prevHist = process.env.SLIGHTNUDGE_HISTORY_PATH;
    const prevPend = process.env.SLIGHTNUDGE_PENDING_DIR;

    process.env.SLIGHTNUDGE_WORKSPACE_ROOT = wsDir;
    process.env.SLIGHTNUDGE_HISTORY_PATH = editsPath;
    process.env.SLIGHTNUDGE_PENDING_DIR = pendingDir;

    const cleanup = () => {
      if (prevWs !== undefined) process.env.SLIGHTNUDGE_WORKSPACE_ROOT = prevWs;
      else delete process.env.SLIGHTNUDGE_WORKSPACE_ROOT;

      if (prevHist !== undefined) process.env.SLIGHTNUDGE_HISTORY_PATH = prevHist;
      else delete process.env.SLIGHTNUDGE_HISTORY_PATH;

      if (prevPend !== undefined) process.env.SLIGHTNUDGE_PENDING_DIR = prevPend;
      else delete process.env.SLIGHTNUDGE_PENDING_DIR;

      try {
        if (fs.existsSync(nmDir)) fs.unlinkSync(nmDir);
      } catch {}
      try {
        fs.rmSync(wsDir, { recursive: true, force: true });
      } catch {}
    };

    return { wsDir, editsPath, cleanup };
  }

  it('(a) a history entry whose file was deleted must not make apply throw: apply on a different existing file succeeds', async () => {
    const ws = createTestWorkspace();
    try {
      // 1. File A is deleted, but has a history record
      const fileAPath = path.join(ws.wsDir, 'fileA.tsx');
      const fileBPath = path.join(ws.wsDir, 'fileB.tsx');
      fs.writeFileSync(fileBPath, 'export default function B() { return <div className="text-sm">B</div>; }', 'utf8');

      // Seed history with entry for fileA (which does not exist)
      const recordA: EditRecord = {
        id: randomUUID(),
        filePath: 'fileA.tsx',
        createdAt: new Date().toISOString(),
        summary: 'Deleted file edit',
        changeCount: 1,
        before: 'before file A',
        after: 'after file A',
        status: 'applied',
      };
      fs.writeFileSync(ws.editsPath, JSON.stringify([recordA], null, 2), 'utf8');

      // 2. Perform preview & apply on fileB
      const initialB = fs.readFileSync(fileBPath, 'utf8');
      const updatedB = initialB.replace('text-sm', 'text-sm p-4');
      const pending = createPendingSourceEdit({
        filePath: fileBPath,
        before: initialB,
        after: updatedB,
        summary: 'Add p-4 to B',
        oldValue: 'text-sm',
        newValue: 'text-sm p-4',
        previewType: 'className',
      });

      assert.ok(pending.id, 'Pending preview should be created');
      const res = await applyPendingSourceEdit(pending.id);
      assert.strictEqual(res.success, true, `Apply must succeed despite deleted fileA in history: ${(res as any).error}`);
      assert.strictEqual(fs.readFileSync(fileBPath, 'utf8'), updatedB, 'fileB should be updated on disk');
    } finally {
      ws.cleanup();
    }
  });

  it('(b) a history entry whose file was deleted must not break undo of a different edit', async () => {
    const ws = createTestWorkspace();
    try {
      const fileBPath = path.join(ws.wsDir, 'fileB.tsx');
      const initialB = 'export default function B() { return <div className="text-sm">B</div>; }';
      const updatedB = 'export default function B() { return <div className="text-sm p-4">B</div>; }';
      fs.writeFileSync(fileBPath, updatedB, 'utf8');

      const recordA: EditRecord = {
        id: randomUUID(),
        filePath: 'fileA.tsx', // deleted file
        createdAt: new Date(Date.now() - 10000).toISOString(),
        summary: 'Edit on deleted file A',
        changeCount: 1,
        before: 'old A',
        after: 'new A',
        status: 'applied',
      };

      const recordB: EditRecord = {
        id: randomUUID(),
        filePath: 'fileB.tsx', // existing file
        createdAt: new Date().toISOString(),
        summary: 'Add p-4 to B',
        changeCount: 1,
        before: initialB,
        after: updatedB,
        status: 'applied',
      };

      fs.writeFileSync(ws.editsPath, JSON.stringify([recordA, recordB], null, 2), 'utf8');

      // Undo fileB edit
      const undoRes = undoSourceEdit(fileBPath);
      assert.strictEqual(undoRes.success, true, `Undo of fileB must succeed: ${(undoRes as any).error}`);
      assert.strictEqual(fs.readFileSync(fileBPath, 'utf8'), initialB, 'fileB should be reverted to initial content');
    } finally {
      ws.cleanup();
    }
  });

  it('(c) a missing-file entry stays in the history file (never auto-deleted) and is returned marked missing so the UI can show it unavailable', async () => {
    const ws = createTestWorkspace();
    try {
      const existingFile = path.join(ws.wsDir, 'exists.tsx');
      fs.writeFileSync(existingFile, 'export default function Exists() { return <div>Hi</div>; }', 'utf8');

      const missingRecord: EditRecord = {
        id: randomUUID(),
        filePath: 'nonexistent-deleted.tsx',
        createdAt: new Date(Date.now() - 5000).toISOString(),
        summary: 'Edit on file that was deleted',
        changeCount: 1,
        before: '<div>before</div>',
        after: '<div>after</div>',
        status: 'applied',
      };

      const existingRecord: EditRecord = {
        id: randomUUID(),
        filePath: 'exists.tsx',
        createdAt: new Date().toISOString(),
        summary: 'Edit on existing file',
        changeCount: 1,
        before: '<div>old</div>',
        after: '<div>new</div>',
        status: 'applied',
      };

      fs.writeFileSync(ws.editsPath, JSON.stringify([missingRecord, existingRecord], null, 2), 'utf8');

      const list = readHistory();
      assert.strictEqual(list.length, 2, 'Both records must be returned');

      const foundMissing = list.find(r => r.id === missingRecord.id);
      assert.ok(foundMissing, 'Missing record must be returned');
      assert.strictEqual(foundMissing.missing, true, 'Missing record must be marked missing: true');

      const foundExisting = list.find(r => r.id === existingRecord.id);
      assert.ok(foundExisting, 'Existing record must be returned');
      assert.strictEqual(foundExisting.missing ?? false, false, 'Existing record must not be marked missing');

      // Verify the history file on disk still contains the missing record (never auto-deleted)
      const onDisk = JSON.parse(fs.readFileSync(ws.editsPath, 'utf8'));
      assert.strictEqual(onDisk.length, 2, 'History file on disk must retain both records');
      assert.ok(onDisk.some((r: any) => r.id === missingRecord.id), 'Missing record must not be auto-deleted from disk');
    } finally {
      ws.cleanup();
    }
  });

  it('(d) an entry whose path escapes the project root is skipped and reported, never followed', async () => {
    const ws = createTestWorkspace();
    try {
      const validFile = path.join(ws.wsDir, 'valid.tsx');
      fs.writeFileSync(validFile, 'export default function V() { return <div>V</div>; }', 'utf8');

      const escapingRecord: EditRecord = {
        id: randomUUID(),
        filePath: '../../etc/passwd',
        createdAt: new Date(Date.now() - 5000).toISOString(),
        summary: 'Malicious traversal record',
        changeCount: 1,
        before: 'root:x:0:0',
        after: 'root:x:0:0:hacked',
        status: 'applied',
      };

      const validRecord: EditRecord = {
        id: randomUUID(),
        filePath: 'valid.tsx',
        createdAt: new Date().toISOString(),
        summary: 'Valid edit',
        changeCount: 1,
        before: 'before',
        after: 'after',
        status: 'applied',
      };

      fs.writeFileSync(ws.editsPath, JSON.stringify([escapingRecord, validRecord], null, 2), 'utf8');

      const list = readHistory();
      // Escaping entry must be skipped from the returned list
      assert.strictEqual(list.length, 1, 'Only the valid record should be returned; escaping entry must be skipped');
      assert.strictEqual(list[0].id, validRecord.id, 'Returned record must be the valid one');

      // Verify path safety for apply/undo targets themselves remains strictly enforced
      const outsideFile = path.join(os.tmpdir(), `outside-target-${randomUUID()}.tsx`);
      fs.writeFileSync(outsideFile, 'initial content', 'utf8');
      try {
        assert.throws(
          () => createPendingSourceEdit({
            filePath: outsideFile,
            before: 'initial content',
            after: 'tampered content',
            summary: 'outside',
            oldValue: 'initial content',
            newValue: 'tampered content',
          }),
          /inside the SlightNudge workspace|outside this repository/i,
          'Path safety for apply/undo targets must remain strictly enforced'
        );
      } finally {
        try { fs.unlinkSync(outsideFile); } catch {}
      }
    } finally {
      ws.cleanup();
    }
  });

  it('(e) undo of the entry whose file is missing returns a clear error ("that file no longer exists"), not a crash', async () => {
    const ws = createTestWorkspace();
    try {
      const missingRecord: EditRecord = {
        id: randomUUID(),
        filePath: 'missing-file.tsx',
        createdAt: new Date().toISOString(),
        summary: 'Edit on missing file',
        changeCount: 1,
        before: 'before',
        after: 'after',
        status: 'applied',
      };

      fs.writeFileSync(ws.editsPath, JSON.stringify([missingRecord], null, 2), 'utf8');

      // Undo attempt on missing file
      const undoRes = undoSourceEdit(path.join(ws.wsDir, 'missing-file.tsx'));
      assert.strictEqual(undoRes.success, false, 'Undo on missing file must fail');
      assert.match(undoRes.error || '', /that file no longer exists/i, 'Error must state "That file no longer exists."');
    } finally {
      ws.cleanup();
    }
  });

  it('(f) a corrupt history file (invalid JSON) produces a clear error and does not overwrite or truncate the file', async () => {
    const ws = createTestWorkspace();
    try {
      const corruptContent = '{\n  "this is invalid JSON": [unterminated array\n';
      fs.writeFileSync(ws.editsPath, corruptContent, 'utf8');

      // Calling readHistory on corrupt file must throw a clear error
      assert.throws(
        () => readHistory(),
        /invalid|corrupt/i,
        'readHistory must throw a clear error on corrupt JSON'
      );

      // Verify the file on disk was NOT overwritten or truncated
      const onDisk = fs.readFileSync(ws.editsPath, 'utf8');
      assert.strictEqual(onDisk, corruptContent, 'History file on disk must remain unchanged (not overwritten or truncated)');
    } finally {
      ws.cleanup();
    }
  });
});
