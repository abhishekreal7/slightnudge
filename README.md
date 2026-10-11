# SlightNudge

> A visual editing workspace for making product changes directly against a project’s source.

SlightNudge is evolving from the earlier ShipCheck prototype into a visual editor for SaaS interfaces. The current workspace includes a guided playground, a source-aware element inspector, a source-change review step, safe static Tailwind edits, local before/after edit history, and public GitHub repository import. Changes are previewed first, then written to the local source file when applied. SlightNudge does not stage or commit repository files. The imported-repository flow currently prepares source files for inspection; live previews and editing across arbitrary project frameworks are still being built.

## Product direction

The goal is to let a product builder select an element in a running page, adjust its layout or visual style, and see the change reflected in source without hand-editing CSS for every small refinement. Longer term this includes text, color, images, reusable elements, and motion controls. The current implementation is an early foundation, not a finished general-purpose website editor.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- React-based visual playground
- Local Git repository handling for import and source edits
- Existing Supabase, browser automation, Anthropic, and Dodo Payments modules from the previous ShipCheck prototype

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` for the public product overview. Visit `/workspace` to open the project workspace, try the local playground, or use **Add repository** to clone a public GitHub repository. Private repository authorization is not connected yet. Imported projects are cloned under `.slightnudge/repositories` and listed in `.slightnudge/repositories.json`; this local state is ignored by Git. `/how-it-works` describes the current editing flow and support limits; `/pricing` is explicit that hosted plans are not available yet.

The local Next.js development build uses a small webpack loader to attach file, line, and column metadata to JSX host elements. Imported Next.js repositories can opt in to a reversible source adapter that adds the same metadata to their local development preview. Both run only in development. The imported repository studio can start supported Next.js and Vite apps in Docker with a read-only source mount, resource limits, and temporary dependency/build volumes. Starting a preview runs the repository's dependency install scripts and dev server inside the container; Docker network access remains enabled. Stop the preview from the studio to remove its container and temporary volumes. Click-to-source is currently available for the supported Next.js adapter. Imported source edits are limited to static Tailwind class strings: each change is previewed, explicitly applied, and recorded for undo. Dynamic classes remain read only.

## Build

```bash
npm run build
```

The legacy ShipCheck scanning and report modules remain in the codebase for now, but they are not the main SlightNudge product experience. Do not use their old landing copy, route assumptions, or visual language when extending the editor.
