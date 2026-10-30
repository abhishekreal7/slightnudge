# Multi-file drafts: implementation contract

Status: implemented for supported local source previews and imported Next.js editing windows. The generated Next 16/Tailwind 4 multi-component project passes grouped Save/Undo and interrupted-save browser recovery. Filesystem transactions are recoverable; multiple files are not replaced in one atomic filesystem operation.

The user should be able to edit several files on the same page, use one chronological draft Undo/Redo history, and Save once. Source files remain untouched during drafting. A failed or interrupted Save must never be reported as fully saved.

## Draft state

- Each chronological frame contains a map from project-relative source path to its immutable pending-preview head. Parent-preview IDs are selected per file, rather than from the most recently edited file.
- A frame also holds the active selection and source identity maps per file. Rebase only elements from the file whose draft changed.
- Compose render patches across all file heads. Reconstruct a recovered draft by reading every head and checking the same project identity and unchanged source baselines.
- Branching after Undo creates new immutable heads. Dropped frames must not delete previews still referenced by another frame or recovery checkpoint.

## Save transaction

1. Resolve all targets inside one repository/workspace. Reject duplicate canonical paths, aliases and mixed project scopes. Validate every pending edit, parse and compiled utility delta before entering the mutation lock.
2. Under the existing shared history mutation lock, recheck every source baseline and unfinished single-file/group operation. The existing single-file Save and Undo paths must also refuse files owned by an unfinished group.
3. Persist a durable group journal before the first write. Record the immutable member previews, original/result hashes, transaction ID and receipt progress. Do not depend on the browser retaining the original request.
4. Replace each file through the existing atomic file-write primitive. Record each member receipt without re-entering the mutation lock. A group is complete only after every file and the group receipt are durable.
5. Restore temporary structural DOM changes before writing source, then reconnect and verify the rendered result. Source-save completion and render-verification completion are distinct outcomes.

Multiple files cannot be renamed atomically as one filesystem operation. This is a recoverable transaction with explicit partial state, not a promise of filesystem-level all-or-nothing visibility.

## Interruption and conflict behavior

- Status reads may reconcile receipts from journals, but must not silently write project source.
- A partially written group presents a concrete recovery state. An explicit Resume Save continues only when each member is exactly its expected before or after version.
- Any third version is an external edit: preserve it and the draft, and refuse automated overwrite or rollback.
- Lost HTTP responses resolve through the same transaction ID. Retrying a completed Save must not create additional writes or history entries.
- Group Undo prevalidates every current result before changing any file, journals progress and has the same interruption/conflict behavior. The UI must never display a complete Undo after only one member was restored.

## Required qualification

- Two-file editing, alternating file edits, one chronological Undo/Redo history, refresh recovery and exact grouped Save/Undo.
- Cross-tab competing saves, per-file conflicts, mixed project IDs, path aliases and response loss.
- Crashes before the first write, after the first file, after all files but before the group receipt, and during Undo.
- Missing/corrupt member metadata, external edits during recovery, and refusal to overwrite any third source version.
- A real imported project with components in separate files: continued editing after Save/Undo and actual rendered verification.

Do not replace these requirements with sequential calls to the existing single-file Apply endpoint and label that operation atomic.

## Implementation and bounds

- `source-group.ts` validates immutable per-file previews and utility/parse results, then journals the complete change set under the same mutation lock used by single-file Save/Undo. One bounded journal owns all member files until Save or Undo completes.
- Status reads may finalize metadata receipts after all expected versions are present; they never write source. Explicit Resume Save/Undo resumes only exact before/after versions. Third versions and corrupt journals fail closed.
- Single-file operations refuse unfinished group members; single-file Undo also refuses to split a completed grouped save. Completed group requests are idempotent.
- Studio retains per-file heads in each chronological draft frame, composes all render patches, restores each head from server snapshots, and rebases only the corresponding file's elements. A retained older operation receipt must not erase a newer draft.
- Review lists affected files. Failed/interrupted operations show member progress and explicit recovery actions. Source completion and preview-render completion are reported separately.
- Limits: 16 files per change set, 8 MiB of combined source snapshots, existing 1 MiB per-file snapshot limit, 50 recent draft gestures, and existing local history retention. Projects remain source-bound; multi-project groups and automatic source merging are unsupported. Switching playground pages still requires resolving the current page's draft.
- Server journals retain member snapshots even if original preview files expire or are removed. Missing/corrupt journal metadata requires manual inspection; it is never silently discarded to unblock writes.

## Commands and evidence

- `npx tsx test/multi-file-group.test.ts`: grouped source operations, interruption points, explicit resume, external conflicts, duplicate/cross-scope/hard-link aliases, missing preview files, corrupt journals, and single-file ownership guards.
- `npx tsx test/multi-file-crash.test.ts`: actual child-process death during Save/Undo, dead-owner lock recovery, and competing writers.
- `npx tsx test/review-consent.browser.ts --multi-file --gates`: real imported project, alternating component files, shared draft history, refresh, file review, actual rendered CSS, Save/Undo, first-file process crash, lost response, and explicit recovery, plus application typecheck/build.
- `docs/multi-file-verified-qualification.log`: passing imported browser qualification, including retaining a newer draft after an earlier grouped Save/Undo and refresh.
- `docs/multi-file-engine-final.log`, `docs/multi-file-crash-final.log`, and `docs/multi-file-recovery-final.log`: passing source engine, real process crash/concurrency, and existing recovery regressions.
- `docs/multi-file-production-gates.log`: final application typecheck/build and production HTTP boundary smoke; the grouped filesystem endpoint is unavailable in production.
