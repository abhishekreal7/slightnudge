# Studio selection Move control

Latest behavior: [centered drag-to-move](centered-drag-move.md) replaces the left-aligned spacing-menu trigger with a centered grab handle. Its arrow controls now adjust position using the same translation as dragging. The original spacing implementation below is historical; the underlying legacy spacing API remains available.

Follow-up: [direct manipulation](direct-manipulation.md) adds focused Move arrow-key input and a snapped width-resize interaction with larger handles, live measurement and cancellation.

25 October 2026. Requested follow-up to the missing Move button in the paragraph selection UI.

The selected element now has a compact **Move** button alongside its width controls. Opening it reveals four directional spacing buttons on a white, softly bordered surface. The control has visible focus states, Escape-to-close without losing selection, outside-click dismissal, disabled states during review/recovery, and reduced-motion support. It uses the existing preview, review, Apply, Discard and exact-edit Undo flow.

Move adjusts spacing by one supported Tailwind step. It is not free dragging or sibling reordering. The disconnected old drag gesture remains unexposed; source-order reordering still requires a renderer that represents the same sibling tree. The current Playground also retains its separate canvas representation, so this UI work does not close the source-renderer milestone.

The paragraph's initial class metadata was brought into agreement with its existing source class list, allowing inspection of the paragraph shown in the request. This does not modify the fixture. Negative initial spacing was corrected so Up and Left from an unset margin produce a real negative utility. Automatic/custom/overlapping margin classes are refused before preparing a patch. Responsive utility calculation is tested, while Studio still refuses scopes it cannot preview precisely. Imported previews validate the resulting margin against a compiled utility and may refuse unavailable or overridden styles.

## Validation

- `studio-move-final.log`: 23 real-API browser checks passed in a disposable copy. This includes existing resize/cancellation behavior; Move disclosure and Escape; visual preview; disabled review state; Discard restoration; Apply and exact source/render Undo; all four directions on the requested paragraph. Application typecheck and production build both exited 0.
- `studio-move-engine.log`: four directions, negative initial spacing, responsive calculation and six ambiguous-margin refusals passed without source writes.
- `studio-move-bridge.log`: 25 embedded bridge checks passed, including verified margin preview and exact Discard restoration.
- Visually inspected the selected heading and paragraph with Move open. Screenshot: `C:/Users/abhis/AppData/Local/Temp/slightnudge-move-control.png`.

Early logs `studio-move-browser.log` and `studio-move-verified.log` caught a test reading the margin before React painted the restored state. `studio-move-restoration.log` confirms that waiting for the rendered result resolves the assertion; no source loss was observed. The final regression explicitly waits for the rendered margin after Discard and Undo.

```powershell
npx tsx test/move-controls.test.ts
npx tsx test/source-rendered-bridge.test.ts
npx tsx test/review-consent.browser.ts --resize --screenshot --gates
```

The build retains existing Tailwind verifier warnings. No commit, push or deployment. This is a tested control addition, not a claim that the entire editor is flawless or that arbitrary dragging is supported.
