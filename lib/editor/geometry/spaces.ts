import {
  IDENTITY_MATRIX,
  matInvert,
  matMultiply,
  matTranslate,
  matWithOrigin,
  quadBounds,
  roundValue,
  transformPoint,
  transformRectToQuad,
  transformVector,
} from './matrix';
import type {
  CanvasSpace,
  ElementTransformFrame,
  Matrix2D,
  Point2D,
  Rect,
  ScreenPrediction,
} from './types';

export function canvasToScreenMatrix(space: CanvasSpace): Matrix2D {
  const z = Number.isFinite(space.zoom) && space.zoom > 0 ? space.zoom : 1;
  return [z, 0, 0, z, space.originX + space.panX, space.originY + space.panY];
}

export function canvasToScreenPoint(point: Point2D, space: CanvasSpace): Point2D {
  return transformPoint(canvasToScreenMatrix(space), point);
}

export function screenToCanvasPoint(point: Point2D, space: CanvasSpace): Point2D | null {
  if (!Number.isFinite(space.zoom) || space.zoom <= 0) return null;
  const inv = matInvert(canvasToScreenMatrix(space));
  if (!inv) return null;
  return transformPoint(inv, point);
}

export function cssPxToDevicePx(cssPx: number, devicePixelRatio = 1): number {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return cssPx * dpr;
}

export function devicePxToCssPx(devicePx: number, devicePixelRatio = 1): number {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return devicePx / dpr;
}

export function snapCssToDevicePixelGrid(cssPx: number, devicePixelRatio = 1): number {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return roundValue(cssPx * dpr, 'nearest', 1) / dpr;
}

export function elementLocalTransformMatrix(frame: ElementTransformFrame): Matrix2D {
  const t = frame.transform ?? IDENTITY_MATRIX;
  if (
    t[0] === 1 &&
    t[1] === 0 &&
    t[2] === 0 &&
    t[3] === 1 &&
    t[4] === 0 &&
    t[5] === 0
  ) {
    return IDENTITY_MATRIX;
  }
  const ox = frame.transformOrigin?.x ?? frame.width / 2;
  const oy = frame.transformOrigin?.y ?? frame.height / 2;
  return matWithOrigin(ox, oy, t);
}

/**
 * Composes viewport scroll, canvas transform (origin + pan + zoom), and an ancestor chain
 * `[rootFrame, ..., parentFrame, targetFrame]` into a single 2D affine matrix from
 * target element-local border-box coordinates to screen CSS pixels.
 */
export function buildElementToScreenMatrix(
  chain: readonly ElementTransformFrame[],
  space: CanvasSpace,
  viewportScroll: Point2D = { x: 0, y: 0 }
): Matrix2D {
  let m = matMultiply(
    matTranslate(-viewportScroll.x, -viewportScroll.y),
    canvasToScreenMatrix(space)
  );

  for (let i = 0; i < chain.length; i++) {
    const frame = chain[i];
    if (frame.offsetX !== 0 || frame.offsetY !== 0) {
      m = matMultiply(m, matTranslate(frame.offsetX, frame.offsetY));
    }
    const localMat = elementLocalTransformMatrix(frame);
    if (localMat !== IDENTITY_MATRIX) {
      m = matMultiply(m, localMat);
    }
    if (i < chain.length - 1) {
      const scrollX = frame.scrollLeft ?? 0;
      const scrollY = frame.scrollTop ?? 0;
      if (scrollX !== 0 || scrollY !== 0) {
        m = matMultiply(m, matTranslate(-scrollX, -scrollY));
      }
    }
  }

  return m;
}

export function elementLocalToScreenPoint(
  localPoint: Point2D,
  elementToScreen: Matrix2D
): Point2D {
  return transformPoint(elementToScreen, localPoint);
}

export function screenToElementLocalPoint(
  screenPoint: Point2D,
  elementToScreen: Matrix2D
): Point2D | null {
  const inv = matInvert(elementToScreen);
  if (!inv) return null;
  return transformPoint(inv, screenPoint);
}

export function screenDeltaToElementLocalDelta(
  deltaScreen: Point2D,
  elementToScreen: Matrix2D
): Point2D | null {
  const inv = matInvert(elementToScreen);
  if (!inv) return null;
  return transformVector(inv, deltaScreen);
}

export function elementLocalToCanvasPoint(
  localPoint: Point2D,
  elementToScreen: Matrix2D,
  space: CanvasSpace
): Point2D | null {
  return screenToCanvasPoint(transformPoint(elementToScreen, localPoint), space);
}

export function canvasToElementLocalPoint(
  canvasPoint: Point2D,
  elementToScreen: Matrix2D,
  space: CanvasSpace
): Point2D | null {
  return screenToElementLocalPoint(canvasToScreenPoint(canvasPoint, space), elementToScreen);
}

export function predictElementScreenRect(
  chain: readonly ElementTransformFrame[],
  space: CanvasSpace,
  viewportScroll: Point2D = { x: 0, y: 0 },
  localRectOverride?: Rect
): ScreenPrediction {
  const target = chain[chain.length - 1];
  const localRect: Rect = localRectOverride ?? {
    left: 0,
    top: 0,
    width: target ? target.width : 0,
    height: target ? target.height : 0,
  };
  const matrix = buildElementToScreenMatrix(chain, space, viewportScroll);
  const quad = transformRectToQuad(matrix, localRect);
  const bounds = quadBounds(quad);
  return { matrix, quad, bounds };
}
