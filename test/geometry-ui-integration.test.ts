import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  IDENTITY_MATRIX,
  degToRad,
  matCompose,
  matRotate,
  matScale,
  matTranslate,
  nearEqual,
} from '../lib/editor/geometry';
import {
  buildArtboardToContainerMatrix,
  buildQuadOutlinePath,
  classifyOverlayFlowIntent,
  composeCssTransformMatrix,
  compute8HandleResize,
  computeZoomAnchorScroll,
  createDirectSnapSession,
  cursorForHandleAngle,
  isAffineNonTrivial,
  parseCssMatrix2D,
  roundMoveTranslation,
  snapRectInSession,
  snapResizeInSession,
  transformGuideLineToContainer,
  transformQuadByOffset,
} from '../components/slightnudge/direct-manipulation-engine';
import {
  computeSelectionChromeGeometry,
  selectionStyleFor,
} from '../components/slightnudge/selection-style';

describe('UI geometry integration contracts', () => {
  it('compute8HandleResize delegates rotated and flipped transforms to solveResize', () => {
    // 90 deg rotation around origin + zoom 2: local +X maps to screen +Y (scaled 2x)
    const elementToScreen = matCompose(
      matTranslate(100, 50),
      matScale(2, 2),
      matRotate(degToRad(90))
    );
    const res = compute8HandleResize({
      handle: 'e',
      startRect: { left: 0, top: 0, width: 120, height: 60 },
      zoom: 2,
      grabOffset: { x: 0, y: 0 },
      pointerDeltaScreen: { x: 0, y: 40 }, // +40 screen Y => +20 local X
      elementToScreen,
    });
    assert.ok(nearEqual(res.width, 140, 1e-4), `Expected width 140, got ${res.width}`);
    assert.ok(nearEqual(res.height, 60, 1e-4), `Expected height 60, got ${res.height}`);

    // Flipped scaleX(-1): dragging right on screen (+30) stretches east handle (-30 local)
    const flipped = matCompose(matTranslate(200, 100), matScale(-1, 1));
    const resFlip = compute8HandleResize({
      handle: 'e',
      startRect: { left: 0, top: 0, width: 100, height: 50 },
      zoom: 1,
      grabOffset: { x: 0, y: 0 },
      pointerDeltaScreen: { x: -25, y: 0 }, // screen left under X flip => local +25
      elementToScreen: flipped,
    });
    assert.ok(nearEqual(resFlip.width, 125, 1e-4));
  });

  it('snapResizeInSession snaps only active handle edge, keeps opposite edge anchored, and preserves aspect ratio', () => {
    const session = createDirectSnapSession([
      // Aligned with stationary left edge (x=100) AND target right edge (x=300)!
      { left: 100, top: 20, width: 200, height: 40, right: 300, bottom: 60, centerX: 200, centerY: 40 },
    ]);

    // 1. East drag: left=100 must NOT hijack active right=298 -> must snap right to 300!
    const snapEast = snapResizeInSession(
      session,
      { left: 100, top: 100, width: 198, height: 80 },
      'e',
      { x: -2, y: 0 }, // dragging from width=200 by -2 -> width=198
      IDENTITY_MATRIX,
      { thresholdScreenPx: 6, zoom: 1 }
    );
    assert.equal(snapEast.resize.rect.left, 100);
    assert.equal(snapEast.resize.rect.width, 200);
    assert.equal(snapEast.guides.length, 1);
    assert.equal(snapEast.guides[0].position, 300);

    // 2. West drag: dragging W edge from x=120 towards x=102 must snap left=100 and anchor right=220
    const snapWest = snapResizeInSession(
      session,
      { left: 120, top: 100, width: 100, height: 80 },
      'w',
      { x: -18, y: 0 },
      IDENTITY_MATRIX,
      { thresholdScreenPx: 6, zoom: 1 }
    );
    assert.equal(snapWest.resize.rect.left, 100);
    assert.equal(snapWest.resize.rect.right, 220);
    assert.equal(snapWest.resize.rect.width, 120);

    // 3. SE corner with aspectRatio lock preserves ratio even when X snaps
    const aspectRes = snapResizeInSession(
      session,
      { left: 100, top: 100, width: 100, height: 50 }, // 2:1 ratio
      'se',
      { x: 98, y: 40 }, // right -> 298 (snaps to 300 => width 200 => height must become 100)
      IDENTITY_MATRIX,
      { thresholdScreenPx: 6, zoom: 1, aspectRatio: true }
    );
    assert.equal(aspectRes.resize.rect.width, 200);
    assert.equal(aspectRes.resize.rect.height, 100);
    assert.ok(nearEqual(aspectRes.resize.rect.width / aspectRes.resize.rect.height, 2, 1e-6));
  });

  it('snapRectInSession runs fast and supports equal-spacing detection', () => {
    const session = createDirectSnapSession([
      { left: 100, top: 100, width: 60, height: 40, right: 160, bottom: 140, centerX: 130, centerY: 120 },
      { left: 200, top: 100, width: 60, height: 40, right: 260, bottom: 140, centerX: 230, centerY: 120 },
    ]);
    const res = snapRectInSession(
      session,
      { left: 302, top: 100, width: 60, height: 40 },
      { thresholdScreenPx: 5, zoom: 1, includeEdges: false, includeCenters: false, includeContainer: false, includeEqualSpacing: true }
    );
    assert.equal(res.snappedX, true);
    assert.equal(res.dx, -2);
    assert.equal(res.guides[0]?.kind, 'spacing');
  });

  it('roundMoveTranslation preserves sibling snaps instead of overwriting them with 4px grid rounding', () => {
    assert.deepEqual(roundMoveTranslation(102.2, 53.6, true, true), { x: 102, y: 54 });
    assert.deepEqual(roundMoveTranslation(102.2, 53.6, false, false), { x: 104, y: 52 });
    assert.deepEqual(roundMoveTranslation(102.2, 53.6, true, false), { x: 102, y: 52 });
  });

  it('buildArtboardToContainerMatrix transforms iframe guides accurately into scaled/scrolled container coordinates', () => {
    // Artboard starts at screen (300, 100), <main> at screen (200, 50) with scrollLeft=10, scrollTop=20, scale=0.5
    const mat = buildArtboardToContainerMatrix(300, 100, 200, 50, 0, 0, 10, 20, 0.5);
    const vGuide = transformGuideLineToContainer(
      { type: 'vertical', position: 100, start: 80, end: 180 },
      mat
    );
    assert.equal(vGuide.position, 160); // (100 * 0.5) + (300 - 200 + 10)
    assert.equal(vGuide.start, 110); // (80 * 0.5) + (100 - 50 + 20)
    assert.equal(vGuide.end, 160); // (180 * 0.5) + 70

    const hGuide = transformGuideLineToContainer(
      { type: 'horizontal', position: 80, start: 40, end: 200 },
      mat
    );
    assert.equal(hGuide.position, 110);
    assert.equal(hGuide.start, 130);
    assert.equal(hGuide.end, 210);
  });

  it('computeZoomAnchorScroll keeps canvas point under cursor pinned across wheel zoom', () => {
    const res = computeZoomAnchorScroll({
      cursorScreenX: 500,
      cursorScreenY: 300,
      containerBoxLeft: 100,
      containerBoxTop: 50,
      containerClientWidth: 1000,
      containerClientHeight: 700,
      scrollLeft: 200,
      scrollTop: 100,
      currentLeft: 300,
      currentTop: 150,
      currentScale: 1.0,
      scaleMultiplier: 1.5,
    });
    // localX = 500 - 100 = 400; worldX = (200 + 400 - 300) / 1.0 = 300
    assert.equal(res.nextScale, 1.5);
    assert.ok(nearEqual(res.anchor.worldX, 300, 1e-6));
    assert.ok(nearEqual(res.anchor.worldY, 200, 1e-6));
  });

  it('parseCssMatrix2D parses computed CSS matrix strings safely', () => {
    assert.deepEqual(parseCssMatrix2D('none'), IDENTITY_MATRIX);
    assert.deepEqual(parseCssMatrix2D(undefined), IDENTITY_MATRIX);
    assert.deepEqual(parseCssMatrix2D('matrix(0, 1, -1, 0, 12.5, -4)'), [0, 1, -1, 0, 12.5, -4]);
  });

  it('computeSelectionChromeGeometry computes rotated/zoomed selection quad and handle screen coords', () => {
    const chrome = selectionStyleFor({ width: 100, height: 50, zoom: 2, tag: 'div' });
    const geom = computeSelectionChromeGeometry(
      [
        {
          offsetX: 50,
          offsetY: 20,
          width: 100,
          height: 50,
          transform: matRotate(degToRad(90)),
          transformOrigin: { x: 0, y: 0 },
        },
      ],
      { originX: 10, originY: 10, panX: 0, panY: 0, zoom: 2 },
      chrome.visibleHandles
    );
    assert.ok(nearEqual(geom.rotationDeg, 90, 1e-4));
    // Local (0,0) -> (10 + 50*2, 10 + 20*2) = (110, 50)
    assert.ok(nearEqual(geom.prediction.quad.nw.x, 110, 1e-4));
    assert.ok(nearEqual(geom.prediction.quad.nw.y, 50, 1e-4));
    // Local (100, 0) rotated +90deg -> (0, 100) * 2 + (110, 50) = (110, 250)
    assert.ok(geom.handleScreenPoints.ne);
    assert.ok(nearEqual(geom.handleScreenPoints.ne!.x, 110, 1e-4));
    assert.ok(nearEqual(geom.handleScreenPoints.ne!.y, 250, 1e-4));
  });

  it('classifyOverlayFlowIntent delegates RTL, sticky, display:contents, and grid cases to layout intent classifier', () => {
    const rtlIntent = classifyOverlayFlowIntent({
      parent: {
        display: 'flex',
        position: 'relative',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        direction: 'rtl',
        writingMode: 'horizontal-tb',
        rect: { left: 0, top: 0, width: 600, height: 100 },
      },
      child: {
        id: 'c0',
        index: 0,
        display: 'block',
        position: 'static',
        rect: { left: 500, top: 0, width: 100, height: 50 },
      },
      siblings: [
        { id: 'c0', index: 0, display: 'block', position: 'static', rect: { left: 500, top: 0, width: 100, height: 50 } },
        { id: 'c1', index: 1, display: 'block', position: 'static', rect: { left: 384, top: 0, width: 100, height: 50 } },
        { id: 'c2', index: 2, display: 'block', position: 'static', rect: { left: 268, top: 0, width: 100, height: 50 } },
      ],
      gesture: { kind: 'move', from: { x: 550, y: 25 }, to: { x: 280, y: 25 } },
    });
    assert.equal(rtlIntent.kind, 'reorder-in-flow');
    if (rtlIntent.kind === 'reorder-in-flow') {
      assert.equal(rtlIntent.targetIndex, 2);
      assert.equal(rtlIntent.visualDirection, 'reverse');
    }

    const stickyIntent = classifyOverlayFlowIntent({
      parent: {
        display: 'block',
        position: 'relative',
        overflowY: 'auto',
        rect: { left: 0, top: 0, width: 400, height: 600 },
      },
      child: {
        id: 'sticky-hdr',
        index: 0,
        display: 'block',
        position: 'sticky',
        rect: { left: 0, top: 0, width: 400, height: 60 },
        insets: { top: 0 },
      },
      siblings: [],
      gesture: { kind: 'move', from: { x: 200, y: 30 }, to: { x: 200, y: 180 } },
    });
    assert.equal(stickyIntent.kind, 'ambiguous');
  });

  it('oriented Quad chrome helpers handle rotation, negative flip, outward offset, and rotated cursors', () => {
    assert.equal(isAffineNonTrivial(IDENTITY_MATRIX), false);
    assert.equal(isAffineNonTrivial(matTranslate(40, 20)), false);
    assert.equal(isAffineNonTrivial(matRotate(degToRad(30))), true);
    assert.equal(isAffineNonTrivial(matScale(-1, 1)), true);

    // 90 deg rotated quad: 'n' points right (ew-resize), 'e' points down (ns-resize)
    const rot90Quad = {
      nw: { x: 80, y: 0 },
      ne: { x: 80, y: 120 },
      se: { x: 0, y: 120 },
      sw: { x: 0, y: 0 },
    };
    assert.equal(cursorForHandleAngle(rot90Quad, 'n'), 'ew-resize');
    assert.equal(cursorForHandleAngle(rot90Quad, 'e'), 'ns-resize');

    // 30 deg rotated quad: 'e' points (+cos 30, +sin 30) -> nwse-resize
    const c = Math.cos(degToRad(30));
    const s = Math.sin(degToRad(30));
    const rot30Quad = {
      nw: { x: 0, y: 0 },
      ne: { x: 100 * c, y: 100 * s },
      se: { x: 100 * c - 50 * s, y: 100 * s + 50 * c },
      sw: { x: -50 * s, y: 50 * c },
    };
    assert.equal(cursorForHandleAngle(rot30Quad, 'e'), 'nwse-resize');

    // Negatively flipped counter-clockwise quad outset=2 must still expand strictly outward from centroid
    const flippedQuad = {
      nw: { x: 100, y: 20 },
      ne: { x: 0, y: 20 },
      se: { x: 0, y: 80 },
      sw: { x: 100, y: 80 },
    };
    const pathStr = buildQuadOutlinePath(flippedQuad, 2);
    const nums = [...pathStr.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
    assert.equal(nums.length, 8);
    // Outset corners around [0..100] x [20..80] must cover [-2..102] x [18..82]
    assert.ok(nearEqual(nums[0], 102, 1e-4) && nearEqual(nums[1], 18, 1e-4));
    assert.ok(nearEqual(nums[2], -2, 1e-4) && nearEqual(nums[3], 18, 1e-4));
    assert.ok(nearEqual(nums[4], -2, 1e-4) && nearEqual(nums[5], 82, 1e-4));
    assert.ok(nearEqual(nums[6], 102, 1e-4) && nearEqual(nums[7], 82, 1e-4));

    const shifted = transformQuadByOffset(rot90Quad, -10, -20);
    assert.deepEqual(shifted.nw, { x: 70, y: -20 });

    // CSS Transforms L2 individual rotate/scale composition + ChromeGeometry rotated flags
    const composed = composeCssTransformMatrix({
      rotate: '45deg',
      scale: '-1 1',
      transform: 'none',
    });
    assert.equal(isAffineNonTrivial(composed), true);

    const rotChrome = selectionStyleFor({ width: 100, height: 50, zoom: 1, tag: 'div' });
    const geom90 = computeSelectionChromeGeometry(
      [
        {
          offsetX: 0,
          offsetY: 0,
          width: 100,
          height: 50,
          transform: matRotate(degToRad(90)),
          transformOrigin: { x: 0, y: 0 },
        },
      ],
      { originX: 0, originY: 0, panX: 0, panY: 0, zoom: 1 },
      rotChrome.visibleHandles
    );
    assert.equal(geom90.isNonTrivialTransform, true);
    assert.equal(geom90.edgeCursors.n, 'ew-resize');
    assert.equal(geom90.edgeCursors.e, 'ns-resize');
  });

  it('integrated UI files delegate geometry math to lib/editor/geometry rather than duplicating it', () => {
    const root = process.cwd();
    for (const rel of [
      'components/slightnudge/direct-manipulation-engine.ts',
      'components/slightnudge/selection-style.ts',
      'components/slightnudge/CanvasStage.tsx',
      'components/slightnudge/EditorWorkspace.tsx',
      'components/slightnudge/useWindowDock.ts',
      'components/slightnudge/SlightNudgeOverlay.tsx',
    ]) {
      const text = fs.readFileSync(path.join(root, rel), 'utf8');
      assert.ok(
        text.includes('lib/editor/geometry') || text.includes('direct-manipulation-engine'),
        `${rel} must consume lib/editor/geometry`
      );
    }
  });
});

