import { toBounds } from './matrix';
import type {
  AlignedRectItem,
  AlignReference,
  AlignmentKind,
  Bounds,
  DistributeMode,
  Rect,
} from './types';

export interface RectItem {
  readonly id: string;
  readonly rect: Rect;
}

function sanitizeRect(rect: Rect): Bounds {
  const left = Number.isFinite(rect.left) ? rect.left : 0;
  const top = Number.isFinite(rect.top) ? rect.top : 0;
  const width = Number.isFinite(rect.width) && rect.width > 0 ? rect.width : 0;
  const height = Number.isFinite(rect.height) && rect.height > 0 ? rect.height : 0;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

export function computeSelectionBounds(items: readonly RectItem[]): Bounds | null {
  if (items.length === 0) return null;
  let minLeft = Infinity;
  let minTop = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;

  for (let i = 0; i < items.length; i++) {
    const b = sanitizeRect(items[i].rect);
    if (b.left < minLeft) minLeft = b.left;
    if (b.top < minTop) minTop = b.top;
    if (b.right > maxRight) maxRight = b.right;
    if (b.bottom > maxBottom) maxBottom = b.bottom;
  }

  return toBounds({
    left: minLeft,
    top: minTop,
    width: maxRight - minLeft,
    height: maxBottom - minTop,
  });
}

export function alignRects(
  items: readonly RectItem[],
  alignment: AlignmentKind,
  reference: AlignReference = 'selection'
): AlignedRectItem[] {
  if (items.length === 0) return [];

  let refBounds: Bounds;
  if (reference === 'selection') {
    refBounds = computeSelectionBounds(items)!;
  } else if (reference === 'first') {
    refBounds = sanitizeRect(items[0].rect);
  } else {
    refBounds = sanitizeRect(reference);
  }

  const refCenterX = refBounds.left + refBounds.width / 2;
  const refCenterY = refBounds.top + refBounds.height / 2;

  return items.map((item) => {
    const b = sanitizeRect(item.rect);
    let left = b.left;
    let top = b.top;

    switch (alignment) {
      case 'left':
        left = refBounds.left;
        break;
      case 'center-x':
        left = refCenterX - b.width / 2;
        break;
      case 'right':
        left = refBounds.right - b.width;
        break;
      case 'top':
        top = refBounds.top;
        break;
      case 'center-y':
        top = refCenterY - b.height / 2;
        break;
      case 'bottom':
        top = refBounds.bottom - b.height;
        break;
    }

    return {
      id: item.id,
      rect: toBounds({
        left,
        top,
        width: b.width,
        height: b.height,
      }),
    };
  });
}

interface NormalizedRectItem {
  readonly idx: number;
  readonly id: string;
  readonly bounds: Bounds;
}

function normalizeAndSortItems(
  items: readonly RectItem[],
  axis: 'horizontal' | 'vertical'
): NormalizedRectItem[] {
  const isHoriz = axis === 'horizontal';
  return items
    .map((item, idx) => ({
      idx,
      id: item.id,
      bounds: sanitizeRect(item.rect),
    }))
    .sort((a, b) => {
      const primary = isHoriz
        ? a.bounds.left - b.bounds.left
        : a.bounds.top - b.bounds.top;
      if (primary !== 0) return primary;
      return isHoriz ? a.bounds.top - b.bounds.top : a.bounds.left - b.bounds.left;
    });
}

function placeAlongAxis(
  bounds: Bounds,
  axis: 'horizontal' | 'vertical',
  position: number
): Bounds {
  return axis === 'horizontal'
    ? toBounds({ left: position, top: bounds.top, width: bounds.width, height: bounds.height })
    : toBounds({ left: bounds.left, top: position, width: bounds.width, height: bounds.height });
}

export function distributeRects(
  items: readonly RectItem[],
  axis: 'horizontal' | 'vertical',
  mode: DistributeMode = 'spacing'
): AlignedRectItem[] {
  if (items.length === 0) return [];
  if (items.length <= 2) {
    return items.map((item) => ({ id: item.id, rect: sanitizeRect(item.rect) }));
  }

  const sorted = normalizeAndSortItems(items, axis);
  const out = new Array<AlignedRectItem>(items.length);
  const isHoriz = axis === 'horizontal';
  const first = sorted[0].bounds;
  const last = sorted[sorted.length - 1].bounds;

  if (mode === 'centers' || mode === 'edges') {
    const startAnchor =
      mode === 'centers'
        ? isHoriz
          ? first.left + first.width / 2
          : first.top + first.height / 2
        : isHoriz
          ? first.left
          : first.top;
    const endAnchor =
      mode === 'centers'
        ? isHoriz
          ? last.left + last.width / 2
          : last.top + last.height / 2
        : isHoriz
          ? last.left
          : last.top;
    const step = (endAnchor - startAnchor) / (sorted.length - 1);

    for (let k = 0; k < sorted.length; k++) {
      const entry = sorted[k];
      const b = entry.bounds;
      const anchor = startAnchor + k * step;
      const size = isHoriz ? b.width : b.height;
      const pos = mode === 'centers' ? anchor - size / 2 : anchor;
      out[entry.idx] = { id: entry.id, rect: placeAlongAxis(b, axis, pos) };
    }
    return out;
  }

  const spanStart = isHoriz ? first.left : first.top;
  let spanEnd = isHoriz ? last.right : last.bottom;
  let totalSize = 0;
  for (let k = 0; k < sorted.length; k++) {
    const b = sorted[k].bounds;
    const edgeEnd = isHoriz ? b.right : b.bottom;
    if (edgeEnd > spanEnd) spanEnd = edgeEnd;
    totalSize += isHoriz ? b.width : b.height;
  }
  const gap = (spanEnd - spanStart - totalSize) / (sorted.length - 1);
  return layoutFromStartWithGap(sorted, out, axis, spanStart, gap);
}

function layoutFromStartWithGap(
  sorted: readonly NormalizedRectItem[],
  out: AlignedRectItem[],
  axis: 'horizontal' | 'vertical',
  startCursor: number,
  gap: number
): AlignedRectItem[] {
  const isHoriz = axis === 'horizontal';
  let cursor = startCursor;
  for (let k = 0; k < sorted.length; k++) {
    const entry = sorted[k];
    const b = entry.bounds;
    const size = isHoriz ? b.width : b.height;
    out[entry.idx] = { id: entry.id, rect: placeAlongAxis(b, axis, cursor) };
    cursor += size + gap;
  }
  return out;
}

export function spaceRectsWithGap(
  items: readonly RectItem[],
  axis: 'horizontal' | 'vertical',
  gap: number
): AlignedRectItem[] {
  if (items.length === 0) return [];
  const safeGap = Number.isFinite(gap) ? gap : 0;
  const sorted = normalizeAndSortItems(items, axis);
  const out = new Array<AlignedRectItem>(items.length);
  const startCursor = axis === 'horizontal' ? sorted[0].bounds.left : sorted[0].bounds.top;
  return layoutFromStartWithGap(sorted, out, axis, startCursor, safeGap);
}
