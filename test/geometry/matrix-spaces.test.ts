import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import fc from 'fast-check';
import {
  IDENTITY_MATRIX,
  buildElementToScreenMatrix,
  canvasToElementLocalPoint,
  canvasToScreenMatrix,
  canvasToScreenPoint,
  cssPxToDevicePx,
  degToRad,
  devicePxToCssPx,
  elementLocalToCanvasPoint,
  elementLocalToScreenPoint,
  elementLocalTransformMatrix,
  matCompose,
  matDecompose,
  matDeterminant,
  matIdentity,
  matInvert,
  matIsInvertible,
  matMultiply,
  matRecompose,
  matRotate,
  matScale,
  matSkew,
  matTranslate,
  matWithOrigin,
  nearEqual,
  normalizeRect,
  predictElementScreenRect,
  quadBounds,
  quadContainsPoint,
  radToDeg,
  rectCorners,
  rectIntersects,
  roundPoint,
  roundRect,
  roundValue,
  screenDeltaToElementLocalDelta,
  screenToCanvasPoint,
  screenToElementLocalPoint,
  snapCssToDevicePixelGrid,
  transformPoint,
  transformRectBounds,
  transformRectToQuad,
  transformVector,
  vecAdd,
  vecCross,
  vecDist,
  vecDot,
  vecLen,
  vecScale,
  vecSub,
  type CanvasSpace,
  type ElementTransformFrame,
  type Matrix2D,
} from '../../lib/editor/geometry';

const SEED_MAT_ASSOC = 2026111001;
const SEED_MAT_INV = 2026111002;
const SEED_MAT_DECOMP = 2026111003;
const SEED_SPACES_ROUNDTRIP = 2026111004;

const arbFinite = (min: number, max: number) =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

const arbInvertibleTransform = fc.record({
  tx: arbFinite(-500, 500),
  ty: arbFinite(-500, 500),
  sx: fc.oneof(arbFinite(0.25, 4), arbFinite(-4, -0.25)),
  sy: fc.oneof(arbFinite(0.25, 4), arbFinite(-4, -0.25)),
  rot: arbFinite(-Math.PI, Math.PI),
  skewX: arbFinite(-0.5, 0.5),
});

function buildSampleMatrix(spec: {
  tx: number;
  ty: number;
  sx: number;
  sy: number;
  rot: number;
  skewX: number;
}): Matrix2D {
  return matCompose(
    matTranslate(spec.tx, spec.ty),
    matRotate(spec.rot),
    matSkew(spec.skewX, 0),
    matScale(spec.sx, spec.sy)
  );
}

describe('lib/editor/geometry purity & constraints', () => {
  it('contains zero React, DOM, engine, Date, Math.random, any, or ts-ignore', () => {
    const geomDir = path.resolve(process.cwd(), 'lib', 'editor', 'geometry');
    const files = fs.readdirSync(geomDir).filter((f) => f.endsWith('.ts'));
    assert.ok(files.length >= 6);
    for (const file of files) {
      const content = fs.readFileSync(path.join(geomDir, file), 'utf8');
      assert.equal(/from ['"]react/.test(content), false, `${file} must not import React`);
      assert.equal(/lib\/slightnudge/.test(content), false, `${file} must not reference lib/slightnudge`);
      assert.equal(/\b(window|document|HTMLElement|Element|DOMRect)\b/.test(content), false, `${file} must not reference DOM globals`);
      assert.equal(/\bnew\s+Date\b|\bDate\.now\b/.test(content), false, `${file} must not use Date`);
      assert.equal(/\bMath\.random\b/.test(content), false, `${file} must not use Math.random`);
      assert.equal(/@ts-ignore|@ts-nocheck|@ts-expect-error/.test(content), false, `${file} must not use ts-ignore`);
      assert.equal(/:\s*any\b|\bas\s+any\b/.test(content), false, `${file} must not use any`);
    }
  });
});

describe('vec, rect, rounding, and 2D affine matrix primitives', () => {
  it('computes basic vector operations accurately', () => {
    assert.deepEqual(vecAdd({ x: 1.5, y: -2 }, { x: 2.5, y: 5 }), { x: 4, y: 3 });
    assert.deepEqual(vecSub({ x: 4, y: 3 }, { x: 1, y: 5 }), { x: 3, y: -2 });
    assert.deepEqual(vecScale({ x: 2, y: -3 }, 1.5), { x: 3, y: -4.5 });
    assert.equal(vecDot({ x: 3, y: 4 }, { x: 2, y: -1 }), 2);
    assert.equal(vecCross({ x: 3, y: 0 }, { x: 0, y: 4 }), 12);
    assert.equal(vecLen({ x: 3, y: 4 }), 5);
    assert.equal(vecDist({ x: 1, y: 2 }, { x: 4, y: 6 }), 5);
    assert.equal(nearEqual(radToDeg(degToRad(45)), 45, 1e-12), true);
  });

  it('enforces explicit rounding policy and handles negative/fractional values deterministically', () => {
    assert.equal(roundValue(12.345, 'none'), 12.345);
    assert.equal(roundValue(12.5, 'half-away-from-zero'), 13);
    assert.equal(roundValue(-12.5, 'half-away-from-zero'), -13);
    assert.equal(roundValue(12.3, 'floor', 1), 12);
    assert.equal(roundValue(12.3, 'ceil', 1), 13);
    assert.equal(roundValue(12.37, 'nearest', 0.25), 12.25);
    assert.deepEqual(roundPoint({ x: 1.49, y: -1.5 }, 'half-away-from-zero'), { x: 1, y: -2 });
    assert.deepEqual(
      roundRect({ left: 10.6, top: -3.2, width: 20.4, height: 15.5 }, 'nearest', 0.5),
      { left: 10.5, top: -3, right: 31, bottom: 12.5, width: 20.5, height: 15.5 }
    );
    assert.deepEqual(normalizeRect({ left: 100, top: 80, width: -20, height: -10 }), {
      left: 80,
      top: 70,
      right: 100,
      bottom: 80,
      width: 20,
      height: 10,
    });
  });

  it('handles singular and non-invertible matrices without NaN', () => {
    const singular: Matrix2D = [2, 4, 1, 2, 10, 20]; // det = 0
    assert.equal(matDeterminant(singular), 0);
    assert.equal(matIsInvertible(singular), false);
    assert.equal(matInvert(singular), null);

    const zeroScale = matScale(0, 5);
    assert.equal(matIsInvertible(zeroScale), false);
    assert.equal(matInvert(zeroScale), null);

    const nonFinite: Matrix2D = [NaN, 0, 0, 1, 0, 0];
    assert.equal(matIsInvertible(nonFinite), false);
    assert.equal(matInvert(nonFinite), null);
  });

  it('transforms rects to quads, computes AABB, intersection, and point containment', () => {
    const r = { left: 10, top: 20, width: 100, height: 40 };
    const m = matRotate(degToRad(90), 10, 20);
    const q = transformRectToQuad(m, r);
    // Rotating 90deg clockwise around (10,20): (110,20) -> (10,120), (10,60) -> (-30,20)
    assert.ok(nearEqual(q.nw.x, 10, 1e-6) && nearEqual(q.nw.y, 20, 1e-6));
    assert.ok(nearEqual(q.ne.x, 10, 1e-6) && nearEqual(q.ne.y, 120, 1e-6));
    assert.ok(nearEqual(q.sw.x, -30, 1e-6) && nearEqual(q.sw.y, 20, 1e-6));

    const bounds = transformRectBounds(m, r);
    assert.ok(nearEqual(bounds.left, -30, 1e-6));
    assert.ok(nearEqual(bounds.top, 20, 1e-6));
    assert.ok(nearEqual(bounds.width, 40, 1e-6));
    assert.ok(nearEqual(bounds.height, 100, 1e-6));

    assert.equal(quadContainsPoint(q, { x: -10, y: 60 }), true);
    assert.equal(quadContainsPoint(q, { x: 25, y: 60 }), false);
    assert.equal(rectIntersects(r, { left: 109, top: 59, width: 10, height: 10 }), true);
    assert.equal(rectIntersects(r, { left: 111, top: 59, width: 10, height: 10 }), false);
    assert.deepEqual(quadBounds(rectCorners(r)), {
      left: 10,
      top: 20,
      right: 110,
      bottom: 60,
      width: 100,
      height: 40,
    });
  });

  it('respects matrix order (matMultiply(A, B) applies B then A)', () => {
    const translateFirst = matMultiply(matScale(2, 2), matTranslate(10, 0));
    // T(10,0) -> (10,0), then S(2,2) -> (20,0)
    assert.deepEqual(transformPoint(translateFirst, { x: 0, y: 0 }), { x: 20, y: 0 });
    assert.deepEqual(transformVector(translateFirst, { x: 5, y: 3 }), { x: 10, y: 6 });

    const scaleFirst = matMultiply(matTranslate(10, 0), matScale(2, 2));
    // S(2,2) on (5,0) -> (10,0), then T(10,0) -> (20,0); on (0,0) -> (10,0)
    assert.deepEqual(transformPoint(scaleFirst, { x: 0, y: 0 }), { x: 10, y: 0 });
    assert.deepEqual(transformPoint(matWithOrigin(50, 50, matScale(2, 2)), { x: 60, y: 50 }), { x: 70, y: 50 });
  });

  it('property: matrix inverse round-trips M * M^-1 = I and transforms revert accurately', () => {
    fc.assert(
      fc.property(
        arbInvertibleTransform,
        fc.record({ x: arbFinite(-1000, 1000), y: arbFinite(-1000, 1000) }),
        (spec, pt) => {
          const m = buildSampleMatrix(spec);
          assert.equal(matIsInvertible(m), true);
          const inv = matInvert(m);
          assert.ok(inv !== null);
          const prod = matMultiply(m, inv);
          for (let i = 0; i < 6; i++) {
            assert.ok(nearEqual(prod[i], IDENTITY_MATRIX[i], 1e-6), `Entry ${i} diverged: ${prod[i]}`);
          }
          const tp = transformPoint(m, pt);
          const back = transformPoint(inv, tp);
          assert.ok(nearEqual(back.x, pt.x, 1e-5) && nearEqual(back.y, pt.y, 1e-5));
        }
      ),
      { seed: SEED_MAT_INV, numRuns: 300 }
    );
  });

  it('property: transform composition is associative (A * B) * C == A * (B * C)', () => {
    fc.assert(
      fc.property(arbInvertibleTransform, arbInvertibleTransform, arbInvertibleTransform, (a, b, c) => {
        const A = buildSampleMatrix(a);
        const B = buildSampleMatrix(b);
        const C = buildSampleMatrix(c);
        const leftAssoc = matMultiply(matMultiply(A, B), C);
        const rightAssoc = matMultiply(A, matMultiply(B, C));
        for (let i = 0; i < 6; i++) {
          assert.ok(
            nearEqual(leftAssoc[i], rightAssoc[i], 1e-6),
            `Associativity mismatch at [${i}]: ${leftAssoc[i]} vs ${rightAssoc[i]}`
          );
        }
      }),
      { seed: SEED_MAT_ASSOC, numRuns: 300 }
    );
  });

  it('property: matrix decompose -> recompose preserves matrix across rotation, skew, and negative flips', () => {
    fc.assert(
      fc.property(arbInvertibleTransform, (spec) => {
        const m = buildSampleMatrix(spec);
        const dec = matDecompose(m);
        const rec = matRecompose(dec);
        for (let i = 0; i < 6; i++) {
          assert.ok(
            nearEqual(rec[i], m[i], 1e-5),
            `Recompose mismatch at [${i}] for ${JSON.stringify(spec)}: ${rec[i]} vs ${m[i]}`
          );
        }
      }),
      { seed: SEED_MAT_DECOMP, numRuns: 300 }
    );
  });
});

describe('coordinate space conversions', () => {
  it('converts between canvas, screen, DPR device pixels, and element-local spaces', () => {
    const space: CanvasSpace = { originX: 120, originY: 80, panX: -20, panY: 10, zoom: 2, devicePixelRatio: 2 };
    const screenPt = canvasToScreenPoint({ x: 50, y: 25 }, space);
    assert.deepEqual(screenPt, { x: 200, y: 140 });
    assert.deepEqual(screenToCanvasPoint(screenPt, space), { x: 50, y: 25 });
    assert.deepEqual(canvasToScreenMatrix(space), [2, 0, 0, 2, 100, 90]);

    assert.equal(cssPxToDevicePx(10.5, 2), 21);
    assert.equal(devicePxToCssPx(21, 2), 10.5);
    assert.equal(snapCssToDevicePixelGrid(10.3, 2), 10.5);
  });

  it('accounts accurately for nested ancestor transforms and scroll offsets', () => {
    const space: CanvasSpace = { originX: 0, originY: 0, panX: 0, panY: 0, zoom: 1.5 };
    const parent: ElementTransformFrame = {
      offsetX: 100,
      offsetY: 50,
      width: 300,
      height: 200,
      scrollLeft: 40,
      scrollTop: 25,
      transform: matTranslate(10, 20),
      transformOrigin: { x: 0, y: 0 },
    };
    const child: ElementTransformFrame = {
      offsetX: 60,
      offsetY: 45,
      width: 80,
      height: 30,
      transform: matRotate(degToRad(90), 0, 0),
      transformOrigin: { x: 0, y: 0 },
    };

    const m = buildElementToScreenMatrix([parent, child], space, { x: 10, y: 5 });
    // parent local pos = (100+10, 50+20) = (110, 70); child offset - parent scroll = (20, 20) -> world = (130, 90)
    // Screen at zoom 1.5 minus viewportScroll (10, 5): (130*1.5 - 10, 90*1.5 - 5) = (185, 130)
    const originScreen = elementLocalToScreenPoint({ x: 0, y: 0 }, m);
    assert.ok(nearEqual(originScreen.x, 185, 1e-6));
    assert.ok(nearEqual(originScreen.y, 130, 1e-6));
    assert.ok(elementLocalTransformMatrix(child).length === 6);

    const predicted = predictElementScreenRect([parent, child], space);
    const localZero = screenToElementLocalPoint(predicted.quad.nw, predicted.matrix);
    assert.ok(localZero !== null && nearEqual(localZero.x, 0, 1e-5) && nearEqual(localZero.y, 0, 1e-5));

    const canvasPt = elementLocalToCanvasPoint({ x: 10, y: 15 }, predicted.matrix, space);
    assert.ok(canvasPt !== null);
    const backLocal = canvasToElementLocalPoint(canvasPt, predicted.matrix, space);
    assert.ok(backLocal !== null && nearEqual(backLocal.x, 10, 1e-5) && nearEqual(backLocal.y, 15, 1e-5));

    const dLocal = screenDeltaToElementLocalDelta({ x: 30, y: -15 }, predicted.matrix);
    assert.ok(dLocal !== null);
  });

  it('property: screen <-> canvas <-> element-local round-trips cleanly across zooms and nested chains', () => {
    fc.assert(
      fc.property(
        fc.record({
          originX: arbFinite(-200, 200),
          originY: arbFinite(-200, 200),
          panX: arbFinite(-200, 200),
          panY: arbFinite(-200, 200),
          zoom: arbFinite(0.25, 4),
        }),
        arbInvertibleTransform,
        arbInvertibleTransform,
        fc.record({ x: arbFinite(0, 300), y: arbFinite(0, 300) }),
        (space, t1, t2, localPt) => {
          const chain: ElementTransformFrame[] = [
            {
              offsetX: 50,
              offsetY: 30,
              width: 240,
              height: 180,
              scrollLeft: 18,
              scrollTop: 12,
              transform: buildSampleMatrix({ ...t1, tx: 0, ty: 0 }),
              transformOrigin: { x: 120, y: 90 },
            },
            {
              offsetX: 25,
              offsetY: 15,
              width: 100,
              height: 60,
              transform: buildSampleMatrix(t2),
              transformOrigin: { x: 50, y: 30 },
            },
          ];
          const m = buildElementToScreenMatrix(chain, space);
          const scr = elementLocalToScreenPoint(localPt, m);
          const backLocal = screenToElementLocalPoint(scr, m);
          assert.ok(backLocal !== null);
          assert.ok(nearEqual(backLocal.x, localPt.x, 1e-4));
          assert.ok(nearEqual(backLocal.y, localPt.y, 1e-4));

          const cPt = elementLocalToCanvasPoint(localPt, m, space);
          assert.ok(cPt !== null);
          const sFromC = canvasToScreenPoint(cPt, space);
          assert.ok(nearEqual(sFromC.x, scr.x, 1e-4) && nearEqual(sFromC.y, scr.y, 1e-4));
        }
      ),
      { seed: SEED_SPACES_ROUNDTRIP, numRuns: 250 }
    );
  });

  it('covers origin helpers, DPR grid snapping, bounds, normalization, and non-finite fallbacks', () => {
    assert.deepEqual(matIdentity(), IDENTITY_MATRIX);
    assert.equal(nearEqual(NaN, 1), false);
    assert.equal(nearEqual(1, Infinity), false);
    assert.equal(roundValue(NaN), 0);
    assert.equal(roundValue(3.7, 'none'), 3.7);
    assert.equal(roundValue(-2.5, 'half-away-from-zero', 0), -3);
    assert.equal(roundValue(2.5, 'half-away-from-zero', 1), 3);

    assert.deepEqual(normalizeRect({ left: NaN, top: NaN, width: -20, height: -10 }, 5), {
      left: -20,
      top: -10,
      right: 0,
      bottom: 0,
      width: 20,
      height: 10,
    });

    const rotOrigin = matRotate(degToRad(90), 10, 20);
    assert.ok(nearEqual(transformPoint(rotOrigin, { x: 10, y: 20 }).x, 10));
    assert.ok(nearEqual(transformPoint(rotOrigin, { x: 10, y: 20 }).y, 20));

    const scaleOrigin = matScale(2, 3, 5, 10);
    assert.deepEqual(transformPoint(scaleOrigin, { x: 5, y: 10 }), { x: 5, y: 10 });

    const skewOrigin = matSkew(degToRad(15), 0, 4, 8);
    assert.ok(nearEqual(transformPoint(skewOrigin, { x: 4, y: 8 }).x, 4));
    assert.deepEqual(matWithOrigin(0, 0, rotOrigin), rotOrigin);

    const bounds = transformRectBounds(matScale(2, 3), { left: 10, top: 20, width: 30, height: 40 });
    assert.deepEqual(bounds, { left: 20, top: 60, right: 80, bottom: 180, width: 60, height: 120 });

    assert.equal(matIsInvertible([NaN, 0, 0, 1, 0, 0]), false);
    assert.deepEqual(matDecompose([0, 0, 0, 0, NaN, NaN]), {
      translateX: 0,
      translateY: 0,
      rotateRad: 0,
      scaleX: 1,
      scaleY: 1,
      skewXRad: 0,
    });

    assert.equal(cssPxToDevicePx(10, 0), 10);
    assert.equal(devicePxToCssPx(10, NaN), 10);
    assert.equal(snapCssToDevicePixelGrid(10.33, 2), 10.5);
    assert.equal(snapCssToDevicePixelGrid(10.6, -1), 11);

    const badSpace: CanvasSpace = { originX: 0, originY: 0, panX: 10, panY: 20, zoom: 0 };
    assert.deepEqual(canvasToScreenMatrix(badSpace), [1, 0, 0, 1, 10, 20]);
    assert.equal(screenToCanvasPoint({ x: 5, y: 5 }, badSpace), null);
    assert.equal(elementLocalToCanvasPoint({ x: 0, y: 0 }, IDENTITY_MATRIX, badSpace), null);
    assert.equal(screenToElementLocalPoint({ x: 5, y: 5 }, [0, 0, 0, 0, 0, 0]), null);
    assert.equal(screenDeltaToElementLocalDelta({ x: 5, y: 5 }, [0, 0, 0, 0, 0, 0]), null);
    assert.equal(
      canvasToElementLocalPoint({ x: 5, y: 5 }, [0, 0, 0, 0, 0, 0], { originX: 0, originY: 0, panX: 0, panY: 0, zoom: 1 }),
      null
    );

    assert.equal(
      elementLocalTransformMatrix({ offsetX: 0, offsetY: 0, width: 50, height: 50, transform: [1, 0, 0, 1, 0, 0] }),
      IDENTITY_MATRIX
    );
    const emptyPred = predictElementScreenRect([], { originX: 0, originY: 0, panX: 5, panY: 7, zoom: 2 });
    assert.deepEqual(emptyPred.bounds, { left: 5, top: 7, right: 5, bottom: 7, width: 0, height: 0 });
    const overridePred = predictElementScreenRect(
      [{ offsetX: 10, offsetY: 20, width: 100, height: 50 }],
      { originX: 0, originY: 0, panX: 0, panY: 0, zoom: 1 },
      undefined,
      { left: 5, top: 5, width: 20, height: 10 }
    );
    assert.deepEqual(overridePred.bounds, { left: 15, top: 25, right: 35, bottom: 35, width: 20, height: 10 });

    // Default arguments and per-component matrix identity short-circuits
    assert.equal(roundValue(1.6), 2);
    assert.equal(roundValue(5.4, 'nearest', NaN), 5);
    assert.deepEqual(roundPoint({ x: 1.6, y: -1.4 }), { x: 2, y: -1 });
    assert.deepEqual(roundRect({ left: 1.6, top: -1.4, width: 10.6, height: -2 }), {
      left: 2,
      top: -1,
      right: 13,
      bottom: -1,
      width: 11,
      height: 0,
    });
    assert.equal(cssPxToDevicePx(10), 10);
    assert.equal(devicePxToCssPx(10), 10);
    assert.equal(snapCssToDevicePixelGrid(10.6), 11);
    assert.equal(
      screenToCanvasPoint({ x: 10, y: 10 }, { originX: 0, originY: 0, panX: 0, panY: 0, zoom: NaN }),
      null
    );
    assert.equal(
      elementLocalTransformMatrix({ offsetX: 0, offsetY: 0, width: 20, height: 10 }),
      IDENTITY_MATRIX
    );
    assert.notDeepEqual(
      elementLocalTransformMatrix({ offsetX: 0, offsetY: 0, width: 20, height: 10, transform: [1, 0, 0.25, 1, 0, 0] }),
      IDENTITY_MATRIX
    );
    assert.notDeepEqual(
      elementLocalTransformMatrix({ offsetX: 0, offsetY: 0, width: 20, height: 10, transform: [1, 0, 0, 2, 0, 0] }),
      IDENTITY_MATRIX
    );
    assert.notDeepEqual(
      elementLocalTransformMatrix({ offsetX: 0, offsetY: 0, width: 20, height: 10, transform: [1, 0, 0, 1, 5, 0] }),
      IDENTITY_MATRIX
    );
    assert.notDeepEqual(
      elementLocalTransformMatrix({ offsetX: 0, offsetY: 0, width: 20, height: 10, transform: [1, 0, 0, 1, 0, 7] }),
      IDENTITY_MATRIX
    );
    const defaultScrollMat = buildElementToScreenMatrix(
      [],
      { originX: 0, originY: 0, panX: 3, panY: 4, zoom: 1 }
    );
    assert.deepEqual(defaultScrollMat, [1, 0, 0, 1, 3, 4]);
    assert.equal(matCompose(matTranslate(1, 2), matScale(2, 3))[4], 1);
  });
});
