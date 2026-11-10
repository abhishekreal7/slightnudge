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
} from '../../lib/editor/geometry';

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
