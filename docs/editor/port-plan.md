# Deliberate safety port to stage/S1

Read-only source analysis at stage/S1 `7a4c44a9b8a1c1b08d0c8d15541dabb1900636df`. No commands below were executed against its worktree, no live server was contacted, and no port was performed. The newer `/editor` is the owner's chosen UI. Legacy `/studio` UI work is frozen.

| Sprint safety item | stage/S1 source already present | Difference / port risk | Tests to carry and retain |
| --- | --- | --- | --- |
| Apply write-time CAS | `edit-history.ts:applyPendingSourceEdit`, `invokePreWriteHook`, `assertWriteTargetInsideWorkspace` compare current bytes to pending.before at the write boundary | S1 also has draft/repository scope, receipts, group journals and history locking. Preserve these; do not replace its Apply implementation with the older sprint function. Exact semantic equivalence still needs tests. | sprint `prewrite-cas.test.ts`, all three CAS mutants; S1 `apply-review-race.test.ts`, `apply-crash-recovery.test.ts`, `apply-outcome.test.ts` |
| Apply/Undo status handling | `getSourceApplyOutcome`, `getSourceUndoOutcome`, `undoReviewedSourceEdit`, Apply/Undo status routes, `studio-recovery.ts` | Sprint UI clearing pending state is not a replacement for receipts or recovery. Storage changes must preserve operation IDs and recorded outcomes. | S1 `apply-client-recovery.test.ts`, `apply-denial.test.ts`, `undo-client-recovery.test.ts`, `undo-recovery.test.ts`, `studio-recovery.test.ts` |
| Undo write-time re-compare | `edit-history.ts:undoSourceEdit` calls a guarded prewrite hook, validates dependencies and containment, compares current to reviewed before, and restores applied status on refusal | S1 stores undoBefore/undoAfter and later uses them in status/recovery. Carry new assertions to both exact and token paths rather than overwriting state logic. | sprint `prewrite-cas.test.ts`, `token-undo.test.ts`, `undo-m3-restored-token.test.ts`, `undo-stacked-edits.test.ts`; S1 recovery suites |
| Token/Host/Origin | `auth.ts:validateMutatingRequest`, `timingSafeEqualStrings`, `isRequestHostAllowed`, `getSessionToken` | S1 rejects missing Origin even with a token, has removed process-name auth bypass and test session-token override. Keep stricter behavior; adapt test requests with valid headers, never restore bypasses. | `s1-auth-origin.test.ts`, `s1-auth-bypass.test.ts`, `token-html-host.test.ts`, existing S1 auth tests |
| Test override guards | `edit-history.ts:isTestMode`, `getWorkspacePath`, `getHistoryPath` require TEST=1 and nonproduction | New store resolver/adapter must preserve this conjunction. Primitive explicit-root I/O has no implicit production resolver yet. No test overrides may affect production. | `test-override-guard.test.ts`, `prewrite-hook-guard.test.ts`, new store override and production-inert tests (pending) |
| Containment | `edit-history.ts:assertWriteTargetInsideWorkspace`; `source-paths.ts:canonicalFile`, `assertSourceScope`; repository scope resolution | S1 has additional project/component dependency checks. Store containment cannot replace source containment. Keep both at the correct boundaries, including symlink/reparse handling. | `m5-containment-helper.test.ts`, `undo-m5-parent-junction.test.ts`, repository containment suites; new store path/blob tamper tests |
| Conditional/conflict ancestor characterization | `edit-history.ts:undoSourceEdit` refuses token Undo in conditional expressions, binary &&/|| and if statements and checks repeated components/loops | Similar refusal code does not prove the eight sprint cases or retry semantics. Preserve S1 scopes and compare exact restore, safe refusal and retry behavior with the characterization oracle. | `conditional-undo-characterization.test.ts`, `undo-refusals.test.ts`, `token-undo.test.ts` |
| store-v2 | S1 still exposes array-shaped `readHistory`/`writeHistory`; `withHistoryMutation` uses `withSourceOperationLock`. No approved v2 blob/page/mode implementation is proven in S1. | This sprint has only unwired blob/I/O primitives so far. Do not port them as a completed store. Finish metadata/mode/migration/intents, privacy, mutants, compatibility and before/after baselines first. Preserve S1 extra record metadata. | `history-store-blobs.test.ts` plus future complete store contracts, migration/intent/mode tests; unchanged history/Undo/atomic/containment suites and complete battery |

Source observations are CONFIRMED; behavioral equivalence, integration and post-port numbers are UNVERIFIED. Test names in the table refer to existing files unless explicitly marked pending. A path may already exist in both lines: inspect and extend its assertions rather than overwriting it or weakening it.

## Coordination and ordering

1. Create an independent integration worktree only in the later authorized session. Record its exact source tip and run its own clean baseline before changes.
2. Carry the dynamic real-state guard/helper (CRLF-normalized HEAD fixture checks, raw same-machine before/after snapshots), CAS characterization and override/containment test intent first. Keep S1's stricter auth and its own recovery/status tests.
3. Verify write-time CAS and Undo re-compare semantics; patch only measured gaps, under S1's source-operation and history-mutation locks. Retain scopes, dependency validation, journals and receipts.
4. Port the fully validated self-contained store and compatibility adapter after it is complete here. Freeze legacy writers during consented migration; activate only after migration and recovery tests pass. Then run full safety, privacy and migration tests in disposable workspaces before any real migration proposal.
5. Execute the approved UI work on the newer editor only: B preview correctness, C design, D-UI and browser-side performance measurements. Establish a port plan for free disposable ports first; never use owner's live servers for tests.

Store mode is a cross-version coordination requirement. Every cooperating writer must take the same mutation lock, inspect the activation manifest mode and honor the sibling migrated-to-v2 marker. An unmodified old binary cannot be forced to honor that marker; do not run it as a writer after activation. Preserve the immutable legacy file, and explain that old readers cannot see v2 edits.

S1 already has `source-operation-lock.ts:withSourceOperationLock`, `source-group-journal.ts:guardUnfinishedGroups/readGroupJournal` and per-operation recovery metadata. Map the store mutation lock onto one documented lock authority and lock order; do not nest two non-reentrant locks for the same resource or create two unrelated intent journals deciding the same operation. Proposed order is validated source-operation scope, then bounded store mutation; never acquire source locks while holding store mutation. Multi-file group operations need deterministic source-lock ordering. Audit existing group/recovery call chains before choosing the final mapping. The new eight-intent cap must account for active group members and cannot evict or hide S1's unfinished journals.

## Exact worktree creation commands (proposal only)

Run these only in the future port session after checking the captured stage tip is still intended. These create a new branch and checkout, leaving the existing stage/S1 worktree unchanged. Refuse rather than reuse any existing path or branch.

```powershell
Set-Location -LiteralPath 'C:\dev\vibecheck'
$portDirectory = 'C:\dev\vibecheck\scratch\editor-safety-port-20261108'
$portBranch = 'codex/editor-safety-port-20261108'
if (Test-Path -LiteralPath $portDirectory) { throw 'Port directory already exists' }
git show-ref --verify --quiet "refs/heads/$portBranch"
if ($LASTEXITCODE -eq 0) { throw 'Port branch already exists' }
git rev-parse stage/S1
git worktree add -b $portBranch $portDirectory stage/S1
git -C $portDirectory status --short
git -C $portDirectory log -1 --oneline
```

No merge, rebase, branch deletion, checkout of existing worktrees, environment-file copy or blind cherry-pick is part of this plan. The existing stage/S1 uncommitted work and live servers remain untouched.
