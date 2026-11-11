# SlightNudge Editor State: Geometry Core & UI Integration Sprint

Built atop `design/editor-geometry` (`ef46aac`) on branch `design/editor-geometry-integration`. Connects UI manipulation, selection chrome, canvas zoom anchoring, dock avoidance, overlay flow reorder, and cross-origin preview transform chains directly to `lib/editor/geometry`, eliminating duplicated inline geometry math and fixing real multi-zoom/cross-origin/snapping/reflow bugs while keeping `app/api/**` untouched and preserving `SOURCE_CANVAS_PROTOCOL = 19`.

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
   - **Move/Resize Inline Style Collision & Overlay Height Collapse (`EditorWorkspace.tsx`, `SourceProjectCanvas.tsx`)**: Fixed same-origin Move & Resize persistence where temporary DOM inline `style.translate` / `style.maxWidth` triggered `'This element has a custom or animated transform. Resolve it before using Move.'` inside `sourceCanvasRuntime`'s `preview()`, prevented mid-drag `source-rect` double-offset via `__slightnudge_gesture_active`, restored `overlayNode` `'100%'` dimensions instead of `''` (eliminating post-drop `height: 0` collapse), cleared `overlayNode.style.transform` atomically on `source-rect` via `pendingOverlayResetKeyRef` + `useLayoutEffect`, tracked `inFlightMoveRef` / `pendingDirectStyleRef` across queued rapid drags, and suppressed spurious post-drag move popover opens (`moveClickSuppressed`).
3. **Cross-Origin Bridge Serialization (Option 2)**:
   - [`source-canvas-contract.ts`](file:///C:/dev/vibecheck/scratch/editor-safety-port-20261108/lib/slightnudge/source-canvas-contract.ts) & [`SourceProjectCanvas.tsx`](file:///C:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/SourceProjectCanvas.tsx): Added optional `SerializedTransformFrame` / `transformChain` on `CanvasLayer` and `SourceSelection` (keeping `SOURCE_CANVAS_PROTOCOL = 19`), with bounded validation/sanitization (`<= 64` frames, finite numbers, `<= 512`-char CSS strings) on incoming `postMessage` selection/geometry/edit payloads.
   - [`source-canvas-bridge.ts`](file:///C:/dev/vibecheck/scratch/editor-safety-port-20261108/lib/slightnudge/source-canvas-bridge.ts): Added self-contained `readTransformChain(element)` inside serialized `sourceCanvasRuntime`, emitted `transformChain` from `describe(element)` (`false` in `catalog()`), and relaxed `gesture` `maxWidth` lower bound from `24` to `1` px (`<= 2048`).
   - [`direct-manipulation-engine.ts`](file:///C:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/direct-manipulation-engine.ts) & [`EditorWorkspace.tsx`](file:///C:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/EditorWorkspace.tsx): Added `hydrateSerializedTransformChain(frames)` and wired cross-origin fallback (`targetEl === null`) across `renderSourceSelection`, `captureGestureMatrices`, `startDragMove`, and `startResize` (including unrotated local border-box width/height from the hydrated tail frame).
4. **Tests & Verification**:
   - `test/geometry-ui-integration.test.ts` (`12/12` unit & contract tests), `test/geometry-ui-integration.browser.test.ts` (`9/9` Playwright checks: wheel zoom, `0.5x` snap guide `diff=0.00px`, `gbcrCalls=0`, `apiCalls=0`, zoomed handle suppression, live `Shift` aspect ratio `246x120`, oriented SVG quad `topEdgeSlopeY=82.0px`, `cursor=nwse-resize`, rotated `radiusGrip`, local `+40px` resize `W: 200px × H: 80px`, panel/dock vertical clearance, `iframe.contentDocument === null` rotated chrome & resize fallback, live cross-origin `127.0.0.1` vs `localhost` bridge oracle `err=0.000px` with `maxWidth=12px`, and consecutive same-origin Move drags staying synced `err1=0.0px`, `midErr=0.0px`, `err2=0.0px` with zero error toast).
   - Unit + geometry + oracle + regression suites (`173/173` passed, including `test/geometry/*.test.ts`, `test/direct-manipulation.test.ts`, `test/direct-manipulation-math.test.ts`, `test/selection-coordinates.test.ts`, `test/drag-move.test.ts`, `test/selection-style.test.ts`, `test/outline-drag.test.ts`, `test/geometry-ui-integration.test.ts`), `test/outline-drag.browser.test.ts` (`5/5`), `npx tsc --noEmit` (`exit 0`), `npm run build` (`46/46` pages, `exit 0`), and `npm test` (`72/72` platform tests).
   - **Pre-Merge Qualification (`test/run-baseline-benchmark.ts` 2000-node heavy benchmark + `test/unified-editor.browser.ts --round=1`)**:
     - Heavy 2000-node DOM gesture benchmark (`os.tmpdir()/sn-heavy-bench-*`): `resize` `medianFrameMs=16.7ms`, `p95FrameMs=16.7ms`, `shareOver33MsPct=0.4%`, `longtasksOver50Count=1` (`maxLongtaskMs=68ms`), `layoutReadsPerFrame=1.94`, `pointerToVisualLatencyMs=1ms`; `move` `medianFrameMs=16.7ms`, `p95FrameMs=16.7ms`, `shareOver33MsPct=0.4%`, `longtasksOver50Count=1` (`maxLongtaskMs=75ms`), `layoutReadsPerFrame=1.03`, `pointerToVisualLatencyMs=1ms`.
     - `test/unified-editor.browser.ts --round=1`: Passed `4/4` HTTP redirects, `4/4` migrations (`local full`, `imported full`, `local fit`, `imported fit`), and `4/4` shared-instance `view=fit` workflows (`local Studio`, `local window`, `imported Studio`, `imported window`).

### Not Proven / Pre-Existing Failures & Documented Limits
1. **Pre-Existing Upstream Harness Failures (`ef46aac`)**:
   - `test/move-css-compatibility.test.ts`: Fails at line 16 (`preview` returns `false`) with `'This part of the page is still loading. Let it finish before editing again.'` because `waitForTargets` in `source-canvas-bridge.ts` (already present in `ef46aac`) requires React `__reactFiber$` properties absent on that synthetic HTML page.
   - `test/unified-editor.browser.ts --round=1`: Completed `4/8` shared-instance workflows (`view=fit` passed `4/4`); `view=full` failed waiting for `Canvas zoom` combobox (which upstream `ef46aac` already renders only when `view === 'fit'`), and `test/step1-selection.test.ts` failed waiting for non-iframe `#target` after `unified-navigation-preload.cjs` rewrote `/fixtures/1` -> `/editor?fixture=1`.
2. **Merge Target Conflict Blocker (`C:\dev\vibecheck`)**:
   - Main checkout `C:\dev\vibecheck` (`feat/visual-studio-framer` at `18c0f04`) currently has `48` dirty/untracked paths (`git status --short`); branch not auto-merged to avoid clobbering uncommitted local state.
3. **Documented 2D Affine Limits**:
   - CSS 3D transforms (`rotateX`/`rotateY`) and CSS `zoom` remain documented limits per [`docs/editor/geometry.md`](file:///C:/dev/vibecheck/scratch/editor-safety-port-20261108/docs/editor/geometry.md).

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
- `b83e614`: `docs(editor): update STATE with production build and visual polish proof`
- `92ce3d1`: `feat(editor): serialize transformChain across preview bridge for cross-origin geometry`
- `aeb872c`: `test(geometry): verify cross-origin transformChain bridge and UI chrome fallback`
- `bcb9198`: `docs(editor): update STATE with Option 2 cross-origin proof and pre-merge qualification`
- `df7aa92`: `fix(editor): sync move/resize inline styles with preview bridge and preserve overlay height`
- `397fb71`: `test(geometry): verify consecutive same-origin Move drags stay synced and persist cleanly`
- `[Current Commit]`: `docs(editor): update STATE with Move persistence fix and 9/9 integration proof`

*(Foundation commits on `design/editor-geometry`: `111b54a`, `6624f9f`, `5b79406`, `e5f04e9`, `a42f6b2`, `ef46aac`.)*

---

## 3. Path & Scope Verification Check

Verification command:
```bash
git diff --name-only ef46aac..HEAD
```

Modified/added paths:
```text
components/slightnudge/CanvasStage.tsx
components/slightnudge/EditorWorkspace.tsx
components/slightnudge/SlightNudgeOverlay.tsx
components/slightnudge/SourceProjectCanvas.tsx
components/slightnudge/canvas-stage.module.css
components/slightnudge/direct-manipulation-engine.ts
components/slightnudge/editor-workspace.module.css
components/slightnudge/responsive-controls.module.css
components/slightnudge/selection-style.ts
components/slightnudge/source-window.module.css
components/slightnudge/useWindowDock.ts
docs/editor/STATE.md
lib/slightnudge/source-canvas-bridge.ts
lib/slightnudge/source-canvas-contract.ts
test/geometry-ui-integration.browser.test.ts
test/geometry-ui-integration.test.ts
```

Audit against scope rules:
- `lib/slightnudge/source-canvas-contract.ts` & `lib/slightnudge/source-canvas-bridge.ts`: **AUTHORIZED under Option 2** (`SOURCE_CANVAS_PROTOCOL = 19` unchanged)
- All other `lib/slightnudge/**` files: **UNTOUCHED**
- `app/api/**`: **UNTOUCHED**
- `lib/editor/geometry/**`, `docs/editor/geometry.md`, `docs/THIRD_PARTY.md`: **UNCHANGED** (`ef46aac` intact)
- `next-env.d.ts` / scratch artifacts: **UNTOUCHED / UNCOMMITTED**

**Result**: **ZERO** unauthorized paths modified.

---

## 4. Temporary Environments and Cleanup Confirmation

- Browser test and qualification servers launched exclusively on free ephemeral ports (`findFreePort`, `3860+`, `3910+`, `3940+`, `3955+`, `3960+`, `3965+`) inside disposable `os.tmpdir()` workspaces (`sn-outline-test-*`, `sn-geom-ui-test-*`, `sn-heavy-bench-*`, `sn-review-consent-*`, `sn-repro-*`) and removed afterward; temporary `docs/unified-editor-evidence` outputs were deleted so `git status --short` is empty.
- Main checkout `C:\dev\vibecheck` (port `3000` workspace) was never contacted or modified.

---

## 5. Recommended Next Step

Cleanly commit, stash, or discard the 48 uncommitted/untracked entries in `C:\dev\vibecheck` (`feat/visual-studio-framer`, `18c0f04`), then fast-forward/merge `design/editor-geometry-integration` into `feat/visual-studio-framer`.
