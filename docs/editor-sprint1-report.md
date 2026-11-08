# Editor Sprint 1 report

## Part 0 â€” Baseline gate

| Check | Result | Evidence |
| --- | --- | --- |
| Required branch, HEAD and tag ancestry | CONFIRMED | `feat/studio-full-controls` at `955007d231d7da7783c6d3222ea2942be03eafb4`. `phase2c1-merged` exists and is an ancestor. [Baseline](editor/evidence/part-0a-baseline.txt) |
| Allowed dirty state under the amended rule | CONFIRMED | The routes and root-params imports match HEAD after removing the generated development path segment. [Programmatic check](editor/evidence/part-0a-amended-check.txt) Â· [Original diff](editor/evidence/part-0a-next-env.diff) |
| Commit inventory and safety-sensitive review list | CONFIRMED | One commit, `955007d` by Abhishek S B, upgraded Next.js. Four files changed, with 47 insertions and 44 deletions. Zero UNREVIEWED commits touched the specified safety-sensitive paths. [Inventory](editor/evidence/part-0b-commit-inventory.txt) |
| Archive TypeScript and production build | CONFIRMED | Ran `next typegen` before `npx --no-install tsc --noEmit` to generate the route declarations in the fresh archive. TypeScript and `npm run build` exited 0. The archive omitted the tracked `.env.example`. [TypeScript](editor/evidence/part-0c-tsc.txt) Â· [Build](editor/evidence/part-0c-build.txt) |
| Production Chromium smoke | CONFIRMED | `/studio` returned 200, the token reached the browser, nudge preview returned 200, and Apply returned 200. The only source change in the archive fixture was `ml-2.5` to `ml-3`. [Passing run](editor/evidence/part-0c-studio-rerun.txt) |
| Safety battery | CONFIRMED | All 23 suites passed on the unchanged engine baseline. [Results](editor/evidence/part-0c-battery-results.json) Â· [Reorder](editor/evidence/part-0c-reorder-safety.txt) |
| Before-and-after real-state integrity | CONFIRMED | The real history and fixture SHA-256 hashes and porcelain snapshots matched before and after each of the five runs. The history hash already differed from the guardâ€™s expected value in the initial snapshot. [Initial snapshot](editor/evidence/part-0c-tsc-state-before.txt) Â· [Guard before](editor/evidence/part-0c-real-state-guard-state-before.txt) Â· [Guard after](editor/evidence/part-0c-real-state-guard-state-after.txt) |

Part 0 is CONFIRMED complete under Amendment 3. The guard correction is committed as `6cadd06`. The next item is Part 1a.

The first smoke runner assumed the nudge HTTP response contained the full old and new class strings. The response returns the changed tokens, and the full strings are in the saved preview. The rerun read those strings from the archiveâ€™s preview record and retained the assertions. [First run](editor/evidence/part-0c-studio.txt) Â· [Runner](editor/evidence/part-0c-smoke.mjs)

## Baseline battery

| Suite | Result | Evidence |
| --- | --- | --- |
| reorder-safety | CONFIRMED | [Output](editor/evidence/part-0c-reorder-safety.txt) Â· [Before](editor/evidence/part-0c-reorder-safety-before.json) Â· [After](editor/evidence/part-0c-reorder-safety-after.json) |
| adapter | CONFIRMED | [Output](editor/evidence/part-0c-adapter.txt) Â· [Before](editor/evidence/part-0c-adapter-before.json) Â· [After](editor/evidence/part-0c-adapter-after.json) |
| history-resilience | CONFIRMED | [Output](editor/evidence/part-0c-history-resilience.txt) Â· [Before](editor/evidence/part-0c-history-resilience-before.json) Â· [After](editor/evidence/part-0c-history-resilience-after.json) |
| s1-auth-origin | CONFIRMED | [Output](editor/evidence/part-0c-s1-auth-origin.txt) Â· [Before](editor/evidence/part-0c-s1-auth-origin-before.json) Â· [After](editor/evidence/part-0c-s1-auth-origin-after.json) |
| s1-auth-bypass | CONFIRMED | [Output](editor/evidence/part-0c-s1-auth-bypass.txt) Â· [Before](editor/evidence/part-0c-s1-auth-bypass-before.json) Â· [After](editor/evidence/part-0c-s1-auth-bypass-after.json) |
| s2-path-traversal | CONFIRMED | [Output](editor/evidence/part-0c-s2-path-traversal.txt) Â· [Before](editor/evidence/part-0c-s2-path-traversal-before.json) Â· [After](editor/evidence/part-0c-s2-path-traversal-after.json) |
| s3-atomic-write | CONFIRMED | [Output](editor/evidence/part-0c-s3-atomic-write.txt) Â· [Before](editor/evidence/part-0c-s3-atomic-write-before.json) Â· [After](editor/evidence/part-0c-s3-atomic-write-after.json) |
| s5-tailwind-compile | CONFIRMED | [Output](editor/evidence/part-0c-s5-tailwind-compile.txt) Â· [Before](editor/evidence/part-0c-s5-tailwind-compile-before.json) Â· [After](editor/evidence/part-0c-s5-tailwind-compile-after.json) |
| s5-theme-support | CONFIRMED | [Output](editor/evidence/part-0c-s5-theme-support.txt) Â· [Before](editor/evidence/part-0c-s5-theme-support-before.json) Â· [After](editor/evidence/part-0c-s5-theme-support-after.json) |
| s5-v3-support | CONFIRMED | [Output](editor/evidence/part-0c-s5-v3-support.txt) Â· [Before](editor/evidence/part-0c-s5-v3-support-before.json) Â· [After](editor/evidence/part-0c-s5-v3-support-after.json) |
| test-override-guard | CONFIRMED | [Output](editor/evidence/part-0c-test-override-guard.txt) Â· [Before](editor/evidence/part-0c-test-override-guard-before.json) Â· [After](editor/evidence/part-0c-test-override-guard-after.json) |
| prewrite-hook-guard | CONFIRMED | [Output](editor/evidence/part-0c-prewrite-hook-guard.txt) Â· [Before](editor/evidence/part-0c-prewrite-hook-guard-before.json) Â· [After](editor/evidence/part-0c-prewrite-hook-guard-after.json) |
| m5-containment-helper | CONFIRMED | [Output](editor/evidence/part-0c-m5-containment-helper.txt) Â· [Before](editor/evidence/part-0c-m5-containment-helper-before.json) Â· [After](editor/evidence/part-0c-m5-containment-helper-after.json) |
| token-undo | CONFIRMED | [Output](editor/evidence/part-0c-token-undo.txt) Â· [Before](editor/evidence/part-0c-token-undo-before.json) Â· [After](editor/evidence/part-0c-token-undo-after.json) |
| token-html-host | CONFIRMED | [Output](editor/evidence/part-0c-token-html-host.txt) Â· [Before](editor/evidence/part-0c-token-html-host-before.json) Â· [After](editor/evidence/part-0c-token-html-host-after.json) |
| undo-refusals | CONFIRMED | [Output](editor/evidence/part-0c-undo-refusals.txt) Â· [Before](editor/evidence/part-0c-undo-refusals-before.json) Â· [After](editor/evidence/part-0c-undo-refusals-after.json) |
| undo-m3-restored-token | CONFIRMED | [Output](editor/evidence/part-0c-undo-m3-restored-token.txt) Â· [Before](editor/evidence/part-0c-undo-m3-restored-token-before.json) Â· [After](editor/evidence/part-0c-undo-m3-restored-token-after.json) |
| undo-m5-parent-junction | CONFIRMED | [Output](editor/evidence/part-0c-undo-m5-parent-junction.txt) Â· [Before](editor/evidence/part-0c-undo-m5-parent-junction-before.json) Â· [After](editor/evidence/part-0c-undo-m5-parent-junction-after.json) |
| fixtures | CONFIRMED | [Output](editor/evidence/part-0c-fixtures.txt) Â· [Before](editor/evidence/part-0c-fixtures-before.json) Â· [After](editor/evidence/part-0c-fixtures-after.json) |
| m0-regression | CONFIRMED | [Output](editor/evidence/part-0c-m0-regression.txt) Â· [Before](editor/evidence/part-0c-m0-regression-before.json) Â· [After](editor/evidence/part-0c-m0-regression-after.json) |
| m0-overfit | CONFIRMED | [Output](editor/evidence/part-0c-m0-overfit.txt) Â· [Before](editor/evidence/part-0c-m0-overfit-before.json) Â· [After](editor/evidence/part-0c-m0-overfit-after.json) |
| real-state-guard-v2 | CONFIRMED | [Output](editor/evidence/part-0c-real-state-guard-v2.txt) Â· [Before](editor/evidence/part-0c-real-state-guard-v2-before.json) Â· [After](editor/evidence/part-0c-real-state-guard-v2-after.json) |
| undo-stacked-edits | CONFIRMED | [Output](editor/evidence/part-0c-undo-stacked-edits-resumed.txt) Â· [Before](editor/evidence/part-0c-undo-stacked-edits-resumed-before.json) Â· [After](editor/evidence/part-0c-undo-stacked-edits-resumed-after.json) |

The stacked suite passed 300 seeded cases with seed base 771234 in 779.8 seconds. M0 regression passed 30 selections with 18 allowed, 12 refused and zero wrong targets. M0 overfit passed 30 selections with 26 allowed, 4 refused and zero wrong targets. TypeScript passed again after the guard correction. [TypeScript](editor/evidence/amendment-3-typecheck.txt)

## Part 1a â€” Write-time comparison

CONFIRMED. Apply now re-reads the file after Tailwind and parse verification, the guarded pre-write hook, and the containment check, immediately before the source write. Both exact and token undo re-read immediately before their source writes and restore the history status to applied on refusal. The external file content survives and undo remains retryable.

The three new regression cases failed against the unchanged engine and passed after the implementation. The suite completed in 1.3 seconds. [Raw red](editor/evidence/part-1a-cas-red.txt) Â· [Pass](editor/evidence/part-1a-cas-green.txt)

| Removed comparison | Killing test | Evidence |
| --- | --- | --- |
| Apply | Apply preserves an external edit inserted after verification, without history or temporary source files | [Assertion failure](editor/evidence/part-1a-mutant-cas-apply.txt) |
| Exact undo | Exact undo preserves a concurrent edit and remains retryable | [Assertion failure](editor/evidence/part-1a-mutant-cas-undo-exact.txt) |
| Token undo | Token undo preserves a concurrent edit and remains retryable | [Assertion failure](editor/evidence/part-1a-mutant-cas-undo-token.txt) |

CONFIRMED. History resilience, the hook production guard, parent-junction containment, token undo, undo refusals, restored-token refusal and TypeScript passed with the fix. All protected-state snapshots matched. Windows file symlink privilege remains UNVERIFIED, as the existing containment suite reports. [History](editor/evidence/part-1a-regression-history-resilience.txt) Â· [Hook guard](editor/evidence/part-1a-regression-prewrite-hook-guard.txt) Â· [Containment](editor/evidence/part-1a-regression-undo-m5-parent-junction.txt) Â· [Token undo](editor/evidence/part-1a-regression-token-undo.txt) Â· [Refusals](editor/evidence/part-1a-regression-undo-refusals.txt) Â· [Restored token](editor/evidence/part-1a-regression-undo-m3-restored-token.txt) Â· [TypeScript](editor/evidence/part-1a-regression-typecheck.txt)

## Part 1b â€” Conditional ancestor characterization

CONFIRMED. Eight cases cover ternary, logical AND, if-statement ancestors and a component used once. Every unchanged file applies and undoes byte-identically. After an unrelated external text edit, the three conditional contexts refuse with file, line and exact token restoration instructions, preserve the external bytes, and keep the history record retryable. The once-used component completes token undo while preserving the external text. A same-class sibling is checked to catch wrong-target changes. The suite completed in 1.9 seconds. [Characterization](editor/evidence/part-1b-conditional-characterization.txt)

No behavior change was required for conditional ancestors because these tests exposed neither a wrong target nor a stuck state. This characterization passed on its initial run. An initial TypeScript check identified two optional assertion-message arguments, which were given fallback messages without changing the asserted conditions. TypeScript then passed. [Initial type output](editor/evidence/part-1b-typecheck.txt) Â· [TypeScript pass](editor/evidence/part-1b-typecheck-fixed.txt)

Part 1a is committed as `1b93d2b`. The implementation changes only the three write-time comparisons and undo-status restoration on refusal.

## Committed checkpoint

| Commit | Work |
| --- | --- |
| `6cadd06` | Complete v2 guard with normalized fixture comparison |
| `3e924ad` | Passing baseline and initial editor documentation |
| `1b93d2b` | Apply and undo write-time comparisons |
| `faea178` | Conditional-ancestor characterization |

The current run ends at a budget boundary after Part 1. Next is Part 2a. A final v2 run against the real worktree passed all three checks, and the before-and-after protected-state snapshots matched. [Final real-worktree guard](editor/evidence/part-1-final-real-guard.txt)

## Part 2a â€” Overlay contract and polish

CONFIRMED complete. Both playground and source-mapped editors follow the [overlay contract](editor/overlay-contract.md). The shared measured toolbar placement prefers above, flips below, clamps to the viewport, uses free sides when needed and hides when a nonoverlapping position cannot fit. It hides during drag, resize and scroll. Reordering uses one solid 2 CSS pixel parent-width accent line and a target at 0.25 opacity. Dots, destination shadows, text badges and the cursor chip were removed. Drop, Escape, pointer cancellation, refused drop and blur dismiss transient canvas overlays.

The contract was written before the new tests and implementation. The original browser run reproduced stuck-toolbar assertions during drag, resize and gesture completion. [Raw initial failure](editor/evidence/part-2a-overlay-red.txt) Â· [Local-resource baseline run](editor/evidence/part-2a-overlay-red-local.txt)

The ten contract tests pass across both real entry points and compare eighteen reviewed 720 by 440 PNGs, totaling 702712 bytes, with Playwright's bundled pixelmatch comparator. Threshold is 0.15 with a 0.2% differing-pixel limit. Independent geometry assertions enforce bounds, above/below placement, absence of overlap, exact line thickness and parent width. Completion assertions check successful preview preparation, refused preview, cancellation without requests and restored element opacity. [Verified contract suite](editor/evidence/part-2a-overlay-verified.txt) Â· [Baseline review sheet](editor/evidence/overlay-baselines-review.png) Â· [Regeneration instructions](../test/visual-baselines/README.md)

A dedicated regression exposed target and sibling transforms left behind after a refused source-editor drop. It failed before the cleanup fix and passed after movement styles were restored. [Raw failure](editor/evidence/part-2a-transform-red.txt) Â· [Pass](editor/evidence/part-2a-transform-green.txt)

TypeScript and the final production build passed with the overlay changes. The existing webpack createRequire warnings remain. The integration suite took 150.8 seconds on its final run. The cold-start and eighteen-image justification was documented before the tests ran. No existing assertion or timeout was weakened. The server helper now omits environment files from workspace copies. No dependency was added, and no existing studio suite selector was changed. [TypeScript](editor/evidence/part-2a-typecheck-final.txt) Â· [Build](editor/evidence/part-2a-build-final.txt)

CONFIRMED. Every Part 2a helper-based before-and-after snapshot matched, and all owned isolation roots were removed. Nested workspace copies, browser scratch directories, dependency junctions and dev servers were cleaned up. [Audit](editor/evidence/part-2a-audit.json) Â· [Cleanup inventory](editor/evidence/part-2a-cleanup.json)

Part 2a is committed as `50e2d69`. A post-commit guard run against the real worktree passed all three checks, bringing the Part 2a helper snapshot audit to thirteen matched pairs. [Real-worktree guard](editor/evidence/part-2a-real-state-final.txt)

This session ends at the completed Part 2a budget boundary. Next is Part 2b. Both Apply buttons and their shared save handler are preserved for the required proof before removing the duplicate.

## Parts 2bâ€“6

UNVERIFIED. One Apply and shortcuts, token/restart/reload behavior, UI test infrastructure, controls, real-site validation and the closing gate remain pending. Tag `pre-sprint1` was created on baseline `955007d` and branch `feat/editor-sprint1` was created under Amendment 2. The helper work initially landed in `b96f47c` and is complete after the Amendment 3 correction.

## Amendment 2

CONFIRMED. The read-only history diagnosis found an existing 477499-byte JSON file with 100 records. Its mtime was 2026-11-03T19:53:12.8131000Z. Two observations 142 seconds apart matched in size, mtime and SHA-256 `cbd243197fa766dae2553e1b6d63dc8088b3d71a7f0132cd70f79b73474ac97a`. The path histogram was `fixtures/ 99`, `scratch/ 1`, `other temp-looking paths 0`, `other 0`. No records pointed outside fixtures and scratch. The process inventory found no listener on port 3000, so there was no port-3000 process start time to compare to the file mtime. Normal editor activity is the most likely cause of the old hash discrepancy, UNVERIFIED. [Diagnosis and process inventory](editor/evidence/amendment-2-history-diagnosis.txt)

real-state-guard (v1): SUPERSEDED, reason: compared mutable developer data to a fixed hash; v1 left unchanged for history.

CONFIRMED. The v2 guard failed with a missing-helper module error before implementation. After implementation, its tracked-modification check and helper self-test passed. The self-test detects modification, deletion, creation, metadata changes, mutable history changes and status-list changes in a temporary directory. The fixture-to-HEAD assertion failed on the first fixture. All five fixture worktree files use CRLF and HEAD uses LF, with identical normalized content. This is a raw-byte mismatch under Amendment 2. The initial attempt lacked a full pass. Amendment 3 superseded the raw-byte assertion, and all three checks now pass. [Initial red](editor/evidence/amendment-2-guard-red.txt) Â· [Post-implementation result](editor/evidence/amendment-2-guard-green.txt) Â· [Byte diagnosis](editor/evidence/amendment-2-fixture-byte-diagnosis.txt)

CONFIRMED. Both new runs preserved the protected state. The first run used read-only bootstrap snapshots because the helper was required to be absent. The post-implementation run used the new helper, which records SHA-256, size and mtime for the history file and recursively for fixtures, and compares Git status after checking the generated-import exception. [Helper snapshot before](editor/evidence/amendment-2-guard-green-before.json) Â· [After](editor/evidence/amendment-2-guard-green-after.json)

The previously pending suites, now all passed, were reorder-safety, adapter, history-resilience, s1-auth-origin, s1-auth-bypass, s2-path-traversal, s3-atomic-write, s5-tailwind-compile, s5-theme-support, s5-v3-support, test-override-guard, prewrite-hook-guard, m5-containment-helper, token-undo, token-html-host, undo-refusals, undo-m3-restored-token, undo-m5-parent-junction, undo-stacked-edits, fixtures, m0-regression and m0-overfit.

## Amendment 3

CONFIRMED. The v2 guard compares fixture content with HEAD after normalizing CRLF to LF on both sides and independently requires clean Git status for fixtures. Its tracked-modification check and temporary helper self-test remain in place. The real-state snapshot helper is unchanged and continues to compare raw bytes, size and mtime between observations. All three checks passed in an isolated archive with the amended test applied. The previous incomplete work is complete. [Pass and protected-state result](editor/evidence/amendment-3-guard-pass-retry.txt)

## Part 2b — One Apply and shortcuts

CONFIRMED. Before removal, both playground buttons posted the same nonempty preview ID to the same `/api/slightnudge/apply` save path. The characterization deliberately refused the writes so both clicks reviewed the same draft. The inspector duplicate is removed; the floating Apply remains. No engine or API save path changed. [Shared-path proof](editor/evidence/part-2b-shared-path-isolated.txt)

CONFIRMED. The unchanged baseline produced `2 !== 1` for the one-Apply assertion and no source-editor Apply response for Ctrl+Enter. The corrected, stable-worktree red run preserved protected state and Git status. [Raw failures](editor/evidence/part-2b-red-stable.txt)

CONFIRMED. Six browser cases cover both surfaces: Control/Meta+Enter writes the disposable source, Control/Meta+Z restores its exact original bytes, and Escape calls preview DELETE and clears the review. Five cases passed in the independent run; its Control Undo timeout passed with the same test on isolated rerun (FLAKY under Amendment 3). No assertion was loosened or timeout raised. Native text-field Undo is preserved and repeating a key does not resubmit Apply. Redo is a [written specification](editor/shortcuts.md), because the current history API has no redo operation. [Six-case run](editor/evidence/part-2b-green-independent.txt) · [Unchanged Control rerun](editor/evidence/part-2b-control-rerun.txt) · [TypeScript](editor/evidence/part-2b-typecheck-final.txt)

Visible review pair, inspected: [Before](editor/evidence/screens/part-2b-before.png) · [After](editor/evidence/screens/part-2b-after.png). Each PNG is about 140 KB. External browser resources were blocked, as in Part 2a; the pair shows the inspector duplicate disappearing while the floating review remains.

Part 2b implementation commit: `fa2d69c`. The post-commit real-state v2 guard passed all three checks. [Guard](editor/evidence/part-2b-real-state-final.txt)

Budget boundary: Part 2b complete; next is the user-promoted preview class-preservation fix, then Part 2c. No new dependencies, copied assets or competitor UI strings were introduced.

## Noticed but not fixed

CONFIRMED. One early group snapshot flagged my own implementation edits because I started editing before the group finished. Its protected `files` snapshots match; only the two intended implementation paths changed in porcelain. This was an orchestration error, not a test-induced protected-state mutation. Both outputs are preserved, and the baseline red was rerun with stable Git status. [Flagged run](editor/evidence/part-2b-red-corrected.txt) · [Stable rerun](editor/evidence/part-2b-red-stable.txt) · [Audit](editor/evidence/part-2b-audit.json)

CONFIRMED. Startup/response timeouts occurred; the initial source test also used the wrong existing button label and was corrected before the stable red. Chained editing after Undo hit preview/selection timeouts. Dev refresh remounting is a possible cause, UNVERIFIED. The final cases use separate disposable servers for independent shortcut proofs, retaining all six behavior assertions. Continuous editing after a refresh remains unverified for Part 2c. [Chained run](editor/evidence/part-2b-green-platforms.txt)


CONFIRMED. The screenshots are canvas crops. Applying progress and Error notices outside those crops are covered by state assertions, while their detailed message behavior remains Part 2c work. The installed internal Playwright comparator API may need adjustment on a dependency upgrade.

CONFIRMED. Initial browser attempts encountered cold compilation, remote font loading and interaction before hydration. Setup now warms both local routes, blocks external browser resources, waits for hydration and waits for source inspection before source-editor interaction. One preview-response timeout occurred during a concurrent build; the subsequent full suite passed. Action timeouts stayed at 5000 milliseconds. [Timeout run](editor/evidence/part-2a-overlay-final.txt) Â· [Verified run](editor/evidence/part-2a-overlay-verified.txt)

CONFIRMED by code and screenshot review. The existing source-editor nudge preview uses the response's newValue as the whole DOM className. A token response can therefore change unrelated preview styling. The source mutation uses the separately reviewed pending snapshot. The user promoted this preview issue to the next item, before Part 2c. [Preview state crop](../test/visual-baselines/source-previewing.png)


The production build emitted webpack warnings about parsing the `module.createRequire` argument in `lib/slightnudge/tailwind-verifier.ts`. [Build output](editor/evidence/part-0c-build.txt)

The prior Git archive omitted the tracked `.env.example`. Its contents were not read. [Archive log](editor/evidence/part-0c-workspace.txt)

CONFIRMED. The first Amendment 3 isolated guard run used core.autocrlf=false while its source archive reflected the Windows checkout setting. This produced spurious dirty-file assertions across the archive. The isolation runner now matches core.autocrlf=true, and the unchanged assertions pass. This environment discrepancy is resolved without a sprint stop under Amendment 3. [First output](editor/evidence/amendment-3-guard-pass.txt) Â· [Passing rerun](editor/evidence/amendment-3-guard-pass-retry.txt)

The battery wrapper initially treated the text P0 in the passing token/Host suite title as a failure marker. Matching only the outer snapshot failure marker corrected that orchestration error. The existing stacked-edit suite exceeded the wrapperâ€™s 180-second cap. Both interrupted copies were removed, their recovery snapshots matched, and the unchanged suite passed with the wrapper cap removed. No suite assertion or internal timeout was changed. [Recovery](editor/evidence/part-0c-stacked-wrapper-recovery.txt)

Windows file symlinks remain UNVERIFIED because the current account lacks the required privilege. Directory-junction containment cases passed. [Privilege audit](editor/evidence/part-1a-regression-undo-m5-parent-junction.txt)

## Cleanup

Removed one temporary root and its archive, workspace, dependency junction and browser scratch directory. Stopped both production servers on ports 57403 and 65187 and confirmed neither port was listening. No external repositories were cloned. [Workspace and cleanup log](editor/evidence/part-0c-workspace.txt)

The v2 helper self-test created and removed one temporary directory with prefix `sn-real-state-self-test-`. The generated suffix of that temporary directory was not captured in the test output. No servers or clones were created during Amendment 2.

All Amendment 3 isolation roots were confirmed absent after cleanup, including archive sources, dependency junctions and nested temporary directories. [Root inventory](editor/evidence/part-0c-cleanup-summary.json)

All isolation roots through Part 1 were confirmed removed, and all helper-based before-and-after snapshot pairs matched, including recovery snapshots for the interrupted wrapper runs. [Audit](editor/evidence/through-part-1-audit.json) Â· [Cleanup inventory](editor/evidence/through-part-1-cleanup.json)

All 14 Part 2b isolation roots were removed, including nested disposable server workspaces, dependency junctions and browser scratch folders. Their servers were stopped by the helper. All 15 protected-file snapshot pairs match; 14 full snapshots match, with the intentional-edit orchestration exception explained above. No clones were created. [Audit and cleanup inventory](editor/evidence/part-2b-audit.json)

## Amendment 4 — A1 incomplete checkpoint

The owner's P0 reports take priority: A performance, B preview correctness, C control design, then D remaining sprint. The full request is saved in BRIEF.md. No completed part was restarted. No product behavior changed in this checkpoint.

CONFIRMED: deterministic synthetic source/history fixtures and summary statistics have red/green tests. The history-read microbenchmark ran eight cells with twenty attempts each, entirely in disposable directories. Small-file / 100-record read median was 30.28 ms; small-file / 2000-record median was 1850.78 ms. A 2000-line source / 2000-record history is 607632892 bytes and failed all twenty read attempts with ERR_STRING_TOO_LONG. These are legacy sprint-engine library measurements, not dev/production HTTP or newer-editor performance. No before/after speedup, stable timing gate or ranked three bottlenecks is claimed. [Baseline table, scope and resume](editor/perf/baseline.md) · [Raw streamed measurements](editor/evidence/amendment4-history-streamed.txt) · [Expected fixture red](editor/evidence/amendment4-fixtures-red.txt) · [Fixture green](editor/evidence/amendment4-fixtures-final.txt)

The initial harness exceeded V8's string limit during setup; streaming setup now permits the engine's own failure to be recorded separately. Both owned sn-perf-history directories were confirmed removed, and the helper snapshots matched for the failed initial and completed streamed groups. No temporary server, external clone, dependency or product-code instrumentation was added by this checkpoint. Existing owner-requested preview servers remain outside the measurement workstream.

CONFIRMED branch mismatch: the owner's newer interface exists in stage/S1 at scratch/program/worktree (/editor), while feat/editor-sprint1 serves the older /studio. The newer preview was started on 3102 and returned HTTP 200 in the preceding turn. The newer UI has not been migrated, measured or performance-verified here. No UI files were deleted and no branches were merged or rebased. The A1 matrix and newer-UI provenance must be resolved as part of continuation; measurements here do not answer the owner's UI performance complaint.

**INCOMPLETE:** browser collectors, dev/prod matrix, stage breakdown and production-inert instrumentation proofs; A2–A4; B, C and D. The WIP checkpoint does not claim A1 complete. All nine hypotheses remain unverified for end-to-end latency; h1's readHistory component alone has measured scaling evidence.

CONFIRMED: TypeScript passed after replacing a direct NODE_ENV assignment rejected by the Next type declarations with Object.assign in the test-only harness. All 7 Amendment 4 helper snapshot pairs match. Both typecheck isolation roots were removed. [TypeScript](editor/evidence/amendment4-typecheck-final.txt) · [Snapshot audit](editor/evidence/amendment4-audit.json)

## Amendment 5 — UI inventory and storage design

Step 1 CONFIRMED complete. stage/S1 and the sprint share baseline 955007d; stage/S1 has 79 unique commits and this captured sprint head has 12. None of the four named sprint commits is in stage/S1's ancestry. There are 68 changed engine/API paths, including auth, mutation locking, recovery, history and Tailwind contracts. Recommendation (c) preserves both until the owner chooses; equivalent behavior has not been proven. Read-only Git/source inventory only; no live server or stage/S1 worktree changes. [Inventory and source entry points](editor/ui-line-inventory.md) · [Untruncated raw evidence](editor/evidence/amendment5-inventory.json)

Continued directly with Step 2a, CONFIRMED complete as a design artifact. The proposed store uses immutable content-addressed blobs, bounded metadata pages and an atomic committed-count head rather than rewriting an ever-growing array. It explicitly handles immutable legacy fallback, streaming migration, cross-process mutation locking, publication ordering, source/history crash intents, corrupted records, non-disclosure and rollback limitations. [History design](editor/history-design.md)

Step 2 implementation is INCOMPLETE: no product storage code or tests were added, no speedup claimed and no history was migrated. Step 2b's failing tests, implementation, mutations, before/after measurements and full unchanged safety battery remain next. Step 3 timings and Step 4 queue are pending. UI-only work remains deferred while engine work continues on this branch. The complete request is saved in BRIEF.md. No temporary workspace, server or clone was created in this documentation checkpoint; existing live servers were not contacted or stopped.

## Amendment 6 — partial storage primitives, incomplete store

The owner chose stage/S1 as the UI line of record. No UI or stage/S1 change was made, no live server contacted or stopped, and the approved design amendments were applied before code. [Design](editor/history-design.md) · [Deliberate future port plan](editor/port-plan.md)

CONFIRMED: the new module imports Node builtins and its own types/errors only, with explicit roots and no implicit history location. Atomic writes use temporary files, flush/close and the legacy retry/backoff schedule; byte counters count physical writes. Identical snapshots share SHA-256 blobs; reads verify length and hash. Path traversal and junction reads refuse before reading outside bytes. Fixed errors expose no payload detail. Modules remain UNWIRED: no Apply/Undo/storage-format behavior changed. [Expected missing-module red](editor/evidence/amendment6-blobs-red.txt) · [Five primitive tests, including privacy](editor/evidence/amendment6-blobs-privacy.txt)

Two named primitive mutants killed: removing blob digest comparison fails **rejects wrong hashes, missing blobs and bad sizes without private diagnostics**; removing read containment fails **rejects path escapes and junction reads before reading outside bytes**. These mutations existed only in isolated sources. The index-before-blob mutant is PENDING because metadata publication is not implemented. [Hash mutant](editor/evidence/amendment6-mutant-hash.txt) · [Containment mutant](editor/evidence/amendment6-mutant-containment.txt)

CONFIRMED: TypeScript passed. Existing history-resilience (six tests) and atomic-write (two tests) passed unchanged against the old engine; they do not exercise a new v2 adapter. [TypeScript](editor/evidence/amendment6-typecheck.txt) · [History](editor/evidence/amendment6-regression-history.txt) · [Atomic](editor/evidence/amendment6-regression-atomic.txt)

INCOMPLETE: public store, mode/marker, locking, metadata pages, pagination, migration/consent/dry-run, bounded operation intents and source recovery, compatibility, store-wide privacy, complete mutations, all baseline cells with append counters, and full safety battery. No new before/after speedup table exists yet: existing baseline measurements remain unchanged and no store performance improvement is claimed. The port plan is analysis only and must not be executed in this session.

All 8 Amendment 6 snapshot pairs match. All 5 named isolation roots were removed, including mutant copies, junctions and nested temp data. Primitive tests also remove their own sn-blob-contract- directories in finally; individual generated suffixes were not captured. No server or clone was created. [Audit](editor/evidence/amendment6-audit.json)

## Amendment 7 item 1 — paged metadata primitive

CONFIRMED: six tests pass after the raw missing-module red. A fixed-length committed-count head, metadata pages capped at 50 records and 8192 bytes per record, hashed-ID locators, idempotent append, status changes and revision cursors are implemented in the internal single-writer layer. Listing 50 reads head and one bounded page, no blobs. Ten before/after blob/page/locator/head fault boundaries reopen consistently; obsolete tail locators cannot expose discarded entries. Source materialization requires an owner-supplied validation callback. [Red](editor/evidence/amendment7-pages-red.txt) · [Pass](editor/evidence/amendment7-pages-final.txt) · [TypeScript](editor/evidence/amendment7-pages-types.txt)

Counting-adapter append results (one sample each, no timing gates): 10 records: 3241 bytes / 0.1011 ms; 2000: 395 bytes / 0.0537 ms; 1999: 14507 bytes / 0.1537 ms. Different page occupancy explains different constants. These are not physical-disk latency or the required full before/after baseline matrix. Read/write counters assert bounded I/O payload bytes.

The public concurrent store remains INCOMPLETE. Item 2 mode/locking and items 3–8 remain pending. No production engine wiring, developer-data migration or stage/S1 changes occurred.

## Amendment 7 item 2 — modes and cross-process lock

CONFIRMED: four new tests pass after missing-module red. An exclusive create-new lock serializes writers and is never stolen on age; busy and abandoned locks refuse with STORE_BUSY. Public mutations read mode while holding the lock. An empty store activates with a read-only sibling marker; existing legacy input refuses implicit migration. The withLegacyWrite callback holds the same lock across check and write; assertLegacyWritable is diagnostic only and must not authorize a later write. Corrupt manifest/head/page inputs remain unchanged after refusal. Two worker processes append 15 records each without losing or duplicating IDs. [Red](editor/evidence/amendment7-mode-red.txt) · [Pass](editor/evidence/amendment7-mode-green.txt)

All fifteen storage tests and TypeScript passed. This does not prove migration, intents, engine wiring or the complete safety battery. Paths are explicit roots; the production/test-override compatibility resolver remains item 4 work. No before/after storage latency improvement is claimed. [Combined storage regression](editor/evidence/amendment7-storage-regression.txt) · [TypeScript](editor/evidence/amendment7-mode-types.txt)

A further legacy-writer contract first failed: its callback could run before a legacy-only manifest existed. The writer now persists that mode under the lock before calling the cooperating writer. All sixteen storage tests and final TypeScript pass. Items 1 and 2 are saved; items 3–8 remain INCOMPLETE and the branch's engine work is not finished. Existing Apply/Undo are still unwired. [Legacy-mode red](editor/evidence/amendment7-legacy-mode-red.txt) · [Sixteen tests](editor/evidence/amendment7-storage-final.txt) · [Final types](editor/evidence/amendment7-store-types-final.txt)

All 11 protected-state snapshot pairs match; all 3 named isolation roots were removed. Mode tests remove generated sn-mode-contract directories (individual suffixes not captured), and their child processes exited. No live server was contacted/stopped, no stage/S1 worktree changed and no developer history records were parsed/migrated/written. [Audit](editor/evidence/amendment7-audit.json)

## Amendment 8 Step 0 — store parked

CONFIRMED: store-v2 is parked at a4bd2e6, unwired, with items 1–2 complete as module contracts and items 3–8 unfinished. The 100-record synthetic read cost is not evidence for the reported multi-second newer-editor lag. Work pivots to a new committed-tip-only integration checkout and measured reproduction. [Parked scope and resume](editor/store-v2-parked.md)

## Amendment 8 Steps 1–2 — committed-tip baseline STOP

CONFIRMED: created C:/dev/vibecheck/scratch/editor-safety-port-20261108 on codex/editor-safety-port-20261108 from 7a4c44a. Five original S1 uncommitted entries were summarized by count/top-level location only; no contents were inspected. The new checkout excludes those changes. Differing dependency hashes required npm ci (124 packages; four npm audit findings recorded, no dependency edits). The integration helper was added only because absent. No integration product commit, safety port, environment-file copy, existing-worktree modification or live-server contact occurred.

CONFIRMED baseline failures: TypeScript and production build fail unchanged. Four Apply race cases passed. Crash recovery failed twice with `1 !== 73`: generated project-scope repositories.json is missing and the intended crash point is not reached. Both outputs are preserved. This reproduced baseline safety assertion triggers the retained STOP rule; remaining baseline suites and all performance work remain UNVERIFIED. [Baseline method, results, raw outputs and resume](editor/perf/s1-baseline.md)

All ten main/integration protected-file comparisons match. One main Git-status snapshot flagged my creation of an untracked orchestration script during the build; the only difference is documented and the raw flag retained. All five named disposable roots were removed; the authorized integration checkout/dependencies remain for continuation. No test server was created. The owner S1 status count/top-level breakdown remains unchanged. [Audit](editor/evidence/amendment8-baseline-audit.json)

No lag reproduction, top-three bottlenecks, timing table, performance fix, preview assessment or before/after video is claimed. Store-v2 stays parked. Steps 3–6 remain pending behind the required baseline STOP resolution; design and controls were not started.

## Amendment 9 — engine/typing checkpoint

CONFIRMED: Amendment 9 supersedes the earlier baseline STOP; its full request is appended to BRIEF.md. Work remains in C:/dev/vibecheck/scratch/editor-safety-port-20261108 on codex/editor-safety-port-20261108, now 33feb48. The original stage/S1 worktree, all pre-existing servers (including 3100/3102) and developer history records remain untouched. Store-v2 remains parked.

CONFIRMED fixture defect: scoped crash setup omitted the managed project directory and generated repositories.json. Child stderr/stack show scope validation exits 1 before the intended crash hook. The earlier passing race suite is unscoped. Setup-only commit 8c61361 creates that fixture; every assertion and expected exit 73 remains unchanged. The entire crash suite passes. [Red, stack, line comparison and diagnosis](editor/evidence/amendment9-fixture-triage.txt) · [Green](editor/evidence/amendment9-crash-setup-green.txt)

CONFIRMED selected baseline complete: 53 passing engine/recovery suites (including repaired crash and earlier race), nine reproduced BASELINE DEFECTs and no demonstrated violation under the narrowed safety rule. All 300 randomized stacked-Undo cases pass without changing seeds, assertions or timeouts. All 90 candidates are tabulated with raw output links and first errors; 28 browser/lab/live-URL cases were deferred from the baseline, six later passing as targeted typing checks. This is not an all-green battery. [Full results, failure classifications and provenance](editor/perf/s1-baseline.md)

CONFIRMED all 56 diagnostics fixed in four cause-specific commits: EventTarget focus ed11f8a (55 remaining), readonly NODE_ENV cd08451 (46), optional values 6037c3f (26), browser typings e86cc17 (0). Product behavior is unchanged; no any, suppression, non-null assertion or config relaxation was added. Assertions still require the same success/refusal/content outcomes; new guards make missing draft/source metadata explicit. The serialized browser probe now retains its real return type, with transformed-iframe/physical-hit proof. [Every original diagnostic](editor/evidence/amendment9-typing-table.md) · [Validation and limitations](editor/evidence/amendment9-type-validation.json) · [Commit paths](editor/evidence/amendment9-commits.json)

CONFIRMED final committed-HEAD archive TypeScript and the literal npm run build pass. Affected drag/manipulation, account/production, S1/S2/S3 security proofs, eight optional-value suites, six bridge suites and coordinate probe pass. imported-draft's generated-registry defect and the old formatter script's absent Prettier tool reproduce once each after typing changes and remain failures. Hard-coded live-URL/full-editor lab workflows were not run. The unchanged authorized snapshot helper is retained in 33feb48. [Committed tsc](editor/evidence/amendment9-committed-tsc.txt) · [Build](editor/evidence/amendment9-types-build.txt)

Noticed but not fixed: nine baseline defects; historical formatter tool absence; webpack module.createRequire warning; deliberately omitted tracked .env.example (no contents read); unavailable Windows file-symlink privilege; optional v3 theme probe unavailable while dedicated v3 suite passes; original S1's excluded five uncommitted entries. Stronger auth, registry binding, Undo target requirements and canonical-route redirects remain intact.

CONFIRMED all 208 snapshot pairs match and all 105 named disposable isolation roots are removed, including nested source/data/cache/junction/browser state; see the complete audit. Six temporary server instances belong to the auth-origin, token-html-host and preview-connection suites (two attempts each), with awaited finally teardown; some individual PIDs/ephemeral port numbers were not logged. No owner's server was contacted or stopped. Integration checkout is clean; next-env.d.ts was absent from every staged path list. [Audit](editor/evidence/amendment9-audit.json)

Pending: dev-first instrumentation/inertness proof and the full measurement matrix; measured-impact fixes; preview correctness check; before/after videos and final tables; then ports in port-plan.md order, design C, controls and Part 2c. No lag reproduction, stage timing, top-three bottleneck ranking, performance improvement or budget compliance is claimed. STATE.md gives the exact next item and isolation commands. This checkpoint stops after the completed engine/typing/build item as requested.

## What I did NOT verify

The user's real lag or its cause; h2–h9 with timing evidence; dev/production stage, frame/render/network/bridge metrics; instrumentation inertness; delayed-save queues or performance budgets; S1 preview correctness; before/after videos; original S1 uncommitted changes; deferred full-editor/lab/live-URL workflows; Windows file-symlink attacks requiring unavailable privilege. Nine baseline defects and the historical formatter setup defect remain visible failures. No safety-port merge, design pass or controls work was started.
