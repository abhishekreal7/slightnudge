# Component focus and variants

Status: proposed specification, based on source inspection on 2026-11-03. Branch: `docs/component-focus`. This task changes documentation only. Existing dirty product files were preserved. No tests were run or edited, and no preview, Apply, adapter installation, or project import was performed.

The reference supplies behavioral ideas: a component breadcrumb, variant navigation, a scoped tree, and grouped properties. It does not supply our code, icons, wording, palette, branding, or component model. The labels in a user's source remain their labels; screenshot labels are not evidence of supported variant types.

| Capability | Current foundation | Proposed first release |
| --- | --- | --- |
| Identify one supported component call | Exact callsite trace, provider/caller checks, typed instance props | Reuse; do not introduce another ownership engine |
| Component focus and breadcrumb | Native source tree and parent keys; no proven component-boundary/focus model | One real page, logical focus boundary and navigation overlays |
| This instance | Supported literal text, destination, disabled state, button type and narrow string enums | Default; existing recoverable draft/preview path |
| All N uses | Definition awareness and an explicit definition-style entry exist, but no complete caller list/acknowledgment contract | Disabled until complete impact discovery and server-side scope validation exist |
| Variant switching | A narrow typed enum-to-static-class projection exists | Switch existing options and edit supported instance props |
| Recipe styles | No `cva` or `tailwind-variants` interpreter found | Read-only; no recipe execution or branch rewriting |
| Layers | Native type icons, parent links, qualified identities and repeated-key counts | Add truthful component/shared badges; keep distinct source-use and rendered-copy counts |

## Fixed decisions

- Every new component selection starts in **This instance**. Entering focus never elevates scope.
- Definition edits require an explicit **All N uses** choice with every caller listed before Apply. A warning without a caller inventory is insufficient.
- Anything unsafe is refused with a specific one-line reason. No AI or evaluation of project/dependency JavaScript to infer ownership or classes.
- Focus outlines, masks, labels and breadcrumbs are editor DOM/CSS above the iframe. They do not wrap, reposition, resize, hide, or restyle the authored page to simulate isolation.
- Source writes use the existing authenticated preview/Apply/Save paths and their conflict, compiler, ownership, history and Undo checks. Focus navigation itself never writes source.
- One actual website preview is used. No duplicate variant artboards or cloned component editor are introduced.

## 1. What exists today

### 1.1 Definition identity and caller identity are different

1. [`next-source-loader.cjs`](../lib/slightnudge/next-source-loader.cjs), `componentFunctions`, `instanceImports`, and its development-only transform attach native definition-file/line/column markers and pass a reserved caller trace through eligible function components. They change compiled development output, not authored component files. Eligibility is narrower than arbitrary React: directly declared named functions or `const` arrows with suitable parameter shapes; unsupported wrappers/imports receive no trusted instance marker.
2. [`instance-trace.ts`](../lib/slightnudge/instance-trace.ts), `parseInstanceTrace`, reads project-relative caller path, JSX opening ordinal and original source SHA-256. It rejects malformed/absolute/traversing paths and malformed hashes. The parser accepts up to 16 trace entries; **that does not mean nested instance editing is supported**.
3. [`instance-ownership.ts`](../lib/slightnudge/instance-ownership.ts), `resolve`, requires exactly one trace entry. It checks caller bytes, the selected native opening, the containing provider declaration, the actual JSX call and symbol/import ownership. Same-file calls and named/default imports can work. It refuses loops, indirect calls and changed caller/provider ownership.
4. [`source-canvas-bridge.ts`](../lib/slightnudge/source-canvas-bridge.ts), `locator`, `key`, `matches` and `catalog`, qualifies rendered identity with the instance trace. Two calls with identical labels can therefore be distinct targets. Multiple rendered nodes with the same complete locator remain ambiguous and are refused. This native-element catalog is not a React component-boundary tree.
5. A prop edit writes its **caller** file while the selected DOM element retains its **definition** mapping. `updateInstanceComponent`, `instancePatches`, and [`source-draft.ts`](../lib/slightnudge/source-draft.ts) preserve that distinction, rebase caller hashes, and project text/classes/attributes to the qualified instance.
6. [`component-ownership.ts`](../lib/slightnudge/component-ownership.ts), `validateComponentDependencies`, rechecks ownership for Save/Undo. Its legacy cross-file `trace` path requires one unique cross-file text caller; it is not a public enumerator for all callers. The explicit instance path is what handles several distinct direct callers today.

### 1.2 Supported props and important refusals

[`instance-props.ts`](../lib/slightnudge/instance-props.ts), `instanceProvider`, `instanceFieldValue`, `classValue`, and `validateInstanceValue`, is the authoritative narrow parser:

| Pattern | Current behavior and boundary |
| --- | --- |
| Named destructured text prop | A direct supported consumer can be edited. Prop aliases and literal defaults are supported in the instance path. Legacy local/cross-file text paths are narrower and can refuse defaults or constrained types. |
| Link destination | A direct prop consumed as an anchor/trusted Next Link `href`; value must pass destination validation. Arbitrary URL-building functions are not evaluated. |
| Boolean flag | Direct button `disabled` consumer with a boolean type. Bare true, literal true/false and a supported default are readable. Not arbitrary conditional rendering or boolean-based class styling. |
| String enum | A string-literal union with at most 20 values, each at most 80 characters. A class consumer must resolve to static strings for every allowed value through the supported expression grammar. |
| Button type | Only the existing supported button/submit/reset options. This is a prop contract, not permission to edit handlers. |
| Computed value | `label={record.title}`, variable lookups, function calls and unsupported expressions cannot be rewritten as though they were literals. Individual fields can currently be omitted when resolution fails; the proposed UI needs per-field refusal metadata rather than guessing why a field disappeared. |
| Spread or duplicate props | Spreads on the call or selected consumer, or duplicate occurrences of the edited prop, refuse ownership/value resolution. Other bindings using rest destructuring do not establish permission to edit rest-provided values. |
| Children slots | `children`, callbacks, `key`, `ref` and dangerous HTML are excluded from the named-prop editor. Arbitrary JSX children, rich slots and compound component APIs are not supported. Do not turn slot contents into a text prop. |
| Nested shared parents | More than one trace entry is explicitly refused: forwarding ownership is not supported. Showing a breadcrumb cannot authorize editing a nested forwarding chain. |
| Repeated data | A `.map`/loop call is refused. A rendered index or identical-label position is not a source owner. |
| Multiple consumers | Non-class fields need a single directly proved value read. A prop also controlling other text/behavior is refused. For classes, all reads must stay inside the supported class expression. |
| Wrappers, indirect or unresolved ownership | HOCs, member/namespace calls, unsupported forwarding, ambiguous import/export resolution and missing markers cannot be treated as proven direct instance ownership. |

The bounded project graph refuses source symlinks, mixed unsupported template modules, unresolved/excluded source imports, ambiguous or inherited alias configurations, dynamic module paths, relevant re-exports/indirect providers and ownership scans beyond its current bounds. Preserve the existing 1,000-source-file, 1MB-per-file, 20MB-total bounds and dependency-record validation limits; do not enlarge them for this feature. An incomplete scan is never a caller count.

The caller-value reader accepts quoted string literals (including a quoted string in a JSX expression), supported literal booleans and parentheses around those expressions. A template literal or constant identifier at the caller is not accepted merely because a human can see its value. Template/concatenation support above refers to the separate class-expression grammar.

### 1.3 UI, API and evidence qualifications

- [`ComponentProps.tsx`](../components/slightnudge/ComponentProps.tsx) already renders text, boolean and enum fields, the caller location and a Shared definition disclosure. It inspects the current draft revision, cancels stale inspection requests, locks stale results, and restores the old field value after a refused change.
- Inspection is `inspectComponentPropsAPI` in [`client.ts`](../lib/slightnudge/client.ts), using **`POST /api/slightnudge/preview`, `kind: component`, `operation: inspect`**. There is no separate component-props API route.
- The preview route requires Default/All sizes for component prop writes and verifies the supplied write owner against the selected definition/trace. Caller structural drafts and definition/caller dependency conflicts already cause refusals. Keep these restrictions.
- The current [`EditorWorkspace.tsx`](../components/slightnudge/EditorWorkspace.tsx) also has `openDefinitionStyles` and `definitionStyleKey`. It explicitly inspects a definition before allowing selected style/text/movement paths to omit the instance marker. **It does not enumerate all project callers or bind consent to an N-use impact manifest.** Some same-file shared definitions are still refused by AST safety checks. This entry is not a completed All N uses workflow and must not be used as its authorization shortcut.
- [`feature-inventory.md`](feature-inventory.md), F30/F31, records working bounded instance props and a partial shared-definition UI at an earlier snapshot. Its assertion that definition editing is only explanatory is stale relative to the current workspace entry above. Neither the inventory nor [`shared-instances.md`](shared-instances.md) proves a complete shared-edit scope model now.
- Existing evidence to preserve: [`shared-instance.test.ts`](../test/shared-instance.test.ts), [`shared-instance-bridge.test.ts`](../test/shared-instance-bridge.test.ts), [`component-props.test.ts`](../test/component-props.test.ts), [`component-ownership.test.ts`](../test/component-ownership.test.ts), and [`shared-instance-browser.v3.ts`](../test/helpers/shared-instance-browser.v3.ts). These cover bounded identity, type/refusal, projection, recovery and source-write behavior. Their existence/historical logs are **not** fresh test results from this task.

## 2. Component focus mode

### CF1 — Enter, navigate and leave

**Entry:** a selected eligible instance exposes a contextual **Focus component** action, also available from its Layers row. Activate with click or the action's normal Enter/Space behavior. Keep double-click reserved for the existing text editor; do not overload it to enter focus.

Resolve the provider/caller first. Focus is available only when a single component return boundary and its rendered root can be proved from the source mapping and trace. The current `parentKey` tree alone cannot establish that boundary. A new read-only boundary descriptor is required: provider identity/hash, caller identity/hash, exact trace, proven root locator and owned native descendants. Fragments with unproved roots, portals, polymorphic/conditional roots and missing mappings are read-only until supported.

**Presentation:** keep the actual page in place. Use the product's restrained accent for the boundary and a light outside-focus mask above the iframe. Masks/decoration have no pointer events. Only the breadcrumb and explicit focus actions accept pointer events; place them outside the selected rectangle. No site-layout/CSS changes, synthetic component mounts or copied reference assets.

**Breadcrumb:** show the actual page title, then the proved component name, for example `Overview › OfferCard`. Each parent crumb returns to that navigation context and restores its previous selection/scroll/zoom when still valid. Derive names from source identity, not visual resemblance or the nearest styled div. Additional nested crumbs require independently proven boundaries; they do not bypass the current nested-edit refusal.

**Exit:** page crumb or Exit focus returns to page selection. Outside-page clicks offer exit/navigation only, never silently change the write target. Escape first cancels a gesture/text operation, then closes a chooser, then leaves focus; it does not discard accepted drafts. Navigation creates no Undo frame and does not force Apply/Discard for an ordinary supported draft.

**State:** focus is UI navigation state, separate from project/file draft ownership. Full/Fit and window transitions share the same draft and ownership engine. After refresh, re-resolve before restoring the focus boundary; stale context returns to the page with the draft preserved. A new selection starts in This instance.

| Before | Action | After |
| --- | --- | --- |
| A page has two identical card calls | Focus the second through its qualified row | Breadcrumb identifies its real provider and second caller; the site layout and first call are unchanged. No source edit or Undo frame. |
| A focused component has a supported pending caller draft | Choose the page crumb, then return | The draft stays attached to the same caller/file; focus navigation adds no Save pit stop. |
| A selected portal/fragment has no proven single root | Request focus | Refuse: “This component's rendered boundary cannot be proved.” No nearest-div substitute or fabricated breadcrumb. |

### CF2 — Selection inside the boundary

Scope canvas hit testing and the displayed Layers subtree to locators whose source ownership and exact call trace belong to the proved boundary. Keep original node identity and iframe-offset/zoom conversion; do not introduce focus-relative source coordinates.

An interior native node may be selected for inspection, but mutation depends on **that node's** consumer contract. A supported label can edit its caller prop. An unmapped style on a shared child is read-only in This instance. Selecting a nested component exposes its identity and refusal; it cannot select the first matching inner instance or jump to a different caller.

Keep the focused source target fixed during a gesture. A stale node/provider/caller stops projection, preserves the last verified draft and offers reinspection. Layers remains the fallback for covered but uniquely mapped native nodes. Focusing does not enable repeated ambiguous nodes or unsupported structural edits.

| Before | Action | After |
| --- | --- | --- |
| Two focus descendants have the same text but distinct native locators | Select one through Layers | The outline and prop owner match that exact descendant and caller, including at Fit zoom. |
| A label has one supported named text prop | Edit the label inside focus | The caller literal changes in preview; the provider and another call remain unchanged. |
| A child is inside a second shared-parent trace or represents a repeated map item | Attempt an instance edit | Refuse: “This forwarding or repeated-data owner is not supported.” No trace truncation, DOM-index write or parent substitution. |

## 3. Scope and impact

### CF3 — This instance versus All N uses

**This instance:** show the component name, caller file/line and the definition file separately. The value being edited belongs to the caller. Existing props are the only writable instance controls in V1; focus does not create CSS overrides or detach components.

**All N uses:** an explicit scope chooser must first fetch a complete source caller inventory. Define **N as distinct direct source JSX callsites**, not loaded DOM copies, pages visited, labels matched or files touched. Display “N source calls across the project” next to the scope choice. Show the separately known number of rendered matches on the current page; do not label it a project-wide runtime count.

Before the user chooses this scope, list **every caller** with project-relative file, line/column, source component/import binding and static usage context. Multiple calls in one file have separate rows. Grouping by file is allowed; truncating to the first few callers or hiding the list in a tooltip is not. A scrollable complete list is acceptable without a forced scroll-to-bottom ceremony. Shared-layout callers must be identified as potentially appearing on multiple routes; do not invent a route count.

Any unresolved import, excluded relevant module, nested forwarding/repeated-parent ambiguity, dynamic/repeated call whose impact cannot be bounded, unknown provider escape, cycle, graph limit or stale hash disables shared writes. An unknown count is not zero or one. Offer a read-only explanation and source location. V1 does not expand the current nested/repeated ownership boundary.

The impact review distinguishes:

- **Source write owner:** usually one definition file for a literal definition style edit.
- **Callers affected:** every proved source call and its file, including off-page calls.
- **Visible projection:** exact qualified rendered nodes on this loaded page.
- **Unrendered contexts:** listed callers not presently shown. Their source relationship is proved; visual equivalence on their pages must not be claimed from one iframe.

Choosing All N uses is scoped to the exact component/definition node and a source-graph manifest, not a global editor preference. No automatic elevation from a disabled style control. Keep the scope visible in the breadcrumb/inspector and attach it to every draft/review entry.

**Required new safety contract, not present today:** an impact manifest binds project root, definition identity/hash, complete sorted caller identities/hashes, scan completeness, operation and affected targets. The server recomputes/validates it at preview and immediately before Apply through the existing paths. Comparing only N is insufficient: replacing one caller with another at the same count invalidates approval. Preserve current dependency/graph limits; over-limit edits remain refused. A browser-only scope toggle or dropping `instance` from a request does not establish permission.

Changing source, definition, project, caller set or relevant draft invalidates the manifest and requires a fresh caller review/explicit choice. Save review shows the complete caller list again. Restored shared drafts retain their recorded scope visibly; revalidate it before enabling Apply. Never relabel a restored shared draft as This instance. New edits/selections still default to This instance.

Do not reinterpret this scope as “write this prop to every call.” V1 variant/prop changes are caller-only. All N uses means editing a supported definition node; bulk-setting caller props and changing definition defaults are separate, unsupported operations.

| Before | Action | After |
| --- | --- | --- |
| Three static callers exist across two files | Open scope chooser and choose All 3 uses | All three rows are shown, the two caller files and one prospective definition write are distinguished, and shared controls enable only after server proof exists. |
| An approved three-caller draft exists | Replace one caller with a different caller while keeping the count at three, then Apply | Refuse: “The component's callers changed; review its uses again.” No write. |
| An unresolved re-export or loop makes impact incomplete | Request All N uses | Refuse: “All component uses cannot be proved.” No guessed count, skipped caller or partial bulk edit. |

## 4. Edit contract and exact source effects

### CF4 — Existing typed props first

Use the current component inspection and preview path with the exact caller write owner and selected definition/trace. Display only proved editable fields; extend read-only inspection metadata to distinguish an omitted default from an explicit value and to return per-field refusal reasons. These metadata improvements are proposed, not existing UI signals.

Text edits commit through the existing text-field behavior; enums and booleans propose one change per accepted choice. Every accepted edit is a recoverable draft preview. The page changes only after the existing safe projection succeeds; Save/Apply writes source later. A refusal restores the control's prior value and keeps the prior draft. No per-keystroke source Save and no extra Apply gate after every small change.

| Edit kind | Exact proposed code change | Boundary/refusal |
| --- | --- | --- |
| Instance label, e.g. `label="Start"` | Replace only the selected call's initializer with a string literal expression, e.g. `label={"Begin"}`. Preserve the provider body, handlers, icons and other calls. | Refuse a computed value, slot, mixed/rich text or multiple behavioral consumers. Prop input limit remains the existing 10,000 characters; direct in-place text has its separate existing guard. |
| Instance destination | Update the literal caller prop that feeds the selected `href`, e.g. `to={"/guide"}`. No route/module creation. | Validate destination with the existing validator; refuse computed builders or a prop consumed elsewhere. |
| Disabled state | Set the caller's supported boolean initializer, e.g. `disabled={true}`; add an override if a proved literal default was omitted. | Refuse callbacks, computed booleans, conditional subtrees or a flag also controlling unsupported class/behavior consumers. |
| Button type | Replace the caller's supported literal type with one of the declared supported options. | No arbitrary handler/form behavior editing; refuse unresolved provider/type. |
| Variant choice | Replace/add only the selected caller's enum literal, e.g. `appearance={"quiet"}`. Derive the class projection using the existing static expression parser; do not rewrite its expression. | Every value needs a proved projection, unique consumer, supported type and valid project CSS. Unknown or computed choices refuse. |
| Undo a choice that overrode an omitted default in the current draft | Revert to the original caller bytes, including removing the newly added prop when the baseline omitted it. | Do not claim a general post-Save “remove override” operation exists. An explicit value equal to the default remains explicit; equality is not inheritance. |
| All-N definition literal text | Update the proved static JSX text node in the definition; leave caller literals and forwarded labels intact. | Requires the new shared-scope capability. Prop-fed text must not be converted into shared literal text. |
| All-N definition literal style | Replace only the selected supported utility in a literal native `className`, e.g. `p-4` to `p-6`, through the existing style preview and compiler checks. Definition file changes; callers do not. | Requires new shared-scope authorization and per-instance projection. Initially Default/All sizes only. Refuse dynamic classes, CSS overrides, unsupported/shared ownership or incomplete impact. |
| Variant branch/style recipe, component defaults, slot structure, arbitrary prop or detach | No source change in V1. | “This source pattern needs a dedicated editor.” Do not flatten a recipe, add inline styles, remove forwarding, clone a definition or invent a new prop. |

The last two writable shared-definition rows are **staged future support**, not present-day permissions. The current AST shared guards and caller/definition dependency validation must not be weakened to make the controls appear functional. A new explicit ownership capability must satisfy them through the existing preview/Apply architecture first; until then these rows stay disabled.

A pending caller draft and a definition edit that invalidates its provider cannot be silently combined. Retain the engine refusal and say “Save or undo the instance draft before changing its definition.” Focus navigation and unrelated supported instance edits remain available according to existing draft rules. Do not turn a navigation action into a forced Save/Discard dialog.

| Before | Action | After |
| --- | --- | --- |
| Two calls pass the same literal label | Edit the second to a new label, refresh, Save, Undo | Only the second caller is previewed/written; refresh recovers it; Undo restores original bytes on an otherwise unchanged source. |
| A call omits a supported literal boolean default | Toggle it and undo before Save | An explicit override previews the change; Undo restores the original omitted attribute. An explicitly authored equal value is not mislabeled inherited. |
| A label is supplied by `record.title`, a spread, or a children slot | Try to edit it as a string | Refuse with the specific source reason; no substitution with a literal, provider rewrite or source write. |
| A dependent caller draft already exists | Attempt a conflicting definition edit | Preserve the caller draft and refuse the incompatible scope change; do not silently broaden or discard it. |

## 5. Variants

### CF5 — Supported patterns and first-version boundary

Repository evidence: the generated shared-instance source/API and browser fixtures declare a string union, compare it to static string values and consume a boolean as `disabled`. Searches of the current application/editor code, package manifests/lockfile, tests, lab sources and generated test helpers found no dedicated `cva`/`tailwind-variants` recipe reader. This does **not** establish that imported customer projects lack those libraries; no imported project registry or external checkout was inspected here.

| Pattern | What can be read safely | Current preview/edit support | V1 decision |
| --- | --- | --- | --- |
| String-literal union to static class expression | Existing options, literal caller/default value and classes from strings, supported concatenation/templates, and strict `===`/`!==` comparisons of the prop with string literals. All allowed values must resolve. | Existing instance path can project classes and change the caller literal. It cannot generally edit a conditional branch's styles. | Enable switching among those exact options and editing their supported associated props. Respect existing option limits; do not invent options. |
| String enum used directly as text/href/type | The consumer/type can be read under existing rules. | Typed prop editing can work, but an enum is not automatically a visual variant axis. | Label it as its source prop. A button type dropdown is not a variant design system. |
| `cva(...)` recipe | A future read-only AST adapter could recognize a directly imported factory and literal recipe keys/defaults without executing it. Mere matching by function name or a type inferred through a call is insufficient. | `classValue` does not evaluate call expressions; no recipe-to-render projection/ownership contract exists. Even with a separate union annotation, class preview is not established. | Recipe-controlled variant is read-only. Do not expose a writable switch solely because options look discoverable. Other independently proved label/href fields may still work. |
| `tailwind-variants` / `tv(...)` | A future bounded reader could expose literal axes/defaults; slots, extensions and compound rules need their own proof. None is implemented in the inspected path. | No current evaluator/projection for these calls, slot functions or compound combinations. | Read-only recipe/variant controls; no flattening or automatic conversion into our enum representation. |
| Boolean flags | Current parser can read a literal/default boolean used directly by button `disabled`. | Supported for that attribute. A boolean ternary controlling styles, visibility or structure is not handled as a class variant. | Enable only existing supported attribute flags. Do not present every boolean as a variant or support hidden/compact/loading subtrees by implication. |

**UI:** one compact variant field per proved style axis, using the actual prop name/options. Keep other typed props in the same component group. Show whether a value was authored at the call or comes from a proved default once read-only provenance metadata is available. Unresolved axes get a disabled row/reason when their source identity is known; do not guess fields or silently coerce invalid values.

**Preview semantics:** V1 uses the existing recoverable draft preview, not a second hover/peek state engine. Choosing an option proposes a caller-only component edit, updates the real preview after verification, and creates one draft Undo step. Save writes it later. Opening/closing the chooser writes nothing. Escape cancels an unsubmitted choice/active field interaction; Undo reverts an already accepted draft choice. Do not label accepted drafts as ephemeral previews that disappear without Undo.

Viewport presets and CSS states remain separate controls. Changing preview width does not rewrite a variant prop. A source-authored option named after a device is still a literal prop option, not proof of responsive behavior. Likewise, a hover/focus utility state is not automatically a component variant. Keep prop writes in Default/All sizes as the API currently requires.

**Variant style editing is not safe in V1.** The current class evaluator reads outputs; it does not establish exclusive ownership of branch literals, recipe base styles, compound conditions, shared variables or slots. Even selecting All N uses does not authorize editing such a recipe. A later dedicated recipe capability needs branch/source ownership, complete combination effects, compiler proof, caller impact, reversible projection and exact Save/Undo tests before a style control is enabled.

| Before | Action | After |
| --- | --- | --- |
| Two calls use a supported union variant | Switch the second; edit its literal label; refresh; Save; Undo | The first call and definition stay unchanged. Draft recovery retains the chosen option/label; Undo restores the caller. |
| A union declares two options | Request a third value or use a computed caller value | Refuse: “Choose a supported literal option for this call.” No added union member or replacement of computed data. |
| Class output comes from `cva(...)` | Open variants and attempt a switch/style edit | Show read-only reason: “This variant recipe cannot yet be previewed safely.” No library execution or recipe rewrite. |
| Output comes from `tv(...)` with slots/compound rules | Attempt a slot or variant edit | Keep it read-only; no flattening or partial slot update. Independently supported props remain independent. |
| A proved literal boolean feeds only `disabled` | Toggle the flag | Only the selected call's boolean/disabled projection changes; it is not recorded as a new style variant. |
| A boolean controls a conditional subtree or `compact ? ...` classes | Try a variant toggle | Refuse that field; do not switch rendered structure or treat it as the supported disabled contract. |
| The same selected variant is previewed at two viewport widths | Change width, then choose Hover preview | Neither operation silently edits the variant prop or merges viewport/CSS state into its option list. |

## 6. Layers and grouped inspector

### CF6 — Component, repeated ×N and shared badges

[`SourceLayers.tsx`](../components/slightnudge/SourceLayers.tsx) currently chooses icons by native tag/computed display, filters eligible native nodes, reconstructs ancestry through `parentKey`, and disables rows with `instances > 1`. The bridge aggregates `instances` by **complete mapped key**, including the call trace when available. Several distinct direct callers can therefore each have `instances: 1`.

| Badge | Current trustworthy signal | Proposed behavior / missing signal |
| --- | --- | --- |
| Component | Validated trace plus successful instance/provider inspection can identify a component. `CanvasLayer` alone has no provider-name/root/role field. | Add a component group/root badge only from proved boundary metadata. Native children keep their type icons. Do not infer component ownership from uppercase display text or a styled div. |
| Repeated ×N | Existing `instances` count means N rendered copies of the same complete source identity in this loaded page. Already displayed and disabled when ambiguous. | Preserve this count/guard. Explain its meaning. It is not All N uses or a list of N independently editable records. |
| Shared | Definition identity plus a complete inventory of distinct source callers. A single trace proves one call, not the project's total count. | Add the shared badge only after inventory proof. If incomplete, say “Uses unknown”; do not assert single-use. Keep the source-call count separate from rendered copies. |

Component group rows are navigational metadata, not fake source nodes: expanding them is safe; selecting a synthetic group must not manufacture a source write owner. A covered native child with a unique locator remains selectable through Layers. A repeated ambiguous row stays non-editable until the engine can prove an individual owner.

Use the existing icon family and product tokens; restrained badges have accessible text and tooltips explaining source calls versus rendered copies. Do not rely on color or copy reference glyphs. Search reveals matching children with their ancestors and preserves the exact current source target. Focus filters the tree logically without reparenting page DOM.

| Before | Action | After |
| --- | --- | --- |
| Two direct calls have distinct traces but the same label | Inspect Layers | Two uniquely selectable instance contexts; shared source-call count is two only after graph proof. Neither row falsely shows repeated ×2. |
| A mapped loop produces five nodes with one full key | Inspect its row | Existing repeated ×5 indication remains; attempting to edit an individual copy is refused. No nth-row owner is invented. |
| An unresolved import prevents caller completeness | Request the shared badge/count | Show Uses unknown and a reason. Never show “1 use” from the single visible DOM copy. |

### CF7 — Grouped style panel without overcrowding

Keep the focus breadcrumb/scope visible at the panel top. Then show **Props**, **Variant** only when supported, and **Styles** only for a proved writable target/scope. Existing layout, size, typography and appearance controls belong inside the appropriate Styles groups; do not duplicate them into a new component editor.

In This instance, shared definition styles are read-only with one line directing the user to the explicit scope chooser. In All N uses, supported literal definition controls show their shared impact; caller props remain read-only until returning to This instance. A compact collapsed source/impact section can supplement, but cannot replace, the complete caller review required before choosing shared scope and before Apply.

Only relevant controls appear. When a field is known but unsupported, show its disabled affordance and specific reason instead of an apparently functional control or repeated toast loop. Retain current preview status, one global Save, draft/source Undo distinctions, keyboard ownership and loading/recovery behavior. Read-only focus and menus never freeze navigation while an optional impact scan runs; shared writes wait for a complete valid result.

| Before | Action | After |
| --- | --- | --- |
| A supported label/variant instance is focused | Open the inspector | Props and its real variant options are grouped together. Shared style controls do not look like caller overrides. |
| A complete shared impact manifest is explicitly approved | Select a supported literal padding control | Show the scope and affected definition/callers; stage exactly that utility edit through the existing path. No second Save control. |
| The component uses dynamic recipe classes | Open Styles | Refuse the style edit in one line and retain supported independent props. Choosing shared scope does not enable recipe rewriting. |

## 7. Staged build and release gates

All proposed flags are **new, default-off product feature flags**, not instructions to edit environment files. Flag names below are proposed names, not existing settings. No stage modifies existing tests, expected results or limits to obtain a pass. Add new tests during implementation only; this specification task adds none.

| Stage / proposed flag | Small deliverable | Exit condition |
| --- | --- | --- |
| 0 — baseline | Inventory current behavior and capture the existing gate on the intended implementation HEAD. No feature enabled. | Establish a green baseline first. A known failing or UNREACHED workflow is not waived as green. Diagnose outside this docs task. |
| 1 — `componentFocusRead` | Read-only boundary descriptor, focus action, breadcrumb, scoped Layers and truthful badges/count provenance. This instance remains default; no new mutation permissions. | New CF1/CF2/CF6 read-only cases plus existing selection/shared-instance workflows pass; existing gate green with flag off and on. |
| 2 — `componentVariantProps` | Reuse existing typed props and static enum projection in focus, with grouped UI and per-field/default provenance. No recipe-style editor. | New CF4/CF5/CF7 tests, literal/default/type refusals, refresh, draft Undo/Redo, source Save/exact Undo pass in Full/Fit and both entry contexts; existing gate green off/on. |
| 3a — `componentImpactRead` | Complete bounded caller inventory and read-only impact review. Shared writes remain disabled. | Count/list completeness tests cover same-file calls, aliases, off-page callers, repeated/indirect refusals and graph changes at unchanged N; gate green. |
| 3b — `componentSharedLiteral` | Explicit manifest-bound shared authorization and per-qualified-instance projection through existing preview/Apply; only supported static literal definition text/classes, Default/All sizes. | New server refusal tests for absent/stale/incomplete scope proof; all visible instances verified; caller files unchanged for definition-only edits; external changes, interrupted Save, refresh and exact Undo covered; gate green off/on. Otherwise retain read-only scope. |
| 4 — separate future proposal | Recipe-aware variant styles or nested forwarding, one pattern at a time. Not included in V1. | A dedicated ownership/projection design and negative tests precede implementation. Each independently flagged increment ends with the gate green. |

At every write-enabled stage, check exact target under pointer and Layers selection, untouched sibling/caller/provider bytes, real target compiler behavior, current-source conflicts, refresh/restart recovery, draft Undo/Redo, Save and exact Undo on otherwise unchanged source. Include local and representative imported projects. Mocked failures may test UI recovery but cannot substitute for real-API source-write proof. Exercise flags off as well as on and retain raw failures.

Before enabling by default, measure focus entry and variant updates on a representative large page using the existing canvas performance plan. A scan or compile must expose progress/refusal rather than an indefinite connecting state. No blanket frame-time or arbitrary-framework claim follows from a few supported component fixtures.

## 8. Risks and open questions

| Risk / question | Recommended answer |
| --- | --- |
| Does All N count files, callers or live DOM copies? | Distinct source JSX callers, explicitly labeled. List every one; show live rendered counts separately. Refuse unsafe repeated/nested ownership rather than advertise a runtime count. |
| Can we reuse the current definition-style button as the whole scope model? | No. Reuse its explicit-entry affordance, but shared writes require the complete server-bound impact contract. Do not only strip the instance marker. |
| Can focus use the nearest DOM parent as the component boundary? | No. Require a provider/return-boundary descriptor. Keep unsupported roots read-only. |
| Are device names or hover states variants? | Only when they are actual authored prop values. Keep viewport, component props and CSS interaction states distinct. |
| Should selecting a variant create an ephemeral second preview system? | No for V1. Reuse normal recoverable drafts and Undo; no extra confirmation per option. |
| Can a recipe be executed just to discover its options/classes? | No. Future adapters must use bounded static syntax, verified imports and source ownership; current recipe fields stay read-only. |
| What about shared-parent forwarding or all-use edits involving maps? | Keep current refusals in V1. A navigable breadcrumb is not proof that an individual data item or forwarding owner can be written. |
| Can a text default or all callers' variant props be changed in shared mode? | Not in V1. Caller overrides, definition defaults and literal definition styles are different mutations; expose only implemented contracts. |
| Can we infer inheritance because a prop equals its default? | No. Add read-only provenance metadata and preserve explicit versus omitted syntax. General reset/remove after Save needs its own supported operation. |
| What if a caller draft and definition draft conflict? | Preserve both intent/source safety and the current refusal. Ask for Save/Undo of the dependent draft once; do not silently merge or change scope. |
| What if callers change while the panel is open, even at the same N? | Invalidate the manifest, preserve the draft and require reinspection/explicit scope choice. Apply must revalidate, not trust a UI count. |
| What if only some affected callers are rendered? | List off-page source callers as affected but unpreviewed. Do not claim their visual validation; gate support on complete source proof and representative real-page checks. |
| How to avoid inspector and input lag? | Reuse one controller/draft engine, cache read-only analysis by actual source revisions, cancel stale inspection results, and keep scans out of the pointer path. Never cache past an ownership/hash change. |
| How much should survive a view change or refresh? | Existing drafts remain keyed to project/write-owner file. Re-resolve focus UI separately and visibly retain/revalidate any shared draft scope; never manufacture a fresh route-specific draft. |

## What I did NOT verify

- No live UI or mutation workflow was run, and no new passing result is claimed. The current complete gate, production build and typecheck were not rerun.
- No customer/imported project checkouts, registry/state files, `.env`, credentials or secrets were inspected. Library presence across customers and arbitrary recipe syntax remain unknown.
- No proof of a complete project-wide caller enumerator, shared-scope manifest enforcement, component-boundary model, general nested forwarding, or `cva`/`tailwind-variants` preview exists from this inspection. These are specified gaps/stages, not delivered features.
- No real screen-paint/frame-time, focus-mask hit testing, keyboard accessibility, responsive combination or off-page visual validation was performed for the proposed UI.
- Historical inventory/reports may describe older source/protocol snapshots. Current implementation facts above are tied to the named functions; historical test-file/log existence is not certification at this HEAD.
- Product code and tests were read only. This task writes only this document under `/docs`, on the requested local docs branch, without merging or pushing.
