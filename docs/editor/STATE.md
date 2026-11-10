# SlightNudge Editor State: Geometry Core & UI Integration Sprint

Built atop `design/editor-geometry` (`ef46aac`) on branch `design/editor-geometry-integration`. Connects UI manipulation, selection chrome, canvas zoom anchoring, dock avoidance, and overlay flow reorder directly to `lib/editor/geometry`, eliminating duplicated inline geometry math and fixing real multi-zoom coordinate/snapping/reflow bugs while keeping `lib/slightnudge/**` and `app/api/**` untouched.

---

## 1. What is Proven and What is Not Proven

### Proven
1. **Unified Geometry Adapter & Session Snapper (`components/slightnudge/direct-manipulation-engine.ts`)**:
   - `compute8HandleResize` delegates to `solveResize` with support for `elementToScreen` rotated/skewed/flipped transforms, `maxWidth`/`maxHeight`, `aspectRatio`, `fromCenter`, and `>= 1 px` bounds.
   - `createDirectSnapSession`, `snapRectInSession`, and `snapResizeInSession` use preallocated `SnapIndex`, `SnapScratchBuffer`, and `MutableSnapOutput` (`snapRectInto`), probing only active moving handle edges unless `fromCenter` is active so stationary aligned edges no longer hijack handle snapping, and feeding `snapLocalX`/`snapLocalY` directly into `solveResize` so `Shift` aspect ratio and opposite-edge anchors hold accurately.
   - `computeSmartSnapping` caches indexed `SnapIndex` state on repeated calls (`0.0107 ms/frame` measured across 1,000 iterations on 50 siblings in `test/direct-manipulation-math.test.ts`).
   - `buildArtboardToContainerMatrix` and `transformGuideLineToContainer` project iframe-local guide lines into `<main>` container space at arbitrary zoom & scroll offsets; `roundMoveTranslation` preserves 1 px sibling snap alignment instead of overwriting it with 4 px Tailwind grid rounding; `computeZoomAnchorScroll` and `resolveScrollForZoomAnchor` delegate wheel zoom anchoring to `screenToCanvasPoint` / `canvasToScreenPoint`; `classifyOverlayFlowIntent` delegates to `classifyLayoutIntent`.
   - `isAffineNonTrivial`, `cursorForHandleAngle`, `transformQuadByOffset`, `buildQuadOutlinePath`, `composeCssTransformMatrix`, `findSourceElementInDocument`, and `extractElementTransformChain` extract ancestor-to-target 2D affine transform chains (`translate`/`rotate`/`scale`/`transform`, `transformOrigin`, `scrollLeft`/`scrollTop`, `offsetParent`/`clientLeft`) from same-origin DOM documents, generate outward-offset oriented SVG quad paths (handling negative scale flips cleanly), and resolve angle-aware CSS resize cursors.
2. **UI Component Integrations**:
   - [`EditorWorkspace.tsx`](file:///C:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/EditorWorkspace.tsx): Resolves true rendered stage zoom even in `'fit'` mode (`resolveStageScale`), looks up same-origin targets via `findSourceElementInDocument`, builds ancestor transform chains via `extractElementTransformChain` and `buildElementToScreenMatrix` in `captureGestureMatrices`, caches `SnapIndex`, `artboardToMain`, `elementToScreen`, and `elementToArtboard` at `pointerdown`, uses single-pass `snapResizeInSession` + `snapRectInSession`, renders transformed `<main>` guides (`applyGuidesToOverlay`), renders oriented `Quad` SVG selection chrome (`data-selection-oriented="true"`) with dynamic handle button coordinates/cursors and live local-axis rotated `onTick` updates via `handleButtonRefs`, and nudges via `vecAdd`.
   - [`selection-style.ts`](file:///C:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/selection-style.ts): Exports `computeSelectionChromeGeometry` (powered by `predictElementScreenRect`, `matDecompose`, `radToDeg`, `getHandleScreenPoint`, `isAffineNonTrivial`, and `cursorForHandleAngle`) returning `prediction`, `rotationDeg`, `handleScreenPoints`, `isNonTrivialTransform`, `edgeCursors`, and `localRect`, and delegates radius grip rounding to `roundValue`.
   - [`CanvasStage.tsx`](file:///C:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/CanvasStage.tsx): Delegates wheel zoom-to-cursor anchor & post-zoom scroll placement to `computeZoomAnchorScroll` and `resolveScrollForZoomAnchor`.
   - [`useWindowDock.ts`](file:///C:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/useWindowDock.ts): Uses `rectIntersects` and `roundValue` and suspends `MutationObserver` dock-avoidance `getBoundingClientRect()` calls during active drag, resuming once on drop (`0` parent `getBoundingClientRect()` reads during drag rAF).
   - [`SlightNudgeOverlay.tsx`](file:///C:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/SlightNudgeOverlay.tsx): Uses `classifyOverlayFlowIntent` (`classifyLayoutIntent`) to resolve flow axis and visual forward/reverse direction (`RTL`, `row-reverse`, `column-reverse`) cleanly while preserving grid/flex-wrap refusal notices.
3. **Bugs Discovered & Fixed During Integration**:
   - **Mid-Drag Dock Layout Reads (`useWindowDock.ts`)**: `MutationObserver` triggered synchronous `getBoundingClientRect()` reads during `pointermove`; fixed via drag suspension + `resumeSignal` (`10 -> 0` reads in Playwright).
   - **Zoomed Smart Guide Coordinate Mismatch (`EditorWorkspace.tsx`)**: `<main>` guide lines previously used raw unscaled iframe coordinates; fixed via `buildArtboardToContainerMatrix` (`0.00 px` screen discrepancy at `0.5x` zoom in Playwright).
   - **Fit-Mode Zoom Stuck at `1` (`EditorWorkspace.tsx`)**: `'fit'` mode previously defaulted zoom to `1`, breaking handle sizing and pointer deltas; fixed via `resolveStageScale` (verified zoomed edge-handle suppression `35px < 40px` at `0.5x` vs visible at `1.0x`).
   - **Stationary Edge Hijack & Post-Snap Resize Clobbering**: Probing active handle edges first and solving via `solveResize(..., snapLocalX/Y)` fixed aspect-ratio/anchor corruption and aligned sibling snaps.
   - **Move Sibling Snap Clobbered by 4 px Grid Rounding**: `roundMoveTranslation` keeps exact 1 px sibling snap when `snappedX/Y` is true.
   - **Iframe Focus `Escape` Race & Stale Overlay Size (`EditorWorkspace.tsx`)**: Added `focus({ preventScroll: true })` to `startResize`/`startRadiusDrag`, guarded `receiveSourceText`'s `'Escape'` handler with `cancelActiveDragRef` so pressing `Escape` cancels drag without unmounting captured handles, cleared inline `width`/`height` on `onPointerUp`/`cancelDrag`, and keyed `<div key={layerKey}>` using `selection.rect`.
   - **Rotated Element AABB Selection & Handle Cursor Misalignment (`EditorWorkspace.tsx`, `selection-style.ts`)**: Replaced axis-aligned `selection.rect` dimension assumptions on rotated elements with local border-box dimensions from `extractElementTransformChain`, drew oriented SVG quad chrome inset `0` in wrapper space, suppressed unrotated AABB corner arcs when transformed, rotated handle cursors dynamically via `cursorForHandleAngle`, and positioned the `radiusGrip` cleanly inside rotated `nw` corners (`cornerArcRefs` + `radiusGripRef` tracked live on `rAF`).
   - **Dynamic Corner Arc Lag & Studio Window Chrome Polish (`EditorWorkspace.tsx`, CSS modules)**: Synchronized `variant === 'arc'` / `'circle'` corner `<path>` trajectories (`cornerArcRefs`) and zero-transition drag locks (`cleanupVisuals`) during live resize (`<= 3 px` behind outline); framed artboards on a studio dot-matrix canvas (`canvas-stage.module.css`, `source-window.module.css`); refined frosted floating command dock (`30px` unified controls, emerald gradient primary CTA, status pill, `bottom: 78px` panel clearance, `z-index: 95` drawer stacking).
4. **Tests & Verification**:
   - `test/geometry-ui-integration.test.ts` (`11/11` unit & contract tests), `test/geometry-ui-integration.browser.test.ts` (`6/6` live Playwright scenarios on `/editor?view=fit`: wheel zoom, `0.5x` snap guide `diff=0.00px`, dynamic corner arc tracking, `gbcrCalls=0`, `apiCalls=0`, zoomed handle suppression, live `Shift` aspect ratio `246x120`, `#geom-rotated` oriented SVG quad `topEdgeSlopeY=82.0px`, `cursor=nwse-resize`, rotated `radiusGrip`, local `+40px` resize `W: 200px × H: 80px`, and panel/dock vertical clearance).
   - `npm run build` (`next build --webpack`) verified cleanly (`exit 0`, zero tracked/untracked workspace diffs).
   - `test/outline-drag.browser.test.ts`, `test/geometry/*.test.ts`, `test/selection-style.test.ts` (`52/52`), `test/direct-manipulation-math.test.ts`, `test/outline-drag.test.ts`, `test/direct-manipulation.test.ts`, `test/selection-coordinates.test.ts`, `test/drag-move.test.ts`, and `npm test` verified after final commits.

### Not Proven / Out of Scope for this Sprint
1. **Engine / AST Write Execution & Cross-Origin Bridge Chains (`lib/slightnudge/**`, `app/api/**`)**:
   - Off-limits boundary preserved: backend preview/apply/reorder routes and `source-canvas-bridge.ts` remain untouched. Cross-origin iframes (where `sourceCanvas.current?.getDocument?.()` returns `null`) fall back gracefully to axis-aligned `selection.rect` chrome.
2. **2000-Node Heavy Production Latency Benchmark & Documented 2D Affine Limits**:
   - `npm run build` (`next build --webpack`) passed after code edits; 2000-node heavy production runtime frame benchmark (`STATE.md` from `design/editor-selection`) was not re-benchmarked; CSS 3D transforms (`rotateX`/`rotateY`) and CSS `zoom` remain documented limits per [`docs/editor/geometry.md`](file:///C:/dev/vibecheck/scratch/editor-safety-port-20261108/docs/editor/geometry.md).

---

## 2. Commit Hashes on `design/editor-geometry-integration`

Base tip: `ef46aac` (`docs(editor): update STATE with geometry core sprint proof` on `design/editor-geometry`).

- `4d05e60`: `refactor(editor): delegate UI resize, snapping, zoom, dock, and flow math to lib/editor/geometry`
- `5956716`: `test(editor): add geometry UI integration unit and Playwright browser tests`
- `1fda116`: `docs(editor): update STATE with geometry UI integration proof`
- `932bf34`: `fix(editor): fix Escape focus capture and overlay dimension persistence after resize`
- `d63118c`: `docs(editor): update STATE with final integration proof`
- `4e7133d`: `feat(editor): render oriented Quad SVG chrome and ancestor-aware rotated resize`
- `c9010be`: `test(editor): verify oriented Quad SVG selection chrome and rotated local resize`
- `3ff0be9`: `docs(editor): update STATE with oriented Quad chrome integration proof`
- `25a4b81`: `fix(editor): sync live resize corner arcs, oriented radius grip, and elevate studio window layout`
- `0653961`: `test(editor): assert live dynamic arc tracking, oriented radius grip, and panel/dock clearance`
- `[Current Commit]`: `docs(editor): update STATE with production build and visual polish proof`

*(Foundation commits on `design/editor-geometry`: `111b54a`, `6624f9f`, `5b79406`, `e5f04e9`, `a42f6b2`, `ef46aac`.)*

---

## 3. Off-Limits Path Verification Check

Verification command:
```bash
git diff --name-only ef46aac..HEAD
```

Modified/added paths:
```text
components/slightnudge/CanvasStage.tsx
components/slightnudge/EditorWorkspace.tsx
components/slightnudge/SlightNudgeOverlay.tsx
components/slightnudge/canvas-stage.module.css
components/slightnudge/direct-manipulation-engine.ts
components/slightnudge/editor-workspace.module.css
components/slightnudge/responsive-controls.module.css
components/slightnudge/selection-style.ts
components/slightnudge/source-window.module.css
components/slightnudge/useWindowDock.ts
docs/editor/STATE.md
test/geometry-ui-integration.browser.test.ts
test/geometry-ui-integration.test.ts
```

Audit against off-limits list:
- `lib/slightnudge/**`: **UNTOUCHED**
- `app/api/**`: **UNTOUCHED**
- `lib/editor/geometry/**`, `docs/editor/geometry.md`, `docs/THIRD_PARTY.md`: **UNCHANGED** (`ef46aac` intact)
- `next-env.d.ts` / scratch artifacts: **UNTOUCHED / UNCOMMITTED**

**Result**: **ZERO** off-limits paths modified.

---

## 4. Temporary Environments and Cleanup Confirmation

- Browser test servers launched exclusively on free ephemeral ports (`findFreePort`, `3860+`, `3910+`) inside `os.tmpdir()` workspaces (`sn-outline-test-*`, `sn-geom-ui-test-*`) and cleaned up (junction unlinked + `rmSync` + server stopped + browser closed) in `finally` blocks.
- Port `3000` dev server in main workspace was never contacted or stopped.

---

## 5. Recommended Next Step

Review and merge `design/editor-geometry-integration` (and/or, once `lib/slightnudge/**` is in scope, emit `ElementTransformFrame[]` ancestor chains over `source-canvas-bridge.ts` for cross-origin sandboxes where `getDocument()` is unavailable).
