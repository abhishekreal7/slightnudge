# Imported Studio canvas

Imported Next.js projects use the same single-page canvas as the local playground at `/studio/<repository>/edit`. Project setup provides **Open Studio**. The separate editing window remains available from the preview connection controls and Studio's project menu.

## Behavior

- One cross-origin live preview expands to measured document content, up to 60,000 CSS pixels. The surrounding canvas owns pan/zoom and document scrolling; intentionally scrollable widgets retain their own wheel interaction.
- Fit shows the entire page. Width presets and exact widths change the real iframe viewport width; visual zoom does not change the page's typography or responsive width.
- The existing centered Move control keeps its screen size. Pointer deltas are converted from screen coordinates to source coordinates at the current zoom.
- Imported Studio now uses continuous drafts, including multiple files, draft Undo/Redo, refresh restoration and explicit grouped Save/Undo. There is no per-edit Apply barrier in this canvas.
- Connection controls remain outside the zoomed page and collapse after connection. They expose reconnect and the separate editing window.
- The separate window keeps the site's native viewport and scrolling. Canvas-only styling is gated to a session-bound preview's canvas query flag; project source files are not changed by canvas sizing.

## Design viewport and limits

Full-page iframe height must not recursively grow a `100vh` hero. Canvas mode uses a 720px design viewport for vertical viewport units in accessible CSS rules and inline styles; width breakpoints remain native. The adjustment begins after hydration. The original source CSS is preserved, and opening the separate window restores the native viewport behavior.

Cross-origin inaccessible stylesheets, height media queries, viewport-dependent JavaScript, embedded frames and unusual document layouts need further real-project qualification. Use the separate window to assess those native viewport behaviors. This implementation is not a blanket claim of compatibility with every website.

Adapter protocol **6** is required. Old adapters must be removed/re-enabled using project setup, then the project server restarted. Existing integrity checks preserve modified files during this process.

## Verification

`npx tsx test/review-consent.browser.ts --imported-canvas --gates` runs a real imported Next/Tailwind application on another origin. It covers a `100vh` hero plus long content, Fit and 50% zoom, viewport width, scrollbar suppression, original-size inline text editing, scaled Move, two-file drafts, refresh, source Save/exact Undo, forwarded wheel and native separate-window scrolling. Hydration errors are failures.

Additional regression commands: `npx tsx test/source-rendered-bridge.test.ts`, `npm run test:adapter`, and `npx tsx test/review-consent.browser.ts --single-canvas`.

`npx tsx test/imported-canvas-runtime.test.ts` separately verifies vertical viewport sizing, dynamic inline viewport styles, and preservation of quoted CSS content and custom-property identifiers. Its evidence is in `docs/imported-canvas-runtime-regression.log`.

Evidence is retained in `docs/imported-canvas-qualified.log` (including dynamic content growth/shrink, iframe-only reload, application build and production boundaries), `docs/imported-canvas-bridge-regression.log`, `docs/imported-canvas-adapter-regression.log`, and `docs/imported-canvas-local-regression.log`.
