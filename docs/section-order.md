# Source section order

Select a source element, open **More formatting options**, and use **Order in container → Move earlier / Move later**. These controls change the element's place among its siblings. Its contents move together, surrounding content follows normal document flow, and keyboard/accessibility order follows the saved source.

Changes join the existing continuous draft. You can edit text or styles after reordering, Undo/Redo individual draft gestures, recover the draft after refresh, then Save everything in that source file together. Save verifies the actual rendered child order. Undo restores the saved source snapshot.

Supported in the local source canvas and imported Next.js editing windows, in Default scope. The selected element must have uniquely mapped direct siblings in the same source container. The first/last controls disable at their respective edges.

Controls choose siblings within the same CSS order group, so a navigation bar pinned above the page can stay there while sections rearrange. Changes that leave visual order unchanged because of CSS are refused. Component boundaries, repeated instances, loops/conditional content in the crossed range, absolute/fixed positioning, and explicit grid placement are also refused with an explanation. Cross-container moves are not implemented.

The centered Move handle still controls pixel offsets. **Order in container** changes source order without adding translations.

Evidence:

- `test/section-order.test.ts`: unequal subtrees without IDs; stable source identities; edit after move; refresh reconstruction; no preview writes; grouped Save and exact Undo; dynamic-boundary refusal.
- `test/reorder-safety.test.ts`: 32 existing resolution, permutation, whitespace, loop/conditional, API and manipulation checks.
- `test/helpers/section-order-browser.ts`: actual DOM and visual order; child preservation; draft Undo/Redo; edge controls; edit after move; refresh; source Save and exact source/DOM Undo.
- `test/helpers/live-window-browser.ts`: imported localhost drafts combining text, weight and order; refresh recovery; Save and Undo.

Run `npm run test:section-order`; use `npm run test:window` for imported window coverage.
