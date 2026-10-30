# M0: save outcome recovery

> Follow-up: [qualification and authorization recovery](m0-qualification-recovery.md) records a deterministic qualification failure, its correction, and the latest public-project rerun. Results below describe this earlier slice.

25 October 2026. First implementation slice of [the roadmap](editor-implementation-roadmap.md). M0 is not yet complete.

## Delivered behavior

The current Studio can reconcile an Apply whose server response was lost. A saved edit now retains the reviewed proposal's ID and project/file scope in the existing persistent history. A protected, non-cached status endpoint looks up that accepted operation without writing source.

Repeated Apply requests recover the accepted receipt rather than writing again. An undone edit cannot be replayed. A later outside edit or a later grouped change cannot be mistaken for the originally accepted revision. Concurrent same-process requests awaiting class validation recover one accepted edit and one history entry.

On a transport error or uncertain server response, the Studio client checks the outcome. If it cannot confirm it, review says **Save status unconfirmed**, Discard is disabled, and the action becomes **Check save status**. Checking does not send another Apply. Once confirmed, the existing rendered-revision check and Undo flow continue. Read-only recovery can refresh an expired server-session token. Network waits for Apply, authorization, and status lookup are bounded.

The source renderer and Studio shell are preserved. This work does not add visual features or promote the experimental imported editor.

## Regression evidence

- `test/apply-outcome.test.ts`: the initial repeated-request test failed on the previous implementation because Apply deleted the pending proposal and a retry threw ENOENT. Before/after logs: [before](m0-apply-outcome-before.log), [after](m0-apply-outcome-after.log).
- Expanded coverage verifies duplicate and concurrent requests, a fresh Node process reading the persisted result, exact Undo, grouped history identities, changed source, project/file scope, status authorization/origin checks, and absence of full source snapshots in status responses.
- `test/apply-client-recovery.test.ts`: a dropped Apply response reconciles through status; an unavailable status stays uncertain; authorization can refresh after a server restart; checking status never repeats Apply.
- `test/apply-review-race.test.ts`: 3 existing outside-edit/normal Apply/exact Undo cases passed.
- `test/history-resilience.test.ts`: all 6 existing history cases passed.
- Existing security hardening: 27/27 passed. Source bridge: 21 cases passed. Adapter wrapper: 3 cases passed.
- [First real-browser run](m0-dropped-response-browser.log): a real imported sample was saved, its response deliberately dropped, the first status request also dropped, Discard remained disabled, explicit status lookup recovered the result, only one Apply request was sent, rendered confirmation passed, and Undo restored exact bytes. Application typecheck and production build exited 0 on the disposable copy.

The build reports existing `module.createRequire failed parsing argument` warnings from the Tailwind verifier. A successful build is not a claim that those warnings or every archived test are resolved.

## Real-project qualification

| Run | Result | Interpretation |
| --- | --- | --- |
| Public project 2, initial baseline, Next 14.2.35 / Tailwind 3.4.19 | 30 candidates: 24 allowed, 6 refused, zero wrong targets | Complete baseline pass; [log](m0-public2-baseline.log). Does not erase later failures. |
| Public project 2, with outcome recovery | Stopped after 20 candidates while waiting for Apply navigation | Incomplete and not qualified; [log](m0-public2-qualified.log). Keep this failure visible. |
| Public project 3, Next 14.0.4 / Tailwind 3.4.17 | 30 candidates: 7 allowed, 23 refused, zero wrong targets | Complete scoped run; [log](m0-public3-qualified.log). Refusals are not successful edits. |
| Generated sample, response loss plus six-second document delay | 37 real-API checks passed; 30 candidates: 20 allowed, 10 refused, zero wrong targets; typecheck/build exit 0 | [Evidence](m0-final-source-and-gates.log). Includes automatic status recovery and exact Undo with delayed document refresh. |
| Final uncertain-status browser and application gates | 7 real-API checks passed; typecheck/build exit 0 | [Evidence](m0-final-status-check.log). Includes blocked Discard, explicit status recovery, and exact Undo; the two new standalone tests are included in the disposable application's typecheck. |
| Public project 2, diagnostic candidate 21 in isolation | 1 allowed, source/render/Undo verified | [Evidence](m0-public2-candidate21.log). This is a diagnostic pass, not a replacement for full qualification. |

A diagnostic `--candidate=N` flag can isolate one of the original 30 candidates without counting a one-candidate run as full qualification. Diagnostic output uses a separate file. Refresh waiters now attach error handlers immediately so an unhandled secondary timeout cannot conceal the original failure.

The [uncertain-save screenshot](m0-uncertain-save.png) was visually inspected: the review status, status-check action, and disabled Discard fit the existing Studio inspector. The current public-project-2 failure's exact cause remains unconfirmed; the next diagnostic should capture the bridge check and Apply response at the failed stage during the full sequence, rather than assuming its navigation timeout proves a reconnect bug.

## Boundaries and remaining M0 work

- A crash between the source write and durable history recording is still unverified. The new recovery covers a lost response after an accepted, journaled save; it is not a general crash-safe transaction journal.
- Undo response-loss recovery, cross-process write serialization, and persistence of the browser's uncertain review through a full editor reload remain future work.
- Accepted proposal lookup follows the existing bounded history retention. Missing/pruned history yields unknown; absence of a receipt never proves that a write did not happen.
- The current Studio uses the new recovery UI. The older overlay and repository-inspection UI retain their separate request/review behavior; renderer/lifecycle consolidation remains necessary.
- The public-project timeout must be diagnosed and requalified. A complete baseline pass plus an incomplete rerun is not consistent qualification.
- Independent review remains required before promoting this milestone. No independent review or production release is claimed.

## Reproduce

Run commands from the repository root. The browser harness copies the application and prepares disposable imported projects; source writes do not target the user's project or original fixtures.

```powershell
node --import tsx test/apply-outcome.test.ts
node --import tsx test/apply-client-recovery.test.ts
node --import tsx test/review-consent.browser.ts --source-project --drop-apply-response --defer-apply-status --gates
node --import tsx test/review-consent.browser.ts --source-project --drop-apply-response --slow-refresh --selections --gates
node --import tsx test/review-consent.browser.ts --source-project --public=2 --selections --trace-source
```

Existing uncommitted workspace changes were preserved. No commit, push, or deployment was performed.
