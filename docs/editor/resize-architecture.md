# Architecture Trace: Resize and Drag Direct Manipulation

This document details the read-only architectural trace of the pointer event, state update, rendering, bridge, and network pipeline during resize and drag interactions in SlightNudge.

## 1. Pointer Event Capture

### Resize Handles
- **Files & Functions**:
  - [`components/slightnudge/EditorWorkspace.tsx`](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/EditorWorkspace.tsx#L931): `startResize(handle, e)` attaches pointer capture via `e.currentTarget.setPointerCapture(e.pointerId)` on the handle button element in the parent window overlay.
  - Active pointer tracking is registered on `window` in a `useEffect` hook ([`EditorWorkspace.tsx:1228`](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/EditorWorkspace.tsx#L1228)):
    - `window.addEventListener('pointermove', move)`
    - `window.addEventListener('pointerup', up)`
    - `window.addEventListener('pointercancel', reset)`
    - `window.addEventListener('lostpointercapture', lostCapture)`
  - Rendered in parent overlay DOM inside [`SourceProjectCanvas.tsx:322`](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/SourceProjectCanvas.tsx#L322) via `renderSelection(geometry)` (`renderSourceSelection` in [`EditorWorkspace.tsx:2150`](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/EditorWorkspace.tsx#L2150)).
  - (Legacy overlay in [`components/slightnudge/SlightNudgeOverlay.tsx:1112`](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/SlightNudgeOverlay.tsx#L1112) `handleResizeStart` captures on corner button).

### Drag Move Grabber
- **Files & Functions**:
  - [`components/slightnudge/EditorWorkspace.tsx:905`](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/EditorWorkspace.tsx#L905): `startDragMove(layerKey, e)` captures pointer via `e.currentTarget.setPointerCapture(e.pointerId)`.
  - Active tracking registered on `window` in [`EditorWorkspace.tsx:1140`](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/EditorWorkspace.tsx#L1140):
    - `window.addEventListener('pointermove', move)`
    - `window.addEventListener('pointerup', up)`
    - `window.addEventListener('pointercancel', cancel)`

Both resize and drag pointer events are captured in the **parent window** on overlay handle buttons positioned directly above the preview iframe.

---

## 2. Iframe Origin: Same-Origin vs Cross-Origin

### Sample Canvas Mode (Fixture / Playground)
- **URL**: `new URL(`/studio/preview/${encodeURIComponent(localPageId || 'fixture-1')}`, window.location.origin)` ([`SourceProjectCanvas.tsx:94`](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/SourceProjectCanvas.tsx#L94)).
- **Origin**: **Same-origin**.
- **Access**: `iframe.contentDocument` is directly accessible from the parent window.

### Imported Source Projects Mode
- **URL**: Read from repository metadata via `/api/slightnudge/repositories/[id]/preview-check` ([`SourceProjectCanvas.tsx:231`](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/SourceProjectCanvas.tsx#L231)), resolving to external dev server ports (e.g. `http://localhost:3001` or docker ports).
- **Origin**: **Cross-origin**.
- **Access**: `iframe.contentDocument` is inaccessible due to the Same-Origin Policy. All communication must pass via `window.postMessage` to the injected bridge script ([`lib/slightnudge/source-canvas-bridge.ts`](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/lib/slightnudge/source-canvas-bridge.ts)).

---

## 3. Propagation of Size/Move to the Element

- **Resize**:
  1. `EditorWorkspace.tsx` `move` listener calls `setLiveWidth(gesture.nextWidth)` inside a `requestAnimationFrame`.
  2. React re-renders `EditorWorkspace`.
  3. `useEffect` on `[liveMove, liveWidth, selectedLayer, sourceReady, repositoryId]` ([`EditorWorkspace.tsx:1170`](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/EditorWorkspace.tsx#L1170)) detects `liveWidth !== null` and calls:
     `sourceCanvas.current?.command('gesture', selection, { maxWidth: liveWidth })`.
  4. `SourceProjectCanvas.tsx` `command(...)` posts a bridge message `{ channel: 'slightnudge', type: 'command', operation: 'gesture', maxWidth: liveWidth }` to the preview iframe.
  5. Inside the preview iframe, `source-canvas-bridge.ts` ([line 514](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/lib/slightnudge/source-canvas-bridge.ts#L514)) handles `'gesture'`:
     `element.style.maxWidth = `${message.maxWidth}px`;`
     Then it calls `geometry()` (sending a `'source-rect'` message back to the parent) and `reply(true, '', describe(element))` (sending a `'slightnudge:reply'` message back).
- **Move**:
  1. `EditorWorkspace.tsx` `move` listener calls `setLiveMove({ key: gesture.key, ...gesture.next })` inside a `requestAnimationFrame`.
  2. `useEffect` on `[liveMove, ...]` calls `sourceCanvas.current?.command('gesture', selection, { x: liveMove.x, y: liveMove.y })`.
  3. Bridge script sets `element.style.translate = `${message.x}px ${message.y}px`` and replies with `geometry()` and `reply()`.

---

## 4. React Commits per Pointermove

There are **2 to 3 React commits per pointermove frame**:
1. **Commit 1**: `setLiveWidth` or `setLiveMove` inside `requestAnimationFrame` triggers a commit of the 220KB `EditorWorkspace` tree.
2. **Commit 2**: `useEffect([selectedLayer, liveWidth, ...])` ([`EditorWorkspace.tsx:888`](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/EditorWorkspace.tsx#L888)) measures dimensions and calls `setElementDimensions(...)`, triggering a second React commit.
3. **Commit 3**: The bridge receives `'gesture'` and posts `'source-rect'` back to the parent. `SourceProjectCanvas.tsx` receives it and calls `receiveSourceGeometry` in `EditorWorkspace.tsx` ([line 818](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/EditorWorkspace.tsx#L818)), which executes `setElementDimensions(previous => ({ ...previous, [key]: ... }))`, triggering a third React commit.

---

## 5. Network Requests During Drag

- **During Drag**:
  - No HTTP network requests (e.g. `/api/slightnudge/preview`, `nudge`, `inspect`) fire during active pointer movement.
  - However, bridge `postMessage` calls fire at 60 Hz across the window boundary.
- **On Pointerup**:
  - `triggerBackendPreview` fires an HTTP POST request to `/api/slightnudge/preview` or `/api/slightnudge/apply` with the final payload.

---

## 6. Layout Reads (Forced Reflows) During Pointermove

Layout is synchronously read during the drag loop in two locations:
1. **Parent Window**:
   - [`EditorWorkspace.tsx:888-898`](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/EditorWorkspace.tsx#L888):
     Inside `useEffect([..., liveWidth, ...])`, every frame loops over all keys in `elementRefs.current` and reads `el.offsetWidth` and `el.offsetHeight`, causing layout thrashing in the parent.
2. **Preview Iframe**:
   - [`source-canvas-bridge.ts:515`](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/lib/slightnudge/source-canvas-bridge.ts#L515):
     On every `'gesture'` message, `geometry()` calls `describe(selected)`, which calls `element.getBoundingClientRect()` and `getComputedStyle(element)`. Immediately after, `reply(true, '', describe(element))` invokes `describe(element)` a second time. This causes forced style and layout recalculation inside the iframe twice per frame.

---

## 7. Conversion of Zoom and Scroll to Pointer Deltas

- **Zoom Stage**:
  [`CanvasStage.tsx:69`](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/CanvasStage.tsx#L69) applies `transform: scale(${scale})` to the canvas stage content.
- **Resize**:
  - Initial scale is computed once at pointerdown:
    `scale = (elementRefs.current[key]?.getBoundingClientRect().width || currentW) / currentW;` ([`EditorWorkspace.tsx:946`](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/EditorWorkspace.tsx#L946)).
  - Pointer delta is converted in `widthFromPointer`:
    `delta = (clientX - startX) / scale` for handle `'e'`, and `-(clientX - startX) / scale` for handle `'w'`.
  - Nested container scroll, ancestor transforms, and multi-axis resizing are not accounted for.
- **Move**:
  - `scale = rect.width / node.offsetWidth;`
  - In `translation.ts:snappedMove`, delta is computed as `(event.clientX - gesture.x) / scale`.
  - Scroll deltas of parent scrollable containers are omitted during the gesture.

---

## 8. Handle Anchor Offset Computation

- In [`EditorWorkspace.tsx:931`](file:///c:/dev/vibecheck/scratch/editor-safety-port-20261108/components/slightnudge/EditorWorkspace.tsx#L931) (`startResize`):
  - `setResizeStartX(e.clientX)` and `setResizeStartY(e.clientY)` record screen cursor coordinates.
  - The offset between the cursor and the handle geometry (anchor point) is **not computed or preserved**.
  - Delta is computed purely from `(event.clientX - startX) / scale`.
  - If the user grabs 6px off-center, or if zoom is 200% or 50%, the handle does not stay locked under the cursor.
  - Only 4 handles exist (`w`, `e`, `sw`, `se`), only modifying width/maxWidth. Top, north, and height resizing handles are absent.

---

## 9. Pointerup Sequence

When the user releases the pointer (`pointerup`):
1. Parent `up` handler is invoked.
2. `reset()` is called:
   - Cancels pending `requestAnimationFrame`.
   - Releases pointer capture via `capture.releasePointerCapture(pointerId)`.
   - Clears gesture refs (`resizeGesture.current = null` or `moveGesture.current = null`).
   - Sets React states: `setIsResizing(false)`, `setResizeHandle(null)`, `setLiveWidth(null)`, `setDimensionTooltip(null)`.
3. If movement occurred:
   - Calls `triggerBackendPreview('style' | 'move', ...)`.
   - Sends network preview request (`/api/slightnudge/preview`).
   - Awaits response, dispatches bridge command to update iframe CSS, updates local element state.

---

## 10. Data Flow of One Pointermove

```
[1. User moves pointer]
        │
        ▼
[2. Handle button receives pointermove in Parent Window]
        │
        ▼
[3. Pointer coordinates stored in gesture ref; rAF scheduled]
        │
        ▼
[4. rAF fires: setLiveWidth / setLiveMove (React Commit #1)]
        │
        ▼
[5. useEffect([liveWidth]) triggers layout read (el.offsetWidth/offsetHeight) on all elements]
        │
        ▼
[6. setElementDimensions called (React Commit #2)]
        │
        ▼
[7. sourceCanvas.current.command('gesture') posts message across window bridge]
        │
        ▼
[8. Bridge script in Preview Iframe receives 'gesture']
        │
        ▼
[9. Bridge writes inline CSS style (maxWidth / translate)]
        │
        ▼
[10. Bridge reads getBoundingClientRect & getComputedStyle (forced layout in iframe)]
        │
        ▼
[11. Bridge posts 'source-rect' & 'slightnudge:reply' back to Parent]
        │
        ▼
[12. Parent onGeometry handler calls setElementDimensions (React Commit #3)]
```

