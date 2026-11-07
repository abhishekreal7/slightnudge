# Editor Sprint 1 state

## Done

- The original sprint brief and amendments 1–5 are saved in [BRIEF.md](BRIEF.md).
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

Amendment 5 wins. Step 1 UI inventory is complete; recommendation (c) keeps both lines until the owner chooses. No merge/rebase/switch/delete was performed; no live server was contacted or stopped and stage/S1's worktree was not modified. [Inventory](ui-line-inventory.md)

Step 2a history storage design is complete **as a design only**. Step 2 implementation is INCOMPLETE, and no store or source-write behavior has changed. The design covers bounded metadata pages, content-addressed blobs, immutable legacy fallback, streaming/idempotent migration, commit ordering, crash intent recovery, cross-process mutation coordination, skip/report rules and rollback limits. [Design](history-design.md)

Resume Step 2b with failing isolated store contract tests, then implement and wire storage (2c), compare all baseline cells, and run the full unchanged safety battery (2d). Do not start UI work or wait for the owner's UI decision to proceed with the engine. Keep exact restore bytes, token Undo, auth, containment, syntax, Tailwind and write-time CAS checks. Real history and fixtures remain read-only; use the helper around every test group. Never migrate the real legacy file.

```powershell
Set-Location -LiteralPath 'C:\dev\vibecheck'
Get-Content docs/editor/BRIEF.md,docs/editor/STATE.md,docs/editor/history-design.md -Raw
# After creating test/history-store.test.ts, run its expected red with a fresh label:
node --import tsx scratch/editor-sprint1-run-group.ts amendment5-store-red node --import tsx scratch/editor-sprint1-isolate.ts history-store test/history-store.test.ts
```

The proposed test does not exist yet. Its required contracts and named mutation checks are enumerated in history-design.md. Add actual new suites to the final battery when created. After Step 2, proceed with UI-independent Step 3 request timings and Step 4 per-file queue, then stop at the requested boundary. B/C/D and browser performance proofs are deferred until the owner chooses the UI line. The complete Amendment 5 request is appended in BRIEF.md. A1 library baseline remains valid evidence for the legacy engine and is not a newer-UI result.

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
