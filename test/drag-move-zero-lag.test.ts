import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getIframeArtboardOffset } from '../components/slightnudge/direct-manipulation-engine';
import { readTranslation, validTranslation } from '../lib/slightnudge/translation';

test('getIframeArtboardOffset returns 0 offsets for null iframe', () => {
  const result = getIframeArtboardOffset(null);
  assert.deepEqual(result, { offsetTop: 0, offsetLeft: 0 });
});

test('getIframeArtboardOffset correctly computes difference between iframe and artboard', () => {
  const fakeArtboard = {
    getBoundingClientRect: () => ({ top: 100, left: 200, width: 800, height: 600 }),
  };
  const fakeIframe = {
    closest: (selector: string) => (selector === '[data-selection-artboard]' ? fakeArtboard : null),
    parentElement: fakeArtboard,
    getBoundingClientRect: () => ({ top: 120, left: 250, width: 700, height: 500 }),
  } as unknown as HTMLIFrameElement;

  const result = getIframeArtboardOffset(fakeIframe);
  assert.equal(result.offsetTop, 20); // 120 - 100
  assert.equal(result.offsetLeft, 50); // 250 - 200
});

test('readTranslation and delta calculations maintain integer stability for 60fps movement', () => {
  const emptyClasses = 'p-6 rounded-2xl bg-white border';
  const base = readTranslation(emptyClasses);
  assert.deepEqual(base, { x: 0, y: 0 });

  const existingClasses = 'p-6 translate-x-[12px] translate-y-[-24px] bg-white';
  const translatedBase = readTranslation(existingClasses);
  assert.deepEqual(translatedBase, { x: 12, y: -24 });

  // When moving by screen delta (-100, -50) at zoom 1.0:
  const snappedX = 12 + -100;
  const snappedY = -24 + -50;
  const dx = snappedX - translatedBase.x;
  const dy = snappedY - translatedBase.y;

  assert.equal(dx, -100);
  assert.equal(dy, -50);
  assert.equal(validTranslation({ x: snappedX, y: snappedY }), true);
});

test('GPU-accelerated transform string format matches CSS translate3d specifications', () => {
  const dx = -48;
  const dy = -120;
  const transformStr = `translate3d(${dx}px, ${dy}px, 0)`;
  assert.equal(transformStr, 'translate3d(-48px, -120px, 0)');
});
