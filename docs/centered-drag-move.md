# Centered Move handle and direct movement

25 October 2026. Implements the requested thin green selection outline, circular handles, centered four-arrow Move control and drag-to-move behavior. The attachment was used as a visual reference; existing page content was preserved.

## Interaction

The small green Move tile is centered on the selection's top edge. It straddles the outline so it stays clear of neighboring text. Side handles are circular with larger invisible grab areas; corner width handles remain available. Height resizing is not implied by adding decorative top/bottom handles.

Dragging moves the selection in two dimensions, snapping to a 4 CSS-pixel grid. Shift locks the dominant axis. The live X/Y measurement sits beside the handle, and unrelated formatting/width chrome disappears during movement. Position is updated through animation frames rather than source requests. Releasing prepares one review; Apply saves it, Discard restores the prior position, and Undo restores the accepted source exactly.

Clicking without dragging opens precise arrow controls; clicking again closes them. Arrow controls and the focused handle's arrow keys use the same position movement as dragging. A drag release does not accidentally open the menu. Escape, blur, pointer cancellation, lost capture, scrolling and a style-scope change cancel an active gesture. Selection and viewport controls are frozen while the handle is held. The canvas frame bounds the pointer gesture.

Position is represented by ordinary pixel translation utilities, with both axes included in one proposal. Movement preserves the element's original layout space. It does not reorder siblings or introduce absolute positioning. Existing unrelated classes remain intact. The editor refuses known incompatible transforms, inline-style ownership, repeated/dynamic targets and invalid coordinates rather than silently composing an unverified transform. Apply verifies each newly added utility with the installed compiler.

## Qualified scope

The enabled UI is currently local heading/paragraph selections in Default scope. Other local targets and imported pages remain unavailable until their source/geometry mapping is qualified. This slice does not replace the handcrafted local canvas; its X/Y changes were also checked on the actual source-rendered fixture page. Arbitrary custom CSS transforms, rotated ancestors, imported projects, structural reordering and every browser/device configuration are not claimed as supported.

## Evidence

- `center-move-engine.log`: snapping, Shift axis lock, scale conversion, frame limits, existing-transform refusal, authorization, invalid coordinates, unchanged Preview source, repeated accepted moves and exact Undo passed. Token Undo preserved an unrelated external edit.
- `center-move-serial.log`: four real-API browser workflows passed, including click-open/close, centered geometry, two-axis movement, six cancellation paths, 75% scaled-canvas movement, Shift lock, one proposal per release, Discard, Apply/Undo and paragraph arrow controls. A separate browser context rendered the actual fixture and verified matching CSS translation before and after Undo. Typecheck and production build passed.
- `center-move-regression-final.log`: the existing resize/Move helpers passed 28 reported browser checks using real APIs and disposable source files. Its aggregate line came from an older harness classification that called the combined flag “mocked API”; neither helper mocked the editing API. That classification is corrected in the harness. Latest compilation results are recorded in this log.
- `center-move-undo-regression.log`: all 12 existing token Undo cases passed.
- `center-move-resize-unit.log` and `center-move-nudge-regression.log`: existing resize calculations and legacy spacing calculations/refusals passed.
- Visually inspected [the selection](center-move-selection.png), [detail](center-move-detail.png) and [drag feedback](center-move-drag.png). Early inspection caught the measurement badge overlapping the following paragraph; raising the active selection and placing the badge beside the handle corrected that presentation.

Earlier failures remain recorded. The first browser attempt used a second page in Playwright's single-page convenience context; the proof page now uses an independent context. Another run restored exact source bytes but displayed the previous compiled page after Undo. The read-only proof now requests a fresh document if that happens, matching the existing reconnect strategy; it never repeats Apply or Undo. A stale document was observed and logged in a passing run too, so the underlying development refresh timing gate remains open. An optional assertion message in the new engine test initially failed typechecking and was corrected. Later concurrent/cold-start qualification attempts and keyboard actions during transient busy states also failed; serial qualification and waiting for enabled/idle input are recorded separately. None of these failed attempts is counted as passed.

```powershell
npm run test:drag-move
npx tsx test/review-consent.browser.ts --drag-move --gates
npx tsx test/review-consent.browser.ts --manipulation-regression --gates
```

Tests write source only in disposable workspaces. Existing dirty work was preserved; no commit, push or deployment. Existing Tailwind verifier build warnings remain. The broader source-renderer, imported-project, ordinary-review persistence and timing qualification gates remain open.
