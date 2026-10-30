# Embedded editor workspace

The standard `/studio` workspace keeps its two sidebars and removes the center top toolbar. Separate-window mode retains its movable editing dock.

- Pages/layers and project navigation stay in the left sidebar. The workspace menu contains Projects, Open editing window, and Focus canvas, and closes on Escape or an outside click.
- The inspector defaults to 288px instead of 315px. Drag its divider, or focus the divider and use arrow keys, to resize from 272–360px. Home or double-click resets it to 288px. Width and collapse preferences persist locally.
- Device presets, exact CSS width, and responsive editing scope occupy a compact, centered dock with rounded corners, a subtle shadow, and visible space below and beside it. The dock reserves space outside the page instead of covering content. Desktop fits the available canvas by default; explicit widths remain exact and scroll when necessary.
- Undo, Redo, Save, and draft/source status live in the inspector footer. When the inspector is collapsed or focus mode hides both panels, these actions move into the canvas footer.
- The empty inspector uses a short selection prompt. Selection formatting remains attached to the element. The centered Move control is unchanged.
- Layers use a consistent 15px outline icon system: structural frames, real flex/grid groups, headings/text, links/buttons, fields/forms, and media. Colors indicate node type; they do not imply component/reuse support that the source map cannot establish.
- Layer search preserves ancestors, reveals matches inside collapsed groups, has an explicit empty state and clear action, and clears on Escape without losing selection. Canvas selection outside the filter reveals the selected layer. Inspector labels, fields, focus rings, and disclosure states share consistent sizing and spacing.

## Single-page canvas

The local playground now displays one page on a pan-and-zoom canvas. It does not duplicate desktop/tablet/phone frames. The device/width controls still choose the real CSS viewport width; the separate zoom control changes only the visual scale. Desktop defaults to a 1200px source viewport.

Fit page shows the whole page, the zoom menu supports 10–200%, and pinch/Ctrl-wheel zooms around the pointer. Hand mode drags the view; wheel/trackpad input over the embedded page pans the outer canvas. Fit page recenters after panning. Source Move/resize gestures account for visual scale, and the Move control retains its screen size.

The local preview measures the rendered source root after layout, fonts, images, text, and class/style changes rather than holding the page inside a fixed 720px scroll window. Document scrollbars are disabled only in that editor-owned preview, and scrolling is forwarded to the canvas. Separate editing windows and imported-project connection/setup retain their browser viewport behavior.

Canvas mode is explicitly marked in the local preview URL and document. The preview owns scoped HTML/body overflow, scrollbar, and gutter rules before mounting the page; the iframe also disables its own scroll chrome. This survives iframe-only reloads, independently of the parent editor's React readiness state. The height observer and wheel forwarding reattach on each iframe document load. Inner scrollable website components are not targeted by the document chrome rules.

Qualification: `npx tsx test/review-consent.browser.ts --single-canvas --gates` checks a 2200px page, a single iframe, fit and zoom, preserved CSS viewport and typography, Move coordinates at 50%, canvas panning/wheel forwarding, Save, and exact source Undo, followed by application typecheck/build.

Qualification: `npx tsx test/review-consent.browser.ts --workspace-layout --gates` uses disposable source files and real editor APIs. It covers panel resizing, preference recovery, collapsing/focus, project navigation, responsive drafts, reload, Save, exact source Undo, fitted preview geometry, and separate-window toolbar bounds, followed by application typecheck and build.
