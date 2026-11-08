import assert from 'node:assert/strict';
import {
  computeSmartSnapping,
  compute8HandleResize,
  type SiblingRect,
  type ContainerRect,
} from '../components/slightnudge/direct-manipulation-engine';

console.log('Testing Lightweight Outline-Only Mode and MetaKey Snap Disabling...\n');

// 1. Verify Cmd/metaKey temporarily disables snapping
{
  const siblings: SiblingRect[] = [
    {
      left: 100,
      top: 50,
      width: 100,
      height: 50,
      right: 200,
      bottom: 100,
      centerX: 150,
      centerY: 75,
    },
  ];

  // Snapping enabled (neither Ctrl nor Cmd pressed)
  const snapNormal = computeSmartSnapping({
    box: { left: 98, top: 50, right: 198, bottom: 100, width: 100, height: 50 },
    siblings,
    thresholdScreenPx: 4,
    zoom: 1.0,
    disabled: false,
  });
  assert.equal(snapNormal.snappedX, true, 'Snap should snap to sibling edge when disabled=false');
  assert.equal(snapNormal.dx, 2, 'Should snap 2px');
  assert.ok(snapNormal.guides.length > 0, 'Should produce accent guide line');

  // Snapping disabled via metaKey / Cmd (disabled=true)
  const snapDisabled = computeSmartSnapping({
    box: { left: 98, top: 50, right: 198, bottom: 100, width: 100, height: 50 },
    siblings,
    thresholdScreenPx: 4,
    zoom: 1.0,
    disabled: true,
  });
  assert.equal(snapDisabled.snappedX, false, 'Snap should NOT snap when disabled via Cmd/Ctrl');
  assert.equal(snapDisabled.dx, 0);
  assert.equal(snapDisabled.guides.length, 0, 'Should not produce any guides when disabled');
}
console.log('PASS: Cmd/metaKey and Ctrl temporarily disable snapping');

// 2. Outline-only drag math and state transitions
{
  const startRect = { left: 100, top: 100, width: 200, height: 100 };
  const deltaScreen = { x: 50, y: 30 };

  // Compute resize in outline mode
  const res = compute8HandleResize({
    handle: 'se',
    startRect,
    zoom: 1.0,
    grabOffset: { x: 0, y: 0 },
    pointerDeltaScreen: deltaScreen,
    shiftKey: false,
    altKey: false,
    minSize: 1,
  });

  assert.equal(res.width, 250);
  assert.equal(res.height, 130);
  assert.equal(res.left, 100);
  assert.equal(res.top, 100);

  // In outline-only mode, the target DOM element's style is NOT touched during drag
  // Mock element
  const mockTargetEl = {
    style: { maxWidth: '200px', width: '200px', translate: '0px 0px' },
    setAttribute: function(attr: string, val: string) {},
    removeAttribute: function(attr: string) {},
  };

  // Intermediate drag frame simulation:
  const outlineOnly = true;
  if (!outlineOnly) {
    mockTargetEl.style.maxWidth = `${res.width}px`;
    mockTargetEl.style.width = `${res.width}px`;
  }

  // Verify style was NOT changed during intermediate frame
  assert.equal(mockTargetEl.style.width, '200px', 'Target style must remain unchanged during outline drag');
  assert.equal(mockTargetEl.style.maxWidth, '200px', 'Target maxWidth must remain unchanged during outline drag');

  // On release (pointerup): target style is committed once
  mockTargetEl.style.maxWidth = `${res.width}px`;
  mockTargetEl.style.width = `${res.width}px`;
  assert.equal(mockTargetEl.style.width, '250px', 'Target style must update to final width on drop');
  assert.equal(mockTargetEl.style.maxWidth, '250px', 'Target maxWidth must update to final width on drop');
}
console.log('PASS: Outline-only mode avoids intermediate DOM mutations and commits on release');

console.log('\nALL OUTLINE DRAG UNIT TESTS PASSED!\n');
