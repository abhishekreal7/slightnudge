# Appearance and responsive constraints

Studio and the separate editing window share these controls and the existing source-draft pipeline.

## Controls

- **Fill & effects → Gradient:** linear gradients with an angle, 2–4 ordered color stops, stop percentages, native color pickers, 6/8-digit hex colors and a live form swatch. Set gradient previews the complete gradient atomically. None disables the gradient in the chosen scope while keeping the solid background.
- **Fill & effects → Shadow:** Soft/Medium/Strong presets and custom X/Y offsets, blur, spread and color with alpha. Setting a shadow replaces the shadow utilities in the chosen scope; rings and other breakpoint overrides are preserved.
- **Constraints:** minimum width, maximum width, minimum height and self alignment. Grow/shrink controls appear for flex items. Controls distinguish authored values in the chosen scope from computed CSS.

Both groups start collapsed. Form edits and swatches stay local until Set; the page then shows a visual draft without changing source. The global Save writes the composed changes. Exact Undo restores the original source file. Editing another group does not reset an unfinished effect form.

## Ownership and scope

Effects are written as bounded arbitrary Tailwind utilities, compiled with the actual project compiler. Direction/stop helpers or shadow size/color helpers in the chosen scope are replaced together. Other classes and breakpoints remain intact. Shadow preview accounts for existing Tailwind ring layers.

Constraints use supported project utilities. Responsive overrides use the project's discovered minimum-width breakpoints, including custom names and thresholds. They apply at that breakpoint and larger until another authored override applies. All sizes edits the base rules. Hover/focus/pressed effect and constraint controls are disabled; use Default or a responsive breakpoint.

This supports editable static Tailwind class literals. Custom image fills, radial/conic or variable backgrounds, unsupported arbitrary/multi-layer/inset shadows, custom constraints and dynamic/shared-definition ownership remain protected by the source guards. It does not add a general CSS parser, arbitrary component-style overrides, mixed responsive/interaction scopes or animation editing.

The bridge protocol is 18 so imported previews can return the additional computed style and parent-layout metadata.

## Verification

Source/API tests: `test/appearance-layout.test.ts` checks atomic replacement, solid fill/ring/other-breakpoint preservation, invalid-value rejection, custom-effect refusal, custom breakpoint constraints, generated CSS, refresh projection, Save and exact Undo.

Browser workflow: `test/review-consent.browser.ts --appearance-layout --gates` uses real APIs and disposable projects for local/imported Studio and window modes. It checks rendered gradients, shadows, rings, flex constraints, breakpoint cascade, unchanged neighbours, refresh recovery, source Save and exact Undo.

Additional coverage: `test/responsive-tailwind3.test.ts` verifies the new utilities against Tailwind 3; the source-rendered bridge regression suite checks existing behavior.

## Results

- Source/API tests and the 40 existing source-rendered bridge cases passed.
- The new gradient, shadow and responsive constraint utilities compiled with Tailwind 3; the imported/local browser projects used Tailwind 4.
- All four browser cases passed in both the initial and expanded runs. Expanded checks included a third gradient stop with alpha and removing a shadow while preserving rings.
- Application typecheck and production build exited 0. Existing Webpack createRequire warnings in tailwind-verifier remain. A final application typecheck also passed after visual refinements.
- The current Studio was visually checked with native color pickers, gradient swatch, shadow fields and constraints. There were no page errors, no edit requests, and the source stayed unchanged. Evidence: `appearance-controls-live-gradient.png`, `appearance-controls-live-shadow.png`, and `appearance-controls-live-constraints.png` in this directory; `.slightnudge/preview-logs/appearance-ui.log`.
- Existing adapters were updated to protocol 18 with recoverable backups. All six restarted preview connections passed: Control (147 mapped elements), Overfit (62), Keymail (935), each in Studio and window modes. This connection check did not edit their source. Evidence: `.slightnudge/preview-logs/appearance-live.log`.

Self alignment is shown for flex/grid items; grow and shrink are shown for flex items. These controls do not enable visual shared-definition style editing where source ownership remains unsupported.
