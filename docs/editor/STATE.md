# SlightNudge Editor State: Geometry Core & Browser-Oracle Harness Sprint

Built cleanly atop `design/editor-selection` (`17a99f8c1c5563de0c7058c5c2176f736591fc5c`) on branch `design/editor-geometry`. Delivers a pure TypeScript, zero-DOM, zero-React, zero-engine geometry foundation (`lib/editor/geometry/`) and differential/property/mutation verification suite (`test/geometry/`) without touching UI components, API routes, or engine internals.

---

## 1. What is Proven and What is Not Proven

### Proven
1. **Strict Purity & Build Safety**:
   - `./node_modules/.bin/tsc --noEmit` passes with zero errors under `strict` TypeScript (`no any`, `no @ts-ignore`, no `Date`, no `Math.random`).
   - Static audit test in `test/geometry/matrix-spaces.test.ts` verifies zero React, zero DOM globals, and zero `lib/slightnudge` imports across `lib/editor/geometry/**`.
2. **2D Affine Matrix Algebra & Coordinate Space Conversions**:
   - Column-vector 6-tuple `Matrix2D` (`[a, b, c, d, e, f]`), inverse, decompose/recompose, rect-to-quad & AABB transforms, and `RoundingMode` (`none`, `nearest`, `floor`, `ceil`, `half-away-from-zero`) with `-0` normalization.
   - Multi-level Screen $\leftrightarrow$ Canvas (origin, pan, zoom) $\leftrightarrow$ DPR Device Pixels $\leftrightarrow$ Element-Local transformations through arbitrary ancestor transform chains, `transformOrigin`, and ancestor `scrollLeft`/`scrollTop` offsets (`predictElementScreenRect`).
   - Verified via seeded `fast-check` property suites (`SEED_MATRIX_INVERSE=2026111001`, `SEED_MATRIX_ASSOC=2026111002`, `SEED_MATRIX_DECOMPOSE=2026111003`, `SEED_SPACES_ROUNDTRIP=2026111004`; 250 runs each).
3. **Affine Local-Axis 8-Handle Resize Solver**:
   - `solveResize`, `getHandleLocalPoint`, and `getHandleScreenPoint` handle all 8 handles on rotated, scaled, skewed, and negatively flipped elements, enforcing minimum size $\ge 1\text{ px}$, optional max bounds, aspect lock (`true` or explicit ratio), `fromCenter`, local snap overrides (`snapLocalX`, `snapLocalY`), and safe non-`NaN` degenerate fallbacks.
   - Seeded `fast-check` proofs verify the grabbed handle stays under the cursor at zooms $0.25..4$ (`SEED_HANDLE_UNDER_CURSOR=2026111011`, 300 runs) and unclamped resize followed by reverse resize restores identity (`SEED_RESIZE_IDENTITY=2026111012`, 250 runs).
4. **Spatial-Indexed $O(\log N)$ Snapping & Align/Distribute**:
   - `SnapIndex`, `SnapScratchBuffer`, and `MutableSnapOutput` (`snapRectInto`) detect sibling and container edges/centers plus equal-spacing gaps with screen-pixel threshold scaled by `1 / zoom`.
   - Seeded `fast-check` proofs confirm snap delta never exceeds threshold (`SEED_SNAP_THRESHOLD=2026111021`, 300 runs) and snapping is idempotent (`SEED_SNAP_IDEMPOTENT=2026111022`, 150 runs).
   - `computeSelectionBounds`, `alignRects`, `distributeRects`, and `spaceRectsWithGap` handle multi-rect alignment and spacing.
5. **Pure Layout Intent Classifier (`classifyLayoutIntent`)**:
   - 65 table-driven cases + determinism & monotonic sweep-ordering tests in `test/geometry/intent.test.ts` (68/68 passing) covering flex `row`/`column`/`reverse`, `wrap`/`wrap-reverse`, `RTL`, `vertical-rl`/`vertical-lr`, CSS grid tracks & spans, `absolute`/`fixed`/`sticky`/`relative`, `inline`/`inline-block`/`display: contents`/`display: none`, opposing `margin: auto`, and sizing intents (`size-fixed`, `size-fill`, `size-fit`, `no-op`, `ambiguous`).
6. **Playwright Chromium Differential Oracle**:
   - 1,050 randomly generated nested DOM trees (transforms, scroll offsets, borders, padding, canvas wrapper zoom, RTL, vertical writing modes; seed `2026111099`) matched `getBoundingClientRect()` within $\le 0.5\text{ px}$ with **0 disagreements**.
   - 3 real-pointer resize rigs (zoomed, rotated, negatively flipped) matched `solveResize` predictions within $\le 0.5\text{ px}$.
   - Non-standard CSS `zoom` and 3D `perspective` transforms confirmed as legitimate out-of-scope divergences in Chromium.
7. **Coverage & Mutation Score**:
   - Node test coverage across `lib/editor/geometry/**`: **100.00% lines**, **96.60% branches**, **100.00% functions** (100/100 unit/property tests passing).
   - **8/8 seeded mutants killed** (`100%` mutation score) by named tests in `test/geometry/mutations.test.ts`.
8. **Baseline Regression Suites**:
   - Existing unit suites (`test/direct-manipulation.test.ts`, `test/direct-manipulation-math.test.ts`, `test/outline-drag.test.ts`, `test/selection-style.test.ts`, `test/selection-coordinates.test.ts`, `test/drag-move.test.ts`) and `npm test` pass after changes with zero modifications outside allowed paths.

### Not Proven / Out of Scope for this Sprint
1. **UI & Engine Wiring**:
   - `components/slightnudge/direct-manipulation-engine.ts`, `components/slightnudge/selection-style.ts`, `EditorWorkspace.tsx`, `lib/slightnudge/**`, and `app/api/**` remain untouched; connecting UI overlays and live drag handlers to `lib/editor/geometry` is the next sprint.
2. **Non-2D Affine CSS Features**:
   - CSS 3D `perspective` / `rotateX` / `rotateY` keystone projections and non-standard CSS `zoom` property are intentionally outside the 2D affine model and documented in `docs/editor/geometry.md`.
3. **AST / Source Mutation Execution for Classified Intents**:
   - `classifyLayoutIntent` outputs structured intent descriptors only; applying AST/Tailwind source edits for reorder/grid-cell/inset/size intents remains in `lib/slightnudge/**`.

---

## 2. Empirical Numbers Summary

| Metric | Target / Budget | Observed Result |
| :--- | :---: | :---: |
| `lib/editor/geometry` Line Coverage | $\ge 95\%$ | **100.00%** |
| `lib/editor/geometry` Branch Coverage | $\ge 95\%$ | **96.60%** |
| `lib/editor/geometry` Function Coverage | — | **100.00%** |
| Snap Benchmark — 50 siblings (`snapRectInto`) | $\le 1.0\text{ ms/frame}$ | **0.00203 ms/frame** (~4.65 bytes/call) |
| Snap Benchmark — 500 siblings (`snapRectInto`) | $\le 3.0\text{ ms/frame}$ | **0.01004 ms/frame** (~0.43 bytes/call) |
| Browser Differential Oracle (`ORACLE_SEED=2026111099`) | $\ge 1000$ cases $\le 0.5\text{ px}$ | **1,050/1,050 within 0.5 px** (0 disagreements) |
| Browser Pointer Resize Harness | $\le 0.5\text{ px}$ error | **3/3 rigs within 0.5 px** |
| Seeded Mutation Suite | $\ge 8$ mutants killed | **8/8 killed** (100%) |
| Layout Intent Classifier Cases | $\ge 60$ table cases | **65 table cases + 3 invariant tests (68/68 pass)** |

### Mutant Kill Matrix (`test/geometry/mutations.test.ts`)
- `M1-sign-flip-resize` -> killed by `test/geometry/resize.test.ts` (`supports all 8 handles with unconstrained identity-transform deltas`)
- `M2-ignore-scroll-offset` -> killed by `test/geometry/matrix-spaces.test.ts` (`accounts accurately for nested ancestor transforms and scroll offsets`)
- `M3-wrong-matrix-order` -> killed by `test/geometry/matrix-spaces.test.ts` (`respects matrix order (matMultiply(A, B) applies B then A)`)
- `M4-threshold-canvas-instead-of-screen` -> killed by `test/geometry/snapping-align.test.ts` (`snaps edges and centers using screen-pixel threshold scaled by zoom`)
- `M5-drop-aspect-lock` -> killed by `test/geometry/resize.test.ts` (`preserves aspect ratio on corner and edge drags including min/max clamping`)
- `M6-off-by-one-spatial-index` -> killed by `test/geometry/snapping-align.test.ts` (`snaps edges and centers using screen-pixel threshold scaled by zoom`)
- `M7-ignore-rtl-classifier` -> killed by `test/geometry/intent.test.ts` (`13. RTL flex row: item 0 sits right (x=500), dragging LEFT past all -> targetIndex 2`)
- `M8-treat-sticky-as-flow` -> killed by `test/geometry/intent.test.ts` (`35. position sticky in overflow scroll container MUST NOT be treated as plain reorder-in-flow`)

---

## 3. Commit Hashes on `design/editor-geometry`

Base tip: `17a99f8c1c5563de0c7058c5c2176f736591fc5c` (`design/editor-selection` — Selection Chrome v2).

- `111b54a`: `chore(deps): add fast-check 4.10.2 devDependency and THIRD_PARTY attribution`
  - Pinned `"fast-check": "4.10.2"` (MIT) in `package.json` / `package-lock.json` and recorded attribution in `docs/THIRD_PARTY.md`.
- `6624f9f`: `feat(geometry): add 2D affine matrices, coordinate spaces, and property tests`
  - Implemented `lib/editor/geometry/types.ts`, `matrix.ts`, `spaces.ts`, `index.ts`, and `test/geometry/matrix-spaces.test.ts`.
- `5b79406`: `feat(geometry): add local-axis resize solver, O(log N) snapping, and align helpers`
  - Implemented `lib/editor/geometry/resize.ts`, `snapping.ts`, `align.ts`, `test/geometry/resize.test.ts`, and `test/geometry/snapping-align.test.ts`.
- `e5f04e9`: `feat(geometry): add layout intent classifier, Playwright oracle, and mutation harness`
  - Implemented `lib/editor/geometry/intent.ts`, `test/geometry/intent.test.ts`, `test/geometry/browser-oracle.test.ts`, and `test/geometry/mutations.test.ts`.
- `a42f6b2`: `docs(editor): document geometry core architecture, limits, and integration guide`
  - Created `docs/editor/geometry.md`.
- `[Current Commit]`: `docs(editor): update STATE with geometry core sprint proof`
  - Updated `docs/editor/STATE.md` with observed proof numbers, commit hashes, diff audit, and cleanup verification.

---

## 4. Off-Limits Path Verification Check

Verification command:
```bash
git diff --name-only 17a99f8c1c5563de0c7058c5c2176f736591fc5c..HEAD
```

Modified/added paths permitted for this sprint:
```text
docs/THIRD_PARTY.md
docs/editor/STATE.md
docs/editor/geometry.md
lib/editor/geometry/align.ts
lib/editor/geometry/index.ts
lib/editor/geometry/intent.ts
lib/editor/geometry/matrix.ts
lib/editor/geometry/resize.ts
lib/editor/geometry/snapping.ts
lib/editor/geometry/spaces.ts
lib/editor/geometry/types.ts
package-lock.json
package.json
test/geometry/browser-oracle.test.ts
test/geometry/intent.test.ts
test/geometry/matrix-spaces.test.ts
test/geometry/mutations.test.ts
test/geometry/resize.test.ts
test/geometry/snapping-align.test.ts
```

Audit against off-limits list:
- `lib/slightnudge/**`: **UNTOUCHED**
- `app/api/**`: **UNTOUCHED**
- `components/**`: **UNTOUCHED**
- `next-env.d.ts` / scratch artifacts: **UNTOUCHED / UNCOMMITTED**

**Result**: **ZERO** off-limits paths modified.

---

## 5. Temporary Environments and Cleanup Confirmation

- **Temp Workspaces Created**:
  - `test/geometry/mutations.test.ts` created ephemeral `sn-geom-mut-*` directories under OS temp (`os.tmpdir()`) with a temporary `node_modules` junction; both the junction (`fs.unlinkSync`) and directory tree (`fs.rmSync(..., { recursive: true, force: true })`) are removed inside its `finally` block. Verified zero remaining `sn-geom-*` directories in `$env:TEMP`.
- **Servers / Browser Instances Created**:
  - **0 HTTP/dev servers** created; `test/geometry/browser-oracle.test.ts` runs against `page.setContent(...)` inside ephemeral headless Chromium instances closed in `finally` blocks.
  - Existing dev server on port 3000 in the main workspace was never contacted or stopped.

---

## 6. Recommended Next Step

Integrate `lib/editor/geometry` into `components/slightnudge/direct-manipulation-engine.ts`, `components/slightnudge/selection-style.ts`, and `components/slightnudge/EditorWorkspace.tsx` per `docs/editor/geometry.md` Section 7 — replacing inline zoom/axis arithmetic in `compute8HandleResize` and $O(N)$ scanning in `computeSmartSnapping` with `buildElementToScreenMatrix`, `solveResize`, `snapRectInto`, `predictElementScreenRect`, and `classifyLayoutIntent`.
