# M0: refresh recovery and verified editing checkpoints

25 October 2026. Follow-up to [exact-edit Undo recovery](m0-undo-recovery.md). This is an implemented recovery slice, not a declaration that the SaaS or renderer migration is complete.

## Implemented

Current Studio saves a bounded tab-local operation reference before sending Apply or Undo. It contains the exact proposal, optional accepted history ID, frozen file/project scope, current editing view, viewport/state selection, and up to 20 recent accepted UI steps. It does not contain a session token or full before/after source snapshots. Server history and the source remain authoritative.

A refresh restores a blocked recovery view and checks server status. It never sends Apply or Undo automatically. A read can refresh authorization after a server restart through the existing shared client. Controls beneath the recovery view are inert, and keyboard Undo cannot bypass the operation guard.

| Server evidence | Restored behavior |
| --- | --- |
| Apply receipt matches current source | Restore the cached accepted view and its exact Undo reference. |
| Original proposal still exists, source matches its original, and no write intent/receipt exists | Report not applied. Restore local review for an explicit Apply or Discard. Imported projects require reconnection and a fresh preview. |
| Undo receipt matches current source | Restore the previous view and remove only the requested Undo step. Keep older accepted steps. |
| Undo has not run | Retain the accepted step; require a new explicit Undo. |
| Status unavailable, scope mismatched, source changed or recovery data unreadable | Keep editing blocked. Preserve the reference; do not replay a write or claim that it failed. |

Successful operations retain their checkpoint too. Normal reloads verify the receipt again before trusting the cached editing view. This addresses the observed loss of accepted local canvas state during development refreshes. The checkpoint is per browser tab and project; a repository named `workspace` has a different key from the local workspace. It is not a replacement for a persistent project document or the future source-rendered canvas.

The Apply status implementation now covers a browser reference saved before the HTTP request reaches any server write intent. It checks the proposal, scope, canonical path and unchanged original under the existing mutation lock. That read cannot apply the proposal. If the server no longer has enough evidence, the result remains uncertain.

Storage is bounded. A failed pre-write storage operation refuses the mutation before sending it. A late completion cannot clear a newer operation's reference. A status-only retry does not require rewriting storage. Discard clears the matching abandoned review reference, rather than another accepted operation's checkpoint.

## Validation

- `m0-tab-recovery-storage.log`: fresh-read restoration, project isolation including the workspace-name collision, stale completion protection, and corrupt/oversized/unavailable storage passed.
- `m0-tab-recovery-outcomes.log`: existing Apply outcomes plus the new unstarted-request proof, scope refusal and outside-source-change checks passed.
- `m0-tab-recovery-regression.log`: the existing full recovery suite passed, including Apply races/crashes, local mutation locking and 12 token Undo cases.
- `m0-tab-recovery-checkpoint.log`: five real-API browser workflows passed in a disposable copy: accepted Apply with lost responses and full reload; an unstarted Apply restored for explicit review; lost Undo with a newer and older accepted edit; unstarted Undo requiring explicit retry; and storage-quota refusal before a mutation request. Source bytes, visual weight, write counts and exact Undo references were checked. Application typecheck and production build passed.
- `m0-tab-checkpoint-final-gates.log`: a separate focused normal-refresh workflow verifies the accepted checkpoint, no replayed mutation, restored visual weight and explicit Undo. Latest compilation results are recorded in that log.
- The recovery view was visually inspected: [screenshot](m0-tab-recovery.png).

Earlier failed runs remain in `m0-tab-recovery-browser.log`, `m0-tab-recovery-final.log`, `m0-tab-recovery-rendered.log` and `m0-tab-recovery-gates.log`. They exposed Next development-manifest JSON failures, an absent second-preview request after a successful source edit, and an existing Google Fonts fetch failure during build. No framework package or font configuration was patched. The final browser harness waits for the actual fixture route to render between editing tasks; this is additional qualification of the source revision, not proof that the underlying preview timing issue is solved. The later production build succeeded with the real font configuration. Existing Tailwind verifier warnings remain.

```powershell
npm run test:recovery
npm run test:session-recovery
npx tsx test/review-consent.browser.ts --reload-recovery --checkpoint-only --gates
```

`test:session-recovery` now includes the five interruption/storage workflows and the normal checkpoint case; the evidence above records the five-case and focused one-case runs separately.

## Next gates

The next major product step is one truthful source renderer and a real layer tree inside the existing Studio shell. Then qualify ordinary text, spacing, size, color and layout controls against that renderer before exposing free movement or structural reordering. Preserve the compact contextual UI and explicit review ownership.

M0 still has open gates: unsent ordinary preview restoration; imported-project full-reload/reconnection qualification; corrupt-storage and external-source-conflict repair UX; intermittent development preview timing; wider real-project qualification; and independent review. This browser evidence is for local Studio. Imported context is stored and server scope enforcement is tested, but a complete imported refresh workflow is not claimed here. Browser closure/restart, multi-host storage, power loss and failed disks are not qualified by this tab-storage feature.

Existing dirty work was preserved. No commit, push or deployment was performed. Tests write source only in disposable workspaces.
