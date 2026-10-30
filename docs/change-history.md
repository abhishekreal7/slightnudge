# Change history

Studio and the separate editing window expose **Change history** beside Undo/Redo. It opens on demand and keeps the editing canvas uncluttered.

- Current draft lists unsaved gestures and undone gestures available through Redo.
- Recent saves show up to 50 source save receipts, with multi-file saves grouped as one entry and affected paths listed together.
- Saved, undone and needs-attention states have explicit text labels. Missing files, incomplete/invalid group journals and partial Undo receipts require attention.
- The existing recovery overlay remains responsible for confirming interrupted operations and explicit Resume. The history panel does not repeat source writes or bypass conflict checks.
- Source snapshots, before/after content, browser tokens and absolute filesystem paths are not returned by the history endpoint. Both the project identity and source path must belong to the requested scope.
- History reads require the local session token and the existing host/origin checks. The endpoint is unavailable in production.
- The native dialog is centered and manages focus and Escape. Keyboard events remain in the dialog so Ctrl+Z cannot Undo canvas edits behind it; the global Save shortcut also refuses source writes from inside a dialog. Opening or refreshing history only reads metadata.

These are historical save receipts, not a claim that the files still match them. External editor changes remain protected by the existing Save/Undo engine. Arbitrary rollback to an older save is not implemented; use the editor's latest eligible Undo. Groups without any history receipt still use their existing operation checkpoint/recovery flow.

## Verification

- `npx tsx test/history-summary.test.ts`: project/path isolation, omission of source snapshots, grouped files, saved/undone/attention states, absent recovery metadata and bounded recent records.
- `npx tsx test/review-consent.browser.ts --imported-canvas --gates --production-smoke`: live imported editing plus draft/saved/undone history, modal keyboard isolation, refresh, missing-token refusal, application typecheck/build and production endpoint denial.
- Passing browser/build/production evidence: `docs/change-history-release.log`. Screenshot: `docs/change-history.png`.
