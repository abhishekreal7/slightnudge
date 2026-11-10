import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyLayoutIntent,
  type ChildLayoutDescriptor,
  type FlowSiblingDescriptor,
  type LayoutIntent,
  type LayoutIntentInput,
  type ParentLayoutDescriptor,
} from '../../lib/editor/geometry';

interface IntentCase {
  readonly name: string;
  readonly input: LayoutIntentInput;
  readonly assertResult: (res: LayoutIntent) => void;
}

const P_FLEX_ROW: ParentLayoutDescriptor = {
  display: 'flex',
  position: 'relative',
  flexDirection: 'row',
  flexWrap: 'nowrap',
  direction: 'ltr',
  writingMode: 'horizontal-tb',
  rect: { left: 0, top: 0, width: 600, height: 100 },
  gapX: 16,
  gapY: 16,
};

const ROW_SIBS_3: FlowSiblingDescriptor[] = [
  { id: 'c0', index: 0, display: 'block', position: 'static', rect: { left: 0, top: 0, width: 100, height: 50 } },
  { id: 'c1', index: 1, display: 'block', position: 'static', rect: { left: 116, top: 0, width: 100, height: 50 } },
  { id: 'c2', index: 2, display: 'block', position: 'static', rect: { left: 232, top: 0, width: 100, height: 50 } },
];

const COL_SIBS_3: FlowSiblingDescriptor[] = [
  { id: 'c0', index: 0, display: 'block', position: 'static', rect: { left: 0, top: 0, width: 200, height: 40 } },
  { id: 'c1', index: 1, display: 'block', position: 'static', rect: { left: 0, top: 56, width: 200, height: 40 } },
  { id: 'c2', index: 2, display: 'block', position: 'static', rect: { left: 0, top: 112, width: 200, height: 40 } },
];

const RTL_ROW_SIBS_3: FlowSiblingDescriptor[] = [
  // Logical index 0 is on the RIGHT in RTL! Index 1 is center, index 2 is LEFT!
  { id: 'c0', index: 0, display: 'block', position: 'static', rect: { left: 500, top: 0, width: 100, height: 50 } },
  { id: 'c1', index: 1, display: 'block', position: 'static', rect: { left: 384, top: 0, width: 100, height: 50 } },
  { id: 'c2', index: 2, display: 'block', position: 'static', rect: { left: 268, top: 0, width: 100, height: 50 } },
];

function makeChild(overrides: Partial<ChildLayoutDescriptor> & { rect: ChildLayoutDescriptor['rect'] }): ChildLayoutDescriptor {
  return {
    id: 'target',
    index: 0,
    display: 'block',
    position: 'static',
    ...overrides,
  };
}

const GRID_PARENT: ParentLayoutDescriptor = {
  display: 'grid',
  position: 'relative',
  direction: 'ltr',
  rect: { left: 0, top: 0, width: 600, height: 400 },
  gridColumns: [
    { index: 1, start: 0, end: 180 },
    { index: 2, start: 200, end: 380 },
    { index: 3, start: 400, end: 580 },
  ],
  gridRows: [
    { index: 1, start: 0, end: 180 },
    { index: 2, start: 200, end: 380 },
  ],
};

const TABLE_CASES: readonly IntentCase[] = [
  // 1-6: Flex Row (LTR) reorders & no-op
  {
    name: '01. flex row move item 0 past item 1 center -> reorder index 1',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ index: 0, rect: ROW_SIBS_3[0].rect }),
      siblings: ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 50, y: 25 }, to: { x: 180, y: 25 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'reorder-in-flow', fromIndex: 0, targetIndex: 1, axis: 'horizontal', visualDirection: 'forward', lineIndex: 0 }),
  },
  {
    name: '02. flex row move item 0 past all siblings -> reorder index 2',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ index: 0, rect: ROW_SIBS_3[0].rect }),
      siblings: ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 50, y: 25 }, to: { x: 350, y: 25 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'reorder-in-flow', fromIndex: 0, targetIndex: 2, axis: 'horizontal', visualDirection: 'forward', lineIndex: 0 }),
  },
  {
    name: '03. flex row move item 2 left before item 0 -> reorder index 0',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ index: 2, rect: ROW_SIBS_3[2].rect }),
      siblings: ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 282, y: 25 }, to: { x: 20, y: 25 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'reorder-in-flow', fromIndex: 2, targetIndex: 0, axis: 'horizontal', visualDirection: 'forward', lineIndex: 0 }),
  },
  {
    name: '04. flex row zero distance move -> no-op',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ index: 0, rect: ROW_SIBS_3[0].rect }),
      siblings: ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 50, y: 25 }, to: { x: 50, y: 25 } },
    },
    assertResult: (r) => assert.equal(r.kind, 'no-op'),
  },
  {
    name: '05. flex row tiny sub-threshold move within same slot -> no-op',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ index: 1, rect: ROW_SIBS_3[1].rect }),
      siblings: ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 166, y: 25 }, to: { x: 168, y: 26 } },
    },
    assertResult: (r) => assert.equal(r.kind, 'no-op'),
  },
  {
    name: '06. inline-flex row move forwards -> reorder-in-flow',
    input: {
      parent: { ...P_FLEX_ROW, display: 'inline-flex' },
      child: makeChild({ index: 0, rect: ROW_SIBS_3[0].rect }),
      siblings: ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 50, y: 25 }, to: { x: 295, y: 25 } },
    },
    assertResult: (r) => {
      assert.equal(r.kind, 'reorder-in-flow');
      if (r.kind === 'reorder-in-flow') assert.equal(r.targetIndex, 2);
    },
  },

  // 7-10: Flex Column reorders
  {
    name: '07. flex column move item 0 down past item 1 -> targetIndex 1',
    input: {
      parent: { ...P_FLEX_ROW, flexDirection: 'column', rect: { left: 0, top: 0, width: 300, height: 400 } },
      child: makeChild({ index: 0, rect: COL_SIBS_3[0].rect }),
      siblings: COL_SIBS_3,
      gesture: { kind: 'move', from: { x: 100, y: 20 }, to: { x: 100, y: 85 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'reorder-in-flow', fromIndex: 0, targetIndex: 1, axis: 'vertical', visualDirection: 'forward', lineIndex: 0 }),
  },
  {
    name: '08. flex column move item 2 up past item 0 -> targetIndex 0',
    input: {
      parent: { ...P_FLEX_ROW, flexDirection: 'column', rect: { left: 0, top: 0, width: 300, height: 400 } },
      child: makeChild({ index: 2, rect: COL_SIBS_3[2].rect }),
      siblings: COL_SIBS_3,
      gesture: { kind: 'move', from: { x: 100, y: 132 }, to: { x: 100, y: 10 } },
    },
    assertResult: (r) => assert.equal(r.kind === 'reorder-in-flow' && r.targetIndex, 0),
  },
  {
    name: '09. block vertical flow move child 0 down past child 2 -> targetIndex 2',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block', flexDirection: undefined, rect: { left: 0, top: 0, width: 300, height: 400 } },
      child: makeChild({ index: 0, rect: COL_SIBS_3[0].rect }),
      siblings: COL_SIBS_3,
      gesture: { kind: 'move', from: { x: 100, y: 20 }, to: { x: 100, y: 145 } },
    },
    assertResult: (r) => assert.equal(r.kind === 'reorder-in-flow' && r.axis === 'vertical' && r.targetIndex === 2, true),
  },
  {
    name: '10. block move small nudge within same vertical band -> no-op',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block', rect: { left: 0, top: 0, width: 300, height: 400 } },
      child: makeChild({ index: 1, rect: COL_SIBS_3[1].rect }),
      siblings: COL_SIBS_3,
      gesture: { kind: 'move', from: { x: 100, y: 76 }, to: { x: 100, y: 80 } },
    },
    assertResult: (r) => assert.equal(r.kind, 'no-op'),
  },

  // 11-16: Row-reverse, Column-reverse, and RTL!
  {
    name: '11. flex row-reverse: item 0 sits right (x=500), dragging LEFT moves forward in logical index to 1',
    input: {
      parent: { ...P_FLEX_ROW, flexDirection: 'row-reverse' },
      child: makeChild({ index: 0, rect: RTL_ROW_SIBS_3[0].rect }),
      siblings: RTL_ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 550, y: 25 }, to: { x: 400, y: 25 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'reorder-in-flow', fromIndex: 0, targetIndex: 1, axis: 'horizontal', visualDirection: 'reverse', lineIndex: 0 }),
  },
  {
    name: '12. flex row-reverse: item 2 sits left (x=268), dragging RIGHT moves backward to index 0',
    input: {
      parent: { ...P_FLEX_ROW, flexDirection: 'row-reverse' },
      child: makeChild({ index: 2, rect: RTL_ROW_SIBS_3[2].rect }),
      siblings: RTL_ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 318, y: 25 }, to: { x: 580, y: 25 } },
    },
    assertResult: (r) => assert.equal(r.kind === 'reorder-in-flow' && r.targetIndex === 0 && r.visualDirection === 'reverse', true),
  },
  {
    name: '13. RTL flex row: item 0 sits right (x=500), dragging LEFT past all -> targetIndex 2',
    input: {
      parent: { ...P_FLEX_ROW, direction: 'rtl' },
      child: makeChild({ index: 0, rect: RTL_ROW_SIBS_3[0].rect }),
      siblings: RTL_ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 550, y: 25 }, to: { x: 250, y: 25 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'reorder-in-flow', fromIndex: 0, targetIndex: 2, axis: 'horizontal', visualDirection: 'reverse', lineIndex: 0 }),
  },
  {
    name: '14. RTL + row-reverse cancels double flip back to LTR visual forward!',
    input: {
      parent: { ...P_FLEX_ROW, direction: 'rtl', flexDirection: 'row-reverse' },
      child: makeChild({ index: 0, rect: ROW_SIBS_3[0].rect }),
      siblings: ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 50, y: 25 }, to: { x: 280, y: 25 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'reorder-in-flow', fromIndex: 0, targetIndex: 2, axis: 'horizontal', visualDirection: 'forward', lineIndex: 0 }),
  },
  {
    name: '15. flex column-reverse: item 0 at bottom (y=112), dragging UP moves forward to targetIndex 2',
    input: {
      parent: { ...P_FLEX_ROW, flexDirection: 'column-reverse', rect: { left: 0, top: 0, width: 300, height: 200 } },
      child: makeChild({ index: 0, rect: COL_SIBS_3[2].rect }),
      siblings: [
        { id: 'c0', index: 0, display: 'block', position: 'static', rect: COL_SIBS_3[2].rect },
        { id: 'c1', index: 1, display: 'block', position: 'static', rect: COL_SIBS_3[1].rect },
        { id: 'c2', index: 2, display: 'block', position: 'static', rect: COL_SIBS_3[0].rect },
      ],
      gesture: { kind: 'move', from: { x: 100, y: 132 }, to: { x: 100, y: 5 } },
    },
    assertResult: (r) => assert.equal(r.kind === 'reorder-in-flow' && r.targetIndex === 2 && r.visualDirection === 'reverse', true),
  },
  {
    name: '16. vertical-rl block/flex column visual axis: column runs right-to-left vertically aligned rows',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block', writingMode: 'vertical-rl', rect: { left: 0, top: 0, width: 600, height: 200 } },
      child: makeChild({ index: 0, rect: RTL_ROW_SIBS_3[0].rect }),
      siblings: RTL_ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 550, y: 25 }, to: { x: 400, y: 25 } },
    },
    assertResult: (r) => assert.equal(r.kind === 'reorder-in-flow' && r.targetIndex === 1 && r.visualDirection === 'reverse', true),
  },

  // 17-22: Flex wrap & wrap-reverse multi-line reorder
  {
    name: '17. flex wrap move item from row 0 down into row 1 slot',
    input: {
      parent: { ...P_FLEX_ROW, flexWrap: 'wrap', rect: { left: 0, top: 0, width: 250, height: 200 } },
      child: makeChild({ index: 0, rect: { left: 0, top: 0, width: 100, height: 40 } }),
      siblings: [
        { id: 'c0', index: 0, display: 'block', position: 'static', rect: { left: 0, top: 0, width: 100, height: 40 } },
        { id: 'c1', index: 1, display: 'block', position: 'static', rect: { left: 116, top: 0, width: 100, height: 40 } },
        { id: 'c2', index: 2, display: 'block', position: 'static', rect: { left: 0, top: 56, width: 100, height: 40 } },
        { id: 'c3', index: 3, display: 'block', position: 'static', rect: { left: 116, top: 56, width: 100, height: 40 } },
      ],
      gesture: { kind: 'move', from: { x: 50, y: 20 }, to: { x: 160, y: 76 } },
    },
    assertResult: (r) => assert.equal(r.kind === 'reorder-in-flow' && r.targetIndex === 3 && r.lineIndex === 1, true),
  },
  {
    name: '18. flex wrap move item from row 1 back up into row 0 between c0 and c1',
    input: {
      parent: { ...P_FLEX_ROW, flexWrap: 'wrap', rect: { left: 0, top: 0, width: 250, height: 200 } },
      child: makeChild({ index: 3, rect: { left: 116, top: 56, width: 100, height: 40 } }),
      siblings: [
        { id: 'c0', index: 0, display: 'block', position: 'static', rect: { left: 0, top: 0, width: 100, height: 40 } },
        { id: 'c1', index: 1, display: 'block', position: 'static', rect: { left: 116, top: 0, width: 100, height: 40 } },
        { id: 'c2', index: 2, display: 'block', position: 'static', rect: { left: 0, top: 56, width: 100, height: 40 } },
        { id: 'c3', index: 3, display: 'block', position: 'static', rect: { left: 116, top: 56, width: 100, height: 40 } },
      ],
      gesture: { kind: 'move', from: { x: 166, y: 76 }, to: { x: 20, y: 20 } },
    },
    assertResult: (r) => assert.equal(r.kind === 'reorder-in-flow' && r.targetIndex === 0 && r.lineIndex === 0, true),
  },
  {
    name: '19. flex wrap-reverse bottom line is line 0; dragging down enters lower visual line',
    input: {
      parent: { ...P_FLEX_ROW, flexWrap: 'wrap-reverse', rect: { left: 0, top: 0, width: 250, height: 200 } },
      child: makeChild({ index: 2, rect: { left: 0, top: 0, width: 100, height: 40 } }),
      siblings: [
        { id: 'c0', index: 0, display: 'block', position: 'static', rect: { left: 0, top: 56, width: 100, height: 40 } },
        { id: 'c1', index: 1, display: 'block', position: 'static', rect: { left: 116, top: 56, width: 100, height: 40 } },
        { id: 'c2', index: 2, display: 'block', position: 'static', rect: { left: 0, top: 0, width: 100, height: 40 } },
        { id: 'c3', index: 3, display: 'block', position: 'static', rect: { left: 116, top: 0, width: 100, height: 40 } },
      ],
      gesture: { kind: 'move', from: { x: 50, y: 20 }, to: { x: 150, y: 76 } },
    },
    assertResult: (r) => assert.equal(r.kind === 'reorder-in-flow' && r.targetIndex === 1, true),
  },
  {
    name: '20. flex wrap vertical column multi-column flow',
    input: {
      parent: { ...P_FLEX_ROW, flexDirection: 'column', flexWrap: 'wrap', rect: { left: 0, top: 0, width: 300, height: 120 } },
      child: makeChild({ index: 0, rect: { left: 0, top: 0, width: 100, height: 40 } }),
      siblings: [
        { id: 'c0', index: 0, display: 'block', position: 'static', rect: { left: 0, top: 0, width: 100, height: 40 } },
        { id: 'c1', index: 1, display: 'block', position: 'static', rect: { left: 0, top: 50, width: 100, height: 40 } },
        { id: 'c2', index: 2, display: 'block', position: 'static', rect: { left: 120, top: 0, width: 100, height: 40 } },
      ],
      gesture: { kind: 'move', from: { x: 50, y: 20 }, to: { x: 160, y: 20 } },
    },
    assertResult: (r) => assert.equal(r.kind === 'reorder-in-flow' && r.targetIndex === 2 && r.lineIndex === 1, true),
  },
  {
    name: '21. vertical-lr block flow progresses left-to-right horizontally',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block', writingMode: 'vertical-lr' },
      child: makeChild({ index: 0, rect: ROW_SIBS_3[0].rect }),
      siblings: ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 50, y: 25 }, to: { x: 250, y: 25 } },
    },
    assertResult: (r) => assert.equal(r.kind === 'reorder-in-flow' && r.axis === 'horizontal' && r.visualDirection === 'forward' && r.targetIndex === 2, true),
  },
  {
    name: '22. nowrap flex row dragged far vertically off-axis without crossing horizontal threshold -> ambiguous or no-op',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ index: 1, rect: ROW_SIBS_3[1].rect }),
      siblings: ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 166, y: 25 }, to: { x: 166, y: 190 } },
    },
    assertResult: (r) => assert.equal(r.kind, 'ambiguous'),
  },

  // 23-28: CSS Grid moves
  {
    name: '23. grid move to col 3 row 2',
    input: {
      parent: GRID_PARENT,
      child: makeChild({ index: 0, rect: { left: 0, top: 0, width: 180, height: 180 }, gridColumnSpan: 1, gridRowSpan: 1 }),
      siblings: [],
      gesture: { kind: 'move', from: { x: 90, y: 90 }, to: { x: 490, y: 290 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'grid-cell-move', targetColumn: 3, targetRow: 2, columnSpan: 1, rowSpan: 1 }),
  },
  {
    name: '24. grid move preserves multi-cell spans',
    input: {
      parent: GRID_PARENT,
      child: makeChild({ index: 0, rect: { left: 0, top: 0, width: 380, height: 180 }, gridColumnSpan: 2, gridRowSpan: 1 }),
      siblings: [],
      gesture: { kind: 'move', from: { x: 100, y: 90 }, to: { x: 250, y: 260 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'grid-cell-move', targetColumn: 2, targetRow: 2, columnSpan: 2, rowSpan: 1 }),
  },
  {
    name: '25. inline-grid move to col 2 row 1',
    input: {
      parent: { ...GRID_PARENT, display: 'inline-grid' },
      child: makeChild({ index: 0, rect: { left: 0, top: 0, width: 180, height: 180 } }),
      siblings: [],
      gesture: { kind: 'move', from: { x: 90, y: 90 }, to: { x: 290, y: 50 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'grid-cell-move', targetColumn: 2, targetRow: 1, columnSpan: 1, rowSpan: 1 }),
  },
  {
    name: '26. RTL grid: columns index from right-to-left visually',
    input: {
      parent: { ...GRID_PARENT, direction: 'rtl' },
      child: makeChild({ index: 0, rect: { left: 400, top: 0, width: 180, height: 180 } }),
      siblings: [],
      gesture: { kind: 'move', from: { x: 490, y: 90 }, to: { x: 90, y: 90 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'grid-cell-move', targetColumn: 3, targetRow: 1, columnSpan: 1, rowSpan: 1 }),
  },
  {
    name: '27. grid parent without explicit grid track lines falls back safely to ambiguous with reason',
    input: {
      parent: { display: 'grid', position: 'relative', rect: { left: 0, top: 0, width: 600, height: 400 } },
      child: makeChild({ index: 0, rect: { left: 0, top: 0, width: 180, height: 180 } }),
      siblings: [],
      gesture: { kind: 'move', from: { x: 90, y: 90 }, to: { x: 300, y: 200 } },
    },
    assertResult: (r) => assert.equal(r.kind, 'ambiguous'),
  },
  {
    name: '28. grid move within same cell without delta -> no-op',
    input: {
      parent: GRID_PARENT,
      child: makeChild({ index: 0, rect: { left: 0, top: 0, width: 180, height: 180 } }),
      siblings: [],
      gesture: { kind: 'move', from: { x: 90, y: 90 }, to: { x: 91, y: 91 } },
    },
    assertResult: (r) => assert.equal(r.kind, 'no-op'),
  },

  // 29-34: Absolute & Fixed positioning (inset deltas)
  {
    name: '29. position absolute anchored left/top computes exact left/top inset deltas',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ position: 'absolute', rect: { left: 20, top: 10, width: 80, height: 40 }, insets: { top: 10, left: 20, right: 'auto', bottom: 'auto' } }),
      siblings: ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 60, y: 30 }, to: { x: 100, y: 55 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'absolute-offset', position: 'absolute', deltaX: 40, deltaY: 25, insetDeltas: { left: 40, top: 25 } }),
  },
  {
    name: '30. position absolute anchored right/bottom inverts delta into right/bottom insets',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ position: 'absolute', rect: { left: 400, top: 50, width: 80, height: 40 }, insets: { right: 120, bottom: 10, left: 'auto', top: 'auto' } }),
      siblings: [],
      gesture: { kind: 'move', from: { x: 440, y: 70 }, to: { x: 460, y: 55 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'absolute-offset', position: 'absolute', deltaX: 20, deltaY: -15, insetDeltas: { right: -20, bottom: 15 } }),
  },
  {
    name: '31. position absolute inside block container ignores flow siblings -> absolute-offset',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block' },
      child: makeChild({ position: 'absolute', rect: { left: 10, top: 10, width: 50, height: 50 } }),
      siblings: ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 35, y: 35 }, to: { x: 200, y: 80 } },
    },
    assertResult: (r) => assert.equal(r.kind === 'absolute-offset' && r.position === 'absolute', true),
  },
  {
    name: '32. position fixed always produces absolute-offset with fixed mode',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ position: 'fixed', rect: { left: 24, top: 24, width: 100, height: 40 }, insets: { top: 24, left: 24 } }),
      siblings: ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 74, y: 44 }, to: { x: 104, y: 64 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'absolute-offset', position: 'fixed', deltaX: 30, deltaY: 20, insetDeltas: { left: 30, top: 20 } }),
  },
  {
    name: '33. position fixed anchored right/top computes -deltaX on right and +deltaY on top',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ position: 'fixed', rect: { left: 800, top: 20, width: 80, height: 40 }, insets: { right: 20, top: 20 } }),
      siblings: [],
      gesture: { kind: 'move', from: { x: 840, y: 40 }, to: { x: 825, y: 50 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'absolute-offset', position: 'fixed', deltaX: -15, deltaY: 10, insetDeltas: { right: 15, top: 10 } }),
  },
  {
    name: '34. position absolute with all 4 insets non-auto conflicts when moved -> ambiguous',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ position: 'absolute', rect: { left: 20, top: 20, width: 560, height: 60 }, insets: { top: 20, right: 20, bottom: 20, left: 20 } }),
      siblings: [],
      gesture: { kind: 'move', from: { x: 300, y: 50 }, to: { x: 340, y: 50 } },
    },
    assertResult: (r) => assert.equal(r.kind, 'ambiguous'),
  },

  // 35-38: Sticky & Relative positioning
  {
    name: '35. position sticky in overflow scroll container MUST NOT be treated as plain reorder-in-flow',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block', overflowY: 'auto' },
      child: makeChild({ index: 0, position: 'sticky', rect: COL_SIBS_3[0].rect, insets: { top: 0 } }),
      siblings: COL_SIBS_3,
      gesture: { kind: 'move', from: { x: 100, y: 20 }, to: { x: 100, y: 120 } },
    },
    assertResult: (r) => {
      assert.notEqual(r.kind, 'reorder-in-flow');
      assert.equal(r.kind, 'ambiguous');
      assert.ok(r.reason.toLowerCase().includes('sticky'));
    },
  },
  {
    name: '36. position sticky even inside flex container classifies ambiguously rather than simple flow reorder',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ index: 0, position: 'sticky', rect: ROW_SIBS_3[0].rect, insets: { left: 10 } }),
      siblings: ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 50, y: 25 }, to: { x: 250, y: 25 } },
    },
    assertResult: (r) => {
      assert.notEqual(r.kind, 'reorder-in-flow');
      assert.equal(r.kind, 'ambiguous');
    },
  },
  {
    name: '37. position relative with small nudge not crossing siblings -> relative-offset',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ index: 0, position: 'relative', rect: ROW_SIBS_3[0].rect }),
      siblings: ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 50, y: 25 }, to: { x: 70, y: 35 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'relative-offset', deltaX: 20, deltaY: 10 }),
  },
  {
    name: '38. position relative dragged across multiple siblings -> reorder-in-flow',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ index: 0, position: 'relative', rect: ROW_SIBS_3[0].rect }),
      siblings: ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 50, y: 25 }, to: { x: 290, y: 25 } },
    },
    assertResult: (r) => assert.equal(r.kind === 'reorder-in-flow' && r.targetIndex === 2, true),
  },

  // 39-44: display: contents, display: inline, display: none
  {
    name: '39. child display: contents has no CSS box -> ambiguous on move',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ display: 'contents', rect: { left: 0, top: 0, width: 0, height: 0 } }),
      siblings: ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 50, y: 25 }, to: { x: 200, y: 25 } },
    },
    assertResult: (r) => {
      assert.equal(r.kind, 'ambiguous');
      if (r.kind === 'ambiguous') assert.ok(r.reason.toLowerCase().includes('contents'));
    },
  },
  {
    name: '40. child display: contents has no CSS box -> ambiguous on resize',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ display: 'contents', rect: { left: 0, top: 0, width: 100, height: 50 } }),
      siblings: [],
      gesture: { kind: 'resize', handle: 'e', fromRect: { left: 0, top: 0, width: 100, height: 50 }, toRect: { left: 0, top: 0, width: 160, height: 50 } },
    },
    assertResult: (r) => assert.equal(r.kind, 'ambiguous'),
  },
  {
    name: '41. parent display: contents has no layout box -> ambiguous on move/resize',
    input: {
      parent: { ...P_FLEX_ROW, display: 'contents' },
      child: makeChild({ rect: ROW_SIBS_3[0].rect }),
      siblings: ROW_SIBS_3,
      gesture: { kind: 'move', from: { x: 50, y: 25 }, to: { x: 180, y: 25 } },
    },
    assertResult: (r) => assert.equal(r.kind, 'ambiguous'),
  },
  {
    name: '42. child display: inline ignores width/height in CSS -> ambiguous on resize',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block' },
      child: makeChild({ display: 'inline', rect: { left: 0, top: 0, width: 80, height: 20 } }),
      siblings: [],
      gesture: { kind: 'resize', handle: 'e', fromRect: { left: 0, top: 0, width: 80, height: 20 }, toRect: { left: 0, top: 0, width: 140, height: 20 } },
    },
    assertResult: (r) => {
      assert.equal(r.kind, 'ambiguous');
      if (r.kind === 'ambiguous') assert.ok(r.reason.toLowerCase().includes('inline'));
    },
  },
  {
    name: '43. child display: none -> no-op',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ display: 'none', rect: { left: 0, top: 0, width: 0, height: 0 } }),
      siblings: [],
      gesture: { kind: 'move', from: { x: 0, y: 0 }, to: { x: 50, y: 50 } },
    },
    assertResult: (r) => assert.equal(r.kind, 'no-op'),
  },
  {
    name: '44. child display: inline-block in block flow reorders horizontally',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block' },
      child: makeChild({ index: 0, display: 'inline-block', rect: ROW_SIBS_3[0].rect }),
      siblings: ROW_SIBS_3.map((s) => ({ ...s, display: 'inline-block' as const })),
      gesture: { kind: 'move', from: { x: 50, y: 25 }, to: { x: 250, y: 25 } },
    },
    assertResult: (r) => assert.equal(r.kind === 'reorder-in-flow' && r.axis === 'horizontal' && r.targetIndex === 2, true),
  },

  // 45-50: margin: auto behavior
  {
    name: '45. block child with margin-left:auto & margin-right:auto (centered) resized asymmetrically -> ambiguous',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block' },
      child: makeChild({ rect: { left: 200, top: 0, width: 200, height: 50 }, margins: { left: 'auto', right: 'auto' } }),
      siblings: [],
      gesture: { kind: 'resize', handle: 'e', fromRect: { left: 200, top: 0, width: 200, height: 50 }, toRect: { left: 200, top: 0, width: 260, height: 50 } },
    },
    assertResult: (r) => {
      assert.equal(r.kind, 'ambiguous');
      if (r.kind === 'ambiguous') assert.ok(r.reason.toLowerCase().includes('auto'));
    },
  },
  {
    name: '46. block child with margin:auto horizontally nudged vertically in-place -> ambiguous',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block' },
      child: makeChild({ rect: { left: 200, top: 0, width: 200, height: 50 }, margins: { left: 'auto', right: 'auto' } }),
      siblings: [{ id: 't', index: 0, display: 'block', position: 'static', rect: { left: 200, top: 0, width: 200, height: 50 } }],
      gesture: { kind: 'move', from: { x: 300, y: 25 }, to: { x: 350, y: 25 } },
    },
    assertResult: (r) => assert.equal(r.kind, 'ambiguous'),
  },
  {
    name: '47. flex child with margin-left: auto pushed to far right reordered across sibling -> reorder-in-flow',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ index: 1, rect: { left: 500, top: 0, width: 100, height: 50 }, margins: { left: 'auto' } }),
      siblings: [
        ROW_SIBS_3[0],
        { id: 'c1', index: 1, display: 'block', position: 'static', rect: { left: 500, top: 0, width: 100, height: 50 } },
      ],
      gesture: { kind: 'move', from: { x: 550, y: 25 }, to: { x: 20, y: 25 } },
    },
    assertResult: (r) => assert.equal(r.kind === 'reorder-in-flow' && r.targetIndex === 0, true),
  },
  {
    name: '48. flex child with margin:auto on all 4 sides centered alone, moved -> ambiguous',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ index: 0, rect: { left: 250, top: 25, width: 100, height: 50 }, margins: { left: 'auto', right: 'auto', top: 'auto', bottom: 'auto' } }),
      siblings: [{ id: 'c0', index: 0, display: 'block', position: 'static', rect: { left: 250, top: 25, width: 100, height: 50 } }],
      gesture: { kind: 'move', from: { x: 300, y: 50 }, to: { x: 360, y: 50 } },
    },
    assertResult: (r) => assert.equal(r.kind, 'ambiguous'),
  },
  {
    name: '49. inline-block centered via margin:auto resized symmetrically around center -> size-fixed',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block' },
      child: makeChild({ rect: { left: 200, top: 0, width: 200, height: 50 }, margins: { left: 'auto', right: 'auto' } }),
      siblings: [],
      gesture: { kind: 'resize', handle: 'e', fromRect: { left: 200, top: 0, width: 200, height: 50 }, toRect: { left: 170, top: 0, width: 260, height: 50 } },
    },
    assertResult: (r) => assert.equal(r.kind === 'size-fixed' && r.axis === 'width' && r.width === 260, true),
  },
  {
    name: '50. absolute element with left/right/margin-left:auto/margin-right:auto centering resized single edge -> ambiguous',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ position: 'absolute', rect: { left: 200, top: 10, width: 200, height: 50 }, insets: { left: 0, right: 0 }, margins: { left: 'auto', right: 'auto' } }),
      siblings: [],
      gesture: { kind: 'resize', handle: 'w', fromRect: { left: 200, top: 10, width: 200, height: 50 }, toRect: { left: 150, top: 10, width: 250, height: 50 } },
    },
    assertResult: (r) => assert.equal(r.kind, 'ambiguous'),
  },

  // 51-66: Resize classifications (`size-fixed`, `size-fill`, `size-fit`, `no-op`, `ambiguous`)
  {
    name: '51. resize width to arbitrary pixel size -> size-fixed width',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block' },
      child: makeChild({ rect: { left: 0, top: 0, width: 200, height: 60 } }),
      siblings: [],
      gesture: { kind: 'resize', handle: 'e', fromRect: { left: 0, top: 0, width: 200, height: 60 }, toRect: { left: 0, top: 0, width: 320, height: 60 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'size-fixed', axis: 'width', width: 320 }),
  },
  {
    name: '52. resize height to arbitrary pixel size -> size-fixed height',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block', rect: { left: 0, top: 0, width: 600, height: 300 } },
      child: makeChild({ rect: { left: 0, top: 0, width: 200, height: 60 } }),
      siblings: [],
      gesture: { kind: 'resize', handle: 's', fromRect: { left: 0, top: 0, width: 200, height: 60 }, toRect: { left: 0, top: 0, width: 200, height: 140 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'size-fixed', axis: 'height', height: 140 }),
  },
  {
    name: '53. corner resize changing both width & height -> size-fixed both',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block', rect: { left: 0, top: 0, width: 600, height: 300 } },
      child: makeChild({ rect: { left: 0, top: 0, width: 200, height: 60 } }),
      siblings: [],
      gesture: { kind: 'resize', handle: 'se', fromRect: { left: 0, top: 0, width: 200, height: 60 }, toRect: { left: 0, top: 0, width: 350, height: 150 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'size-fixed', axis: 'both', width: 350, height: 150 }),
  },
  {
    name: '54. resize width right up to parent full width (600) -> size-fill width',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block', rect: { left: 0, top: 0, width: 600, height: 300 } },
      child: makeChild({ rect: { left: 0, top: 0, width: 250, height: 60 } }),
      siblings: [],
      gesture: { kind: 'resize', handle: 'e', fromRect: { left: 0, top: 0, width: 250, height: 60 }, toRect: { left: 0, top: 0, width: 599, height: 60 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'size-fill', axis: 'width' }),
  },
  {
    name: '55. resize height right up to flex row full cross-axis height (100) -> size-fill height',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ rect: { left: 0, top: 0, width: 120, height: 50 } }),
      siblings: [],
      gesture: { kind: 'resize', handle: 's', fromRect: { left: 0, top: 0, width: 120, height: 50 }, toRect: { left: 0, top: 0, width: 120, height: 100 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'size-fill', axis: 'height' }),
  },
  {
    name: '56. resize corner to fill parent width & height within snap tolerance -> size-fill both',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block', rect: { left: 0, top: 0, width: 600, height: 300 } },
      child: makeChild({ rect: { left: 0, top: 0, width: 200, height: 100 } }),
      siblings: [],
      gesture: { kind: 'resize', handle: 'se', fromRect: { left: 0, top: 0, width: 200, height: 100 }, toRect: { left: 0, top: 0, width: 600, height: 300 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'size-fill', axis: 'both' }),
  },
  {
    name: '57. resize width back down to intrinsic content width -> size-fit width',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block' },
      child: makeChild({ rect: { left: 0, top: 0, width: 300, height: 48 }, intrinsicSize: { width: 140, height: 40 } }),
      siblings: [],
      gesture: { kind: 'resize', handle: 'e', fromRect: { left: 0, top: 0, width: 300, height: 48 }, toRect: { left: 0, top: 0, width: 141, height: 48 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'size-fit', axis: 'width' }),
  },
  {
    name: '58. resize height back down to intrinsic content height -> size-fit height',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block', rect: { left: 0, top: 0, width: 600, height: 300 } },
      child: makeChild({ rect: { left: 0, top: 0, width: 200, height: 120 }, intrinsicSize: { width: 140, height: 40 } }),
      siblings: [],
      gesture: { kind: 'resize', handle: 's', fromRect: { left: 0, top: 0, width: 200, height: 120 }, toRect: { left: 0, top: 0, width: 200, height: 40 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'size-fit', axis: 'height' }),
  },
  {
    name: '59. resize corner to intrinsic width & height -> size-fit both',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block', rect: { left: 0, top: 0, width: 600, height: 300 } },
      child: makeChild({ rect: { left: 0, top: 0, width: 300, height: 120 }, intrinsicSize: { width: 140, height: 40 } }),
      siblings: [],
      gesture: { kind: 'resize', handle: 'se', fromRect: { left: 0, top: 0, width: 300, height: 120 }, toRect: { left: 0, top: 0, width: 140, height: 40 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'size-fit', axis: 'both' }),
  },
  {
    name: '60. zero delta resize -> no-op',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ rect: { left: 0, top: 0, width: 200, height: 60 } }),
      siblings: [],
      gesture: { kind: 'resize', handle: 'se', fromRect: { left: 0, top: 0, width: 200, height: 60 }, toRect: { left: 0, top: 0, width: 200, height: 60 } },
    },
    assertResult: (r) => assert.equal(r.kind, 'no-op'),
  },
  {
    name: '61. resizing flex-grow:1 child constrained by siblings without breaking flex basis -> ambiguous when shrinking vs neighbor or fixed size-fixed when flexGrow=0',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ index: 0, rect: { left: 0, top: 0, width: 300, height: 50 }, flexGrow: 1, flexShrink: 1 }),
      siblings: [
        { id: 'c0', index: 0, display: 'block', position: 'static', rect: { left: 0, top: 0, width: 300, height: 50 } },
        { id: 'c1', index: 1, display: 'block', position: 'static', rect: { left: 316, top: 0, width: 284, height: 50 } },
      ],
      gesture: { kind: 'resize', handle: 'e', fromRect: { left: 0, top: 0, width: 300, height: 50 }, toRect: { left: 0, top: 0, width: 220, height: 50 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'size-fixed', axis: 'width', width: 220 }),
  },
  {
    name: '62. resizing width beyond overflow:hidden clipped parent without scroll -> size-fixed (clipped explicitly documented or allowed)',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block', overflowX: 'hidden', rect: { left: 0, top: 0, width: 400, height: 200 } },
      child: makeChild({ rect: { left: 0, top: 0, width: 200, height: 50 } }),
      siblings: [],
      gesture: { kind: 'resize', handle: 'e', fromRect: { left: 0, top: 0, width: 200, height: 50 }, toRect: { left: 0, top: 0, width: 480, height: 50 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'size-fixed', axis: 'width', width: 480 }),
  },
  {
    name: '63. resizing align-self:stretch child cross axis in flex row away from stretch -> size-fixed height',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ rect: { left: 0, top: 0, width: 120, height: 100 }, alignSelf: 'stretch' }),
      siblings: [],
      gesture: { kind: 'resize', handle: 's', fromRect: { left: 0, top: 0, width: 120, height: 100 }, toRect: { left: 0, top: 0, width: 120, height: 64 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'size-fixed', axis: 'height', height: 64 }),
  },
  {
    name: '64. flex row item resized right edge past fill limit in single-child fill scenario -> size-fill only at full parent width minus other siblings gap',
    input: {
      parent: P_FLEX_ROW,
      child: makeChild({ index: 0, rect: { left: 0, top: 0, width: 200, height: 50 }, widthMode: 'fixed' }),
      siblings: [{ id: 'c0', index: 0, display: 'block', position: 'static', rect: { left: 0, top: 0, width: 200, height: 50 } }],
      gesture: { kind: 'resize', handle: 'e', fromRect: { left: 0, top: 0, width: 200, height: 50 }, toRect: { left: 0, top: 0, width: 600, height: 50 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'size-fill', axis: 'width' }),
  },
  {
    name: '65. block child in padding/overflow parent fills parent inner width when resized from w handle',
    input: {
      parent: { ...P_FLEX_ROW, display: 'block', rect: { left: 20, top: 0, width: 500, height: 200 } },
      child: makeChild({ rect: { left: 100, top: 20, width: 300, height: 50 } }),
      siblings: [],
      gesture: { kind: 'resize', handle: 'w', fromRect: { left: 100, top: 20, width: 300, height: 50 }, toRect: { left: 20, top: 20, width: 500, height: 50 } },
    },
    assertResult: (r) => assert.deepEqual(r, { kind: 'size-fill', axis: 'width' }),
  },
];

describe('layout intent classifier (>=65 table-driven cases + invariants)', () => {
  it(`contains at least 60 table cases (has ${TABLE_CASES.length})`, () => {
    assert.ok(TABLE_CASES.length >= 60);
  });

  for (const tc of TABLE_CASES) {
    it(tc.name, () => {
      const actual = classifyLayoutIntent(tc.input);
      tc.assertResult(actual);
    });
  }

  it('determinism: repeated identical calls produce deeply identical results', () => {
    for (const tc of TABLE_CASES) {
      const first = classifyLayoutIntent(tc.input);
      const second = classifyLayoutIntent(tc.input);
      assert.deepEqual(first, second, `Non-deterministic result on case ${tc.name}`);
    }
  });

  it('ordering invariant: sweeping pointer across visual siblings yields monotonic targetIndex', () => {
    const child = makeChild({ index: 0, rect: ROW_SIBS_3[0].rect });
    const indices: number[] = [];
    for (let x = 30; x <= 320; x += 20) {
      const res = classifyLayoutIntent({
        parent: P_FLEX_ROW,
        child,
        siblings: ROW_SIBS_3,
        gesture: { kind: 'move', from: { x: 50, y: 25 }, to: { x, y: 25 } },
      });
      if (res.kind === 'no-op') indices.push(0);
      else if (res.kind === 'reorder-in-flow') indices.push(res.targetIndex);
    }
    for (let i = 1; i < indices.length; i++) {
      assert.ok(indices[i] >= indices[i - 1], `Non-monotonic LTR reorder indices: ${indices.join(',')}`);
    }
    assert.equal(indices[indices.length - 1], 2);

    // Reverse sweep in RTL: as pointer moves LEFT (560 -> 260), logical targetIndex increases monotonically 0 -> 2!
    const rtlIndices: number[] = [];
    const rtlChild = makeChild({ index: 0, rect: RTL_ROW_SIBS_3[0].rect });
    for (let x = 560; x >= 260; x -= 20) {
      const res = classifyLayoutIntent({
        parent: { ...P_FLEX_ROW, direction: 'rtl' },
        child: rtlChild,
        siblings: RTL_ROW_SIBS_3,
        gesture: { kind: 'move', from: { x: 550, y: 25 }, to: { x, y: 25 } },
      });
      if (res.kind === 'no-op') rtlIndices.push(0);
      else if (res.kind === 'reorder-in-flow') rtlIndices.push(res.targetIndex);
    }
    for (let i = 1; i < rtlIndices.length; i++) {
      assert.ok(rtlIndices[i] >= rtlIndices[i - 1], `Non-monotonic RTL reorder indices: ${rtlIndices.join(',')}`);
    }
    assert.equal(rtlIndices[rtlIndices.length - 1], 2);
  });

  it('covers vertical margin:auto resize conflict, empty flow relative move, and parent display:none', () => {
    const parentNone = classifyLayoutIntent({
      parent: { ...P_FLEX_ROW, display: 'none' },
      child: makeChild({ rect: { left: 0, top: 0, width: 100, height: 40 } }),
      siblings: [],
      gesture: { kind: 'move', from: { x: 10, y: 10 }, to: { x: 50, y: 10 } },
    });
    assert.equal(parentNone.kind, 'no-op');

    const vertAutoResize = classifyLayoutIntent({
      parent: P_FLEX_ROW,
      child: makeChild({
        rect: { left: 0, top: 20, width: 100, height: 40 },
        margins: { top: 'auto', bottom: 'auto' },
      }),
      siblings: [],
      gesture: {
        kind: 'resize',
        handle: 's',
        fromRect: { left: 0, top: 20, width: 100, height: 40 },
        toRect: { left: 0, top: 20, width: 100, height: 70 },
      },
    });
    assert.equal(vertAutoResize.kind, 'ambiguous');

    const relEmpty = classifyLayoutIntent({
      parent: P_FLEX_ROW,
      child: makeChild({ position: 'relative', rect: { left: 0, top: 0, width: 100, height: 40 } }),
      siblings: [],
      gesture: { kind: 'move', from: { x: 20, y: 20 }, to: { x: 40, y: 25 } },
    });
    assert.deepEqual(relEmpty, { kind: 'relative-offset', deltaX: 20, deltaY: 5 });

    const staticEmpty = classifyLayoutIntent({
      parent: P_FLEX_ROW,
      child: makeChild({ rect: { left: 0, top: 0, width: 100, height: 40 } }),
      siblings: [],
      gesture: { kind: 'move', from: { x: 20, y: 20 }, to: { x: 40, y: 25 } },
    });
    assert.equal(staticEmpty.kind, 'no-op');
  });
});
