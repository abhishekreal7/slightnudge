# SlightNudge Selection Chrome v2: Architecture & Component Inventory

This document provides a comprehensive inventory of the selection and resize handle subsystem in SlightNudge, detailing current component structure, styling, cursors, existing corner experiments, and the transition plan to Element-Aware Selection Chrome v2.

---

## 1. Current Selection & Handle Components

### Components & Entry Points

1. **`components/slightnudge/EditorWorkspace.tsx`**:
   - **`renderSourceSelection(selection: SourceSelection)`** (Line ~2659):
     - Mounts inside the selection artboard container over the canvas iframe.
     - Renders the outer container div with `aria-label="Selected source element"`.
     - Displays move anchor (`renderMoveControl`) when element allows dragging.
     - Renders an array of 8 static HTML button handles (`ALL_8_HANDLES`: `nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, `w`) with child `<span className={reviewStyles.handleDot} />`.
   - **`startResize(dir: HandleDirection, event: React.PointerEvent)`** (Line ~1650):
     - Captures pointer with `handleEl.setPointerCapture(event.pointerId)`.
     - Caches geometry at pointerdown (element rect, container rect, sibling rects, zoom, scrollX, scrollY, grab offset).
     - Activates full-screen transparent event shield over iframe (`eventShieldRef.current`).
     - Orchestrates single per-frame `requestAnimationFrame` loop that calls `compute8HandleResize` and updates target DOM element style directly (zero React commits).
     - Enforces smart snapping, guides, and modifier keys (`Shift` for aspect ratio, `Alt` for center resize, `Ctrl`/`Cmd` to bypass snapping).
     - Queues non-blocking Tailwind class commit upon `pointerup` or cancels on `Escape`.

2. **`components/slightnudge/SourceProjectCanvas.tsx`**:
   - **Artboard Overlay Container** (Line ~330–334):
     - Renders preview iframe `<iframe ref={frame} ... />`.
     - Positions overlay layer `{geometry && ready && renderSelection && <div className="absolute pointer-events-none" style={{ inset: 0, zIndex: 30, overflow: 'visible' }}><div style={{ position: 'absolute', top: geometry.rect.top, left: geometry.rect.left, width: geometry.rect.width, height: geometry.rect.height }}>{renderSelection(geometry)}</div></div>}`.
     - Manages cross-origin and same-origin preview messaging (`onGeometry`, `onSelect`, etc.).

3. **`components/slightnudge/direct-manipulation-engine.ts`**:
   - Implements high-performance pure math for:
     - 8-handle directional delta resolution (`compute8HandleResize`).
     - Smart snapping with $O(N)$ candidate lookup (<0.02ms for 50 siblings).
     - Client-side Tailwind class resolution for dimensions.

---

## 2. Current Outlines, Handles, Hover States & Cursors

### Outlines
- In `editor-workspace.module.css`:
  - `.sourceSelection`: Static 1px solid border `#0ccb8b` (emerald-500) with a fixed 2px border radius.
  - `.sourceSelectionOutline`: Dashed border for outline-only drag mode.
  - Scale adjustment: In zoomed canvas, border-width adjusts via `calc(1px / var(--canvas-zoom, 1))`.
  - **Limitation**: The outline does not hug the actual computed `border-radius` of rounded elements (buttons, avatars, pills, badges), creating an awkward gap between the rectangular selection outline and rounded element geometry.

### Handles
- 8 HTML `<button>` elements positioned at the 4 corners and 4 edge midpoints.
- Visual appearance: `.handleDot` is an 8px square with 1.5px `#0ccb8b` border, white fill, and 2px corner radius.
- Scaling: Scaled by `calc(1 / var(--canvas-zoom, 1))` so it retains constant 8px visual footprint regardless of canvas zoom.
- Hit area: Button wrapper provides a 20px hit area.
- Interaction states:
  - Hover: background turns `#0ccb8b` with soft emerald glow (`box-shadow: 0 0 0 3px rgba(12, 203, 139, 0.25)`).
  - Active (`aria-pressed="true"`): darker emerald `#089c69` with 4px glow.
  - Focus: visible focus ring (`outline: 2px solid #0ccb8b`).

### Cursors
- Custom cursor definition in `.studioShell`:
  - `--editor-resize-cursor`: Custom SVG cursor (26x26px with 13 13 hotspot) displaying an upright directional triangle indicator with circular anchor dot.
  - `.westCorner`: Custom diagonal cursor rotated for NESW axis.
  - `.eastCorner`: Custom diagonal cursor rotated for NWSE axis.
  - Standard edge cursors: `ew-resize`, `ns-resize`.

---

## 3. Existing Experiments & Prototypes in Codebase History

An audit of recent commits reveals existing prototypes and explorations:
1. **Commit `a613d08` & `777c2f4` (`app/studio/page.tsx`)**:
   - Introduced a curved pill corner handle hugging an 8px corner curve seamlessly with zero gap.
   - Used an SVG path (`M 18.96 7.04 A 11 11 0 0 1 28.96 17.04 A 3 3 0 0 1 22.98 17.56 A 5 5 0 0 0 18.44 13.02 A 3 3 0 0 1 18.96 7.04 Z`) with gradient shading and 1:1 resize tracking.
   - Demonstrated morphing transitions between idle dot and active curved arc handle.
2. **Commits `9110807`, `4d256e2`, `7a4c44a` (`editor-workspace.module.css`)**:
   - Refined custom resize cursors to remain upright and directional at both corners.
   - Tuned cursor hotspot coordinates to (13, 13) to align with handle center.

---

## 4. What Works (To Be Kept) vs. What Gets Replaced

### What Works & Will Be Kept
- **Direct Manipulation Core**: The 60 fps single rAF compositor loop, cached geometry at pointerdown, zero React state commits during drag, and pointer capture mechanism (`setPointerCapture`) remain fully preserved.
- **Snapping & Guides**: Sibling edge/center snapping (<1ms) and 1px smart guide rendering.
- **Modifier Keys**: Shift for aspect ratio lock, Alt for center-based resize, Ctrl/Cmd to bypass snapping, Escape to cancel and restore.
- **Non-blocking Save Queue**: FIFO optimistic save queue in `lib/slightnudge/client.ts`.
- **Keyboard Navigation**: Arrow key resizing and ARIA accessibility roles/labels.

### What Gets Replaced
- **Rectangular Bounding Box $\rightarrow$ Element-Aware SVG Overlay**:
  - Replace the static rectangular border with an SVG overlay that dynamically renders the outline matching the element's actual per-corner radii offset 2px outside.
  - Render with dual-stroke visual spec: 1.5px accent line (`#0ccb8b`) over a 1px white halo (`#ffffff` with 3.5px stroke width) ensuring high contrast on dark, light, and gradient backgrounds.
- **Static 8-Handle Set $\rightarrow$ Semantic Handle Variants**:
  - Replace static 8 square handles with variant-specific handles determined by `selectionStyleFor(info)`:
    - `dots`: For rectangular boxes ($r < 6\text{px}$).
    - `arc`: Curved arc handles (3px stroke, round caps, 14–28px length) along corner curves; short rounded bar edge handles only when side $\ge 48$px.
    - `capsule`: Pill outline with capsule handles on ends and slim bars on edges.
    - `circle`: Ring outline with 4 diagonal arc handles and locked aspect ratio.
    - `text`: Left and right edge handles only (width-only resize; vertical handles omitted).
    - `media`: Aspect-lock toggle indicator.
    - `tiny`: Single corner handle for elements < 24 screen px; edge handles suppressed when side < 40 screen px; zero handle overlaps.
  - **Constraint Fulfillment**: Handles are shown ONLY where direct resize manipulation is actually supported.
- **New Feature: Radius Grip**:
  - Circular grip inset from top-left corner.
  - Dragging directly sets `borderRadius` on element during drag with 0 network calls.
  - Snaps to studio radius scale steps (`none`, `sm`, `rounded`, `md`, `lg`, `xl`, `2xl`, `3xl`, `full`).
  - Calls existing client preview/save on release; `Escape` restores original.
- **Morphing Transitions**:
  - 120–160ms ease-out transitions between variants with 2px hysteresis to prevent edge jitter.

