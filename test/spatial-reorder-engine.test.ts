import assert from 'node:assert/strict';
import { reorderElement } from '../lib/slightnudge/ast-nudger';
import { Project, SyntaxKind } from 'ts-morph';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

console.log('====================================================');
console.log('🧪 RUNNING SPATIAL AUTO-LAYOUT REORDER TESTS');
console.log('====================================================\n');

// 1. Test Spatial Calculation Function
interface MockRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function calculateSpatialDropIndex(
  dragCenter: number,
  selfIndex: number,
  siblings: Array<{ rect: MockRect }>,
  isFlexRow: boolean
): number | null {
  let prospective = selfIndex;
  for (let i = 0; i < siblings.length; i++) {
    if (i === selfIndex) continue;
    const sib = siblings[i];
    const sibMid = isFlexRow
      ? sib.rect.left + sib.rect.width / 2
      : sib.rect.top + sib.rect.height / 2;
    if (i < selfIndex && dragCenter < sibMid) {
      prospective = Math.min(prospective, i);
    } else if (i > selfIndex && dragCenter > sibMid) {
      prospective = Math.max(prospective, i);
    }
  }
  return prospective !== selfIndex ? prospective : null;
}

// Vertical layout mock (3 cards)
const vSiblings = [
  { rect: { left: 0, top: 0, width: 300, height: 100 } },   // Midpoint: 50
  { rect: { left: 0, top: 120, width: 300, height: 100 } }, // Midpoint: 170 (Dragged element, selfIndex = 1)
  { rect: { left: 0, top: 240, width: 300, height: 100 } }, // Midpoint: 290
];

// Test 1: Small nudge within slot should NOT trigger reorder
const smallNudge = calculateSpatialDropIndex(160, 1, vSiblings, false);
assert.equal(smallNudge, null, 'Small nudge inside slot should return null');
console.log('  ✅ [PASS] Small nudge within slot preserves slot (no reorder)');

// Test 2: Dragged UP past Item 0 midpoint should target slot 0
const dragUpPastMid = calculateSpatialDropIndex(40, 1, vSiblings, false);
assert.equal(dragUpPastMid, 0, 'Dragging above item 0 midpoint should target slot 0');
console.log('  ✅ [PASS] Dragging UP past item 0 midpoint targets slot 0');

// Test 3: Dragged DOWN past Item 2 midpoint should target slot 2
const dragDownPastMid = calculateSpatialDropIndex(300, 1, vSiblings, false);
assert.equal(dragDownPastMid, 2, 'Dragging below item 2 midpoint should target slot 2');
console.log('  ✅ [PASS] Dragging DOWN past item 2 midpoint targets slot 2');

// Horizontal layout mock (3 buttons in flex row)
const hSiblings = [
  { rect: { left: 0, top: 0, width: 80, height: 40 } },   // Midpoint: 40
  { rect: { left: 100, top: 0, width: 80, height: 40 } }, // Midpoint: 140 (selfIndex = 1)
  { rect: { left: 200, top: 0, width: 80, height: 40 } }, // Midpoint: 240
];

// Test 4: Horizontal drag past left item midpoint
const dragLeftPastMid = calculateSpatialDropIndex(30, 1, hSiblings, true);
assert.equal(dragLeftPastMid, 0, 'Horizontal drag left should target slot 0');
console.log('  ✅ [PASS] Horizontal flex-row drag past midpoint targets slot 0');

// Test 5: AST Verification with reorderElement targetIndex
const testDir = path.join(process.cwd(), 'scratch-spatial-reorder-test');
mkdirSync(testDir, { recursive: true });
const testFile = path.join(testDir, 'CardList.tsx');

const initialSource = `export function CardList() {
  return (
    <div className="flex flex-col gap-4">
      <div id="card-1" className="p-4 bg-white">Card 1</div>
      <div id="card-2" className="p-4 bg-white">Card 2</div>
      <div id="card-3" className="p-4 bg-white">Card 3</div>
    </div>
  );
}
`;

writeFileSync(testFile, initialSource, 'utf8');

// Execute spatial drop reorder: Move card-2 (index 1) to target slot 0 (before card-1)
const reorderRes = reorderElement({
  filePath: testFile,
  elementId: 'card-2',
  targetIndex: 0,
  tagName: 'div',
  sourceText: initialSource,
  dryRun: true,
});

assert.equal(reorderRes.success, true, 'reorderElement should succeed');
assert.ok(reorderRes.updatedSource, 'updatedSource must be returned');

// Verify JSX order in AST
const proj = new Project({ skipAddingFilesFromTsConfig: true });
const sf = proj.createSourceFile('test.tsx', reorderRes.updatedSource);
const parentDiv = sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement).find(el => el.getAttribute('className')?.getText().includes('flex-col'))?.getParent();
assert.ok(parentDiv, 'Parent container must exist');
const jsxChildren = parentDiv.getDescendantsOfKind(SyntaxKind.JsxOpeningElement).filter(el => el.getAttribute('id'));
assert.equal(jsxChildren.length, 3, 'Must still have 3 cards');
assert.equal(jsxChildren[0].getAttribute('id')?.getText(), 'id="card-2"', 'card-2 must now be the first child (slot 0)');
assert.equal(jsxChildren[1].getAttribute('id')?.getText(), 'id="card-1"', 'card-1 must now be the second child (slot 1)');
assert.equal(jsxChildren[2].getAttribute('id')?.getText(), 'id="card-3"', 'card-3 must remain the third child (slot 2)');
console.log('  ✅ [PASS] AST reorderElement accurately moves JSX element to target slot');

rmSync(testDir, { recursive: true, force: true });

console.log('\n🎉 ALL SPATIAL AUTO-LAYOUT REORDER TESTS PASSED!\n');
