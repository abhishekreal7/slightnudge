# Overlay contract

This contract applies to the playground at `/studio` and the source-mapped fixture editor. Source edits continue through inspect, preview, Apply and undo.

## States

| State | Visible canvas feedback |
| --- | --- |
| Idle | No selection or floating toolbar |
| Hover | The hovered element outline |
| Selected | Target outline, move and resize handles, floating toolbar |
| TextEditing | Target outline and text input. Text actions may appear in the toolbar |
| Dragging | Target outline and destination line only. The moving element has opacity 0.25 |
| Resizing | Target outline only. A destination line is reserved for reordering |
| Previewing | Selected element and reviewed draft actions |
| Applying | Reviewed draft actions show progress and prevent another Apply |
| Error | A plain status message. Failed gestures leave no canvas overlays |

State precedence is Dragging, Resizing, Applying, TextEditing, Error, Previewing, Selected, Hover, Idle. Inspector panels are application chrome. Canvas outlines, handles, floating toolbars, destination lines and gesture feedback are overlays.

## Geometry

The destination is one solid 2 CSS pixel accent line across the parent container's full bounding width. It has no children, pseudo-elements, end dots, shadow, glow or text. Horizontal layouts still show a horizontal destination line at the chosen sibling's top edge. Existing source-reordering safety rules remain in force.

The toolbar uses its measured size in viewport coordinates. It prefers 12 pixels above the target, flips below if the top lacks room, and stays at least 8 pixels inside the viewport. If neither vertical position fits, it may use a free side. If no position fits without intersecting the target, it hides until a position becomes available. It never covers the target or destination line. It hides throughout dragging, resizing and scrolling, returning after 150 milliseconds without a scroll event when the selection remains active.

## Gesture completion

Drop, Escape, pointer cancellation, failed drop and window blur remove every transient canvas overlay, restore element opacity and clear gesture listeners and transforms. Completing a gesture cannot accidentally start a second preview through the synthetic click after pointerup. A new pointer selection reveals the selection controls again. A prepared draft remains available in the inspector and can be reviewed again on selection.

Escape and blur cancel a gesture without preparing a source edit. A failed preview leaves the source and draft transaction consistent. The error notice may remain outside the canvas.

## Browser proofs and baselines

Playwright exercises real pages on an isolated workspace through `test/helpers/test-server.ts` and a free local port. Geometric assertions independently check toolbar bounds, above/below placement, nonintersection, parent-width destination lines, line thickness and absence of decorations. Completion tests cover successful drop, refused drop, Escape, pointer cancellation and blur, and confirm restored element opacity.

Nine small PNGs per editor surface cover the states above. Comparisons use the installed Playwright pixelmatch implementation with threshold 0.15 and at most 0.2% differing pixels. Screenshots disable animations and hide the caret. Tests use deterministic local fonts, viewport size and a fixed canvas crop so timestamps, external images and browser chrome do not affect the baseline. Geometry assertions remain independent of the image tolerance.

The baseline regeneration script requires an explicit update flag and runs inside isolation. Generated PNGs are copied out for deliberate review before being installed in `test/visual-baselines/`. An ordinary test run never updates them.

This integration suite may exceed 60 seconds on a cold Windows run because it compiles both real Next.js entry points, starts Chromium and captures eighteen states. It shares one isolated server to limit startup cost. Existing action and assertion timeouts are preserved.
