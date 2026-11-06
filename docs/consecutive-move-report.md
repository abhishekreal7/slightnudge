# Consecutive move responsiveness

## Current checks

| Check | Result | Scope |
| --- | --- | --- |
| Full consecutive drags | PASS | Real API with delayed first response; active drag survives prior validation; draft Undo/Redo; Save and exact source Undo |
| Fit at 75% | PASS | Same real-API workflow and CSS-coordinate expectations; zero browser runtime errors asserted |
| Existing movement v4 | PASS | Four cases; original assertions and limits unchanged |
| Controlled refusal | PASS | Real first response; explicitly mocked second-response failure |
| Escape during pending move | PASS | Real request; current gesture cancels, previous move is preserved |

## Problem and change

After pointer release, `busy` disabled Move while source-preview preparation and browser verification completed. The last live position/badge remained visible, making the element feel locked. This is draft validation, not an automatic source Save.

The shared workspace now serializes completed drags for the same source node while allowing another direct drag immediately. Positions are absolute, derived from the latest requested position rather than stale source classes. Each accepted release is captured as a separate draft frame before the next request reads its parent. Other edits and source writes remain guarded during pending validation. A refusal drops unverified queued work and restores the last verified position/draft. Escape cancels the current gesture without cancelling an earlier accepted/pending gesture.

Transient visual gestures are ended before source verification; new pointer input is retained and repainted afterward. Event listeners do not reset a drag when a previous draft updates React state. Explicit scope/selection changes still cancel gestures. Source previews run one at a time; no AST, source mapping, source-writing, conflict-validation or Apply/Undo engine changes.

The move frame posts visual work to the iframe ahead of inspector state updates. Unchanged width/height reports no longer trigger workspace rerenders. During active dragging, the formatting toolbar is hidden through visibility with its exact inline value restored on release/cancel; it is not removed from the DOM just because the handle was pressed. The Move button's existing design and size are retained.

## Evidence

All browser workflows run sequentially in fresh disposable copies, with real source untouched. Existing test files, expected values and limits were not edited.

- `consecutive-move-before.log`: new test fails because Move is disabled while a real first response is deliberately held.
- `consecutive-move-after.log`: final Full workflow. Second drag changes the actual page while the first response is held. First verification can finish while the pointer remains down. Source requests are serialized and the second uses the first verified draft ID. Draft Undo/Redo checks the two separate positions, then Save writes the final position and source Undo restores byte-identical original bytes.
- `consecutive-move-fit.log`: final corresponding Fit workflow at 75% zoom, including draft Undo/Redo and zero runtime-error assertion.
- `consecutive-move-refusal.log`: final PASS. First response is real; second response is explicitly MOCKED as a 409 refusal. The first verified position and draft remain; controls recover; source stays unchanged; zero browser runtime errors asserted. Earlier logs retain the initial generic footer; the final driver labels the mocked refusal explicitly.
- `consecutive-move-cancel.log`: final PASS. Real first request; Escape during second drag preserves only the first move, restores its position and unlocks controls; zero browser runtime errors asserted.
- `consecutive-move-regression.log`: existing v4 four-case movement workflow via a new driver, with its assertions and limits unchanged. Covers Escape, blur, pointercancel, lost capture, scroll, scope changes, 75% geometry, Shift lock, one proposal per gesture, Discard, Save, exact Undo, separately rendered source and paragraph controls.

An early regression attempt timed out before readiness (`consecutive-move-regression-cold.log`). The new driver now prepares the workflow's existing zero-offset disposable fixture before compiler startup; the original helper still performs the same normalization. Later regression attempts exposed a canvas geometry shift after opening/closing Move when the formatting toolbar was removed on handle press. Reverting that visibility/unmount optimization restored the four-case PASS. Failing runs and diagnostics are retained, not counted as passes. The final visibility-only approach passed the same four-case regression, with no helper assertions or limits changed.

## Timing limits

The test records pointer-event to matching preview-geometry acknowledgment, not actual screen paint or a formal frame-time budget. Samples are small and from development mode. Earlier runs had first-sample spikes around 118–300ms, retained in the earlier logs. With the final visibility-only approach and per-pointer workspace state bailout, the Full run measured 3.9–11.4ms over eight samples, and Fit measured 1.6–11.7ms over eight samples, including each first sample. This is a focused improvement, not a zero-lag, formal paint-frame p95 <=16.7ms, or 500-element performance claim. Automation elapsed time printed for the whole second drag also includes Playwright overhead and is not pointer latency.

## Type check and repository scope

`consecutive-move-typecheck.log` retains a failed full type check: 66 existing diagnostics in archived evidence/test sources. Comparing normalized diagnostics with `draft-conflict-typecheck.log` found zero new diagnostics; the previous Move focus typing diagnostic is removed. No diagnostic names the current workspace or new move test files. This is not a clean project typecheck or a launch-readiness result. `git diff --check` passes.

The overall working-tree diff also contains prior uncommitted conflict-recovery, resize and CSS work. This task only edits EditorWorkspace product behavior and adds new test/evidence files. No existing test helper/assertion/limit was edited. Local test services and browsers are closed after each run; the existing localhost dev service remains running.

## What I did NOT verify

- The user's exact open tab or draft: local browser access is disabled.
- A complete selection/shared-instance/reliability gate, production build, or imported-project adapter matrix.
- More than two completed drags in a backlog, unverified queue recovery after closing/refreshing the tab, or a formal paint/overlay-lag budget.
- Uninterrupted visual continuity during the brief source-verification phase; the current tests verify actual positions before and after, not every painted frame.

Actual source Save/Undo still guard source operations. This change specifically removes the post-drag validation lock for moving the same element again. Other element selections are deferred until pending moves settle.

Only EditorWorkspace product code was changed in this task. app/globals.css, the workspace CSS module, next-env.d.ts and earlier workspace changes were already dirty and preserved. No merge, push, .env or secret changes.
