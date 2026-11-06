# Resize interaction diagnosis

The canvas handles currently propose the existing `maxWidth` style operation, snapping to `max-w-sm` through `max-w-6xl`. They do not edit arbitrary width/height or rotation. `widthFromPointer` only consumes horizontal movement, including for corner handles.

A real browser on a disposable local project measured the heading at 368 CSS px before and during an outward drag. The selected element is constrained by its layout. Increasing its maximum width cannot make it wider than its available layout width. This explains a visible no-op; it is not proof of a broken source writer. The source-conflict condition reported earlier can independently refuse a completed gesture.

A second blocker was proven by the real section drag: the source API produced `max-w-2xl`, but preview refused it as overridden. The playground had unlayered maximum-width declarations (hero 940px, content 410px, heading 440px), which outranked Tailwind’s utilities layer. Those same baseline declarations now live in `@layer components`, preserving their default values while allowing explicit source utilities to override them. No validation was bypassed.

The handle also left keyboard focus in the iframe because pointerdown prevents default without explicitly focusing the button. The new regression asserts that the handle owns keyboard focus during a drag. It failed before the focus change. The handler now focuses the actual button before pointer capture. The inspector calls the control “Max width”; its accessible description explains the parent-layout limit and content-derived height.

## Evidence

- `resize-interaction-diagnostic.log`: initial run, 368px before/during, focus IFRAME; initial harness erroneously counted inspect requests as edits.
- `resize-interaction-before.log`: focus assertion fails before the product fix.
- `resize-interaction-corner-overlap.log`: focus moved to BUTTON after the fix; the midpoint did not focus the expected edge button. The new harness uses the upper quarter to avoid nearby corner hit areas and exercise the edge explicitly. Exact hit-area overlap remains unverified.
- `resize-interaction-css-before.log`: real section drag refused because project CSS overrides the utility.
- `resize-interaction-draft-pass.log`: after moving baseline constraints into the components layer, section resize changes rendered width and creates one draft.
- `resize-interaction-after.log`: final real-API run, including Save and exact source Undo; only a PASS in this file establishes its result.

## Scope and remaining limitations

This is not free resizing. Height and rotation are still unsupported, and a max-width gesture can remain visually unchanged under parent constraints. True direct resizing needs layout-aware width/height operations and tests for flex/grid, intrinsic sizing, min/max constraints, responsive scopes, and Save/exact Undo. Diagonal cursors currently suggest more than the width-only engine does. No new rotation control was added.

Rotation is useful for decorative design, but is optional for a code visual editor. It must preserve existing transforms and animation ownership, use a separately validated source operation, and support preview, cancel, Save and exact Undo before exposing a handle.

Existing tests and expected results are untouched. The test uses a fresh disposable project; it does not clear or edit the user's real source/draft. Product changes are limited to the resize button’s focus/type, its Max width label and description, and the three playground CSS maximum-width declarations’ layer. No source mapping, AST patching, Apply/Undo implementation or snapping scale changes. No merge or push.

Not verified: the user's exact browser selection (local browser access is disabled), imported-project resizing, other zoom levels, a full reliability gate or production build. The previous full TypeScript run has unrelated failures recorded in draft-conflict-typecheck.log.
