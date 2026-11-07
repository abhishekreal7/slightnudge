# Editor test IDs

Part 2a implements `editor-target`, `editor-toolbar` and `editor-drop-indicator` on both editor surfaces, and `editor-canvas` on the playground. The remaining names and existing-suite selector migrations are pending Part 3.

| Test ID | Purpose |
| --- | --- |
| editor-canvas | Editable preview surface |
| editor-target | Selected element outline |
| editor-toolbar | Floating actions |
| editor-drop-indicator | Reorder destination line |
| editor-apply | Apply the reviewed draft |
| editor-undo | Undo an applied edit |
| editor-error | Plain-language error |
| control-{id} | Registry control input |

Each selector migration will be recorded with its original selector, replacement and affected suite in the sprint report.

Both surfaces expose `data-editor-state` for the nine states in overlay-contract.md. Transient canvas nodes use `data-editor-overlay` with `outline`, `toolbar` or `destination`. Playground elements use `data-editor-element` for hover suppression. The contract suite retains existing semantic handle selectors to demonstrate failures against the original implementation. No selector or assertion in an existing studio suite was changed in Part 2a.
