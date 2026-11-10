import {
  IDENTITY_MATRIX,
  quadBounds,
  toBounds,
  transformPoint,
  transformRectToQuad,
} from './matrix';
import { screenDeltaToElementLocalDelta } from './spaces';
import type {
  Bounds,
  HandleId,
  Matrix2D,
  Point2D,
  Rect,
  ResizeInput,
  ResizeOutput,
} from './types';

function hasFiniteMatrix(m: Matrix2D): boolean {
  return (
    Number.isFinite(m[0]) &&
    Number.isFinite(m[1]) &&
    Number.isFinite(m[2]) &&
    Number.isFinite(m[3]) &&
    Number.isFinite(m[4]) &&
    Number.isFinite(m[5])
  );
}

function resolveAspectRatio(
  startSize: { readonly width: number; readonly height: number },
  aspectRatio?: boolean | number
): number | null {
  if (aspectRatio === true) {
    return startSize.width > 0 && startSize.height > 0
      ? startSize.width / startSize.height
      : null;
  }
  if (typeof aspectRatio === 'number') {
    return Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : null;
  }
  return null;
}

export function getHandleLocalPoint(rect: Rect, handle: HandleId): Point2D {
  const left = rect.left;
  const top = rect.top;
  const right = left + rect.width;
  const bottom = top + rect.height;
  const cx = left + rect.width / 2;
  const cy = top + rect.height / 2;

  switch (handle) {
    case 'nw':
      return { x: left, y: top };
    case 'n':
      return { x: cx, y: top };
    case 'ne':
      return { x: right, y: top };
    case 'e':
      return { x: right, y: cy };
    case 'se':
      return { x: right, y: bottom };
    case 's':
      return { x: cx, y: bottom };
    case 'sw':
      return { x: left, y: bottom };
    case 'w':
      return { x: left, y: cy };
  }
}

export function getHandleScreenPoint(
  rect: Rect,
  handle: HandleId,
  elementToScreen: Matrix2D = IDENTITY_MATRIX
): Point2D {
  const safeMatrix = hasFiniteMatrix(elementToScreen) ? elementToScreen : IDENTITY_MATRIX;
  return transformPoint(safeMatrix, getHandleLocalPoint(rect, handle));
}

export function solveResize(input: ResizeInput): ResizeOutput {
  const { startRect, handle, pointerDeltaScreen, constraints } = input;
  const rawMatrix = input.elementToScreen ?? IDENTITY_MATRIX;
  const matrixIsFinite = hasFiniteMatrix(rawMatrix);
  const safeMatrix = matrixIsFinite ? rawMatrix : IDENTITY_MATRIX;

  const rawLeft = startRect.left;
  const rawTop = startRect.top;
  const rawStartW = startRect.width;
  const rawStartH = startRect.height;

  const startSizeDegenerate =
    !Number.isFinite(rawLeft) ||
    !Number.isFinite(rawTop) ||
    !Number.isFinite(rawStartW) ||
    !Number.isFinite(rawStartH) ||
    rawStartW <= 0 ||
    rawStartH <= 0;

  const startLeft = Number.isFinite(rawLeft) ? rawLeft : 0;
  const startTop = Number.isFinite(rawTop) ? rawTop : 0;
  const sanitizedStartW = Number.isFinite(rawStartW) && rawStartW > 0 ? rawStartW : 0;
  const sanitizedStartH = Number.isFinite(rawStartH) && rawStartH > 0 ? rawStartH : 0;
  const startRight = startLeft + sanitizedStartW;
  const startBottom = startTop + sanitizedStartH;
  const cx = (startLeft + startRight) / 2;
  const cy = (startTop + startBottom) / 2;

  const deltaScreenFinite =
    Number.isFinite(pointerDeltaScreen.x) && Number.isFinite(pointerDeltaScreen.y);
  const localDelta =
    deltaScreenFinite && matrixIsFinite
      ? screenDeltaToElementLocalDelta(pointerDeltaScreen, safeMatrix)
      : null;

  const degenerate = startSizeDegenerate || !deltaScreenFinite || localDelta === null;
  const safeLocalDelta: Point2D = localDelta ?? { x: 0, y: 0 };

  const hasW = handle === 'nw' || handle === 'w' || handle === 'sw';
  const hasE = handle === 'ne' || handle === 'e' || handle === 'se';
  const hasN = handle === 'nw' || handle === 'n' || handle === 'ne';
  const hasS = handle === 'sw' || handle === 's' || handle === 'se';

  const snapX = constraints?.snapLocalX;
  const snapY = constraints?.snapLocalY;

  let deltaX = 0;
  if (hasW || hasE) {
    if (snapX !== undefined && snapX !== null && Number.isFinite(snapX)) {
      deltaX = hasE ? snapX - startRight : snapX - startLeft;
    } else {
      deltaX = safeLocalDelta.x;
    }
  }

  let deltaY = 0;
  if (hasN || hasS) {
    if (snapY !== undefined && snapY !== null && Number.isFinite(snapY)) {
      deltaY = hasS ? snapY - startBottom : snapY - startTop;
    } else {
      deltaY = safeLocalDelta.y;
    }
  }

  const fromCenter = Boolean(constraints?.fromCenter);

  let left = startLeft;
  let right = startRight;
  let top = startTop;
  let bottom = startBottom;

  if (hasW) left = startLeft + deltaX;
  if (hasE) right = startRight + deltaX;
  if (hasN) top = startTop + deltaY;
  if (hasS) bottom = startBottom + deltaY;

  if (fromCenter) {
    if (hasW && !hasE) right = startRight - deltaX;
    if (hasE && !hasW) left = startLeft - deltaX;
    if (hasN && !hasS) bottom = startBottom - deltaY;
    if (hasS && !hasN) top = startTop - deltaY;
  }

  const start = {
    width: sanitizedStartW > 0 ? sanitizedStartW : 1,
    height: sanitizedStartH > 0 ? sanitizedStartH : 1,
  };

  const minWidth = Math.max(
    1,
    constraints?.minWidth !== undefined && Number.isFinite(constraints.minWidth)
      ? constraints.minWidth
      : 1
  );
  const minHeight = Math.max(
    1,
    constraints?.minHeight !== undefined && Number.isFinite(constraints.minHeight)
      ? constraints.minHeight
      : 1
  );
  const maxWidth =
    constraints?.maxWidth !== undefined && Number.isFinite(constraints.maxWidth)
      ? Math.max(minWidth, constraints.maxWidth)
      : Infinity;
  const maxHeight =
    constraints?.maxHeight !== undefined && Number.isFinite(constraints.maxHeight)
      ? Math.max(minHeight, constraints.maxHeight)
      : Infinity;

  const targetRatio = resolveAspectRatio(start, constraints?.aspectRatio);

  const rawWidth = right - left;
  const rawHeight = bottom - top;

  let targetWidth = rawWidth;
  let targetHeight = rawHeight;

  if (targetRatio !== null) {
    const isHorizontalEdge = (hasW || hasE) && !hasN && !hasS;
    const isVerticalEdge = (hasN || hasS) && !hasW && !hasE;
    if (isHorizontalEdge) {
      targetWidth = rawWidth;
      targetHeight = rawWidth / targetRatio;
    } else if (isVerticalEdge) {
      targetHeight = rawHeight;
      targetWidth = rawHeight * targetRatio;
    } else {
      const relW = Math.abs(rawWidth - sanitizedStartW) / Math.max(1, sanitizedStartW);
      const relH = Math.abs(rawHeight - sanitizedStartH) / Math.max(1, sanitizedStartH);
      if (relW >= relH) {
        targetWidth = rawWidth;
        targetHeight = rawWidth / targetRatio;
      } else {
        targetHeight = rawHeight;
        targetWidth = rawHeight * targetRatio;
      }
    }
  }

  let clampedMinWidth = false;
  let clampedMaxWidth = false;
  let clampedMinHeight = false;
  let clampedMaxHeight = false;
  let width: number;
  let height: number;

  if (targetRatio !== null) {
    const effMinW = Math.max(minWidth, minHeight * targetRatio);
    const effMaxW = Math.min(maxWidth, maxHeight * targetRatio);
    clampedMinWidth = targetWidth < minWidth;
    clampedMaxWidth = targetWidth > maxWidth;
    clampedMinHeight = targetHeight < minHeight;
    clampedMaxHeight = targetHeight > maxHeight;

    if (effMinW <= effMaxW) {
      width = Math.min(effMaxW, Math.max(effMinW, targetWidth));
      height = width / targetRatio;
    } else {
      width = Math.min(maxWidth, Math.max(minWidth, targetWidth));
      height = Math.min(maxHeight, Math.max(minHeight, targetHeight));
    }
  } else {
    clampedMinWidth = targetWidth < minWidth;
    clampedMaxWidth = targetWidth > maxWidth;
    clampedMinHeight = targetHeight < minHeight;
    clampedMaxHeight = targetHeight > maxHeight;
    width = Math.min(maxWidth, Math.max(minWidth, targetWidth));
    height = Math.min(maxHeight, Math.max(minHeight, targetHeight));
  }

  let finalLeft: number;
  if (!hasW && !hasE && targetRatio === null) {
    finalLeft = startLeft;
  } else if (fromCenter || (!hasW && !hasE)) {
    finalLeft = cx - width / 2;
  } else if (hasW) {
    finalLeft = startRight - width;
  } else {
    finalLeft = startLeft;
  }

  let finalTop: number;
  if (!hasN && !hasS && targetRatio === null) {
    finalTop = startTop;
  } else if (fromCenter || (!hasN && !hasS)) {
    finalTop = cy - height / 2;
  } else if (hasN) {
    finalTop = startBottom - height;
  } else {
    finalTop = startTop;
  }

  const rect: Bounds = toBounds({
    left: finalLeft,
    top: finalTop,
    width,
    height,
  });

  const screenQuad = transformRectToQuad(safeMatrix, rect);
  const screenBounds = quadBounds(screenQuad);
  const handlePointLocal = getHandleLocalPoint(rect, handle);
  const handlePointScreen = transformPoint(safeMatrix, handlePointLocal);

  return {
    rect,
    screenQuad,
    screenBounds,
    handlePointLocal,
    handlePointScreen,
    clamped: {
      minWidth: clampedMinWidth,
      maxWidth: clampedMaxWidth,
      minHeight: clampedMinHeight,
      maxHeight: clampedMaxHeight,
    },
    degenerate,
  };
}
