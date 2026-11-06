# Gate repair: incomplete qualification

| Run | PASS | FAIL | TIMEOUT | HARNESS-ERROR | Elapsed |
|---|---:|---:|---:|---:|---:|
| Current capped run | 0 | 16 | 4 | 4 | 3039.64s |

The gate is not green. These results do not prove product regressions: the new v3 harness is not qualified. Its host-first, iframe-fallback locator proxy can route missing inspector controls into the page iframe, and geometry assertions can compare iframe-local rectangles with host screen coordinates. These need explicit harness treatment before interpreting failures as product defects.

## Evidence

- [Current raw output and final table](../reliability-gate/2026-11-01T20-16-41-721Z-fe9b294/raw.log)
- [Historical failed-only comparison raw output](../reliability-gate/2026-11-01T21-11-07-905Z-7f1b9cd-failed-comparison/raw.log) (2498.85s)
- [Every workflow's first failure and comparison](results.md)
- [Helper assumptions, file and line inventory](inventory.md)
- [AST assertion, timeout and expected-array proof](ast-proof.json)
- [Full original-to-copy diffs](v3.diff)
- [Shared timing and manifest diagnosis; remedy tradeoffs](shared-diagnosis.md)
- [Imported manifest observations](imported-manifests.json)
- [Final diff stat](diff-stat.txt), [product diff](product-hunks.txt), [working tree status](git-status.txt)

## Changes and limits

Only test harness, coordinator and evidence files changed in this task. No product hunks; source mapping, AST patcher, selection, Apply and Undo code were not changed. Existing test files and their assertions, timeout properties and expected arrays were preserved; all 44 new copies passed the AST comparison. Local branch remains security/hardening; no merge, tag or push. Commits 3e2ebcb and 2b26542 are retained. The pre-existing next-env.d.ts modification was left untouched.

Workflow caps terminate the owned process tree and continue. Shared individual rows took about 121–122s including termination overhead after their 120s deadline. The aggregate shared deadline and additional spawn/artifact error handling were tightened after the complete run; these final coordinator changes passed syntax checks but have not had another complete browser run. New operation timing logs were added but have not yet been exercised.

Selection cases were not reached: an existing server occupied 127.0.0.1:3000. The gate refused to reuse or kill it and recorded four HARNESS-ERROR rows. Consequently no selection accuracy or zero-wrong-target claim is possible from this run.

At 7f1b9cd several local workflows reached the same first assertion or lookup, but this does not establish identical underlying causes. Several imported historical comparisons were blocked by Windows Git filename-length errors in nested disposable projects; their raw FAIL labels predate the setup-error classification correction. Exact pairings appear in results.md. Matching outer timeouts do not identify the blocked inner step.

No empty or invalid Next manifest read was observed in the six sampled imported server logs. This does not establish compatibility with every real project or Next version. The original shared failure occurred after a reload in the first local Studio workflow, before any imported workflow started. The historical 1100.83s and 406.12s durations cannot be reconstructed exactly from the retained diagnostics. No user project configuration was changed. Recommend clear diagnostics and an explicit Retry by default; consider an atomic-publication adapter only after a target-project reproduction and separate consent.

MOCKED labels identify workflows containing network interception/fault injection. Component-action interception includes delayed real route continuation; it does not imply every response is synthetic. Whether each injection was reached in these failing runs was not verified.

Not verified: successful Save/Undo, recovery or other domain workflows with this v3 harness; full host/iframe coordinate correctness; all aliases and computed locator expressions; aggregate-cap behavior in a complete rerun; exact causes of differing historical failures; target-project manifest truncation; Docker or resource exhaustion as a cause. No product fix or launch-readiness claim is made.
