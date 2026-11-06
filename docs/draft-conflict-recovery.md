# Draft source conflict recovery

The preview engine refuses a draft when the current file differs byte-for-byte from the draft baseline (`lib/slightnudge/edit-history.ts`, `readDraftSource`). Previously the workspace only displayed a transient toast. Later edits kept using the same stale draft parent, so the user had no clear recovery path.

The workspace now retains a persistent Source conflict notice with an explicit **Back up draft and use current source** action. It verifies a separate browser-storage backup before removing the active draft and reloading current source. Backup keys use the active project draft key plus `:backup:<random UUID>`. A newer in-memory draft takes precedence when storage previously failed. Storage failures leave the active draft intact. No source write is made by this action. It starts a fresh draft; it does not merge conflicting edits or automatically restore the backup. Unconfirmed Save/Undo operations disable this action.

## Evidence

- `draft-conflict-before.log`: new real-API browser test reached the conflict but timed out waiting for the recovery notice before the UI change.
- `draft-conflict-storage.log`: exact backup, other-project isolation, storage quota/readback failures, collision protection, and in-memory fallback.
- `draft-conflict-after.log`: focused browser regression on a disposable source copy. Edits a heading, changes source externally, verifies refusal, backs up the exact draft, reloads, and checks another edit can create a new draft. External source remains byte-identical throughout recovery.
- Two harness attempts are retained separately: the isolated copy initially omitted the new untracked application helper; a later run exposed a test race that checked storage before draft persistence. The new harness now waits for persisted draft state. Existing tests and limits were not changed.
- `draft-conflict-typecheck.log`: full TypeScript check is not green (67 diagnostics). Includes the pre-existing Move `EventTarget & Element.focus` typing error, historical docs/evidence sources, and other tests. No diagnostic names the new recovery helper/test. Do not interpret focused browser success as a clean project typecheck.

## What I did NOT verify

- The exact draft in the user's open browser: local browser access is disabled. Nothing cleared that session or changed its source.
- Which process originally changed that user's file. Old stored drafts can trigger this, but that is not proven for their tab.
- Imported-project or multi-file browser recovery; the storage key is project-specific and the entire active draft is archived, but this focused browser test covers the local project only.
- Full reliability gate, resize/rotation functionality, production build, or merge/rebase of conflicting drafts.

AST patching, source mapping, server conflict validation, and the Apply/Undo engine were not changed. Existing uncommitted canvas UI changes and next-env.d.ts were preserved. No merge, push, secret configuration change, or real-project destructive experiment.
