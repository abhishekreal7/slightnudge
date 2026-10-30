# Native image content editing

Implemented and qualified in Studio and the separate editing window: replace a source-mapped native image, edit its alt text, or explicitly mark it as decorative. These edits share continuous drafts, Undo/Redo, refresh recovery, Save and exact source Undo. Classless native images support content edits while unsupported framing controls remain disabled.

Replacement imports PNG, JPEG, WebP or GIF into the project's local asset library. The browser decodes the replacement before applying draft attributes. Source dimensions, loading attributes and framing styles are preserved. Natural image dimensions can still affect layouts that depend on intrinsic sizing.

Alt text preserves HTML entities and whitespace from the original JSX and safely writes quotes, ampersands and angle brackets. Escape cancels an uncommitted text edit. Mark as decorative writes an explicit empty alt attribute, including when the original attribute was absent.

## Source ownership and boundaries

Attribute patches own only the changed src/alt attributes. Stale source values, externally changed runtime attributes and broken image decodes are refused without overwriting the existing DOM. Preview leaves source files untouched; the existing durable Save and Undo writer handles source updates. Asset uploads require the editor session token, validate image signatures and refuse symlinked public/library directories. Imported library files remain after source Undo or draft discard because other content can reuse them.

This report records the original native-image qualification. The subsequent [optimized and responsive image milestone](advanced-images.md) adds trusted `next/image` usages, static imports and literal native `picture`/`srcSet` replacement. Dynamic attribute providers, JSX spreads and custom/prop-driven source providers remain protected. Content changes still apply in All sizes / Default scope.

The original protocol 11 carried reversible native image attributes; protocol 12 added optimized-image source mappings and responsive candidate replay. The current editor uses protocol 13, which also supports reversible component-action attributes. Existing imported adapters require the normal reversible adapter update and development-server restart; this work does not automatically modify connected repositories.

## Evidence

- `test/image-content.test.ts`: real preview API, repeated content edits, mixed content/framing drafts, entity decoding, absent/decorative alt text, no pre-Save source writes, exact Undo and refusal boundaries.
- `test/image-assets.test.ts`: session authorization, MIME mismatch, directory junction protection and successful project-local PNG import.
- `test/image-attributes-bridge.test.ts`: decoded replacement, stale/runtime attribute protection, broken-image refusal and exact attribute restoration.
- `docs/image-content-current.log`: real UI upload, rendered image pixels, repeated alt edits, Escape, decorative text, draft Undo/Redo, refresh, Save and exact source/DOM Undo in both views. Isolated application typecheck and production build both exited 0; these gates exclude historical tests/docs/scratch.
- Shared rendered bridge regressions (40 cases) and adapter integrity regressions also passed.

Run `npm run test:image-content` to repeat the focused suite and application gates. Browser qualification uses a deterministic local native-image fixture, not a new qualification of public-project image components.

Inspector screenshots: `docs/image-content-controls-studio.png` and `docs/image-content-controls-window.png`. Restored source screenshots: `docs/image-content-studio.png` and `docs/image-content-window.png`.
