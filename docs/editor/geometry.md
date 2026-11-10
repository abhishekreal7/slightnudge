# SlightNudge Editor Geometry Core (`lib/editor/geometry`)

A pure TypeScript, zero-DOM, zero-React, zero-engine geometric foundation and layout-intent classification library for the SlightNudge visual editor.

> [!IMPORTANT]
> **Architectural Rule — Do Not Duplicate Geometry Math in UI Code:**
> Components and helpers under `components/slightnudge/**` must import and invoke `lib/editor/geometry` primitives (`buildElementToScreenMatrix`, `predictElementScreenRect`, `solveResize`, `snapRectInto`, `alignRects`, `distributeRects`, `classifyLayoutIntent`, `roundValue`, etc.) instead of writing inline matrix multiplications, zoom divisions, handle delta math, or ad-hoc snap loops.

---

## 1. Module Inventory (`lib/editor/geometry/`)

| Module | Responsibilities |
| :--- | :--- |
| `types.ts` | Shared immutable geometry types (`Point2D`, `Rect`, `Bounds`, `Quad`, `Matrix2D`, `CanvasSpace`, `ElementTransformFrame`, `ResizeInput`, `ResizeOutput`, `SnapOptions`, `GuideDescriptor`, `LayoutIntentInput`, `LayoutIntent`), tolerances (`GEOMETRY_EPSILON = 1e-6`, `MATRIX_SINGULAR_EPSILON = 1e-10`). |
| `matrix.ts` | 2D vector arithmetic (`vec*`), explicit rounding (`roundValue`, `roundPoint`, `roundRect`, `toBounds`, `normalizeRect`), and 2D affine matrix algebra (`matIdentity`, `matTranslate`, `matScale`, `matRotate`, `matSkew`, `matWithOrigin`, `matMultiply`, `matCompose`, `matDeterminant`, `matInvert`, `matDecompose`, `matRecompose`, `transformPoint`, `transformVector`, `transformRectToQuad`, `transformRectBounds`, `quadBounds`, `quadContainsPoint`, `rectIntersects`). |
| `spaces.ts` | Coordinate conversions across **Screen**, **Canvas**, **Device Pixels (DPR)**, and **Element-Local** spaces along an ancestor transform & scroll chain (`canvasToScreenMatrix`, `canvasToScreenPoint`, `screenToCanvasPoint`, `cssPxToDevicePx`, `devicePxToCssPx`, `snapCssToDevicePixelGrid`, `elementLocalTransformMatrix`, `buildElementToScreenMatrix`, `elementLocalToScreenPoint`, `screenToElementLocalPoint`, `screenDeltaToElementLocalDelta`, `elementLocalToCanvasPoint`, `canvasToElementLocalPoint`, `predictElementScreenRect`). |
| `resize.ts` | Local-axis 8-handle resize solver (`getHandleLocalPoint`, `getHandleScreenPoint`, `solveResize`) supporting rotation, negative scale/flips, skew, `aspectRatio` locks, `fromCenter` resizing, `snapLocalX`/`snapLocalY`, `minWidth`/`minHeight` (`>= 1` px), `maxWidth`/`maxHeight`, and `NaN`/degenerate safety. |
| `snapping.ts` | Spatial-indexed candidate snapping (`createSnapIndex`, `rebuildSnapIndex`, `createSnapScratchBuffer`, `createMutableSnapOutput`, `snapRectInto`, `extractGuideDescriptors`, `snapRect`, `rectToBounds`) supporting sibling & container edges/centers, screen-pixel threshold scaled by zoom, equal-spacing detection, and allocation-free `snapRectInto` hot execution. |
| `align.ts` | Multi-selection bounding and distribution helpers (`computeSelectionBounds`, `alignRects`, `distributeRects`, `spaceRectsWithGap`). |
| `intent.ts` | Pure data-in / data-out layout intent classifier (`classifyLayoutIntent`) mapping container/child/sibling CSS descriptors + gesture into structural intents (`reorder-in-flow`, `grid-cell-move`, `absolute-offset`, `relative-offset`, `size-fixed`, `size-fill`, `size-fit`, `no-op`, `ambiguous`). |
| `index.ts` | Barrel re-exporting all modules above. |

---

## 2. Coordinate Spaces & Conventions

### Matrix Convention (`Matrix2D`)
Every 2D affine matrix is a 6-tuple `[a, b, c, d, e, f]` matching `DOMMatrix` / CSS `matrix(a, b, c, d, e, f)` column-vector convention:

```text
| a  c  e |   | x |   | a*x + c*y + e |
| b  d  f | * | y | = | b*x + d*y + f |
| 0  0  1 |   | 1 |   |       1       |
```

Composition order follows standard post-multiplication semantics:
- `matMultiply(A, B)` applies transformation `B` first, then `A` (`p' = A * (B * p)`).
- `matCompose(...mats)` applies matrices right-to-left (`matCompose(A, B, C) = A * (B * C)`).

### Four Coordinate Spaces

1. **Element-Local Border-Box Space (`(0, 0)` to `(width, height)`)**
   - Origin `(0, 0)` is the top-left corner of the element's border box **before** the element's own CSS `transform` is applied.
   - `ElementTransformFrame.transformOrigin` defaults to `{ x: frame.width / 2, y: frame.height / 2 }` (matching CSS default `transform-origin: 50% 50%`). When a non-identity `transform` is present, `elementLocalTransformMatrix(frame)` wraps it via `matWithOrigin(ox, oy, t)`.
2. **Canvas Space**
   - Unzoomed, unpanned artboard coordinate system parameterized by `CanvasSpace`:
     `{ originX, originY, panX, panY, zoom, devicePixelRatio? }`.
   - Mapped to Screen CSS pixels via `canvasToScreenMatrix(space)` = `[z, 0, 0, z, originX + panX, originY + panY]`.
   - Non-positive or non-finite `zoom` falls back to `1` in `canvasToScreenMatrix` and returns `null` cleanly in `screenToCanvasPoint`.
3. **Screen CSS Pixel Space**
   - Viewport client coordinates matching `getBoundingClientRect()` and pointer `clientX`/`clientY`.
   - Built by `buildElementToScreenMatrix(chain, space, viewportScroll = { x: 0, y: 0 })`:
     1. Start with `T(-viewportScroll.x, -viewportScroll.y) * canvasToScreenMatrix(space)`.
     2. For each frame `i` in `[rootFrame, ..., parentFrame, targetFrame]`:
        - Post-multiply `T(frame.offsetX, frame.offsetY)`.
        - Post-multiply `elementLocalTransformMatrix(frame)` if non-identity.
        - For ancestor containers (`i < chain.length - 1`), post-multiply `T(-scrollLeft, -scrollTop)`.
4. **Device Pixel Space (DPR)**
   - Physical backing pixels scaled by `devicePixelRatio` (`> 0`, defaults to `1`):
     `cssPxToDevicePx(cssPx, dpr)`, `devicePxToCssPx(devicePx, dpr)`, and `snapCssToDevicePixelGrid(cssPx, dpr)`.

---

## 3. Rounding Policy

- **Subpixel Preservation During Live Manipulation**: All internal geometry operations (`matrix`, `spaces`, `resize`, `snapping`, `align`) operate in full IEEE-754 floating-point precision so intermediate transforms, inverse round-trips, and handle anchor points never accumulate rounding drift frame-over-frame.
- **Explicit Serialization Rounding (`RoundingMode`)**: Callers explicitly round only at CSS output, Tailwind step mapping, or pixel-grid hairline rendering using `roundValue(value, mode = 'nearest', step = 1)`, `roundPoint`, `roundRect`, or `snapCssToDevicePixelGrid`.
- **Supported Modes**:
  - `'none'`: returns input verbatim (no-op for finite numbers; `0` for non-finite).
  - `'nearest'`: `Math.round(value / step) * step`.
  - `'floor'`: `Math.floor(value / step) * step`.
  - `'ceil'`: `Math.ceil(value / step) * step`.
  - `'half-away-from-zero'`: symmetric half-step rounding (`scaled < 0 ? -Math.round(-scaled) : Math.round(scaled)`).
- **Negative Zero Normalization**: `Object.is(result, -0) ? 0 : result` ensures deterministic zero representation across serializers and equality assertions.
- **Minimum Box Dimension Guard**: `solveResize` enforces `minWidth >= 1` and `minHeight >= 1` (never `< 1`, even if caller supplies smaller constraints), while holding the opposite anchored corner/edge fixed in local space.

---

## 4. Verified Invariants & Test Mapping

| Invariant | Verification Method & File | Observed Result |
| :--- | :--- | :--- |
| **Pure library constraints (zero DOM, React, engine, `Date`, `Math.random`, `any`, `@ts-ignore`)** | Static regex & import scan in `test/geometry/matrix-spaces.test.ts` | Passing |
| **Matrix inverse round-trip ($M \cdot M^{-1} = I$) & transform invertibility** | Seeded `fast-check` property test in `test/geometry/matrix-spaces.test.ts` (`SEED_MATRIX_INVERSE = 2026111001`, 250 runs) | 250/250 passing |
| **Affine composition associativity ($(A \cdot B) \cdot C \approx A \cdot (B \cdot C)$)** | Seeded `fast-check` property test in `test/geometry/matrix-spaces.test.ts` (`SEED_MATRIX_ASSOC = 2026111002`, 250 runs) | 250/250 passing |
| **Decompose / recompose fidelity (rotation, scale, flip, skew)** | Seeded `fast-check` property test in `test/geometry/matrix-spaces.test.ts` (`SEED_MATRIX_DECOMPOSE = 2026111003`, 250 runs) | 250/250 passing |
| **Screen <-> Canvas <-> Element-local round-trips across zooms & scroll chains** | Seeded `fast-check` property test in `test/geometry/matrix-spaces.test.ts` (`SEED_SPACES_ROUNDTRIP = 2026111004`, 250 runs) | 250/250 passing |
| **Handle-under-cursor invariant (zoom `0.25..4`, rotate, flip, skew)** | Seeded `fast-check` property test in `test/geometry/resize.test.ts` (`SEED_HANDLE_UNDER_CURSOR = 2026111011`, 300 runs) | 300/300 passing |
| **Resize then reverse resize is identity when unclamped** | Seeded `fast-check` property test in `test/geometry/resize.test.ts` (`SEED_RESIZE_IDENTITY = 2026111012`, 250 runs) | 250/250 passing |
| **Snapping displacement $\le \text{thresholdScreenPx} / \text{zoom}$ & idempotence** | Seeded `fast-check` tests in `test/geometry/snapping-align.test.ts` (`SEED_SNAP_THRESHOLD = 2026111021` 300 runs; `SEED_SNAP_IDEMPOTENT = 2026111022` 150 runs) | 450/450 passing |
| **Classifier table & ordering invariants (determinism, monotonic sweep)** | 65 table-driven CSS cases + property checks in `test/geometry/intent.test.ts` | 68/68 tests passing |
| **Browser differential oracle vs `getBoundingClientRect` (<= 0.5 px)** | Playwright Chromium across 1,050 nested transformed/scrolled/RTL/vertical cases (`ORACLE_SEED = 2026111099`) + 3 real-pointer resize rigs in `test/geometry/browser-oracle.test.ts` | 1,050/1,050 within `0.5 px` (0 disagreements); 3/3 pointer resize rigs within `0.5 px` |
| **Mutation killing power (8 seeded library mutants)** | Isolated sandbox test runner in `test/geometry/mutations.test.ts` | **8/8 killed** (100%) |
| **Line and branch test coverage (`>= 95%`)** | `node --import tsx --test --experimental-test-coverage` across unit & property suites | **100.00% lines**, **96.60% branches**, **100.00% funcs** |

---

## 5. Benchmarks & Allocation Characteristics

Measured in Node test runner (`test/geometry/snapping-align.test.ts`, 2,500-iteration JIT warmup followed by 1,000-iteration timed window reusing preallocated `SnapIndex`, `SnapScratchBuffer`, and `MutableSnapOutput`):

| Scenario | Budget | Observed Average | Observed Amortized Heap Delta |
| :--- | :---: | :---: | :---: |
| **50 siblings (`snapRectInto`)** | $\le 1.0\text{ ms/frame}$ | **0.00203 ms/frame** | **~4.65 bytes/call** |
| **500 siblings (`snapRectInto`)** | $\le 3.0\text{ ms/frame}$ | **0.01004 ms/frame** | **~0.43 bytes/call** |

Hot-path properties:
- `SnapIndex` stores sorted `Float64Array` / `Int32Array` / `Uint8Array` views and uses binary search (`lowerBoundByOrder` / `upperBoundByOrder`) so average candidate scanning is $O(\log N + K)$ rather than $O(N)$.
- All numeric fields in `SnapAxisView`, `MutableGuideDescriptor`, and `MutableSnapOutput` are pre-initialized as floating-point doubles to eliminate V8 Smi-to-Double map transitions during drag frames.

---

## 6. Documented Limits (Verified Browser Divergences & Edge Cases)

1. **Non-Standard CSS `zoom` Property**:
   - Verified in `test/geometry/browser-oracle.test.ts`: Chromium's `zoom: 1.5` alters layout metrics and scales visual coordinates differently from CSS `transform: scale(...)`. Canvas scaling must continue using CSS `transform: scale(...)` represented in `CanvasSpace.zoom` / `ElementTransformFrame.transform`, not CSS `zoom`.
2. **CSS 3D Transforms & `perspective`**:
   - Verified in `test/geometry/browser-oracle.test.ts`: `perspective` + `rotateX` / `rotateY` produce non-affine projective keystone projection that cannot be represented by a 2D `Matrix2D` `[a, b, c, d, e, f]`. Elements using 3D perspective transforms are outside the 2D affine contract.
3. **Degenerate / Singular Transform Chains**:
   - Matrices with $|\det(M)| \le 10^{-10}$ (e.g., `scale(0, 1)`) or non-finite inputs cannot be inverted. Space inverse helpers (`screenToCanvasPoint`, `screenToElementLocalPoint`, `screenDeltaToElementLocalDelta`) return `null`, and `solveResize` returns `degenerate: true` with safe finite clamping and zero `NaN`/`Infinity`.
4. **Non-Reorderable / Context-Sensitive CSS Flow Constructs**:
   - `classifyLayoutIntent` intentionally returns `'ambiguous'` with a descriptive reason rather than guessing edits for:
     - `position: sticky` (even inside flex containers, because scroll-pinned offsets conflict with DOM reorder).
     - `display: contents` (child or parent generates no CSS principal box).
     - `display: inline` on resize (`width`/`height` CSS properties do not apply).
     - Conflicting symmetric `margin: auto` centering resized asymmetrically or nudged orthogonal to auto margins.
     - Grid parents lacking explicit `gridColumns` / `gridRows` track bounds.

---

## 7. Integration Guide for Subsequent Editor Sprints

UI and manipulation modules must migrate from inline arithmetic to `lib/editor/geometry` calls as follows.

### A. Resize Sprint Integration (Replacing `compute8HandleResize`)

Currently, `components/slightnudge/direct-manipulation-engine.ts` uses axis-aligned `compute8HandleResize(params)`. Replace its core math sequence with affine-aware local-axis solving:

```ts
import {
  buildElementToScreenMatrix,
  solveResize,
  type CanvasSpace,
  type ElementTransformFrame,
  type HandleId,
} from '@/lib/editor/geometry';

// 1. At pointerdown (cache outside pointermove):
const elementToScreen = buildElementToScreenMatrix(ancestorAndTargetFrames, canvasSpace, viewportScroll);
const startLocalRect = { left: 0, top: 0, width: targetRect.width, height: targetRect.height };

// 2. Inside requestAnimationFrame pointermove:
const result = solveResize({
  startRect: startLocalRect,
  handle: activeHandle as HandleId,
  pointerDeltaScreen: { x: e.clientX - downClientX, y: e.clientY - downClientY },
  elementToScreen,
  constraints: {
    minWidth: style.minimumSizes.minWidth,
    minHeight: style.minimumSizes.minHeight,
    aspectRatio: shiftKey !== style.lockedAspect,
    fromCenter: altKey,
    snapLocalX: maybeSnappedLocalX,
    snapLocalY: maybeSnappedLocalY,
  },
});
// Apply result.rect ({ left, top, width, height }) to target element styles;
// render selection overlay from result.screenQuad & result.handlePointScreen.
```

### B. Snapping Sprint Integration (Replacing `computeSmartSnapping`)

Currently, `computeSmartSnapping(params)` in `components/slightnudge/direct-manipulation-engine.ts` scans all siblings $O(N)$ and allocates arrays/objects per frame. Migrate to prebuilt spatial indexing:

```ts
import {
  createMutableSnapOutput,
  createSnapIndex,
  createSnapScratchBuffer,
  extractGuideDescriptors,
  rebuildSnapIndex,
  snapRectInto,
} from '@/lib/editor/geometry';

// 1. Initialize once per editor controller or resize capacity on demand:
const snapIndex = createSnapIndex(1024);
const snapScratch = createSnapScratchBuffer(1024);
const snapOut = createMutableSnapOutput(4);

// 2. On pointerdown:
rebuildSnapIndex(snapIndex, siblingCandidateRects, containerCandidateRect);

// 3. On each rAF move/resize frame (zero object allocations on hot path):
snapRectInto(
  candidateBox,
  snapIndex,
  {
    thresholdScreenPx: 6,
    zoom: canvasSpace.zoom,
    disabled: metaOrCtrlHeld,
    includeContainer: true,
    includeEdges: true,
    includeCenters: true,
    includeEqualSpacing: true,
  },
  snapScratch,
  snapOut
);
// Read snapOut.dx, snapOut.dy, snapOut.rect directly for DOM style update.
// Feed snapOut.guides[0 .. snapOut.guideCount - 1] (or extractGuideDescriptors(snapOut) on UI sync)
// to render edge, center, and equal-spacing gap guide overlays.
```

### C. Selection Chrome v2 Integration (`components/slightnudge/selection-style.ts` & SVG Overlay)

`selectionStyleFor(info)` in `components/slightnudge/selection-style.ts` selects semantic variants (`dots`, `arc`, `capsule`, `circle`, `text`, `media`, `tiny`) and generates SVG strings via `buildRoundedRectPath`, `buildCornerArcPath`, and `buildCircleArcPath`. Combine those visual variants with `lib/editor/geometry` placement:

1. Compute the selected node's `screenPrediction = predictElementScreenRect(chain, space, viewportScroll)`.
2. Position the SVG selection chrome using `screenPrediction.matrix` or `screenPrediction.quad` (`nw`, `ne`, `se`, `sw`) rather than assuming an axis-aligned `getBoundingClientRect()` fits rotated/skewed children cleanly.
3. For each visible handle `h` in `style.visibleHandles`, compute exact handle anchor placement via `getHandleScreenPoint(localRect, h, screenPrediction.matrix)`.
4. Pass `result.screenQuad` directly from `solveResize` during resize drag so selection outlines and curved corner handles track the dragged box with zero additional DOM reads (`0` calls to `getBoundingClientRect` inside `pointermove`).

### D. Move, Alignment & Layout Intent Sprint Integration

1. **Gesture Classification on Move / Resize Commit**:
   Before mutating DOM order vs CSS inset/offset vs Tailwind sizing classes on drop, construct plain descriptors and call:
   ```ts
   import { classifyLayoutIntent } from '@/lib/editor/geometry';

   const intent = classifyLayoutIntent({
     parent: parentDescriptor,
     child: childDescriptor,
     siblings: siblingDescriptors,
     gesture: { kind: 'move', from: pointerDownCanvasPoint, to: pointerUpCanvasPoint },
   });
   ```
   Route engine mutations exclusively from `intent.kind`:
   - `'reorder-in-flow'` -> reorder AST node to `intent.targetIndex`
   - `'grid-cell-move'` -> update `gridColumn` / `gridRow` placement preserving `columnSpan` / `rowSpan`
   - `'absolute-offset'` -> adjust active non-auto insets by `intent.insetDeltas`
   - `'relative-offset'` -> adjust relative `top`/`left` deltas
   - `'size-fixed'` / `'size-fill'` / `'size-fit'` -> apply size class/style update
   - `'no-op'` / `'ambiguous'` -> surface clear UI feedback or cancel without unsafe guessing
2. **Multi-Selection Toolbar Actions**:
   Call `computeSelectionBounds(items)`, `alignRects(items, alignment, reference)`, `distributeRects(items, axis, mode)`, and `spaceRectsWithGap(items, axis, gap)` directly without re-deriving multi-rect bounds in React components.
