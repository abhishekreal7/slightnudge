import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fc from 'fast-check';
import {
  alignRects,
  computeSelectionBounds,
  createMutableSnapOutput,
  createSnapIndex,
  createSnapScratchBuffer,
  distributeRects,
  nearEqual,
  rebuildSnapIndex,
  rectToBounds,
  snapRect,
  snapRectInto,
  spaceRectsWithGap,
  type RectItem,
  type SnapCandidateRect,
} from '../../lib/editor/geometry';

const SEED_SNAP_THRESHOLD = 2026111021;
const SEED_SNAP_IDEMPOTENT = 2026111022;

const arbFinite = (min: number, max: number) =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

function makeGridSiblings(count: number): SnapCandidateRect[] {
  const out: SnapCandidateRect[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: `s-${i}`,
      left: (i % 10) * 140 + 20,
      top: Math.floor(i / 10) * 100 + 30,
      width: 90,
      height: 55,
    });
  }
  return out;
}

describe('snapping engine with spatial index and scratch buffers', () => {
  it('snaps edges and centers using screen-pixel threshold scaled by zoom', () => {
    const siblings: SnapCandidateRect[] = [
      { id: 's1', left: 100, top: 200, width: 100, height: 60 },
    ];
    const container: SnapCandidateRect = { id: 'c', left: 0, top: 0, width: 800, height: 600 };

    // 4 screen px threshold at zoom=1 -> 4 canvas px; delta = 3 -> snaps!
    const snap1x = snapRect(
      { left: 97, top: 202, width: 80, height: 50 },
      siblings,
      { thresholdScreenPx: 4, zoom: 1.0 },
      container
    );
    assert.equal(snap1x.snappedX, true);
    assert.equal(snap1x.rect.left, 100);
    assert.equal(snap1x.snappedY, true);
    assert.equal(snap1x.rect.top, 200);
    assert.ok(snap1x.guides.some((g) => g.axis === 'x' && g.kind === 'edge' && g.position === 100));

    // At zoom=2, 4 screen px threshold = 2 canvas px! Delta of 3 canvas px (6 screen px) must NOT snap!
    const noSnap2x = snapRect(
      { left: 97, top: 203, width: 80, height: 50 },
      siblings,
      { thresholdScreenPx: 4, zoom: 2.0 },
      container
    );
    assert.equal(noSnap2x.snappedX, false);
    assert.equal(noSnap2x.snappedY, false);

    // At zoom=0.25, 4 screen px = 16 canvas px! Delta of 12 canvas px MUST snap!
    const snapQuarter = snapRect(
      { left: 88, top: 190, width: 80, height: 50 },
      siblings,
      { thresholdScreenPx: 4, zoom: 0.25 },
      container
    );
    assert.equal(snapQuarter.snappedX, true);
    assert.equal(snapQuarter.rect.left, 100);
    assert.equal(snapQuarter.snappedY, true);
    assert.equal(snapQuarter.rect.top, 200);
  });

  it('detects center alignment and equal-spacing gaps between siblings', () => {
    const siblings: SnapCandidateRect[] = [
      { id: 'a', left: 0, top: 100, width: 50, height: 40 },
      { id: 'b', left: 80, top: 100, width: 50, height: 40 }, // gap between a and b = 30
    ];
    // Target c placed at 158 (gap = 28 -> within 4px of equal gap 30 => snaps to left=160)
    const spacingRes = snapRect(
      { left: 158, top: 140, width: 50, height: 40 },
      siblings,
      { thresholdScreenPx: 4, zoom: 1.0, includeEdges: false, includeCenters: false, includeEqualSpacing: true }
    );
    assert.equal(spacingRes.snappedX, true);
    assert.ok(nearEqual(spacingRes.rect.left, 160, 1e-6));
    assert.ok(spacingRes.guides.some((g) => g.kind === 'spacing' && nearEqual(g.gap ?? 0, 30, 1e-6)));

    // Center alignment check
    const centerRes = snapRect(
      { left: 5, top: 180, width: 40, height: 40 }, // center = 25, sibling a center = 25
      siblings,
      { thresholdScreenPx: 4, zoom: 1.0 }
    );
    assert.equal(centerRes.snappedX, true);
    assert.ok(centerRes.guides.some((g) => g.axis === 'x' && g.kind === 'center' && nearEqual(g.position, 25, 1e-6)));
  });

  it('disabled option suppresses all snapping and guides', () => {
    const siblings: SnapCandidateRect[] = [{ id: 'a', left: 100, top: 100, width: 50, height: 40 }];
    const res = snapRect(
      { left: 99, top: 101, width: 50, height: 40 },
      siblings,
      { thresholdScreenPx: 10, zoom: 1, disabled: true }
    );
    assert.equal(res.snappedX, false);
    assert.equal(res.snappedY, false);
    assert.equal(res.guides.length, 0);
  });

  it('benchmark & allocation-free check: <=1ms for 50 siblings and <=3ms for 500 siblings', () => {
    const container: SnapCandidateRect = { id: 'container', left: 0, top: 0, width: 2000, height: 6000 };

    for (const [count, budgetMs] of [
      [50, 1.0],
      [500, 3.0],
    ] as const) {
      const sibs = makeGridSiblings(count);
      const index = createSnapIndex(count + 8);
      rebuildSnapIndex(index, sibs, container);
      const scratch = createSnapScratchBuffer(count + 8);
      const out = createMutableSnapOutput(4);
      const box = { left: 302, top: 228, width: 110, height: 60 };
      const opts = { thresholdScreenPx: 6, zoom: 1.0 };

      // Warm up JIT cleanly so concurrent Maglev/TurboFan compilation completes before heap measurement
      for (let i = 0; i < 2500; i++) {
        snapRectInto(box, index, opts, scratch, out);
      }

      const iterations = 1000;
      const heapBefore = process.memoryUsage().heapUsed;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        snapRectInto(box, index, opts, scratch, out);
      }
      const elapsed = performance.now() - start;
      const heapAfter = process.memoryUsage().heapUsed;
      const avgMs = elapsed / iterations;
      // Verify hot path allocates negligibly (< 64 bytes per call amortized; strictly 0 object allocations)
      const bytesPerCall = Math.max(0, heapAfter - heapBefore) / iterations;
      console.info(
        `  [BENCHMARK] ${count} siblings: ${avgMs.toFixed(5)} ms/frame (budget <= ${budgetMs} ms), alloc ~${bytesPerCall.toFixed(2)} bytes/call`
      );

      assert.ok(
        avgMs <= budgetMs,
        `Snapping ${count} siblings took ${avgMs.toFixed(4)} ms/frame, exceeding ${budgetMs} ms budget`
      );
      assert.ok(
        bytesPerCall < 64,
        `Hot path allocated ${bytesPerCall.toFixed(1)} bytes/call for ${count} siblings`
      );
    }
  });

  it('property: snapping never moves a rect farther than threshold and is idempotent', () => {
    const siblings = makeGridSiblings(25);
    const index = createSnapIndex(32);
    rebuildSnapIndex(index, siblings, { id: 'c', left: 0, top: 0, width: 2000, height: 1000 });
    const scratch = createSnapScratchBuffer(32);
    const out1 = createMutableSnapOutput(4);
    const out2 = createMutableSnapOutput(4);

    fc.assert(
      fc.property(
        fc.record({
          left: arbFinite(-50, 1600),
          top: arbFinite(-50, 500),
          width: arbFinite(20, 200),
          height: arbFinite(20, 150),
        }),
        arbFinite(1, 16),
        arbFinite(0.25, 4),
        (box, thresholdScreenPx, zoom) => {
          const thresholdCanvas = thresholdScreenPx / zoom;
          const res1 = snapRectInto(box, index, { thresholdScreenPx, zoom }, scratch, out1);
          assert.ok(Math.abs(res1.dx) <= thresholdCanvas + 1e-6);
          assert.ok(Math.abs(res1.dy) <= thresholdCanvas + 1e-6);

          const snappedBox = {
            left: res1.rect.left,
            top: res1.rect.top,
            width: res1.rect.width,
            height: res1.rect.height,
          };
          const res2 = snapRectInto(snappedBox, index, { thresholdScreenPx, zoom }, scratch, out2);
          assert.ok(nearEqual(res2.rect.left, res1.rect.left, 1e-6), `Non-idempotent X: ${res1.rect.left} -> ${res2.rect.left}`);
          assert.ok(nearEqual(res2.rect.top, res1.rect.top, 1e-6), `Non-idempotent Y: ${res1.rect.top} -> ${res2.rect.top}`);
        }
      ),
      { seed: SEED_SNAP_THRESHOLD, numRuns: 300 }
    );

    // Explicitly exercise top-level convenience snapRect idempotence with equal spacing enabled
    fc.assert(
      fc.property(
        fc.record({
          left: arbFinite(0, 300),
          top: arbFinite(90, 110),
          width: arbFinite(40, 60),
          height: arbFinite(35, 45),
        }),
        (box) => {
          const smallSibs: SnapCandidateRect[] = [
            { id: 's1', left: 20, top: 100, width: 40, height: 40 },
            { id: 's2', left: 90, top: 100, width: 40, height: 40 },
          ];
          const first = snapRect(box, smallSibs, { thresholdScreenPx: 5, zoom: 1 });
          const second = snapRect(first.rect, smallSibs, { thresholdScreenPx: 5, zoom: 1 });
          assert.ok(nearEqual(first.rect.left, second.rect.left, 1e-6));
          assert.ok(nearEqual(first.rect.top, second.rect.top, 1e-6));
        }
      ),
      { seed: SEED_SNAP_IDEMPOTENT, numRuns: 150 }
    );
  });
});

describe('align and distribute helpers', () => {
  const sample: RectItem[] = [
    { id: 'a', rect: { left: 20, top: 50, width: 40, height: 20 } },
    { id: 'b', rect: { left: 100, top: 10, width: 60, height: 40 } },
    { id: 'c', rect: { left: 260, top: 80, width: 40, height: 30 } },
  ];

  it('computes selection bounds and handles empty/single inputs safely', () => {
    assert.equal(computeSelectionBounds([]), null);
    assert.deepEqual(computeSelectionBounds(sample), {
      left: 20,
      top: 10,
      right: 300,
      bottom: 110,
      width: 280,
      height: 100,
    });
    assert.deepEqual(alignRects([], 'left'), []);
  });

  it('aligns rects along all 6 alignment axes against selection, first, and custom reference', () => {
    const leftSel = alignRects(sample, 'left', 'selection');
    assert.deepEqual(leftSel.map((i) => i.rect.left), [20, 20, 20]);

    const rightFirst = alignRects(sample, 'right', 'first'); // first right = 60
    assert.deepEqual(rightFirst.map((i) => i.rect.right), [60, 60, 60]);

    const centerCustom = alignRects(sample, 'center-x', { left: 0, top: 0, width: 400, height: 400 });
    assert.deepEqual(centerCustom.map((i) => i.rect.left + i.rect.width / 2), [200, 200, 200]);

    const topSel = alignRects(sample, 'top', 'selection');
    assert.deepEqual(topSel.map((i) => i.rect.top), [10, 10, 10]);

    const bottomSel = alignRects(sample, 'bottom', 'selection');
    assert.deepEqual(bottomSel.map((i) => i.rect.bottom), [110, 110, 110]);

    const centerY = alignRects(sample, 'center-y', 'selection'); // selection centerY = (10+110)/2 = 60
    assert.deepEqual(centerY.map((i) => i.rect.top + i.rect.height / 2), [60, 60, 60]);
  });

  it('distributes rects horizontally and vertically preserving outer anchors', () => {
    // Horizontal spacing: total width = 280 (20..300), items widths = 40+60+40 = 140 => free space = 140 => gap = 70 each!
    const distX = distributeRects(sample, 'horizontal', 'spacing');
    assert.equal(distX[0].rect.left, 20);
    assert.equal(distX[1].rect.left, 130); // 20 + 40 + 70 = 130
    assert.equal(distX[2].rect.left, 260); // 130 + 60 + 70 = 260

    // Horizontal centers: a center = 40, c center = 280 => midpoint = 160 => b left = 130
    const distCentersX = distributeRects(sample, 'horizontal', 'centers');
    assert.equal(distCentersX[1].rect.left + distCentersX[1].rect.width / 2, 160);

    // Vertical spacing: top=10..bottom=110 (span 100), heights = 40(b) + 20(a) + 30(c) = 90 => gap = 5 each!
    // Sorted by top: b (top 10, h 40), a (h 20), c (top 80, h 30)
    const distY = distributeRects(sample, 'vertical', 'spacing');
    const byId = Object.fromEntries(distY.map((item) => [item.id, item.rect]));
    assert.equal(byId.b.top, 10);
    assert.equal(byId.a.top, 55); // 10 + 40 + 5
    assert.equal(byId.c.top, 80); // 55 + 20 + 5

    // Space evenly with explicit gap
    const spaced = spaceRectsWithGap(sample, 'horizontal', 16);
    assert.equal(spaced[0].rect.left, 20);
    assert.equal(spaced[1].rect.left, 76); // 20 + 40 + 16
    assert.equal(spaced[2].rect.left, 152); // 76 + 60 + 16

    // Additional align/distribute/space modes & edge cases
    assert.deepEqual(distributeRects([], 'horizontal'), []);
    assert.equal(distributeRects(sample.slice(0, 2), 'vertical').length, 2);
    assert.deepEqual(spaceRectsWithGap([], 'vertical', 10), []);

    const edgesX = distributeRects(sample, 'horizontal', 'edges');
    assert.deepEqual(edgesX.map((i) => i.rect.left), [20, 140, 260]);
    const centersY = distributeRects(sample, 'vertical', 'centers');
    assert.equal(centersY.length, 3);
    const edgesY = distributeRects(sample, 'vertical', 'edges');
    assert.equal(edgesY.length, 3);
    const spacedY = spaceRectsWithGap(sample, 'vertical', NaN);
    assert.equal(spacedY.length, 3);

    // Equal-key tie-breaking sort
    const tied: RectItem[] = [
      { id: 't1', rect: { left: 10, top: 50, width: 20, height: 20 } },
      { id: 't2', rect: { left: 10, top: 10, width: 20, height: 20 } },
      { id: 't3', rect: { left: 80, top: 10, width: 20, height: 20 } },
    ];
    assert.equal(distributeRects(tied, 'horizontal', 'spacing').length, 3);
    assert.equal(distributeRects(tied, 'vertical', 'spacing').length, 3);
  });

  it('covers rectToBounds, container snaps, vertical/left/between equal spacing, and option flags', () => {
    assert.deepEqual(rectToBounds({ left: NaN, top: 10, width: -5, height: 20 }), {
      left: 0,
      top: 10,
      right: 0,
      bottom: 30,
      width: 0,
      height: 20,
    });

    const container: SnapCandidateRect = { id: 'c', left: 0, top: 0, width: 500, height: 400 };
    const sibs: SnapCandidateRect[] = [
      { id: 'a', left: 100, top: 100, width: 60, height: 40 },
      { id: 'b', left: 200, top: 100, width: 60, height: 40 }, // horiz gap 40 (160..200)
      { id: 'c1', left: 320, top: 40, width: 60, height: 40 },
      { id: 'c2', left: 320, top: 110, width: 60, height: 40 }, // vert gap 30 (80..110)
    ];

    // Container center & right/bottom edge snaps
    const contCenter = snapRect(
      { left: 229, top: 181, width: 40, height: 40 },
      [],
      { thresholdScreenPx: 5, zoom: 1, includeEdges: false, includeEqualSpacing: false },
      container
    );
    assert.equal(contCenter.snappedX, true);
    assert.equal(contCenter.snappedY, true);

    const contRightBottom = snapRect(
      { left: 458, top: 358, width: 40, height: 40 },
      [],
      { thresholdScreenPx: 5, zoom: 1, includeCenters: false, includeEqualSpacing: false },
      container
    );
    assert.equal(contRightBottom.rect.right, 500);
    assert.equal(contRightBottom.rect.bottom, 400);

    // Zero threshold + includeContainer false + non-finite inputs
    const zeroThresh = snapRect({ left: NaN, top: NaN, width: -1, height: -1 }, sibs, {
      thresholdScreenPx: 0,
      zoom: 1,
      includeContainer: false,
    });
    assert.equal(zeroThresh.snappedX, false);

    // Equal spacing left of [a, b]: target left = 100 - 40 - 40 = 20
    const spLeft = snapRect(
      { left: 22, top: 105, width: 40, height: 30 },
      sibs.slice(0, 2),
      { thresholdScreenPx: 5, zoom: 1, includeEdges: false, includeCenters: false, includeContainer: false }
    );
    assert.equal(spLeft.snappedX, true);
    assert.equal(spLeft.rect.left, 20);

    // Equal spacing centered between [a, b]: gap = 40, target width = 20 => left = 160 + 10 = 170
    const spMid = snapRect(
      { left: 172, top: 105, width: 20, height: 30 },
      sibs.slice(0, 2),
      { thresholdScreenPx: 5, zoom: 1, includeEdges: false, includeCenters: false, includeContainer: false }
    );
    assert.equal(spMid.snappedX, true);
    assert.equal(spMid.rect.left, 170);

    // Vertical spacing above & between [c1, c2]
    const spAbove = snapRect(
      { left: 325, top: -9, width: 40, height: 20 },
      sibs.slice(2, 4),
      { thresholdScreenPx: 5, zoom: 1, includeEdges: false, includeCenters: false, includeContainer: false }
    );
    assert.equal(spAbove.snappedY, true);
    assert.equal(spAbove.rect.top, -10);

    const spVertMid = snapRect(
      { left: 325, top: 89, width: 40, height: 10 }, // gap 80..110 = 30 => mid = 80 + 10 = 90
      sibs.slice(2, 4),
      { thresholdScreenPx: 5, zoom: 1, includeEdges: false, includeCenters: false, includeContainer: false }
    );
    assert.equal(spVertMid.snappedY, true);
    assert.equal(spVertMid.rect.top, 90);

    // Default buffer constructors, bad sibling/container sanitization, continue branch on wide sibling, and guide cap
    const defIdx = createSnapIndex();
    const defScratch = createSnapScratchBuffer();
    const oneGuideOut = createMutableSnapOutput(1);
    const defOut = createMutableSnapOutput();
    rebuildSnapIndex(
      defIdx,
      [
        { id: 'short-left', left: 0, top: 0, width: 10, height: 20 },
        { id: 'wide-bridge', left: 0, top: 40, width: 300, height: 20 },
        { id: 'bad-sib', left: NaN, top: Infinity, width: -5, height: NaN },
        { id: 'snap-y', left: 200, top: 200, width: 40, height: 40 },
      ],
      { id: 'bad-cont', left: NaN, top: Infinity, width: -10, height: NaN }
    );
    snapRectInto(
      { left: 202, top: 201, width: 40, height: 40 },
      defIdx,
      { thresholdScreenPx: 5, zoom: 1 },
      defScratch,
      oneGuideOut
    );
    assert.equal(oneGuideOut.guideCount, 1);

    snapRectInto(
      { left: NaN, top: Infinity, width: -2, height: -3 },
      defIdx,
      { thresholdScreenPx: NaN, zoom: -1 },
      defScratch,
      defOut
    );
    assert.equal(defOut.snappedX, false);

    assert.deepEqual(
      computeSelectionBounds([{ id: 'bad', rect: { left: NaN, top: Infinity, width: -5, height: NaN } }]),
      { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }
    );
    const distDefault = distributeRects(
      [
        { id: 'a', rect: { left: 0, top: 0, width: 10, height: 10 } },
        { id: 'b', rect: { left: 50, top: 0, width: 10, height: 10 } },
        { id: 'c', rect: { left: 80, top: 0, width: 10, height: 10 } },
      ],
      'horizontal'
    );
    assert.equal(distDefault[1].rect.left, 40);
  });
});
