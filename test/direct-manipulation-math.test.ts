import assert from 'node:assert/strict';
import {
  compute8HandleResize,
  computeSmartSnapping,
  computeArrowNudge,
  estimateTailwindClasses,
  type HandleDirection,
  type CachedGeometry,
  type SiblingRect,
} from '../components/slightnudge/direct-manipulation-engine';

console.log('Testing direct manipulation math and snapping...');

// 1. Anchor accuracy and 8-handle math at zoom 25%, 50%, 100%, 200%, 400%
const startRect = { left: 100, top: 100, width: 200, height: 100 };
const zooms = [0.25, 0.5, 1.0, 2.0, 4.0];
const handles: HandleDirection[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

for (const zoom of zooms) {
  for (const handle of handles) {
    // Pointer down at the handle position with a 3px cursor grab offset
    const grabOffsetX = 3;
    const grabOffsetY = -2;
    const pointerDeltaScreenX = 40;
    const pointerDeltaScreenY = 30;

    const result = compute8HandleResize({
      handle,
      startRect,
      zoom,
      grabOffset: { x: grabOffsetX, y: grabOffsetY },
      pointerDeltaScreen: { x: pointerDeltaScreenX, y: pointerDeltaScreenY },
      shiftKey: false,
      altKey: false,
      snapX: null,
      snapY: null,
      minSize: 1,
    });

    // Check minimum size constraint
    assert.ok(result.width >= 1, `Width must be >= 1px at zoom ${zoom} for ${handle}`);
    assert.ok(result.height >= 1, `Height must be >= 1px at zoom ${zoom} for ${handle}`);

    // If handle is 'e' (east), height should not change
    if (handle === 'e') {
      assert.equal(result.height, startRect.height);
      const expectedWidth = startRect.width + pointerDeltaScreenX / zoom;
      assert.ok(Math.abs(result.width - expectedWidth) < 0.001);
    }

    // If handle is 's' (south), width should not change
    if (handle === 's') {
      assert.equal(result.width, startRect.width);
      const expectedHeight = startRect.height + pointerDeltaScreenY / zoom;
      assert.ok(Math.abs(result.height - expectedHeight) < 0.001);
    }
  }
}
console.log('PASS: 8-handle resize math across zooms 25% - 400%');

// 2. Shift maintains aspect ratio
{
  const aspectRatio = startRect.width / startRect.height; // 2.0
  const result = compute8HandleResize({
    handle: 'se',
    startRect,
    zoom: 1.0,
    grabOffset: { x: 0, y: 0 },
    pointerDeltaScreen: { x: 50, y: 10 },
    shiftKey: true,
    altKey: false,
    snapX: null,
    snapY: null,
    minSize: 1,
  });

  const resultingRatio = result.width / result.height;
  assert.ok(
    Math.abs(resultingRatio - aspectRatio) < 0.01,
    `Shift must preserve aspect ratio: expected ${aspectRatio}, got ${resultingRatio}`
  );
}
console.log('PASS: Shift maintains aspect ratio');

// 3. Alt resizes from center
{
  const result = compute8HandleResize({
    handle: 'e',
    startRect,
    zoom: 1.0,
    grabOffset: { x: 0, y: 0 },
    pointerDeltaScreen: { x: 40, y: 0 },
    shiftKey: false,
    altKey: true,
    snapX: null,
    snapY: null,
    minSize: 1,
  });

  // When Alt is pressed, expanding right by 40px also expands left by 40px -> total width delta = 80px, left position shifts by -40px
  assert.equal(result.width, startRect.width + 80);
  assert.equal(result.left, startRect.left - 40);
}
console.log('PASS: Alt resizes from center');

// 4. Minimum size clamp to 1px
{
  const result = compute8HandleResize({
    handle: 'se',
    startRect,
    zoom: 1.0,
    grabOffset: { x: 0, y: 0 },
    pointerDeltaScreen: { x: -500, y: -500 },
    shiftKey: false,
    altKey: false,
    snapX: null,
    snapY: null,
    minSize: 1,
  });

  assert.equal(result.width, 1);
  assert.equal(result.height, 1);
}
console.log('PASS: Minimum size clamp to 1 px');

// 5. Arrow key nudge
{
  const base = { x: 10, y: 20 };
  assert.deepEqual(computeArrowNudge(base, 'ArrowRight', false), { x: 11, y: 20 });
  assert.deepEqual(computeArrowNudge(base, 'ArrowLeft', false), { x: 9, y: 20 });
  assert.deepEqual(computeArrowNudge(base, 'ArrowDown', false), { x: 10, y: 21 });
  assert.deepEqual(computeArrowNudge(base, 'ArrowUp', false), { x: 10, y: 19 });

  // Shift nudges by 10
  assert.deepEqual(computeArrowNudge(base, 'ArrowRight', true), { x: 20, y: 20 });
  assert.deepEqual(computeArrowNudge(base, 'ArrowLeft', true), { x: 0, y: 20 });
  assert.deepEqual(computeArrowNudge(base, 'ArrowDown', true), { x: 10, y: 30 });
  assert.deepEqual(computeArrowNudge(base, 'ArrowUp', true), { x: 10, y: 10 });
}
console.log('PASS: Arrow key nudges (1px normal, 10px with Shift)');

// 6. Smart snapping & guides performance benchmark (< 1 ms for 50 siblings)
{
  // Generate 50 realistic sibling rects
  const siblings: SiblingRect[] = [];
  for (let i = 0; i < 50; i++) {
    siblings.push({
      left: (i % 5) * 120 + 20,
      top: Math.floor(i / 5) * 80 + 30,
      width: 100,
      height: 60,
      right: (i % 5) * 120 + 120,
      bottom: Math.floor(i / 5) * 80 + 90,
      centerX: (i % 5) * 120 + 70,
      centerY: Math.floor(i / 5) * 80 + 60,
    });
  }

  const containerRect = { left: 0, top: 0, right: 800, bottom: 1200, width: 800, height: 1200 };

  // Run 1000 iterations to measure average execution time
  const iterations = 1000;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    computeSmartSnapping({
      box: { left: 142, top: 112, right: 342, bottom: 212, width: 200, height: 100 },
      siblings,
      containerRect,
      thresholdScreenPx: 4,
      zoom: 1.0,
      disabled: false,
    });
  }
  const elapsedMs = performance.now() - start;
  const avgMsPerFrame = elapsedMs / iterations;

  console.log(`Smart snapping 50 siblings avg time: ${avgMsPerFrame.toFixed(4)} ms per frame`);
  assert.ok(
    avgMsPerFrame <= 1.0,
    `Smart snapping computation MUST run in at most 1 ms per frame for 50 siblings (was ${avgMsPerFrame.toFixed(4)} ms)`
  );

  // Test snap accuracy: target within 3px of sibling edge (140 vs 142)
  const snapResult = computeSmartSnapping({
    box: { left: 142, top: 112, right: 342, bottom: 212, width: 200, height: 100 },
    siblings,
    containerRect,
    thresholdScreenPx: 4,
    zoom: 1.0,
    disabled: false,
  });

  assert.equal(snapResult.snappedX, true);
  assert.ok(snapResult.guides.length > 0, 'Snap must produce visual guide coordinates');
  assert.equal(snapResult.guides[0].type, 'vertical');

  // When disabled (Ctrl/Cmd pressed):
  const disabledSnap = computeSmartSnapping({
    box: { left: 142, top: 112, right: 342, bottom: 212, width: 200, height: 100 },
    siblings,
    containerRect,
    thresholdScreenPx: 4,
    zoom: 1.0,
    disabled: true,
  });
  assert.equal(disabledSnap.snappedX, false);
  assert.equal(disabledSnap.guides.length, 0);
}
console.log('PASS: Smart snapping accuracy, guide production, and <1ms performance on 50 siblings');

// 7. Tailwind lookup table (client-side only, no server request)
{
  const estimate = estimateTailwindClasses(384, 16);
  assert.equal(typeof estimate.widthClass, 'string');
  assert.ok(estimate.widthClass.startsWith('w-') || estimate.widthClass.startsWith('max-w-'));
}
console.log('PASS: Client-side Tailwind class lookup table');

console.log('\nALL DIRECT MANIPULATION MATH TESTS PASSED!\n');
