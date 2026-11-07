# Editor Sprint 1 state

## Done

- The original sprint brief and all three amendments are saved in [BRIEF.md](BRIEF.md).
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

Budget boundary after Part 2b. Resume at the user-promoted **preview correctness fix**, before Part 2c. First write failing browser tests for multi-class token preservation, unchanged unrelated computed styles, pending source as Apply truth, and exact DOM className restoration on Discard and Undo. Cover both editors if affected. Then implement the fix. Parts 0, 1, 2a and 2b are complete; do not redo them.

Continue with Part 2c (single token refresh/retry, real dev and production restart, reload notices and visible Applying/Error copy), Part 3 suite diagnosis/repair and Babel control proofs, Part 4 visible controls first, then Parts 5 and 6 as budget permits. The previous preview issue is promoted from Part 3 to the next item. Every visible UI change needs a small before/after PNG pair under docs/editor/evidence/screens/, linked in the report. Keep Amendment 3, explicit-path commits and helper snapshots in force.

```powershell
Set-Location -LiteralPath 'C:\dev\vibecheck'
Get-Content docs/editor/BRIEF.md,docs/editor/STATE.md -Raw
git branch --show-current
git status --porcelain=v1
rg -n 'preview.newValue|pending.oldValue|className =' components/slightnudge/SlightNudgeOverlay.tsx
rg -n 'newClassName|oldClassName|setPendingEdit' app/studio/page.tsx
```

After creating the next test file, run its red case in isolation (fresh label, explicit new file overlay):

```powershell
node --import tsx scratch/editor-sprint1-run-group.ts preview-correctness-red node --import tsx scratch/editor-sprint1-isolate.ts preview-correctness test/preview-correctness.test.ts
```

Parts 5 and 6 remain pending. At that stage use fresh labels with the same runner; the full gate commands are `node --import tsx scratch/editor-sprint1-isolate.ts typecheck`, `... build`, and `node --import tsx scratch/editor-sprint1-battery.ts`, each wrapped by the protected group runner. Add the new suites to the final battery and follow BRIEF.md for the production browser smoke, real-site controls, mutation checks and cleanup. Never run v1 real-state-guard.

## Open issues

- The prior CRLF block is resolved. An initial archive setup used core.autocrlf=false and was corrected to match the source environment.
- The helper and v2 guard passed all three checks, and archive TypeScript verification passed.
- The build emitted webpack warnings about `module.createRequire` in `tailwind-verifier.ts`.
- The prior archive omitted tracked `.env.example` to avoid reading it.
- The source editor can replace the DOM className with a single token during nudge preview. Preserve the pending-source transaction and address the preview styling discrepancy as the next item, before Part 2c.
- Run `git diff --cached --name-only` before every sprint commit and confirm that `next-env.d.ts` is absent.

- Continuous editing after dev refresh is UNVERIFIED: chained post-Undo selection/preview timeouts remain recorded; independent shortcut cases passed. Investigate during the Part 2c reload work.
