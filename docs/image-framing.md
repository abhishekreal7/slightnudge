# Image framing

Qualification passed: both Studio and the editing window, real rendered crop pixels, responsive isolation, draft recovery and Save/exact Undo. The isolated application typecheck and production build exited 0. Source API tests, 40 shared bridge cases, and adapter integrity regressions also passed.

The design inspector now shows a compact Image framing section for source-mapped native `img` elements with editable literal Tailwind classes. It offers Cover, Contain, Stretch, Original size and Scale down, plus Center/Top/Bottom/Left/Right focal positions. Controls use the current responsive/interaction scope and the same immutable draft, refresh recovery, Save and exact Undo workflow as other style edits. Classless images and styles owned by components or variables retain the existing source safety restrictions.

Fit and focal position are independent source properties. Editing either preserves the other, responsive variants, hover styles, `src`, `srcSet`, `sizes`, intrinsic dimensions, alt text and loading attributes. Custom focal values remain protected; non-image source targets are refused. The installed project's compiler and the actual rendered image must confirm the requested utility.

Adapter protocol 10 exposes computed object-fit and object-position for verification. Existing imported adapters require the normal reversible update and preview-server restart before using these controls.

## Evidence

The browser checks use an authored local fixture with a deterministic red/blue native image on Chromium. They prove the displayed crop with screenshot pixels; this is not a new public-project qualification of imported image components.

- `test/image-framing.test.ts`: real preview API, project CSS compilation, source attribute preservation, no source writes before Save, exact Undo and refusal boundaries.
- `docs/image-framing-qualification.log`: Studio and window browser qualification using screenshot pixels to prove left/right focus changes the actual crop, draft Undo/Redo, refresh, Save and exact source Undo; application typecheck/build gates.
- `docs/image-framing-responsive.log`: adds tablet-only fit changes and verifies the phone crop stays unchanged, then repeats recovery/Save/Undo and application gates.
- `test/source-rendered-bridge.test.ts` and `test/adapter-webpack-regression.test.ts`: shared bridge and adapter regressions.

Run `npm run test:image-framing` for the current source tests and browser qualification. Screenshots are `docs/image-framing-studio.png` and `docs/image-framing-window.png`.

## Remaining media work

The subsequent [native image content milestone](image-content.md) adds replacement and alt text. [Optimized and responsive image editing](advanced-images.md) extends those workflows to trusted `next/image` usages and literal responsive source sets, and recognizes trusted Next.js images for fit/focal styles. Prop-driven/custom source providers, aspect-ratio controls, video/poster controls and arbitrary draggable focal coordinates remain outside these milestones.
