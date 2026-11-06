# Shared workflow diagnosis

## Original failure versus new capped runs

The original [shared log](../reliability-gate/2026-11-01T19-13-27-120Z-2b26542/shared-instances-four.log) failed at `test/helpers/shared-instance-browser.ts:35`. This is **after page.reload**, before Save, following multiple component/inline/destination mutations. It is not the initial navigation wait at line 21. That log has no `PASS shared instances` and no `Disposable source project` message. The first local Studio workflow had not completed; the imported workflow had not started. Therefore an imported dev server or Docker cannot be identified as the cause of that original failure.

It records aborted preview requests and `ERR_NETWORK_IO_SUSPENDED` on Apply-status/responsive requests. These are observations, not proof of an OS sleep or resource-exhaustion cause. The old child buffered only a tail of server logs and had no outer deadline. Its startup loop allowed 120 attempts, each with a 10-second fetch timeout plus a 500ms delay, in addition to later waits. A 120-second locator limit was never a bound on total workflow duration. Those bounds explain why a total above 120 seconds was possible; they do **not** reconstruct precisely the recorded 1100.83 seconds. Nor do the saved diagnostics account conclusively for the earlier 406.12-second warm-up overrun. The old warm-up's selector timeout was 119430ms inside an intended 180-second total budget; wall-time accounting/suspension was not recorded adequately to locate the extra time.

## New timings: imported Studio workflow

[Workflow log](../reliability-gate/2026-11-01T20-16-41-721Z-fe9b294/shared-imported-studio.log). Times below are relative to its first setup log, excluding roughly the initial process import cost. The outer 120-second budget includes setup, not only editor interaction.

| Phase | Seconds from first setup log | Evidence |
|---|---:|---|
| Git inventory | 0 | `SETUP 1793564450060` |
| Generated project Git init/add | 37.43–37.62 | 91ms init; 92ms add |
| Adapter installation | 37.62–37.93 | 308ms synchronous setup subprocess |
| Next dev help | 37.93–38.12 | 191ms |
| Editor route request | 68.30 | `/editor/source-proof` |
| Editor route response | 83.40 | HTTP 200 |
| Repository metadata request | 87.99 | two requests |
| Repository metadata response | 107.99–108.36 | HTTP 200 |
| Preview readiness check | 108.37–112.64 | HTTP 200 |
| Imported iframe navigation | 112.67–112.85 | HTTP 200 |
| Responsive/preview API requests | 115.71–116.44 | workflow reached selection/inspection traffic |
| Outer cap | 120 seconds after command start | TIMEOUT; process-tree termination/capture adds ~1–2 seconds to reported elapsed |

This run spent most of its budget in fixture/server bootstrap, route compilation/loading and editor metadata/readiness calls. Adapter installation took 308ms. The imported iframe document itself responded in 175ms at that navigation. The generated project runs directly with Node/Next; no Docker process is used in this workflow. There is not enough remaining budget to qualify its editing/Save/Undo assertions.

The first standalone imported diagnostic failed earlier in Git staging. The historical comparison subsequently exposed the underlying class of setup error explicitly: Git's `.git/objects/...` path was too long. This is a harness path-length limitation, not an imported editor failure. The first failed diagnostic discarded its disposable directory and did not retain stderr, so its exact original stderr cannot be retrospectively proved identical.

## Imported preview manifests

[Manifest inventory](imported-manifests.json) lists captured servers whose cwd is the disposable `.slightnudge/repositories/source-proof` project. No `INVALID_NEXT_MANIFEST` event was captured in those current-run logs. Direct Webpack writes of the imported project's build manifest are visible, but an empty read is **not reproduced** there. The observer validates all JSON reads under `.next`; only build-manifest reads receive routine valid-read timing lines. Absence of an invalid-read event is limited to these sampled requests and generated projects, not proof of safety on real imported repositories or all Next versions.

No user-project configuration was changed as a remedy. Test adapters were installed only in fresh disposable generated fixtures as the existing workflow requires.

## Options, report only

| Option | Benefit | Tradeoff / risk |
|---|---|---|
| (a) Opt-in adapter installs atomic publication in target Next config | Addresses observed manifest publication race at its writer | Modifies user files; explicit consent and restart required. Must compose safely with custom/async config, test supported Next versions and account for Turbopack versus Webpack. Needs upgrade/rollback ownership. |
| (b) Editor proxy retries failed responses | Could recover a transient failure of an idempotent preview GET | A proxy cannot retry the filesystem read inside Next. It sees an HTTP failure, often indistinguishable from a real application error. Existing previews navigate directly to the project's server, so proxy coverage needs architecture work. Never blindly retry Apply/Undo or other writes; risks masking defects and repeating side effects. |
| (c) Clear preview error with diagnostic context and explicit Retry | Preserves user config, exposes failure, gives a deliberate recovery path | Does not eliminate the target server's race; user must retry. Needs cancellation and preservation of drafts. |

Recommendation: (c) as the default recovery behavior, with (a) a separately consented option only after reproducing the target project's failure and testing its config/version. Do not introduce (b) as a generic automatic retry for mutation requests. These are recommendations only; this task makes no product changes.
