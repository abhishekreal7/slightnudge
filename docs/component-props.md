# Local component text props

For the subsequent arrow-component, on-page editing and protocol 16 milestone,
see [Component text editing](component-text-editing.md). The qualification below
records the earlier inspector-only implementation.

The shared Studio/window inspector now includes a Component section when the
selected rendered element has a provable local text-prop owner. It shows the
component and prop names, edits the string at the JSX call site, and leaves the
component implementation, event handlers, and unrelated props intact.

The first supported scope is a non-exported function component in the same file,
with one call, a destructured string prop, and one direct JSX text consumer.
Destructuring aliases and JSX entities are supported. Computed values, defaults,
spreads, loops, multiple calls, exported/imported components, object/function
props, and values also used by application logic are left in source. This is a
first slice of custom-component editing, not a general component prop editor.

The textarea commits on blur or Ctrl/Cmd+Enter; Escape restores the current
value. Controls are disabled while a draft revision is being inspected and in
responsive/state scopes. Source remains unchanged until Save.

The source planner resolves the original and draft strings without executing
project JavaScript and uses the existing guarded text-patch bridge. Draft
Undo/Redo, refresh replay, source Save and exact full-file Undo therefore use
the same machinery as other edits. No adapter protocol change is needed.

## Qualification — 29 October 2026

Source/API tests passed for aliases, entities, escaping, empty values, successive
drafts, no writes before Save, exact source Undo, and refusals for shared/computed
values, spreads, defaults, duplicate props, indirect `arguments`/`eval` reads,
invalid controls and oversized values. Evidence: `component-props-source.log`.

All four browser workflows passed: local/imported Studio/window, including Escape
cancellation, draft Undo/Redo, switching to a computed provider, refresh recovery,
source-call Save, exact Undo and retained real click behavior in Browse.
Evidence: `component-props-qualification.log` and the Studio/window screenshots.
The run's summary incorrectly labels the API as mocked because its flag was
missing from the summary classifier; the helper uses real HTTP responses and
asserts actual source-file writes. The classifier is corrected for future runs.

The current application typecheck, 40 rendered-bridge regression cases, and icon
replacement source/API regression tests also passed. Browser testing found and
fixed a React key collision between the new props panel and existing action
controls when switching selection.

Production build exited 0. It retains the existing Webpack `createRequire`
warnings in `tailwind-verifier.ts`; these warnings are not resolved by this
component-prop milestone.

Run `npm run test:component-props` to repeat the complete checks.
