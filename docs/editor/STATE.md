# Editor Sprint 1 state

## Done

- The original sprint brief and amendments 1–9 are saved in [BRIEF.md](BRIEF.md).
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

Amendment 9 items 2–4 COMPLETE at the clean engine/typing checkpoint. Only raw proof of a violated safety property stops work; setup/typing/environment failures stay BASELINE DEFECTs. Work only in C:/dev/vibecheck/scratch/editor-safety-port-20261108, branch codex/editor-safety-port-20261108, current tip 33feb48. Original stage/S1, developer history records and pre-existing servers remain untouched.

- Fixture triage/repair COMPLETE, 8c61361: scoped crash fixture now generates its managed root/registry; original assertions and expected exit 73 unchanged; full suite passes. [Diagnosis](evidence/amendment9-fixture-triage.txt)
- Selected engine/recovery baseline COMPLETE: 53 passing suites including repaired crash/race, nine reproduced BASELINE DEFECTs, zero demonstrated safety violations; 28 browser/lab/live-URL baseline candidates deferred. All 300 randomized stacked-Undo cases pass. Six deferred bridge suites later pass as typing validation. [90-candidate results and raw failures](perf/s1-baseline.md)
- EventTarget focus typing COMPLETE, ed11f8a: HTML pointer target; remaining diagnostics 55; drag/direct-manipulation pass.
- Readonly NODE_ENV typing COMPLETE, cd08451: typed mutable environment record in tests; remaining diagnostics 46; account/production and S1/S2/S3 proofs pass. Historical formatter script has a recorded missing-tool setup defect.
- Optional-value typing COMPLETE, 6037c3f: require draft patches and supply diagnostic-message fallbacks; remaining diagnostics 26; eight affected direct suites pass, imported-draft's missing-registry defect remains and reproduces.
- Browser-test typing COMPLETE, e86cc17: browser globals, HTML/source-metadata checks, inferred probe return type, browser existence; zero diagnostics; six bridge suites and transformed-iframe coordinate proof pass. Full legacy live-URL/lab workflows remain unrun.
- Unchanged protected-state helper retained, 33feb48. Integration checkout is clean. Fresh committed-HEAD archive TypeScript passes, and the candidate-equivalent literal npm run build passes. [Committed tsc](evidence/amendment9-committed-tsc.txt) · [Build](evidence/amendment9-types-build.txt)

NEXT: Amendment 9 item 5 / Amendment 8 Step 3, dev-first guarded instrumentation and the full 20-run scenario matrix, then production, measured-impact fixes, S1 preview check and videos. **No lag measurement or performance fix has been made.** h2–h9 remain unverified by timing evidence. Store-v2 stays parked; no design or controls work begins here. Do not redo completed baseline or typing groups.

Resume commands (fresh labels; the future guard test must first be created in the integration checkout):

```powershell
Set-Location -LiteralPath 'C:\dev\vibecheck'
git -C scratch/editor-safety-port-20261108 status --short
git -C scratch/editor-safety-port-20261108 log -6 --oneline
# After writing test/perf-stage-guard.test.ts: missing-instrumentation red
node --import tsx scratch/editor-sprint1-run-group.ts amendment9-perf-guard-red node --import tsx scratch/editor-s1-group.ts amendment9-perf-guard-red perf-stage-guard test/perf-stage-guard.test.ts
```

The measurement guard/harness does not yet exist. Implement it test-first with TEST=1/non-production gating and no private output, using the existing isolation/helper wrapper. Do not contact or stop any owner's server, recreate a worktree, modify original stage/S1 or read developer history records. Detailed method, classifications, limitations and exact next scope are in [s1-baseline.md](perf/s1-baseline.md).

Final Amendment 9 checkpoint audit: 208 matching snapshot pairs; 105 named isolation roots removed; zero surviving Node processes referencing those roots. [Audit](evidence/amendment9-audit.json) · [Owned-process audit](evidence/amendment9-owned-process-audit.json).

## Open issues

- The prior CRLF block is resolved. An initial archive setup used core.autocrlf=false and was corrected to match the source environment.
- The helper and v2 guard passed all three checks, and archive TypeScript verification passed.
- The build emitted webpack warnings about `module.createRequire` in `tailwind-verifier.ts`.
- The prior archive omitted tracked `.env.example` to avoid reading it.
- The source editor can replace the DOM className with a single token during nudge preview. Preserve the pending-source transaction and address the preview styling discrepancy in Amendment 4 B, after the performance workstream.
- Run `git diff --cached --name-only` before every sprint commit and confirm that `next-env.d.ts` is absent.

- Continuous editing after dev refresh is UNVERIFIED: chained post-Undo selection/preview timeouts remain recorded; independent shortcut cases passed. Investigate during the Part 2c reload work.

- Amendment 4 A1 checkpoint: INCOMPLETE. Synthetic readHistory measurements saved (20 attempts x 8 cells), fixture tests red then green, protected snapshots unchanged. See perf/baseline.md.

- Amendment 5 Step 1: COMPLETE, source-only UI/engine inventory; Step 2a: design complete, storage implementation and all new-store validation PENDING.
