import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { reorderElement } from '../lib/slightnudge/ast-nudger';
import { POST as previewHandler } from '../app/api/slightnudge/preview/route';

const scratchDir = path.resolve('scratch-test-fixtures');
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING REORDER SAFETY & SAME-LINE RESOLUTION TESTS');
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

  // --------------------------------------------------------------------------
  // ITEM 1: Same-line element resolution with shared class
  // --------------------------------------------------------------------------
  console.log('--- 1. Same-line Element Resolution (Column + Tag Name) ---');
  const sameLineFixture = path.join(scratchDir, 'same-line.tsx');
  const sameLineContent = `export default function TestPage() {
  return (
    <div>
      <button className="btn shared">First</button><button className="btn shared">Second</button>
      <p id="bottom">Bottom</p>
    </div>
  );
}
`;
  fs.writeFileSync(sameLineFixture, sameLineContent, 'utf-8');

  // Line 4 has two buttons: First button is col 7, Second button is col 52
  // 1a: Attempt resolution WITHOUT column -> MUST REFUSE, never guess
  const noColResult = reorderElement({
    filePath: sameLineFixture,
    line: 4,
    tagName: 'button',
    className: 'btn shared',
    direction: 'later',
    dryRun: true,
  });
  test(noColResult.success === false, 'Same-line without column does not succeed');
  test(noColResult.refusedSafely === true, 'Same-line without column refuses safely');
  test(
    noColResult.reason === "I can't tell which element on this line you mean. Nothing was changed.",
    'Refusal exact message: "I can\'t tell which element on this line you mean. Nothing was changed."'
  );

  // 1b: Attempt resolution with exact column for First button (col 7) -> targets First button
  const firstColResult = reorderElement({
    filePath: sameLineFixture,
    line: 4,
    column: 7,
    tagName: 'button',
    direction: 'later',
    dryRun: true,
  });
  test(firstColResult.success === true, 'Targets First button using col 7 + tagName');
  test(
    firstColResult.updatedSource?.includes(
      '<button className="btn shared">Second</button><button className="btn shared">First</button>'
    ) === true,
    'First button correctly swapped later'
  );

  // 1c: Attempt resolution with exact column for Second button (col 52) -> targets Second button
  const secondColResult = reorderElement({
    filePath: sameLineFixture,
    line: 4,
    column: 52,
    tagName: 'button',
    direction: 'earlier',
    dryRun: true,
  });
  test(secondColResult.success === true, 'Targets Second button using col 52 + tagName');
  test(
    secondColResult.updatedSource?.includes(
      '<button className="btn shared">Second</button><button className="btn shared">First</button>'
    ) === true,
    'Second button correctly swapped earlier'
  );

  // 1d: Attempt with non-matching column -> MUST REFUSE
  const wrongColResult = reorderElement({
    filePath: sameLineFixture,
    line: 4,
    column: 25,
    tagName: 'button',
    direction: 'later',
    dryRun: true,
  });
  test(wrongColResult.success === false, 'Non-matching column refuses');
  test(
    wrongColResult.reason === "I can't tell which element on this line you mean. Nothing was changed.",
    'Non-matching column returns exact refusal message'
  );

  // --------------------------------------------------------------------------
  // ITEM 2: Multi-slot reorder safety & pure permutation
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Multi-slot Reorder Safety (Loops, Conditionals, Permutation) ---');

  // 2a: map() list in between
  const mapFixture = path.join(scratchDir, 'map-between.tsx');
  const mapContent = `export default function MapPage() {
  const items = ['a', 'b', 'c'];
  return (
    <div>
      <h1 id="start">Heading</h1>
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
      <button id="end">Submit</button>
    </div>
  );
}
`;
  fs.writeFileSync(mapFixture, mapContent, 'utf-8');

  const mapReorder = reorderElement({
    filePath: mapFixture,
    elementId: 'start',
    targetIndex: 2,
    dryRun: true,
  });
  test(mapReorder.success === false, 'Reorder across map() list refused');
  test(mapReorder.refusedSafely === true, 'map() list refused safely');

  // 2b: Conditional child in between
  const condFixture = path.join(scratchDir, 'cond-between.tsx');
  const condContent = `export default function CondPage() {
  const showExtra = true;
  return (
    <div>
      <h1 id="start">Heading</h1>
      {showExtra && <div className="banner">Banner</div>}
      <button id="end">Submit</button>
    </div>
  );
}
`;
  fs.writeFileSync(condFixture, condContent, 'utf-8');

  const condReorder = reorderElement({
    filePath: condFixture,
    elementId: 'start',
    targetIndex: 2,
    dryRun: true,
  });
  test(condReorder.success === false, 'Reorder across conditional element refused');
  test(condReorder.refusedSafely === true, 'Conditional element refused safely');

  // 2c: Pure permutation test (unchanged siblings' bytes identical, comments & whitespace preserved)
  const permFixture = path.join(scratchDir, 'permutation.tsx');
  const permContent = `export default function PermPage() {
  return (
    <div className="container">
      {/* Leading header comment */}
      <h1 id="item-a" className="title">Title A</h1>
      {/* Intermediate comment between a and b */}
      <h2 id="item-b" className="subtitle">Subtitle B</h2>
      {/* Sibling c should remain 100% untouched */}
      <p id="item-c" className="description">Paragraph C with long text.</p>
      {/* Trailing footer comment */}
    </div>
  );
}
`;
  fs.writeFileSync(permFixture, permContent, 'utf-8');

  const permResult = reorderElement({
    filePath: permFixture,
    elementId: 'item-a',
    targetIndex: 1, // Swap item-a and item-b
    dryRun: true,
  });

  test(permResult.success === true, 'Permutation swap succeeded');
  const updated = permResult.updatedSource!;

  // Verify item-c unchanged
  test(
    updated.includes('<p id="item-c" className="description">Paragraph C with long text.</p>'),
    'Unchanged sibling item-c has identical bytes'
  );
  // Verify comments preserved
  test(
    updated.includes('{/* Leading header comment */}') &&
      updated.includes('{/* Intermediate comment between a and b */}') &&
      updated.includes('{/* Sibling c should remain 100% untouched */}'),
    'Whitespace and all comments are preserved byte-for-byte'
  );
  // Verify order is now item-b then item-a
  const idxB = updated.indexOf('id="item-b"');
  const idxA = updated.indexOf('id="item-a"');
  test(idxB < idxA, 'Order is pure permutation (item-b before item-a)');

  // --------------------------------------------------------------------------
  // ITEM 3: Preview route targetIndex validation
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Preview Route targetIndex Validation ---');

  async function testPreviewTargetIndex(targetIndexVal: any) {
    const req = new Request('http://localhost:3000/api/slightnudge/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
      },
      body: JSON.stringify({
        kind: 'reorder',
        filePath: 'fixtures/1-plain-static.tsx',
        elementId: 'target',
        targetIndex: targetIndexVal,
      }),
    });
    const res = await previewHandler(req);
    return res.status;
  }

  return (async () => {
    // 3a: NaN
    const statusNan = await testPreviewTargetIndex(NaN);
    test(statusNan === 400, 'targetIndex NaN returns status 400');

    // 3b: Float
    const statusFloat = await testPreviewTargetIndex(1.5);
    test(statusFloat === 400, 'targetIndex float (1.5) returns status 400');

    // 3c: Negative number
    const statusNegative = await testPreviewTargetIndex(-2);
    test(statusNegative === 400, 'targetIndex negative (-2) returns status 400');

    // --------------------------------------------------------------------------
    // ITEM 4: Failed preview, rapid double drag, Alt+drag then Undo, and heading resize
    // --------------------------------------------------------------------------
    console.log('\n--- 4. Interaction Safety Tests (Failed Preview, Rapid Drag, Alt+Drag, Resize) ---');

    // 4a: Failed preview
    const failReq = new Request('http://localhost:3000/api/slightnudge/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
      },
      body: JSON.stringify({
        kind: 'reorder',
        filePath: 'fixtures/1-plain-static.tsx',
        elementId: 'nonexistent-element',
        direction: 'later',
      }),
    });
    const failRes = await previewHandler(failReq);
    test(failRes.status === 422, 'Failed preview returns error status 422');
    const failJson = await failRes.json();
    test(Boolean(failJson.error), 'Failed preview returns informative error message');

    // 4b: Rapid double drag
    const rapidFixture = path.join(scratchDir, 'rapid-drag.tsx');
    const rapidContent = `export default function RapidPage() {
  return (
    <div>
      <span id="item-1">Item 1</span>
      <span id="item-2">Item 2</span>
      <span id="item-3">Item 3</span>
    </div>
  );
}
`;
    fs.writeFileSync(rapidFixture, rapidContent, 'utf-8');

    // Rapid drag step 1: move item-1 later (slot 1)
    const step1 = reorderElement({
      filePath: rapidFixture,
      elementId: 'item-1',
      targetIndex: 1,
      dryRun: false,
    });
    test(step1.success === true, 'Rapid drag: First reorder succeeds');

    // Rapid drag step 2: immediately move item-1 later again (slot 2)
    const step2 = reorderElement({
      filePath: rapidFixture,
      elementId: 'item-1',
      targetIndex: 2,
      dryRun: false,
    });
    test(step2.success === true, 'Rapid drag: Second immediate reorder succeeds');
    const rapidSource = fs.readFileSync(rapidFixture, 'utf-8');
    const i2 = rapidSource.indexOf('id="item-2"');
    const i3 = rapidSource.indexOf('id="item-3"');
    const i1 = rapidSource.indexOf('id="item-1"');
    test(i2 < i3 && i3 < i1, 'Rapid drag: Final order is item-2, item-3, item-1 without corruption');

    // 4c: Alt+drag then Undo (Spacing nudge)
    const altFixture = path.join(scratchDir, 'alt-nudge.tsx');
    const altContent = `export default function AltPage() {
  return (
    <div>
      <h1 id="target" className="mt-1 text-2xl font-bold">Heading</h1>
    </div>
  );
}
`;
    fs.writeFileSync(altFixture, altContent, 'utf-8');
    const { nudgeElement } = await import('../lib/slightnudge/ast-nudger');

    // Nudge down (Alt+drag)
    const nudgeDown = nudgeElement({
      filePath: altFixture,
      elementId: 'target',
      direction: 'down',
      stepSize: 'normal',
      dryRun: false,
    });
    test(nudgeDown.success === true, 'Alt+drag (spacing nudge down) succeeds');
    const afterNudgeSource = fs.readFileSync(altFixture, 'utf-8');
    test(afterNudgeSource.includes('mt-1.5'), 'Alt+drag nudged margin from mt-1 to mt-1.5');

    // Undo: nudge back up
    const nudgeUp = nudgeElement({
      filePath: altFixture,
      elementId: 'target',
      direction: 'up',
      stepSize: 'normal',
      dryRun: false,
    });
    test(nudgeUp.success === true, 'Undo Alt+drag (nudge back up) succeeds');
    const afterUndoSource = fs.readFileSync(altFixture, 'utf-8');
    test(afterUndoSource.includes('mt-1'), 'Undo restores original mt-1 spacing cleanly');

    // 4d: Heading resize leaving typography unchanged
    const resizeFixture = path.join(scratchDir, 'resize.tsx');
    const resizeContent = `export default function ResizePage() {
  return (
    <div>
      <h1 id="target" className="ml-2.5 mt-1 text-2xl font-bold text-[#17211f]">Resized Heading</h1>
    </div>
  );
}
`;
    fs.writeFileSync(resizeFixture, resizeContent, 'utf-8');
    const { updateStaticTailwindClass } = await import('../lib/slightnudge/ast-nudger');

    const resizeResult = updateStaticTailwindClass({
      filePath: resizeFixture,
      elementId: 'target',
      property: 'width',
      value: 'w-full',
      dryRun: false,
    });
    test(resizeResult.success === true, 'Heading resize (width update) succeeds');
    const resizedSource = fs.readFileSync(resizeFixture, 'utf-8');
    test(resizedSource.includes('w-full'), 'Resized heading contains new width class w-full');
    test(
      resizedSource.includes('text-2xl') &&
        resizedSource.includes('font-bold') &&
        resizedSource.includes('text-[#17211f]'),
      'Heading resize leaves typography classes (text-2xl, font-bold, text color) 100% unchanged'
    );

    // Cleanup scratch
    try {
      fs.rmSync(scratchDir, { recursive: true, force: true });
    } catch {}

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passed}/${total} REORDER & VALIDATION TESTS PASSED!`);
    console.log('====================================================\n');
  })();
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failure:', err);
    process.exit(1);
  });
