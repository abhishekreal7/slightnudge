import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { setupIsolatedEnv } from './helpers/test-server';
import {
  recordSourceEdit,
  undoSourceEdit,
  readHistory,
  atomicWrite,
} from '../lib/slightnudge/edit-history';

console.log('🧪 RUNNING TOKEN-LEVEL UNDO TEST SUITE');

const isolated = setupIsolatedEnv('token-undo-test');
const wsDir = isolated.wsDir;

try {
  // Test helper to setup a fresh test file in an isolated scratch folder
  const testDir = path.join(wsDir, 'scratch-token-undo');
  fs.mkdirSync(testDir, { recursive: true });

  function resetHistory() {
    fs.writeFileSync(isolated.editsPath, '[]', 'utf8');
  }

  // --------------------------------------------------------------------------
  // (j) Exact-match case still restores byte for byte
  // --------------------------------------------------------------------------
  console.log('--- Test (j): Exact-match restores byte-for-byte ---');
  resetHistory();
  const fileJ = path.join(testDir, 'file-j.tsx');
  const beforeJ = `export default function PageJ() {\n  return <div className="text-sm">Hello</div>;\n}\n`;
  const afterJ = `export default function PageJ() {\n  return <div className="text-lg">Hello</div>;\n}\n`;
  fs.writeFileSync(fileJ, afterJ, 'utf8');
  const relJ = path.relative(wsDir, fileJ);
  recordSourceEdit(fileJ, beforeJ, afterJ, 'text-sm -> text-lg');

  const resJ = undoSourceEdit(relJ);
  assert.strictEqual(resJ.success, true, 'Exact match undo must succeed');
  assert.strictEqual(fs.readFileSync(fileJ, 'utf8'), beforeJ, 'Exact match must restore before-state byte-for-byte');
  console.log('  ✅ [PASS] (j) Exact match restores byte for byte');

  // --------------------------------------------------------------------------
  // (a) File reformatted by Prettier after the edit, then undo:
  // only the changed token is reverted, formatting stays
  // --------------------------------------------------------------------------
  console.log('--- Test (a): Prettier reformat preserved on undo ---');
  resetHistory();
  const fileA = path.join(testDir, 'file-a.tsx');
  const beforeA = `export default function PageA() {\n  return <div id="target-a" className="btn px-2 py-1">Click</div>;\n}\n`;
  const afterA = `export default function PageA() {\n  return <div id="target-a" className="btn px-4 py-1">Click</div>;\n}\n`;
  fs.writeFileSync(fileA, afterA, 'utf8');
  const relA = path.relative(wsDir, fileA);
  recordSourceEdit(fileA, beforeA, afterA, 'px-2 -> px-4');

  // Prettier reformat: multi-line layout with different indentation
  const prettierA = `export default function PageA() {\n  return (\n    <div\n      id="target-a"\n      className="btn px-4 py-1"\n    >\n      Click\n    </div>\n  );\n}\n`;
  fs.writeFileSync(fileA, prettierA, 'utf8');

  const resA = undoSourceEdit(relA);
  assert.strictEqual(resA.success, true, 'Prettier reformatted undo must succeed');
  const currentA = fs.readFileSync(fileA, 'utf8');
  assert.ok(currentA.includes('px-2'), 'Should revert px-4 to px-2');
  assert.ok(!currentA.includes('px-4'), 'px-4 should be removed');
  assert.ok(currentA.includes('<div\n      id="target-a"'), 'Multi-line Prettier formatting must stay intact');
  console.log('  ✅ [PASS] (a) Prettier reformat preserved on undo');

  // --------------------------------------------------------------------------
  // (b) User edited an unrelated part of the file: undo reverts token, keeps edit
  // --------------------------------------------------------------------------
  console.log('--- Test (b): Unrelated file edit preserved ---');
  resetHistory();
  const fileB = path.join(testDir, 'file-b.tsx');
  const beforeB = `export default function PageB() {\n  return <div id="target-b" className="text-sm">Content</div>;\n}\n`;
  const afterB = `export default function PageB() {\n  return <div id="target-b" className="text-lg">Content</div>;\n}\n`;
  fs.writeFileSync(fileB, afterB, 'utf8');
  const relB = path.relative(wsDir, fileB);
  recordSourceEdit(fileB, beforeB, afterB, 'text-sm -> text-lg');

  // User edits top and bottom of file
  const editedB = `// Header comment added by user\nexport default function PageB() {\n  return (\n    <div>\n      <div id="target-b" className="text-lg">Content</div>\n      <footer>Footer added by user</footer>\n    </div>\n  );\n}\n`;
  fs.writeFileSync(fileB, editedB, 'utf8');

  const resB = undoSourceEdit(relB);
  assert.strictEqual(resB.success, true, 'Unrelated edit undo must succeed');
  const currentB = fs.readFileSync(fileB, 'utf8');
  assert.ok(currentB.includes('text-sm'), 'Reverts token to text-sm');
  assert.ok(!currentB.includes('text-lg'), 'Removes text-lg');
  assert.ok(currentB.includes('Header comment added by user'), 'Preserves user header comment');
  assert.ok(currentB.includes('Footer added by user'), 'Preserves user footer');
  console.log('  ✅ [PASS] (b) Unrelated file edit preserved');

  // --------------------------------------------------------------------------
  // (c) User edited another class on the same element:
  // undo reverts only our token and keeps theirs
  // --------------------------------------------------------------------------
  console.log('--- Test (c): Other classes on same element preserved ---');
  resetHistory();
  const fileC = path.join(testDir, 'file-c.tsx');
  const beforeC = `export default function PageC() {\n  return <button id="target-c" className="btn font-bold">Button</button>;\n}\n`;
  const afterC = `export default function PageC() {\n  return <button id="target-c" className="btn font-normal">Button</button>;\n}\n`;
  fs.writeFileSync(fileC, afterC, 'utf8');
  const relC = path.relative(wsDir, fileC);
  recordSourceEdit(fileC, beforeC, afterC, 'font-bold -> font-normal');

  // User adds bg-blue-500 and rounded to the same element
  const editedC = `export default function PageC() {\n  return <button id="target-c" className="btn font-normal bg-blue-500 rounded">Button</button>;\n}\n`;
  fs.writeFileSync(fileC, editedC, 'utf8');

  const resC = undoSourceEdit(relC);
  assert.strictEqual(resC.success, true, 'Undo with added classes must succeed');
  const currentC = fs.readFileSync(fileC, 'utf8');
  assert.ok(currentC.includes('font-bold'), 'Reverts font-normal to font-bold');
  assert.ok(!currentC.includes('font-normal'), 'Removes font-normal');
  assert.ok(currentC.includes('bg-blue-500'), 'Keeps user added bg-blue-500');
  assert.ok(currentC.includes('rounded'), 'Keeps user added rounded');
  console.log('  ✅ [PASS] (c) Other classes on same element preserved');

  // --------------------------------------------------------------------------
  // (d) User changed the same token themselves: refuse with manual instructions,
  // file unchanged
  // --------------------------------------------------------------------------
  console.log('--- Test (d): User changed same token -> refuse with manual instructions ---');
  resetHistory();
  const fileD = path.join(testDir, 'file-d.tsx');
  const beforeD = `export default function PageD() {\n  return <span id="target-d" className="text-red-500">Alert</span>;\n}\n`;
  const afterD = `export default function PageD() {\n  return <span id="target-d" className="text-blue-500">Alert</span>;\n}\n`;
  fs.writeFileSync(fileD, afterD, 'utf8');
  const relD = path.relative(wsDir, fileD);
  recordSourceEdit(fileD, beforeD, afterD, 'text-red-500 -> text-blue-500');

  // User replaced text-blue-500 with text-emerald-500
  const userChangedD = `export default function PageD() {\n  return <span id="target-d" className="text-emerald-500">Alert</span>;\n}\n`;
  fs.writeFileSync(fileD, userChangedD, 'utf8');

  const resD = undoSourceEdit(relD);
  assert.strictEqual(resD.success, false, 'Must refuse when user changed the token');
  assert.strictEqual(fs.readFileSync(fileD, 'utf8'), userChangedD, 'File must remain 100% unchanged on refusal');
  // Check (l) details on refusal text
  assert.ok(resD.error.includes(relD) || resD.error.includes(path.basename(fileD)), 'Refusal must contain file path');
  assert.ok(resD.error.includes('text-blue-500'), 'Refusal must mention token to remove');
  assert.ok(resD.error.includes('text-red-500'), 'Refusal must mention token to restore');
  assert.ok(resD.error.includes('Nothing was changed'), 'Refusal must state nothing was changed');
  console.log('  ✅ [PASS] (d) User changed same token refused with instructions');

  // --------------------------------------------------------------------------
  // (e) Element deleted: refuse
  // --------------------------------------------------------------------------
  console.log('--- Test (e): Element deleted -> refuse ---');
  resetHistory();
  const fileE = path.join(testDir, 'file-e.tsx');
  const beforeE = `export default function PageE() {\n  return <div><span id="target-e" className="p-2">Deleted</span></div>;\n}\n`;
  const afterE = `export default function PageE() {\n  return <div><span id="target-e" className="p-4">Deleted</span></div>;\n}\n`;
  fs.writeFileSync(fileE, afterE, 'utf8');
  const relE = path.relative(wsDir, fileE);
  recordSourceEdit(fileE, beforeE, afterE, 'p-2 -> p-4');

  // Element deleted entirely
  const deletedE = `export default function PageE() {\n  return <div>Empty</div>;\n}\n`;
  fs.writeFileSync(fileE, deletedE, 'utf8');

  const resE = undoSourceEdit(relE);
  assert.strictEqual(resE.success, false, 'Must refuse when element is deleted');
  assert.strictEqual(fs.readFileSync(fileE, 'utf8'), deletedE, 'File unchanged on refusal');
  console.log('  ✅ [PASS] (e) Element deleted refused');

  // --------------------------------------------------------------------------
  // (f) Two identical elements where uniqueness cannot be established: refuse
  // --------------------------------------------------------------------------
  console.log('--- Test (f): Two identical elements ambiguous -> refuse ---');
  resetHistory();
  const fileF = path.join(testDir, 'file-f.tsx');
  const beforeF = `export default function PageF() {\n  return (\n    <div>\n      <span className="badge p-1">One</span>\n      <span className="badge p-1">Two</span>\n    </div>\n  );\n}\n`;
  const afterF = `export default function PageF() {\n  return (\n    <div>\n      <span className="badge p-3">One</span>\n      <span className="badge p-1">Two</span>\n    </div>\n  );\n}\n`;
  fs.writeFileSync(fileF, afterF, 'utf8');
  const relF = path.relative(wsDir, fileF);
  recordSourceEdit(fileF, beforeF, afterF, 'p-1 -> p-3');

  // Both elements now have badge p-3 and no IDs, so uniqueness cannot be established
  const ambiguousF = `export default function PageF() {\n  return (\n    <div>\n      <span className="badge p-3">One</span>\n      <span className="badge p-3">Two</span>\n    </div>\n  );\n}\n`;
  fs.writeFileSync(fileF, ambiguousF, 'utf8');

  const resF = undoSourceEdit(relF);
  assert.strictEqual(resF.success, false, 'Must refuse when element candidate is ambiguous');
  assert.strictEqual(fs.readFileSync(fileF, 'utf8'), ambiguousF, 'File unchanged on ambiguous match');
  console.log('  ✅ [PASS] (f) Two identical elements ambiguous refused');

  // --------------------------------------------------------------------------
  // (g) File deleted: clear error
  // --------------------------------------------------------------------------
  console.log('--- Test (g): File deleted -> clear error ---');
  resetHistory();
  const fileG = path.join(testDir, 'file-g.tsx');
  const beforeG = `export default function PageG() { return <div className="a">A</div>; }`;
  const afterG = `export default function PageG() { return <div className="b">B</div>; }`;
  fs.writeFileSync(fileG, afterG, 'utf8');
  const relG = path.relative(wsDir, fileG);
  recordSourceEdit(fileG, beforeG, afterG, 'a -> b');
  fs.unlinkSync(fileG);

  const resG = undoSourceEdit(relG);
  assert.strictEqual(resG.success, false);
  assert.strictEqual(resG.error, 'That file no longer exists.');
  console.log('  ✅ [PASS] (g) File deleted returned clear error');

  // --------------------------------------------------------------------------
  // (h) Stacked edits on one element: older undo refused, newest undo works
  // --------------------------------------------------------------------------
  console.log('--- Test (h): Stacked edits on one element ---');
  resetHistory();
  const fileH = path.join(testDir, 'file-h.tsx');
  const v0 = `export default function PageH() {\n  return <h1 id="target-h" className="text-sm">H</h1>;\n}\n`;
  const v1 = `export default function PageH() {\n  return <h1 id="target-h" className="text-md">H</h1>;\n}\n`;
  const v2 = `export default function PageH() {\n  return <h1 id="target-h" className="text-lg">H</h1>;\n}\n`;
  fs.writeFileSync(fileH, v2, 'utf8');
  const relH = path.relative(wsDir, fileH);
  const rec1 = recordSourceEdit(fileH, v0, v1, 'text-sm -> text-md');
  const rec2 = recordSourceEdit(fileH, v1, v2, 'text-md -> text-lg');

  // Attempting to undo older edit rec1 while rec2 is active on top must be refused
  const resH1 = undoSourceEdit({ filePath: relH, editId: rec1.editId });
  assert.strictEqual(resH1.success, false, 'Undoing older edit when newer edit is on top must be refused');
  assert.ok(resH1.error.includes('newer edit') || resH1.error.includes('depends on it'), 'Refusal must mention newer edit');

  // Undoing newest edit rec2 works
  const resH2 = undoSourceEdit({ filePath: relH, editId: rec2.editId });
  assert.strictEqual(resH2.success, true, 'Undoing newest edit must succeed');
  assert.ok(fs.readFileSync(fileH, 'utf8').includes('text-md'), 'File should now have text-md');

  // Now undoing rec1 works
  const resH3 = undoSourceEdit({ filePath: relH, editId: rec1.editId });
  assert.strictEqual(resH3.success, true, 'Undoing older edit after newer edit is undone must succeed');
  assert.ok(fs.readFileSync(fileH, 'utf8').includes('text-sm'), 'File should now have original text-sm');
  console.log('  ✅ [PASS] (h) Stacked edits on one element verified');

  // --------------------------------------------------------------------------
  // (i) Path escaping project root still refused
  // --------------------------------------------------------------------------
  console.log('--- Test (i): Path escaping project root refused ---');
  const resI = undoSourceEdit('../../escape.tsx');
  assert.strictEqual(resI.success, false, 'Escaping project root must be refused');
  console.log('  ✅ [PASS] (i) Path escaping project root refused');

  // --------------------------------------------------------------------------
  // (k) Atomic write failure during undo leaves file unchanged and no temp file
  // --------------------------------------------------------------------------
  console.log('--- Test (k): Atomic write failure leaves file unchanged and clean ---');
  resetHistory();
  const fileK = path.join(testDir, 'file-k.tsx');
  const beforeK = `export default function PageK() {\n  return <div id="target-k" className="p-1">K</div>;\n}\n`;
  const afterK = `export default function PageK() {\n  return <div id="target-k" className="p-2">K</div>;\n}\n`;
  fs.writeFileSync(fileK, afterK, 'utf8');
  const relK = path.relative(wsDir, fileK);
  recordSourceEdit(fileK, beforeK, afterK, 'p-1 -> p-2');

  // Modify file slightly (e.g. comment) so it goes through token-level undo
  const editedK = `// comment\nexport default function PageK() {\n  return <div id="target-k" className="p-2">K</div>;\n}\n`;
  fs.writeFileSync(fileK, editedK, 'utf8');

  // Mock renameSync to fail temporarily
  const origRename = fs.renameSync;
  let renameFailed = false;
  (fs as any).renameSync = function() {
    renameFailed = true;
    const err: any = new Error('EACCES: permission denied, rename');
    err.code = 'EACCES';
    throw err;
  };

  try {
    const resK = undoSourceEdit(relK);
    assert.strictEqual(resK.success, false, 'Undo must fail when write fails');
  } catch (err: any) {
    assert.ok(err.message.includes('locked') || err.message.includes('permission') || err.message.includes('failed'), 'Expected locked error');
  } finally {
    fs.renameSync = origRename;
  }

  assert.strictEqual(fs.readFileSync(fileK, 'utf8'), editedK, 'File must remain unchanged when write fails');
  const tempFilesK = fs.readdirSync(testDir).filter(f => f.startsWith('file-k.tsx.') && f.endsWith('.tmp'));
  assert.strictEqual(tempFilesK.length, 0, 'No temp files should be left behind on failed rename');
  console.log('  ✅ [PASS] (k) Atomic write failure leaves file unchanged and clean');

  // Cleanup testDir
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch {}

  console.log('\n🎉 ALL 12 TOKEN-LEVEL UNDO TESTS PASSED!\n');
} finally {
  isolated.cleanup();
}
