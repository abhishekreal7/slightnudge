import {
  GEOMETRY_EPSILON,
  MATRIX_SINGULAR_EPSILON,
  type Bounds,
  type DecomposedMatrix,
  type Matrix2D,
  type Point2D,
  type Quad,
  type Rect,
  type RoundingMode,
} from './types';

export const IDENTITY_MATRIX: Matrix2D = [1, 0, 0, 1, 0, 0];

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function nearEqual(a: number, b: number, eps = GEOMETRY_EPSILON): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= eps;
}

export function vecAdd(a: Point2D, b: Point2D): Point2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vecSub(a: Point2D, b: Point2D): Point2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vecScale(v: Point2D, s: number): Point2D {
  return { x: v.x * s, y: v.y * s };
}

export function vecDot(a: Point2D, b: Point2D): number {
  return a.x * b.x + a.y * b.y;
}

export function vecCross(a: Point2D, b: Point2D): number {
  return a.x * b.y - a.y * b.x;
}

export function vecLen(v: Point2D): number {
  return Math.hypot(v.x, v.y);
}

export function vecDist(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function roundValue(value: number, mode: RoundingMode = 'nearest', step = 1): number {
  if (!Number.isFinite(value)) return 0;
  if (mode === 'none') return value;
  const s = Number.isFinite(step) && step > 0 ? step : 1;
  const scaled = value / s;
  let rounded: number;
  if (mode === 'floor') {
    rounded = Math.floor(scaled);
  } else if (mode === 'ceil') {
    rounded = Math.ceil(scaled);
  } else if (mode === 'half-away-from-zero') {
    rounded = scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
  } else {
    rounded = Math.round(scaled);
  }
  const result = rounded * s;
  return Object.is(result, -0) ? 0 : result;
}

export function roundPoint(point: Point2D, mode: RoundingMode = 'nearest', step = 1): Point2D {
  return {
    x: roundValue(point.x, mode, step),
    y: roundValue(point.y, mode, step),
  };
}

export function roundRect(rect: Rect, mode: RoundingMode = 'nearest', step = 1): Bounds {
  const left = roundValue(rect.left, mode, step);
  const top = roundValue(rect.top, mode, step);
  const width = Math.max(0, roundValue(rect.width, mode, step));
  const height = Math.max(0, roundValue(rect.height, mode, step));
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

export function toBounds(rect: Rect): Bounds {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    width: rect.width,
    height: rect.height,
  };
}

export function normalizeRect(rect: Rect, minSize = 0): Bounds {
  const floorMin = Number.isFinite(minSize) && minSize > 0 ? minSize : 0;
  const rawLeft = Number.isFinite(rect.left) ? rect.left : 0;
  const rawTop = Number.isFinite(rect.top) ? rect.top : 0;
  const rawWidth = Number.isFinite(rect.width) ? rect.width : 0;
  const rawHeight = Number.isFinite(rect.height) ? rect.height : 0;

  const left = rawWidth < 0 ? rawLeft + rawWidth : rawLeft;
  const top = rawHeight < 0 ? rawTop + rawHeight : rawTop;
  const width = Math.max(floorMin, Math.abs(rawWidth));
  const height = Math.max(floorMin, Math.abs(rawHeight));

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

export function matIdentity(): Matrix2D {
  return IDENTITY_MATRIX;
}

export function matTranslate(tx: number, ty: number): Matrix2D {
  return [1, 0, 0, 1, tx, ty];
}

export function matScale(sx: number, sy: number, originX = 0, originY = 0): Matrix2D {
  if (originX === 0 && originY === 0) {
    return [sx, 0, 0, sy, 0, 0];
  }
  return [sx, 0, 0, sy, originX * (1 - sx), originY * (1 - sy)];
}

export function matRotate(rad: number, originX = 0, originY = 0): Matrix2D {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  if (originX === 0 && originY === 0) {
    return [c, s, -s, c, 0, 0];
  }
  return [c, s, -s, c, originX - c * originX + s * originY, originY - s * originX - c * originY];
}

export function matSkew(skewXRad: number, skewYRad: number, originX = 0, originY = 0): Matrix2D {
  const tx = Math.tan(skewXRad);
  const ty = Math.tan(skewYRad);
  if (originX === 0 && originY === 0) {
    return [1, ty, tx, 1, 0, 0];
  }
  return [1, ty, tx, 1, -tx * originY, -ty * originX];
}

export function matWithOrigin(originX: number, originY: number, m: Matrix2D): Matrix2D {
  if (originX === 0 && originY === 0) return m;
  return matMultiplyRaw(
    matTranslate(originX, originY),
    matMultiplyRaw(m, matTranslate(-originX, -originY))
  );
}

function matMultiplyRaw(m1: Matrix2D, m2: Matrix2D): Matrix2D {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

export function matMultiply(m1: Matrix2D, m2: Matrix2D): Matrix2D {
  return matMultiplyRaw(m1, m2);
}

export function matCompose(...matrices: readonly Matrix2D[]): Matrix2D {
  let acc: Matrix2D = IDENTITY_MATRIX;
  for (let i = 0; i < matrices.length; i++) {
    acc = matMultiplyRaw(acc, matrices[i]);
  }
  return acc;
}

export function matDeterminant(m: Matrix2D): number {
  return m[0] * m[3] - m[1] * m[2];
}

export function matIsInvertible(m: Matrix2D, eps = MATRIX_SINGULAR_EPSILON): boolean {
  for (let i = 0; i < 6; i++) {
    if (!Number.isFinite(m[i])) return false;
  }
  const det = matDeterminant(m);
  return Number.isFinite(det) && Math.abs(det) > eps;
}

export function matInvert(m: Matrix2D): Matrix2D | null {
  if (!matIsInvertible(m)) return null;
  const [a, b, c, d, e, f] = m;
  const invDet = 1 / (a * d - b * c);
  return [
    d * invDet,
    -b * invDet,
    -c * invDet,
    a * invDet,
    (c * f - d * e) * invDet,
    (b * e - a * f) * invDet,
  ];
}

export function matDecompose(m: Matrix2D): DecomposedMatrix {
  const [a, b, c, d, e, f] = m;
  if (!matIsInvertible(m)) {
    return {
      translateX: Number.isFinite(e) ? e : 0,
      translateY: Number.isFinite(f) ? f : 0,
      rotateRad: 0,
      scaleX: 1,
      scaleY: 1,
      skewXRad: 0,
    };
  }

  let r0x = a;
  let r0y = b;
  let r1x = c;
  let r1y = d;

  let scaleX = Math.hypot(r0x, r0y);
  r0x /= scaleX;
  r0y /= scaleX;

  let skew = r0x * r1x + r0y * r1y;
  r1x -= r0x * skew;
  r1y -= r0y * skew;

  const scaleY = Math.hypot(r1x, r1y);
  r1x /= scaleY;
  r1y /= scaleY;
  skew /= scaleY;

  // Preserve reflection sign on scaleX when linear determinant < 0
  if (r0x * r1y - r0y * r1x < 0) {
    scaleX = -scaleX;
    r0x = -r0x;
    r0y = -r0y;
    skew = -skew;
  }

  const rotateRad = Math.atan2(r0y, r0x);
  const skewXRad = Math.atan(skew);

  return {
    translateX: e,
    translateY: f,
    rotateRad,
    scaleX,
    scaleY,
    skewXRad,
  };
}

export function matRecompose(dec: DecomposedMatrix): Matrix2D {
  return matCompose(
    matTranslate(dec.translateX, dec.translateY),
    matRotate(dec.rotateRad),
    matSkew(dec.skewXRad, 0),
    matScale(dec.scaleX, dec.scaleY)
  );
}

export function transformPoint(m: Matrix2D, p: Point2D): Point2D {
  return {
    x: m[0] * p.x + m[2] * p.y + m[4],
    y: m[1] * p.x + m[3] * p.y + m[5],
  };
}

export function transformVector(m: Matrix2D, v: Point2D): Point2D {
  return {
    x: m[0] * v.x + m[2] * v.y,
    y: m[1] * v.x + m[3] * v.y,
  };
}

export function rectCorners(rect: Rect): Quad {
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  return {
    nw: { x: rect.left, y: rect.top },
    ne: { x: right, y: rect.top },
    se: { x: right, y: bottom },
    sw: { x: rect.left, y: bottom },
  };
}

export function transformRectToQuad(m: Matrix2D, rect: Rect): Quad {
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  return {
    nw: transformPoint(m, { x: rect.left, y: rect.top }),
    ne: transformPoint(m, { x: right, y: rect.top }),
    se: transformPoint(m, { x: right, y: bottom }),
    sw: transformPoint(m, { x: rect.left, y: bottom }),
  };
}

export function quadBounds(quad: Quad): Bounds {
  const left = Math.min(quad.nw.x, quad.ne.x, quad.se.x, quad.sw.x);
  const top = Math.min(quad.nw.y, quad.ne.y, quad.se.y, quad.sw.y);
  const right = Math.max(quad.nw.x, quad.ne.x, quad.se.x, quad.sw.x);
  const bottom = Math.max(quad.nw.y, quad.ne.y, quad.se.y, quad.sw.y);
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

export function transformRectBounds(m: Matrix2D, rect: Rect): Bounds {
  return quadBounds(transformRectToQuad(m, rect));
}

export function quadContainsPoint(quad: Quad, p: Point2D): boolean {
  const corners = [quad.nw, quad.ne, quad.se, quad.sw] as const;
  let pos = false;
  let neg = false;
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) & 3];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (cross > GEOMETRY_EPSILON) pos = true;
    else if (cross < -GEOMETRY_EPSILON) neg = true;
    if (pos && neg) return false;
  }
  return true;
}

export function rectIntersects(a: Rect, b: Rect): boolean {
  return !(
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  );
}
