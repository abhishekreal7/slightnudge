# S1 lag baseline — stopped before measurement

## Checkout and scope

New integration worktree: `C:\dev\vibecheck\scratch\editor-safety-port-20261108`.
Branch: `codex/editor-safety-port-20261108`.
Committed baseline: `7a4c44a9b8a1c1b08d0c8d15541dabb1900636df` (stage/S1's committed tip at creation).

The original stage/S1 checkout has five uncommitted entries: two docs, two test, one root entry. Only counts and top-level locations were inspected; no uncommitted file was opened or copied. This baseline excludes that uncommitted work. No live server was contacted or stopped. No existing worktree or branch was switched or modified.

The package and lockfile hashes differ from the main checkout, so npm ci ran in the integration worktree: 124 packages added; npm reported four audit findings (three moderate, one high). No audit fix or dependency change was made. Package/lockfile hashes remain unchanged. [Install](../evidence/amendment8-npm-ci.txt) · [Hashes](../evidence/amendment8-dependency-hashes.json)

## Isolation method

Each check used a fresh git-archive copy of the committed integration HEAD outside the project, a local Git index, and a junction to its installed node_modules. Environment-file paths were excluded from the archive and no environment files were copied manually. The real-state helper was missing in the integration worktree, so the existing helper was copied unchanged as a new untracked file, as authorized. That is the only added source/helper file there. No product or existing test/helper file was edited.

Before/after snapshots cover both the main project and integration checkout. Tests run only against disposable sources/data. No live app URL was queried. This was a clean-tip baseline check, without instrumentation or optimization.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript --noEmit | FAIL, 56 diagnostics before product changes | [Raw tsc](../evidence/amendment8-s1-tsc.txt) |
| Production webpack build | FAIL at type checking after compilation; no type errors suppressed | [Raw build](../evidence/amendment8-s1-build.txt) |
| apply-review-race | PASS, four Apply race cases | [Raw suite](../evidence/amendment8-s1-apply-review-race.txt) |
| apply-crash-recovery | FAIL, expected crash exit 73, actual 1 | [First output](../evidence/amendment8-s1-apply-crash-recovery.txt) |
| Isolated unchanged crash-recovery rerun | FAIL, identical assertion | [Second output](../evidence/amendment8-s1-apply-crash-recovery-retry.txt) |

TypeScript's first product diagnostic is EditorWorkspace.tsx:924: `.focus` does not exist on EventTarget & Element. Other diagnostics include readonly NODE_ENV assignments, optional renderPatches/string values and older browser-test typings. Full raw output is preserved; no tests/assertions were weakened to obtain a build.

The safety failure is `1 !== 73` at test/apply-crash-recovery.test.ts:43, called from its project-scope case at line 113. The child exits before its intended crash point because generated project-scope `.slightnudge/repositories.json` is absent. The stack proceeds through source-paths canonicalFile/registeredProjectRoot/assertSourceScope and pending validation. This is a fixture/setup failure manifested as a reproduced assertion; it is not proof that the intended crash recovery state was exercised. Amendment 3/8 requires stopping on a reproduced baseline safety assertion, so no further suites or product changes were attempted.

The source inventory identifies 90 candidate engine/recovery suites. Two distinct suites were attempted (one rerun). The remaining suites, including lab/browser cases needing owned free-port setup and legacy step2's hard-coded live URL, are UNRUN. V1 real-state-guard stays superseded because it compares mutable developer history to a fixed hash; it was never executed. [Inventory](../evidence/amendment8-suite-inventory.json) · [Progress](../evidence/amendment8-s1-battery-progress.json)

## Protected state and cleanup

All ten protected-file snapshot comparisons (five groups, two checkouts each) match. Integration Git status matched in all five groups. Main status matched in four; the build group's helper flagged my creation of untracked scratch/editor-s1-battery.ts during the build. Its only status difference was that orchestration file, with no tracked source or protected-file change. The raw flag is retained; this orchestration mistake is not represented as a clean full-status comparison.

All five named disposable isolation roots and their nested data/junctions were removed; no disposable server was created. The integration worktree and its installed dependencies are retained for continuation, still at its original committed tip with no product commits. The original owner's status count/top-level breakdown remains the same. [Audit and root inventory](../evidence/amendment8-baseline-audit.json)

## Measurement and next step

The reported lag was **not reproduced or measured**. h2–h9 remain UNVERIFIED; no top-three timing ranking, stage breakdown, delay matrix, performance improvement, budget compliance or before/after video exists. Production measurement is additionally blocked by the baseline build failure. The legacy preview bug has not yet been assessed on this line.

Store-v2 remains parked on feat/editor-sprint1. The current STOP condition must be addressed by direction to repair the committed-tip crash-test setup (without bypassing source scope/containment), then rerun that unchanged safety assertion and the remaining isolated suites. TypeScript/build failures must also be resolved without suppressing checks before the dev/production measurement matrix. Do not recreate or switch existing worktrees. No optimization is authorized without the required baseline numbers.

Existing worktree path and tip are above; rerun only after the STOP condition is resolved with a new evidence label:

```powershell
Set-Location -LiteralPath 'C:\dev\vibecheck'
node --import tsx scratch/editor-sprint1-run-group.ts amendment8-s1-crash-resume node --import tsx scratch/editor-s1-group.ts amendment8-s1-crash-resume apply-crash-recovery test/helpers/real-state.ts
```

## What I did NOT verify

Any uncommitted owner changes, completion of the full S1 baseline suite inventory, build success, the reported stuck interval, dev HMR behavior, stage timings, React/bridge/frame metrics, delayed-save queues, preview correctness or performance fixes. Design and controls were not started.
