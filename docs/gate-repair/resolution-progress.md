# Reliability resolution in progress

The compact dock redesign is deferred until reliability qualification completes. This document supplements the historical REPORT.md; its original failure table is not a current green baseline.

## Proven harness repairs

- Isolated ports replace assumed 3000/3001/3002 availability. The first new Full regression run completed 30/30: 18 allowed, 12 refused, no missing or wrong targets. Raw output: `../reliability-gate/2026-11-02T05-42-58-532Z-f4be219-selection-full-regression/raw.log`.
- Short disposable worktree paths address Windows Git path-length setup failures.
- Editor roles and readiness selectors remain in the host while content queries use the iframe. A new delayed-control routing test failed with the former proxy and passed with the corrected proxy: `routing-before.log`, `routing-after.log`.
- Movement geometry now uses screen-space iframe bounding boxes instead of a synthetic parent wrapper. Copied movement, text and recovery workflows use current controls. Originals remain unchanged.
- Shared workflows use owned preview servers warmed once, fresh browser contexts and sequential tests. Source assertions remain in the original copied shared helper. Warm-up is separately bounded at 180s; the four editing workflows retain individual 120s and aggregate 480s caps. No source mutation is retried by the coordinator.
- The copied selection labs must remove/reinstall their old generated adapters when protocol changes; this is confined to disposable projects.

## Product findings and isolated fixes

### Imported shared-component Undo hydration race

Before-fix evidence: `../reliability-gate/2026-11-02T05-58-46-916Z-c72c47b-shared/shared-imported-studio.log`. Editing, Save and exact Undo assertions completed, but the browser raised a hydration mismatch after Undo. The server button was `Only first` with saved caller hash `47955bde…`; the client expected `Same` with original caller hash `79d4ad12…`. Those hashes match the disposable history record's callerAfterHash and callerBeforeHash. This is a preview mismatch, not evidence that Undo wrote incorrect bytes.

Commit `34d5fd0` adds a read-only server-document check before reloading shared-instance text edits. It checks source identity, caller hash, text, classes and attributes in inert parsed HTML, then retains the existing post-hydration verification. HTTP errors and stale revisions do not trigger an iframe navigation. It does not establish SSR evidence for client-only targets; existing live verification remains responsible for those. The regression failed before the implementation and passed afterward: `source-document-fence-before.log`, `source-document-fence-after.log`.

### Lost initial bridge readiness

The protocol previously announced readiness once. A deterministic new test installs the host's listener only after that announcement; it timed out before the fix. Commit `5d76305` retries the announcement for a bounded interval, validates an origin/session acknowledgment, and avoids invoking readiness callbacks twice. Tests: `handshake-before.log`, `handshake-after.log`. A separate real local readiness diagnostic connected successfully; the deterministic test proves the one-shot protocol weakness, not that every earlier timeout had that cause.

## Every product hunk

- `SourceProjectCanvas.tsx`: acknowledgment state and duplicate-ready guard; authenticated acknowledgment; read-only command type and timeout classification; bounded server-document check before instance-text reload.
- `source-canvas-bridge.ts`: inert server-document verification; strict acknowledgment handling; bounded readiness retry with viewport/catalog metadata.
- `source-canvas-contract.ts`: protocol 19, so stale adapters are explicitly detectable.

The AST patcher, source mapping loader, selection algorithm and source Apply/Undo write implementations are unchanged. These preview fixes have their own commits. No user project adapter/config files were updated; generated test projects receive current adapters. No merge, tag or push.

## Current qualification

The complete gate at `../reliability-gate/2026-11-02T11-58-11-024Z-b23bd1d/raw.log` finished; it was not green. Its manifest observer caught a real empty `app-paths-manifest.json`. The coordinator also incorrectly carried that stopped server's manifest error into subsequent workflow rows. Later coordinator changes scope manifest observations to the servers belonging to each workflow; the historical artifacts remain unchanged.

| Capability or check | Proven result | Evidence / qualification |
| --- | --- | --- |
| Selection in Full and Fit | 120 cases completed with no missing or wrong targets and no failed target assertions or page errors | The b23bd1d run above; its table rows still fail because of the independent manifest error |
| Fit overlay alignment | 60 geometry samples completed at 50%, 100% and 150%; maximum absolute offset 0.0078125px | `scale-offsets-current.json`; not yet repeated at current HEAD |
| Four shared-instance workflows | All original workflow assertions completed with no page errors | b23bd1d raw logs; current old-Studio Fit mapping still needs requalification |
| Route-manifest atomic publication | New installed-Next regression failed before and passed after | `app-paths-before.log`, `app-paths-after.log`; commit d87d989 adds two route-manifest targets to the existing publisher |
| Imported responsive editing | PASS: custom breakpoint scopes, actual saved responsive CSS, refresh recovery, Save and exact Undo | `../reliability-gate/2026-11-02T16-14-28-389Z-f668b3b-responsive-imported/raw.log` |
| Explicit shared-definition text and Move | Implemented, combined history qualification incomplete | fefc839 and ec26692; `../reliability-gate/2026-11-02T16-56-08-271Z-ec26692-history/raw.log` timed out at 300s |
| Warm history runner | Warm-up PASS (140.56s); history FAIL (296.13s), not TIMEOUT | Commit 22e17ec; `../reliability-gate/2026-11-02T17-15-01-891Z-22e17ec-history/raw.log`; failed at `imported-canvas-browser.v4.ts:84`: the Move button must have a non-null bounding box and width between 25px and 29px. The returned box was not recorded, so this run does not distinguish hidden/missing geometry from incorrect size. Later Save/history/recovery assertions were not reached. No invalid manifest reads were observed in this run. |
| Compact dock and refined resize handles | Not implemented | Deferred until the outstanding reliability checks complete; Move button styling/position remains unchanged |

Additional product hunks since the earlier list: the atomic-manifest publisher includes route manifests; EditorWorkspace exposes styles, literal text and Move only after an explicit shared-definition choice and the existing safety inspection; the read-only document fence also covers literal definition text before refreshing. The AST patcher, source mapping loader, selection algorithm and source Apply/Undo write implementations remain unchanged.

Original test files, limits and expected-result lists have not been edited. The v3 assertion proof covers 46 copied files. Four newer v4 copies adapt current controls and explicit definition ownership. Two deliberately changed assertion predicates need to be disclosed separately: inline text checks the actual selected overlay geometry instead of a removed synthetic parent border; shared-definition refusal accepts an absent or disabled input instead of requiring a disabled input to exist. These v4 copies are not covered by the v3 claim of expression-identical assertions.

Not yet verified: a complete green gate at current HEAD; completed current movement, state/transition, text, history and recovery reruns; all four current shared workflows; warm icon replacement qualification; the new dock/resize design; production packaging. Existing user-project preview configurations have not been modified. The original compiler-overrun durations remain unaccounted for precisely. A later execution-environment interruption changed wall-clock time; that does not prove the causes of historical overruns.
