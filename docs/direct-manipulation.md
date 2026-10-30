# Direct manipulation: snapped width resizing

Latest follow-up: [centered drag movement](centered-drag-move.md) implements the requested selection styling and local two-axis drag-to-move. Statements below about free movement being unfinished predate that bounded slice; imported/structural movement remains unfinished.

25 October 2026. Founder priority: direct manipulation, useful movement, resizing, snapping and clear feedback. This pass completes the supported local width-resize interaction; it does not declare all movement/layout editing complete.

## Shipped behavior in this slice

- The local selection's sides and bottom corners now have native button handles with larger hit areas around the small visible pills/circles. Corners resize width, and their cursor/labels describe width rather than implying unsupported height changes.
- Dragging displays the snapped max-width value immediately. The live canvas, measurement badge and eventual proposal use the same supported preset. A small magnetic band prevents flickering around preset boundaries. Measurement guides remain quiet and appear only during manipulation.
- Pointer geometry accounts for the measured rendered scale and root rem size. Width still uses the local canvas's supported standard max-width presets. This is not a claim that arbitrary imported/custom token scales are supported.
- Movement events update a local preview through animation frames; they never send a source proposal for every pixel. The final pointer-up coordinate determines one review. A click or a drag back to the starting width does not create a resize edit.
- The selected target stays pinned. Escape, blur, pointer cancellation, lost capture, scrolling or a style-scope change cancel the gesture and restore the prior width. Viewport buttons are disabled during a drag. Duplicate Escape handling was removed, and the old gesture's release click cannot select a different underlying layer after cancellation.
- Width controls support Left/Right for adjacent presets and Home/End for the limits, with the existing select as another keyboard path. Resizing retains explicit Preview → Apply/Discard → exact-edit Undo.
- The focused Move button now accepts directional arrow keys for the existing spacing nudges. The arrow pad remains available. Free drag-to-move and sibling reordering are not enabled by this change.
- Reduced-motion preferences disable nonessential handle feedback through the module styles and existing app-wide near-zero-motion rule. Artificial width transitions on the selection wrapper were removed so cancellation and a following keyboard adjustment use the restored geometry immediately.

Source patching, Apply/Undo receipts and recovery continue through the shared editing APIs. No absolute-position workaround, new styling runtime, dependency or source-writing pointer stream was introduced.

## Evidence

- `direct-manipulation-unit.log`: width snapping, bounds, root units, magnetic hysteresis, centered/scaled pointer geometry, keyboard steps and invalid measurements passed.
- `direct-manipulation-final-qualified.log`: five real-API browser workflows passed in a disposable application, including six cancellation paths, larger hit areas, measured snapped geometry, no per-frame proposals, final-event handling, frozen selection, Discard, a 75% CSS-scale case, keyboard presets, source Apply/Undo, reduced motion, and Move keyboard nudging. Application typecheck and production build both exited 0.
- `direct-manipulation-move-regression.log`: existing movement calculations, four directions, negative spacing, responsive calculation and ambiguous-margin refusals passed.
- `direct-manipulation-existing-ui-diagnostic.log`: the existing 23-check resize/Move browser regression passed on the diagnostic rerun, including all four pointer-menu Move directions, source Apply/Undo and width controls.
- Visually inspected the active resize UI at 75% CSS scale: [resize screenshot](direct-manipulation-resize.png).

Early failed runs are retained. `direct-manipulation-browser.log`, `direct-manipulation-events.log` and `direct-manipulation-final.log` exposed cancellation losing selection through overlapping Escape/release behavior. `direct-manipulation-complete.log` reached source Apply/Undo but used an overly strict reduced-motion assertion: the app-wide rule computes a near-zero duration rather than literal zero. `direct-manipulation-verified.log` exposed an intermediate cancellation/keyboard measurement during the old wrapper transition; that transition was removed and the test now verifies restored geometry. `direct-manipulation-release.log` timed out during cold-start page discovery; the harness now uses the same longer readiness deadline as the existing resize harness. An initial existing-UI run (`direct-manipulation-existing-ui.log`) timed out on a disabled Move button after earlier editing operations. Its diagnostic rerun passed and captured transient busy states while operations finished; the original timeout's cause is not conclusively resolved. The broader existing timing gate remains open. The final build retried Google Fonts downloads before succeeding. Existing Tailwind verifier build warnings remain.

```powershell
npm run test:manipulation
npx tsx test/move-controls.test.ts
npx tsx test/review-consent.browser.ts --direct-manipulation --gates
npx tsx test/review-consent.browser.ts --resize
```

All source-writing tests operate on disposable copies. Original fixture changes from earlier work were preserved. No commit, push or deployment was performed.

## Direct manipulation next

1. Attach selection and manipulation geometry to the actual source-rendered page, preserving the current Studio shell and compact controls. The handcrafted local page model remains a limitation of this slice.
2. Build parent-aware drag movement with a clear target, snap feedback, keyboard equivalent, cancellation and one reviewed source transaction. Flow spacing, reordering and free positioning need distinct semantics; do not silently introduce absolute positioning.
3. Add parent-owned padding/gap handles for qualified simple layouts, then expand layout types only with source/render/Undo evidence.

The tested scale case is a CSS transform at 75%, not qualification of every browser zoom, mobile/touch device or imported project. Imported live-page manipulation, arbitrary height/aspect-ratio resizing, alignment-to-neighbor snapping and free movement remain unfinished. Source targeting, scope verification, recovery and real-project release gates still apply despite the higher feature priority.
