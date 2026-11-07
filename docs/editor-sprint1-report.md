# Editor Sprint 1 report

## Part 0 — Baseline gate

| Check | Result | Evidence |
| --- | --- | --- |
| Required branch, HEAD and tag ancestry | CONFIRMED | `feat/studio-full-controls` at `955007d231d7da7783c6d3222ea2942be03eafb4`. `phase2c1-merged` exists and is an ancestor. [Baseline](editor/evidence/part-0a-baseline.txt) |
| Allowed dirty state under the amended rule | CONFIRMED | The routes and root-params imports match HEAD after removing the generated development path segment. [Programmatic check](editor/evidence/part-0a-amended-check.txt) · [Original diff](editor/evidence/part-0a-next-env.diff) |
| Commit inventory and safety-sensitive review list | CONFIRMED | One commit, `955007d` by Abhishek S B, upgraded Next.js. Four files changed, with 47 insertions and 44 deletions. Zero UNREVIEWED commits touched the specified safety-sensitive paths. [Inventory](editor/evidence/part-0b-commit-inventory.txt) |
| Archive TypeScript and production build | CONFIRMED | Ran `next typegen` before `npx --no-install tsc --noEmit` to generate the route declarations in the fresh archive. TypeScript and `npm run build` exited 0. The archive omitted the tracked `.env.example`. [TypeScript](editor/evidence/part-0c-tsc.txt) · [Build](editor/evidence/part-0c-build.txt) |
| Production Chromium smoke | CONFIRMED | `/studio` returned 200, the token reached the browser, nudge preview returned 200, and Apply returned 200. The only source change in the archive fixture was `ml-2.5` to `ml-3`. [Passing run](editor/evidence/part-0c-studio-rerun.txt) |
| Safety battery | REFUTED | The v1 history hash guard is superseded under Amendment 2. The replacement v2 guard passed two checks and failed raw fixture-to-HEAD byte equality. The other 22 suites remain pending the stop condition. [Raw v2 output](editor/evidence/amendment-2-guard-green.txt) |
| Before-and-after real-state integrity | CONFIRMED | The real history and fixture SHA-256 hashes and porcelain snapshots matched before and after each of the five runs. The history hash already differed from the guard’s expected value in the initial snapshot. [Initial snapshot](editor/evidence/part-0c-tsc-state-before.txt) · [Guard before](editor/evidence/part-0c-real-state-guard-state-before.txt) · [Guard after](editor/evidence/part-0c-real-state-guard-state-after.txt) |

Part 0c is IN PROGRESS under Amendment 3. The dynamic v2 guard is complete and passed all three checks. The remaining battery is next. [Guard pass](editor/evidence/amendment-3-guard-pass-retry.txt)

The first smoke runner assumed the nudge HTTP response contained the full old and new class strings. The response returns the changed tokens, and the full strings are in the saved preview. The rerun read those strings from the archive’s preview record and retained the assertions. [First run](editor/evidence/part-0c-studio.txt) · [Runner](editor/evidence/part-0c-smoke.mjs)

## Parts 1–6

UNVERIFIED. Engine closeouts, overlay polish, test infrastructure, controls, real-site validation and the closing gate are pending Part 0. Tag `pre-sprint1` was created on baseline `955007d` and branch `feat/editor-sprint1` was created under Amendment 2. The helper work initially landed in `b96f47c` and is complete after the Amendment 3 correction.

## Amendment 2

CONFIRMED. The read-only history diagnosis found an existing 477499-byte JSON file with 100 records. Its mtime was 2026-11-03T19:53:12.8131000Z. Two observations 142 seconds apart matched in size, mtime and SHA-256 `cbd243197fa766dae2553e1b6d63dc8088b3d71a7f0132cd70f79b73474ac97a`. The path histogram was `fixtures/ 99`, `scratch/ 1`, `other temp-looking paths 0`, `other 0`. No records pointed outside fixtures and scratch. The process inventory found no listener on port 3000, so there was no port-3000 process start time to compare to the file mtime. Normal editor activity is the most likely cause of the old hash discrepancy, UNVERIFIED. [Diagnosis and process inventory](editor/evidence/amendment-2-history-diagnosis.txt)

real-state-guard (v1): SUPERSEDED, reason: compared mutable developer data to a fixed hash; v1 left unchanged for history.

CONFIRMED. The v2 guard failed with a missing-helper module error before implementation. After implementation, its tracked-modification check and helper self-test passed. The self-test detects modification, deletion, creation, metadata changes, mutable history changes and status-list changes in a temporary directory. The fixture-to-HEAD assertion failed on the first fixture. All five fixture worktree files use CRLF and HEAD uses LF, with identical normalized content. This is a raw-byte mismatch under Amendment 2. The initial attempt lacked a full pass. Amendment 3 superseded the raw-byte assertion, and all three checks now pass. [Initial red](editor/evidence/amendment-2-guard-red.txt) · [Post-implementation result](editor/evidence/amendment-2-guard-green.txt) · [Byte diagnosis](editor/evidence/amendment-2-fixture-byte-diagnosis.txt)

CONFIRMED. Both new runs preserved the protected state. The first run used read-only bootstrap snapshots because the helper was required to be absent. The post-implementation run used the new helper, which records SHA-256, size and mtime for the history file and recursively for fixtures, and compares Git status after checking the generated-import exception. [Helper snapshot before](editor/evidence/amendment-2-guard-green-before.json) · [After](editor/evidence/amendment-2-guard-green-after.json)

The 22 remaining suites are reorder-safety, adapter, history-resilience, s1-auth-origin, s1-auth-bypass, s2-path-traversal, s3-atomic-write, s5-tailwind-compile, s5-theme-support, s5-v3-support, test-override-guard, prewrite-hook-guard, m5-containment-helper, token-undo, token-html-host, undo-refusals, undo-m3-restored-token, undo-m5-parent-junction, undo-stacked-edits, fixtures, m0-regression and m0-overfit.

## Amendment 3

CONFIRMED. The v2 guard compares fixture content with HEAD after normalizing CRLF to LF on both sides and independently requires clean Git status for fixtures. Its tracked-modification check and temporary helper self-test remain in place. The real-state snapshot helper is unchanged and continues to compare raw bytes, size and mtime between observations. All three checks passed in an isolated archive with the amended test applied. The previous incomplete work is complete. [Pass and protected-state result](editor/evidence/amendment-3-guard-pass-retry.txt)

## Noticed but not fixed

The production build emitted webpack warnings about parsing the `module.createRequire` argument in `lib/slightnudge/tailwind-verifier.ts`. [Build output](editor/evidence/part-0c-build.txt)

The prior Git archive omitted the tracked `.env.example`. Its contents were not read. [Archive log](editor/evidence/part-0c-workspace.txt)

CONFIRMED. The first Amendment 3 isolated guard run used core.autocrlf=false while its source archive reflected the Windows checkout setting. This produced spurious dirty-file assertions across the archive. The isolation runner now matches core.autocrlf=true, and the unchanged assertions pass. This environment discrepancy is resolved without a sprint stop under Amendment 3. [First output](editor/evidence/amendment-3-guard-pass.txt) · [Passing rerun](editor/evidence/amendment-3-guard-pass-retry.txt)

## Cleanup

Removed one temporary root and its archive, workspace, dependency junction and browser scratch directory. Stopped both production servers on ports 57403 and 65187 and confirmed neither port was listening. No external repositories were cloned. [Workspace and cleanup log](editor/evidence/part-0c-workspace.txt)

The v2 helper self-test created and removed one temporary directory with prefix `sn-real-state-self-test-`. The generated suffix of that temporary directory was not captured in the test output. No servers or clones were created during Amendment 2.

## What I did NOT verify

TypeScript validation of the new helper, the remaining 22 safety suites, the writer responsible for the historical history-file change, and all implementation and verification work in Parts 1–6.
