# SaaS completion tracker

Active user request: continue the five-part roadmap until complete; do not treat an individual editor feature as completion of the SaaS. Preserve the existing dirty workspace and keep source edits local until explicit Save.

## 1. Meaningful layout editing

- Qualified: section sibling order, preserved CSS navigation order, continuous draft composition, refresh and exact Save/Undo.
- Qualified: **Move to…** destination picker for static containers in the same component/source file; hover/insertion indicator, Escape cancellation, draft Undo/Redo, edit after moving, refresh and exact Save/Undo. React host parents are restored before structural source writes to avoid HMR reconciliation errors.
- Qualified: grid columns, gap, flex direction/wrapping, alignment/distribution; source-token versus computed-value distinction. Browser proof covers grid geometry, switching to flex, refresh and grouped Save/Undo.
- Qualified: self-closing destinations before/after the moved subtree in source-engine tests; real browser covers empty-container targeting, draft Undo/Redo, continued inline editing, refresh recovery, Save and exact source/DOM Undo (`docs/empty-container-qualification.log`).
- Qualified on the generated imported Next.js app: cross-container moving, continued editing after Undo, and source Save/Undo.
- Open: actual drag/drop destination gestures and insertion slots beyond the current end-of-container UI; safe cross-component moves.

## 2. Consistent editing support

- Implemented: imported Studio uses the single-page pan/zoom canvas and continuous multi-file drafts; cross-origin size/wheel messages, document scrollbar suppression, post-hydration viewport-unit stabilization and unscaled collapsible connection controls. Separate-window native scrolling is preserved. See `docs/imported-canvas.md` for boundaries; protocol 6 is required.
- Qualified: real imported long-page editing, stable 100vh sizing, content growth/shrink, iframe-only reload, zoomed Move/inline text, multi-file refresh/Save/Undo, separate-window native scrolling, application typecheck/build, production boundaries and the local canvas regression (`docs/imported-canvas-qualified.log`).

- Existing: local source movement in Default scope, imported Next.js separate window with real source previews and continuous same-file drafts.
- Qualified: imported centered position Move in the real Next 16/Tailwind 4 window, including verified displacement, source Save and exact Undo. Tailwind 3 matrix and Tailwind 4 individual-translate handling pass bridge tests; fresh public Tailwind 3 browser qualification remains open. Local separate-window movement regression passed.
- Qualified locally: explicit project-derived minimum-width scopes, custom/changed/removed breakpoints, exact viewport widths, native cascade order and subject-isolated CSS, inactive-scope refusal/rollback, width/scope refresh recovery, grouped source Save/Undo and toolbar bounds at 1024/1280/1600. Application typecheck/build passed. See `docs/responsive-editing.md` and `docs/responsive-editing-qualification.log`.
- Qualified against Tailwind 3 in a disposable compiler/browser test: custom screens, omitted raw/max-only screens, changed config refresh, native cascade and no effects on other elements.
- Qualified in a real imported Next.js editing window: project-custom breakpoint edit, a previously unused theme token, mobile inheritance, both retained-checkpoint and active-draft view recovery, Save from another viewport, rendered responsive CSS and exact source Undo. Latest local/imported application typechecks and builds passed (`docs/responsive-imported-final.log`).
- Browser-initial font preferences resolve `em`/`rem` media-query boundaries independently of the document root font. Typed viewport widths survive delayed resize messages; complete CSS revisions replace superseded draft styles. Source adapter protocol 5 is required for imported editing windows.
- Open: compound/raw/max-only and container-query scopes, combined interaction scopes, and broader source-expression capability handling.

## 3. Multi-file drafts

- Implemented: on-demand Change history dialog distinguishes unsaved/redoable gestures, grouped saved receipts, undone saves and attention states. History reads are project/path scoped, omit source snapshots and never resume writes. See `docs/change-history.md`.
- Qualified: summary isolation and state tests; centered native dialog, draft/grouped saved/undone entries, refresh, keyboard Undo/Save isolation, missing-token refusal, complete imported canvas regression, application typecheck/build and production endpoint denial (`docs/change-history-release.log`). This does not implement arbitrary historical rollback.

- Implemented: per-file draft heads within one chronological history; group-wide render composition/recovery; source-scoped rebasing; one explicit grouped Save and exact grouped Undo.
- Qualified in a real imported Next 16/Tailwind 4 multi-component project: alternating files, no preview writes, draft Undo/Redo, refresh, affected-file review, native CSS after Save/Undo, real first-file process crash, lost response, reload, explicit Resume Save, and continued editing. Initial application typecheck/build passed.
- Process tests qualify interruption before writes, after the first file, after all files, and after history receipts; interrupted Undo, competing writers, source-read-only status, external-version preservation, alias/mixed-scope refusal, missing previews and corrupt journals. Existing single-file draft regressions pass.
- Bounds and recovery semantics: `docs/multi-file-draft-design.md`. Broader framework/project coverage and cross-page draft switching remain outside this qualification.

## 4. Compatibility

- Current new workflow qualification: installed Next.js 16.4.3 / Tailwind 4.3.3, local fixtures and generated imported App Router sample.
- Historical public-project results are in existing docs; they are not proof that all new workflows work there.
- Implemented and engine-tested: adapter protocol detection; generated-file integrity checks; missing-backup/config protection; failed-install rollback; unknown adapter-folder files preserved. Legacy adapters without integrity records require manual config preservation/merge.
- Implemented: read-only project compatibility report in setup, installed versus declared dependency detection, App/Pages/mixed router detection, Tailwind/static-content limits, older-Next enable refusal and unsupported-project guidance. See `docs/project-compatibility.md` for the explicit capability matrix and verification boundaries.
- Qualified: synthetic metadata matrix, real setup/API browser flow (including keyboard access and unavailable actions), existing adapter/movement regressions, application typecheck and build (`docs/project-compatibility-final.log`, `docs/project-compatibility-adapter-regression.log`). This is onboarding qualification, not broader framework runtime qualification.
- Open: run new workflows against varied real repositories, smoother legacy adapter migration, workspace app-root selection, and broader unsupported-project onboarding.

## 5. Launch audit

- Core unit/payment/security/funnel suite passes locally (`docs/launch-core-tests.log`). This does not prove live integrations.
- Implemented: production disables simulated checkout, missing payment configuration cannot return a mock purchase, production cannot fall back to memory database, simulation inputs reject markup injection.
- Implemented and locally tested: verified account guards/resource ownership, browser token wiring and sign-in/reset UI, paid report export gate, report HTML escaping/truthful unavailable scores, production proxy disables local filesystem editor APIs.
- Implemented: persistent owned sites, verification and worker target resolution; production cannot bypass ownership using local flags. Site/worker end-to-end qualification remains open.
- Implemented and PostgreSQL-tested: account profile migrations; service-owned data access; transactional payment receipt, paid unlock and queue insertion; idempotency; injected queue failure rolls back the transaction. No real Supabase migrations applied.
- Implemented and PostgreSQL-tested: generated scenario/finding IDs become server UUIDs while benchmark labels remain evidence metadata; artifact IDs use UUIDs. Production refuses benchmark planning/analysis fallback when the service is unconfigured.
- Open: live provider auth/recovery and payment sandbox flows, sign-out/session UX, refund durability and entitlement handling, production configuration and staging end-to-end tests.
- User explicitly deferred Supabase project and hosting target. Do not request secrets in chat or claim live authentication/billing/deployment verified. Continue independent local implementation.

## Current evidence and commands

- `test/container-move.test.ts` and `docs/container-move-qualification.log`: source and real browser move flow, typecheck/build.
- `docs/layout-controls-qualification.log`: real layout browser flow and typecheck/build.
- `test/production-boundaries.test.ts`: payment/database fallback and simulated checkout boundaries.
- `npm run test:launch-boundaries` includes production/account boundaries, payment fulfillment, and offline PostgreSQL migration/transaction tests; all passed locally.
- `npm run test:adapter` covers adapter integrity and Tailwind movement compatibility; passed locally.
- Static classless button labels pass source-engine and real browser editing after reparenting, including preserved icons, draft Undo/Redo, refresh recovery, grouped Save/exact source/DOM Undo, and dynamic-label/style refusal guards (`docs/classless-button-qualification.log`).
- Fresh application typecheck/build and production HTTP smoke passed (`docs/launch-current-qualification.log`). Whole-repository TypeScript still includes historical scratch/test errors; this is application-only qualification.
- An isolated dev run hit a generated-module SyntaxError; the subsequent empty-container browser run passed. The intermittent failure is not yet explained; retain diagnostics and investigate if it recurs.

No production deployment has been performed. No account email, real checkout, charge, or refund has been triggered during this work.
