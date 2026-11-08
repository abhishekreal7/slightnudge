/**
 * SlightNudge Direct Manipulation Engine
 * Frontend-only 60fps direct manipulation for resize and drag.
 * 
 * Rules:
 * - No React state updates during drag
 * - Single rAF loop per frame
 * - Cached geometry at pointerdown (zero getBoundingClientRect inside pointermove)
 * - 8 handles (nw, n, ne, e, se, s, sw, w)
 * - Zoom-invariant handles and cursor grab accuracy
 * - Shift (aspect ratio), Alt (center resize), min-size (1px), Ctrl/Cmd (disable snapping)
 * - Smart snapping (<1ms for 50 siblings) with 1px accent guides
 * - Client-side Tailwind class lookup table (no server request during drag)
 */

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
 * Compute 8-handle resize geometry with sub-pixel precision.
 * Preserves anchor offset, zoom scaling, aspect ratio (Shift), center-resize (Alt), and minimum 1px bounds.
 */
export function compute8HandleResize(params: ResizeParams): ResizeResult {
  const {
    handle,
    startRect,
    zoom,
    pointerDeltaScreen,
    shiftKey = false,
    altKey = false,
    snapX = null,
    snapY = null,
    minSize = 1,
  } = params;

  // Screen delta scaled by canvas zoom
  const z = Math.max(0.01, zoom);
  let dx = pointerDeltaScreen.x / z;
  let dy = pointerDeltaScreen.y / z;

  // Apply snap override if provided
  if (snapX !== null) {
    if (handle.includes('e')) {
      dx = snapX - (startRect.left + startRect.width);
    } else if (handle.includes('w')) {
      dx = snapX - startRect.left;
    }
  }
  if (snapY !== null) {
    if (handle.includes('s')) {
      dy = snapY - (startRect.top + startRect.height);
    } else if (handle.includes('n')) {
      dy = snapY - startRect.top;
    }
  }

  const aspectRatio = startRect.width / Math.max(1, startRect.height);

  let newLeft = startRect.left;
  let newTop = startRect.top;
  let newWidth = startRect.width;
  let newHeight = startRect.height;

  // Calculate unconstrained deltas based on handle direction
  const changesEast = handle.includes('e');
  const changesWest = handle.includes('w');
  const changesSouth = handle.includes('s');
  const changesNorth = handle.includes('n');

  if (altKey) {
    // Alt: Resize symmetrically from center
    if (changesEast) {
      newWidth = startRect.width + 2 * dx;
      newLeft = startRect.left - dx;
    } else if (changesWest) {
      newWidth = startRect.width - 2 * dx;
      newLeft = startRect.left + dx;
    }

    if (changesSouth) {
      newHeight = startRect.height + 2 * dy;
      newTop = startRect.top - dy;
    } else if (changesNorth) {
      newHeight = startRect.height - 2 * dy;
      newTop = startRect.top + dy;
    }
  } else {
    // Standard edge/corner manipulation
    if (changesEast) {
      newWidth = startRect.width + dx;
    } else if (changesWest) {
      newWidth = startRect.width - dx;
      newLeft = startRect.left + dx;
    }

    if (changesSouth) {
      newHeight = startRect.height + dy;
    } else if (changesNorth) {
      newHeight = startRect.height - dy;
      newTop = startRect.top + dy;
    }
  }

  // Shift: Maintain aspect ratio
  if (shiftKey) {
    const isCorner = (changesEast || changesWest) && (changesSouth || changesNorth);
    if (isCorner) {
      // Determine dominant dimension change
      const dw = newWidth - startRect.width;
      const dh = newHeight - startRect.height;

      if (Math.abs(dw) >= Math.abs(dh * aspectRatio)) {
        // Width drives height
        const targetHeight = Math.max(minSize, newWidth / aspectRatio);
        const heightDelta = targetHeight - startRect.height;
        if (altKey) {
          newHeight = targetHeight;
          newTop = startRect.top - heightDelta / 2;
        } else if (changesNorth) {
          newTop = startRect.top - (targetHeight - startRect.height);
          newHeight = targetHeight;
        } else {
          newHeight = targetHeight;
        }
      } else {
        // Height drives width
        const targetWidth = Math.max(minSize, newHeight * aspectRatio);
        const widthDelta = targetWidth - startRect.width;
        if (altKey) {
          newWidth = targetWidth;
          newLeft = startRect.left - widthDelta / 2;
        } else if (changesWest) {
          newLeft = startRect.left - (targetWidth - startRect.width);
          newWidth = targetWidth;
        } else {
          newWidth = targetWidth;
        }
      }
    } else if (changesEast || changesWest) {
      // Edge drag with Shift scales both dimensions
      const targetHeight = Math.max(minSize, newWidth / aspectRatio);
      const heightDelta = targetHeight - startRect.height;
      newHeight = targetHeight;
      newTop = startRect.top - heightDelta / 2;
    } else if (changesNorth || changesSouth) {
      const targetWidth = Math.max(minSize, newHeight * aspectRatio);
      const widthDelta = targetWidth - startRect.width;
      newWidth = targetWidth;
      newLeft = startRect.left - widthDelta / 2;
    }
  }

  // Minimum size clamping (min 1px)
  if (newWidth < minSize) {
    if (altKey) {
      newLeft = startRect.left + (startRect.width - minSize) / 2;
    } else if (changesWest) {
      newLeft = startRect.left + startRect.width - minSize;
    }
    newWidth = minSize;
  }

  if (newHeight < minSize) {
    if (altKey) {
      newTop = startRect.top + (startRect.height - minSize) / 2;
    } else if (changesNorth) {
      newTop = startRect.top + startRect.height - minSize;
    }
    newHeight = minSize;
  }

  return {
    left: newLeft,
    top: newTop,
    width: newWidth,
    height: newHeight,
    right: newLeft + newWidth,
    bottom: newTop + newHeight,
  };
}

export interface GuideLine {
  type: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
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

/**
 * Smart snapping: Snaps edges & centers to siblings and container.
 * Must run in < 1 ms for 50 siblings.
 */
export function computeSmartSnapping(params: SnapParams): SnapResult {
  const { box, siblings, containerRect, thresholdScreenPx, zoom, disabled = false } = params;

  if (disabled) {
    return { snappedX: false, snappedY: false, dx: 0, dy: 0, guides: [] };
  }

  const threshold = Math.max(0.5, thresholdScreenPx / Math.max(0.01, zoom));
  const boxCenterX = box.left + box.width / 2;
  const boxCenterY = box.top + box.height / 2;

  let bestDeltaX = 0;
  let minDiffX = threshold + 1;
  let snappedX = false;
  let guideLineX: GuideLine | null = null;

  let bestDeltaY = 0;
  let minDiffY = threshold + 1;
  let snappedY = false;
  let guideLineY: GuideLine | null = null;

  const boxXEdges = [
    { pos: box.left, type: 'left' as const },
    { pos: boxCenterX, type: 'center' as const },
    { pos: box.right, type: 'right' as const },
  ];

  const boxYEdges = [
    { pos: box.top, type: 'top' as const },
    { pos: boxCenterY, type: 'center' as const },
    { pos: box.bottom, type: 'bottom' as const },
  ];

  // Candidates list: container edges + sibling edges
  // Container:
  if (containerRect) {
    const cTargetsX = [containerRect.left, containerRect.left + containerRect.width / 2, containerRect.right];
    for (const edge of boxXEdges) {
      for (const target of cTargetsX) {
        const diff = target - edge.pos;
        const absDiff = Math.abs(diff);
        if (absDiff <= threshold && absDiff < minDiffX) {
          minDiffX = absDiff;
          bestDeltaX = diff;
          snappedX = true;
          guideLineX = {
            type: 'vertical',
            position: target,
            start: Math.min(box.top, containerRect.top),
            end: Math.max(box.bottom, containerRect.bottom),
          };
        }
      }
    }

    const cTargetsY = [containerRect.top, containerRect.top + containerRect.height / 2, containerRect.bottom];
    for (const edge of boxYEdges) {
      for (const target of cTargetsY) {
        const diff = target - edge.pos;
        const absDiff = Math.abs(diff);
        if (absDiff <= threshold && absDiff < minDiffY) {
          minDiffY = absDiff;
          bestDeltaY = diff;
          snappedY = true;
          guideLineY = {
            type: 'horizontal',
            position: target,
            start: Math.min(box.left, containerRect.left),
            end: Math.max(box.right, containerRect.right),
          };
        }
      }
    }
  }

  // Siblings:
  const siblingCount = siblings.length;
  for (let i = 0; i < siblingCount; i++) {
    const sib = siblings[i];
    const sibXTargets = [sib.left, sib.centerX, sib.right];
    for (let e = 0; e < 3; e++) {
      const edge = boxXEdges[e];
      for (let s = 0; s < 3; s++) {
        const target = sibXTargets[s];
        const diff = target - edge.pos;
        const absDiff = Math.abs(diff);
        if (absDiff <= threshold && absDiff < minDiffX) {
          minDiffX = absDiff;
          bestDeltaX = diff;
          snappedX = true;
          guideLineX = {
            type: 'vertical',
            position: target,
            start: Math.min(box.top, sib.top) - 10,
            end: Math.max(box.bottom, sib.bottom) + 10,
          };
        }
      }
    }

    const sibYTargets = [sib.top, sib.centerY, sib.bottom];
    for (let e = 0; e < 3; e++) {
      const edge = boxYEdges[e];
      for (let s = 0; s < 3; s++) {
        const target = sibYTargets[s];
        const diff = target - edge.pos;
        const absDiff = Math.abs(diff);
        if (absDiff <= threshold && absDiff < minDiffY) {
          minDiffY = absDiff;
          bestDeltaY = diff;
          snappedY = true;
          guideLineY = {
            type: 'horizontal',
            position: target,
            start: Math.min(box.left, sib.left) - 10,
            end: Math.max(box.right, sib.right) + 10,
          };
        }
      }
    }
  }

  const guides: GuideLine[] = [];
  if (guideLineX) guides.push(guideLineX);
  if (guideLineY) guides.push(guideLineY);

  return {
    snappedX,
    snappedY,
    dx: bestDeltaX,
    dy: bestDeltaY,
    guides,
  };
}

/**
 * Arrow key nudge computation: 1px default, 10px with Shift.
 */
export function computeArrowNudge(
  pos: { x: number; y: number },
  key: string,
  shiftKey = false
): { x: number; y: number } {
  const step = shiftKey ? 10 : 1;
  switch (key) {
    case 'ArrowRight':
      return { x: pos.x + step, y: pos.y };
    case 'ArrowLeft':
      return { x: pos.x - step, y: pos.y };
    case 'ArrowDown':
      return { x: pos.x, y: pos.y + step };
    case 'ArrowUp':
      return { x: pos.x, y: pos.y - step };
    default:
      return { ...pos };
  }
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
    const rounded = Math.round(widthPx);
    const tw = PX_TO_CLASS.get(rounded);
    result.widthClass = tw ? `w-${tw}` : `w-[${rounded}px]`;
  }

  if (typeof heightPx === 'number') {
    const rounded = Math.round(heightPx);
    const tw = PX_TO_CLASS.get(rounded);
    result.heightClass = tw ? `h-${tw}` : `h-[${rounded}px]`;
  }

  if (typeof translateX === 'number' || typeof translateY === 'number') {
    const tx = Math.round(translateX || 0);
    const ty = Math.round(translateY || 0);
    result.translateClass = `translate-x-[${tx}px] translate-y-[${ty}px]`;
  }

  return result;
}
