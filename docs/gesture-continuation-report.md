# Consecutive resize and Move gestures

The user clarified that “Finishing the current edit…” eventually clears: the defect is a blocking pause between edits, rather than a demonstrated permanent lock.

## Evidence and fix

The new real-browser reproduction holds the first real preview response after the server prepares it. Before the fix, `Resize remains available while the previous real response is held` fails (`false !== true`), recorded in `gesture-continuation-before.log`.

Resize previously bypassed the existing consecutive-Move queue, globally setting the operation busy flag until its request and rendered verification completed. Resize handles were disabled during that interval. That queue now accepts released width gestures as well as Move gestures on the same selected source element. The next pointer gesture can paint locally before the previous response is delivered. Validation remains serial; each accepted revision uses the previous verified draft as its parent.

Product changes for this task are confined to `components/slightnudge/EditorWorkspace.tsx`:

- Add width intents to the existing direct-gesture pipeline; reuse its draft-frame capture barrier.
- Allow the selected element's pointer handles during that pipeline, preserving Save, recovery, state-scope and unrelated-operation guards.
- Keep current width intent visible across a previous gesture's validation. Suppress transient painting while the existing rendered verification runs, then repaint the latest intent.
- Permit a Move/resize handoff. A width-only pipeline does not parse or author translation; Move still performs its own existing translation safety checks.
- Cancel and refusal paths restore the verified appearance, release the capture layer, drain/finish pending work and leave subsequent gestures usable.
- Read-only catalog refreshes can observe a revision owned by this pipeline without canceling an active next resize. Exact source identity, layout anchor, root units and backend source verification remain required.

No AST patcher, Apply/Undo write path, source mapping, server API, compiler, adapter or source-canvas bridge changes were made in this task. Existing dirty changes from prior tasks were retained. No existing tests or limits were edited; new drivers copy the isolated-workspace harness and add the measurement module to its copy list.

## Checks

All browser workflows run sequentially on disposable source copies. Held responses are real API responses. The refusal scenario deliberately simulates one HTTP 409; it is not evidence of a naturally occurring backend refusal.

| Check | Evidence |
| --- | --- |
| Resize then resize while the first real response is held; first validation preserves the second active drag; serialized parents, draft steps, subsequent Move, real Save and exact source Undo | `gesture-continuation-after.log` |
| Move then resize under the same held-response condition, followed by another valid Move, Save and exact Undo | `gesture-continuation-move-first.log` |
| Escape cancels the second resize after the first validates; prior verified width is restored; another Move, Save and exact Undo work | `gesture-continuation-cancel.log` |
| Controlled refusal of the second resize; prior verified width is restored; another Move, Save and exact Undo work | `gesture-continuation-refusal.log` |
| Full view: consecutive resize under a held real response, followed by Move, Save and exact Undo | `gesture-continuation-full.log` |
| Existing consecutive-Move assertions, with fixture preparation moved before compiler startup in new copies only: serialized parents, separate draft Undo steps, Save and exact source Undo | `gesture-continuation-move-regression.log` |
| Resize start/center/end at 75%, 100%, 150%; catalog refresh during drag; horizontal offsets 0px at tested preset stops; Escape; final real Save and exact Undo | `gesture-continuation-resize-diagnostic.log` |
| TypeScript | 66 errors; normalized diagnostics identical to `resize-pointer-typecheck.log`; see `gesture-continuation-typecheck.log` |
| Whitespace check | `git diff --check` passes |

`gesture-continuation-held.png` records a second active drag while the first response is held. Each new scenario also asserts no browser page errors and no source write before Save.

Unsuccessful attempts are retained. `gesture-continuation-move-readiness-before.log` timed out waiting for source readiness before movement assertions. The rerun prepares the old helper's zero-offset precondition before the compiler starts and avoids rewriting identical bytes in a new helper copy. `gesture-continuation-harness.diff` proves its assertions and limits are unchanged. This is evidence for improving the harness setup, not a comprehensive diagnosis of all preview readiness failures.

`gesture-continuation-resize-regression.log` passed all nine drag/cancel checks but timed out waiting for the final preview response. A new diagnostic copy adds pointer-capture logging/assertion and a screenshot at that final pointerdown; it records successful capture, no notice, and passes the full suite in `gesture-continuation-resize-diagnostic.log`. The earlier timeout's precise cause remains unproven. Do not call that first attempt green or claim its intermittent failure was fixed.

## What I did NOT verify

- The user's existing browser session or its stored draft. Automated tests reproduce the blocking condition independently; no user draft was discarded.
- Continuous editing of other selected elements, text, inspector fields, keyboard resize, imported width editing, or responsive/state changes during validation. Those continue to use their existing guards. Save still waits for verification.
- Free pixel width/height, rotation, every source layout, or behavior outside the existing supported width presets.
- Frame-time budgets, physical OS pointer rendering or an absolute zero-latency guarantee. The held-response tests prove input is not gated on that response; they are not frame-time benchmarks.
- The complete selection/shared-instance gate or a production build.
- A green full-project typecheck: the same 66 existing errors remain.

No commit, merge or push was made for this fix.
