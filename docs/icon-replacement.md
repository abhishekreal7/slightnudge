# Source-backed Lucide icon replacement

The shared icon inspector has a searchable, collapsed-by-default replacement
picker with 30 common choices. The grid uses geometry from the selected project's
installed `lucide-react` package. Search, arrow/Home/End navigation, Escape and
focus return work inside the inspector; there is no additional canvas toolbar.

Replacement changes the selected JSX usage, preserves its props, labels and
handlers, reuses visible imports, avoids shadowed bindings, and removes an old
binding only when it has no remaining references. Other usages of a shared import
keep their original icon. This is source-usage editing, not per-render isolation
inside a shared/generated component.

## Preview and persistence

The source planner retains stable JSX identities across trusted Lucide tag-name
changes and maps saved positions to the rendered SVG tag. Shape patches carry
the old/new geometry and full expected classes separately from appearance props.
The bridge keeps the SVG root and its attributes, stages only validated geometry,
and retains the original child node identities for Discard and draft Undo.

Geometry is parsed as static data without executing dependency code. The bridge
accepts a small SVG geometry/attribute allowlist and refuses scripts, event
attributes, external paint URLs, custom contents and conflicting class-driven
appearance changes. External geometry changes block Save/restore rather than
being overwritten. Saved-source verification checks the new geometry/classes;
source Undo verifies the inverted shape and restores the exact original file.

Source metadata is tied to the selected draft revision. Controls stay unavailable
while a new revision's capabilities are being inspected, including after Undo or
replacement. This prevents a stale picker from treating an old choice as current.

## Supported scope

- Named Lucide imports, including aliases and imports reused by other JSX usages.
- Supported static installed-package data formats; unavailable choices are omitted.
- Existing size, stroke, color, class and behavior props remain in source.
- Default state / All sizes, through the existing continuous draft and Save flow.
- Native SVG still supports appearance properties; arbitrary SVG shape replacement,
  namespace/custom icon providers, custom contents/viewBox overrides, shared/loop
  editing and a general custom-component prop editor remain outside this milestone.
- A dependency with a custom Webpack alias or unsupported data format must match
  the live geometry/class guard before any replacement can be staged.

This milestone introduced protocol **15**; the current editor requires protocol
**16** for [component text editing](component-text-editing.md). Run
`npm run test:icon-replacement` for source/API tests, bridge tests, local/imported
Studio/window workflows, application typecheck and production build.

## Qualification — 29 October 2026

Source/API and serialized-bridge tests passed, including exact file Undo,
original DOM-node restoration, import conflicts, composed appearance changes,
and unsafe geometry/CSS refusal. Existing icon-appearance, component-action,
and rendered-bridge regressions also passed (40 rendered-bridge cases).

Local and imported Studio/window workflows passed in
`icon-replacement-qualification.log`. Final imported Studio/window workflows in
`icon-replacement-final.log` additionally hold inspection responses to verify
revision locking and exercise both the SVG's own handler and its parent button.
Refresh recovery, Save, and exact source Undo passed. Application typecheck and
production build exited 0; the build retains warnings from
`tailwind-verifier.ts` about Webpack parsing `createRequire`.

All three registered adapters were refreshed to protocol 15, preserving snapshots
under `.slightnudge/adapter-update-backups/<repo-id>-2026-10-29T07-04-20-283Z`.
The installed Keymail Lucide 1.63.0 catalogue resolves all 30 supported choices;
full mutation workflows were tested on disposable projects rather than saving
changes to Keymail.

After restart, all six live connections passed (Studio and window for each
registered project): Control 147, Overfit 62, and Keymail 935 source-mapped
elements. Evidence: `.slightnudge/preview-logs/icon-replacement-live.log` and
`verification-all.json`. This connection check did not modify project source.
