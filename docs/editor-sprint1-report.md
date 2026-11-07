# Editor Sprint 1 report

## Part 0 — Baseline gate

| Check | Result | Evidence |
| --- | --- | --- |
| Required branch, HEAD and tag ancestry | CONFIRMED | `feat/studio-full-controls` at `955007d231d7da7783c6d3222ea2942be03eafb4`. `phase2c1-merged` exists and is an ancestor. [Baseline](editor/evidence/part-0a-baseline.txt) |
| Allowed dirty state under the amended rule | CONFIRMED | The routes and root-params imports match HEAD after removing the generated development path segment. [Programmatic check](editor/evidence/part-0a-amended-check.txt) · [Original diff](editor/evidence/part-0a-next-env.diff) |
| Commit inventory and safety-sensitive review list | CONFIRMED | One commit, `955007d` by Abhishek S B, upgraded Next.js. Four files changed, with 47 insertions and 44 deletions. Zero UNREVIEWED commits touched the specified safety-sensitive paths. [Inventory](editor/evidence/part-0b-commit-inventory.txt) |
| Archive TypeScript and production build | CONFIRMED | Ran `next typegen` before `npx --no-install tsc --noEmit` to generate the route declarations in the fresh archive. TypeScript and `npm run build` exited 0. The archive omitted the tracked `.env.example`. [TypeScript](editor/evidence/part-0c-tsc.txt) · [Build](editor/evidence/part-0c-build.txt) |
| Production Chromium smoke | CONFIRMED | `/studio` returned 200, the token reached the browser, nudge preview returned 200, and Apply returned 200. The only source change in the archive fixture was `ml-2.5` to `ml-3`. [Passing run](editor/evidence/part-0c-studio-rerun.txt) |
| Safety battery | CONFIRMED | All 23 suites passed on the unchanged engine baseline. [Results](editor/evidence/part-0c-battery-results.json) · [Reorder](editor/evidence/part-0c-reorder-safety.txt) |
| Before-and-after real-state integrity | CONFIRMED | The real history and fixture SHA-256 hashes and porcelain snapshots matched before and after each of the five runs. The history hash already differed from the guard’s expected value in the initial snapshot. [Initial snapshot](editor/evidence/part-0c-tsc-state-before.txt) · [Guard before](editor/evidence/part-0c-real-state-guard-state-before.txt) · [Guard after](editor/evidence/part-0c-real-state-guard-state-after.txt) |

Part 0 is CONFIRMED complete under Amendment 3. The guard correction is committed as `6cadd06`. The next item is Part 1a.

The first smoke runner assumed the nudge HTTP response contained the full old and new class strings. The response returns the changed tokens, and the full strings are in the saved preview. The rerun read those strings from the archive’s preview record and retained the assertions. [First run](editor/evidence/part-0c-studio.txt) · [Runner](editor/evidence/part-0c-smoke.mjs)

## Baseline battery

| Suite | Result | Evidence |
| --- | --- | --- |
| reorder-safety | CONFIRMED | [Output](editor/evidence/part-0c-reorder-safety.txt) · [Before](editor/evidence/part-0c-reorder-safety-before.json) · [After](editor/evidence/part-0c-reorder-safety-after.json) |
| adapter | CONFIRMED | [Output](editor/evidence/part-0c-adapter.txt) · [Before](editor/evidence/part-0c-adapter-before.json) · [After](editor/evidence/part-0c-adapter-after.json) |
| history-resilience | CONFIRMED | [Output](editor/evidence/part-0c-history-resilience.txt) · [Before](editor/evidence/part-0c-history-resilience-before.json) · [After](editor/evidence/part-0c-history-resilience-after.json) |
| s1-auth-origin | CONFIRMED | [Output](editor/evidence/part-0c-s1-auth-origin.txt) · [Before](editor/evidence/part-0c-s1-auth-origin-before.json) · [After](editor/evidence/part-0c-s1-auth-origin-after.json) |
| s1-auth-bypass | CONFIRMED | [Output](editor/evidence/part-0c-s1-auth-bypass.txt) · [Before](editor/evidence/part-0c-s1-auth-bypass-before.json) · [After](editor/evidence/part-0c-s1-auth-bypass-after.json) |
| s2-path-traversal | CONFIRMED | [Output](editor/evidence/part-0c-s2-path-traversal.txt) · [Before](editor/evidence/part-0c-s2-path-traversal-before.json) · [After](editor/evidence/part-0c-s2-path-traversal-after.json) |
| s3-atomic-write | CONFIRMED | [Output](editor/evidence/part-0c-s3-atomic-write.txt) · [Before](editor/evidence/part-0c-s3-atomic-write-before.json) · [After](editor/evidence/part-0c-s3-atomic-write-after.json) |
| s5-tailwind-compile | CONFIRMED | [Output](editor/evidence/part-0c-s5-tailwind-compile.txt) · [Before](editor/evidence/part-0c-s5-tailwind-compile-before.json) · [After](editor/evidence/part-0c-s5-tailwind-compile-after.json) |
| s5-theme-support | CONFIRMED | [Output](editor/evidence/part-0c-s5-theme-support.txt) · [Before](editor/evidence/part-0c-s5-theme-support-before.json) · [After](editor/evidence/part-0c-s5-theme-support-after.json) |
| s5-v3-support | CONFIRMED | [Output](editor/evidence/part-0c-s5-v3-support.txt) · [Before](editor/evidence/part-0c-s5-v3-support-before.json) · [After](editor/evidence/part-0c-s5-v3-support-after.json) |
| test-override-guard | CONFIRMED | [Output](editor/evidence/part-0c-test-override-guard.txt) · [Before](editor/evidence/part-0c-test-override-guard-before.json) · [After](editor/evidence/part-0c-test-override-guard-after.json) |
| prewrite-hook-guard | CONFIRMED | [Output](editor/evidence/part-0c-prewrite-hook-guard.txt) · [Before](editor/evidence/part-0c-prewrite-hook-guard-before.json) · [After](editor/evidence/part-0c-prewrite-hook-guard-after.json) |
| m5-containment-helper | CONFIRMED | [Output](editor/evidence/part-0c-m5-containment-helper.txt) · [Before](editor/evidence/part-0c-m5-containment-helper-before.json) · [After](editor/evidence/part-0c-m5-containment-helper-after.json) |
| token-undo | CONFIRMED | [Output](editor/evidence/part-0c-token-undo.txt) · [Before](editor/evidence/part-0c-token-undo-before.json) · [After](editor/evidence/part-0c-token-undo-after.json) |
| token-html-host | CONFIRMED | [Output](editor/evidence/part-0c-token-html-host.txt) · [Before](editor/evidence/part-0c-token-html-host-before.json) · [After](editor/evidence/part-0c-token-html-host-after.json) |
| undo-refusals | CONFIRMED | [Output](editor/evidence/part-0c-undo-refusals.txt) · [Before](editor/evidence/part-0c-undo-refusals-before.json) · [After](editor/evidence/part-0c-undo-refusals-after.json) |
| undo-m3-restored-token | CONFIRMED | [Output](editor/evidence/part-0c-undo-m3-restored-token.txt) · [Before](editor/evidence/part-0c-undo-m3-restored-token-before.json) · [After](editor/evidence/part-0c-undo-m3-restored-token-after.json) |
| undo-m5-parent-junction | CONFIRMED | [Output](editor/evidence/part-0c-undo-m5-parent-junction.txt) · [Before](editor/evidence/part-0c-undo-m5-parent-junction-before.json) · [After](editor/evidence/part-0c-undo-m5-parent-junction-after.json) |
| fixtures | CONFIRMED | [Output](editor/evidence/part-0c-fixtures.txt) · [Before](editor/evidence/part-0c-fixtures-before.json) · [After](editor/evidence/part-0c-fixtures-after.json) |
| m0-regression | CONFIRMED | [Output](editor/evidence/part-0c-m0-regression.txt) · [Before](editor/evidence/part-0c-m0-regression-before.json) · [After](editor/evidence/part-0c-m0-regression-after.json) |
| m0-overfit | CONFIRMED | [Output](editor/evidence/part-0c-m0-overfit.txt) · [Before](editor/evidence/part-0c-m0-overfit-before.json) · [After](editor/evidence/part-0c-m0-overfit-after.json) |
| real-state-guard-v2 | CONFIRMED | [Output](editor/evidence/part-0c-real-state-guard-v2.txt) · [Before](editor/evidence/part-0c-real-state-guard-v2-before.json) · [After](editor/evidence/part-0c-real-state-guard-v2-after.json) |
| undo-stacked-edits | CONFIRMED | [Output](editor/evidence/part-0c-undo-stacked-edits-resumed.txt) · [Before](editor/evidence/part-0c-undo-stacked-edits-resumed-before.json) · [After](editor/evidence/part-0c-undo-stacked-edits-resumed-after.json) |

The stacked suite passed 300 seeded cases with seed base 771234 in 779.8 seconds. M0 regression passed 30 selections with 18 allowed, 12 refused and zero wrong targets. M0 overfit passed 30 selections with 26 allowed, 4 refused and zero wrong targets. TypeScript passed again after the guard correction. [TypeScript](editor/evidence/amendment-3-typecheck.txt)

## Part 1a — Write-time comparison

CONFIRMED. Apply now re-reads the file after Tailwind and parse verification, the guarded pre-write hook, and the containment check, immediately before the source write. Both exact and token undo re-read immediately before their source writes and restore the history status to applied on refusal. The external file content survives and undo remains retryable.

The three new regression cases failed against the unchanged engine and passed after the implementation. The suite completed in 1.3 seconds. [Raw red](editor/evidence/part-1a-cas-red.txt) · [Pass](editor/evidence/part-1a-cas-green.txt)

| Removed comparison | Killing test | Evidence |
| --- | --- | --- |
| Apply | Apply preserves an external edit inserted after verification, without history or temporary source files | [Assertion failure](editor/evidence/part-1a-mutant-cas-apply.txt) |
| Exact undo | Exact undo preserves a concurrent edit and remains retryable | [Assertion failure](editor/evidence/part-1a-mutant-cas-undo-exact.txt) |
| Token undo | Token undo preserves a concurrent edit and remains retryable | [Assertion failure](editor/evidence/part-1a-mutant-cas-undo-token.txt) |

CONFIRMED. History resilience, the hook production guard, parent-junction containment, token undo, undo refusals, restored-token refusal and TypeScript passed with the fix. All protected-state snapshots matched. Windows file symlink privilege remains UNVERIFIED, as the existing containment suite reports. [History](editor/evidence/part-1a-regression-history-resilience.txt) · [Hook guard](editor/evidence/part-1a-regression-prewrite-hook-guard.txt) · [Containment](editor/evidence/part-1a-regression-undo-m5-parent-junction.txt) · [Token undo](editor/evidence/part-1a-regression-token-undo.txt) · [Refusals](editor/evidence/part-1a-regression-undo-refusals.txt) · [Restored token](editor/evidence/part-1a-regression-undo-m3-restored-token.txt) · [TypeScript](editor/evidence/part-1a-regression-typecheck.txt)

## Part 1b — Conditional ancestor characterization

CONFIRMED. Eight cases cover ternary, logical AND, if-statement ancestors and a component used once. Every unchanged file applies and undoes byte-identically. After an unrelated external text edit, the three conditional contexts refuse with file, line and exact token restoration instructions, preserve the external bytes, and keep the history record retryable. The once-used component completes token undo while preserving the external text. A same-class sibling is checked to catch wrong-target changes. The suite completed in 1.9 seconds. [Characterization](editor/evidence/part-1b-conditional-characterization.txt)

No behavior change was required for conditional ancestors because these tests exposed neither a wrong target nor a stuck state. This characterization passed on its initial run. An initial TypeScript check identified two optional assertion-message arguments, which were given fallback messages without changing the asserted conditions. TypeScript then passed. [Initial type output](editor/evidence/part-1b-typecheck.txt) · [TypeScript pass](editor/evidence/part-1b-typecheck-fixed.txt)

Part 1a is committed as `1b93d2b`. The implementation changes only the three write-time comparisons and undo-status restoration on refusal.

## Parts 2–6

UNVERIFIED. Overlay polish, UI test infrastructure, controls, real-site validation and the closing gate remain pending. Tag `pre-sprint1` was created on baseline `955007d` and branch `feat/editor-sprint1` was created under Amendment 2. The helper work initially landed in `b96f47c` and is complete after the Amendment 3 correction.

## Amendment 2

CONFIRMED. The read-only history diagnosis found an existing 477499-byte JSON file with 100 records. Its mtime was 2026-11-03T19:53:12.8131000Z. Two observations 142 seconds apart matched in size, mtime and SHA-256 `cbd243197fa766dae2553e1b6d63dc8088b3d71a7f0132cd70f79b73474ac97a`. The path histogram was `fixtures/ 99`, `scratch/ 1`, `other temp-looking paths 0`, `other 0`. No records pointed outside fixtures and scratch. The process inventory found no listener on port 3000, so there was no port-3000 process start time to compare to the file mtime. Normal editor activity is the most likely cause of the old hash discrepancy, UNVERIFIED. [Diagnosis and process inventory](editor/evidence/amendment-2-history-diagnosis.txt)

real-state-guard (v1): SUPERSEDED, reason: compared mutable developer data to a fixed hash; v1 left unchanged for history.

CONFIRMED. The v2 guard failed with a missing-helper module error before implementation. After implementation, its tracked-modification check and helper self-test passed. The self-test detects modification, deletion, creation, metadata changes, mutable history changes and status-list changes in a temporary directory. The fixture-to-HEAD assertion failed on the first fixture. All five fixture worktree files use CRLF and HEAD uses LF, with identical normalized content. This is a raw-byte mismatch under Amendment 2. The initial attempt lacked a full pass. Amendment 3 superseded the raw-byte assertion, and all three checks now pass. [Initial red](editor/evidence/amendment-2-guard-red.txt) · [Post-implementation result](editor/evidence/amendment-2-guard-green.txt) · [Byte diagnosis](editor/evidence/amendment-2-fixture-byte-diagnosis.txt)

CONFIRMED. Both new runs preserved the protected state. The first run used read-only bootstrap snapshots because the helper was required to be absent. The post-implementation run used the new helper, which records SHA-256, size and mtime for the history file and recursively for fixtures, and compares Git status after checking the generated-import exception. [Helper snapshot before](editor/evidence/amendment-2-guard-green-before.json) · [After](editor/evidence/amendment-2-guard-green-after.json)

The previously pending suites, now all passed, were reorder-safety, adapter, history-resilience, s1-auth-origin, s1-auth-bypass, s2-path-traversal, s3-atomic-write, s5-tailwind-compile, s5-theme-support, s5-v3-support, test-override-guard, prewrite-hook-guard, m5-containment-helper, token-undo, token-html-host, undo-refusals, undo-m3-restored-token, undo-m5-parent-junction, undo-stacked-edits, fixtures, m0-regression and m0-overfit.

## Amendment 3

CONFIRMED. The v2 guard compares fixture content with HEAD after normalizing CRLF to LF on both sides and independently requires clean Git status for fixtures. Its tracked-modification check and temporary helper self-test remain in place. The real-state snapshot helper is unchanged and continues to compare raw bytes, size and mtime between observations. All three checks passed in an isolated archive with the amended test applied. The previous incomplete work is complete. [Pass and protected-state result](editor/evidence/amendment-3-guard-pass-retry.txt)

## Noticed but not fixed

The production build emitted webpack warnings about parsing the `module.createRequire` argument in `lib/slightnudge/tailwind-verifier.ts`. [Build output](editor/evidence/part-0c-build.txt)

The prior Git archive omitted the tracked `.env.example`. Its contents were not read. [Archive log](editor/evidence/part-0c-workspace.txt)

CONFIRMED. The first Amendment 3 isolated guard run used core.autocrlf=false while its source archive reflected the Windows checkout setting. This produced spurious dirty-file assertions across the archive. The isolation runner now matches core.autocrlf=true, and the unchanged assertions pass. This environment discrepancy is resolved without a sprint stop under Amendment 3. [First output](editor/evidence/amendment-3-guard-pass.txt) · [Passing rerun](editor/evidence/amendment-3-guard-pass-retry.txt)

The battery wrapper initially treated the text P0 in the passing token/Host suite title as a failure marker. Matching only the outer snapshot failure marker corrected that orchestration error. The existing stacked-edit suite exceeded the wrapper’s 180-second cap. Both interrupted copies were removed, their recovery snapshots matched, and the unchanged suite passed with the wrapper cap removed. No suite assertion or internal timeout was changed. [Recovery](editor/evidence/part-0c-stacked-wrapper-recovery.txt)

## Cleanup

Removed one temporary root and its archive, workspace, dependency junction and browser scratch directory. Stopped both production servers on ports 57403 and 65187 and confirmed neither port was listening. No external repositories were cloned. [Workspace and cleanup log](editor/evidence/part-0c-workspace.txt)

The v2 helper self-test created and removed one temporary directory with prefix `sn-real-state-self-test-`. The generated suffix of that temporary directory was not captured in the test output. No servers or clones were created during Amendment 2.

All Amendment 3 isolation roots were confirmed absent after cleanup, including archive sources, dependency junctions and nested temporary directories. [Root inventory](editor/evidence/part-0c-cleanup-summary.json)

## What I did NOT verify

The writer responsible for the historical history-file change, and All implementation and verification work in Parts 2–6, including the full gate on the final branch tip.
