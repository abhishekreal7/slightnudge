# Preview readiness investigation

Branch: `codex/fix-canvas-move-scale`. Product revision includes pages-manifest fix `2cb14ad`; observation-only harness commit `ec3973c`. No additional product fix was made here. Existing assertions and test deadlines remain unchanged. No merge/tag/push, environment files, secrets or user projects were used.

## What was added

`test/helpers/readiness-evidence.ts`, attached by the new shared gate runner, records console/page errors, HTTP errors, failed requests, bridge message types and pending request URLs/types. At 30/90/110 seconds after editor navigation it captures DOM state and, when readiness is false, a screenshot plus script-free DOM snapshot. Navigation cancels the preceding navigation's timers. Screenshots occur after DOM capture and are not frame-synchronous. Pending requests are tracked by URL, so simultaneous duplicate URLs are not a complete packet trace. This is observation, not retry/navigation or deadline extension.

## Run 1: original shared sequence

[Raw output](reliability-gate/2026-11-03T12-11-46-036Z-ec3973c-shared/raw.log): warm-up PASS (138.73s), local Studio TIMEOUT (122s); remaining shared cases were not run because the coordinator retired the runtime. Total 271.78s.

Studio **did connect**, receive bridge/text messages and edit instance props. Its 30-second snapshot had ready=true and a pending preview fetch. Later it reached Save/refresh before the overall cap. This does not reproduce the earlier baseline's initial separate-window readiness failure. It must not be described as an initial connection timeout.

## Run 2: fresh separate window alone

[Raw output](reliability-gate/2026-11-03T12-16-59-667Z-ec3973c-shared-local-window/raw.log): warm-up PASS (145.54s), local separate-window TIMEOUT (121.87s). Total 272.85s.

The window **connected and accepted instance edits**. A 30-second snapshot showed ready=true, four draft changes and a pending preview fetch. The browser then refreshed/recovered, clicked Save, and entered a later reload. A subsequent snapshot showed:

- ready=false;
- editor text “Saving…” and “Loading source page…”;
- an iframe whose source included the current refresh nonce;
- that iframe document request still pending.

That document request was logged at timestamp 1793708476889 and its HTTP 200 response at 1793708489151, about 12.26 seconds later. The client chunk request began immediately afterward and had not completed in the captured workflow tail before the outer cap stopped the run. There were also two apply/status HTTP 409 responses; their bodies were not captured, so this investigation does not interpret them as failed source writes.

Evidence: [events](reliability-gate/2026-11-03T12-16-59-667Z-ec3973c-shared-local-window/shared-local-window-artifacts/readiness-evidence/events.jsonl), [DOM](reliability-gate/2026-11-03T12-16-59-667Z-ec3973c-shared-local-window/shared-local-window-artifacts/readiness-evidence/4-30000.html), [screenshot](reliability-gate/2026-11-03T12-16-59-667Z-ec3973c-shared-local-window/shared-local-window-artifacts/readiness-evidence/4-30000.png), and server-50101.log in the same run directory. The screenshot preserves site content with Saving/loading status; it is not evidence of a permanently blank site or that the new document had hydrated.

## Conclusion and next controlled experiment

These two runs fail the total workflow cap **after initial readiness**, not at the original baseline's initial readiness wait. They establish a slow post-Save preview reload in the focused window run; they do not establish one common cause for every previous timeout, a lost bridge acknowledgment, or that the manifest fix resolved initial readiness.

SourceProjectCanvas.reload currently has a 30-second total refresh budget and up to five attempts, with a 15-second readiness window per navigation. A navigation can therefore be replaced while its document/chunks are still loading. That is a candidate to test, not yet a proven cause of this run's timeout. Server recompilation, client hydration, repeated navigation and accumulated editing/setup time must be separated.

Next experiment: a new disposable-browser regression that deliberately delays only the post-Save document/chunk response, records navigation starts/aborts and ready/verification timestamps, and verifies whether an in-flight load is replaced before it can acknowledge. Keep the current overall budget and source/Undo assertions. Only change reload scheduling if this controlled test fails before a fix and passes afterward. Separately replay the original reused-runtime readiness sequence with the observer; a cold-window run is not equivalent evidence.

## What was NOT verified

No full shared workflow passed in these observed runs. Save/Undo completion after the timeout, all four shared modes, original initial-readiness reproduction, exact HTTP 409 meaning, three repeated rounds, production behavior and a green full gate remain unverified. No AST, bridge protocol, source mapping, Apply/Undo/write path or UI code was changed. No test limit was increased. Temporary runtime data/logs remain retained; only coordinator-owned processes were stopped.
