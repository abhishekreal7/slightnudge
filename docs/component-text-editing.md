# Component text editing — 29 October 2026

The later [cross-file ownership milestone](component-ownership.md) adds text-prop
editing through a single direct caller in another file. Shared and indirect
callers remain outside that supported scope.

Supported component text props can now be edited directly on the page through
double-click or Edit text, as well as in the inspector. The original typography
and element geometry remain in place. The source change updates the prop at its
call site; the component implementation and click handler remain intact.

## Ownership and scope

Local function declarations and `const` arrow components with implicit or block
returns are supported. The same conservative rule applies: one component call,
one destructured string prop, one direct text consumer, no external export,
spread, repeated provider, default, indirect read, or application-logic use.
Reassignable arrow bindings are refused. Known unsupported ownership now has a
read-only explanation in the Component section instead of silently disappearing.
Imported/exported definitions, shared instance overrides, non-text props and
general component schemas remain unfinished.

The shared client inspects the current draft revision before editing. Inline
entry also compares rendered text with the source prop, refusing runtime text
that has diverged. A rejected inline commit cancels the staged text rather than
leaving an unsaved visual change behind. Inspector edits revert their local
field value when a change is refused.

## Button editing

The browser workflow exposed a native button editing issue: when the button
itself was contenteditable, spaces could invoke button behavior instead of being
inserted. Text-only buttons/links now use the same inherited text span previously
used for labels alongside icons. Font, color, line-height, letter-spacing and
text-transform inherit from the real element. Enter commits, Escape restores,
and the temporary span is removed when editing finishes.

The bridge change requires protocol **16**. All three registered imported
adapters were updated with reversible snapshots under
`.slightnudge/adapter-update-backups/<repo-id>-2026-10-29T13-07-19-231Z`.
Refresh results: `component-text-adapter-refresh.log`.

## Verification

`npm run test:component-props` runs source/API ownership tests, the real serialized
inline bridge, and local/imported Studio/window workflows with application gates.
Evidence for this milestone is recorded in `component-text-source.log`,
`component-text-inline-bridge.log`, `component-text-final.log`, and the regression
logs.

- Source/API ownership, exact Save/Undo and refusal tests passed, including
  aliases, shorthand props, both arrow return forms, and unrelated components
  that use the same prop name. Local value-symbol analysis avoids TypeScript's
  structural-property reference merging without permitting shorthand-object
  reads used by application logic.
- The serialized bridge passed real keyboard spaces/angle brackets, inherited
  font and original button height, Enter/Escape, restoration and click behavior.
- All four real-API browser workflows passed: local and imported Studio/window.
  They cover inspector edits, on-page edits, typography/height, runtime-caption
  refusal, provider explanations, draft Undo/Redo, refresh replay, call-site Save,
  exact source Undo and actual Browse clicks.
- Application typecheck and production build exited 0. Existing Webpack warnings
  in `tailwind-verifier.ts` about `createRequire` remain.
- Forty rendered-bridge cases and the component-action bridge regressions passed.
- All generated adapter hashes match, and all three original Next configs match
  their pre-update snapshots.
- After restarting the preview servers, all six live connections passed (Studio
  and separate window for each registered project): Control 147, Overfit 62,
  Keymail 935 mapped elements. Evidence:
  `.slightnudge/preview-logs/component-text-live.log`. No real-project source edits
  were made by this connection check.
