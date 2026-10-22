import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { undoSourceEdit, readHistory, EditRecord } from '../lib/slightnudge/edit-history';
import { setupIsolatedEnv } from './helpers/test-server';

describe('Undo Refusals & Safety Mutants Battery', () => {
  function createFixtureWorkspace(initialFileContent: string, relPath = 'fixtures/test-comp.tsx') {
    const wsRoot = path.join(os.tmpdir(), `refusal-ws-${crypto.randomUUID()}`);
    fs.mkdirSync(wsRoot, { recursive: true });
    const fullPath = path.join(wsRoot, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, initialFileContent, 'utf8');

    const env = setupIsolatedEnv('refusal-env', wsRoot);

    const setupHistory = (record: Partial<EditRecord>) => {
      const fullRecord: EditRecord = {
        id: record.id || crypto.randomUUID(),
        filePath: relPath,
        createdAt: new Date().toISOString(),
        summary: record.summary || 'test visual edit',
        before: record.before || initialFileContent,
        after: record.after || initialFileContent,
        status: record.status || 'applied',
        line: record.line || 1,
        addedTokens: record.addedTokens,
        removedTokens: record.removedTokens,
        previewType: record.previewType || 'className',
        oldValue: record.oldValue,
        newValue: record.newValue,
        elementId: record.elementId,
        tagName: record.tagName,
        ...record,
      };
      fs.writeFileSync(env.editsPath, JSON.stringify([fullRecord], null, 2), 'utf8');
      return fullRecord;
    };

    const cleanup = () => {
      env.cleanup();
      try {
        fs.rmSync(wsRoot, { recursive: true, force: true });
      } catch {}
    };

    return { wsRoot, fullPath, relPath, env, setupHistory, cleanup };
  }

  // --- M3: Removed token restored by user ---
  it('M3: refuses undo when element already contains a removed token (user restored it)', async () => {
    // Original had "ml-2.5", edit changed it to "ml-3" (removed ml-2.5, added ml-3).
    // Current file has "ml-3 ml-2.5" (user added ml-2.5 back).
    const fileContent = `export function Comp() {
  return (
    <div>
      <h1 className="text-xl ml-3 ml-2.5 font-bold">Hello</h1>
    </div>
  );
}`;
    const ws = createFixtureWorkspace(fileContent);
    try {
      ws.setupHistory({
        line: 4,
        tagName: 'h1',
        addedTokens: ['ml-3'],
        removedTokens: ['ml-2.5'],
        summary: 'ml-2.5 -> ml-3',
        before: fileContent.replace('ml-3 ml-2.5', 'ml-2.5'),
        after: fileContent.replace('ml-3 ml-2.5', 'ml-3'),
      });

      const beforeBytes = fs.readFileSync(ws.fullPath);
      const res = await undoSourceEdit(ws.relPath);

      assert.strictEqual(res.success, false, 'Expected undo to refuse when removed token is already present');
      assert.ok(res.error?.includes('the token was modified by the user') || res.error?.includes('This file changed after the visual edit'));
      assert.ok(res.error?.includes('fixtures/test-comp.tsx') || res.error?.includes('test-comp.tsx'));
      assert.ok(res.error?.includes('4'), 'Error message should name line 4');
      assert.ok(res.error?.includes('ml-3'), 'Error message should mention added token ml-3');
      assert.ok(res.error?.includes('ml-2.5'), 'Error message should mention removed token ml-2.5');

      const afterBytes = fs.readFileSync(ws.fullPath);
      assert.deepStrictEqual(afterBytes, beforeBytes, 'File bytes must be identical after refusal');

      const records = readHistory();
      assert.strictEqual(records[0].status, 'applied', 'History status must remain applied');
    } finally {
      ws.cleanup();
    }
  });

  // --- M6: Tampered history record ---
  it('M6: refuses undo when history record contains tampered malicious tokens', async () => {
    const baseContent = `export function Comp() {
  return (
    <div>
      <h1 className="text-xl ml-3 font-bold">Hello</h1>
    </div>
  );
}`;
    const diskContent = baseContent + '\n// modified after edit';
    const ws = createFixtureWorkspace(diskContent);
    try {
      ws.setupHistory({
        line: 4,
        tagName: 'h1',
        addedTokens: ['ml-3'],
        removedTokens: ['broken" \n \\ } <'],
        summary: 'malicious tamper',
        before: baseContent.replace('ml-3', 'broken" \n \\ } <'),
        after: baseContent,
      });

      const beforeBytes = fs.readFileSync(ws.fullPath);
      const res = await undoSourceEdit(ws.relPath);

      assert.strictEqual(res.success, false, 'Expected undo to refuse on tampered tokens');
      const afterBytes = fs.readFileSync(ws.fullPath);
      assert.deepStrictEqual(afterBytes, beforeBytes, 'File bytes must be unchanged on disk');

      const records = readHistory();
      assert.strictEqual(records[0].status, 'applied', 'History status must remain applied');
    } finally {
      ws.cleanup();
    }
  });

  // --- Branch 1: Path-containment catch ---
  it('Branch 1: path-containment catch refuses escaping path', async () => {
    const ws = createFixtureWorkspace('export function Comp() { return <div>Hi</div>; }');
    try {
      const res = await undoSourceEdit('../outside.tsx');
      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('must be inside the SlightNudge workspace'));
    } finally {
      ws.cleanup();
    }
  });

  // --- Branch 2: Interrupted-undo recovery ---
  it('Branch 2: interrupted-undo recovery succeeds when status is undoing and file equals before', async () => {
    const originalContent = 'export function Comp() { return <div>Original</div>; }';
    const ws = createFixtureWorkspace(originalContent);
    try {
      const rec = ws.setupHistory({
        status: 'undoing',
        before: originalContent,
        after: 'export function Comp() { return <div>Edited</div>; }',
        summary: 'interrupted change',
      });

      const res = await undoSourceEdit(ws.relPath);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.editId, rec.id);
      assert.ok(res.message?.includes('Undid'));

      const records = readHistory();
      assert.strictEqual(records[0].status, 'undone', 'Status should be recovered to undone');
      assert.strictEqual(fs.readFileSync(ws.fullPath, 'utf8'), originalContent);
    } finally {
      ws.cleanup();
    }
  });

  // --- Branch 3: textContent refusal ---
  it('Branch 3: textContent refusal when file changed after visual edit', async () => {
    const currentContent = 'export function Comp() { return <h1>Modified Heading</h1>; }';
    const ws = createFixtureWorkspace(currentContent);
    try {
      ws.setupHistory({
        previewType: 'textContent',
        line: 1,
        oldValue: 'Original Heading',
        newValue: 'Previewed Heading',
        before: 'export function Comp() { return <h1>Original Heading</h1>; }',
        after: 'export function Comp() { return <h1>Previewed Heading</h1>; }',
        summary: '"Original Heading" -> "Previewed Heading"',
      });

      const beforeBytes = fs.readFileSync(ws.fullPath);
      const res = await undoSourceEdit(ws.relPath);
      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('This file changed after the visual edit'));
      assert.ok(res.error?.includes('Original Heading'));
      assert.ok(res.error?.includes('Previewed Heading'));
      assert.deepStrictEqual(fs.readFileSync(ws.fullPath), beforeBytes);
    } finally {
      ws.cleanup();
    }
  });

  // --- Branch 4: imageSource refusal ---
  it('Branch 4: imageSource refusal when file changed after visual edit', async () => {
    const currentContent = 'export function Comp() { return <img src="/current.png" />; }';
    const ws = createFixtureWorkspace(currentContent);
    try {
      ws.setupHistory({
        previewType: 'imageSource',
        line: 1,
        oldValue: '/old.png',
        newValue: '/preview.png',
        before: 'export function Comp() { return <img src="/old.png" />; }',
        after: 'export function Comp() { return <img src="/preview.png" />; }',
        summary: 'image src change',
      });

      const beforeBytes = fs.readFileSync(ws.fullPath);
      const res = await undoSourceEdit(ws.relPath);
      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('This file changed after the visual edit'));
      assert.ok(res.error?.includes('/old.png'));
      assert.ok(res.error?.includes('/preview.png'));
      assert.deepStrictEqual(fs.readFileSync(ws.fullPath), beforeBytes);
    } finally {
      ws.cleanup();
    }
  });

  // --- Branch 5: non-className fallback refusal ---
  it('Branch 5: non-className fallback refusal when neither textContent nor imageSource', async () => {
    const currentContent = 'export function Comp() { return <div>Modified Structure</div>; }';
    const ws = createFixtureWorkspace(currentContent);
    try {
      ws.setupHistory({
        previewType: 'reorder',
        before: 'export function Comp() { return <div>Order A</div>; }',
        after: 'export function Comp() { return <div>Order B</div>; }',
        summary: 'Reorder siblings',
      });

      const beforeBytes = fs.readFileSync(ws.fullPath);
      const res = await undoSourceEdit(ws.relPath);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.error, 'This file changed after the visual edit. Nothing was overwritten; review the source before undoing.');
      assert.deepStrictEqual(fs.readFileSync(ws.fullPath), beforeBytes);
    } finally {
      ws.cleanup();
    }
  });

  // --- Branch 6: Existing-file parse failure ---
  it('Branch 6: existing-file parse failure refuses cleanly', async () => {
    const malformedContent = 'export function Comp() { return <div class=;;;';
    const ws = createFixtureWorkspace(malformedContent);
    try {
      ws.setupHistory({
        line: 1,
        addedTokens: ['p-4'],
        removedTokens: ['p-2'],
        before: 'export function Comp() { return <div className="p-2">Valid</div>; }',
        after: 'export function Comp() { return <div className="p-4">Valid</div>; }',
        summary: 'p-2 -> p-4',
      });

      const beforeBytes = fs.readFileSync(ws.fullPath);
      const res = await undoSourceEdit(ws.relPath);
      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('parse failure'));
      assert.deepStrictEqual(fs.readFileSync(ws.fullPath), beforeBytes);
    } finally {
      ws.cleanup();
    }
  });

  // --- Branch 7: Multiple candidate elements without unique id ---
  it('Branch 7: multiple candidate elements without unique id refuses ambiguity', async () => {
    const baseContent = `export function Comp() {
  return (
    <div>
      <span className="p-2 bg-blue-500">First</span>
      <span className="p-2 bg-blue-500">Second</span>
    </div>
  );
}`;
    const diskContent = baseContent + '\n// modified after edit';
    const ws = createFixtureWorkspace(diskContent);
    try {
      ws.setupHistory({
        line: 4,
        tagName: 'span',
        addedTokens: ['bg-blue-500'],
        removedTokens: ['bg-blue-400'],
        summary: 'bg-blue-400 -> bg-blue-500',
        before: baseContent.replace(/bg-blue-500/g, 'bg-blue-400'),
        after: baseContent,
      });

      const beforeBytes = fs.readFileSync(ws.fullPath);
      const res = await undoSourceEdit(ws.relPath);
      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('multiple matching elements found'));
      assert.deepStrictEqual(fs.readFileSync(ws.fullPath), beforeBytes);
    } finally {
      ws.cleanup();
    }
  });

  // --- Branch 8: Element inside loop ---
  it('Branch 8: element inside repeating list refuses', async () => {
    const baseContent = `export function Comp() {
  const items = [1, 2];
  return (
    <div>
      {items.map(item => (
        <span key={item} className="p-2 bg-blue-500">Item</span>
      ))}
    </div>
  );
}`;
    const diskContent = baseContent + '\n// modified after edit';
    const ws = createFixtureWorkspace(diskContent);
    try {
      ws.setupHistory({
        line: 6,
        tagName: 'span',
        addedTokens: ['bg-blue-500'],
        removedTokens: ['bg-blue-400'],
        summary: 'loop edit',
        before: baseContent.replace('bg-blue-500', 'bg-blue-400'),
        after: baseContent,
      });

      const beforeBytes = fs.readFileSync(ws.fullPath);
      const res = await undoSourceEdit(ws.relPath);
      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('element is inside a repeating list'));
      assert.deepStrictEqual(fs.readFileSync(ws.fullPath), beforeBytes);
    } finally {
      ws.cleanup();
    }
  });

  // --- Branch 9: Component used multiple times ---
  it('Branch 9: component used multiple times refuses', async () => {
    const baseContent = `function SubComp() {
  return <button className="p-2 bg-blue-500">Sub</button>;
}

export function Comp() {
  return (
    <div>
      <SubComp />
      <SubComp />
    </div>
  );
}`;
    const diskContent = baseContent + '\n// modified after edit';
    const ws = createFixtureWorkspace(diskContent);
    try {
      ws.setupHistory({
        line: 2,
        tagName: 'button',
        addedTokens: ['bg-blue-500'],
        removedTokens: ['bg-blue-400'],
        summary: 'multi component edit',
        before: baseContent.replace('bg-blue-500', 'bg-blue-400'),
        after: baseContent,
      });

      const beforeBytes = fs.readFileSync(ws.fullPath);
      const res = await undoSourceEdit(ws.relPath);
      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('element is in a component used in several places'));
      assert.deepStrictEqual(fs.readFileSync(ws.fullPath), beforeBytes);
    } finally {
      ws.cleanup();
    }
  });

  // --- Branch 10: Element inside conditional expression ---
  it('Branch 10: element inside conditional expression refuses', async () => {
    const baseContent = `export function Comp({ active }: { active: boolean }) {
  return (
    <div>
      {active ? <div className="p-2 bg-blue-500">Active</div> : <div>Inactive</div>}
    </div>
  );
}`;
    const diskContent = baseContent + '\n// modified after edit';
    const ws = createFixtureWorkspace(diskContent);
    try {
      ws.setupHistory({
        line: 4,
        tagName: 'div',
        addedTokens: ['bg-blue-500'],
        removedTokens: ['bg-blue-400'],
        summary: 'ternary edit',
        before: baseContent.replace('bg-blue-500', 'bg-blue-400'),
        after: baseContent,
      });

      const beforeBytes = fs.readFileSync(ws.fullPath);
      const res = await undoSourceEdit(ws.relPath);
      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('element is in a conditional expression'));
      assert.deepStrictEqual(fs.readFileSync(ws.fullPath), beforeBytes);
    } finally {
      ws.cleanup();
    }
  });

  // --- Branch 11: Inside if statement ---
  it('Branch 11: element inside an if statement refuses', async () => {
    const baseContent = `export function Comp({ flag }: { flag: boolean }) {
  if (flag) {
    return <div className="p-2 bg-blue-500">Flagged</div>;
  }
  return <div>Default</div>;
}`;
    const diskContent = baseContent + '\n// modified after edit';
    const ws = createFixtureWorkspace(diskContent);
    try {
      ws.setupHistory({
        line: 3,
        tagName: 'div',
        addedTokens: ['bg-blue-500'],
        removedTokens: ['bg-blue-400'],
        summary: 'if edit',
        before: baseContent.replace('bg-blue-500', 'bg-blue-400'),
        after: baseContent,
      });

      const beforeBytes = fs.readFileSync(ws.fullPath);
      const res = await undoSourceEdit(ws.relPath);
      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('element is in a conditional statement'));
      assert.deepStrictEqual(fs.readFileSync(ws.fullPath), beforeBytes);
    } finally {
      ws.cleanup();
    }
  });

  // --- Branch 12: Same-line sibling ambiguity ---
  it('Branch 12: same-line sibling ambiguity refuses', async () => {
    const baseContent = `export function Comp() {
  return <div><span className="p-2 bg-blue-500">Left</span><span className="p-2">Right</span></div>;
}`;
    const diskContent = baseContent + '\n// modified after edit';
    const ws = createFixtureWorkspace(diskContent);
    try {
      ws.setupHistory({
        line: 2,
        tagName: 'span',
        addedTokens: ['bg-blue-500'],
        removedTokens: ['bg-blue-400'],
        summary: 'same line sibling edit',
        before: baseContent.replace('bg-blue-500', 'bg-blue-400'),
        after: baseContent,
      });

      const beforeBytes = fs.readFileSync(ws.fullPath);
      const res = await undoSourceEdit(ws.relPath);
      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('same-line sibling ambiguity'));
      assert.deepStrictEqual(fs.readFileSync(ws.fullPath), beforeBytes);
    } finally {
      ws.cleanup();
    }
  });

  // --- Branch 13: className attribute missing ---
  it('Branch 13: className attribute missing refuses', async () => {
    const baseContent = `export function Comp() {
  return (
    <div>
      <button id="btn-no-class">Click</button>
    </div>
  );
}`;
    const diskContent = baseContent + '\n// modified after edit';
    const ws = createFixtureWorkspace(diskContent);
    try {
      ws.setupHistory({
        line: 4,
        elementId: 'btn-no-class',
        addedTokens: ['p-2'],
        removedTokens: ['p-1'],
        summary: 'missing className edit',
        before: baseContent,
        after: baseContent,
      });

      const beforeBytes = fs.readFileSync(ws.fullPath);
      const res = await undoSourceEdit(ws.relPath);
      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('className attribute missing'));
      assert.deepStrictEqual(fs.readFileSync(ws.fullPath), beforeBytes);
    } finally {
      ws.cleanup();
    }
  });

  // --- Branch 14: Dynamic or template-literal className ---
  it('Branch 14: dynamic or template-literal className refuses', async () => {
    const baseContent = `export function Comp() {
  const dynamicClass = 'active';
  return (
    <div>
      <button id="btn-dynamic" className={\`p-2 \${dynamicClass}\`}>Click</button>
    </div>
  );
}`;
    const diskContent = baseContent + '\n// modified after edit';
    const ws = createFixtureWorkspace(diskContent);
    try {
      ws.setupHistory({
        line: 5,
        elementId: 'btn-dynamic',
        addedTokens: ['p-2'],
        removedTokens: ['p-1'],
        summary: 'dynamic className edit',
        before: baseContent,
        after: baseContent,
      });

      const beforeBytes = fs.readFileSync(ws.fullPath);
      const res = await undoSourceEdit(ws.relPath);
      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('className is dynamic and cannot be edited safely'));
      assert.deepStrictEqual(fs.readFileSync(ws.fullPath), beforeBytes);
    } finally {
      ws.cleanup();
    }
  });

  // --- Branch 15: Re-parse failure after substitution ---
  it('Branch 15: re-parse failure after substitution refuses', async () => {
    const baseContent = `export function Comp() {
  return (
    <div>
      <h1 id="heading-reparse" className="p-2 bg-blue-500">Heading</h1>
    </div>
  );
}`;
    const diskContent = baseContent + '\n// modified after edit';
    const ws = createFixtureWorkspace(diskContent);
    try {
      ws.setupHistory({
        line: 4,
        elementId: 'heading-reparse',
        tagName: 'h1',
        addedTokens: ['bg-blue-500'],
        removedTokens: ['bg-blue-400" > </invalid>'],
        summary: 'reparse break',
        before: baseContent,
        after: baseContent,
      });

      const beforeBytes = fs.readFileSync(ws.fullPath);
      const res = await undoSourceEdit(ws.relPath);
      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('re-parse verification failed') || res.error?.includes('This file changed after the visual edit'));
      assert.deepStrictEqual(fs.readFileSync(ws.fullPath), beforeBytes);
    } finally {
      ws.cleanup();
    }
  });

  // --- Branch 16: atomicWrite I/O error leaving status back at applied ---
  it('Branch 16: atomicWrite I/O error resets status to applied', async () => {
    const originalContent = 'export function Comp() { return <div>Original</div>; }';
    const editedContent = 'export function Comp() { return <div>Edited</div>; }';
    const ws = createFixtureWorkspace(editedContent);
    try {
      ws.setupHistory({
        status: 'applied',
        before: originalContent,
        after: editedContent,
        summary: 'io error test',
      });

      // Make file read-only on Windows / POSIX to trigger I/O write error
      fs.chmodSync(ws.fullPath, 0o444);

      let threw = false;
      try {
        await undoSourceEdit(ws.relPath);
      } catch (err: any) {
        threw = true;
      }

      assert.ok(threw, 'atomicWrite should fail and throw error on read-only file');

      // Check status was reverted to applied in catch block
      const records = readHistory();
      assert.strictEqual(records[0].status, 'applied', 'Status must be reverted back to applied');
    } finally {
      try { fs.chmodSync(ws.fullPath, 0o666); } catch {}
      ws.cleanup();
    }
  });
});
