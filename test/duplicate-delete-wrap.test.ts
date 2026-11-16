import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { duplicateElement, deleteElement, wrapElement, updateStaticTailwindClass } from '../lib/slightnudge/ast-nudger';

const scratchDir = path.resolve('scratch-test-duplicate-delete');
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING MASTER VISUAL STUDIO FRAMER/FIGMA UPGRADE TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function test(condition: boolean, name: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name}`);
      throw new Error(`Test failed: ${name}`);
    }
  }

  // TEST 1: Duplicate element
  const file1 = path.join(scratchDir, 'dup-test.tsx');
  const source1 = `export default function Page() {
  return (
    <div className="container">
      <h1 id="title" className="text-3xl font-bold">Hello World</h1>
      <p className="text-slate-600">Paragraph one</p>
    </div>
  );
}`;
  fs.writeFileSync(file1, source1, 'utf8');

  const dupRes = duplicateElement({
    filePath: file1,
    line: 4,
    tagName: 'h1',
    dryRun: false,
  });

  test(dupRes.success === true, 'Duplicate element succeeds');
  const updated1 = fs.readFileSync(file1, 'utf8');
  test(updated1.includes('<h1 id="title-copy" className="text-3xl font-bold">Hello World</h1>'), 'Duplicate element clones node with deduplicated id');
  test(updated1.indexOf('<h1 id="title"') < updated1.indexOf('<h1 id="title-copy"'), 'Clone is inserted immediately after original node');

  // TEST 2: Duplicate refusal on loop
  const loopFile = path.join(scratchDir, 'loop-test.tsx');
  const loopSource = `export default function Page() {
  const items = [1, 2, 3];
  return (
    <div>
      {items.map(item => (
        <span key={item} className="item">{item}</span>
      ))}
    </div>
  );
}`;
  fs.writeFileSync(loopFile, loopSource, 'utf8');

  const loopRes = duplicateElement({
    filePath: loopFile,
    line: 6,
    tagName: 'span',
    dryRun: true,
  });
  test(loopRes.success === false && loopRes.refusedSafely === true, 'Duplicate safely refuses elements repeating in loop');

  // TEST 3: Duplicate refusal on component root
  const rootFile = path.join(scratchDir, 'root-test.tsx');
  const rootSource = `export default function Root() {
  return <main className="root">Content</main>;
}`;
  fs.writeFileSync(rootFile, rootSource, 'utf8');

  const rootRes = duplicateElement({
    filePath: rootFile,
    line: 2,
    tagName: 'main',
    dryRun: true,
  });
  test(rootRes.success === false && rootRes.refusedSafely === true, 'Duplicate safely refuses component root element');

  // TEST 4: Delete element cleanly
  const fileDelete = path.join(scratchDir, 'delete-test.tsx');
  const sourceDelete = `export default function Card() {
  return (
    <div className="card">
      <h2 className="title">Card Title</h2>
      <p className="description">Removable paragraph</p>
      <button className="btn">Click me</button>
    </div>
  );
}`;
  fs.writeFileSync(fileDelete, sourceDelete, 'utf8');

  const delRes = deleteElement({
    filePath: fileDelete,
    line: 5,
    tagName: 'p',
    dryRun: false,
  });

  test(delRes.success === true, 'Delete element succeeds');
  const updatedDel = fs.readFileSync(fileDelete, 'utf8');
  test(!updatedDel.includes('Removable paragraph'), 'Paragraph is deleted');
  test(updatedDel.includes('<h2 className="title">Card Title</h2>'), 'Preceding element is preserved');
  test(updatedDel.includes('<button className="btn">Click me</button>'), 'Subsequent element is preserved');

  // TEST 5: Delete refusal on loop
  const delLoopRes = deleteElement({
    filePath: loopFile,
    line: 6,
    tagName: 'span',
    dryRun: true,
  });
  test(delLoopRes.success === false && delLoopRes.refusedSafely === true, 'Delete safely refuses elements repeating in loop');

  // TEST 6: Wrap element in container (Cmd+G / Group)
  const fileWrap = path.join(scratchDir, 'wrap-test.tsx');
  const sourceWrap = `export default function Layout() {
  return (
    <div className="page">
      <h1 className="hero">Hero Title</h1>
    </div>
  );
}`;
  fs.writeFileSync(fileWrap, sourceWrap, 'utf8');

  const wrapRes = wrapElement({
    filePath: fileWrap,
    line: 4,
    tagName: 'h1',
    containerTag: 'div',
    containerClassName: 'flex flex-col gap-4',
    dryRun: false,
  });

  test(wrapRes.success === true, 'Wrap element succeeds');
  const updatedWrap = fs.readFileSync(fileWrap, 'utf8');
  test(updatedWrap.includes('<div className="flex flex-col gap-4">'), 'Container wrapper inserted');
  test(updatedWrap.includes('<h1 className="hero">Hero Title</h1>'), 'Target element wrapped inside container');

  // TEST 7: State Variants: dark mode, hover, focus
  const fileState = path.join(scratchDir, 'state-test.tsx');
  const sourceState = `export default function Button() {
  return (
    <button className="bg-slate-900 text-white font-semibold">
      Action
    </button>
  );
}`;
  fs.writeFileSync(fileState, sourceState, 'utf8');

  const hoverRes = updateStaticTailwindClass({
    filePath: fileState,
    line: 3,
    property: 'backgroundColor',
    value: 'bg-emerald-600',
    breakpoint: 'hover',
    dryRun: false,
  });
  test(hoverRes.success === true, 'State variant hover: applies');
  test(fs.readFileSync(fileState, 'utf8').includes('hover:bg-emerald-600'), 'hover:bg-emerald-600 in source');

  const darkRes = updateStaticTailwindClass({
    filePath: fileState,
    line: 3,
    property: 'backgroundColor',
    value: 'bg-slate-800',
    breakpoint: 'dark',
    dryRun: false,
  });
  test(darkRes.success === true, 'State variant dark: applies');
  test(fs.readFileSync(fileState, 'utf8').includes('dark:bg-slate-800'), 'dark:bg-slate-800 in source');

  console.log(`\n🎉 All ${passed}/${total} Master Visual Studio Framer/Figma upgrade tests passed!\n`);
}

runTests();
