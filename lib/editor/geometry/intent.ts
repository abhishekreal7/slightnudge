import type {
  ChildLayoutDescriptor,
  FlowSiblingDescriptor,
  GridTrackLine,
  LayoutIntent,
  LayoutIntentInput,
  ParentLayoutDescriptor,
  Point2D,
  Rect,
} from './types';

const SUBPIXEL_NOOP_PX = 1e-3;
const RESIZE_SNAP_TOLERANCE_PX = 2;

function isAutoMarginCenterConflict(child: ChildLayoutDescriptor, axis: 'x' | 'y'): boolean {
  const m = child.margins;
  if (!m) return false;
  if (axis === 'x') {
    return m.left === 'auto' && m.right === 'auto';
  }
  return m.top === 'auto' && m.bottom === 'auto';
}

function classifyResizeIntent(
  parent: ParentLayoutDescriptor,
  child: ChildLayoutDescriptor,
  fromRect: Rect,
  toRect: Rect
): LayoutIntent {
  if (child.display === 'inline') {
    return {
      kind: 'ambiguous',
      reason: 'Node with display: inline ignores width and height; use inline-block or block',
    };
  }

  const dw = toRect.width - fromRect.width;
  const dh = toRect.height - fromRect.height;
  if (Math.abs(dw) < 0.5 && Math.abs(dh) < 0.5) {
    return { kind: 'no-op', reason: 'Resize produced negligible dimensional change' };
  }

  const wMoved = Math.abs(dw) >= 0.5;
  const hMoved = Math.abs(dh) >= 0.5;
  const axis: 'width' | 'height' | 'both' = wMoved && hMoved ? 'both' : wMoved ? 'width' : 'height';

  // Asymmetric resize on an axis centered via paired margin: auto conflicts with CSS centering.
  if (wMoved && isAutoMarginCenterConflict(child, 'x')) {
    const fromCx = fromRect.left + fromRect.width / 2;
    const toCx = toRect.left + toRect.width / 2;
    if (Math.abs(toCx - fromCx) > 0.5) {
      return {
        kind: 'ambiguous',
        reason: 'Asymmetric horizontal resize conflicts with horizontal margin: auto centering',
      };
    }
  }
  if (hMoved && isAutoMarginCenterConflict(child, 'y')) {
    const fromCy = fromRect.top + fromRect.height / 2;
    const toCy = toRect.top + toRect.height / 2;
    if (Math.abs(toCy - fromCy) > 0.5) {
      return {
        kind: 'ambiguous',
        reason: 'Asymmetric vertical resize conflicts with vertical margin: auto centering',
      };
    }
  }

  const parentW = parent.rect.width;
  const parentH = parent.rect.height;
  const isFillW =
    wMoved && parentW > 0 && Math.abs(toRect.width - parentW) <= RESIZE_SNAP_TOLERANCE_PX;
  const isFillH =
    hMoved && parentH > 0 && Math.abs(toRect.height - parentH) <= RESIZE_SNAP_TOLERANCE_PX;

  if ((wMoved ? isFillW : true) && (hMoved ? isFillH : true) && (isFillW || isFillH)) {
    return { kind: 'size-fill', axis };
  }

  const intrinsic = child.intrinsicSize;
  const isFitW =
    wMoved &&
    intrinsic !== undefined &&
    intrinsic.width > 0 &&
    Math.abs(toRect.width - intrinsic.width) <= RESIZE_SNAP_TOLERANCE_PX;
  const isFitH =
    hMoved &&
    intrinsic !== undefined &&
    intrinsic.height > 0 &&
    Math.abs(toRect.height - intrinsic.height) <= RESIZE_SNAP_TOLERANCE_PX;

  if ((wMoved ? isFitW : true) && (hMoved ? isFitH : true) && (isFitW || isFitH)) {
    return { kind: 'size-fit', axis };
  }

  if (axis === 'width') {
    return { kind: 'size-fixed', axis: 'width', width: toRect.width };
  }
  if (axis === 'height') {
    return { kind: 'size-fixed', axis: 'height', height: toRect.height };
  }
  return { kind: 'size-fixed', axis: 'both', width: toRect.width, height: toRect.height };
}

function classifyOutOfFlowMove(
  child: ChildLayoutDescriptor,
  dx: number,
  dy: number,
  isRtl: boolean
): LayoutIntent {
  const position = child.position === 'fixed' ? 'fixed' : 'absolute';
  const insets = child.insets;
  const hasLeft = typeof insets?.left === 'number';
  const hasRight = typeof insets?.right === 'number';
  const hasTop = typeof insets?.top === 'number';
  const hasBottom = typeof insets?.bottom === 'number';

  if ((hasLeft && hasRight) || (hasTop && hasBottom)) {
    return {
      kind: 'ambiguous',
      reason: 'Opposing insets are both numeric; translation inset target is over-constrained',
    };
  }

  const insetDeltas: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  } = {};

  if (hasRight && !hasLeft) {
    insetDeltas.right = -dx;
  } else if (!hasLeft && !hasRight && isRtl) {
    insetDeltas.right = -dx;
  } else {
    insetDeltas.left = dx;
  }

  if (hasBottom && !hasTop) {
    insetDeltas.bottom = -dy;
  } else {
    insetDeltas.top = dy;
  }

  return {
    kind: 'absolute-offset',
    position,
    deltaX: dx,
    deltaY: dy,
    insetDeltas,
  };
}

function findSpatialTrackPosition(tracks: readonly GridTrackLine[], coord: number): number {
  const sorted = [...tracks].sort((a, b) => a.start - b.start);
  let bestPos = 0;
  let bestDist = Infinity;
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (coord >= t.start && coord <= t.end) {
      return i;
    }
    const mid = (t.start + t.end) / 2;
    const d = Math.abs(coord - mid);
    if (d < bestDist) {
      bestDist = d;
      bestPos = i;
    }
  }
  return bestPos;
}

function classifyGridMove(
  parent: ParentLayoutDescriptor,
  child: ChildLayoutDescriptor,
  from: Point2D,
  to: Point2D,
  isRtl: boolean
): LayoutIntent {
  const cols = parent.gridColumns;
  const rows = parent.gridRows;
  if (!cols || cols.length === 0 || !rows || rows.length === 0) {
    return {
      kind: 'ambiguous',
      reason: 'Grid container lacks explicit track bounds for column/row targeting',
    };
  }

  const fromColPos = findSpatialTrackPosition(cols, from.x);
  const toColPos = findSpatialTrackPosition(cols, to.x);
  const fromRowPos = findSpatialTrackPosition(rows, from.y);
  const toRowPos = findSpatialTrackPosition(rows, to.y);

  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  if (fromColPos === toColPos && fromRowPos === toRowPos && dist < 8) {
    return { kind: 'no-op', reason: 'Move stayed inside the initial grid cell' };
  }

  const targetColumn = isRtl ? cols.length - toColPos : toColPos + 1;
  const targetRow = toRowPos + 1;

  return {
    kind: 'grid-cell-move',
    targetColumn,
    targetRow,
    columnSpan: Math.max(1, child.gridColumnSpan ?? 1),
    rowSpan: Math.max(1, child.gridRowSpan ?? 1),
  };
}

interface FlowAxisConfig {
  readonly axis: 'horizontal' | 'vertical';
  readonly visualReverse: boolean;
  readonly isWrap: boolean;
}

function resolveFlowAxisConfig(
  parent: ParentLayoutDescriptor,
  child: ChildLayoutDescriptor,
  siblings: readonly FlowSiblingDescriptor[],
  isRtl: boolean
): FlowAxisConfig {
  const isFlex = parent.display === 'flex' || parent.display === 'inline-flex';
  const isWrap = isFlex && (parent.flexWrap === 'wrap' || parent.flexWrap === 'wrap-reverse');

  if (isFlex) {
    const dir = parent.flexDirection ?? 'row';
    if (dir === 'row' || dir === 'row-reverse') {
      return {
        axis: 'horizontal',
        visualReverse: (dir === 'row-reverse') !== isRtl,
        isWrap,
      };
    }
    return {
      axis: 'vertical',
      visualReverse: dir === 'column-reverse',
      isWrap,
    };
  }

  if (parent.writingMode === 'vertical-rl') {
    return { axis: 'horizontal', visualReverse: true, isWrap: false };
  }
  if (parent.writingMode === 'vertical-lr') {
    return { axis: 'horizontal', visualReverse: false, isWrap: false };
  }

  if (
    child.display === 'inline-block' ||
    child.display === 'inline' ||
    (siblings.length > 0 &&
      siblings.every((s) => s.display === 'inline-block' || s.display === 'inline'))
  ) {
    return { axis: 'horizontal', visualReverse: isRtl, isWrap: false };
  }

  return { axis: 'vertical', visualReverse: false, isWrap: false };
}

function groupSiblingsIntoLines(
  flowSiblings: readonly FlowSiblingDescriptor[],
  axis: 'horizontal' | 'vertical'
): FlowSiblingDescriptor[][] {
  if (flowSiblings.length === 0) return [];

  const getCrossStart = (s: FlowSiblingDescriptor) => (axis === 'horizontal' ? s.rect.top : s.rect.left);
  const getCrossEnd = (s: FlowSiblingDescriptor) =>
    axis === 'horizontal' ? s.rect.top + s.rect.height : s.rect.left + s.rect.width;

  const byCross = [...flowSiblings].sort((a, b) => {
    const d = getCrossStart(a) - getCrossStart(b);
    return d !== 0 ? d : a.index - b.index;
  });

  const lines: FlowSiblingDescriptor[][] = [];
  for (const sib of byCross) {
    const sMin = getCrossStart(sib);
    const sMax = getCrossEnd(sib);
    const lastLine = lines[lines.length - 1];
    if (!lastLine) {
      lines.push([sib]);
      continue;
    }
    let lMin = Infinity;
    let lMax = -Infinity;
    for (const member of lastLine) {
      const mStart = getCrossStart(member);
      const mEnd = getCrossEnd(member);
      if (mStart < lMin) lMin = mStart;
      if (mEnd > lMax) lMax = mEnd;
    }
    if (Math.min(lMax, sMax) > Math.max(lMin, sMin)) {
      lastLine.push(sib);
    } else {
      lines.push([sib]);
    }
  }

  return lines;
}

function classifyFlowMove(
  parent: ParentLayoutDescriptor,
  child: ChildLayoutDescriptor,
  siblings: readonly FlowSiblingDescriptor[],
  from: Point2D,
  to: Point2D,
  isRtl: boolean
): LayoutIntent {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const cfg = resolveFlowAxisConfig(parent, child, siblings, isRtl);

  if (
    isAutoMarginCenterConflict(child, 'x') ||
    isAutoMarginCenterConflict(child, 'y')
  ) {
    return {
      kind: 'ambiguous',
      reason: 'Dragging a flow child centered with opposing margin: auto values is ambiguous',
    };
  }

  const flowSiblings = siblings.filter(
    (s) =>
      s.position !== 'absolute' &&
      s.position !== 'fixed' &&
      s.display !== 'none' &&
      s.display !== 'contents'
  );

  if (!cfg.isWrap) {
    const mainDelta = cfg.axis === 'horizontal' ? dx : dy;
    const crossDelta = cfg.axis === 'horizontal' ? dy : dx;
    const parentCrossSize = cfg.axis === 'horizontal' ? parent.rect.height : parent.rect.width;
    const childCrossSize = cfg.axis === 'horizontal' ? child.rect.height : child.rect.width;
    const crossLimit = Math.max(parentCrossSize * 0.75, childCrossSize * 1.5, 40);
    if (Math.abs(crossDelta) > crossLimit && Math.abs(mainDelta) < 10) {
      return {
        kind: 'ambiguous',
        reason: 'Large perpendicular drag across a non-wrapping flow container is ambiguous',
      };
    }
  }

  if (flowSiblings.length === 0) {
    if (child.position === 'relative') {
      return { kind: 'relative-offset', deltaX: dx, deltaY: dy };
    }
    return { kind: 'no-op', reason: 'No flow siblings available for reorder' };
  }

  const lines = groupSiblingsIntoLines(flowSiblings, cfg.axis);
  if (parent.flexWrap === 'wrap-reverse') {
    lines.reverse();
  }

  const getCrossMid = (line: readonly FlowSiblingDescriptor[]) => {
    let sum = 0;
    for (const m of line) {
      sum +=
        cfg.axis === 'horizontal'
          ? m.rect.top + m.rect.height / 2
          : m.rect.left + m.rect.width / 2;
    }
    return sum / line.length;
  };
  const getCrossMin = (line: readonly FlowSiblingDescriptor[]) => {
    let minVal = Infinity;
    for (const m of line) {
      const v = cfg.axis === 'horizontal' ? m.rect.top : m.rect.left;
      if (v < minVal) minVal = v;
    }
    return minVal;
  };
  const getCrossMax = (line: readonly FlowSiblingDescriptor[]) => {
    let maxVal = -Infinity;
    for (const m of line) {
      const v =
        cfg.axis === 'horizontal' ? m.rect.top + m.rect.height : m.rect.left + m.rect.width;
      if (v > maxVal) maxVal = v;
    }
    return maxVal;
  };

  const crossCoord = cfg.axis === 'horizontal' ? to.y : to.x;
  let targetLineIdx = 0;
  let bestCrossDist = Infinity;
  let contained = false;
  for (let i = 0; i < lines.length; i++) {
    const cMin = getCrossMin(lines[i]);
    const cMax = getCrossMax(lines[i]);
    if (crossCoord >= cMin && crossCoord <= cMax) {
      targetLineIdx = i;
      contained = true;
      break;
    }
    const d = Math.abs(crossCoord - getCrossMid(lines[i]));
    if (!contained && d < bestCrossDist) {
      bestCrossDist = d;
      targetLineIdx = i;
    }
  }

  const targetLine = [...lines[targetLineIdx]];
  const getMainStart = (s: FlowSiblingDescriptor) =>
    cfg.axis === 'horizontal' ? s.rect.left : s.rect.top;
  const getMainEnd = (s: FlowSiblingDescriptor) =>
    cfg.axis === 'horizontal' ? s.rect.left + s.rect.width : s.rect.top + s.rect.height;

  // Sort items in visual progression order along the main axis
  targetLine.sort((a, b) => {
    if (!cfg.visualReverse) {
      const d = getMainStart(a) - getMainStart(b);
      return d !== 0 ? d : a.index - b.index;
    }
    const d = getMainEnd(b) - getMainEnd(a);
    return d !== 0 ? d : a.index - b.index;
  });

  const mainCoord = cfg.axis === 'horizontal' ? to.x : to.y;
  let slotPos = 0;
  for (let k = 0; k < targetLine.length - 1; k++) {
    const curr = targetLine[k];
    const next = targetLine[k + 1];
    if (!cfg.visualReverse) {
      const mid = (getMainEnd(curr) + getMainStart(next)) / 2;
      if (mainCoord >= mid) {
        slotPos = k + 1;
      } else {
        break;
      }
    } else {
      const mid = (getMainStart(curr) + getMainEnd(next)) / 2;
      if (mainCoord <= mid) {
        slotPos = k + 1;
      } else {
        break;
      }
    }
  }

  const targetIndex = targetLine[slotPos].index;
  if (targetIndex === child.index) {
    if (child.position === 'relative') {
      return { kind: 'relative-offset', deltaX: dx, deltaY: dy };
    }
    return { kind: 'no-op', reason: 'Move did not cross into an adjacent sibling slot' };
  }

  return {
    kind: 'reorder-in-flow',
    fromIndex: child.index,
    targetIndex,
    axis: cfg.axis,
    visualDirection: cfg.visualReverse ? 'reverse' : 'forward',
    lineIndex: targetLineIdx,
  };
}

/**
 * Pure data-in, data-out layout intent classifier.
 * Produces zero side effects and zero code edits.
 */
export function classifyLayoutIntent(input: LayoutIntentInput): LayoutIntent {
  const { parent, child, siblings, gesture } = input;

  if (child.display === 'none' || parent.display === 'none') {
    return { kind: 'no-op', reason: 'Target node or parent has display: none' };
  }
  if (child.display === 'contents') {
    return {
      kind: 'ambiguous',
      reason: 'Child uses display: contents and generates no principal layout box',
    };
  }
  if (parent.display === 'contents') {
    return {
      kind: 'ambiguous',
      reason: 'Parent uses display: contents and generates no formatting box',
    };
  }

  const isRtl = parent.direction === 'rtl';

  if (gesture.kind === 'resize') {
    return classifyResizeIntent(parent, child, gesture.fromRect, gesture.toRect);
  }

  const dx = gesture.to.x - gesture.from.x;
  const dy = gesture.to.y - gesture.from.y;
  if (Math.hypot(dx, dy) <= SUBPIXEL_NOOP_PX) {
    return { kind: 'no-op', reason: 'Pointer moved zero distance' };
  }

  if (child.position === 'sticky') {
    return {
      kind: 'ambiguous',
      reason: 'Node uses position: sticky; scroll-pinned inset conflicts with static flow reorder',
    };
  }

  if (child.position === 'absolute' || child.position === 'fixed') {
    return classifyOutOfFlowMove(child, dx, dy, isRtl);
  }

  if (parent.display === 'grid' || parent.display === 'inline-grid') {
    return classifyGridMove(parent, child, gesture.from, gesture.to, isRtl);
  }

  return classifyFlowMove(parent, child, siblings, gesture.from, gesture.to, isRtl);
}
