# Resize pointer anchoring

Implemented locally on `codex/fix-resize-pointer-anchor`. No merge or push. Existing unrelated changes were preserved; the working tree is not a clean baseline.

## Reproduced causes

1. `widthFromPointer` multiplied every pointer delta by two, assuming a centered element. A left-anchored element growing from 672 to 768 CSS px instead requested 864 px. The new math test fails before the fix in `resize-pointer-before.log` and passes afterward in `resize-pointer-after-unit.log`.
2. The resize listener effect depended on a callback that changed during a source-layer catalog refresh. Effect cleanup released capture and canceled the drag even when the source target was unchanged. A controlled iframe viewport/catalog refresh reproduces this in `resize-pointer-refresh-before.log`; the same check passes in `resize-pointer-refresh-after.log` and the final Fit run.
3. A content-box element's padding and borders were counted as editable width. The new DOM test records 452 instead of 400 in `resize-layout-content-box-before.log`. The corrected measurement uses computed CSS width, matching the max-width box-sizing basis.

## Product changes

- `lib/slightnudge/direct-manipulation.ts`: optional start/center/end anchor; centered callers retain the old contract. A fixed edge refuses with a one-line reason rather than authoring an unrelated position change.
- `lib/slightnudge/resize-layout.ts`: new read-only measurement of the native iframe element, layout anchor, CSS width and iframe root rem. Handles supported normal flow, auto margins, flex/grid alignment and one-sided positioned layouts. Refuses ambiguous, shared-width flex, floated, vertical and transformed layouts. Does not probe by changing DOM or layout.
- `components/slightnudge/SourceProjectCanvas.tsx`: exposes native local-preview measurement after checking that exactly one source target matches. Requires a ready, synchronized local preview. No adapter or bridge protocol change.
- `components/slightnudge/EditorWorkspace.tsx`: reads the actual anchor on pointerdown; converts zoom once; keeps resize listeners stable through read-only refreshes; cancels when the target, source classes, scope, anchor or root unit changes. Uses the current preview callback through a ref. A temporary transparent capture layer retains the original resize cursor over the iframe until release/cancel.
- `components/slightnudge/editor-workspace.module.css`: fixed transparent capture layer, active only during resize. Original dot appearance and Move button design are retained.

Source mapping, AST patching, compiler and Apply/Undo implementation were not changed by this fix. Writes still use the existing preview and Save paths. The full tracked diff also includes earlier conflict recovery, consecutive movement, CSS priority and generated-file changes; its statistics are not solely this fix.

## Verification

| Check | Result | Raw evidence |
| --- | --- | --- |
| New anchor math, scale, fixed-edge refusal, legacy default | PASS | `resize-pointer-after-unit.log` |
| Existing direct-manipulation test, unchanged | PASS | `resize-pointer-existing-unit.log` |
| Native CSS measurement: 13 supported layouts, 6 refusals, 20px root rem, no DOM writes | PASS | `resize-layout-browser.log` |
| Fit: start/center/end at 75%, 100%, 150%, including read-only catalog refresh during dragging | PASS, 9 cases; horizontal offset 0px at tested preset stops | `resize-pointer-browser.log` |
| Full: start/center/end, cursor capture, Escape, real Save and exact Undo | PASS, 3 cases | `resize-pointer-full.log` |
| Full with controlled read-only catalog refresh | PASS | `resize-pointer-refresh-after.log` |
| Genuine target class change during drag | PASS: cancel, remove capture, no proposal or source mutation | `resize-pointer-target-change.log` |
| Existing resize helper exercised through a new disposable-workspace driver, original helper unchanged | PASS: Escape, actual rendered section resize, one proposal, Save and byte-identical Undo | `resize-pointer-regression.log` |
| TypeScript | NOT GREEN: 66 diagnostics, identical to prior normalized diagnostic list | `resize-pointer-typecheck.log`, compared with `consecutive-move-typecheck.log` |
| Whitespace check | PASS | `git diff --check` |

Real application browser tests use disposable source copies and real preview/Apply/Undo APIs. No existing test or expected result was edited. The new copies add the measurement module to their isolated-workspace file lists.

Evidence retained from unsuccessful attempts: `resize-pointer-harness-before.log` records a test serialization `__name` error fixed in the new harness. `resize-pointer-full-before.log` records an initial rendered-width timeout; its precise cause was not established. The later controlled refresh reproduction independently proves the listener-cancellation bug. Do not count these early attempts as passing runs.

## Limits

The engine still changes supported `max-w-*` presets, not arbitrary width or height. Parent width caps can prevent visible growth. Between presets the edge snaps; a corner's vertical location can change as content reflows. A width-only edit cannot move the layout's fixed edge. This change does not implement rotation or free two-axis resizing. Imported-project native width dragging remains unsupported.

## What I did NOT verify

- The user's existing browser tab, physical OS cursor hotspot, alternate devices, DPR settings or browsers. Automation verifies DOM cursor/capture and horizontal handle geometry, not OS pointer rendering.
- Every real-world CSS layout, transformed/animated source target or imported-project resize.
- Continuous zero offset between discrete presets, vertical corner tracking, arbitrary resize or rotation.
- Full selection matrix, shared-instance workflows, complete gate, production build or whole-product performance budgets.
- A clean repository-wide typecheck: the existing 66 errors remain.
- Cleanup of the previously reported disposable temp folder `sn-review-consent-3LFwz1`; its browser/server exited, but that earlier run reported a cleanup warning.

The existing localhost service was left running. No claim is made that the entire editor is flawless or launch-ready.
