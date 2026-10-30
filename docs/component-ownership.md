# Cross-file component text editing

The explicit shared-instance workflow now extends this single-caller foundation.
See [Shared component instance editing](shared-instances.md) for caller markers,
typed props, multiple callers and current boundaries.

The inspector and on-page editor can trace a rendered text prop to one direct
caller in another file. The Component section identifies that caller by relative
path and line. Save changes the caller's literal prop and leaves the component
definition unchanged.

## Two source identities

The selected DOM element retains its definition-file mapping. A draft may also
have a separate write owner. File grouping, recovery records, draft lookup, Save
and Undo use that write owner; selection, canvas geometry and rendering continue
to use the original element. Mixed same-file and cross-file edits retain all
their rendering patches.

Replay recomputes the projection from persisted caller source. Pending changes
carry a hash of the component definition and its ownership coordinates. Save and
Undo recheck the definition and caller graph. Grouped Save validates the complete
proposed project view before writing, so a second caller introduced by another
member is refused before either file changes. Existing interruption journals and
exact full-file Undo remain in use.

## Supported scope

- Named function exports and const arrow exports, with named/default imports and
  import aliases. Explicit local tsconfig/jsconfig aliases are supported.
- One direct JSX caller, one destructured string prop and one direct text
  consumer. The caller's literal value is editable in Default / All sizes.
  Constrained literal unions, generics and unresolved declared prop types stay
  read-only instead of accepting text that could violate their type contract.
- Static local JS/TS/JSX/TSX project sources. The index is bounded to 1,000 files,
  1 MB per file and 20 MB overall. Generated/dependency folders and root test,
  docs and scratch folders are excluded. Source symlinks are refused.
- Imports into excluded source folders and mixed MDX/Vue/Svelte/Astro template
  modules are refused rather than silently omitting possible callers.
- Re-exports, namespaces, dynamic module paths, inherited alias configuration,
  ambiguous exports/imports, repeated callers, loops, spreads, computed props,
  defaults, wrappers and non-text props remain read-only.
- Save or undo definition-file edits before editing its caller. Save component
  prop changes before structurally rearranging the caller. Simultaneous changes
  to a definition and its dependent prop are refused during Save validation.

No project or dependency code is executed to discover ownership. The bounded
index hashes real source bytes each time instead of trusting mtimes. Parsing is
cached; symbol analysis uses small isolated views of relevant modules rather than
repeated whole-project reference searches. Read-only replay has the same 30-second
cold-route budget as source inspection; mutation outcome handling is unchanged.

The preview protocol remains **16**; existing protocol-16 adapters need no update.

## Verification

Run `npm run test:component-ownership`.

Source/API evidence: `component-ownership-source.log`. The tests cover named,
default and alias imports; caller-only previews; metadata refresh; persisted
replay; exact Save/Undo; mixed local/cross-file props; grouped Save/Undo; definition
and pre-write races; cache invalidation with preserved mtimes; and ownership
refusals. Existing grouped Save/recovery, continuous-draft and local component
tests have separate regression logs.

All four final real-API browser workflows passed: local and imported Studio and
separate window, using named/default exports and mixed same-file/cross-file edits.
They verify actual-size inline editing, spaces and Escape, runtime-caption
refusal, draft Undo/Redo, refresh recovery, caller-only Save, exact Undo and real
click handlers. Evidence: `component-ownership-final.log` and the four
`component-ownership-*.png` screenshots.

Application typecheck and production build exited 0. The build recovered from
font-download connection resets and retains existing Webpack `createRequire`
warnings in `tailwind-verifier.ts`. Current source/type checks separately cover
the prop-type contract guard. Grouped Save/recovery, continuous-draft and local
component prop regressions also passed.

After restarting, all six registered preview connections passed (Studio/window
for Control, Overfit and Keymail: 147, 62 and 935 mapped elements respectively).
Evidence: `.slightnudge/preview-logs/component-ownership-live.log`. The connection
check did not edit those projects' source files.
