# Shared component instance editing

Studio and the separate editing window use the same caller identity, props inspector and source-draft pipeline.

## Behavior

Selecting a supported Button, Card or Badge instance exposes **This instance** props. A **Shared definition** disclosure identifies the source and explains that definition styles affect every use. The compact on-page toolbar offers Edit text and Instance props. Definition-level layout, movement and appearance controls are withheld for an instance selection; they must not silently change all uses.

Supported props are literal text, link destinations, boolean button disabled states and declared string variants. Variants project static ternary/template class expressions; arbitrary code is never evaluated. Literal defaults and prop aliases are supported. Each field must have a directly provable consumer in the selected native element.

## Identity and integrity

The development-only JSX loader passes a reserved serializable caller trace through eligible named functions and const arrow components. Native elements retain their definition mapping and also receive the callsite trace. Each trace records project-relative caller path, JSX opening ordinal and the original source SHA-256. There are no DOM wrappers or React-internals ownership lookups. Production output and authored source remain unchanged.

The server verifies the exact caller binding/import and source revision before allowing an edit. Identical labels and duplicate definition locations are separate selections when the callsites differ. The bridge refuses an unqualified duplicate locator or rendered text/attributes/classes that no longer match the source baseline.

Drafts write to the caller, preserve the definition, compose several instance edits, and regenerate projections from before/after source during refresh recovery. Save and Undo revalidate the caller and provider declaration. Full-file Undo restores the exact original source. Saved locators rebase caller hashes to the new revision.

## Current boundaries

This covers explicit direct JSX calls with supported destructured props. Map-generated items, nested shared-parent forwarding, spreads, HOCs, member/namespace components, computed caller data and indirect providers remain read-only. More complex component APIs require dedicated ownership support. Shared-definition bulk visual editing is not enabled by the disclosure.

Tests: `test/shared-instance.test.ts`, `test/shared-instance-bridge.test.ts` and `test/review-consent.browser.ts --shared-instances --gates`. The browser workflow covers local/imported projects in Studio and the separate window.

Next: advanced appearance and layout controls, beginning with gradients and shadows, then responsive constraints. Motion controls follow once those ownership and Save/Undo paths have equivalent coverage.

## Verification for this implementation

- Source/API checks passed for same-file and cross-file repeated callers, typed text/boolean/variant props, restoring defaults, refreshed draft values, replay, source Save, exact Undo, invalid values, stale callers, definition conflicts and repeated-data refusal.
- The bridge checks passed for distinct identical source locations, disabled-button selection, isolated projection/check/discard, duplicate-target refusal and rendered-text mismatch refusal.
- Four browser cases passed using real APIs and disposable source copies: local Studio, local window, imported Studio and imported window. They exercised identical callers, text and inline editing, destinations, disabled states, variants, refresh recovery, Save and exact full-file Undo.
- Existing component prop/ownership, adapter integrity, inline editing and 40 source-rendered bridge regression cases passed. The application typecheck passed.
- An initial application production build passed. A later build rerun stalled while Google font requests repeatedly reset; that redundant build was stopped after several minutes. Font configuration was preserved. Existing Webpack createRequire warnings in tailwind-verifier remain.
- Existing adapters were updated to protocol 17 with recoverable snapshots under `.slightnudge/adapter-update-backups/`. All six restarted preview connections passed: Control (147 mapped elements), Overfit (62), and Keymail (935), each in Studio/window. This connection check did not edit project source. Evidence: `.slightnudge/preview-logs/shared-instances-live.log`.

Screenshots: `shared-instance-local-studio.png`, `shared-instance-local-window.png`, `shared-instance-imported-studio.png`, and `shared-instance-imported-window.png` in this directory.

JSX children slots and compound component APIs also remain outside the supported named-prop scope. These need their own source ownership rules.
