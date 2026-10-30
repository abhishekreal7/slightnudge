# Continuous local editing

The local Studio now accumulates changes in an editable draft. A gesture no longer opens a blocking Apply/Discard review or prevents selection of another element.

## Interaction

- Move, resize, style, or edit static text, then continue editing.
- The header shows draft status and a single Save changes action. Ctrl+S includes text still focused in the Content field.
- Draft Undo/Redo uses Ctrl+Z, Ctrl+Shift+Z, or Ctrl+Y; the Redo button is also available.
- Review changes is optional and lists the current gesture history. The expanded detail shows the latest adjustment.
- Discard draft restores the initial visual state without writing source.
- A successful Save writes the accumulated revisions. Multi-file drafts use one durable change-set transaction, and saved Undo restores the whole change set.

## Persistence and source correctness

Each server revision is immutable and derives from a server-produced pending snapshot. JSX targets are mapped by their exact original source position or static ID, then rebased by opening-element order into the draft. Text/style edits preserve that structure. Existing loop, dynamic-value, shared-component, transform, and utility refusals still apply.

No draft gesture writes the source file. Save verifies the full resulting utility delta and parses the resulting file, checks the original file contents again under the existing mutation lock, and uses the existing atomic write, durable intent, and accepted receipt. Duplicate Save/status checks reconcile that receipt.

The browser stores up to 50 recent gestures plus the original baseline in local storage. Drafts and gesture history survive reload. If browser storage fails, the header says Draft in memory. Save and Undo retain the existing session recovery journal; local saved checkpoints retain five accepted batch snapshots to stay within its size limit.

Server draft snapshots are retained for up to 30 days. Source conflicts retain the browser draft and do not overwrite external source edits. Source conflict resolution/rebase is still explicit; no automatic merge is attempted.

## Scope

This applies to supported controls in local Studio, imported Next.js Studio canvases and separate editing windows. Imported project setup/source inspection retains its separate review behavior. Draft Redo operates on unsaved gestures; Undo after Save operates on a saved batch. Multi-file transactions and their recovery bounds are described in `multi-file-draft-design.md`. Typing commits on blur or explicit Save rather than saving every keystroke to source.

## Verification

- `npx tsx test/continuous-draft.test.ts`: real protected API composition across targets, untouched source during preview, one-save receipt, duplicate-save reconciliation, batch Undo, branching, net-zero drafts, scope refusals, and source-conflict preservation.
- `npx tsx test/review-consent.browser.ts --continuous-draft --gates`: disposable real application, browser editing across elements, Undo/Redo, reload recovery, optional review, Ctrl+S, focused text Save, source-position rebasing after Save, source conflicts, batch Undo, application typecheck, and production build.
- Screenshot: `docs/continuous-draft.png`.

The workspace-wide TypeScript command still includes pre-existing failures in historical evidence, scratch scripts, and a legacy test. The isolated application gates exclude those directories. Existing Tailwind verifier `module.createRequire` build warnings remain.
