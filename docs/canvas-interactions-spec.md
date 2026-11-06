# SlightNudge canvas interaction study and specification

2026-11-02 · `docs/canvas-interactions` · base commit `22e17ec`. Documentation only; proposed behavior is not an implementation or qualification claim.

## Scope and evidence

The six supplied screenshots inform behaviors only. No external browsing, scraping, copied assets, icons, brand colors or implementation. Still images cannot establish smoothness, snapping, persistence or keyboard behavior.

Before this task, the working tree already contained changes to `components/slightnudge/EditorWorkspace.tsx`, `components/slightnudge/editor-workspace.module.css`, and `next-env.d.ts`. They remain untouched by this task. The current working-tree badges and cursors are included in the audit, although they are not committed baseline features. Only this document is authored here. No tests run or edited.

## 1. Observe the references

| Image | Visible affordances and communication | Expected behaviors | UNKNOWN from a still |
|---|---|---|---|
| 1, ending `5ea47.png` | Thin colored boundary around large text; contrasting rounded `1200 × 141` badge; dashed lower horizontal line; adjacent page fragment. Target boundary and dimensions are emphasized. | Hover, select, measure, resize with live size feedback; possible alignment indication. | Whether dashed line is baseline, boundary or snap guide; units, intrinsic vs transformed size, active gesture, handles, zoom correction. |
| 2, ending `d3a5.png` | Slanted display text and `7°` angle badge; ordinary page content above/below; adjacent page fragment. | Rotate a supported target, inspect angle, optionally snap/cancel. | Pivot, handle, modifier keys, snap interval, whether badge is hover/drag-only or content animated. |
| 3, ending `d3be.png` | Visually duplicates image 2, including slanted text and angle badge. | Same possible angle feedback. | No independent evidence of a second gesture or animation smoothness. |
| 4, ending `65c.png` | Tilted rectangular outline, horizontal workspace guide, tinted vertical bands and content area, multiple page regions, explanatory cards at left. Inspector shows dropdowns, slider/numeric input, direction choices, font/color, uppercase choice, spacing, code action and collapsed sections. Floating tool/zoom dock; project, preview and publishing chrome. | Select component, inspect typed properties, manipulate geometry, compare alignment, pan/zoom, expand inspector groups. | Whether tints are padding, columns or selection; guide origin; unlabeled icon functions; whether pages are breakpoints; instance vs definition effect; latency. Explanatory cards are reference content, not instructions. |
| 5, ending `f0fc.png` | Tilted outline, `1200 × 445` badge, long slanted guide, neighboring page regions, cropped dock with zoom. | Resize/measure transformed selection, align, pan/zoom while maintaining context. | Guide meaning, intrinsic box, pivot, clipping rules, active gesture, snapping or source mutation. |
| 6, ending `bdd5.png` | Selected variant in Layers tree with indented children and other variant rows; breadcrumb; two state presentations and labels/action symbol; vertical guides and horizontal bounds. Inspector groups: position, fixed/fit sizing, min/max, layout direction/distribution/alignment/wrap, links and interactions. Floating tool/zoom dock. | Navigate nesting/component/state, inspect constraints, edit supported properties, compare states. | Separate DOM trees vs previews; symbol behavior; hidden constraints; animations; source representation; keyboard shortcuts; change propagation. Parallel artboards are not a SlightNudge requirement. |

Equal-gap snapping and editable padding handles are requested features, not established by these images. Rotation, multi-artboards and arbitrary layout editing are not authorized engine additions.

## 2. Map to the current engine

Paths below are relative to `C:/dev/vibecheck`. Status concerns code capability, not fresh end-to-end certification.

| Affordance | Status | Existing capability and evidence | Boundary |
|---|---|---|---|
| Selection outline/identity | Exists; hover/label partial | `SourceProjectCanvas.tsx` receives source selection/rect and renders DOM overlay above iframe; `EditorWorkspace.tsx` renders selected controls. | Bridge hover currently serves destination picking, not ordinary hover. Do not repurpose destination mode. |
| Size badge | Partial | Working-tree `renderSourceSelection` uses rounded `selection.rect`; resize readout distinguishes max-width. | Transformed size semantics/performance unverified. Canvas overlay wrapper has `overflow: clip`, which can clip badges. |
| Resize | Partial | `direct-manipulation.ts`: widthSteps, snapWidth, widthFromPointer, stepWidth; workspace pointer/keyboard handling and release preview. | Handles are local-only (`!repositoryId`); centered assumption doubles horizontal delta. No height or arbitrary two-axis resize. |
| Offset Move | Exists, bounded | `translation.ts`: safe owned integer pixel translations, ±2048 range; snappedMove uses 4px delta grid and Shift dominant-axis lock. Workspace rAF updates; bridge gesture projection. | Default/All sizes, valid source ownership and compatible transforms only. Flow space stays unchanged. |
| Smart guides/equal gaps | Missing | Legal translated positions can use existing Move path. | Neighbor geometry snapshot and guide solver would be new UI work; off-lattice alignments cannot be promised. |
| Alt distances | Missing | Existing rect/computed-style messages provide foundations. | Parent/sibling measurement needs bounded authenticated read-only geometry work; Layers names are insufficient. |
| Padding/gap handles | Partial | Workspace styleOptions, adjustPadding/adjustGap/updateStyle; AST style allowlists and compiler checks. | Preset inspector exists; canvas grips and live spacing gesture projection do not. Uniform p-* and gap-* only in this spec. |
| Sibling reorder | Exists, separate operation | Workspace reorderSibling sends preview reorder with source sibling index; reparent is distinct. | Never substitute translation for structural reordering; unsafe/dynamic siblings remain refused. |
| Smooth feedback | Partial | Workspace/bridge rAF batching, ResizeObserver and CSS reduced-motion rules. | Bridge gesture writes style then immediately calls geometry/describe: potential forced layout, budgets unmeasured. |
| FLIP/drag | Legacy-only implementation | `SlightNudgeOverlay.tsx` records First rects, changes DOM order, writes Invert transforms, then Plays transitions (minimum 220ms, distance-derived duration). Legacy drag also transforms siblings. | Interleaved reads/writes and author-transform interference; not modern canvas proof. Do not transplant wholesale. |
| Rotation/angle feedback | Missing for direct manipulation | readTranslation rejects rotate/scale/skew and non-owned transforms. | No rotation grip or fabricated angle readout. |

Read sources: `components/slightnudge/EditorWorkspace.tsx` (styleOptions, startDragMove/startResize, gesture effects, renderSourceSelection, reorderSibling); `components/slightnudge/SourceProjectCanvas.tsx` (bridge handlers and overlay); `lib/slightnudge/source-canvas-bridge.ts` (gesture, geometry, destination hover, observers); `lib/slightnudge/direct-manipulation.ts`; `lib/slightnudge/translation.ts`; `components/slightnudge/SlightNudgeOverlay.tsx` (FLIP/drag); `lib/slightnudge/ast-nudger.ts` (style allowlists); `docs/feature-inventory.md`.

The inventory is dated 2026-11-01. Its informational-only shared-definition description predates the explicit definition action now in workspace. Current action still requires source inspection. Historical WORKING labels are not current gate certification. Latest recorded history qualification failed a Move bounding-box assertion: `docs/reliability-gate/2026-11-02T17-15-01-891Z-22e17ec-history/raw.log`.

Existing relevant test sources include `test/direct-manipulation.test.ts`, `test/drag-move.test.ts`, `test/helpers/direct-manipulation-browser.ts`, `test/helpers/drag-move-browser.v3.ts`, `test/style-isolation.test.ts`, `test/source-rendered-bridge.test.ts`, and selection gate copies. Their presence is not a fresh PASS.

## Shared interaction contract

- DOM/CSS overlays live above the iframe and never occupy site layout. Only existing authorized projection may change site layout for an actual edit.
- Measurements are page CSS px at 100%, independent of zoom/DPR. One conversion: host point = iframe host origin + page viewport point × canvas scale. Reverse once for deltas; account for outer pan/iframe scroll without double-counting. Nonuniform scale/rotation invalidates this simple conversion.
- Untransformed size means border-box W/H. Transformed targets initially show axis-aligned visual **Bounds**, not intrinsic width/height. Do not invent oriented geometry.
- Own restrained visual system: existing product accent, neutral labels, 1-screen-pixel lines, 12px tabular numerals, round dots with larger invisible hit regions. Preserve Move appearance/position. Cursor communicates actual supported axis.
- Only handles/edge strips capture input. Badges, labels and guides use pointer-events:none. Geometry clips at page boundary; badge layer is host viewport-relative and collision-aware: below, above, then free side. Clamp labels, not geometry. Avoid dock/inspector overlap.
- Gesture start snapshots exact project/file/source identity, caller ownership, scope and baseline. Pointer motion is transient. Release creates at most one existing preview/draft step; Save/Apply remains the only source-write path. No-op/cancel creates zero history. One completed gesture = one draft Undo step. Existing grouped source Save/Undo semantics remain.
- Escape, pointercancel, lost capture, blur, target replacement and scope/selection changes cancel and restore transient projection. Uncertain Apply/Undo disables gestures. Revalidate safety at release.
- Unsupported targets show disabled affordance plus one-line reason. Use a focusable explanatory wrapper so the reason remains keyboard-accessible; do not create broad blocking overlays.
- Reduced motion removes interpolation/settling. Pointer tracking remains immediate. Keys do not override text inputs, contenteditable or dialog ownership.

## F1 — Hover/selection outline and label

**Purpose/trigger:** reveal target identity. In Edit mode, resolve the actual pointed-at source using existing selection rules; coalesce hover once per frame. Click or existing Layers activation selects. Hide hover over chrome, during text entry/gestures, and in Browse.

**Visuals:** low-emphasis hover outline, stronger selected outline, small tag/accessibly named component label above-left. Selected wins over overlapping hover; one label per target, truncated visually with full accessible description.

**Snap/code:** none; no source or utility changes. Do not alter source mapping to obtain a convenient outline.

**Refusals:** stale/missing source identity: “No editable source for this element.” Measurable transformed targets may be selected, with unsupported manipulation disabled.

**Keyboard:** existing Layers navigation/activation; Escape follows current selection/focus ownership.

**Before/after cases:**
1. Unselected paragraph → hover then click → hover becomes selected outline with paragraph identity; source unchanged.
2. Same target at 50% zoom with page scroll → select → outline matches visible bounds; label stays screen-sized.
3. Generated target without stable identity → attempt selection → explanation, no edit handles, no substitution of a nearby source.

## F2 — Live size badge

**Purpose/trigger:** expose geometry. Show on selection except inline typing; update on geometry and resize. Movement may temporarily replace it with position feedback.

**Visuals:** compact W × H below target, px in accessible name. During max-width drag add smaller “Max …px” constraint. Upright, screen-sized, collision placement per shared contract. Actual width may be smaller than max-width.

**Snap/code:** none; read post-projection geometry rather than pointer-requested size. No animation through fictitious sizes.

**Refusals:** detached/stale/zero geometry: “Size unavailable.” Rotated geometry explicitly reports Bounds; unsupported resizing disabled.

**Keyboard:** accessible selection description; announce final value, not every move. Escape restores initial readout.

**Before/after cases:**
1. 384 × 72 target at 50% zoom → select → badge says 384 × 72, not 192 × 36.
2. Width 300px under container constraint, max-width 384→448 → resize → actual stays 300 if constrained; Max says 448.
3. Target disappears mid-gesture → cancel → stale badge removed, zero draft steps.

## F3 — Supported width/max-width handles

**Purpose/trigger:** directly edit qualified width constraints. Selected safe local target; either vertical edge/dot activates horizontal resize. Capture pointer; use existing widthFromPointer/snapWidth; release one maxWidth proposal. Use centered anchoring only where verified; otherwise disable drag and offer inspector presets.

**Visuals:** original round dots, narrow invisible edge strips, horizontal cursor. Corners may invoke the same width operation, explicitly labeled Maximum width. No top/bottom handles. Current diagonal cursors imply unsupported two-axis behavior and are presentation debt, not justification for a new height engine.

**Snap/code:** 24,28,32,36,42,48,56,64,72rem → max-w-sm through max-w-6xl. Resolve target rem, retain existing half-rem hysteresis. Existing width inspector w-auto/full/fractions stays discrete; no arbitrary width pixels. Release uses style/maxWidth through existing preview/apply.

**Refusals:** imported/custom theme lacking qualified drag capability; invalid anchor/measurement; transform, source ownership or recovery block. “Use the width presets for this project.”

**Keyboard:** existing Left/Right stepWidth, Home/End extrema, Escape cancellation.

**Before/after cases:**
1. Centered max-w-sm at 16px rem → next supported drag → max-w-md proposal; one draft Undo restores sm.
2. Same logical drag at 50% and 150% → identical preset; Escape restores original and creates no proposal.
3. Imported custom width scale → attempt drag → disabled reason; no guessed default-theme token.

## F4 — Smart Move guides and legal snapping

**Purpose/trigger:** assist existing visual offset Move, preserving document flow/order. Default/All sizes, safe ownership. Snapshot visible same-parent siblings and parent content box at start; invalidate on scroll/resize/mutation. Only axis-aligned geometry.

**Visuals:** product-accent hairlines for candidate sibling edges/centers and parent center; neutral equal-gap label. At most one winner per axis. Equal gaps require collinear, nonoverlapping neighbors and known axis; visual empty space is not assumed to be CSS gap.

**Snap rules:** preserve existing 4px **delta** lattice, bounds and Shift dominant-axis lock. Acquire magnet within 6 screen px, release beyond 10 (convert to logical px). Priority: shortest distance, edge before center, then source order. Candidate must survive snappedMove and align within 0.5 CSS px; otherwise show a distance only, never false “Snapped.” Equal-gap candidates follow identical legality rules.

**Held-key decision:** Ctrl disables magnetic guide attraction only; mandatory 4px quantization remains. Alt belongs to F5. A complete snapping bypass does not exist in snappedMove and conflicts with the fixed requirement that gestures snap to supported values. Do not implement unsnapped writes in this layer. Releasing Ctrl reacquires only inside threshold.

**Code:** existing move preview writes translate-x-[Npx]/translate-y-[Npx], integer values within ±2048 and canvas bounds. No absolute positioning, left/top/margin, sibling reorder or new utility families.

**Refusals:** incompatible/animated transforms, invalid bounds, unsupported scopes or caller ownership. “Move is available in Default / All sizes.”

**Keyboard:** existing Move arrows use 4px steps and can show matching guides. Preserve existing keyboard grouping; verify rather than assume repeated keydown is one gesture.

**Before/after cases:**
1. Reachable sibling edge → drag near → truthful guide, legal offset, unchanged source order, one draft step.
2. Magnet active → hold Ctrl/drag → attraction stops but grid remains; release Ctrl reacquires within threshold only.
3. rotate utility present → Move attempt → reason, no transform overwrite.
4. Equal gap requires off-lattice position → drag → distance may show, but no snapped claim or illegal value.

## F5 — Alt distance labels

**Purpose/trigger:** inspect spacing without editing. Stable selection + Alt + pointer over same-parent neighbor/parent region; release hides. Suppress in text inputs/dialogs. During Move use current projected geometry; Alt never alters snap mode.

**Visuals:** thin brackets and CSS-px distances between border-box edges; parent inset measured against content box and explicitly labeled. Overlap says “Overlap …px,” not negative CSS gap. Labels cannot capture pointer or select occluded targets.

**Snap/code:** none; no proposals. Requires a bounded authenticated/session-bound read-only bridge geometry extension later. No arbitrary cross-origin DOM access.

**Refusals:** unavailable geometry, nonuniform/rotated target, disconnected neighbor: “Distance unavailable for this target.”

**Keyboard:** focusable Measure spacing selection-menu toggle, neighbor selection through menu navigation, Escape exits; Alt is not the sole accessible route.

**Before/after cases:**
1. Siblings separated 24 CSS px at 50% zoom → hold Alt → 24 shown; release hides, history unchanged.
2. Overlap 8px → measure → Overlap 8px, no inferred gap utility.
3. Unadapted cross-origin frame → measure request → unavailable reason, no prohibited access or source operation.

## F6 — Padding and gap handles

**Purpose/trigger:** expose existing presets spatially. Explicitly enter Spacing on selected safe container. Start with uniform padding and single-row/column flex gap; ambiguous wrapping/grid placement disabled.

**Visuals:** subtle padding bands, one All padding grip; bracket between eligible children labeled All gaps. Overlays do not insert site nodes or occupy layout. No four independent side grips implying pt/pr/pb/pl support. Label resolved CSS px plus proposed utility.

**Snap/code:** current UI intersection p-0/1/2/3/4/6/8/12 and gap-0/1/2/3/4/6/8/12. Resolve target theme values; nearest preset with midpoint hysteresis. AST accepts some additional values, but this layer does not expand exposed presets. Use existing style property padding/gap, existing scopes and preview/Save.

**Live limitation:** bridge gesture currently supports translation/maxWidth, not padding/gap. Initial safe version moves overlay intent only, labeled Proposed; release sends one existing preview that reflows the site. Never preview per pointermove and pollute Undo. Continuous spacing reflow requires separately authorized bridge work, not assumed here.

**Refusals:** asymmetric/dynamic padding that p-* could overwrite, unverified custom values, wrapping/ambiguous gaps, space-between distribution, unsafe source. “Use the inspector for mixed padding.”

**Keyboard:** focused grip arrows choose adjacent preset, Home/End extremes, Enter confirms one session, Escape cancels; blur cancels unconfirmed intent.

**Before/after cases:**
1. Uniform p-2 → drag proposed p-4/release → one preview p-4; one Undo restores p-2.
2. Single-row flex gap-2 → keyboard gap-4/Enter → all gaps change via one preview, content preserved.
3. pt-2 pb-8 → spacing grip request → mixed-padding reason, no destructive p-4 substitution.
4. Wrapping justify-between → gap manipulation request → ambiguous drag disabled, measured empty space not treated as gap.

## F7 — Smooth feedback

**Purpose/trigger:** immediate truthful feedback for supported interactions. One canvas scheduler; pointer events record latest intent only and request a frame. No layout reads in pointermove.

**Visuals:** overlay transforms/opacity only during animation. Render boundary as four translated/scaled line segments so text/strokes do not stretch. Translate labels without scaling typography. Track pointer immediately, no eased following. Optional ≤100ms appearance fade; reduced motion zero. Never modify author transforms merely to decorate movement.

**Pipeline:** batch iframe geometry reads before writes. Project Move from cached baseline; collect authoritative geometry in a later scheduled read. Width edits necessarily reflow the site, but avoid immediate write/read alternation. Existing gesture geometry-after-write is a risk to resolve behind a later flag; not claimed solved. Legacy FLIP is not a safe modern drop-in.

**Snap/code:** inherit F3/F4/F6, no additional mutations/history. Structural reorder still goes through existing reorder preview. Any optional FLIP effect must be overlay-only and preserve source/author transforms.

**Refusals/degradation:** stale session/sequence messages discarded; geometry invalidation cancels rather than guesses. Reduce guide density if needed, never relax correctness or performance thresholds.

**Keyboard:** same results/feedback for supported keyboard actions; immediate Escape restoration; reduced motion applies equally.

**Before/after cases:**
1. 500-element page → sustained Move → budgets below pass, one release proposal, no gesture-time source writes.
2. Reduced motion enabled → drag/cancel → immediate tracking, no fade/FLIP/settling, same legal utilities.
3. External source replacement mid-drag → release → canceled with reason, no stale edit.

## Performance measurement and thresholds — not executed

Required: **p95 frame time ≤16.7ms; overlay lag ≤1 presented frame** during drag on a 500-DOM-element site. No forced layout per pointermove. Do not round failures down or increase limits.

Future Playwright qualification:
1. Document fixed hardware, OS, browser version, DPR and foreground headed Chromium at 60Hz. Exactly 500 site elements (exclude chrome/overlays), with long content, flex siblings, text/images. Preload fonts/images and warm compilers; report setup separately. Hidden/throttled runs are INVALID, not PASS.
2. Full and Fit, zoom 50/100/150%, local/imported supported operations, reduced motion on/off. Three sequential trials per condition, fixed 10s drag path after 1s sampling warm-up; ≥300 valid frame samples per trial. No concurrent suites. Unsupported gestures get refusal checks, not fake perf passes.
3. Install observational requestAnimationFrame samplers with Playwright page/frame.evaluate in host and adapter-enabled iframe. Collect raw timestamp deltas without per-frame console logging. Compute nearest-rank p95 per trial, host/iframe separately; averaging across conditions cannot hide a failure.
4. Proposed scheduler instrumentation records monotonic input sequence, consumed sequence and render-frame sequence. Pair received pointer intent with correct visible overlay geometry on subsequent rAF. Maximum and p95 lag must be ≤1 frame; superseded coalesced inputs are explicitly accounted, not counted as lost. Independently verify geometry ≤1 CSS px error; correlate selected screenshot frames. Screenshots alone cannot establish latency.
5. Use Playwright Chromium CDP tracing for pointermove EventDispatch, FunctionCall, Layout, style recalculation and animation frames. Fail forced synchronous layout nested under pointermove or read-after-write layout attributable to the overlay scheduler. Ordinary layout for supported width reflow is reported separately and still subject to frame budgets. rAF sampling alone cannot prove absence of forced layout.
6. Save raw frame/sequence JSON, trace, environment, element count, console/page errors, per-trial results, proposal counts and cancellation/source assertions as evidence. All trials must meet both budgets, with zero wrong targets/page errors and gate green. Quantify instrumentation overhead with paired instrumented/uninstrumented trials; do not silently subtract it.

## Build order and feature flags

No flags are added in this task. Proposed flags default off; none bypasses source safety. Every stage ends with existing gate green and relevant new tests; existing tests/limits remain unchanged.

0. Establish current green reliability baseline first. Known history/Move failure blocks rollout; partial old results are insufficient.
1. `canvasFeedbackV1`: F1/F2, centralized coordinates and badge collision placement. Exact target/geometry, keyboard and reduced-motion checks; gate green.
2. `canvasWidthHandlesV1`: F3 only qualified local presets. Resolve anchoring and misleading diagonal affordance. Drag/cancel/refresh/Save/exact Undo in both views; gate green.
3. `canvasMeasurementsV1`: authenticated bounded parent/sibling snapshots and read-only F5. Origin/session, scroll, overlap and occlusion checks; gate green.
4. `canvasMoveGuidesV1`: F4 solver over legal existing offsets, Ctrl suppresses magnets. Modifier/bounds/ownership/one-step Undo and performance tests; gate green.
5. `canvasSpacingV1`: F6 proposed overlay + single release preview, uniform presets. Theme/scope/refusal/source checks; gate green.
6. `canvasMotionV1`: F7 scheduling/optional effects, combined flags and all performance conditions. No legacy FLIP transplant; gate green before default enablement.

Flags are independently disableable; disabling mid-gesture cancels transient state. No stage depends on unsafe fallback. New engine capability remains outside this plan.

## Risks and open questions — recommended answers

- **Disable snapping versus mandatory scale:** Ctrl bypasses magnets only. Full grid bypass is unsupported; do not silently relax snappedMove.
- **Non-grid starting offsets:** current grid applies to delta. Preserve baseline semantics; test final guide alignment rather than assuming absolute coordinates are multiples of four.
- **Padding sides:** uniform only; asymmetric targets refused. Independent edge editing needs separately scoped capability work.
- **Live spacing reflow:** Proposed overlay until one release preview. Continuous projection requires explicit later bridge authorization, not a new writer.
- **Rotated reference targets:** read-only Bounds; no angle manipulation until composition/ownership is supported. No fabricated angle or diagonal two-axis promise.
- **Imported resize:** preserve refusal pending target theme and anchoring qualification. Read-only measurements remain useful.
- **Theme values:** default rem arithmetic is insufficient for custom projects; use existing compiler-backed resolved values or disable.
- **Geometry cost:** snapshot relevant siblings/parent rather than all 500 nodes per frame. Font loads, mutation and scroll invalidate; remeasure safely or cancel.
- **Iframe latency/security:** prediction may help but reconcile authenticated authoritative geometry. No cross-origin shortcut; protocol extensions need versioning and disposable-project checks.
- **Hit interception/clipping:** narrow strips, noninteractive labels, tiny-element and viewport-edge tests. Never restore a large blocking overlay.
- **Ownership/races:** existing inspection/preview refusals win over visual readiness; shared caller, animated position and external edit can invalidate start assumptions.
- **Undo language:** one gesture means one draft step. Saving several gestures can form one existing source Save group; not arbitrary per-gesture saved rollback.
- **Dirty files:** carried product modifications remain separate. Do not include them in a docs commit or revert them as part of this task.

## What I did NOT verify

No implementation, browser run, performance trace, suite, Apply/Undo, build, adapter restart or customer-project experiment was performed for this study. I did not verify p95 time, overlay lag, 500-element performance, smoothness, current source-save correctness or a green gate. Earlier interactive results in this conversation are historical only, not proof of this specification.

Reference stills do not establish hit areas, snap thresholds, gesture timing, persistence, rotation semantics or tinted-region meaning; these remain UNKNOWN. No external Framer material was retrieved. No product code, existing tests, environment files or secrets were edited or newly inspected beyond the named code/doc sources; no merge or push. Only this specification was authored. Stop after documentation.
