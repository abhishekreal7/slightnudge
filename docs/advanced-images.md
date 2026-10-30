# Optimized and responsive image editing

Qualified on 2026-10-28: 20 rendered image cases across local/imported Studio and window views passed, with application typecheck and production build exiting 0. Focused source, asset and browser-runtime failure checks passed as listed below.

The shared editor now handles `next/image` content and literal native responsive source sets. The implementation is shared by Studio and the separate window, for both local and imported projects.

## Supported editing

- Default `next/image` imports, including aliases such as `Photo`, with literal sources or static raster imports. Replacement changes this JSX usage; the original import and shared asset file remain untouched. Missing intrinsic dimensions are materialized from the original static asset so switching to a string source preserves sizing. Literal `fill`, `sizes`, width/height and loading props remain in place.
- Relative static image imports and local TypeScript/JavaScript path aliases. Asset resolution stays inside the project and refuses symlinks. Shadowed component or asset bindings are not mistaken for the imported image.
- Image alt text, including empty decorative descriptions, for supported source-mapped images. Literal Tailwind fit/focal styles also recognize trusted `next/image` usages.
- Native `img srcSet` lists and `picture` groups with literal `source` lists. Replacement updates the complete image set, including its fallback. Width/density descriptors, `media`, `type` and `sizes` stay in place. The editor generates correctly sized raster variants and preserves declared PNG/JPEG/WebP/AVIF/GIF formats.

For example, a picture's `200w, 400w` AVIF branch and `1x, 2x` WebP branch become new AVIF and WebP assets with the same descriptors and breakpoint conditions. This operation replaces all branches with variants of the chosen image; it does not provide independent art-direction uploads for individual branches.

## Draft and source integrity

The adapter identifies trusted `next/image` usages and records their source positions and logical source. The shared browser bridge projects draft replacements through the current optimized URL structure, retaining candidate widths, descriptors and quality. It validates original source markers and rejects conflicting runtime changes. Save lets Next.js regenerate its image output; verification checks the saved revision rather than committing draft DOM attributes to source.

All replacement candidates decode before the current draft DOM changes. Broken candidates leave the prior draft intact. Image source attributes are owned independently of classes and text. Picture source changes are part of the same draft, refresh recovery, grouped Save and exact source Undo as the fallback image. Uploaded/generated library files remain after Undo or discard because source files may reuse them.

Generated sets are bounded to 24 unique variants, widths up to 10,000 pixels, at most 40 million output pixels per variant and 32 MB of encoded variants. Output sizing accounts for JPEG orientation. Animated responsive sets are refused. Image controls reset with selection, and stale uploads cannot apply to another selected image.

The image milestone introduced protocol **12**; the current editor uses **13**, which also carries component-action mappings and reversible attributes. Existing imported adapters need the usual reversible adapter update and a preview-server restart to acquire the current source mappings and runtime.

## Boundaries

Shared/prop-driven source providers, JSX spreads, custom image loaders, `overrideSrc`, authored/dynamic blur placeholders, dynamic source-set lists, custom picture children, unsupported formats and ambiguous repeated render targets remain protected. Static assets with orientation metadata need explicit dimensions when replacing a Next.js static import. Source edits apply in All sizes / Default scope. These restrictions preserve the owning component or provider; this milestone does not implement arbitrary CMS/data-provider editing.

## Verification

Run `npm run test:advanced-images`.

- `test/advanced-image-source.test.ts`: static imports and aliases, dimensions/fill, independent usages, fit source changes, actual generated variant dimensions/formats, unsafe provider refusals without variant writes, oriented output bounds, loader markers and shadowed bindings.
- `test/advanced-image-bridge.test.ts`: complete candidate decoding, failed-candidate atomicity, exact picture/optimized-image discard, runtime source-set conflict protection and optimized Save verification.
- Existing native image content, asset import authorization/junction checks and image-attribute bridge regressions also pass, along with 40 shared rendered-bridge cases and adapter integrity checks.
- `docs/advanced-image-local-final.log`: actual local Next.js optimizer and native picture behavior in Studio and the editing window. Five image cases per layout cover static imports, literal sources, fill, density sets and AVIF/WebP picture branches, plus fit, alt text, rendered pixels at 375/1000 pixels, refresh, grouped Save and exact source/DOM Undo.
- `docs/advanced-image-imported-final.log`: the same matrix against a separate generated Next.js 16.4.3 / Tailwind 4.3.3 project using the installed adapter and cross-origin iframe. Includes application typecheck/production build gates in a disposable application, excluding historical tests/docs/scratch.
- `docs/advanced-image-gates-final.log`: fresh typecheck and production build of the final application source, including the orientation bounds/refusal refinements.

These are deterministic real-API browser workflows, not a claim of universal compatibility or a new qualification of every public-project image provider. Screenshots: `docs/advanced-image-studio.png` and `docs/advanced-image-window.png`.
