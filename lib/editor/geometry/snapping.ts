import type {
  Bounds,
  GuideDescriptor,
  Rect,
  SnapCandidateRect,
  SnapOptions,
  SnapOutput,
} from './types';

export interface SnapAxisView {
  readonly axis: 'x' | 'y';
  readonly sibStart: Float64Array;
  readonly sibEnd: Float64Array;
  readonly sibCrossStart: Float64Array;
  readonly sibCrossEnd: Float64Array;
  readonly sibOrder: Int32Array;
  maxPrimarySize: number;
  maxCrossSize: number;
  cStart: number;
  cEnd: number;
  cCrossStart: number;
  cCrossEnd: number;
}

export interface SnapIndex {
  readonly capacity: number;
  count: number;
  readonly xPositions: Float64Array;
  readonly xLineIds: Int32Array;
  readonly xKinds: Uint8Array;
  readonly xSpanMin: Float64Array;
  readonly xSpanMax: Float64Array;
  readonly xOrder: Int32Array;
  xCount: number;
  readonly yPositions: Float64Array;
  readonly yLineIds: Int32Array;
  readonly yKinds: Uint8Array;
  readonly ySpanMin: Float64Array;
  readonly ySpanMax: Float64Array;
  readonly yOrder: Int32Array;
  yCount: number;
  readonly siblingLeft: Float64Array;
  readonly siblingTop: Float64Array;
  readonly siblingRight: Float64Array;
  readonly siblingBottom: Float64Array;
  readonly siblingOrderX: Int32Array;
  readonly siblingOrderY: Int32Array;
  readonly xView: SnapAxisView;
  readonly yView: SnapAxisView;
  readonly candidateIds: string[];
  hasContainer: boolean;
  containerLeft: number;
  containerTop: number;
  containerRight: number;
  containerBottom: number;
  containerId: string;
}

export interface MutableGuideDescriptor {
  axis: 'x' | 'y';
  kind: 'edge' | 'center' | 'spacing';
  position: number;
  spanStart: number;
  spanEnd: number;
  gap: number;
  sourceId: string;
  gapSegCount: number;
  readonly gapSegments: Array<{ start: number; end: number; cross: number }>;
}

export interface MutableSnapOutput {
  rect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
  dx: number;
  dy: number;
  snappedX: boolean;
  snappedY: boolean;
  guideCount: number;
  readonly guides: MutableGuideDescriptor[];
}

export interface SnapScratchBuffer {
  readonly bandIndicesX: Int32Array;
  readonly bandIndicesY: Int32Array;
  bandCountX: number;
  bandCountY: number;
}

const KIND_EDGE = 0;
const KIND_CENTER = 1;
const TIE_EPSILON = 1e-9;

function upperBoundByOrder(
  values: Float64Array,
  order: Int32Array,
  count: number,
  limit: number
): number {
  let lo = 0;
  let hi = count;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (values[order[mid]] <= limit) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

function lowerBoundByOrder(
  values: Float64Array,
  order: Int32Array,
  count: number,
  target: number
): number {
  let lo = 0;
  let hi = count;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (values[order[mid]] < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

function siftDownOrder(
  order: Int32Array,
  values: Float64Array,
  root: number,
  heapSize: number
): void {
  let parent = root;
  while (true) {
    let largest = parent;
    const left = parent * 2 + 1;
    const right = left + 1;
    if (left < heapSize && values[order[left]] > values[order[largest]]) {
      largest = left;
    }
    if (right < heapSize && values[order[right]] > values[order[largest]]) {
      largest = right;
    }
    if (largest === parent) break;
    const tmp = order[parent];
    order[parent] = order[largest];
    order[largest] = tmp;
    parent = largest;
  }
}

function sortOrderByValues(order: Int32Array, values: Float64Array, length: number): void {
  if (length <= 32) {
    for (let i = 1; i < length; i++) {
      const key = order[i];
      const keyVal = values[key];
      let j = i - 1;
      while (j >= 0 && values[order[j]] > keyVal) {
        order[j + 1] = order[j];
        j--;
      }
      order[j + 1] = key;
    }
    return;
  }

  for (let i = (length >> 1) - 1; i >= 0; i--) {
    siftDownOrder(order, values, i, length);
  }
  for (let end = length - 1; end > 0; end--) {
    const tmp = order[0];
    order[0] = order[end];
    order[end] = tmp;
    siftDownOrder(order, values, 0, end);
  }
}

function recordAxisLines(
  positions: Float64Array,
  lineIds: Int32Array,
  kinds: Uint8Array,
  spanMin: Float64Array,
  spanMax: Float64Array,
  order: Int32Array,
  offset: number,
  candIdx: number,
  minVal: number,
  midVal: number,
  maxVal: number,
  crossMin: number,
  crossMax: number
): number {
  let k = offset;
  positions[k] = minVal;
  lineIds[k] = candIdx;
  kinds[k] = KIND_EDGE;
  spanMin[k] = crossMin;
  spanMax[k] = crossMax;
  order[k] = k;
  k++;

  positions[k] = midVal;
  lineIds[k] = candIdx;
  kinds[k] = KIND_CENTER;
  spanMin[k] = crossMin;
  spanMax[k] = crossMax;
  order[k] = k;
  k++;

  positions[k] = maxVal;
  lineIds[k] = candIdx;
  kinds[k] = KIND_EDGE;
  spanMin[k] = crossMin;
  spanMax[k] = crossMax;
  order[k] = k;
  return k + 1;
}

export function createSnapIndex(maxCandidates = 1024): SnapIndex {
  const cap = Math.max(1, Math.floor(maxCandidates));
  const lineCap = (cap + 2) * 3;
  const siblingLeft = new Float64Array(cap);
  const siblingTop = new Float64Array(cap);
  const siblingRight = new Float64Array(cap);
  const siblingBottom = new Float64Array(cap);
  const siblingOrderX = new Int32Array(cap);
  const siblingOrderY = new Int32Array(cap);

  const xView: SnapAxisView = {
    axis: 'x',
    sibStart: siblingLeft,
    sibEnd: siblingRight,
    sibCrossStart: siblingTop,
    sibCrossEnd: siblingBottom,
    sibOrder: siblingOrderX,
    maxPrimarySize: 0.5,
    maxCrossSize: 0.5,
    cStart: 0.5,
    cEnd: 0.5,
    cCrossStart: 0.5,
    cCrossEnd: 0.5,
  };
  xView.maxPrimarySize = 0;
  xView.maxCrossSize = 0;
  xView.cStart = 0;
  xView.cEnd = 0;
  xView.cCrossStart = 0;
  xView.cCrossEnd = 0;

  const yView: SnapAxisView = {
    axis: 'y',
    sibStart: siblingTop,
    sibEnd: siblingBottom,
    sibCrossStart: siblingLeft,
    sibCrossEnd: siblingRight,
    sibOrder: siblingOrderY,
    maxPrimarySize: 0.5,
    maxCrossSize: 0.5,
    cStart: 0.5,
    cEnd: 0.5,
    cCrossStart: 0.5,
    cCrossEnd: 0.5,
  };
  yView.maxPrimarySize = 0;
  yView.maxCrossSize = 0;
  yView.cStart = 0;
  yView.cEnd = 0;
  yView.cCrossStart = 0;
  yView.cCrossEnd = 0;

  const index: SnapIndex = {
    capacity: cap,
    count: 0,
    xPositions: new Float64Array(lineCap),
    xLineIds: new Int32Array(lineCap),
    xKinds: new Uint8Array(lineCap),
    xSpanMin: new Float64Array(lineCap),
    xSpanMax: new Float64Array(lineCap),
    xOrder: new Int32Array(lineCap),
    xCount: 0,
    yPositions: new Float64Array(lineCap),
    yLineIds: new Int32Array(lineCap),
    yKinds: new Uint8Array(lineCap),
    ySpanMin: new Float64Array(lineCap),
    ySpanMax: new Float64Array(lineCap),
    yOrder: new Int32Array(lineCap),
    yCount: 0,
    siblingLeft,
    siblingTop,
    siblingRight,
    siblingBottom,
    siblingOrderX,
    siblingOrderY,
    xView,
    yView,
    candidateIds: new Array<string>(cap).fill(''),
    hasContainer: false,
    containerLeft: 0.5,
    containerTop: 0.5,
    containerRight: 0.5,
    containerBottom: 0.5,
    containerId: '',
  };
  index.containerLeft = 0;
  index.containerTop = 0;
  index.containerRight = 0;
  index.containerBottom = 0;
  return index;
}

export function rebuildSnapIndex(
  index: SnapIndex,
  siblings: readonly SnapCandidateRect[],
  container?: SnapCandidateRect
): SnapIndex {
  const n = Math.min(index.capacity, siblings.length);
  index.count = n;
  let maxW = 0;
  let maxH = 0;

  let xLen = 0;
  let yLen = 0;

  for (let i = 0; i < n; i++) {
    const s = siblings[i];
    const left = Number.isFinite(s.left) ? s.left : 0;
    const top = Number.isFinite(s.top) ? s.top : 0;
    const w = Number.isFinite(s.width) && s.width > 0 ? s.width : 0;
    const h = Number.isFinite(s.height) && s.height > 0 ? s.height : 0;
    const right = left + w;
    const bottom = top + h;
    const cx = left + w / 2;
    const cy = top + h / 2;

    if (w > maxW) maxW = w;
    if (h > maxH) maxH = h;

    index.siblingLeft[i] = left;
    index.siblingTop[i] = top;
    index.siblingRight[i] = right;
    index.siblingBottom[i] = bottom;
    index.siblingOrderX[i] = i;
    index.siblingOrderY[i] = i;
    index.candidateIds[i] = s.id;

    xLen = recordAxisLines(
      index.xPositions,
      index.xLineIds,
      index.xKinds,
      index.xSpanMin,
      index.xSpanMax,
      index.xOrder,
      xLen,
      i,
      left,
      cx,
      right,
      top,
      bottom
    );
    yLen = recordAxisLines(
      index.yPositions,
      index.yLineIds,
      index.yKinds,
      index.ySpanMin,
      index.ySpanMax,
      index.yOrder,
      yLen,
      i,
      top,
      cy,
      bottom,
      left,
      right
    );
  }

  index.xView.maxPrimarySize = maxW;
  index.xView.maxCrossSize = maxH;
  index.yView.maxPrimarySize = maxH;
  index.yView.maxCrossSize = maxW;

  if (container) {
    const cleft = Number.isFinite(container.left) ? container.left : 0;
    const ctop = Number.isFinite(container.top) ? container.top : 0;
    const cw = Number.isFinite(container.width) && container.width > 0 ? container.width : 0;
    const ch = Number.isFinite(container.height) && container.height > 0 ? container.height : 0;
    const cright = cleft + cw;
    const cbottom = ctop + ch;
    index.hasContainer = true;
    index.containerLeft = cleft;
    index.containerTop = ctop;
    index.containerRight = cright;
    index.containerBottom = cbottom;
    index.containerId = container.id;

    index.xView.cStart = cleft;
    index.xView.cEnd = cright;
    index.xView.cCrossStart = ctop;
    index.xView.cCrossEnd = cbottom;

    index.yView.cStart = ctop;
    index.yView.cEnd = cbottom;
    index.yView.cCrossStart = cleft;
    index.yView.cCrossEnd = cright;
  } else {
    index.hasContainer = false;
    index.containerId = '';
  }

  index.xCount = xLen;
  index.yCount = yLen;

  sortOrderByValues(index.siblingOrderX, index.siblingLeft, n);
  sortOrderByValues(index.siblingOrderY, index.siblingTop, n);
  sortOrderByValues(index.xOrder, index.xPositions, xLen);
  sortOrderByValues(index.yOrder, index.yPositions, yLen);

  return index;
}

export function createSnapScratchBuffer(maxCandidates = 1024): SnapScratchBuffer {
  const cap = Math.max(1, Math.floor(maxCandidates));
  return {
    bandIndicesX: new Int32Array(cap),
    bandIndicesY: new Int32Array(cap),
    bandCountX: 0,
    bandCountY: 0,
  };
}

export function createMutableSnapOutput(maxGuides = 4): MutableSnapOutput {
  const cap = Math.max(1, Math.floor(maxGuides));
  const guides: MutableGuideDescriptor[] = new Array<MutableGuideDescriptor>(cap);
  for (let i = 0; i < cap; i++) {
    const seg0 = { start: 0.5, end: 0.5, cross: 0.5 };
    seg0.start = 0;
    seg0.end = 0;
    seg0.cross = 0;
    const seg1 = { start: 0.5, end: 0.5, cross: 0.5 };
    seg1.start = 0;
    seg1.end = 0;
    seg1.cross = 0;
    const g: MutableGuideDescriptor = {
      axis: 'x',
      kind: 'edge',
      position: 0.5,
      spanStart: 0.5,
      spanEnd: 0.5,
      gap: 0.5,
      sourceId: '',
      gapSegCount: 0,
      gapSegments: [seg0, seg1],
    };
    g.position = 0;
    g.spanStart = 0;
    g.spanEnd = 0;
    g.gap = 0;
    guides[i] = g;
  }
  const rect = { left: 0.5, top: 0.5, right: 0.5, bottom: 0.5, width: 0.5, height: 0.5 };
  rect.left = 0;
  rect.top = 0;
  rect.right = 0;
  rect.bottom = 0;
  rect.width = 0;
  rect.height = 0;
  const out: MutableSnapOutput = {
    rect,
    dx: 0.5,
    dy: 0.5,
    snappedX: false,
    snappedY: false,
    guideCount: 0,
    guides,
  };
  out.dx = 0;
  out.dy = 0;
  return out;
}

/** Allocation-free hot-path snap solver mutating `out` in place using `scratch`. */
export function snapRectInto(
  box: Rect,
  index: SnapIndex,
  options: SnapOptions,
  scratch: SnapScratchBuffer,
  out: MutableSnapOutput
): MutableSnapOutput {
  const bLeft = Number.isFinite(box.left) ? box.left : 0;
  const bTop = Number.isFinite(box.top) ? box.top : 0;
  const bWidth = Number.isFinite(box.width) && box.width > 0 ? box.width : 0;
  const bHeight = Number.isFinite(box.height) && box.height > 0 ? box.height : 0;

  out.dx = 0;
  out.dy = 0;
  out.snappedX = false;
  out.snappedY = false;
  out.guideCount = 0;

  const safeThresholdScreenPx =
    Number.isFinite(options.thresholdScreenPx) && options.thresholdScreenPx >= 0
      ? options.thresholdScreenPx
      : 0;
  const safeZoom = Number.isFinite(options.zoom) && options.zoom > 0 ? options.zoom : 1;
  const threshold = safeThresholdScreenPx / safeZoom;

  if (options.disabled || threshold <= 0) {
    out.rect.left = bLeft;
    out.rect.top = bTop;
    out.rect.right = bLeft + bWidth;
    out.rect.bottom = bTop + bHeight;
    out.rect.width = bWidth;
    out.rect.height = bHeight;
    return out;
  }

  const includeContainer = options.includeContainer !== false;
  const includeEdges = options.includeEdges !== false;
  const includeCenters = options.includeCenters !== false;
  const includeSpacing = options.includeEqualSpacing !== false;
  const sibCount = index.count;

  for (let axisIdx = 0; axisIdx < 2; axisIdx++) {
    const isX = axisIdx === 0;
    const view = isX ? index.xView : index.yView;
    const bStart = isX ? bLeft : bTop;
    const bSize = isX ? bWidth : bHeight;
    const bEnd = bStart + bSize;
    const bCenter = bStart + bSize / 2;
    const bCrossStart = isX ? bTop : bLeft;
    const bCrossSize = isX ? bHeight : bWidth;
    const bCrossEnd = bCrossStart + bCrossSize;

    const sibStart = view.sibStart;
    const sibEnd = view.sibEnd;
    const sibCrossStart = view.sibCrossStart;
    const sibCrossEnd = view.sibCrossEnd;
    const sibOrder = view.sibOrder;
    const bandIndices = isX ? scratch.bandIndicesX : scratch.bandIndicesY;

    let bestDelta = 0;
    let bestAbs = threshold + 1;
    let found = false;
    let bestKind: 'edge' | 'center' | 'spacing' = 'edge';
    let bestPos = 0;
    let bestSpanStart = bCrossStart;
    let bestSpanEnd = bCrossEnd;
    let bestSourceId = '';
    let bestGap = 0;
    let bestSeg0Start = 0;
    let bestSeg0End = 0;
    let bestSeg0Cross = 0;
    let bestSeg1Start = 0;
    let bestSeg1End = 0;
    let bestSeg1Cross = 0;

    const endIdx = upperBoundByOrder(sibStart, sibOrder, sibCount, bEnd + threshold);
    const startIdx = lowerBoundByOrder(
      sibStart,
      sibOrder,
      endIdx,
      bStart - threshold - view.maxPrimarySize
    );

    for (let k = startIdx; k < endIdx; k++) {
      const idx = sibOrder[k];
      const sStart = sibStart[idx];
      const sEnd = sibEnd[idx];
      if (sEnd < bStart - threshold) continue;
      const sCrossStart = sibCrossStart[idx];
      const sCrossEnd = sibCrossEnd[idx];
      const spanMin = sCrossStart < bCrossStart ? sCrossStart : bCrossStart;
      const spanMax = sCrossEnd > bCrossEnd ? sCrossEnd : bCrossEnd;
      const srcId = index.candidateIds[idx];

      if (includeEdges) {
        const d0 = sStart - bStart;
        const a0 = d0 < 0 ? -d0 : d0;
        const d1 = sEnd - bStart;
        const a1 = d1 < 0 ? -d1 : d1;
        const dL = a1 < a0 - TIE_EPSILON ? d1 : d0;
        const pL = a1 < a0 - TIE_EPSILON ? sEnd : sStart;
        const aL = a1 < a0 - TIE_EPSILON ? a1 : a0;

        const d2 = sStart - bEnd;
        const a2 = d2 < 0 ? -d2 : d2;
        const d3 = sEnd - bEnd;
        const a3 = d3 < 0 ? -d3 : d3;
        const dR = a3 < a2 - TIE_EPSILON ? d3 : d2;
        const pR = a3 < a2 - TIE_EPSILON ? sEnd : sStart;
        const aR = a3 < a2 - TIE_EPSILON ? a3 : a2;

        const useR = aR < aL - TIE_EPSILON;
        const absD = useR ? aR : aL;
        if (absD < threshold && absD < bestAbs - TIE_EPSILON) {
          bestAbs = absD;
          bestDelta = useR ? dR : dL;
          found = true;
          bestKind = 'edge';
          bestPos = useR ? pR : pL;
          bestSpanStart = spanMin;
          bestSpanEnd = spanMax;
          bestSourceId = srcId;
        }
      }

      if (includeCenters) {
        const sCenter = (sStart + sEnd) / 2;
        const diff = sCenter - bCenter;
        const absD = diff < 0 ? -diff : diff;
        if (absD < threshold && absD < bestAbs - TIE_EPSILON) {
          bestAbs = absD;
          bestDelta = diff;
          found = true;
          bestKind = 'center';
          bestPos = sCenter;
          bestSpanStart = spanMin;
          bestSpanEnd = spanMax;
          bestSourceId = srcId;
        }
      }
    }

    if (includeContainer && index.hasContainer) {
      const spanMin = view.cCrossStart < bCrossStart ? view.cCrossStart : bCrossStart;
      const spanMax = view.cCrossEnd > bCrossEnd ? view.cCrossEnd : bCrossEnd;
      const cId = index.containerId;

      if (includeEdges) {
        const d0 = view.cStart - bStart;
        const a0 = d0 < 0 ? -d0 : d0;
        const d1 = view.cEnd - bEnd;
        const a1 = d1 < 0 ? -d1 : d1;
        const useEnd = a1 < a0 - TIE_EPSILON;
        const absD = useEnd ? a1 : a0;
        if (absD < threshold && absD < bestAbs - TIE_EPSILON) {
          bestAbs = absD;
          bestDelta = useEnd ? d1 : d0;
          found = true;
          bestKind = 'edge';
          bestPos = useEnd ? view.cEnd : view.cStart;
          bestSpanStart = spanMin;
          bestSpanEnd = spanMax;
          bestSourceId = cId;
        }
      }

      if (includeCenters) {
        const cCenter = (view.cStart + view.cEnd) / 2;
        const diff = cCenter - bCenter;
        const absD = diff < 0 ? -diff : diff;
        if (absD < threshold && absD < bestAbs - TIE_EPSILON) {
          bestAbs = absD;
          bestDelta = diff;
          found = true;
          bestKind = 'center';
          bestPos = cCenter;
          bestSpanStart = spanMin;
          bestSpanEnd = spanMax;
          bestSourceId = cId;
        }
      }
    }

    if (includeSpacing && sibCount >= 2 && bestAbs > TIE_EPSILON) {
      let bandCount = 0;
      const maxBandCap = bandIndices.length;
      const crossSlack = (bCrossSize > view.maxCrossSize ? bCrossSize : view.maxCrossSize) * 2 + 120;
      const crossMin = bCrossStart - crossSlack;
      const crossMax = bCrossEnd + crossSlack;
      for (let k = 0; k < sibCount; k++) {
        const idx = sibOrder[k];
        if (sibCrossEnd[idx] < crossMin || sibCrossStart[idx] > crossMax) continue;
        if (bandCount < maxBandCap) {
          bandIndices[bandCount++] = idx;
        }
      }

      for (let j = 1; j < bandCount; j++) {
        const bIdx = bandIndices[j];
        const bL = sibStart[bIdx];
        const bR = sibEnd[bIdx];
        const bT = sibCrossStart[bIdx];
        const bB = sibCrossEnd[bIdx];

        const lookStart = j > 8 ? j - 8 : 0;
        for (let i = j - 1; i >= lookStart; i--) {
          const aIdx = bandIndices[i];
          const aR = sibEnd[aIdx];
          const gap = bL - aR;
          if (gap <= 1) continue;
          const aT = sibCrossStart[aIdx];
          const aB = sibCrossEnd[aIdx];
          const ovStart = aT > bT ? aT : bT;
          const ovEnd = aB < bB ? aB : bB;
          if (ovEnd <= ovStart) continue;

          const aL = sibStart[aIdx];

          const afterTarget = bR + gap;
          const afterDiff = afterTarget - bStart;
          const afterAbs = afterDiff < 0 ? -afterDiff : afterDiff;
          if (afterAbs < threshold && afterAbs < bestAbs - TIE_EPSILON) {
            const crossMid = (ovStart + ovEnd) / 2;
            bestAbs = afterAbs;
            bestDelta = afterDiff;
            found = true;
            bestKind = 'spacing';
            bestPos = afterTarget;
            bestSpanStart = bT;
            bestSpanEnd = bB;
            bestSourceId = index.candidateIds[bIdx];
            bestGap = gap;
            bestSeg0Start = aR;
            bestSeg0End = bL;
            bestSeg0Cross = crossMid;
            bestSeg1Start = bR;
            bestSeg1End = afterTarget;
            bestSeg1Cross = crossMid;
          }

          const beforeTarget = aL - gap - bSize;
          const beforeDiff = beforeTarget - bStart;
          const beforeAbs = beforeDiff < 0 ? -beforeDiff : beforeDiff;
          if (beforeAbs < threshold && beforeAbs < bestAbs - TIE_EPSILON) {
            const crossMid = (ovStart + ovEnd) / 2;
            bestAbs = beforeAbs;
            bestDelta = beforeDiff;
            found = true;
            bestKind = 'spacing';
            bestPos = beforeTarget;
            bestSpanStart = aT;
            bestSpanEnd = aB;
            bestSourceId = index.candidateIds[aIdx];
            bestGap = gap;
            bestSeg0Start = beforeTarget + bSize;
            bestSeg0End = aL;
            bestSeg0Cross = crossMid;
            bestSeg1Start = aR;
            bestSeg1End = bL;
            bestSeg1Cross = crossMid;
          }

          const freeBetween = gap - bSize;
          if (freeBetween > 2) {
            const halfGap = freeBetween / 2;
            const midTarget = aR + halfGap;
            const midDiff = midTarget - bStart;
            const midAbs = midDiff < 0 ? -midDiff : midDiff;
            if (midAbs < threshold && midAbs < bestAbs - TIE_EPSILON) {
              const crossMid = (ovStart + ovEnd) / 2;
              bestAbs = midAbs;
              bestDelta = midDiff;
              found = true;
              bestKind = 'spacing';
              bestPos = midTarget;
              bestSpanStart = aT < bT ? aT : bT;
              bestSpanEnd = aB > bB ? aB : bB;
              bestSourceId = index.candidateIds[aIdx];
              bestGap = halfGap;
              bestSeg0Start = aR;
              bestSeg0End = midTarget;
              bestSeg0Cross = crossMid;
              bestSeg1Start = midTarget + bSize;
              bestSeg1End = bL;
              bestSeg1Cross = crossMid;
            }
          }
        }
      }
    }

    if (found) {
      if (out.guideCount < out.guides.length) {
        const guide = out.guides[out.guideCount];
        guide.axis = view.axis;
        guide.kind = bestKind;
        guide.position = bestPos;
        guide.spanStart = bestSpanStart;
        guide.spanEnd = bestSpanEnd;
        guide.sourceId = bestSourceId;
        guide.gap = bestGap;
        if (bestKind === 'spacing') {
          guide.gapSegCount = 2;
          guide.gapSegments[0].start = bestSeg0Start;
          guide.gapSegments[0].end = bestSeg0End;
          guide.gapSegments[0].cross = bestSeg0Cross;
          guide.gapSegments[1].start = bestSeg1Start;
          guide.gapSegments[1].end = bestSeg1End;
          guide.gapSegments[1].cross = bestSeg1Cross;
        } else {
          guide.gapSegCount = 0;
        }
        out.guideCount++;
      }
      if (isX) {
        out.dx = bestDelta;
        out.snappedX = true;
      } else {
        out.dy = bestDelta;
        out.snappedY = true;
      }
    }
  }

  const finalLeft = bLeft + out.dx;
  const finalTop = bTop + out.dy;

  out.rect.left = finalLeft;
  out.rect.top = finalTop;
  out.rect.right = finalLeft + bWidth;
  out.rect.bottom = finalTop + bHeight;
  out.rect.width = bWidth;
  out.rect.height = bHeight;

  return out;
}

export function extractGuideDescriptors(out: MutableSnapOutput): GuideDescriptor[] {
  const result: GuideDescriptor[] = [];
  for (let i = 0; i < out.guideCount; i++) {
    const g = out.guides[i];
    if (g.kind === 'spacing') {
      const segs: Array<{ start: number; end: number; cross: number }> = [];
      for (let s = 0; s < g.gapSegCount; s++) {
        const seg = g.gapSegments[s];
        segs.push({ start: seg.start, end: seg.end, cross: seg.cross });
      }
      result.push({
        axis: g.axis,
        kind: g.kind,
        position: g.position,
        spanStart: g.spanStart,
        spanEnd: g.spanEnd,
        gap: g.gap,
        gapSegments: segs,
        sourceId: g.sourceId,
      });
    } else {
      result.push({
        axis: g.axis,
        kind: g.kind,
        position: g.position,
        spanStart: g.spanStart,
        spanEnd: g.spanEnd,
        sourceId: g.sourceId,
      });
    }
  }
  return result;
}

/** Pure functional wrapper around `snapRectInto` for convenience / one-off callers. */
export function snapRect(
  box: Rect,
  siblings: readonly SnapCandidateRect[],
  options: SnapOptions,
  container?: SnapCandidateRect
): SnapOutput {
  const cap = Math.max(8, siblings.length + 2);
  const index = createSnapIndex(cap);
  rebuildSnapIndex(index, siblings, container);
  const scratch = createSnapScratchBuffer(cap);
  const out = createMutableSnapOutput(4);
  snapRectInto(box, index, options, scratch, out);
  return {
    rect: {
      left: out.rect.left,
      top: out.rect.top,
      right: out.rect.right,
      bottom: out.rect.bottom,
      width: out.rect.width,
      height: out.rect.height,
    },
    dx: out.dx,
    dy: out.dy,
    snappedX: out.snappedX,
    snappedY: out.snappedY,
    guides: extractGuideDescriptors(out),
  };
}

export function rectToBounds(rect: Rect): Bounds {
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
