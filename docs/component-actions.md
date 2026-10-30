# Component editing: links and button behavior

Qualified on 2026-10-29: all four component workflows passed across local/imported Studio and window views, including deliberately held replay. Both existing core editor browser workflows also passed. Application typecheck and production build exited 0.

The shared editor now exposes compact action controls in the inspector. Studio and the separate window use the same source transformer, controls, runtime patches, drafts and persistence.

## Available controls

- Native anchors and modern default-imported `next/link` components, including aliases: edit a literal destination and choose the same tab or a new tab. Supported destinations include page paths, anchors, query strings, HTTP/HTTPS addresses, mail and telephone links. New-tab changes retain existing relationship tokens, remove a contradictory `opener` token and add `noopener noreferrer`.
- Native buttons: choose Button, Submit form or Reset form, and toggle enabled state when those properties are static. Click handlers and the owning form remain in source. The editor does not convert a button's event handler into a link.
- Existing label editing also recognizes mapped Next.js Link usages, including one text label beside an immutable nested icon. Other Link usages, icons, prefetch props and handlers are preserved.

Changes commit to the live draft on blur/Enter or control selection. Escape cancels destination text. Invalid destinations display an inline explanation. Source files change only on Save; every property participates in draft Undo/Redo, refresh recovery, grouped Save and exact source Undo. Controlled checkbox/select values show the pending choice immediately and settle back to the rendered value after success or refusal.

## Ownership and limitations

The inspector reports the rendered source scope and explains that other renders of the same source element inherit source changes. Several independent Next Link JSX usages are separate source elements. Repeated rendered elements remain refused by the runtime and marked in Layers; source loops and known shared definitions are also refused on the server, including classless label edits.

Computed destinations and properties remain read-only with their current rendered values and a provider explanation. JSX spreads, custom navigation handlers, `as` rewrites, legacy Link behavior and inherited parent-Link ownership remain protected. The All sizes / Default scope is required for behavior edits. No handler code is generated, removed or executed by these controls.

This is the first component behavior milestone. Icon replacement, arbitrary custom-component props, explicit shared/all-instance editing, data-provider editing and form destination editing remain separate work. Runtime routing rewrites that prevent source/DOM attribute matching are refused rather than guessed.

## Implementation

- `link-identity.ts` and the development source loader recognize default `next/link` bindings and aliases while respecting shadowed names. Source markers are injected into compiled development output, not committed JSX.
- `link-source.ts` inspects source ownership and changes only supported literal attributes. `link-values.ts` provides the same destination validation to the source API, inspector and serialized browser runtime.
- `source-draft.ts` computes reversible `href`, `target`, `rel`, `type` and `disabled` deltas. The bridge validates each attribute against the element type and rejects unsafe destinations or conflicting runtime changes before changing draft DOM.
- `ActionControls.tsx` is shared by both layouts and reads capabilities before enabling controls. Existing image attributes, CSS/text ownership and source conflict checks remain in place.
- Draft replay now exposes its busy state, deduplicates simultaneous replay requests and waits for operation recovery. Controls and mutation shortcuts stay unavailable during replay.

The action milestone originally required protocol **13**. The current editor requires **16**, which also supports [icon appearance editing](icon-properties.md), [icon replacement](icon-replacement.md), and [component text editing](component-text-editing.md). Existing imported projects need the normal reversible adapter update and preview-server restart.

## Verification

Run `npm run test:component-actions`.

- `test/component-actions.test.ts`: actual preview API, composed destination/opening/label/button changes, preserved handlers/icons/other usage, no source writes before Save, exact source Undo, source-provider/loop/URL/scope/shadow refusals, and loader mappings.
- `test/component-actions-bridge.test.ts`: real browser runtime, atomic attribute replay, reflected disabled state, nested-icon preservation, saved verification, invalid URL/event/cross-element/target refusal, exact discard and external destination protection.
- `docs/component-actions-local-final.log` and `docs/component-actions-imported-final.log`: the same eight-change workflow in local/imported Studio and window views. Includes invalid URL and Escape, destination/rel/target/label changes, button type/enabled state, draft Undo/Redo, computed/shared protections, refresh, Save and exact source/DOM Undo. Replay is deliberately paused to prove the editor stays busy, Save stays disabled and double-click cannot start inline editing before restoration completes. Window cases exercise real Browse-mode form reset, the original click handler and a Next Link popup with no opener. The imported project uses Next.js 16.4.3 / Tailwind 4.3.3 and a cross-origin preview with the installed adapter.
- `docs/component-actions-core-regression.log`: existing text/button/layout/movement/responsive/grouped Save/Undo workflows in both layouts, plus final application gates.
- Forty shared rendered-bridge cases, button source regressions, adapter integrity and existing native/optimized image bridge checks also passed.

Application typecheck and production build use a disposable application and exclude historical tests/docs/scratch. These generated-project workflows establish this supported scope; they do not establish universal custom-component compatibility.

The completed local test copy `C:\Users\abhis\AppData\Local\Temp\sn-review-consent-VLvnvu` remains after automatic approval review rejected optional deletion with “blocked by policy.” It is not an application source checkout or a required runtime dependency.
