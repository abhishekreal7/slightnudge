# M0: recover an interrupted reviewed save

Latest follow-up: [exact-edit Undo and recovery](m0-undo-recovery.md) implements and tests the Undo response-loss slice listed as open below. Remaining gates in this report are historical as of that follow-up.

25 October 2026. Follow-up to [qualification recovery](m0-qualification-recovery.md). This closes the reviewed Apply gap between a source write and its history receipt. M0 remains open for the other foundation gates.

## Implemented behavior

Before writing source, Apply now persists an intent under the editor's existing history directory (`.slightnudge/history/apply-journal`). It contains the approved before/after snapshots, frozen source path, project scope, proposal ID, grouping information, and a fingerprint of that file's history. These are editor recovery records, not metadata added to the user's JSX.

The status endpoint reconciles that intent after a process exits. It never writes a source file:

| Evidence after restart | Result |
| --- | --- |
| Source still equals the reviewed original, with unchanged file history | Mark the intent not applied; retain review for explicit Apply or Discard. Never replay the write during status lookup. |
| Source equals the approved result, with unchanged file history | Reconstruct the missing history receipt once, preserving Undo snapshots and proposal/group identity; clean up recovery metadata. |
| The receipt already exists | Return the existing receipt; do not append history or write source again. |
| Source, frozen path, or relevant history differs | Preserve the journal and outside changes; report recovery required and refuse further writes to that file. |

Ordinary pending-preview expiry and Discard cannot erase an unresolved journal. Recovery also works if the separate pending cache is deleted. A history-write failure no longer triggers an automatic source rollback that could overwrite a later outside edit.

Reviewed Apply rechecks source after validation and journal persistence. It also checks that the pending review still exists while holding the mutation lock, so Discard during validation wins before commit. Studio clears an expired review and unlocks a confirmed unwritten review for an explicit retry; unresolved conflicts remain blocked.

## Mutation exclusion

Reviewed Apply, history recording, Undo, Discard, and journal reconciliation share a synchronous mutation lock on the same history store. Validation remains outside the lock. A competing mutation receives a busy result rather than a hidden write retry.

The lock uses unique ticket files and a non-waiting adaptation of the [bakery algorithm](https://lamport.azurewebsites.net/pubs/bakery.pdf). It does not expire a live owner's lease or delete a reused shared lock pathname. Dead owners can be reclaimed; unknown liveness refuses. The recorded native process origin distinguishes a restarted process reusing its own PID while preserving exclusion between live worker threads. See Node's [process-origin definition](https://raw.githubusercontent.com/nodejs/node/v22.19.0/doc/api/perf_hooks.md).

These guarantees are scoped to a local filesystem and the same host/PID namespace. This is not a distributed lock for multiple hosts or isolated containers sharing a network volume. Reuse of a dead owner's PID by an unrelated still-live process remains a conservative busy condition. Cleanup I/O failures can also require restarting the owner; they do not revoke an accepted receipt or justify overwriting source.

## Evidence

The initial real-process regression exited immediately after source replacement and before history recording. The original implementation could not recover the missing receipt. [Failing baseline](m0-crash-recovery-before.log).

`test/apply-crash-recovery.test.ts` now covers actual child-process exits before source replacement, after source replacement, and after history persistence. It also verifies:

- No automatic replay of an unwritten intent; only a later explicit Apply writes.
- Exactly one accepted receipt and exact Undo after reconciliation.
- Grouped receipt recovery and preservation of accepted changes to other files.
- Refusal after outside source/history changes, without changing those bytes.
- Frozen project/file scope, preview expiry, and loss of the pending cache.
- History I/O failure combined with a later outside edit, without rollback over it.
- Four simultaneous recovery readers producing one accepted history record.

`test/source-operation-lock.test.ts` verifies live-owner exclusion, abrupt owner termination, same-PID restart identity, synchronous nesting, 18 competing processes without overlapping critical sections/lost updates, and live worker-thread exclusion. The worker-thread test caught and corrected an unsafe VM-local owner identity before delivery. [Before correction](m0-thread-lock-before.log).

The [final recovery suite](m0-crash-regression-final.log) passed via `npm run test:recovery`, including client recovery, authorization denial, accepted-outcome idempotence, four Apply race cases, the crash matrix, lock tests, and all 12 existing token-Undo cases. The six existing history-resilience cases also passed during development.

| Browser/compiler evidence | Result |
| --- | --- |
| Source replaced, worker exits before history | 7 real-API cases passed: HTTP status repair, one explicit Apply, one history entry, actual rendered confirmation and exact Undo; [trace](m0-crash-source-traced.log) |
| Worker exits before source replacement; first status response also lost | 7 real-API cases passed: unknown outcome blocks Discard, status proves source unchanged, second explicit Apply writes, one history entry, exact rendered/source Undo; [log](m0-crash-before-browser.log) |
| Worker exits after history persistence, before response/cleanup | 7 real-API cases passed on the final implementation: existing receipt recovered, one history entry, actual rendered confirmation and exact Undo; [log](m0-crash-history-browser.log) |
| Final isolated application typecheck and production build | Both exit 0; [gate log](m0-crash-release-gates.log) |

The browser harness routes an explicit Apply through the actual engine in a disposable child process and exits it at the selected filesystem boundary. The real HTTP status endpoint then performs recovery. It does not stub the source write, history repair, rendered values, or Undo. The main editor process stays alive; this is not a claim that full editor reload restoration is implemented.

One intermediate sample run timed out while preparing its second preview, before crash injection. That failure is retained in [its log](m0-crash-source-final.log); the subsequent traced run passed. Its underlying preview timing issue is not claimed fixed. Early compile failures from inferred result unions were corrected by defining an explicit Apply result contract; a successful result requires a receipt ID. Final compile gates cover the current application and included recovery harness, excluding historical tests and scratch files. Existing Tailwind verifier build warnings remain.

## Reproduce

```powershell
npm run test:recovery
node --import tsx test/review-consent.browser.ts --source-project --crash-apply=source-written --trace-source
node --import tsx test/review-consent.browser.ts --source-project --crash-apply=before-source --defer-apply-status
node --import tsx test/review-consent.browser.ts --source-project --crash-apply=history-written --trace-source
node --import tsx test/review-consent.browser.ts --gates-only
```

`--gates-only` prepares the same disposable application copy and runs typecheck/build without requiring a browser workflow to complete first.

## Remaining gates

Undo response-loss reconciliation and explicit transaction binding, browser-review restoration after a full editor reload, the intermittent preview-preparation failure, wider real-project qualification of this journal implementation, and independent review remain open. This evidence covers process termination; sudden power loss, failing storage, and multi-host filesystems are not qualified. A conflict or unreadable recovery record is preserved for source review, rather than automatically rewritten or discarded. No new visual features or broad framework-support claim is made.

Existing uncommitted work was preserved. No commit, push, or deployment was performed.
