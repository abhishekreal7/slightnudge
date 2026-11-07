# Store-v2 parked — Amendment 8

Parked at `a4bd2e601986b6d3941f79803ae21ee013331282`; self-contained and unwired. No activation or migration of developer history occurred. This is a parking checkpoint, not a completed storage redesign.

## Complete

- Atomic I/O, verified shared blobs, fixed-code errors and primitive privacy tests: `6a879c4`.
- Amendment 7 item 1, bounded pages/head/locators, cursors, status update, crash boundaries and byte bounds: `55ba7b5`.
- Item 2, store modes, marker and exclusive cross-process lock: `14bfb7d`, completed by `a4bd2e6` (legacy-only manifest before cooperating writes).
- Test files: `test/history-store-blobs.test.ts` (5), `test/history-store-pages.test.ts` (6), `test/history-store-mode.test.ts` (5). Sixteen tests and TypeScript passed. The public module remains unwired to Apply/Undo.

## Why parked

This engine retains at most 100 records on write. The owner's history is reported as 100 records and 477 KB; its contents were not opened for this decision. The synthetic 100-record read median is around 30 ms, which does not establish a cause for multi-second editor stalls. The actual newer-editor symptom takes priority. High-count synthetic limits remain documented evidence, not the diagnosed UI bottleneck.

## Pending items 3–8, verbatim from Amendment 7

3. Operation intents and recovery for apply, exact undo and token undo (cap of 8 pending intents, refuse new writes at the cap with a recoverable error, never evict or hide anything): write an intent (source hashes before and after, blob hashes, pending history update) before the source write; recovery compares the actual source against the before and after hashes and acts only on a proven state, otherwise refuses with plain instructions; interrupted recovery blocks only the affected target. Tests with process-death simulation (guarded pre-write hook and a failing fs adapter) at every point between source write and history publish, for apply, exact undo and token undo, then reopen and recover.
4. Compatibility adapter exposing readHistory-shaped and writeHistory-shaped functions for the existing engine, with explicit warnings in code comments that the full materialization is the expensive compatibility path. Wire it into Apply and Undo of THIS branch's engine only if the diff to edit-history.ts stays small and every existing history, undo, containment, atomic-write and store suite passes unchanged; otherwise leave it unwired and say so in STATE.md. Never replace S1-style locks or recovery here (that is the port session's job).
5. Migration: dryRunMigration() (aggregate numbers only) and migrate(consent): streaming top-level JSON array reader that handles chunk boundaries, string escapes and nesting and rejects malformed input without activating anything; builds a new generation in staging; per-record size limits reported as unsupported counts; legacy file fingerprint (size, mtime, streamed sha256) verified before activation; idempotent; the legacy file is never modified. Test on generated temp legacy files including a streamed 600 MB-class case (generate incrementally, delete afterwards), malformed JSON, chunk-boundary cases, crash before activation, and a concurrent legacy writer (migration refuses). migrate() may only ever run against generated temp workspaces in this session.
6. Privacy and tamper tests: no path, hash, size, token, source text or id of a record may appear in any thrown message or log line from the store in any failure test; corrupt hash, missing blob, path escape (including symlink and junction reparse where creatable; mark unverified where Windows privilege is missing), corrupt index. Named mutants, each killed by a named assertion: skip blob hash verification, skip containment on read, write the page or head before the blob, skip the mode check under the lock, skip the intent cap, skip the legacy fingerprint check.
7. Baseline rerun: the same eight cells (20 attempts each) on v2 plus first-append-after-migration (reported separately), steady-state append latency and bytes written, listPage latency; update docs/editor/perf/baseline.md with before and after tables; report honestly any cell that does not improve. Then run the complete safety battery from BRIEF.md Part 0c plus every new store suite, isolated, with snapshots; add the new suites to the battery list in BRIEF.md.
8. Close: update STATE.md and the report: what is complete, the before and after tables, mutant table with named killing tests, the privacy result, the wiring decision and the exact next step. State plainly that this branch's engine work is finished and that every later task (port, preview fix, design pass, controls, browser-side performance) happens in the integration worktree created from stage/S1 per docs/editor/port-plan.md. Do not create that worktree in this session and do not start any other work.

## Resume only if reauthorized

Work remains on feat/editor-sprint1. Do not activate or port the unfinished store. Use a fresh evidence label for each test group:

```powershell
Set-Location -LiteralPath 'C:\dev\vibecheck'
Get-Content docs/editor/STATE.md,docs/editor/history-design.md,docs/editor/store-v2-parked.md -Raw
node --import tsx scratch/editor-sprint1-run-group.ts store-resume-contracts node --import tsx --test test/history-store-blobs.test.ts test/history-store-pages.test.ts test/history-store-mode.test.ts
```

Then resume pending item 3 with failing intent/recovery contracts, rather than rewriting completed items 1–2. Do not contact live servers, access developer history contents or assume this module is safe to wire before its remaining contracts pass.
