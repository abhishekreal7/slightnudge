/**
 * Core geometric primitives and types for the SlightNudge visual editor geometry library.
 * Pure TypeScript data definitions; zero DOM, React, or engine dependencies.
 */

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface Size2D {
  readonly width: number;
  readonly height: number;
}

export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

export interface Quad {
  readonly nw: Point2D;
  readonly ne: Point2D;
  readonly se: Point2D;
  readonly sw: Point2D;
}

/**
 * 2D affine transformation matrix `[a, b, c, d, e, f]` matching CSS/DOMMatrix column-vector order:
 *
 * ```
 * | a  c  e |   | x |   | a*x + c*y + e |
 * | b  d  f | * | y | = | b*x + d*y + f |
 * | 0  0  1 |   | 1 |   |       1       |
 * ```
 */
export type Matrix2D = readonly [number, number, number, number, number, number];

export interface DecomposedMatrix {
  readonly translateX: number;
  readonly translateY: number;
  readonly rotateRad: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly skewXRad: number;
}

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export type RoundingMode = 'none' | 'nearest' | 'floor' | 'ceil' | 'half-away-from-zero';

export interface CanvasSpace {
  /** Screen X of the canvas origin (excluding pan). */
  readonly originX: number;
  /** Screen Y of the canvas origin (excluding pan). */
  readonly originY: number;
  /** Pan offset in screen CSS pixels. */
  readonly panX: number;
  /** Pan offset in screen CSS pixels. */
  readonly panY: number;
  /** Zoom scale factor (> 0). */
  readonly zoom: number;
  /** Display devicePixelRatio (> 0, defaults to 1). */
  readonly devicePixelRatio?: number;
}

export interface ElementTransformFrame {
  /** Untransformed border-box top-left relative to its direct parent's border-box (before parent scroll). */
  readonly offsetX: number;
  readonly offsetY: number;
  /** Target box dimensions in local CSS px. */
  readonly width: number;
  readonly height: number;
  /** Scroll offset of this element's own scrollport (scrollLeft, scrollTop), subtracted for its children. */
  readonly scrollLeft?: number;
  readonly scrollTop?: number;
  /** CSS transform matrix of this element (applied relative to transformOrigin). Defaults to identity. */
  readonly transform?: Matrix2D;
  /** Transform origin in local border-box px. Defaults to `{ x: width / 2, y: height / 2 }` per CSS `50% 50%`. */
  readonly transformOrigin?: Point2D;
}

export interface ScreenPrediction {
  readonly matrix: Matrix2D;
  readonly quad: Quad;
  readonly bounds: Bounds;
}

export interface ResizeConstraints {
  readonly minWidth?: number;
  readonly minHeight?: number;
  readonly maxWidth?: number;
  readonly maxHeight?: number;
  /** `true` preserves `startRect.width / startRect.height`; a positive number enforces an explicit aspect ratio. */
  readonly aspectRatio?: boolean | number;
  /** When `true` (e.g. Alt/Option held), resizes symmetrically around the rect's center. */
  readonly fromCenter?: boolean;
  /** Optional local-space snap overrides along X and/or Y for the active resized edge(s). */
  readonly snapLocalX?: number | null;
  readonly snapLocalY?: number | null;
}

export interface ResizeInput {
  readonly startRect: Rect;
  readonly handle: HandleId;
  readonly pointerDeltaScreen: Point2D;
  /** Transform mapping element-local coordinates to screen coordinates (defaults to identity). */
  readonly elementToScreen?: Matrix2D;
  readonly constraints?: ResizeConstraints;
}

export interface ResizeOutput {
  readonly rect: Bounds;
  readonly screenQuad: Quad;
  readonly screenBounds: Bounds;
  readonly handlePointLocal: Point2D;
  readonly handlePointScreen: Point2D;
  readonly clamped: {
    readonly minWidth: boolean;
    readonly maxWidth: boolean;
    readonly minHeight: boolean;
    readonly maxHeight: boolean;
  };
  readonly degenerate: boolean;
}

export interface SnapCandidateRect {
  readonly id: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export type GuideKind = 'edge' | 'center' | 'spacing';
export type GuideAxis = 'x' | 'y';

export interface GuideDescriptor {
  readonly axis: GuideAxis;
  readonly kind: GuideKind;
  /** Coordinate on the primary axis (`left`/`center`/`right` for `'x'`, `top`/`center`/`bottom` for `'y'`). */
  readonly position: number;
  /** Render span start on the perpendicular axis (`y` for vertical `'x'` guide, `x` for horizontal `'y'` guide). */
  readonly spanStart: number;
  /** Render span end on the perpendicular axis. */
  readonly spanEnd: number;
  /** For spacing guides, gap length in canvas units and segment intervals along the gap axis. */
  readonly gap?: number;
  readonly gapSegments?: readonly { readonly start: number; readonly end: number; readonly cross: number }[];
  readonly sourceId: string;
}

export interface SnapOptions {
  readonly thresholdScreenPx: number;
  readonly zoom: number;
  readonly disabled?: boolean;
  readonly includeContainer?: boolean;
  readonly includeEdges?: boolean;
  readonly includeCenters?: boolean;
  readonly includeEqualSpacing?: boolean;
}

export interface SnapOutput {
  readonly rect: Bounds;
  readonly dx: number;
  readonly dy: number;
  readonly snappedX: boolean;
  readonly snappedY: boolean;
  readonly guides: readonly GuideDescriptor[];
}

export type AlignmentKind = 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom';
export type AlignReference = 'selection' | 'first' | Rect;
export type DistributeMode = 'spacing' | 'centers' | 'edges';

export interface AlignedRectItem {
  readonly id: string;
  readonly rect: Bounds;
}

export type CssDisplay =
  | 'block'
  | 'inline'
  | 'inline-block'
  | 'flex'
  | 'inline-flex'
  | 'grid'
  | 'inline-grid'
  | 'contents'
  | 'none';

export type CssPosition = 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
export type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
export type WritingDirection = 'ltr' | 'rtl';
export type WritingMode = 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';
export type OverflowMode = 'visible' | 'hidden' | 'clip' | 'scroll' | 'auto';
export type MarginValue = number | 'auto';
export type SizeMode = 'fixed' | 'fill' | 'fit' | 'auto';

export interface BoxEdges {
  readonly top: MarginValue;
  readonly right: MarginValue;
  readonly bottom: MarginValue;
  readonly left: MarginValue;
}

export interface GridTrackLine {
  readonly index: number;
  readonly start: number;
  readonly end: number;
}

export interface ParentLayoutDescriptor {
  readonly display: CssDisplay;
  readonly position: CssPosition;
  readonly rect: Rect;
  readonly flexDirection?: FlexDirection;
  readonly flexWrap?: FlexWrap;
  readonly direction?: WritingDirection;
  readonly writingMode?: WritingMode;
  readonly overflowX?: OverflowMode;
  readonly overflowY?: OverflowMode;
  readonly gridColumns?: readonly GridTrackLine[];
  readonly gridRows?: readonly GridTrackLine[];
  readonly gapX?: number;
  readonly gapY?: number;
}

export interface ChildLayoutDescriptor {
  readonly id?: string;
  readonly index: number;
  readonly display: CssDisplay;
  readonly position: CssPosition;
  readonly rect: Rect;
  readonly widthMode?: SizeMode;
  readonly heightMode?: SizeMode;
  readonly intrinsicSize?: Size2D;
  readonly flexGrow?: number;
  readonly flexShrink?: number;
  readonly flexBasis?: number | 'auto' | 'content';
  readonly alignSelf?: 'auto' | 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'baseline';
  readonly margins?: Partial<BoxEdges>;
  readonly insets?: Partial<BoxEdges>;
  readonly gridColumnSpan?: number;
  readonly gridRowSpan?: number;
}

export interface FlowSiblingDescriptor {
  readonly id?: string;
  readonly index: number;
  readonly display: CssDisplay;
  readonly position: CssPosition;
  readonly rect: Rect;
}

export type GestureDescriptor =
  | {
      readonly kind: 'move';
      readonly from: Point2D;
      readonly to: Point2D;
    }
  | {
      readonly kind: 'resize';
      readonly handle: HandleId;
      readonly fromRect: Rect;
      readonly toRect: Rect;
    };

export interface LayoutIntentInput {
  readonly parent: ParentLayoutDescriptor;
  readonly child: ChildLayoutDescriptor;
  readonly siblings: readonly FlowSiblingDescriptor[];
  readonly gesture: GestureDescriptor;
}

export type LayoutIntent =
  | { readonly kind: 'no-op'; readonly reason: string }
  | {
      readonly kind: 'reorder-in-flow';
      readonly fromIndex: number;
      readonly targetIndex: number;
      readonly axis: 'horizontal' | 'vertical';
      readonly visualDirection: 'forward' | 'reverse';
      readonly lineIndex: number;
    }
  | {
      readonly kind: 'absolute-offset';
      readonly position: 'absolute' | 'fixed';
      readonly deltaX: number;
      readonly deltaY: number;
      readonly insetDeltas: {
        readonly top?: number;
        readonly right?: number;
        readonly bottom?: number;
        readonly left?: number;
      };
    }
  | {
      readonly kind: 'relative-offset';
      readonly deltaX: number;
      readonly deltaY: number;
    }
  | {
      readonly kind: 'grid-cell-move';
      readonly targetColumn: number;
      readonly targetRow: number;
      readonly columnSpan: number;
      readonly rowSpan: number;
    }
  | {
      readonly kind: 'size-fixed';
      readonly axis: 'width' | 'height' | 'both';
      readonly width?: number;
      readonly height?: number;
    }
  | {
      readonly kind: 'size-fill';
      readonly axis: 'width' | 'height' | 'both';
    }
  | {
      readonly kind: 'size-fit';
      readonly axis: 'width' | 'height' | 'both';
    }
  | {
      readonly kind: 'ambiguous';
      readonly reason: string;
    };

export const GEOMETRY_EPSILON = 1e-6;
export const MATRIX_SINGULAR_EPSILON = 1e-10;
