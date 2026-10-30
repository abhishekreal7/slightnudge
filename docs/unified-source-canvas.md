# One source canvas

26 October 2026. Implementation and qualification scope.

The local Studio renders the actual fixture components in an isolated preview document. It no longer recreates their headings, copy, layout or styles in the editor. Local and imported Next projects use `SourceProjectCanvas` and the same browser bridge; their save policies remain distinct.

## Behavior

- The Layers panel comes from source-marked elements in the rendered document. Repeated markers form one disabled row with an instance count, avoiding duplicate tree keys. Clicking an ambiguous rendered instance explains the restriction and preserves the current selection. Repeated or missing source targets are refused.
- Selection, the attached typography toolbar, Move and width handles track actual element bounds. Device buttons change the iframe viewport itself.
- Local plain-text editing uses the actual element with its typography intact. Formatting can continue while typing. Enter finishes text, Escape cancels and Ctrl/Cmd+S stages text before saving.
- Local gestures form one recoverable draft with draft Undo/Redo and an explicit Save. Imported projects retain one reviewed preview at a time.
- Draft utilities are compiled with the project's Tailwind configuration and original CSS layer. A project CSS override is reported rather than hidden by editor-only inline styles.
- Save checks the rendered draft, writes through the existing source transaction, reloads, and checks target classes, text and relevant computed styles. A source write and a confirmed rendered revision are separate outcomes.
- Reload restores local drafts in the correct source page without writing files. Page changes require resolving the current draft. Undo of a saved change requires its source page to be open.
- Selections made during a local source operation are queued and reattached after it finishes. The status says “Updating draft…” while a proposal is being prepared.

## Next development compatibility

The installed Next 16.4.3 runtime broadcasts a webpack SYNC message when a new preview connects, but compares that message with its initial compilation hash even after later successful BUILT messages. This caused the editor document to reload when its iframe reconnected. A development-only webpack loader updates that checkpoint on successful builds. It leaves normal hot updates, real restart detection and failed-build recovery active; it does not modify installed dependency files. Recheck this compatibility loader when upgrading Next.

`test/hmr-sync.test.ts` executes the installed Next WebSocket runtime in a browser-transport simulation. It reproduces the original failure, then verifies healthy preview connections, normal message delivery, genuine restart detection and failed-build recovery with the transformed output. The real browser suite also counts editor document requests to catch unexpected reloads across Save, Undo and draft recovery.

## Qualification

`test/source-rendered-bridge.test.ts` checks bridge ownership, repeated targets, missing utilities, external DOM changes, style preview, refusal and Discard. `test/helpers/unified-canvas-browser.ts` exercises real APIs and source writes in disposable application/project copies. Its browser suite checks DOM identity against an independent rendering of the source component; real layers; size, movement and device width; CSS override refusal; grouped Save; native text with typography; saved Undo; draft refresh; a second source page; and an imported Next sample.

Run `npm run test:source-canvas` for this qualification and the isolated application typecheck/build. Historical tests that address the removed handcrafted parent DOM need migration before they can qualify the shared canvas.

Recorded qualification, 26 October: four real-API browser workflows passed on disposable source copies, plus application typecheck and webpack production build (both exit 0). Separately, 25 bridge cases, continuous-draft transaction checks and the installed Next HMR regression checks passed. Evidence: `docs/unified-canvas-qualification.log`. The build retains the existing `module.createRequire` warnings from the Tailwind verifier. These checks exclude historical docs/scratch code and do not certify all existing tests or production runtime editing.

A focused imported-project rerun also passed after the final selection-continuity change: clicking a repeated card preserves the selected unique heading, whose preview, Save and Undo still complete. Evidence: `docs/unified-canvas-imported.log`.

## Remaining boundaries

The local preview currently exposes five fixture components using development source markers. A production build check does not qualify production runtime editing or arbitrary route rendering. Imported projects require a compatible Next development adapter and an explicit project connection. Multi-file grouped imported drafts, dynamic/repeated text editing, responsive/state editing, parent-aware rearrangement, imported direct movement and general route navigation remain separate work. This slice does not establish a production-ready SaaS release.
