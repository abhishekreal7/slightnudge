# M0: qualification and authorization recovery

> Latest follow-up: [reviewed-save crash recovery](m0-crash-recovery.md) records the new journal, local mutation exclusion, process-exit tests, and remaining gates. Results below describe the preceding delivery.

25 October 2026. Follow-up to [save outcome recovery](m0-save-recovery.md). This records a bounded reliability delivery; M0 as a whole remains open.

## Findings and changes

The original intermittent navigation timeout did not recur in the first fully traced run: all 30 public-project-2 candidates completed, with 24 allowed edits, 6 refusals, and zero wrong targets. [Trace](m0-public2-sequence-trace.log). The historical timeout's exact cause cannot be established retroactively from its limited diagnostics.

A deterministic failure injection did expose a qualification defect. The real server saved the reviewed change, the browser's Apply response was deliberately dropped, and Studio correctly reconciled the accepted operation through `/apply/status`. The page rendered the accepted class and Studio reported success. The test nevertheless timed out waiting for the original response. [Before-fix evidence](m0-sequence-response-loss-before.log).

The qualification helper now accepts a successful Apply **or** its successful recovery lookup, scoped to the intended project and source file. It waits for the editor to finish its operation and close the review, then independently checks exact source bytes, complete rendered classes, computed font weight, one matching history entry, and exact Undo. A navigation event is no longer treated as proof of completion. The accepted-response wait covers the existing request/recovery sequence; the renderer's own revision checks and recovery budget are unchanged.

A separate client defect was reproduced: an explicit authorization denial from the pre-write guard was treated as an unknown save. That unnecessarily trapped a review behind the status-check flow even though the handler had not reached any source operation. [Failing test](m0-authorization-denial-before.log).

Apply now refreshes the session credential after that denial, preserves the review, and returns `AUTH_REQUIRED` with a retry explanation. It does not repeat the write. Only a subsequent explicit Apply submits it again. Genuine transport failures still use outcome lookup and remain uncertain when the outcome cannot be proved. [Passing test](m0-authorization-denial-after.log).

## Verification

| Check | Result |
| --- | --- |
| Traced public-project-2 baseline | 30 candidates: 24 allowed, 6 refused, zero wrong targets |
| Authorization-denial regression | Denied write count zero; no automatic retry/status loop; explicit retry writes once |
| Existing client recovery regression | Passed: response loss, unknown status, read-only retry, session refresh, changed source |
| Apply outcome regression | Passed: duplicate/concurrent requests, persisted receipt, scope/auth checks, outside edits, Undo |
| Existing Apply race regression | All 3 cases passed |
| Full public-project-2 sequence with both injected failures | 30 browser cases passed: 24 allowed, 6 refused, zero wrong targets; [run log](m0-public2-recovery-qualified.log) |
| Final candidate 21 with both injected failures and application gates | 1 real-API workflow passed; application typecheck exit 0 and production build exit 0; [gate log](m0-qualification-final-gates.log) |

The combined browser run deliberately sends the first Apply through the real authorization guard with an invalid credential. It verifies unchanged source and a retained review, clicks Apply explicitly, then drops the accepted response. Status recovery must complete the same edit, with exactly two submitted Apply requests (one denied, one explicitly retried), one accepted history entry, correct rendered values, and exact Undo. All remaining candidates run through the same source/history/render checks.

The full sequence passed, but its subsequent compile gates found TypeScript TS7022 in the new helper's `needsExplicitRetry` inference. An explicit boolean annotation corrects that test-only issue without changing executable behavior. The final targeted run checks the current helper and application gates; it is not counted as another full 30-candidate qualification. The full report was also independently read back to verify completion, 24/6 counts, and matching intended/inspected file identities for all accepted edits.

Final application gates passed in the disposable application copy, including the current helper and three client/outcome tests. Historical tests and scratch files remain outside that scoped typecheck. The production build still emits the previously recorded Tailwind verifier `module.createRequire` warnings; they are not presented as resolved.

Diagnostic output now includes operation stages, bridge results, API method/status/result, editor notices, and document initialization. It omits session headers and URL credentials. Candidate-only and injected-failure runs write separate result files. A diagnostic candidate pass is not a full qualification pass.

## Reproduce

```powershell
node --import tsx test/apply-denial.test.ts
node --import tsx test/apply-client-recovery.test.ts
node --import tsx test/review-consent.browser.ts --source-project --public=2 --selections --drop-selection-apply-response --expire-selection-token --trace-source --gates
```

The browser harness edits disposable copies and uses real source APIs, project compilation, and rendering. Network injection affects the response/authorization test conditions; it does not stub the source changes or expected rendered result.

## Remaining foundation work

Crash recovery between a source write and durable history recording, Undo response-loss reconciliation, cross-process write serialization, browser-review restoration after a full reload, and independent review remain open. The older editor paths still need lifecycle consolidation. This delivery does not declare all of M0 complete, implement new visual controls, or broaden framework support.

Existing uncommitted work was preserved. No commit, push, or deployment was performed.
