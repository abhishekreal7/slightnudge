# Button labels and appearance

26 October 2026.

Local links and buttons now expose text and typography controls. A button with one static direct label can keep adjacent icon markup while its label is edited in place. The editable label inherits the real button typography; Escape restores it, and empty commits restore the previous label. Clicking an arrow or SVG selects its parent button. Editing does not activate the link or submit the form.

The AST edit replaces only the label node, preserving nested JSX, attributes, destinations and button type. Dynamic labels and ambiguous mixed text remain refused. Preview, draft refresh, Discard and Save verification use the same label semantics, rather than replacing the entire button's text content and erasing icons.

Appearance changes on static links/buttons use verified Tailwind important utilities so an intentional user edit can override normal project CSS. These are ordinary classes written to source at Save; the preview does not hide a different result behind inline styling. Subsequent edits replace the same property rather than stacking important utilities. Existing unsupported CSS conflicts still refuse safely. Inspector fill/radius values reflect authored choices or show a custom value.

The local editor-owned preview mounts the actual client page before initializing its bridge and restoring drafts. It avoids hydrating mutable canvas HTML across Next development rebuilds, where server and client bundles can briefly contain different source revisions. The source components and project CSS are still used directly. Interaction stays disabled until the bridge is ready, and source Save still verifies the resulting rendered revision.

Verification uses disposable source copies: label text, icon selection, inherited typography, empty/cancel recovery, fill/size/corners, text-and-style draft refresh, grouped Save and exact Undo for a link styled as a button; native button label Save/Undo with an SVG icon; AST tests for preserving SVG markup and attributes, priority-token replacement and dynamic-text refusal. Run `npm run test:buttons`. The combined button, editor, imported-project and build qualification is recorded in `docs/button-editor-regression.log`.

This slice does not qualify arbitrary rich-text editing, dynamic labels, all interaction states or responsive overrides.

The later [component action milestone](component-actions.md) adds Next Link mappings, literal destinations/opening behavior, native-button type/enabled properties and source-ownership explanations. Arbitrary component props and icon replacement remain outside that milestone.

Final qualification: all six combined real-API browser workflows passed with no browser errors during editing, followed by application typecheck and webpack production build (both exit 0). Button-source, continuous-draft and 25 bridge regression checks also passed. Existing Tailwind verifier `module.createRequire` build warnings remain.
