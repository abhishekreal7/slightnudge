> **Current status, 25 October 2026:** Read [recovery-and-next-steps.md](recovery-and-next-steps.md) for current test evidence and unresolved reconnect behavior. Read [product-interactions-direction.md](product-interactions-direction.md) for the founder's latest product direction: useful power through design states, layout relationships and comparison, with details revealed on demand. The default Playground is still handcrafted; the source-rendered imported canvas is experimental. Historical claims below that the default Studio migration is complete are superseded. Preserve the current Studio design.

# SlightNudge: product and editing foundation

> **Current founder direction:** Preserve the newer Studio interface. The attempted migration to the older shared fixture layout was rejected and `app/studio/page.tsx` restored to its pre-change version. Any architecture descriptions below saying that replacement is complete describe the intermediate delivery and are superseded by this note. Future source-accuracy improvements must be integrated into the existing Studio without replacing its visual design or removing the later corner/resize work.

## Founder summary

The product should let someone refine an existing React website by pointing at it. Every accepted change must land in their own code, remain understandable, and be reversible. A beautiful canvas that changes a different file, loses a preview, or silently saves is a product failure.

Five decisions:

1. **One real page, one editor.** The canvas must show the user's running page. It must not substitute a hand-built illustration that only looks like that page.
2. **Preview is not a save.** Keep one pending change until Apply or Discard. Show what changes and where. Changing selection must never accept a change.
3. **Power comes from trustworthy operations.** Add a control only when its result can be written and undone safely. Explain refusals with a useful next step.
4. **Simple first, detail on demand.** Show the controls relevant to the selection. Keep advanced settings collapsed. Present human labels and units; keep code in an expandable review.
5. **Imports are staged additions.** Images, icons, and project components enter through a preview and review flow. Do not promise arbitrary websites, scripts, fetched data, and components are all editable.

The biggest risks are selecting the wrong source, conflicting CSS rules, changing every use of a shared component, and a source file changing while someone edits. The first delivery removes confirmed automatic saves in both editor paths, makes Studio render actual source components, and preserves complete class lists in previews. This is a bounded foundation delivery, not a claim of a completed or flawless SaaS.

## What the current code actually contains

- `app/studio/page.tsx` now renders the actual selected fixture component inside the shared editor. The previous independent page model and hardcoded element addresses have been removed. The five sample pages can be opened through `/studio?page=1` through `5`.
- `components/slightnudge/StudioLayout.tsx` and `SlightNudgeOverlay.tsx` now serve both `/studio` and `/fixtures/*`. The overlay inspects rendered source markers, prepares edits, previews them only after validation, and calls Apply/Undo.
- `app/studio/[repoId]/page.tsx` remains a separate imported-project path using an isolated iframe. Its automatic Apply paths have also been removed. Pending proposals block selection replacement and further edit requests. Its full production integration still needs broader coverage.
- `docs/controls-spec.md` remains the control plan; the milestone sequence and founder overrides in the conversation take precedence.
- Existing backend validation and history should be retained and audited. A browser test with mocked responses does not verify their correctness.

## Editing contract

A source mapping is the address connecting a selected visible element to the code that produced it. Resolve that address and the scope of its effect before enabling source edits.

The flow is: select, inspect, prepare, preview, review, apply, undo. At each step:

1. Inspect the exact source node and retain its file version and selection identity.
2. Refuse ambiguous mappings and unsupported dynamic values. Never fall back to the first similar element.
3. Calculate a small patch without writing the original file. A patch is the proposed before/after code change.
4. Keep the preview tied to its original element even if asynchronous work finishes later.
5. Show the original and proposed values, file, affected instance, breakpoint and interaction state. Say “Not saved to source.”
6. Only explicit Apply writes. Validate that the source still matches the inspected version. An outside edit cancels the proposal and requires fresh inspection.
7. Confirm success only after the write succeeds. On refusal, explain the cause without claiming the preview was saved.
8. Undo restores the accepted change only when the file still matches the expected state. It must not erase somebody else's later edits.

For multi-file work, all proposed files must be accepted together or none written. That requirement includes imports and component extraction.

## UI decisions

- A compact top bar: project, current page, device width, zoom, Undo, review status.
- A left rail with Pages and Layers. Layers reflect actual rendered/source structure. No layer rename or lock attributes added to user markup.
- A spacious central canvas displaying the actual page. Selection outlines and handles use one accent color. The editor's typography must not leak into the page.
- A right inspector with Content, Layout, Spacing, Typography, Appearance, and Interaction. Show a short set of common controls first. Display inherited/computed values honestly rather than inventing a default.
- Typography includes verified font family, weight, size, line height, letter spacing, alignment, decoration and wrapping. Font imports require the later multi-file flow.
- A persistent review area contains Before, After, Apply, Discard and errors. Narrow layouts use a review drawer rather than squeezing every control onto the screen.
- Keyboard operation, readable focus outlines, labelled controls, and reduced-motion support are acceptance criteria.
- Viewport width and edit scope are separate: looking at tablet width does not silently choose a desktop or mobile class. Tablet-only changes must have an upper bound. Show the actual range.
- Editor-only Hide affects the canvas. “Hide on page” is a separate reviewed source edit and clearly says visitors will not see the element.

## Expansion order and acceptance demos

### Foundation: truthful review and evidence

Remove implicit writes, pin pending selections, handle failed requests, and expose the exact before/after proposal. Run tests on disposable copies. Demo: make one change, click elsewhere, observe no write, Discard, then explicitly Apply a fresh proposal. Gate: source bytes unchanged until Apply, exact Undo, and typecheck/build results recorded. Current delivery verifies this flow for the demo against the real backend and the imported UI against a simulated iframe/API contract. Imported real-project source writes remain a separate gate.

### One common Studio editing flow

The demo now uses the common source-rendered page and inspector. Next, consolidate transaction behavior with the imported iframe path and broaden identity tests. Demo: edit the same real element from the layer tree and canvas; both resolve the same file/node. Refused previews must preserve the visual state; Discard must restore the original target, even after attempted selection changes.

### Core controls and responsive styling

Follow the existing approved control scope: states/transitions, transforms, opacity/blends and comprehensive typography/layout. First compile supported utilities in the detected project version. Demo desktop, bounded tablet, mobile, hover and focus independently. Gate: all unrelated variants remain intact; conditional class construction is refused until explicitly supported; computed/fetched text is refused.

### Props and layers

A prop is a value passed into a reusable component, such as a Hero title. Edit a literal at its verified call site, not the reusable template or runtime result. Ask which instance when several exist. Add a read-only tree, then reorder only verified static siblings. Demo two instances with different titles; only the chosen literal changes. Shared-definition edits remain refused.

### Insert basics

Text, divider, link, button, image and icon first; container, card and input next. Require a safe insertion parent and review exact JSX (the markup written in React code). Never invent button actions or form submission behavior. Ask for link destination and image alternative text where needed. Demo insertion, cancellation and exact Undo, including keyboard navigation.

### Project components and external assets

Prefer components already installed in the user's project. Inspect required props and imports. Offer verified presets without inventing unavailable dependencies. External assets need type/size checks, safe SVG handling, collision-safe filenames and a review of new files. Unknown code is not executed merely because it was dropped on the canvas. Remote models and arbitrary scripts are outside initial support.

### Multi-file changes and advanced appearance

Only after atomic write/rollback tests: grouping, extraction, component imports, font assets, entrance presets and masks. Every operation includes cleanup and Undo of newly created files. Scroll animations need explicit runtime/dependency review. Expressions, cameras, particles, motion tracking and video effects remain outside this web-source editor's scope.

## Framework and CSS support

Detect Next.js and Vite + React from the project, not its name. Vite source mapping remains unsupported until its adapter and selection contract have independent tests. Estimated effort: L, including dynamic pages, dev refresh and instance identity.

The current application declares Next.js ^16.4.3 and Tailwind ^4.3.3. Detect the imported project's actual installed versions independently. Never assume v3 and v4 utilities or custom theme values behave identically. Compile easing curve classes in that project before choosing them; use the reviewed fallback only if approved by the existing spec. Arbitrary CSS entry remains deferred.

## Unverified / release gates still open

- Full real-backend consent, stale-file, crash recovery and exact-byte Undo coverage for both editor paths.
- Cross-frame instance identity, reload recovery, and overlapping asynchronous inspection results still need dedicated tests. The former independent Studio canvas has been removed.
- Previously reported audit failures and incomplete mutation evidence need reconciliation in a fresh independent review.
- Actual imported-project coverage, multiple component instances, utility conflicts, custom themes and CSS modules.
- Vite adapter, bounded tablet compilation and multi-file rollback are not claimed implemented.
- Accessibility and responsive visual acceptance of the final common Studio.
- Outside edits are detected when Apply checks the source. Continuous detection while a review sits idle is not implemented in this delivery.

Do not market these gates as passed. Measure success through completed correct edits, refusal recovery, Undo success and wrong-target count (required zero), not the number of controls visible.
