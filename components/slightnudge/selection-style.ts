/**
 * SlightNudge Selection Chrome v2 - Variant Decision Engine
 * Pure function selectionStyleFor(info), corner radius parser, and affine screen geometry adapter.
 * 
 * Rules:
 * - Deterministic, table-driven variant mapping
 * - Per-corner radii parsing (px, rem, em, %, 9999px, elliptical, calc)
 * - 2px hysteresis for variant boundary stability
 * - Semantic handle suppression (dots only where resizing is physically actionable)
 * - Constant on-screen handle sizing & hit testing backed by lib/editor/geometry
 */

import {
  getHandleScreenPoint,
  matDecompose,
  predictElementScreenRect,
  radToDeg,
  roundValue,
  type CanvasSpace,
  type ElementTransformFrame,
  type Point2D,
  type Rect,
  type ScreenPrediction,
} from '../../lib/editor/geometry';
import {
  cursorForHandleAngle,
  isAffineNonTrivial,
  type ResizeCursor,
} from './direct-manipulation-engine';

export type SelectionVariant = 'dots' | 'arc' | 'capsule' | 'circle' | 'text' | 'media' | 'tiny';

export type HandleDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface SelectionChromeGeometry {
  prediction: ScreenPrediction;
  rotationDeg: number;
  handleScreenPoints: Partial<Record<HandleDirection, Point2D>>;
  isNonTrivialTransform: boolean;
  edgeCursors: Partial<Record<HandleDirection, ResizeCursor>>;
  localRect: Rect;
}

/**
 * Computes screen-space quad, AABB bounds, decomposed rotation angle, and visible handle positions
 * across nested ancestor transforms & scroll offsets using `lib/editor/geometry`.
 */
export function computeSelectionChromeGeometry(
  chain: readonly ElementTransformFrame[],
  space: CanvasSpace,
  visibleHandles: readonly HandleDirection[],
  viewportScroll: Point2D = { x: 0, y: 0 }
): SelectionChromeGeometry {
  const prediction = predictElementScreenRect(chain, space, viewportScroll);
  const target = chain[chain.length - 1];
  const localRect: Rect = {
    left: 0,
    top: 0,
    width: target ? target.width : 0,
    height: target ? target.height : 0,
  };
  const decomposed = matDecompose(prediction.matrix);
  const rotationDeg = radToDeg(decomposed.rotateRad);
  const isNonTrivialTransform = isAffineNonTrivial(prediction.matrix);
  const handleScreenPoints: Partial<Record<HandleDirection, Point2D>> = {};
  const edgeCursors: Partial<Record<HandleDirection, ResizeCursor>> = {};
  for (const handle of visibleHandles) {
    handleScreenPoints[handle] = getHandleScreenPoint(localRect, handle, prediction.matrix);
    edgeCursors[handle] = cursorForHandleAngle(prediction.quad, handle);
  }
  return {
    prediction,
    rotationDeg,
    handleScreenPoints,
    isNonTrivialTransform,
    edgeCursors,
    localRect,
  };
}

export interface CornerRadii {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

export interface CornerRadiiInput {
  topLeft?: number | string;
  topRight?: number | string;
  bottomRight?: number | string;
  bottomLeft?: number | string;
}

export interface SelectionInfo {
  tag?: string;
  role?: string;
  display?: string;
  width: number;
  height: number;
  borderRadius?: string | number | CornerRadiiInput;
  isText?: boolean;
  isMedia?: boolean;
  isContainer?: boolean;
  isControl?: boolean;
  zoom?: number;
  lockedAspect?: boolean;
  currentVariant?: SelectionVariant;
}

export interface RadiusGripConfig {
  visible: boolean;
  inset: number;
  currentRadius: number;
}

export interface SelectionChromeStyle {
  variant: SelectionVariant;
  outlineRadii: CornerRadii;
  effectiveRadius: number;
  visibleHandles: HandleDirection[];
  lockedAspect: boolean;
  minimumSizes: { minWidth: number; minHeight: number };
  radiusGrip: RadiusGripConfig;
}

/**
 * Parse arbitrary CSS border-radius value into 4 corner radii in CSS pixels.
 * Clamps radii according to CSS box model constraints.
 */
export function parseBorderRadius(
  val: string | number | CornerRadiiInput | undefined,
  width: number,
  height: number
): CornerRadii {
  if (width <= 0 || height <= 0 || val === undefined || val === null) {
    return { tl: 0, tr: 0, br: 0, bl: 0 };
  }

  const maxAllowed = Math.min(width, height) / 2;

  const parseUnit = (token: string | number | undefined): number => {
    if (token === undefined || token === null) return 0;
    if (typeof token === 'number') return Math.max(0, Math.min(token, maxAllowed));
    const str = String(token).trim();
    if (!str || str === '0') return 0;

    // 9999px or full pill
    if (str.includes('9999') || str === 'full' || str === 'rounded-full') {
      return maxAllowed;
    }

    // Tailwind class names support (rounded-lg, rounded-md, rounded-sm, etc.)
    const step = RADIUS_SCALE_STEPS.find(s => s.token === str || s.name === str);
    if (step) {
      return step.token === 'rounded-full' ? maxAllowed : Math.min(step.px, maxAllowed);
    }

    // Percentage: relative to min dimension
    if (str.endsWith('%')) {
      const pct = parseFloat(str);
      if (Number.isFinite(pct)) {
        return Math.max(0, Math.min((pct / 100) * Math.min(width, height), maxAllowed));
      }
      return 0;
    }

    // calc(...) expression, e.g. calc(1rem - 4px)
    if (str.startsWith('calc(') && str.endsWith(')')) {
      const expr = str.slice(5, -1).trim();
      // Handle simple binary calc (A + B, A - B)
      const match = expr.match(/^([0-9.]+(?:px|rem|em)?)\s*([\+\-])\s*([0-9.]+(?:px|rem|em)?)$/);
      if (match) {
        const left = parseUnit(match[1]);
        const op = match[2];
        const right = parseUnit(match[3]);
        const calcVal = op === '+' ? left + right : left - right;
        return Math.max(0, Math.min(calcVal, maxAllowed));
      }
    }

    // rem / em: assume 16px base font
    if (str.endsWith('rem')) {
      const rem = parseFloat(str);
      return Math.max(0, Math.min((rem || 0) * 16, maxAllowed));
    }
    if (str.endsWith('em')) {
      const em = parseFloat(str);
      return Math.max(0, Math.min((em || 0) * 16, maxAllowed));
    }

    // plain px or number
    const num = parseFloat(str.replace(/px$/, ''));
    if (Number.isFinite(num)) {
      return Math.max(0, Math.min(num, maxAllowed));
    }

    return 0;
  };

  // If object input with specific corners
  if (typeof val === 'object' && !Array.isArray(val)) {
    const input = val as CornerRadiiInput;
    return {
      tl: parseUnit(input.topLeft),
      tr: parseUnit(input.topRight),
      br: parseUnit(input.bottomRight),
      bl: parseUnit(input.bottomLeft),
    };
  }

  if (typeof val === 'number') {
    const r = parseUnit(val);
    return { tl: r, tr: r, br: r, bl: r };
  }

  let strVal = String(val).trim();
  // Strip elliptical second half if present (e.g. "50% / 20%" -> "50%")
  if (strVal.includes('/')) {
    strVal = strVal.split('/')[0].trim();
  }

  // If entire string is a calc(...) expression, parse it directly as single radius
  if (strVal.startsWith('calc(') && strVal.endsWith(')')) {
    const r = parseUnit(strVal);
    return { tl: r, tr: r, br: r, bl: r };
  }

  // Split tokens by whitespace (protecting calc() blocks if any)
  const tokens = strVal.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    const r = parseUnit(tokens[0]);
    return { tl: r, tr: r, br: r, bl: r };
  }
  if (tokens.length === 2) {
    // 2-value: top-left/bottom-right, top-right/bottom-left
    const tlBr = parseUnit(tokens[0]);
    const trBl = parseUnit(tokens[1]);
    return { tl: tlBr, tr: trBl, br: tlBr, bl: trBl };
  }
  if (tokens.length === 3) {
    // 3-value: top-left, top-right/bottom-left, bottom-right
    const tl = parseUnit(tokens[0]);
    const trBl = parseUnit(tokens[1]);
    const br = parseUnit(tokens[2]);
    return { tl, tr: trBl, br, bl: trBl };
  }
  if (tokens.length >= 4) {
    // 4-value: top-left, top-right, bottom-right, bottom-left
    return {
      tl: parseUnit(tokens[0]),
      tr: parseUnit(tokens[1]),
      br: parseUnit(tokens[2]),
      bl: parseUnit(tokens[3]),
    };
  }

  return { tl: 0, tr: 0, br: 0, bl: 0 };
}

export interface NamedRadiusStep {
  token: string;
  name: string;
  px: number;
}

export const RADIUS_SCALE_STEPS: NamedRadiusStep[] = [
  { token: 'rounded-none', name: 'none', px: 0 },
  { token: 'rounded-sm', name: 'sm', px: 2 },
  { token: 'rounded', name: 'base', px: 4 },
  { token: 'rounded-md', name: 'md', px: 6 },
  { token: 'rounded-lg', name: 'lg', px: 8 },
  { token: 'rounded-xl', name: 'xl', px: 12 },
  { token: 'rounded-2xl', name: '2xl', px: 16 },
  { token: 'rounded-3xl', name: '3xl', px: 24 },
  { token: 'rounded-full', name: 'full', px: 9999 },
];

export function findNearestRadiusStep(px: number, maxRadius: number): NamedRadiusStep {
  if (px <= 1) return RADIUS_SCALE_STEPS[0];
  if (px >= maxRadius - 2) return RADIUS_SCALE_STEPS[RADIUS_SCALE_STEPS.length - 1];

  let closest = RADIUS_SCALE_STEPS[0];
  let minDiff = Infinity;
  for (const step of RADIUS_SCALE_STEPS) {
    const targetPx = step.token === 'rounded-full' ? maxRadius : step.px;
    const diff = Math.abs(px - targetPx);
    if (diff < minDiff) {
      minDiff = diff;
      closest = step;
    }
  }
  return closest;
}

/**
 * Build SVG path for rounded rectangle offset 2px outside element.
 */
export function buildRoundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  radii: CornerRadii
): string {
  const maxR = Math.min(w, h) / 2;
  const tl = Math.max(0, Math.min(radii.tl, maxR));
  const tr = Math.max(0, Math.min(radii.tr, maxR));
  const br = Math.max(0, Math.min(radii.br, maxR));
  const bl = Math.max(0, Math.min(radii.bl, maxR));

  return (
    `M ${x + tl} ${y} ` +
    `H ${x + w - tr} ` +
    (tr > 0 ? `A ${tr} ${tr} 0 0 1 ${x + w} ${y + tr} ` : `L ${x + w} ${y} `) +
    `V ${y + h - br} ` +
    (br > 0 ? `A ${br} ${br} 0 0 1 ${x + w - br} ${y + h} ` : `L ${x + w} ${y + h} `) +
    `H ${x + bl} ` +
    (bl > 0 ? `A ${bl} ${bl} 0 0 1 ${x} ${y + h - bl} ` : `L ${x} ${y + h} `) +
    `V ${y + tl} ` +
    (tl > 0 ? `A ${tl} ${tl} 0 0 1 ${x + tl} ${y} ` : `L ${x} ${y} `) +
    `Z`
  );
}

/**
 * Build curved corner arc path hugging corner curve within 1px.
 * Arc length is clamped between 14 and 28 screen px.
 */
export function buildCornerArcPath(
  corner: 'nw' | 'ne' | 'se' | 'sw',
  width: number,
  height: number,
  cornerRadii: CornerRadii,
  zoom: number = 1
): { path: string; length: number; center: { x: number; y: number } } {
  const z = Math.max(0.01, zoom);
  const rBase =
    corner === 'nw'
      ? cornerRadii.tl
      : corner === 'ne'
      ? cornerRadii.tr
      : corner === 'se'
      ? cornerRadii.br
      : cornerRadii.bl;

  const maxR = Math.min(width, height) / 2;
  const r = Math.min(rBase, maxR);
  const R = r + 2;

  let xc = 0;
  let yc = 0;
  let diagAngle = 0;

  if (corner === 'nw') {
    xc = r;
    yc = r;
    diagAngle = 1.25 * Math.PI;
  } else if (corner === 'ne') {
    xc = width - r;
    yc = r;
    diagAngle = 1.75 * Math.PI;
  } else if (corner === 'se') {
    xc = width - r;
    yc = height - r;
    diagAngle = 0.25 * Math.PI;
  } else {
    // sw
    xc = r;
    yc = height - r;
    diagAngle = 0.75 * Math.PI;
  }

  // Desired arc length clamped to 14 - 28 screen px
  const maxArcLength = R * z * (Math.PI / 2);
  const Lscreen = Math.max(14, Math.min(28, maxArcLength));
  const delta = Math.min(Math.PI / 2, Lscreen / (R * z));

  const a1 = diagAngle - delta / 2;
  const a2 = diagAngle + delta / 2;

  const p1x = xc + R * Math.cos(a1);
  const p1y = yc + R * Math.sin(a1);
  const p2x = xc + R * Math.cos(a2);
  const p2y = yc + R * Math.sin(a2);

  const path = `M ${p1x.toFixed(2)} ${p1y.toFixed(2)} A ${R.toFixed(2)} ${R.toFixed(2)} 0 0 1 ${p2x.toFixed(2)} ${p2y.toFixed(2)}`;

  // Handle position for keyboard/hit center
  const centerDiagX = xc + R * Math.cos(diagAngle);
  const centerDiagY = yc + R * Math.sin(diagAngle);

  return {
    path,
    length: Lscreen,
    center: { x: centerDiagX, y: centerDiagY },
  };
}

/**
 * Build diagonal circle arc path for circle variant.
 */
export function buildCircleArcPath(
  corner: 'nw' | 'ne' | 'se' | 'sw',
  diameter: number,
  zoom: number = 1
): { path: string; length: number; center: { x: number; y: number } } {
  const radii: CornerRadii = {
    tl: diameter / 2,
    tr: diameter / 2,
    br: diameter / 2,
    bl: diameter / 2,
  };
  return buildCornerArcPath(corner, diameter, diameter, radii, zoom);
}

/**
 * Pure function: Given an element's geometry and styles, resolve selection variant,
 * outline radii, visible handles, aspect lock, and radius grip configuration.
 */
export function selectionStyleFor(info: SelectionInfo): SelectionChromeStyle {
  const {
    tag = 'div',
    role,
    display,
    width,
    height,
    borderRadius,
    isText,
    isMedia,
    isContainer,
    isControl,
    zoom = 1,
    lockedAspect = false,
    currentVariant,
  } = info;

  const outlineRadii = parseBorderRadius(borderRadius, width, height);
  const maxCorner = Math.max(outlineRadii.tl, outlineRadii.tr, outlineRadii.br, outlineRadii.bl);
  const shorterSide = Math.min(width, height);
  const effectiveRadius = Math.min(maxCorner, shorterSide / 2);

  const screenW = width * zoom;
  const screenH = height * zoom;
  const shorterScreenSide = Math.min(screenW, screenH);

  const defaultMinSizes = { minWidth: 1, minHeight: 1 };

  // 1. Degenerate cases: zero/negative size or non-rendered display
  if (width <= 0 || height <= 0 || display === 'contents' || display === 'none') {
    return {
      variant: 'dots',
      outlineRadii,
      effectiveRadius: 0,
      visibleHandles: [],
      lockedAspect: false,
      minimumSizes: defaultMinSizes,
      radiusGrip: { visible: false, inset: 0, currentRadius: 0 },
    };
  }

  // 2. Tiny elements: both sides under 24 screen px
  if (screenW < 24 && screenH < 24) {
    return {
      variant: 'tiny',
      outlineRadii,
      effectiveRadius,
      visibleHandles: ['se'], // Single corner handle, never overlaps
      lockedAspect: false,
      minimumSizes: defaultMinSizes,
      radiusGrip: { visible: false, inset: 0, currentRadius: effectiveRadius },
    };
  }

  // 3. Text variant: inline text, headings, paragraphs
  const isTextElement =
    Boolean(isText) ||
    (!isMedia &&
      !isContainer &&
      !isControl &&
      (role === 'heading' ||
        display === 'inline' ||
        ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'label', 'strong', 'em', 'b', 'i', 'small', 'sub', 'sup'].includes(tag.toLowerCase())));

  if (isTextElement) {
    const handles: HandleDirection[] = ['nw', 'ne', 'se', 'sw'];
    if (screenW >= 40) handles.push('w', 'e');
    return {
      variant: 'text',
      outlineRadii,
      effectiveRadius,
      visibleHandles: handles,
      lockedAspect: false,
      minimumSizes: defaultMinSizes,
      radiusGrip: { visible: false, inset: 0, currentRadius: 0 },
    };
  }

  // 4. Media variant: images, video, svg, canvas
  const isMediaElement =
    Boolean(isMedia) ||
    ['img', 'video', 'svg', 'canvas', 'picture', 'audio', 'iframe'].includes(tag.toLowerCase()) ||
    role === 'img';

  if (isMediaElement) {
    const handles: HandleDirection[] = ['nw', 'ne', 'se', 'sw'];
    if (screenW >= 40) handles.push('n', 's');
    if (screenH >= 40) handles.push('w', 'e');

    return {
      variant: 'media',
      outlineRadii,
      effectiveRadius,
      visibleHandles: handles,
      lockedAspect: true, // Media defaults to locked aspect, Shift inverts
      minimumSizes: defaultMinSizes,
      radiusGrip: {
        visible: effectiveRadius > 0,
        inset: Math.max(12, Math.min(24, roundValue(effectiveRadius + 6, 'nearest', 1))),
        currentRadius: effectiveRadius,
      },
    };
  }

  // 5. Radius thresholds with 2px / 2% hysteresis
  // Boundary 1: dots vs arc (default 6px)
  let arcThreshold = 6;
  if (currentVariant === 'dots') arcThreshold = 7; // Require 7px to enter arc
  if (currentVariant === 'arc') arcThreshold = 5; // Require < 5px to leave arc

  // Boundary 2: arc vs capsule/circle (default 45% of shorter side)
  let capsuleRatioThreshold = 0.45;
  if (currentVariant === 'arc') capsuleRatioThreshold = 0.47;
  if (currentVariant === 'capsule' || currentVariant === 'circle') capsuleRatioThreshold = 0.43;

  const currentRatio = shorterSide > 0 ? effectiveRadius / shorterSide : 0;

  // 6. Circle check: width within 2% of height and radius ~50%
  const dimDiff = Math.abs(width - height);
  const maxDim = Math.max(width, height);
  const isCircleProportions = maxDim > 0 && dimDiff / maxDim <= 0.02;

  if (currentRatio >= capsuleRatioThreshold && isCircleProportions) {
    return {
      variant: 'circle',
      outlineRadii,
      effectiveRadius,
      visibleHandles: ['nw', 'ne', 'se', 'sw'],
      lockedAspect: true,
      minimumSizes: defaultMinSizes,
      radiusGrip: {
        visible: true,
        inset: Math.max(12, Math.min(24, roundValue(effectiveRadius * 0.35 + 8, 'nearest', 1))),
        currentRadius: effectiveRadius,
      },
    };
  }

  // 7. Capsule check: radius >= 45% of shorter side and width != height
  if (currentRatio >= capsuleRatioThreshold && !isCircleProportions) {
    const handles: HandleDirection[] = ['nw', 'ne', 'se', 'sw'];
    if (screenW >= 40) handles.push('n', 's');
    if (screenH >= 40) handles.push('w', 'e');
    return {
      variant: 'capsule',
      outlineRadii,
      effectiveRadius,
      visibleHandles: handles,
      lockedAspect: false,
      minimumSizes: defaultMinSizes,
      radiusGrip: {
        visible: true,
        inset: Math.max(12, Math.min(24, roundValue(effectiveRadius + 6, 'nearest', 1))),
        currentRadius: effectiveRadius,
      },
    };
  }

  // 8. Arc check: 6px <= radius < 45% of shorter side
  if (effectiveRadius >= arcThreshold && currentRatio < capsuleRatioThreshold) {
    const handles: HandleDirection[] = ['nw', 'ne', 'se', 'sw'];
    // Edge handles are short rounded bars shown only when side >= 48 screen px
    if (screenW >= 48) handles.push('n', 's');
    if (screenH >= 48) handles.push('w', 'e');

    return {
      variant: 'arc',
      outlineRadii,
      effectiveRadius,
      visibleHandles: handles,
      lockedAspect: Boolean(lockedAspect),
      minimumSizes: defaultMinSizes,
      radiusGrip: {
        visible: true,
        inset: Math.max(12, Math.min(24, roundValue(effectiveRadius + 6, 'nearest', 1))),
        currentRadius: effectiveRadius,
      },
    };
  }

  // 9. Dots variant: radius < 6px (rectangles, containers, unknown)
  const handles: HandleDirection[] = ['nw', 'ne', 'se', 'sw'];
  // Sides under 40 screen px hide edge handles
  if (screenW >= 40) handles.push('n', 's');
  if (screenH >= 40) handles.push('w', 'e');

  return {
    variant: 'dots',
    outlineRadii,
    effectiveRadius,
    visibleHandles: handles,
    lockedAspect: Boolean(lockedAspect),
    minimumSizes: defaultMinSizes,
    radiusGrip: {
      visible: true,
      inset: Math.max(12, Math.min(20, roundValue(effectiveRadius + 6, 'nearest', 1))),
      currentRadius: effectiveRadius,
    },
  };
}
