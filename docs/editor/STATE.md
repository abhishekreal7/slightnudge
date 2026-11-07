# Editor Sprint 1 state

## Done

- The original sprint brief and amendments 1–4 are saved in [BRIEF.md](BRIEF.md).
- Part 0a, CONFIRMED under Amendment 1. Both changed imports in `next-env.d.ts` match HEAD after removing the development path segment. The baseline was `955007d231d7da7783c6d3222ea2942be03eafb4`. [Programmatic check](evidence/part-0a-amended-check.txt)
- Part 0b, CONFIRMED. The original range contained one Next.js dependency upgrade. Zero commits touched the designated sensitive paths. [Inventory](evidence/part-0b-commit-inventory.txt)
- Part 0c, CONFIRMED for the prior TypeScript, production build and browser smoke. Chromium received the token and applied a nudge in the archive. [TypeScript](evidence/part-0c-tsc.txt) Â· [Build](evidence/part-0c-build.txt) Â· [Smoke](evidence/part-0c-studio-rerun.txt)
- Amendment 2 diagnosis, CONFIRMED. The history file parses as 100 records. Its 477499 bytes, mtime and hash matched across observations 142 seconds apart. There are 99 fixture paths and one scratch path. No records point outside those prefixes. Port 3000 had no listener. Normal editor activity is the most likely cause of the old hash discrepancy, UNVERIFIED. [Diagnosis and process inventory](evidence/amendment-2-history-diagnosis.txt)
- Amendment 2 branch setup, CONFIRMED. Tag `pre-sprint1` points to the baseline and all subsequent work is on `feat/editor-sprint1`. [Branch log](evidence/amendment-2-branch.txt)
- real-state-guard (v1): SUPERSEDED, reason: compared mutable developer data to a fixed hash; v1 left unchanged for history.
- Dynamic guard implementation, CONFIRMED after Amendment 3. The v2 test first failed because the helper was absent. After implementation, the tracked-modification check and temporary helper self-test passed. The original raw fixture hash assertion was superseded by Amendment 3. All three v2 checks now pass with CRLF normalization and a separate clean-fixture Git check. [Pass](evidence/amendment-3-guard-pass-retry.txt) [Expected red](evidence/amendment-2-guard-red.txt) Â· [Post-implementation run](evidence/amendment-2-guard-green.txt)
- Fixture byte diagnosis, CONFIRMED. All five fixtures have CRLF in the worktree and LF in HEAD. Their bytes match after CRLF normalization, and Git reports the fixtures clean. The raw-byte equality required by Amendment 2 fails. [Byte comparison](evidence/amendment-2-fixture-byte-diagnosis.txt)
- Protected-state integrity, CONFIRMED. The red bootstrap snapshots and the helper-based post-implementation snapshots match. The bootstrap red run used a read-only PowerShell snapshot because the required helper did not exist yet. [Helper before](evidence/amendment-2-guard-green-before.json) Â· [Helper after](evidence/amendment-2-guard-green-after.json)

- Part 1a, CONFIRMED complete. Apply and both undo write paths re-compare reviewed bytes at write time. Three red tests now pass, all three comparison-removal mutants were killed, six targeted regression suites and TypeScript passed. [Red](evidence/part-1a-cas-red.txt) Â· [Pass](evidence/part-1a-cas-green.txt)

- Part 1, CONFIRMED complete. Eight conditional-ancestor cases passed, with byte-identical exact undo, safe manual refusals and successful token undo for a once-used component. TypeScript passed. Part 1a is committed as `1b93d2b`. [Characterization](evidence/part-1b-conditional-characterization.txt)

- Part 1 checkpoint is committed as `faea178`. A final v2 run against the real worktree passed. All helper snapshot pairs matched and all isolation roots were removed. [Audit](evidence/through-part-1-audit.json) Â· [Cleanup](evidence/through-part-1-cleanup.json)

- Part 2a, CONFIRMED complete in commit `50e2d69`. Both editors pass ten overlay contract tests with eighteen pixelmatch baselines, plus the refused-drop transform regression, final TypeScript and production build. All thirteen protected-state snapshot pairs matched, and the real-worktree v2 guard passed after commit. [Guard](evidence/part-2a-real-state-final.txt) Â· [Proof](evidence/part-2a-overlay-verified.txt) Â· [Cleanup](evidence/part-2a-cleanup.json)

- Part 2b, CONFIRMED complete in `fa2d69c`. Both former playground Apply buttons posted the same preview ID to the same save route; only the floating button remains. Both editors pass Control/Meta Apply and exact-byte Undo plus Escape discard (six cases; one timeout passed unchanged on isolated rerun). TypeScript and the post-commit real-state v2 guard passed. [Guard](evidence/part-2b-real-state-final.txt) · [Proof](evidence/part-2b-green-independent.txt) · [Rerun](evidence/part-2b-control-rerun.txt) · [Before](evidence/screens/part-2b-before.png) · [After](evidence/screens/part-2b-after.png)

## Next

AMENDMENT 4 wins: A performance measurement and fixes, B preview correctness, C design consistency, D Part 2c, Part 3, controls wave 1, Parts 5–6. Parts 0, 1, 2a and 2b remain complete. The complete Amendment 4 request is appended verbatim to BRIEF.md.

A1 is **INCOMPLETE**. The synthetic library harness and its tests are saved; eight cells of 20 readHistory attempts have been measured. The 608 MB history failed all 20 reads with ERR_STRING_TOO_LONG. No speedup or end-to-end UI baseline is claimed. [Numbers, limitations and exact resume commands](perf/baseline.md).

Resume A1 browser/server instrumentation and the full dev/production scenario matrix, then A2 budgets, measured-impact A3 fixes and A4 proofs. Do not optimize without a before number, add timing gates before five stable runs, or weaken a safety check. The newer UI is in the stage/S1 worktree; do not attribute legacy sprint-branch measurements to it. Reconciliation remains pending under the original no-merge/work-on-sprint-branch constraints. No old UI files have been removed.

```powershell
Set-Location -LiteralPath 'C:\dev\vibecheck'
Get-Content docs/editor/BRIEF.md,docs/editor/STATE.md,docs/editor/perf/baseline.md -Raw
node --import tsx scratch/editor-sprint1-run-group.ts amendment4-fixtures-resume node --import tsx --test test/perf-fixtures.test.ts
```

Then implement the remaining A1 collectors and run the matrix in isolated sources on free ports, with helper snapshots for each group. Every visible UI change still needs before/after PNGs under docs/editor/evidence/screens/. A3 delayed-save and continuous-edit proofs and video, B exact DOM preview restoration, C design-system audit and screenshots, D and Parts 5–6 are pending. Original final gate/battery commands remain in BRIEF.md and prior evidence; use v2 real-state guard, never v1. No new dependencies or product instrumentation were added in this checkpoint.

## Open issues

- The prior CRLF block is resolved. An initial archive setup used core.autocrlf=false and was corrected to match the source environment.
- The helper and v2 guard passed all three checks, and archive TypeScript verification passed.
- The build emitted webpack warnings about `module.createRequire` in `tailwind-verifier.ts`.
- The prior archive omitted tracked `.env.example` to avoid reading it.
- The source editor can replace the DOM className with a single token during nudge preview. Preserve the pending-source transaction and address the preview styling discrepancy in Amendment 4 B, after the performance workstream.
- Run `git diff --cached --name-only` before every sprint commit and confirm that `next-env.d.ts` is absent.

- Continuous editing after dev refresh is UNVERIFIED: chained post-Undo selection/preview timeouts remain recorded; independent shortcut cases passed. Investigate during the Part 2c reload work.

- Amendment 4 A1 checkpoint: INCOMPLETE. Synthetic readHistory measurements saved (20 attempts x 8 cells), fixture tests red then green, protected snapshots unchanged. See perf/baseline.md.
