import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { createPendingSourceEdit, applyPendingSourceEdit, discardPendingSourceEdit } from '../lib/slightnudge/edit-history';

describe('S5: Verify Tailwind compilation and AST parse before write', () => {
  const scratchDir = path.join(process.cwd(), 'scratch');

  before(() => {
    fs.mkdirSync(scratchDir, { recursive: true });
  });

  it('refuses applying an edit with a bogus non-compiling class and leaves file unchanged', async () => {
    const targetFile = path.join(scratchDir, 's5-bogus.tsx');
    const initialContent = 'export default function Page() {\n  return <div className="p-4">Content</div>;\n}\n';
    fs.writeFileSync(targetFile, initialContent, 'utf8');

    const bogusClass = 'bg-nonexistent-999';
    const pending = createPendingSourceEdit({
      filePath: targetFile,
      before: initialContent,
      after: `export default function Page() {\n  return <div className="p-4 ${bogusClass}">Content</div>;\n}\n`,
      summary: 'Add bogus class',
      oldValue: 'p-4',
      newValue: `p-4 ${bogusClass}`,
      previewType: 'className'
    });
    assert.strictEqual(pending.changed, true);

    try {
      const res = await applyPendingSourceEdit(pending.id);

      // S5 requirement: API must refuse applying bogus class
      assert.strictEqual(res.success, false, 'Applying a bogus class MUST fail');
      assert.match((res as any).error, /can't verify this class/i, 'Error message must state can\'t verify this class');

      const diskCode = fs.readFileSync(targetFile, 'utf8');
      assert.strictEqual(diskCode, initialContent, 'File on disk MUST remain unchanged');
    } finally {
      try { discardPendingSourceEdit(pending.id); } catch {}
      try { fs.unlinkSync(targetFile); } catch {}
    }
  });

  it('accepts valid classes, stacked variant (dark:hover:bg-blue-500), and arbitrary value (w-[37px])', async () => {
    const targetFile = path.join(scratchDir, 's5-valid-classes.tsx');
    const initialContent = 'export default function Page() {\n  return <div className="p-4">Content</div>;\n}\n';
    const updatedContent = 'export default function Page() {\n  return <div className="p-4 font-bold dark:hover:bg-blue-500 w-[37px]">Content</div>;\n}\n';
    fs.writeFileSync(targetFile, initialContent, 'utf8');

    const pending = createPendingSourceEdit({
      filePath: targetFile,
      before: initialContent,
      after: updatedContent,
      summary: 'Add valid classes with stacked variant and arbitrary value',
      oldValue: 'p-4',
      newValue: 'p-4 font-bold dark:hover:bg-blue-500 w-[37px]',
      previewType: 'className'
    });
    assert.strictEqual(pending.changed, true);

    try {
      const res = await applyPendingSourceEdit(pending.id);
      assert.strictEqual(res.success, true, `Applying valid Tailwind classes must succeed: ${(res as any).error}`);

      const diskCode = fs.readFileSync(targetFile, 'utf8');
      assert.strictEqual(diskCode, updatedContent, 'File on disk must match updated content');
    } finally {
      try { discardPendingSourceEdit(pending.id); } catch {}
      try {
        const editsFile = path.join(process.cwd(), '.slightnudge', 'history', 'edits.json');
        if (fs.existsSync(editsFile)) {
          const raw = fs.readFileSync(editsFile, 'utf8');
          const records = JSON.parse(raw).filter((r: any) => !r.filePath.includes('s5-valid-classes'));
          fs.writeFileSync(editsFile, JSON.stringify(records, null, 2), 'utf8');
        }
      } catch {}
      try { fs.unlinkSync(targetFile); } catch {}
    }
  });

  it('refuses content that would break the AST parse and leaves file unchanged', async () => {
    const targetFile = path.join(scratchDir, 's5-broken-parse.tsx');
    const initialContent = 'export default function Page() {\n  return <div className="p-4">Content</div>;\n}\n';
    const brokenContent = 'export default function Page() {\n  return <div className="p-4">Content;\n}\n'; // missing closing tag </div
    fs.writeFileSync(targetFile, initialContent, 'utf8');

    const pending = createPendingSourceEdit({
      filePath: targetFile,
      before: initialContent,
      after: brokenContent,
      summary: 'Break parse syntax',
      oldValue: 'p-4',
      newValue: 'p-4',
      previewType: 'className'
    });
    assert.strictEqual(pending.changed, true);

    try {
      const res = await applyPendingSourceEdit(pending.id);
      assert.strictEqual(res.success, false, 'Applying broken syntax MUST fail');
      assert.match((res as any).error, /parse failed|syntax error/i, 'Error must explain parse failure');

      const diskCode = fs.readFileSync(targetFile, 'utf8');
      assert.strictEqual(diskCode, initialContent, 'File on disk MUST remain unchanged when parse fails');
    } finally {
      try { discardPendingSourceEdit(pending.id); } catch {}
      try { fs.unlinkSync(targetFile); } catch {}
    }
  });
});
