# Move size reliability check

## Reproduction and minimal fix

The imported history workflow's existing assertion requires a Move button between 25px and 29px wide at 50% canvas zoom. A new read-only browser regression measured the actual unified Fit UI: **13.5 × 13.5 screen px**, centered correctly. Its ancestor trace shows a 0.5 canvas transform and no compensating control scale.

The existing CSS inverse-zoom rule was restricted to `.classicShell [data-free-canvas]`, while the unified editor uses the window shell. Commit `4614bb8` changes that selector to `[data-canvas-stage] .moveControl`. The existing 27px design and center transform origin are retained. No source mapping, AST patcher, source Apply/Undo implementation or selection algorithm changes.

Only that one product hunk was staged and committed; pre-existing uncommitted workspace/cursor/badge/resize changes and `next-env.d.ts` were preserved separately. No merge, tag or push.

## Evidence

- `canvas-move-scale-before.log`: new regression fails its 25–29px width assertion at 50%; reports 13.5px.
- `canvas-move-scale-after.log`: geometry assertions pass at 50%, 100%, 150%, but the run fails its zero-page-error assertion due to an editor hydration mismatch after recompilation. This failure is retained, not classified as a PASS.
- `canvas-move-scale-after-retry.log`: fresh rerun passes all geometry/centering checks at 50%, 100%, 150%, reports 27px and zero page errors.
- `test/canvas-move-scale.browser.test.ts`: new read-only browser test, no source mutation. Existing tests and limits unchanged.

The first post-change hydration mismatch shows EditorClient's loading status versus a Suspense boundary. This check does not establish its root cause or prove it is harmless; a passing fresh rerun does not resolve recompilation reliability.

The isolated real-API history run at `4614bb8` passed Move, multi-file refresh recovery, Save and exact Undo, then failed on an obsolete harness selector for the old Fit button. Commit `9e55ceb` changes only the two Fit actions in the new v4 copy to the unified zoom selector; assertions and limits remain unchanged.

The complete rerun at `9e55ceb` **passed**: warm-up 107.21s, history 101.44s, total 215.49s. It proves stable page sizing, Fit/50% geometry, actual inline typography, constant-size Move and scaled dragging, two-file draft refresh recovery, Save/exact source Undo, history receipt updates, wheel forwarding and separate-window native scrolling, with zero browser errors. Raw output: `reliability-gate/2026-11-02T18-46-25-112Z-9e55ceb-history/raw.log`.

The earlier run's warm-up also returned HTTP 500 with `TypeError: __webpack_modules__[moduleId] is not a function` at the local fixture preview route. Its coordinator warm-up row still said PASS; that is not proof of clean startup. The error is retained in `reliability-gate/2026-11-02T18-42-53-180Z-4614bb8-history/server-61068.log`. Root cause remains unverified and no speculative product fix was made.

## Not verified

No complete current gate or selection matrix rerun yet. No claim of launch readiness or of resolved recompile hydration. No proof here of imported max-width resizing, spacing gestures, smart guides, performance budgets, or the proposed canvas specification. Working-tree visual changes outside the single committed hunk are excluded from the isolated history run.

## Movement cancellation finding

The standalone movement run at `9e55ceb` failed waiting for cancellation restoration. A new v4 diagnostic copy retained the same assertions/limits and captured Escape: the measurement remained visible and the element stayed at (324,452.375) instead of (300,436.375). Pointer release then prepared a draft. Evidence: `reliability-gate/2026-11-03T08-07-47-284Z-ea42e26-movement/raw.log` and its screenshot artifacts.

Move pointerdown prevented default focus, leaving keyboard events in the iframe. Commit `3bd963f` explicitly focuses the Move control with preventScroll before pointer capture. This is one workspace hunk, no source-writing changes. Afterward all six cancellation checks (Escape, blur, pointercancel, lost capture, scroll and scope) restored original geometry with no source proposals; see `reliability-gate/2026-11-03T08-10-07-832Z-3bd963f-movement/raw.log`.

That run then failed on a separate harness value: selectOption('.75') does not match the actual option value '0.75'. Commit `0ee55f7` corrects only that spelling in the new v4 copy; the expected numerical scale, assertions and timeout remain unchanged. Full movement qualification is being rerun at `0ee55f7`. The original helper is untouched.

The run at `0ee55f7` passed all six cancellation paths and the 75% screen-coordinate displacement assertions, then failed the badge assertion expecting 24px. The real committed playground heading already starts at translate-x-[-16px], so a +24px drag correctly reports absolute X=8px. Later historical assertions also assume a zero-offset starting fixture. This is a test-data conflict, not evidence of incorrect scaled movement.

Commit `72ca1e5` prepares only the disposable movement fixture by removing owned pixel translation tokens before recording the test's original bytes. The real playground is untouched. This restores the historical zero-offset precondition for the unchanged 24px/40px/4px expected results and source Undo check. Nonzero-baseline cancellation was already exercised by the preceding runs. This is explicit setup normalization, not a claim that arbitrary authored offsets are fully covered by the historical workflow. Final rerun: `reliability-gate/2026-11-03T10-47-12-281Z-72ca1e5-movement/raw.log`.

At `72ca1e5`, cancellation, scaled geometry, Shift locking, Discard, source Save and byte-identical source Undo checks completed. The next geometry check threw because it dereferenced a missing heading during the iframe's reload. Commit `d6adcb3` changes only the new v4 polling predicate to return false while iframe/heading is absent; the same timeout and <1px restored-coordinate requirement remain. Rerun evidence: `reliability-gate/2026-11-03T10-49-40-691Z-d6adcb3-movement/raw.log`.

## Final movement result

**PASS at d6adcb3**, 203.59s workflow / 205.58s total, four real-API cases. All six cancellations, 75% geometry, Shift lock, one proposal per completed drag, Discard, source Save, exact source Undo, independently rendered website geometry and paragraph precise controls completed. No browser page errors or invalid manifest reads were reported by the gate. The five-minute cap was unchanged.

`canvas-movement-assertion-proof.json` compares the v3/v4 parsed assertion expressions and timeout properties; they are identical. Setup/polling differences are disclosed above. This result plus the earlier history PASS clears those specific blockers, not the whole reliability gate. History has not been rerun after the focus-only fix; the complete selection/shared/domain matrix and recompile-hydration issue remain unverified. No new canvas-spec features were implemented.
