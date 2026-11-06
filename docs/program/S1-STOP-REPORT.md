# Program stopped at S1

| Item | Status | Evidence |
| --- | --- | --- |
| Preserve original editor work | PASS | [Tracked-input verification](evidence/S1/hard-stop.json): zero changes to the seven initially dirty tracked files. [Full original inventory](evidence/S0/uncommitted-start.txt). |
| Current-HEAD checkpoint | PASS | `pre-program-20261104-5a141b2`; original `pre-program` preserved. [Branch map](evidence/S0/branches.txt). |
| Exact requested `pre-program` tag | FAIL | [Existing tag collision](evidence/S0/existing-pre-program-tag.txt); no force or tag deletion used. |
| New coordinator test, before/after | PASS | [Failing assertion](evidence/S1/coordinator-contract-before.log), [passing output](evidence/S1/coordinator-contract-after.log). Unit test uses mocked process termination; no source-write proof. |
| S1 gate launch | FAIL / HARNESS-ERROR | [Raw console](evidence/S1/initial-gate-console.log). Launched from the original checkout instead of the program worktree and wrote to the old evidence directory. |
| Gate process-tree stop | PASS | [Owned process tree](evidence/S1/stopped-owned-process-tree.json): coordinator plus 13 descendants stopped. |
| S1 complete table, selection, shared-instance and real-API exit condition | UNVERIFIED | Run aborted. Skipped/unreached work is not counted as passed. |
| Readiness progress, Retry and manifest retry decision | UNVERIFIED | Audit only; no product implementation. |
| S2–S7 | UNVERIFIED | Not started because S1 blocks them. No pass tags and no stage merge. |

The launch error was mine. The gate started through a tool call whose working directory was the original checkout. Its old coordinator ignored the new evidence override. On detecting the unexpected output directory, I stopped the owned process tree and followed the requested hard-stop rule. The outputs and temporary worktree were preserved for review.

Only the new coordinator test and its evidence-routing change were committed, locally as `35e7b18` on `stage/S1`. The integration branch remains at the docs-only preflight commit `dc49a02`. The founder's original product checkout and its existing changes were not committed, merged, reset or pushed.

The exact resume command and directory are in [program state](../program-state.md). No claim is made that the gate, the editor or the release candidate is ready.

## What I did NOT verify

No complete selection matrix, shared-instance workflow set, real-API gate table, three release rounds, product-stage implementation, production build, external-project compatibility or launch qualification was completed in this program run. The inventory is an input, not new proof. The original resize/cursor work remains outside the program's committed baseline.
