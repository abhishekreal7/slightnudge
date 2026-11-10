import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fc from 'fast-check';
import {
  degToRad,
  getHandleLocalPoint,
  getHandleScreenPoint,
  matCompose,
  matRotate,
  matScale,
  matSkew,
  matTranslate,
  nearEqual,
  screenDeltaToElementLocalDelta,
  solveResize,
  vecDist,
  type HandleId,
  type Matrix2D,
} from '../../lib/editor/geometry';

const SEED_HANDLE_UNDER_CURSOR = 2026111011;
const SEED_RESIZE_REVERSE = 2026111012;
const SEED_DEGENERATE = 2026111013;

const ALL_HANDLES: readonly HandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const CORNER_HANDLES: readonly HandleId[] = ['nw', 'ne', 'se', 'sw'];

const arbFinite = (min: number, max: number) =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

describe('resize solver', () => {
  it('supports all 8 handles with unconstrained identity-transform deltas', () => {
    const startRect = { left: 100, top: 200, width: 160, height: 80 };

    const se = solveResize({ startRect, handle: 'se', pointerDeltaScreen: { x: 40, y: 20 } });
    assert.deepEqual(se.rect, { left: 100, top: 200, right: 300, bottom: 300, width: 200, height: 100 });

    const nw = solveResize({ startRect, handle: 'nw', pointerDeltaScreen: { x: -30, y: -10 } });
    assert.deepEqual(nw.rect, { left: 70, top: 190, right: 260, bottom: 280, width: 190, height: 90 });

    const ne = solveResize({ startRect, handle: 'ne', pointerDeltaScreen: { x: 20, y: 15 } });
    assert.deepEqual(ne.rect, { left: 100, top: 215, right: 280, bottom: 280, width: 180, height: 65 });

    const sw = solveResize({ startRect, handle: 'sw', pointerDeltaScreen: { x: 10, y: 30 } });
    assert.deepEqual(sw.rect, { left: 110, top: 200, right: 260, bottom: 310, width: 150, height: 110 });

    const e = solveResize({ startRect, handle: 'e', pointerDeltaScreen: { x: 25, y: 99 } });
    assert.deepEqual(e.rect, { left: 100, top: 200, right: 285, bottom: 280, width: 185, height: 80 });

    const w = solveResize({ startRect, handle: 'w', pointerDeltaScreen: { x: -15, y: 99 } });
    assert.deepEqual(w.rect, { left: 85, top: 200, right: 260, bottom: 280, width: 175, height: 80 });

    const n = solveResize({ startRect, handle: 'n', pointerDeltaScreen: { x: 99, y: 12 } });
    assert.deepEqual(n.rect, { left: 100, top: 212, right: 260, bottom: 280, width: 160, height: 68 });

    const s = solveResize({ startRect, handle: 's', pointerDeltaScreen: { x: 99, y: -20 } });
    assert.deepEqual(s.rect, { left: 100, top: 200, right: 260, bottom: 260, width: 160, height: 60 });
  });

  it('enforces minimum size 1px and optional maximum bounds without moving the anchored opposite edge', () => {
    const startRect = { left: 50, top: 60, width: 100, height: 80 };
    const shrinkNw = solveResize({
      startRect,
      handle: 'nw',
      pointerDeltaScreen: { x: 500, y: 500 },
    });
    assert.equal(shrinkNw.rect.width, 1);
    assert.equal(shrinkNw.rect.height, 1);
    assert.equal(shrinkNw.rect.right, 150);
    assert.equal(shrinkNw.rect.bottom, 140);
    assert.equal(shrinkNw.clamped.minWidth, true);
    assert.equal(shrinkNw.clamped.minHeight, true);

    const growSe = solveResize({
      startRect,
      handle: 'se',
      pointerDeltaScreen: { x: 500, y: 500 },
      constraints: { maxWidth: 220, maxHeight: 150 },
    });
    assert.equal(growSe.rect.width, 220);
    assert.equal(growSe.rect.height, 150);
    assert.equal(growSe.rect.left, 50);
    assert.equal(growSe.rect.top, 60);
    assert.equal(growSe.clamped.maxWidth, true);
    assert.equal(growSe.clamped.maxHeight, true);
  });

  it('preserves aspect ratio on corner and edge drags including min/max clamping', () => {
    const startRect = { left: 100, top: 100, width: 200, height: 100 }; // ratio 2:1
    const corner = solveResize({
      startRect,
      handle: 'se',
      pointerDeltaScreen: { x: 80, y: 10 },
      constraints: { aspectRatio: true },
    });
    assert.ok(nearEqual(corner.rect.width / corner.rect.height, 2.0, 1e-6));
    assert.equal(corner.rect.width, 280);
    assert.equal(corner.rect.height, 140);

    const cornerNw = solveResize({
      startRect,
      handle: 'nw',
      pointerDeltaScreen: { x: -40, y: 5 },
      constraints: { aspectRatio: true },
    });
    assert.ok(nearEqual(cornerNw.rect.width / cornerNw.rect.height, 2.0, 1e-6));
    assert.equal(cornerNw.rect.right, 300);
    assert.equal(cornerNw.rect.bottom, 200);

    const edge = solveResize({
      startRect,
      handle: 'e',
      pointerDeltaScreen: { x: 40, y: 0 },
      constraints: { aspectRatio: true },
    });
    assert.equal(edge.rect.width, 240);
    assert.equal(edge.rect.height, 120);
    assert.equal(edge.rect.top, 90);
  });

  it('resizes symmetrically around center when fromCenter is true', () => {
    const startRect = { left: 100, top: 100, width: 200, height: 100 };
    const res = solveResize({
      startRect,
      handle: 'se',
      pointerDeltaScreen: { x: 30, y: 15 },
      constraints: { fromCenter: true },
    });
    assert.equal(res.rect.width, 260);
    assert.equal(res.rect.height, 130);
    assert.equal(res.rect.left, 70);
    assert.equal(res.rect.top, 85);
    assert.ok(nearEqual(res.rect.left + res.rect.width / 2, 200));
    assert.ok(nearEqual(res.rect.top + res.rect.height / 2, 150));
  });

  it('resizes accurately in local axes for rotated, scaled, and negative-flipped elements', () => {
    const startRect = { left: 0, top: 0, width: 120, height: 60 };
    // Element rotated 90 deg around origin + zoomed 2x
    const rotMatrix = matCompose(matScale(2, 2), matRotate(degToRad(90)));
    // Local 'e' points visually DOWN (+Y screen). Dragging screen +40 Y should widen local box by 40/2 = 20!
    const rotated = solveResize({
      startRect,
      handle: 'e',
      pointerDeltaScreen: { x: 0, y: 40 },
      elementToScreen: rotMatrix,
    });
    assert.ok(nearEqual(rotated.rect.width, 140, 1e-6));
    assert.ok(nearEqual(rotated.rect.height, 60, 1e-6));

    // Flipped horizontally: scaleX(-1). Local 'se' is visually bottom-left.
    // Dragging cursor visually RIGHT (+30 screen X) means deltaLocal.x = -30 -> 'se' edge moves -30 -> width decreases by 30
    const flipMatrix = matScale(-1, 1);
    const flipped = solveResize({
      startRect,
      handle: 'se',
      pointerDeltaScreen: { x: 30, y: 10 },
      elementToScreen: flipMatrix,
    });
    assert.ok(nearEqual(flipped.rect.width, 90, 1e-6));
    assert.ok(nearEqual(flipped.rect.height, 70, 1e-6));
    const startHScreen = getHandleScreenPoint(startRect, 'se', flipMatrix);
    assert.ok(nearEqual(flipped.handlePointScreen.x, startHScreen.x + 30, 1e-6));
    assert.ok(nearEqual(flipped.handlePointScreen.y, startHScreen.y + 10, 1e-6));
  });

  it('handles zero-size, NaN, and singular matrix inputs without NaN or Infinity', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_HANDLES),
        fc.oneof(fc.constant(0), fc.constant(-10), fc.constant(NaN), arbFinite(-200, 200)),
        fc.oneof(fc.constant(0), fc.constant(-10), fc.constant(NaN), arbFinite(-200, 200)),
        fc.oneof(fc.constant(NaN), fc.constant(Infinity), arbFinite(-500, 500)),
        (handle, w, h, dx) => {
          const singular: Matrix2D = [0, 0, 0, 0, 10, 20];
          const res = solveResize({
            startRect: { left: 10, top: 20, width: w, height: h },
            handle,
            pointerDeltaScreen: { x: dx, y: dx },
            elementToScreen: singular,
          });
          for (const val of [
            res.rect.left,
            res.rect.top,
            res.rect.width,
            res.rect.height,
            res.handlePointScreen.x,
            res.handlePointScreen.y,
          ]) {
            assert.ok(Number.isFinite(val), `Output value must be finite, got ${val}`);
          }
          assert.ok(res.rect.width >= 1);
          assert.ok(res.rect.height >= 1);
        }
      ),
      { seed: SEED_DEGENERATE, numRuns: 100 }
    );
  });

  it('property: grabbed handle stays exactly under the cursor at zoom 0.25..4 with random transforms', () => {
    fc.assert(
      fc.property(
        fc.record({
          left: arbFinite(0, 400),
          top: arbFinite(0, 400),
          width: arbFinite(120, 400),
          height: arbFinite(120, 300),
        }),
        fc.constantFrom(...CORNER_HANDLES),
        arbFinite(0.25, 4),
        fc.record({
          tx: arbFinite(-200, 200),
          ty: arbFinite(-200, 200),
          sx: fc.oneof(arbFinite(0.5, 2.5), arbFinite(-2.5, -0.5)),
          sy: fc.oneof(arbFinite(0.5, 2.5), arbFinite(-2.5, -0.5)),
          rot: arbFinite(-Math.PI, Math.PI),
          skewX: arbFinite(-0.35, 0.35),
        }),
        arbFinite(-15, 15),
        arbFinite(-15, 15),
        (startRect, handle, zoom, t, dx, dy) => {
          const elementToScreen = matCompose(
            matScale(zoom, zoom),
            matTranslate(t.tx, t.ty),
            matRotate(t.rot),
            matSkew(t.skewX, 0),
            matScale(t.sx, t.sy)
          );
          const beforeScreen = getHandleScreenPoint(startRect, handle, elementToScreen);
          const res = solveResize({
            startRect,
            handle,
            pointerDeltaScreen: { x: dx, y: dy },
            elementToScreen,
          });
          // Only assert cursor lock when min/max clamps weren't hit
          if (!res.clamped.minWidth && !res.clamped.maxWidth && !res.clamped.minHeight && !res.clamped.maxHeight) {
            const targetScreen = { x: beforeScreen.x + dx, y: beforeScreen.y + dy };
            const dist = vecDist(res.handlePointScreen, targetScreen);
            assert.ok(
              dist < 1e-5,
              `Grabbed handle ${handle} drifted ${dist}px from cursor at zoom=${zoom}`
            );
          }

          // Also check edge handles along their active local axis
          for (const edge of ['e', 'w', 'n', 's'] as const) {
            const eRes = solveResize({
              startRect,
              handle: edge,
              pointerDeltaScreen: { x: dx, y: dy },
              elementToScreen,
            });
            if (!eRes.clamped.minWidth && !eRes.clamped.minHeight) {
              const dLocal = screenDeltaToElementLocalDelta({ x: dx, y: dy }, elementToScreen);
              assert.ok(dLocal !== null);
              const startLocal = getHandleLocalPoint(startRect, edge);
              const afterLocal = getHandleLocalPoint(eRes.rect, edge);
              if (edge === 'e' || edge === 'w') {
                assert.ok(nearEqual(afterLocal.x, startLocal.x + dLocal.x, 1e-5));
              } else {
                assert.ok(nearEqual(afterLocal.y, startLocal.y + dLocal.y, 1e-5));
              }
            }
          }
        }
      ),
      { seed: SEED_HANDLE_UNDER_CURSOR, numRuns: 300 }
    );
  });

  it('property: resize then reverse resize is identity when unclamped', () => {
    fc.assert(
      fc.property(
        fc.record({
          left: arbFinite(-100, 300),
          top: arbFinite(-100, 300),
          width: arbFinite(150, 400),
          height: arbFinite(150, 400),
        }),
        fc.constantFrom(...ALL_HANDLES),
        fc.boolean(),
        arbFinite(0.25, 4),
        arbFinite(-Math.PI, Math.PI),
        arbFinite(-30, 30),
        arbFinite(-30, 30),
        (startRect, handle, fromCenter, zoom, rot, dx, dy) => {
          const elementToScreen = matCompose(matScale(zoom, zoom), matRotate(rot), matScale(1, -1));
          const step1 = solveResize({
            startRect,
            handle,
            pointerDeltaScreen: { x: dx, y: dy },
            elementToScreen,
            constraints: { fromCenter },
          });
          if (step1.clamped.minWidth || step1.clamped.minHeight) return;
          const step2 = solveResize({
            startRect: step1.rect,
            handle,
            pointerDeltaScreen: { x: -dx, y: -dy },
            elementToScreen,
            constraints: { fromCenter },
          });
          assert.ok(nearEqual(step2.rect.left, startRect.left, 1e-5));
          assert.ok(nearEqual(step2.rect.top, startRect.top, 1e-5));
          assert.ok(nearEqual(step2.rect.width, startRect.width, 1e-5));
          assert.ok(nearEqual(step2.rect.height, startRect.height, 1e-5));
        }
      ),
      { seed: SEED_RESIZE_REVERSE, numRuns: 300 }
    );
  });

  it('covers snap overrides, vertical aspect lock, explicit ratio, conflicting min/max, and non-finite guards', () => {
    const startRect = { left: 100, top: 100, width: 200, height: 100 };

    // snapLocalX / snapLocalY on e/w and n/s
    const snapE = solveResize({
      startRect,
      handle: 'e',
      pointerDeltaScreen: { x: 10, y: 0 },
      constraints: { snapLocalX: 350 },
    });
    assert.equal(snapE.rect.right, 350);

    const snapW = solveResize({
      startRect,
      handle: 'w',
      pointerDeltaScreen: { x: -10, y: 0 },
      constraints: { snapLocalX: 80 },
    });
    assert.equal(snapW.rect.left, 80);

    const snapN = solveResize({
      startRect,
      handle: 'n',
      pointerDeltaScreen: { x: 0, y: -10 },
      constraints: { snapLocalY: 70 },
    });
    assert.equal(snapN.rect.top, 70);

    const snapS = solveResize({
      startRect,
      handle: 's',
      pointerDeltaScreen: { x: 0, y: 10 },
      constraints: { snapLocalY: 240 },
    });
    assert.equal(snapS.rect.bottom, 240);

    // Vertical edge & dominant-Y corner with explicit numeric aspect ratio
    const verticalAspect = solveResize({
      startRect,
      handle: 's',
      pointerDeltaScreen: { x: 0, y: 50 },
      constraints: { aspectRatio: 1.5 },
    });
    assert.equal(verticalAspect.rect.height, 150);
    assert.equal(verticalAspect.rect.width, 225);

    const yDominantCorner = solveResize({
      startRect,
      handle: 'se',
      pointerDeltaScreen: { x: 5, y: 100 },
      constraints: { aspectRatio: true },
    });
    assert.equal(yDominantCorner.rect.height, 200);
    assert.equal(yDominantCorner.rect.width, 400);

    // Contradictory constraints under aspect ratio (effMinW > effMaxW fallback)
    const contradictory = solveResize({
      startRect,
      handle: 'se',
      pointerDeltaScreen: { x: 50, y: 50 },
      constraints: { aspectRatio: 2, minWidth: 100, maxWidth: 120, minHeight: 90, maxHeight: 100 },
    });
    assert.ok(contradictory.rect.width >= 100 && contradictory.rect.width <= 120);
    assert.ok(contradictory.rect.height >= 90 && contradictory.rect.height <= 100);

    // fromCenter with nw/w/n handles
    const nwCenter = solveResize({
      startRect,
      handle: 'nw',
      pointerDeltaScreen: { x: -20, y: -10 },
      constraints: { fromCenter: true },
    });
    assert.equal(nwCenter.rect.width, 240);
    assert.equal(nwCenter.rect.height, 120);

    // Default matrix in getHandleScreenPoint + non-finite matrix/startRect fallback
    assert.deepEqual(getHandleScreenPoint(startRect, 'nw'), { x: 100, y: 100 });
    assert.deepEqual(getHandleScreenPoint(startRect, 'se', [NaN, 0, 0, 1, 0, 0]), { x: 300, y: 200 });
    const badRes = solveResize({
      startRect: { left: NaN, top: NaN, width: 50, height: 50 },
      handle: 'ne',
      pointerDeltaScreen: { x: 10, y: -10 },
      elementToScreen: [NaN, 0, 0, 1, 0, 0],
      constraints: { minWidth: NaN, minHeight: NaN, maxWidth: NaN, maxHeight: NaN, aspectRatio: -1 },
    });
    assert.equal(badRes.degenerate, true);
    assert.ok(Number.isFinite(badRes.rect.left));
  });
});
