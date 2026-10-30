# M0: exact-edit Undo and recovery

Latest follow-up: [refresh recovery and verified checkpoints](m0-tab-recovery.md) implements current Studio restoration across reloads. The remaining-gate list below predates that slice.

25 October 2026. Follow-up to [Apply crash recovery](m0-crash-recovery.md). This closes the tested Undo response-loss and process-exit slice. M0 remains open.

## Behavior

HTTP Undo now requires an accepted proposal reference. The editor keeps its history edit ID and frozen project/file scope too. Repeating the same request returns that edit's receipt; it cannot fall through to an older edit. An extended group rejects an obsolete proposal reference. Missing, unknown, mismatched or expired references do not write source. Receipts remain subject to the existing bounded history retention; an expired reference reports unknown, rather than undoing another edit.

Undo persists its actual input and intended result before replacing source. This includes unrelated changes preserved by token Undo. Status reconciliation updates metadata only: intended output means completed; unchanged input means not applied and requires an explicit retry; divergent source preserves the recovery intent and blocks further writes to that file. Unfinished Undo intents survive ordinary history retention while edits to other files continue.

The protected `/api/slightnudge/undo/status` endpoint returns minimal receipt metadata with no-store caching. It never writes source. The shared client reconciles transport failures, refreshes authorization for status reads after restart, and sends only status requests while the outcome is uncertain. A denied mutation is not automatically replayed. Current Studio shows **Check Undo status**, pins the requested edit, pauses further editing, and avoids restoring an obsolete visual snapshot when current source cannot be confirmed. Other editor entry points now send bound references too.

## Evidence

- `m0-undo-recovery-before.log`: repeated Undo reproduced the original bug by also reverting the older accepted edit.
- `m0-undo-regression.log`: the complete recovery suite passed, including existing Apply recovery, local locking, races and 12 token Undo cases.
- `m0-undo-final-engine.log`: duplicate HTTP Undo, authorization/origin/host denial, scope/target binding, historical receipts, eight process-exit scenarios for exact/token Undo, grouped targets, and history-retention recovery passed. A ninth child-process exit exercises retention after 105 unrelated history records.
- `m0-undo-history-regression.log`: all six existing history-resilience tests passed.
- `m0-undo-browser-final.log`: a real disposable source project accepted two successive edits; the newer Undo response and first status response were dropped. The editor paused, explicit Check Undo status only read metadata, the older edit stayed applied, and a duplicate bound HTTP Undo still left it intact. A separate explicit Undo then restored the original source and rendered weight.
- `studio-move-final.log`: latest application typecheck and production build passed after the UI follow-up. Existing Tailwind verifier `module.createRequire` warnings remain.

Initial browser attempts remain recorded in `m0-undo-browser.log` and `m0-undo-browser-verified.log`. The first attempted to click a toolbar that disappeared during the uncertain source refresh. The second encountered the previously observed second-preview/navigation timeout before the injected Undo fault. The final Undo-focused workflow omits that unrelated discard/re-preview sequence; this is not a fix or successful requalification of the intermittent preview failure.

Commands:

```powershell
npm run test:recovery
npx tsx test/undo-recovery.test.ts
npx tsx test/history-resilience.test.ts
npx tsx test/review-consent.browser.ts --source-project --drop-undo-response --trace-source
```

Tests use disposable copies. No commit, push or deployment. Existing uncommitted work remains intact. Local mutation exclusion assumes one host/PID namespace; power loss, failing storage and multi-host filesystems remain unqualified. Browser review/uncertainty restoration after a full editor reload, intermittent preview timing, broader public-project qualification and independent review remain open.
