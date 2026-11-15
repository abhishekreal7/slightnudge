/**
 * SlightNudge Direct Manipulation Engine
 * Frontend-only 60fps direct manipulation adapter powered by `lib/editor/geometry`.
 *
 * Rules:
 * - No React state updates during drag
 * - Single rAF loop per frame
 * - Cached geometry at pointerdown (zero getBoundingClientRect inside pointermove)
 * - Delegates matrix transforms, space conversions, resize solving, snapping, and layout intent to lib/editor/geometry
 */

import {
  IDENTITY_MATRIX,
  canvasToScreenMatrix,
  canvasToScreenPoint,
  classifyLayoutIntent,
  createMutableSnapOutput,
  createSnapIndex,
  createSnapScratchBuffer,
  extractGuideDescriptors,
  matMultiply,
  matScale,
  matTranslate,
  nearEqual,
  rebuildSnapIndex,
  roundValue,
  screenToCanvasPoint,
  snapRectInto,
  solveResize,
  transformPoint,
  vecAdd,
  type Bounds,
  type CanvasSpace,
  type LayoutIntent,
  type LayoutIntentInput,
  type Matrix2D,
  type MutableGuideDescriptor,
  type MutableSnapOutput,
  type Point2D,
  type Rect,
  type ResizeOutput,
  type SnapCandidateRect,
  type SnapIndex,
  type SnapOptions,
  type SnapScratchBuffer,
  degToRad,
  matRotate,
  radToDeg,
  type ElementTransformFrame,
  type Quad,
} from '../../lib/editor/geometry';
import type { SerializedTransformFrame } from '../../lib/slightnudge/source-canvas-contract';

export type HandleDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface SiblingRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export interface ContainerRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface CachedGeometry {
  startRect: { left: number; top: number; width: number; height: number };
  zoom: number;
  scrollX: number;
  scrollY: number;
  containerRect?: ContainerRect;
  siblings: SiblingRect[];
  grabOffset: { x: number; y: number };
}

export interface ResizeParams {
  handle: HandleDirection;
  startRect: { left: number; top: number; width: number; height: number };
  zoom: number;
  grabOffset: { x: number; y: number };
  pointerDeltaScreen: { x: number; y: number };
  shiftKey?: boolean;
  altKey?: boolean;
  snapX?: number | null;
  snapY?: number | null;
  minSize?: number;
  maxWidth?: number;
  maxHeight?: number;
  elementToScreen?: Matrix2D;
}

export interface ResizeResult {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

/**
 * Compute 8-handle resize geometry with sub-pixel precision via `solveResize`.
 * Preserves affine transforms, zoom scaling, aspect ratio, center-resize, and >= 1px bounds.
 */
export function compute8HandleResize(params: ResizeParams): ResizeResult {
  const safeZoom = Number.isFinite(params.zoom) && params.zoom > 0 ? params.zoom : 0.01;
  const elementToScreen =
    params.elementToScreen ??
    canvasToScreenMatrix({ originX: 0, originY: 0, panX: 0, panY: 0, zoom: safeZoom });
  const minBound = Math.max(1, Number.isFinite(params.minSize) ? (params.minSize as number) : 1);

  const solved = solveResize({
    startRect: params.startRect,
    handle: params.handle,
    pointerDeltaScreen: params.pointerDeltaScreen,
    elementToScreen,
    constraints: {
      minWidth: minBound,
      minHeight: minBound,
      maxWidth: params.maxWidth,
      maxHeight: params.maxHeight,
      aspectRatio: params.shiftKey,
      fromCenter: params.altKey,
      snapLocalX: params.snapX,
      snapLocalY: params.snapY,
    },
  });

  return {
    left: solved.rect.left,
    top: solved.rect.top,
    width: solved.rect.width,
    height: solved.rect.height,
    right: solved.rect.right,
    bottom: solved.rect.bottom,
  };
}

export interface GuideLine {
  type: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
  kind?: 'edge' | 'center' | 'spacing';
  gap?: number;
  gapSegments?: readonly { readonly start: number; readonly end: number; readonly cross: number }[];
  sourceId?: string;
}

export interface SnapParams {
  box: { left: number; top: number; right: number; bottom: number; width: number; height: number };
  siblings: SiblingRect[];
  containerRect?: ContainerRect;
  thresholdScreenPx: number;
  zoom: number;
  disabled?: boolean;
}

export interface SnapResult {
  snappedX: boolean;
  snappedY: boolean;
  dx: number;
  dy: number;
  guides: GuideLine[];
}

export interface DirectSnapSession {
  readonly index: SnapIndex;
  readonly scratch: SnapScratchBuffer;
  readonly out: MutableSnapOutput;
  readonly outX: MutableSnapOutput;
  readonly outY: MutableSnapOutput;
}

export function createDirectSnapSession(
  siblings: readonly SiblingRect[],
  containerRect?: ContainerRect,
  maxCandidates = Math.max(32, siblings.length + 8)
): DirectSnapSession {
  const cap = Math.max(8, maxCandidates, siblings.length + 4);
  const index = createSnapIndex(cap);
  const candidates: SnapCandidateRect[] = siblings.map((s, idx) => ({
    id: `sib-${idx}`,
    left: s.left,
    top: s.top,
    width: s.width,
    height: s.height,
  }));
  const container: SnapCandidateRect | undefined = containerRect
    ? {
        id: 'container',
        left: containerRect.left,
        top: containerRect.top,
        width: containerRect.width,
        height: containerRect.height,
      }
    : undefined;
  rebuildSnapIndex(index, candidates, container);
  return {
    index,
    scratch: createSnapScratchBuffer(cap),
    out: createMutableSnapOutput(4),
    outX: createMutableSnapOutput(2),
    outY: createMutableSnapOutput(2),
  };
}

function guideDescriptorToGuideLine(g: MutableGuideDescriptor): GuideLine {
  const base: GuideLine = {
    type: g.axis === 'x' ? 'vertical' : 'horizontal',
    position: g.position,
    start: g.spanStart,
    end: g.spanEnd,
    kind: g.kind,
    sourceId: g.sourceId,
  };
  if (g.kind === 'spacing') {
    base.gap = g.gap;
    base.gapSegments = Array.from({ length: g.gapSegCount }, (_, i) => ({
      start: g.gapSegments[i].start,
      end: g.gapSegments[i].end,
      cross: g.gapSegments[i].cross,
    }));
  }
  return base;
}

export function extractSessionGuideLines(out: MutableSnapOutput): GuideLine[] {
  if (out.guideCount === 0) return [];
  const guides: GuideLine[] = [];
  for (let i = 0; i < out.guideCount; i++) {
    guides.push(guideDescriptorToGuideLine(out.guides[i]));
  }
  return guides;
}

export function snapRectInSession(
  session: DirectSnapSession,
  box: Rect,
  options: SnapOptions
): SnapResult {
  snapRectInto(box, session.index, options, session.scratch, session.out);
  return {
    snappedX: session.out.snappedX,
    snappedY: session.out.snappedY,
    dx: session.out.dx,
    dy: session.out.dy,
    guides: extractSessionGuideLines(session.out),
  };
}

function rectMatchesGuidePosition(rect: Bounds, g: MutableGuideDescriptor): boolean {
  const eps = 0.25;
  if (g.axis === 'x') {
    const cx = rect.left + rect.width / 2;
    return (
      nearEqual(rect.left, g.position, eps) ||
      nearEqual(rect.right, g.position, eps) ||
      nearEqual(cx, g.position, eps)
    );
  }
  const cy = rect.top + rect.height / 2;
  return (
    nearEqual(rect.top, g.position, eps) ||
    nearEqual(rect.bottom, g.position, eps) ||
    nearEqual(cy, g.position, eps)
  );
}

/**
 * Resize + active-edge snap in one coherent pass using `solveResize` and `snapRectInto`.
 * Probes only the dragged edges unless `fromCenter` is active so stationary aligned edges
 * cannot hijack active handle snapping, then feeds `snapLocalX`/`snapLocalY` into `solveResize`
 * to guarantee aspect lock, opposite-edge anchoring, and >= 1px minimums stay intact.
 */
export function snapResizeInSession(
  session: DirectSnapSession,
  startRect: Rect,
  handle: HandleDirection,
  pointerDeltaScreen: Point2D,
  elementToScreen: Matrix2D,
  options: {
    thresholdScreenPx: number;
    zoom: number;
    disabled?: boolean;
    fromCenter?: boolean;
    aspectRatio?: boolean | number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  }
): { resize: ResizeOutput; guides: GuideLine[] } {
  const baseConstraints = {
    minWidth: options.minWidth ?? 1,
    minHeight: options.minHeight ?? 1,
    maxWidth: options.maxWidth,
    maxHeight: options.maxHeight,
    aspectRatio: options.aspectRatio,
    fromCenter: options.fromCenter,
  };

  const unconstrained = solveResize({
    startRect,
    handle,
    pointerDeltaScreen,
    elementToScreen,
    constraints: baseConstraints,
  });

  if (options.disabled || options.thresholdScreenPx <= 0 || options.zoom <= 0) {
    return { resize: unconstrained, guides: [] };
  }

  const hasW = handle === 'nw' || handle === 'w' || handle === 'sw';
  const hasE = handle === 'ne' || handle === 'e' || handle === 'se';
  const hasN = handle === 'nw' || handle === 'n' || handle === 'ne';
  const hasS = handle === 'sw' || handle === 's' || handle === 'se';
  const hasAspect =
    options.aspectRatio === true ||
    (typeof options.aspectRatio === 'number' && Number.isFinite(options.aspectRatio) && options.aspectRatio > 0);
  const cand = unconstrained.rect;
  const fromCenter = Boolean(options.fromCenter);

  let snapLocalX: number | null = null;
  let snapLocalY: number | null = null;
  let xDeltaAbs = Infinity;
  let yDeltaAbs = Infinity;

  if (hasW || hasE) {
    const probeX: Rect = fromCenter
      ? cand
      : {
          left: hasE ? cand.right : cand.left,
          top: cand.top,
          width: 0,
          height: cand.height,
        };
    snapRectInto(
      probeX,
      session.index,
      {
        thresholdScreenPx: options.thresholdScreenPx,
        zoom: options.zoom,
        includeEqualSpacing: false,
      },
      session.scratch,
      session.outX
    );
    if (session.outX.snappedX) {
      xDeltaAbs = Math.abs(session.outX.dx);
      snapLocalX = fromCenter
        ? hasE
          ? session.outX.rect.right
          : session.outX.rect.left
        : session.outX.rect.left;
    }
  } else {
    session.outX.guideCount = 0;
  }

  if (hasN || hasS) {
    const probeY: Rect = fromCenter
      ? cand
      : {
          left: cand.left,
          top: hasS ? cand.bottom : cand.top,
          width: cand.width,
          height: 0,
        };
    snapRectInto(
      probeY,
      session.index,
      {
        thresholdScreenPx: options.thresholdScreenPx,
        zoom: options.zoom,
        includeEqualSpacing: false,
      },
      session.scratch,
      session.outY
    );
    if (session.outY.snappedY) {
      yDeltaAbs = Math.abs(session.outY.dy);
      snapLocalY = fromCenter
        ? hasS
          ? session.outY.rect.bottom
          : session.outY.rect.top
        : session.outY.rect.top;
    }
  } else {
    session.outY.guideCount = 0;
  }

  // With locked aspect ratio only 1 degree of freedom exists; pick closer snap axis
  if (hasAspect && snapLocalX !== null && snapLocalY !== null) {
    if (xDeltaAbs <= yDeltaAbs) {
      snapLocalY = null;
    } else {
      snapLocalX = null;
    }
  }

  if (snapLocalX === null && snapLocalY === null) {
    return { resize: unconstrained, guides: [] };
  }

  const finalResize = solveResize({
    startRect,
    handle,
    pointerDeltaScreen,
    elementToScreen,
    constraints: {
      ...baseConstraints,
      snapLocalX,
      snapLocalY,
    },
  });

  const guides: GuideLine[] = [];
  if (snapLocalX !== null) {
    for (let i = 0; i < session.outX.guideCount; i++) {
      const g = session.outX.guides[i];
      if (g.axis === 'x' && rectMatchesGuidePosition(finalResize.rect, g)) {
        guides.push(guideDescriptorToGuideLine(g));
      }
    }
  }
  if (snapLocalY !== null) {
    for (let i = 0; i < session.outY.guideCount; i++) {
      const g = session.outY.guides[i];
      if (g.axis === 'y' && rectMatchesGuidePosition(finalResize.rect, g)) {
        guides.push(guideDescriptorToGuideLine(g));
      }
    }
  }

  return { resize: finalResize, guides };
}

let cachedSessionSiblings: readonly SiblingRect[] | null = null;
let cachedSessionLength = -1;
let cachedSessionContainer: ContainerRect | undefined = undefined;
let cachedSession: DirectSnapSession | null = null;

function sameContainerRect(a?: ContainerRect, b?: ContainerRect): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

/**
 * Smart snapping powered by `lib/editor/geometry`'s O(log N) spatial index.
 * Caches index across repeated calls on the same sibling set and supports equal-spacing guides.
 */
export function computeSmartSnapping(params: SnapParams): SnapResult {
  const { box, siblings, containerRect, thresholdScreenPx, zoom, disabled = false } = params;
  if (disabled) {
    return { snappedX: false, snappedY: false, dx: 0, dy: 0, guides: [] };
  }

  if (
    !cachedSession ||
    cachedSessionSiblings !== siblings ||
    cachedSessionLength !== siblings.length ||
    !sameContainerRect(cachedSessionContainer, containerRect)
  ) {
    cachedSession = createDirectSnapSession(siblings, containerRect);
    cachedSessionSiblings = siblings;
    cachedSessionLength = siblings.length;
    cachedSessionContainer = containerRect;
  }

  snapRectInto(
    box,
    cachedSession.index,
    { thresholdScreenPx, zoom, disabled: false },
    cachedSession.scratch,
    cachedSession.out
  );

  const guides = extractGuideDescriptors(cachedSession.out).map((g) => ({
    type: (g.axis === 'x' ? 'vertical' : 'horizontal') as 'vertical' | 'horizontal',
    position: g.position,
    start: g.spanStart,
    end: g.spanEnd,
    kind: g.kind,
    gap: g.gap,
    gapSegments: g.gapSegments,
    sourceId: g.sourceId,
  }));

  return {
    snappedX: cachedSession.out.snappedX,
    snappedY: cachedSession.out.snappedY,
    dx: cachedSession.out.dx,
    dy: cachedSession.out.dy,
    guides,
  };
}

/** Arrow key nudge computation via `vecAdd`: 1px default, 10px with Shift. */
export function computeArrowNudge(
  pos: { x: number; y: number },
  key: string,
  shiftKey = false
): { x: number; y: number } {
  const step = shiftKey ? 10 : 1;
  switch (key) {
    case 'ArrowRight':
      return vecAdd(pos, { x: step, y: 0 });
    case 'ArrowLeft':
      return vecAdd(pos, { x: -step, y: 0 });
    case 'ArrowDown':
      return vecAdd(pos, { x: 0, y: step });
    case 'ArrowUp':
      return vecAdd(pos, { x: 0, y: -step });
    default:
      return { ...pos };
  }
}

/**
 * Rounding policy for live move translation: preserves exact 1px sibling alignment
 * when snapped, otherwise rounds to the 4px Tailwind grid via `roundValue`.
 */
export function roundMoveTranslation(
  nextX: number,
  nextY: number,
  snappedX: boolean,
  snappedY: boolean
): Point2D {
  return {
    x: snappedX ? roundValue(nextX, 'nearest', 1) : roundValue(nextX, 'nearest', 4),
    y: snappedY ? roundValue(nextY, 'nearest', 1) : roundValue(nextY, 'nearest', 4),
  };
}

/**
 * Builds the 2D affine matrix from artboard/iframe-local CSS px to an overlay container's
 * scrollable padding-box coordinates (`matTranslate(...) * matScale(scale, scale)`).
 */
export function buildArtboardToContainerMatrix(
  artboardScreenLeft: number,
  artboardScreenTop: number,
  containerScreenLeft: number,
  containerScreenTop: number,
  containerClientLeft: number,
  containerClientTop: number,
  containerScrollLeft: number,
  containerScrollTop: number,
  scale: number
): Matrix2D {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const tx =
    artboardScreenLeft - containerScreenLeft - containerClientLeft + containerScrollLeft;
  const ty =
    artboardScreenTop - containerScreenTop - containerClientTop + containerScrollTop;
  return matMultiply(matTranslate(tx, ty), matScale(safeScale, safeScale));
}

/** Transforms a guide descriptor from artboard/iframe coordinates into host container space. */
export function transformGuideLineToContainer(guide: GuideLine, matrix: Matrix2D): GuideLine {
  if (guide.type === 'vertical') {
    const pStart = transformPoint(matrix, { x: guide.position, y: guide.start });
    const pEnd = transformPoint(matrix, { x: guide.position, y: guide.end });
    return {
      ...guide,
      position: pStart.x,
      start: Math.min(pStart.y, pEnd.y),
      end: Math.max(pStart.y, pEnd.y),
    };
  }
  const pStart = transformPoint(matrix, { x: guide.start, y: guide.position });
  const pEnd = transformPoint(matrix, { x: guide.end, y: guide.position });
  return {
    ...guide,
    position: pStart.y,
    start: Math.min(pStart.x, pEnd.x),
    end: Math.max(pStart.x, pEnd.x),
  };
}

/** Computes wheel zoom-to-cursor scale and pinned world anchor using `screenToCanvasPoint`. */
export function computeZoomAnchorScroll(params: {
  cursorScreenX: number;
  cursorScreenY: number;
  containerBoxLeft: number;
  containerBoxTop: number;
  containerClientWidth: number;
  containerClientHeight: number;
  scrollLeft: number;
  scrollTop: number;
  currentLeft: number;
  currentTop: number;
  currentScale: number;
  scaleMultiplier: number;
  minScale?: number;
  maxScale?: number;
}): {
  nextScale: number;
  anchor: { x: number; y: number; worldX: number; worldY: number };
} {
  const minScale = params.minScale ?? 0.1;
  const maxScale = params.maxScale ?? 2;
  const nextScale = Math.max(
    minScale,
    Math.min(maxScale, roundValue(params.currentScale * params.scaleMultiplier, 'nearest', 0.01))
  );
  const localX = Math.max(
    0,
    Math.min(params.containerClientWidth, params.cursorScreenX - params.containerBoxLeft)
  );
  const localY = Math.max(
    0,
    Math.min(params.containerClientHeight, params.cursorScreenY - params.containerBoxTop)
  );
  const space: CanvasSpace = {
    originX: params.containerBoxLeft + params.currentLeft - params.scrollLeft,
    originY: params.containerBoxTop + params.currentTop - params.scrollTop,
    panX: 0,
    panY: 0,
    zoom: params.currentScale,
  };
  const world = screenToCanvasPoint(
    { x: params.containerBoxLeft + localX, y: params.containerBoxTop + localY },
    space
  ) ?? { x: 0, y: 0 };

  return {
    nextScale,
    anchor: { x: localX, y: localY, worldX: world.x, worldY: world.y },
  };
}

/** Maps a pinned world anchor to container scrollLeft/scrollTop after scale update via `canvasToScreenPoint`. */
export function resolveScrollForZoomAnchor(
  anchor: { x: number; y: number; worldX: number; worldY: number },
  nextLeft: number,
  nextTop: number,
  nextScale: number
): { scrollLeft: number; scrollTop: number } {
  const stagePt = canvasToScreenPoint(
    { x: anchor.worldX, y: anchor.worldY },
    { originX: nextLeft, originY: nextTop, panX: 0, panY: 0, zoom: nextScale }
  );
  return {
    scrollLeft: stagePt.x - anchor.x,
    scrollTop: stagePt.y - anchor.y,
  };
}

/** Parses CSS `getComputedStyle(...).transform` 2D matrix strings into `Matrix2D`. */
export function parseCssMatrix2D(transformCss: string | null | undefined): Matrix2D {
  if (!transformCss || transformCss === 'none') return IDENTITY_MATRIX;
  const match2d = transformCss.match(/^matrix\(\s*([^)]+)\)$/);
  if (match2d) {
    const parts = match2d[1].split(',').map((s) => Number(s.trim()));
    if (parts.length === 6 && parts.every(Number.isFinite)) {
      return [parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]];
    }
    return IDENTITY_MATRIX;
  }
  const match3d = transformCss.match(/^matrix3d\(\s*([^)]+)\)$/);
  if (match3d) {
    const m = match3d[1].split(',').map((s) => Number(s.trim()));
    if (
      m.length === 16 &&
      m.every(Number.isFinite) &&
      m[2] === 0 &&
      m[3] === 0 &&
      m[6] === 0 &&
      m[7] === 0 &&
      m[10] === 1 &&
      m[11] === 0 &&
      m[14] === 0 &&
      m[15] === 1
    ) {
      return [m[0], m[1], m[4], m[5], m[12], m[13]];
    }
  }
  return IDENTITY_MATRIX;
}

/** Delegates overlay reorder / resize intent classification to `lib/editor/geometry`. */
export function classifyOverlayFlowIntent(input: LayoutIntentInput): LayoutIntent {
  return classifyLayoutIntent(input);
}

export type ResizeCursor = 'ew-resize' | 'ns-resize' | 'nesw-resize' | 'nwse-resize';

export interface CssTransformInput {
  translate?: string | null;
  rotate?: string | null;
  scale?: string | null;
  transform?: string | null;
}

export interface SourceElementLookup {
  elementId?: string;
  path?: string;
  line?: number;
  column?: number;
  instance?: string;
  tagName?: string;
}

const DEFAULT_HANDLE_CURSORS: Record<HandleDirection, ResizeCursor> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
};

/** Returns `true` when the linear 2x2 portion of `m` differs from identity beyond `epsilon`. */
export function isAffineNonTrivial(m: Matrix2D, epsilon = 1e-4): boolean {
  return (
    Math.abs(m[0] - 1) > epsilon ||
    Math.abs(m[1]) > epsilon ||
    Math.abs(m[2]) > epsilon ||
    Math.abs(m[3] - 1) > epsilon
  );
}

/** Resolves the visual resize cursor for `handle` along the edges of a transformed `Quad`. */
export function cursorForHandleAngle(quad: Quad, handle: HandleDirection): ResizeCursor {
  const ex = quad.ne.x - quad.nw.x;
  const ey = quad.ne.y - quad.nw.y;
  const sx = quad.sw.x - quad.nw.x;
  const sy = quad.sw.y - quad.nw.y;
  const eLen = Math.hypot(ex, ey);
  const sLen = Math.hypot(sx, sy);
  if (!Number.isFinite(eLen) || !Number.isFinite(sLen) || eLen < 1e-6 || sLen < 1e-6) {
    return DEFAULT_HANDLE_CURSORS[handle];
  }
  const ux = ex / eLen;
  const uy = ey / eLen;
  const vx = sx / sLen;
  const vy = sy / sLen;

  let dx = 0;
  let dy = 0;
  switch (handle) {
    case 'e':
      dx = ux;
      dy = uy;
      break;
    case 'w':
      dx = -ux;
      dy = -uy;
      break;
    case 's':
      dx = vx;
      dy = vy;
      break;
    case 'n':
      dx = -vx;
      dy = -vy;
      break;
    case 'ne':
      dx = ux - vx;
      dy = uy - vy;
      break;
    case 'se':
      dx = ux + vx;
      dy = uy + vy;
      break;
    case 'sw':
      dx = -ux + vx;
      dy = -uy + vy;
      break;
    case 'nw':
      dx = -ux - vx;
      dy = -uy - vy;
      break;
  }

  if (Math.hypot(dx, dy) < 1e-6) {
    return DEFAULT_HANDLE_CURSORS[handle];
  }
  const deg = ((radToDeg(Math.atan2(dy, dx)) % 180) + 180) % 180;
  if (deg < 22.5 || deg >= 157.5) return 'ew-resize';
  if (deg < 67.5) return 'nwse-resize';
  if (deg < 112.5) return 'ns-resize';
  return 'nesw-resize';
}

/** Shifts every corner of `quad` by `(offsetX, offsetY)`. */
export function transformQuadByOffset(quad: Quad, offsetX: number, offsetY: number): Quad {
  return {
    nw: { x: quad.nw.x + offsetX, y: quad.nw.y + offsetY },
    ne: { x: quad.ne.x + offsetX, y: quad.ne.y + offsetY },
    se: { x: quad.se.x + offsetX, y: quad.se.y + offsetY },
    sw: { x: quad.sw.x + offsetX, y: quad.sw.y + offsetY },
  };
}

/** Builds a closed SVG path tracing `quad` pushed strictly outward by `outsetPx` using edge normals. */
export function buildQuadOutlinePath(quad: Quad, outsetPx = 2): string {
  const pts: Point2D[] = [quad.nw, quad.ne, quad.se, quad.sw];
  if (outsetPx === 0) {
    const r = (v: number) => roundValue(v, 'nearest', 0.01);
    return `M ${r(pts[0].x)} ${r(pts[0].y)} L ${r(pts[1].x)} ${r(pts[1].y)} L ${r(pts[2].x)} ${r(pts[2].y)} L ${r(pts[3].x)} ${r(pts[3].y)} Z`;
  }

  const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4;
  const cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4;

  const dirs: Point2D[] = [];
  const normals: Point2D[] = [];
  for (let i = 0; i < 4; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 4];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (!Number.isFinite(len) || len < 1e-6) {
      dirs.push({ x: 1, y: 0 });
      normals.push({ x: 0, y: 0 });
      continue;
    }
    const ux = dx / len;
    const uy = dy / len;
    dirs.push({ x: ux, y: uy });
    let nx = -uy;
    let ny = ux;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    if (nx * (mx - cx) + ny * (my - cy) < 0) {
      nx = -nx;
      ny = -ny;
    }
    normals.push({ x: nx, y: ny });
  }

  const expanded: Point2D[] = [];
  const maxMiter = Math.abs(outsetPx) * 6;
  for (let i = 0; i < 4; i++) {
    const prevIdx = (i + 3) % 4;
    const p = pts[i];
    const nPrev = normals[prevIdx];
    const nCurr = normals[i];
    const u1 = dirs[prevIdx];
    const u2 = dirs[i];
    const a1x = p.x + nPrev.x * outsetPx;
    const a1y = p.y + nPrev.y * outsetPx;
    const a2x = p.x + nCurr.x * outsetPx;
    const a2y = p.y + nCurr.y * outsetPx;
    const denom = u1.x * u2.y - u1.y * u2.x;
    if (Math.abs(denom) > 1e-6) {
      const diffX = a2x - a1x;
      const diffY = a2y - a1y;
      const tRaw = (diffX * u2.y - diffY * u2.x) / denom;
      const t = Math.max(-maxMiter, Math.min(maxMiter, tRaw));
      expanded.push({ x: a1x + t * u1.x, y: a1y + t * u1.y });
    } else {
      const sx = nPrev.x + nCurr.x;
      const sy = nPrev.y + nCurr.y;
      const sLen = Math.hypot(sx, sy);
      if (sLen > 1e-6) {
        expanded.push({
          x: p.x + (sx / sLen) * outsetPx,
          y: p.y + (sy / sLen) * outsetPx,
        });
      } else {
        expanded.push({ x: p.x, y: p.y });
      }
    }
  }

  const fmt = (v: number) => roundValue(v, 'nearest', 0.01);
  return (
    `M ${fmt(expanded[0].x)} ${fmt(expanded[0].y)} ` +
    `L ${fmt(expanded[1].x)} ${fmt(expanded[1].y)} ` +
    `L ${fmt(expanded[2].x)} ${fmt(expanded[2].y)} ` +
    `L ${fmt(expanded[3].x)} ${fmt(expanded[3].y)} Z`
  );
}

function parseCssAngleRad(token: string | undefined): number | null {
  if (!token) return null;
  const match = token.trim().match(/^(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(deg|rad|grad|turn)?$/i);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  const unit = (match[2] || 'deg').toLowerCase();
  if (unit === 'rad') return value;
  if (unit === 'turn') return value * 2 * Math.PI;
  if (unit === 'grad') return (value * Math.PI) / 200;
  return degToRad(value);
}

function parseCssScaleToken(token: string | undefined): number | null {
  if (!token) return null;
  const trimmed = token.trim();
  if (trimmed.endsWith('%')) {
    const pct = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(pct) ? pct / 100 : null;
  }
  const value = Number.parseFloat(trimmed);
  return Number.isFinite(value) ? value : null;
}

function parseCssTranslatePx(token: string | undefined): number {
  if (!token) return 0;
  const trimmed = token.trim();
  if (trimmed === '0') return 0;
  if (/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?px$/i.test(trimmed)) {
    const value = Number.parseFloat(trimmed);
    return Number.isFinite(value) ? value : 0;
  }
  return 0;
}

/** Composes CSS Transforms Level 2 individual `translate`, `rotate`, `scale` and `transform` matrix in CSS spec order. */
export function composeCssTransformMatrix(input: CssTransformInput): Matrix2D {
  let result: Matrix2D = IDENTITY_MATRIX;

  const translateRaw = input.translate?.trim();
  if (translateRaw && translateRaw !== 'none') {
    const parts = translateRaw.split(/\s+/);
    const tx = parseCssTranslatePx(parts[0]);
    const ty = parseCssTranslatePx(parts[1]);
    if (tx !== 0 || ty !== 0) {
      result = matMultiply(result, matTranslate(tx, ty));
    }
  }

  const rotateRaw = input.rotate?.trim();
  if (rotateRaw && rotateRaw !== 'none') {
    const parts = rotateRaw.split(/\s+/);
    let rad: number | null = null;
    if (parts.length === 1) {
      rad = parseCssAngleRad(parts[0]);
    } else if (parts.length === 2 && parts[0].toLowerCase() === 'z') {
      rad = parseCssAngleRad(parts[1]);
    } else if (parts.length === 4) {
      const nx = Number.parseFloat(parts[0]);
      const ny = Number.parseFloat(parts[1]);
      const nz = Number.parseFloat(parts[2]);
      const angle = parseCssAngleRad(parts[3]);
      if (angle !== null && Math.abs(nx) < 1e-6 && Math.abs(ny) < 1e-6 && Math.abs(nz) > 1e-6) {
        rad = nz < 0 ? -angle : angle;
      }
    }
    if (rad !== null && Math.abs(rad) > 1e-9) {
      result = matMultiply(result, matRotate(rad));
    }
  }

  const scaleRaw = input.scale?.trim();
  if (scaleRaw && scaleRaw !== 'none') {
    const parts = scaleRaw.split(/\s+/);
    const sx = parseCssScaleToken(parts[0]);
    const sy = parts.length >= 2 ? parseCssScaleToken(parts[1]) : sx;
    if (sx !== null && sy !== null && (sx !== 1 || sy !== 1)) {
      result = matMultiply(result, matScale(sx, sy));
    }
  }

  const transformMat = parseCssMatrix2D(input.transform);
  if (
    transformMat[0] !== 1 ||
    transformMat[1] !== 0 ||
    transformMat[2] !== 0 ||
    transformMat[3] !== 1 ||
    transformMat[4] !== 0 ||
    transformMat[5] !== 0
  ) {
    result = matMultiply(result, transformMat);
  }

  return result;
}

export function pathsMatch(p1: string | null | undefined, p2: string | null | undefined): boolean {
  if (!p1 || !p2) return false;
  if (p1 === p2) return true;
  const n1 = p1.replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();
  const n2 = p2.replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();
  return n1 === n2 || n1.endsWith('/' + n2) || n2.endsWith('/' + n1);
}

/** Resolves a selected element in a same-origin iframe/document by `elementId` or `data-source-*` locator. */
export function findSourceElementInDocument(
  doc: Document | null | undefined,
  selection: SourceElementLookup | null | undefined
): HTMLElement | null {
  if (!doc || !selection) return null;
  if (selection.elementId) {
    const byId = doc.getElementById(selection.elementId);
    if (byId) return byId;
  }
  if (selection.path && typeof selection.line === 'number' && selection.line > 0) {
    const all = Array.from(doc.querySelectorAll<HTMLElement>('[data-source-file]'));
    const fileLineMatches = all.filter((el) => {
      if (!pathsMatch(el.getAttribute('data-source-file'), selection.path)) return false;
      if (Number(el.getAttribute('data-source-line')) !== selection.line) return false;
      return true;
    });

    if (fileLineMatches.length === 1) return fileLineMatches[0];

    if (fileLineMatches.length > 1) {
      if (selection.instance) {
        const byCallsite = fileLineMatches.find(
          (el) => el.getAttribute('data-slightnudge-callsite') === selection.instance
        );
        if (byCallsite) return byCallsite;
      }
      if (selection.elementId) {
        const byId = fileLineMatches.find((el) => el.id === selection.elementId);
        if (byId) return byId;
      }
      if (typeof selection.column === 'number' && selection.column > 0) {
        const byCol = fileLineMatches.find((el) => {
          const rawCol = el.getAttribute('data-source-column');
          const col = rawCol ? Number(rawCol) : el.id ? 1 : 0;
          return col === selection.column;
        });
        if (byCol) return byCol;
      }
      return fileLineMatches[0];
    }
  }
  return null;
}

function parseTransformOriginPx(raw: string | null | undefined, width: number, height: number): Point2D {
  if (!raw) return { x: width / 2, y: height / 2 };
  const parts = raw.trim().split(/\s+/);
  const ox = Number.parseFloat(parts[0] || '');
  const oy = Number.parseFloat(parts[1] || '');
  return {
    x: Number.isFinite(ox) ? ox : width / 2,
    y: Number.isFinite(oy) ? oy : height / 2,
  };
}

/**
 * Hydrates a bridge-serialized `SerializedTransformFrame[]` ancestor chain (from cross-origin
 * postMessage payloads) into pure `ElementTransformFrame[]` for `lib/editor/geometry`, applying
 * finite-number guards and a 64-frame cap.
 */
export function hydrateSerializedTransformChain(
  serialized: readonly SerializedTransformFrame[] | null | undefined
): ElementTransformFrame[] {
  if (!Array.isArray(serialized) || serialized.length === 0) return [];
  const cap = Math.min(serialized.length, 64);
  const finiteOrZero = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const nonNegOrZero = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
  const boundedCssStr = (value: unknown): string | undefined =>
    typeof value === 'string' && value.length <= 512 ? value : undefined;

  const frames: ElementTransformFrame[] = [];
  for (let i = 0; i < cap; i++) {
    const raw = serialized[i];
    if (!raw || typeof raw !== 'object') continue;
    const width = nonNegOrZero(raw.width);
    const height = nonNegOrZero(raw.height);
    const transform = composeCssTransformMatrix({
      translate: boundedCssStr(raw.translate),
      rotate: boundedCssStr(raw.rotate),
      scale: boundedCssStr(raw.scale),
      transform: boundedCssStr(raw.transform),
    });
    const ox =
      typeof raw.transformOriginX === 'number' && Number.isFinite(raw.transformOriginX)
        ? raw.transformOriginX
        : width / 2;
    const oy =
      typeof raw.transformOriginY === 'number' && Number.isFinite(raw.transformOriginY)
        ? raw.transformOriginY
        : height / 2;
    frames.push({
      offsetX: finiteOrZero(raw.offsetX),
      offsetY: finiteOrZero(raw.offsetY),
      width,
      height,
      scrollLeft: finiteOrZero(raw.scrollLeft),
      scrollTop: finiteOrZero(raw.scrollTop),
      transform,
      transformOrigin: { x: ox, y: oy },
    });
  }
  return frames;
}

/**
 * Extracts the ancestor-to-target `ElementTransformFrame[]` chain for a same-origin DOM element
 * so `lib/editor/geometry` predicts its screen Quad accurately under nested transforms and scroll offsets.
 */
export function extractElementTransformChain(targetEl: HTMLElement): ElementTransformFrame[] {
  const doc = targetEl.ownerDocument;
  const win = doc?.defaultView || (typeof window !== 'undefined' ? window : null);
  const readStyle = win && typeof win.getComputedStyle === 'function' ? win.getComputedStyle.bind(win) : null;

  if (!readStyle) {
    const w = targetEl.offsetWidth || 0;
    const h = targetEl.offsetHeight || 0;
    return [
      {
        offsetX: targetEl.offsetLeft || 0,
        offsetY: targetEl.offsetTop || 0,
        width: w,
        height: h,
        scrollLeft: 0,
        scrollTop: 0,
        transform: IDENTITY_MATRIX,
        transformOrigin: { x: w / 2, y: h / 2 },
      },
    ];
  }

  const domNodes: HTMLElement[] = [];
  let cursor: HTMLElement | null = targetEl;
  while (cursor) {
    domNodes.push(cursor);
    cursor = cursor.parentElement;
  }
  domNodes.reverse();

  const docEl = doc?.documentElement || null;
  const body = doc?.body || null;

  const isBodyPlainStatic = (() => {
    if (!body) return true;
    const bs = readStyle(body);
    const bodyMatrix = composeCssTransformMatrix({
      translate: bs.translate,
      rotate: bs.rotate,
      scale: bs.scale,
      transform: bs.transform,
    });
    return (
      bs.position === 'static' &&
      !isAffineNonTrivial(bodyMatrix) &&
      bodyMatrix[4] === 0 &&
      bodyMatrix[5] === 0 &&
      body.clientLeft === 0 &&
      body.clientTop === 0 &&
      body.scrollLeft === 0 &&
      body.scrollTop === 0
    );
  })();

  const frames: ElementTransformFrame[] = [];
  for (let i = 0; i < domNodes.length; i++) {
    const el = domNodes[i];
    const style = readStyle(el);
    const width = el.offsetWidth || 0;
    const height = el.offsetHeight || 0;
    const transform = composeCssTransformMatrix({
      translate: style.translate,
      rotate: style.rotate,
      scale: style.scale,
      transform: style.transform,
    });
    const transformOrigin = parseTransformOriginPx(style.transformOrigin, width, height);
    const scrollLeft = el.scrollLeft || 0;
    const scrollTop = el.scrollTop || 0;

    let offsetX = 0;
    let offsetY = 0;
    if (i === 0) {
      offsetX = el === docEl ? 0 : el.offsetLeft || 0;
      offsetY = el === docEl ? 0 : el.offsetTop || 0;
    } else {
      const parent = domNodes[i - 1];
      if (el === body && parent === docEl) {
        if (!isBodyPlainStatic || el === targetEl) {
          offsetX = Number.parseFloat(style.marginLeft) || 0;
          offsetY = Number.parseFloat(style.marginTop) || 0;
        }
      } else {
        const op = el.offsetParent as HTMLElement | null;
        if (op === parent) {
          if (parent === body) {
            offsetX = el.offsetLeft;
            offsetY = el.offsetTop;
          } else {
            offsetX = el.offsetLeft + parent.clientLeft;
            offsetY = el.offsetTop + parent.clientTop;
          }
        } else if (op === parent.offsetParent) {
          offsetX = el.offsetLeft - parent.offsetLeft;
          offsetY = el.offsetTop - parent.offsetTop;
        } else if (op === null && style.position === 'fixed') {
          offsetX = el.offsetLeft;
          offsetY = el.offsetTop;
        } else {
          const opIdx = op ? domNodes.indexOf(op) : -1;
          if (opIdx >= 0 && opIdx < i) {
            let sumPrevX = 0;
            let sumPrevY = 0;
            for (let k = opIdx + 1; k < i; k++) {
              sumPrevX += frames[k].offsetX;
              sumPrevY += frames[k].offsetY;
            }
            const opBorderX = op && op !== body ? op.clientLeft : 0;
            const opBorderY = op && op !== body ? op.clientTop : 0;
            offsetX = el.offsetLeft + opBorderX - sumPrevX;
            offsetY = el.offsetTop + opBorderY - sumPrevY;
          } else {
            offsetX = el.offsetLeft - parent.offsetLeft;
            offsetY = el.offsetTop - parent.offsetTop;
          }
        }
      }
    }

    frames.push({
      offsetX,
      offsetY,
      width,
      height,
      scrollLeft,
      scrollTop,
      transform,
      transformOrigin,
    });
  }

  return frames;
}

/**
 * Standard Tailwind spacing scale (px -> class number)
 */
const TAILWIND_SCALE: [number, string][] = [
  [0, '0'],
  [1, 'px'],
  [2, '0.5'],
  [4, '1'],
  [6, '1.5'],
  [8, '2'],
  [10, '2.5'],
  [12, '3'],
  [14, '3.5'],
  [16, '4'],
  [20, '5'],
  [24, '6'],
  [28, '7'],
  [32, '8'],
  [36, '9'],
  [40, '10'],
  [44, '11'],
  [48, '12'],
  [56, '14'],
  [64, '16'],
  [80, '20'],
  [96, '24'],
  [112, '28'],
  [128, '32'],
  [144, '36'],
  [160, '40'],
  [176, '44'],
  [192, '48'],
  [208, '52'],
  [224, '56'],
  [240, '60'],
  [256, '64'],
  [288, '72'],
  [320, '80'],
  [384, '96'],
];

const PX_TO_CLASS = new Map<number, string>(TAILWIND_SCALE);

/**
 * Client-side lookup for Tailwind classes.
 * Runs instantly without server requests.
 */
export function estimateTailwindClasses(
  widthPx?: number,
  heightPx?: number,
  translateX?: number,
  translateY?: number
): {
  widthClass?: string;
  heightClass?: string;
  translateClass?: string;
} {
  const result: { widthClass?: string; heightClass?: string; translateClass?: string } = {};

  if (typeof widthPx === 'number') {
    const rounded = roundValue(widthPx, 'nearest', 1);
    const tw = PX_TO_CLASS.get(rounded);
    result.widthClass = tw ? `w-${tw}` : `w-[${rounded}px]`;
  }

  if (typeof heightPx === 'number') {
    const rounded = roundValue(heightPx, 'nearest', 1);
    const tw = PX_TO_CLASS.get(rounded);
    result.heightClass = tw ? `h-${tw}` : `h-[${rounded}px]`;
  }

  if (typeof translateX === 'number' || typeof translateY === 'number') {
    const tx = roundValue(translateX || 0, 'nearest', 1);
    const ty = roundValue(translateY || 0, 'nearest', 1);
    result.translateClass = `translate-x-[${tx}px] translate-y-[${ty}px]`;
  }

  return result;
}
