# One editor, two presentations

Qualification on 2026-10-28 passed: seven real-API browser workflow groups across the four suites below, followed by successful isolated application typecheck and production build. The final popup rerun completed with zero captured browser errors. The earlier development-server failure is retained and described below.

Studio and the separate editing window now mount the same `EditorWorkspace` directly. Neither route imports another route, and the implicit window-mode context has been removed. Each mounted workspace owns its session state; both presentations use the same implementation rather than synchronizing two independently implemented editors.

| Route | Presentation |
| --- | --- |
| `/studio` | Local Studio |
| `/studio/window` | Local editing window |
| `/studio/[repoId]/edit` | Imported-project Studio |
| `/studio/[repoId]/window` | Imported-project editing window |

## Responsibilities

- `components/slightnudge/EditorWorkspace.tsx` owns selection, formatting, inline text, movement, layout, images, responsive editing, continuous drafts, recovery, history and source Save/Undo. Inspector and selection toolbar content is shared here.
- `components/slightnudge/EditorSessionControls.tsx` provides the same history, draft status, Save and responsive viewport controls wherever either layout places them. Buttons receive the workspace's state and callbacks; they do not own a separate editing session.
- `components/slightnudge/EditorSurface.tsx` chooses the presentation around one source canvas. Studio gets the zoomable/pannable `CanvasStage`; the editing window keeps the site's native viewport and scrolling.
- `components/slightnudge/SourceProjectCanvas.tsx` has one mount and one set of source selection, destination, geometry, recovery and text callbacks in the workspace. Its existing connection/protocol/runtime validation remains shared. Workspace options and the connection form use its single window launcher, preserving the connected imported preview address while removing internal canvas/session query parameters.
- `components/slightnudge/editor-workspace.module.css` holds the shared presentation styles. Floating panel/dock placement, sidebar sizing and canvas navigation remain layout concerns.

New editing features should be implemented in the shared workspace or a focused shared component/hook, then placed in the layouts as needed. Source validation and persistence belong in the existing shared source/runtime/API modules. Add mode-specific behavior only for viewport, navigation, positioning or panel presentation.

This is not cross-window concurrent session synchronization. Separate browser windows still have their own mounted React state and use the existing draft storage/recovery/source conflict checks. The repository setup/source-management page and older standalone overlay are separate surfaces; this change does not rewrite them or expand their editing capabilities.

## Verification

Run `npm run test:shared-editor` for the existing real-API browser workflows in disposable workspaces:

1. Core editing in both presentations: original-size inline text, button labels/icons, alignment/fill, padding/width, keyboard ownership, movement, Undo/Redo, grids, section ordering, responsive isolation and grouped Save/exact source Undo.
2. Native image content in both presentations: real upload, rendered image pixels, repeated/escaped/decorative alt text, refresh recovery, Save and exact source/DOM Undo.
3. Imported-project canvas: full-page measurement, stable viewport sizing, zoom/pan, selection, inline text, movement, multi-file refresh/Save/exact Undo, and native scrolling in the imported editing-window route.
4. Separate-window navigation: actual popup launch from Workspace options, local and imported editing, movable dock, panel sizing, Browse behavior, refresh, Save and exact Undo. Ends with isolated application typecheck and production build (historical tests/docs/scratch excluded).

Current run evidence is recorded in `docs/shared-editor-qualification.log`, `docs/shared-editor-images.log`, `docs/shared-editor-imported.log` and `docs/shared-editor-window.log`. Check their final results rather than inferring universal compatibility from this matrix.

The popup regression helper was updated to use Workspace options and the runtime's ready state, replacing outdated button/status selectors. A subsequent run completed the imported editing assertions but reported a Next.js development-server `loadManifest` JSON parse error during rebuilding; that failed run is retained as `docs/shared-editor-window-manifest-failure.log`. The final popup/gate log is a separate fresh-workspace rerun; no browser errors are filtered out to obtain a pass.
