# Review shortcuts

Both editor surfaces use their existing reviewed save operation for Ctrl/Cmd+Enter. The playground retains the floating Apply to Source button; its inspector duplicate was removed. The source editor already has one Apply action.

Escape discards an unapplied preview. Ctrl/Cmd+Z discards a pending preview first, otherwise calls guarded source Undo. Native text-field Undo remains available. Repeated keydown events do not submit another save. Applying blocks review shortcuts until the request finishes.

## Redo specification (pending)

CONFIRMED: the current history API has no redo operation. Do not map Ctrl/Cmd+Shift+Z or Ctrl+Y to another Apply request. A future redo must prepare a new review from the current file, verify its target and Tailwind output, and use the same write-time comparison and containment checks as Apply. A changed file must produce a refusal or a new review, never a replayed stale write. Adding redo requires tests for external changes, grouped edits and refusal recovery before exposing a shortcut.

## Proof

`test/overlay-apply.test.ts` has six independent browser cases: Apply and exact-byte source Undo using each platform modifier, plus Escape discard, on both surfaces. Each case starts a disposable workspace/server because source writes can trigger dev refreshes. Cold compilation across these servers intentionally makes the suite longer than 60 seconds. Normal assertions and action timeouts are unchanged.

The characterization lane (`SPRINT1_APPLY_CHARACTERIZE=1`) describes the historical two-button playground, before removal. Its recorded run posts the same preview ID from both buttons to `/api/slightnudge/apply`; a deliberate refusal retains the draft between clicks. It is historical evidence, not a current regression command.
