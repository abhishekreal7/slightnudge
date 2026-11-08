/**
 * SlightNudge Selection Chrome v2 - Variant Decision Engine
 * Pure function selectionStyleFor(info) and corner radius parser.
 * 
 * Rules:
 * - Deterministic, table-driven variant mapping
 * - Per-corner radii parsing (px, rem, em, %, 9999px, elliptical, calc)
 * - 2px hysteresis for variant boundary stability
 * - Semantic handle suppression (dots only where resizing is physically actionable)
 * - Constant on-screen handle sizing & hit testing
 */

export type SelectionVariant = 'dots' | 'arc' | 'capsule' | 'circle' | 'text' | 'media' | 'tiny';

export type HandleDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

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
    if (str.includes('9999') || str === 'full') {
      return maxAllowed;
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
    return {
      variant: 'text',
      outlineRadii,
      effectiveRadius,
      visibleHandles: ['w', 'e'], // Width-only resize handles
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
        inset: Math.max(12, Math.min(24, Math.round(effectiveRadius + 6))),
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
        inset: Math.max(12, Math.min(24, Math.round(effectiveRadius * 0.35 + 8))),
        currentRadius: effectiveRadius,
      },
    };
  }

  // 7. Capsule check: radius >= 45% of shorter side and width != height
  if (currentRatio >= capsuleRatioThreshold && !isCircleProportions) {
    return {
      variant: 'capsule',
      outlineRadii,
      effectiveRadius,
      visibleHandles: ['n', 'e', 's', 'w'], // Capsule end handles + slim edge bars
      lockedAspect: false,
      minimumSizes: defaultMinSizes,
      radiusGrip: {
        visible: true,
        inset: Math.max(12, Math.min(24, Math.round(effectiveRadius + 6))),
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
        inset: Math.max(12, Math.min(24, Math.round(effectiveRadius + 6))),
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
      inset: Math.max(12, Math.min(20, Math.round(effectiveRadius + 6))),
      currentRadius: effectiveRadius,
    },
  };
}
