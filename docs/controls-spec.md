# SlightNudge visual controls — founder summary

## Five decisions to approve

1. **Source code is the product’s truth.** Every accepted visual change is a small source edit, shown as a before/after diff, applied only after the user confirms, and undoable. A control that cannot prove its exact target and produce that transaction is disabled with a plain explanation.
2. **Start with static, local edits.** The first release edits one statically written JSX element at one source location. It refuses conditional styles, uncertain mappings, generated content, shared component definitions, and ambiguous responsive/state conflicts. This is narrower than a design canvas, but it avoids silently changing many pages.
3. **Support the installed framework deliberately.** This repository declares Tailwind CSS **4.3.3** (the manifest says `^4.3.3`; the lockfile resolves 4.3.3). Examples below use Tailwind v4 utilities. A connected project must be detected separately; never assume that it uses this repository’s Tailwind version or default breakpoints.
4. **Layer controls over time.** First ship states/transitions and transforms, then opacity/blend, and then a constrained Layers panel. Do not ship drag-reorder, grouping, extraction, or animation presets until source mapping, multi-file review, and rollback can prove the full change.
5. **Keep source clean and ownership clear.** Native-looking changes should remain ordinary Tailwind utilities or simple JSX. Small `data-slightnudge-*` attributes may be used only for layer labels/locks, are visible in the diff, and are removable with Undo. No private metadata files, hidden generated CSS, or unreviewed helper code may be written behind the user’s back.

## Biggest risks

- **Wrong source target:** a browser element can map to a shared component, stale line, generated component, or one of several similar nodes. Require a stable mapping and re-check the file snapshot at Apply time.
- **Class conflict or build failure:** a new utility can conflict with an existing utility, a project may use custom Tailwind tokens, or its build may not compile the proposed class. Compile the candidate in the connected project before Apply; if validation cannot run, refuse.
- **Structural edits are fragile:** reorder, wrap, or extract can affect selectors, layout, keys, props, imports, and other files. Keep these off until the review can show every affected file and one undo can restore them all.

## First milestone

**M1: reliable state and transition editing for static elements.** Demo: click a static button, add a hover color and focus ring, adjust duration/easing, compare the working preview and exact source diff, Apply, then Undo. The click-through test list is: a static button succeeds; `cn()` and conditional classes are refused; a stale source file is refused; keyboard focus remains visible; dark-mode and responsive variants are preserved; undo restores the exact bytes; and a project build/compile check passes before Apply. The easing curve’s class-generation syntax is explicitly unverified below and must be checked before it is included in M1.

---

## What exists today

- **Studio and right inspector:** `/studio` opens the first demo fixture inside a responsive preview frame. The right inspector selects a source-mapped element and has Text, Spacing, Layout, Typography, Color, and Surface sections. Spacing uses arrow-key nudges; existing style choices are a small allowlist of Tailwind utilities.
- **Preview and review:** a requested edit is prepared as a dry-run source diff. The preview is reflected in the browser; Apply writes it; Discard removes the pending preview without changing the source. The apply step checks that the file still matches the version used to prepare the diff.
- **Undo:** source snapshots are kept in local edit history. Undo restores the last accepted SlightNudge change for that file, but refuses if the file was changed afterward. Related edits can be grouped in history by edit-session ID.
- **Source mapping:** demo fixtures include source file/line markers. For imported Next.js projects, an optional development-only adapter injects source file/line/column markers and a session-checked message bridge. Selection is disabled unless the inspected element is safe. The current inspection logic refuses dynamic class expressions and components it believes are rendered more than once.
- **Responsive preview:** Desktop, tablet, and mobile preview widths are available. The inspector maps those choices to base, `md:`, and `lg:` utility prefixes respectively. The separate breakpoint picker supports base, `sm:`, `md:`, `lg:`, `xl:`, and `2xl:`. It currently replaces only a matching utility with that exact prefix; it does not merge conflicts or understand a state plus breakpoint prefix.
- **Five fixtures:** `1-plain-static.tsx` demonstrates static utilities and plain text; `2-several-utilities.tsx` shows multiple utilities on one element; `3-conditional-cn.tsx` demonstrates conditional `cn()`/`clsx` and is meant to be refused; `4-shared-component.tsx` renders one component twice with different props and is meant to be protected; `5-responsive-classes.tsx` has base, `md:`, and `lg:` spacing classes.
- **Current limits:** the source mapper primarily relies on line/column/ID markers. It is not yet a general React AST identity system. A change to a component definition can affect every use; prop-driven text cannot safely be replaced as if it were local text. Existing utility replacement is allowlisted, but does not generally use Tailwind’s conflict resolver or compile the resulting project before apply.

## Terms used below

- **Source mapping:** the address connecting the thing clicked in the browser to the exact code that created it.
- **AST:** the code-aware tree used to identify a JSX element without searching and replacing arbitrary text.
- **Variant/prefix:** a condition before a Tailwind utility, such as `hover:` or `md:`, which limits when or where it applies.
- **Static:** written directly in source as a literal, rather than calculated from props, conditions, or runtime data.
- **Conflict:** two classes set the same CSS property, for example `opacity-50 opacity-100`.
- **Atomic edit:** one all-or-nothing change. If any part fails validation, none of it is written.

## Source and review contract shared by all controls

1. Resolve a stable source node and report its file, line, and component/use scope.
2. Refuse if the target or affected scope is ambiguous, the source changed since selection, the class/style value is dynamic, or the patch would touch more than the control’s declared files.
3. Produce a dry-run patch and run syntax plus project/Tailwind validation against the candidate. Do not write files during preview.
4. Show the visual preview and a readable diff. The diff must include every touched file and say whether the change affects one use or all uses.
5. Apply atomically, record exact before/after snapshots, then confirm. A failed apply restores the exact original file(s).
6. Undo only when current file contents still match the recorded “after” version. If someone edited the file outside SlightNudge, refuse to overwrite and explain how to review/retry.

Use this exact general refusal when there is no more specific reason: **“I can’t make this edit safely because I can’t confirm the exact source change. Nothing was changed.”** Each control below gives its more useful specific refusal copy.

---

# Tier 1 — build first

## 1. States and transitions

**A. What it does.** The user chooses a state such as hover, keyboard focus, or press, then edits the appearance that applies only in that state. The user can also set how long the change takes, when it starts, and which named easing feel it uses.

**B. Exact code written (Tailwind 4.3.3 examples).** Add or replace one utility for a specific variant; never remove unrelated classes.

```tsx
// Hover fill
className="rounded-md bg-slate-900 hover:bg-slate-700"
// Keyboard focus outline
className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
// Press and transition
className="transition duration-200 delay-75 ease-in-out active:scale-95"
```

Variants can be composed, e.g. `md:hover:bg-slate-700` and `dark:focus-visible:outline-white`. **UNVERIFIED:** exact generated selectors for every composed variant must be compiled by the connected project before Apply; see the verification list.

**C. Edge cases.** A `cn()`/`clsx()` call, conditional/template class, or prop-driven class is refused unless a future parser can isolate one branch without changing other branches. If a component is rendered more than once, the definition edit affects all uses; current MVP refuses, and later UI must say “all instances” and require an explicit scope decision. Preserve existing responsive and dark variants; never translate a base edit into a state edit. If the same state/property already has conflicting utilities, show both and refuse until user picks which one to replace. Arbitrary utility values and CSS-module/inline styles are refused in M1. If an existing transition utility is present, replace only the exact `transition-*`, `duration-*`, `delay-*`, or `ease-*` group after conflict analysis; do not append a second one.

**D. Must refuse. Exact user message:** **“I can’t edit this state safely: the selected element uses conditional or shared styles. Nothing was changed.”** For an uncompileable class: **“This project could not verify the new state style. Nothing was changed.”**

**E. Review and undo.** Preview shows the element in the chosen state (including a keyboard-focus simulation), plus the exact class tokens added/removed. Apply writes only that JSX attribute; Undo restores its exact previous literal if the file has not changed since.

**F. Eye-check tests.**
1. Before: `className="bg-slate-900"`. User sets hover fill to slate 700. After: `className="bg-slate-900 hover:bg-slate-700"`; only hover changes the fill.
2. Before: `className="rounded-md"`. User sets keyboard focus outline. After: `className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"`; Tab shows the outline.
3. Before: `className={cn('bg-white', active && 'bg-green-700')}`. User edits hover fill. After: source is identical and the refusal message in D is shown.

**G. Effort: M. Risk: medium. Depends on:** source-node identity, variant-aware class parsing, project compile validation, keyboard-state preview, shared-component scope detection.

## 2. Easing curve editor

**A. What it does.** The user drags two handles on a curve to change acceleration and deceleration. The preview animates a small safe property change so the curve is understandable before it is applied.

**B. Exact code written.** Prefer a static React style property to avoid depending on an unverified Tailwind arbitrary utility. Merge the property into an existing static style object without deleting its other properties.

```tsx
<button style={{ transitionTimingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1)' }} />
<button style={{ color: 'white', transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }} />
<button style={{ transitionTimingFunction: 'linear' }} />
```

**C. Edge cases.** Refuse `style={getStyle()}`, spread-based style objects, conditional style expressions, and components used multiple times under the MVP rule. Preserve all other properties in a plain object. Responsive prefixes do not apply to inline styles; responsive easing is refused until a source-safe CSS rule strategy exists. Dark mode does not change the timing property. If `transitionTimingFunction` already exists, replace that one property; if conflicting `ease-*` Tailwind classes are active, show them and refuse rather than allowing CSS precedence to guess. CSS variables and non-Tailwind style sheets are not rewritten.

**D. Must refuse. Exact user message:** **“I can’t update the easing curve because this element’s styles are calculated or shared. Nothing was changed.”**

**E. Review and undo.** Show the curve handles and the literal `cubic-bezier(...)` value in the diff. Apply changes one static `style` property; Undo restores the prior property or removes the property if it was newly added.

**F. Eye-check tests.**
1. Before: `<button className="transition duration-200" />`. User selects a gentle ease. After: `style={{ transitionTimingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1)' }}`; easing changes while duration stays 200 ms.
2. Before: `style={{ color: 'white' }}`. User selects a fast-start curve. After: `style={{ color: 'white', transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}`; color remains white.
3. Before: `style={getButtonStyle()}`. User moves a curve handle. After: no source change; the refusal message in D is shown.

**G. Effort: M. Risk: medium. Depends on:** static style-object AST patching, numerical validation of handles (each control point stays in the CSS-legal range), curve preview, syntax/build validation.

## 3. Transform controls

**A. What it does.** The user moves, scales, rotates, or skews the selected element without manually editing CSS. The user can set the point around which rotation and scaling happen.

**B. Exact code written (Tailwind 4.3.3 examples).** Update the relevant utility family and keep other transform families intact.

```tsx
className="translate-x-4 translate-y-2"
className="scale-110 rotate-6"
className="skew-x-3 origin-center"
```

For arbitrary fine values, a possible v4 class is `rotate-[17deg]`; **UNVERIFIED** until the connected project compiles it. MVP may use only verified named utilities.

**C. Edge cases.** Refuse dynamic `cn()`/conditions and shared component definitions. If an existing `transform`, `translate`, `scale`, `rotate`, `skew`, or `origin` utility conflicts, replace only that exact family after showing the old/new pair; do not collapse all families into one shorthand. Preserve `md:`/`lg:` and dark variants; a responsive edit must change only the selected prefix. Existing arbitrary transform values, inline transforms, CSS modules, and `!important` styling are refused. If transform order or external CSS makes the computed result uncertain, run the project preview and refuse when it differs from the expected transform.

**D. Must refuse. Exact user message:** **“I can’t change this transform safely because its transform is dynamic or controlled elsewhere. Nothing was changed.”**

**E. Review and undo.** Show the original/new transform utilities and a live preview. Apply patches the class string; Undo restores that exact class string, provided the file has not changed.

**F. Eye-check tests.**
1. Before: `className="translate-x-0"`. Move right by 16 pixels. After: `className="translate-x-4"`; the element moves right.
2. Before: `className="scale-100 rotate-0"`. Scale up and rotate. After: `className="scale-110 rotate-6"`; both effects appear.
3. Before: `className={active ? 'rotate-0' : 'rotate-6'}`. Rotate with the editor. After: no source change; the refusal message in D appears.

**G. Effort: M. Risk: medium. Depends on:** version-aware utility groups, conflict checking, computed-style comparison, project compile validation.

## 4. Layers panel

**A. What it does.** The panel shows selectable JSX elements in the current page as a parent/child tree. Users can change sibling order, hide or show an element, and give a layer a useful name or lock it against accidental edits.

**B. Exact code written (Tailwind 4.3.3 / JSX).** Reorder only by moving the selected JSX node among the same parent’s static children; hide/show edits one `hidden` token. Names and locks use explicit data attributes, not invisible app-only state.

```tsx
// Hide
<aside className="hidden">...</aside>
// Rename layer
<section data-slightnudge-name="Billing summary">...</section>
// Lock layer
<section data-slightnudge-locked="true">...</section>
```

Reorder example: before `<h2 /> <p />`, after `<p /> <h2 />` under the same JSX parent. The diff shows the full moved sibling block.

**C. Edge cases.** Only reorder static JSX siblings when their keys, event semantics, and parent are understood. Refuse mapped lists, conditional children, fragments with unclear boundaries, nested component internals, and elements with nontrivial index-based behavior. Hide/show refuses when `hidden` is conditional or conflicts with `block`/`flex`/`grid` at the active breakpoint; never add `hidden` if that would strand the element with no clear restore. Preserve responsive and dark variants. Names/locks on props-driven/shared components are refused until the exact instance can be represented safely. For a shared component, naming the definition affects every instance and must explicitly state that scope. Inline/CSS-module-controlled visibility is refused. Tool metadata attributes are public markup and may affect app code that reads `data-*`; warn in the review and allow cancel.

**D. Must refuse. Exact user message:** **“I can’t change this layer safely because its position or visibility depends on code. Nothing was changed.”** For metadata attributes: **“This layer label is stored in your page markup. Review the added data attribute before applying.”**

**E. Review and undo.** Reorder preview highlights the full moved block and lists the parent. Hide/name/lock show the exact attribute/class diff. All edits are one transaction; for reorder, Undo restores the exact sibling order and whitespace. If any affected source file changed, Undo refuses.

**F. Eye-check tests.**
1. Before: `<h2>Title</h2><p>Summary</p>` in one static parent. Drag Summary above Title. After: `<p>Summary</p><h2>Title</h2>`; the visual order changes.
2. Before: `<aside className="w-64">`. Hide it. After: `<aside className="w-64 hidden">`; show removes only `hidden`.
3. Before: `{items.map(item => <Card key={item.id} />)}`. Drag one card. After: no code change; the refusal message in D is shown.

**G. Effort: L. Risk: high. Depends on:** full JSX tree mapping, robust sibling move patching, list/key semantics, metadata policy, whole-project validation, atomic patch review.

## 5. Opacity and blend modes

**A. What it does.** The user adjusts how transparent an element is. Blend mode controls how its pixels mix with what is behind it.

**B. Exact code written (Tailwind 4.3.3 examples).**

```tsx
className="opacity-50"
className="opacity-80 mix-blend-multiply"
className="dark:opacity-70 mix-blend-screen"
```

**C. Edge cases.** Refuse dynamic classes and shared definitions. Replace only an existing opacity or blend utility after listing conflicts. Preserve responsive/state/dark prefixes and edit the exact chosen variant. Do not infer whether opacity comes from a parent, pseudo-element, or CSS variable; if computed opacity is inherited/externally styled, say the selected node does not own that effect and refuse. Unknown custom utilities/arbitrary values and CSS modules are refused. Blend mode can change color contrast dramatically; show the real backdrop in preview and warn if the project’s preview cannot reproduce it.

**D. Must refuse. Exact user message:** **“I can’t change opacity or blending safely because another style controls this element’s appearance. Nothing was changed.”**

**E. Review and undo.** Diff lists the exact `opacity-*` and/or `mix-blend-*` token replacement. Apply changes the selected class only; Undo restores the previous token and exact source snapshot.

**F. Eye-check tests.**
1. Before: `className="opacity-100"`. Set opacity to 50%. After: `className="opacity-50"`; underlying content shows through.
2. Before: `className="opacity-80"`. Set multiply blend. After: `className="opacity-80 mix-blend-multiply"`; color mixes with the background.
3. Before: `className={cn('opacity-100', hidden && 'opacity-0')}`. Change opacity. After: no source change; the refusal message in D appears.

**G. Effort: S. Risk: medium. Depends on:** utility-family conflict detection, exact variant targeting, computed preview.

---

# Tier 2 — later, gated by source safety

## 6. Entrance and scroll animation presets

**A. What it does.** The user chooses a small set of named entrance effects, such as fade-in or rise-in, and chooses whether an effect begins on page load or when it enters view. Presets are reviewed as ordinary source styles, with a reduced-motion fallback.

**B. Exact code written.** No animation class is assumed to exist in Tailwind v4 by default. Proposed controlled implementation: add a named class to JSX and a matching `@keyframes` rule to the project stylesheet in one reviewed multi-file transaction.

```tsx
className="sn-animate-fade-in"
className="sn-animate-rise-in"
```

```css
@keyframes sn-fade-in { from { opacity: 0; } to { opacity: 1; } }
.sn-animate-fade-in { animation: sn-fade-in 240ms ease-out both; }
@media (prefers-reduced-motion: reduce) { .sn-animate-fade-in { animation: none; } }
```

Scroll-triggering needs an observer or supported CSS scroll timeline, not a class alone. **UNVERIFIED:** CSS scroll-driven animation support and the connected browser/project setup.

**C. Edge cases.** Refuse dynamic classes, shared components, existing animation shorthand, or stylesheet formats not parsed by the editor. Preserve breakpoints and dark variants only when the style’s source location and generated CSS ordering are clear. Do not duplicate keyframe names; use a collision-checked generated namespace. Respect reduced motion and avoid layout movement. Inline/CSS module styles are refused until the adapter can patch the matching stylesheet atomically.

**D. Must refuse. Exact user message:** **“I can’t add this animation safely because its style sheet or trigger could not be verified. Nothing was changed.”**

**E. Review and undo.** Show the JSX class plus every stylesheet change in one diff, with a preview at desktop/mobile and reduced-motion setting. One Apply/Undo covers all files; any changed file blocks the transaction.

**F. Eye-check tests.**
1. Before: a static section with no animation class. Choose fade on load. After: JSX has `sn-animate-fade-in` and one namespaced fade keyframe exists in the selected stylesheet.
2. Before: same section. Enable reduced motion. After: the effect is absent when reduced motion is on.
3. Before: `className={cn('opacity-0', ready && 'opacity-100')}`. Choose scroll rise. After: no source change; the refusal message in D appears.

**G. Effort: L. Risk: high. Depends on:** multi-file atomic transaction, stylesheet parser, trigger implementation, browser support detection, reduced-motion test, compile check.

## 7. Masks and clip-path

**A. What it does.** The user crops an element into a simple preset shape, such as a circle or rounded inset. The original image or element remains in source; only its visible shape changes.

**B. Exact code written.** A static inline style property keeps the CSS explicit and avoids guessing that an arbitrary Tailwind class compiles.

```tsx
style={{ clipPath: 'circle(50%)' }}
style={{ clipPath: 'inset(0 round 16px)' }}
style={{ clipPath: 'ellipse(45% 35% at 50% 50%)' }}
```

**C. Edge cases.** Refuse dynamic/spread/conditional style objects, shared components, masks that require extra assets, and arbitrary polygon point editing in the first version. Preserve other static style properties. Responsive and state-specific clip paths are refused until variant serialization is defined. Dark mode has no special behavior. If existing CSS or a mask also clips the element, show both sources and refuse if precedence cannot be confirmed. Tailwind arbitrary `clip-path` class syntax is not proposed.

**D. Must refuse. Exact user message:** **“I can’t change this mask safely because another style controls the element’s clipping. Nothing was changed.”**

**E. Review and undo.** Show the shape overlay, computed preview, and one `clipPath` property change. Undo restores the old property or removes the newly added one.

**F. Eye-check tests.**
1. Before: `<img style={{ objectFit: 'cover' }} />`. Choose circle. After: style keeps `objectFit` and adds `clipPath: 'circle(50%)'`.
2. Before: `style={{ clipPath: 'inset(0)' }}`. Choose rounded inset. After: `style={{ clipPath: 'inset(0 round 16px)' }}`.
3. Before: `style={imageStyle}`. Choose ellipse. After: no source change; the refusal message in D appears.

**G. Effort: M. Risk: medium. Depends on:** static JSX style AST patching, shape preview, stylesheet precedence detection.

## 8. Grouping (wrap elements in a container)

**A. What it does.** The user groups adjacent elements so they can share layout styles or move together. The tool creates a real JSX wrapper in the source, not a visual-only group.

**B. Exact code written.**

```tsx
// Before: <h2>Plan</h2><p>Details</p>
// After:
<div className="flex flex-col gap-4">
  <h2>Plan</h2>
  <p>Details</p>
</div>
```

```tsx
<div className="grid grid-cols-2 gap-4">...</div>
<div className="flex items-center gap-2">...</div>
```

**C. Edge cases.** Only wrap adjacent static siblings under one parent. Refuse across conditional branches, fragments with uncertain semantics, table/list/form special parents, keyed maps, and siblings with whitespace-sensitive inline text. Preserve responsive variants on children; do not move them. For dark mode, wrapper has no added styling unless selected. Refuse if parent/child CSS selectors or flex/grid behavior would materially change and cannot be verified. Non-Tailwind selectors and style modules make the operation unsupported until compile/visual validation can inspect them.

**D. Must refuse. Exact user message:** **“I can’t group these elements safely because their parent or layout depends on code. Nothing was changed.”**

**E. Review and undo.** Diff shows the complete selected sibling block indented under the new wrapper and the wrapper’s classes. Apply and Undo are one source transaction; validation checks all affected breakpoints.

**F. Eye-check tests.**
1. Before: adjacent `<h2>` and `<p>` inside a `<section>`. Group them. After: one `<div className="flex flex-col gap-4">` wraps both.
2. Before: two adjacent cards. Group in a grid. After: wrapper uses `grid grid-cols-2 gap-4`, cards remain unchanged children.
3. Before: children inside `items.map(...)`. Group them. After: no source change; the refusal message in D appears.

**G. Effort: L. Risk: high. Depends on:** JSX trivia/whitespace preservation, parent validity checks, selector impact analysis, full-project compile and visual regression.

## 9. Extract to component

**A. What it does.** The user turns a selected static JSX block into a reusable component in the same project. The editor keeps the rendered page the same and shows every source file it will touch.

**B. Exact code written.** Example: replace a static block with `<FeatureCard />`, add `function FeatureCard() { return (...); }` in the same file. A later version may create `components/FeatureCard.tsx` and add an import, but that multi-file form is **not** in the first version.

**C. Edge cases.** Refuse blocks that use variables outside the block, hooks, event handlers, contextual providers, `ref`, `key`, or props that cannot be inferred. Refuse server/client boundary changes, async components, and styling abstractions. Preserve responsive/dark utilities literally. Dynamic CSS/props and external styles are not rewritten. Shared component naming collisions cause refusal.

**D. Must refuse. Exact user message:** **“I can’t extract this block safely because it depends on values or behavior outside the selection. Nothing was changed.”**

**E. Review and undo.** Show the removed JSX and inserted component definition (and any import if later enabled). Apply only after typecheck/build; Undo restores all touched files atomically.

**F. Eye-check tests.**
1. Before: static `<article><h2>News</h2><p>...</p></article>`. Extract. After: page contains `<NewsCard />` and the same function appears once.
2. Before: same card with static Tailwind classes. After: its rendered typography, spacing, and breakpoint behavior are unchanged.
3. Before: selected block reads a local `user` value defined outside it. After: no source change; the refusal message in D appears.

**G. Effort: L. Risk: high. Depends on:** binding/reference analysis, import and naming resolution, Next server/client rules, multi-file history, typecheck/build.

---

# Tier 3 — insert elements

## Shared insertion rules

Insertion means adding real JSX at a chosen parent and source position. Every inserted item must be represented as ordinary JSX and Tailwind classes supported by the user’s project. Before writing, SlightNudge must confirm a valid parent, valid React child position, import requirements, and Tailwind compilation. A preview must show the exact insertion point and full JSX. Refuse if the code would need hidden state, a new dependency, a backend endpoint, a project-wide style, or an import the tool cannot verify. Every insertion is one source transaction; Undo removes exactly the inserted node and any tool-added import. The baseline examples use Tailwind 4.3.3 classes, but imported projects must be checked separately.

Each insertion below gives three visual tests, including a refusal. The shared source-scope, `cn()`/condition, shared-component, breakpoint, dark-mode, conflict, and non-Tailwind rules above apply; control-specific notes add further boundaries.

## 10. Text

**A. What it does.** Insert a heading, paragraph, or short label at the selected point. The user edits its words and basic type styling before applying.

**B. Exact code written.**

```tsx
<p className="text-base text-slate-700">A clear sentence.</p>
<h2 className="text-2xl font-semibold">A section title</h2>
<span className="text-sm font-medium">Status</span>
```

**C. Edge cases.** Plain text only; refuse nested interactive content, dynamic expressions, invalid heading hierarchy when detectable, and insertion into input/table-only positions. Preserve selected breakpoint/state utilities. Refuse when parent text is generated from props or localization keys unless the user deliberately creates a new literal.

**D. Refusal:** **“I can’t insert text here safely because this location is generated or does not accept text. Nothing was changed.”**

**E. Review/undo.** Show exact inserted JSX and preview; one Undo removes the node.

**F. Tests.** 1) Before: empty section; add `<h2 className="text-2xl font-semibold">Overview</h2>`; title appears. 2) Before: paragraph; add `<p className="text-base text-slate-700">A clear sentence.</p>`; calm body text appears. 3) Before: inside `<input>`; request a paragraph; insertion is refused with D.

**G. Effort S; risk medium; depends on:** AST insertion point, valid semantic parent, compile validation.

## 11. Button

**A. What it does.** Insert a real button for an action on the current page. The user can set its label and appearance without the tool inventing what the action does.

**B. Exact code written.**

```tsx
<button type="button" className="rounded-md bg-slate-900 px-4 py-2 text-white">Save</button>
<button type="submit" className="rounded-lg border border-slate-300 px-4 py-2">Continue</button>
<button type="button" disabled className="rounded-md opacity-50">Unavailable</button>
```

**C. Edge cases.** No fabricated `onClick`, form action, or navigation. `type` must be explicit; only use `submit` when inside a verified form and user requests submit behavior. Preserve variants and dark mode; refuse if parent is not interactive-content-safe, or if a nested button/link would result.

**D. Refusal:** **“I can add the button’s appearance, but I can’t invent its action. Choose a safe location and action first.”**

**E. Review/undo.** Review includes tag, type, label, classes, and any confirmed action; one undo removes the JSX/import.

**F. Tests.** 1) Before: static div; insert Save button; it appears but performs no invented action. 2) Before: verified form; user chooses submit; `type="submit"` is added. 3) Before: inside another button; insertion refused with D.

**G. Effort M; risk medium; depends on:** semantic parent checking, action explicitly configured, form analysis.

## 12. Image

**A. What it does.** Insert an image from a selected local project asset and set useful alternative text. It never chooses a random external image or silently uploads user content.

**B. Exact code written.**

```tsx
<img src="/images/team.webp" alt="Team planning together" className="h-auto w-full rounded-lg" />
<img src="/images/product.png" alt="Product dashboard" className="aspect-video w-full object-cover" />
<Image src="/images/hero.webp" alt="Workspace overview" width={1200} height={675} className="rounded-xl" />
```

The Next.js `<Image>` example is only allowed if import and dimensions are verified; **UNVERIFIED** for unknown projects.

**C. Edge cases.** Refuse missing assets, remote URLs, unsupported image formats, missing alt text, dynamic image sources, or an `<Image>` import/config the tool cannot prove. Keep responsive and dark classes. Preserve `sizes`/loader props if using existing Next Image; do not replace them. Non-Tailwind CSS is not changed.

**D. Refusal:** **“I can’t insert this image safely because its file, alt text, or image component setup is missing.”**

**E. Review/undo.** Show asset path, alt text, dimensions/size, and JSX diff; undo removes JSX and any new import (does not delete the asset without a separate reviewed action).

**F. Tests.** 1) Before: empty static section and known local asset; insert `<img ... alt="..." />`; image loads. 2) Before: same; insert with `object-cover`; crop appears and source diff is one node. 3) Before: unknown remote URL with no alt text; insertion refused with D.

**G. Effort M; risk medium; depends on:** asset validation, accessible alt text, image component detection.

## 13. Container

**A. What it does.** Insert a semantic-neutral wrapper to control spacing, width, or alignment of content. The wrapper adds no hidden behavior.

**B. Exact code written.**

```tsx
<div className="mx-auto max-w-5xl px-6">...</div>
<div className="flex items-center gap-4">...</div>
<div className="grid grid-cols-2 gap-4">...</div>
```

**C. Edge cases.** Insert empty only when the user explicitly wants an empty container; otherwise wrap a selected static range. Refuse illegal nesting, mapped or conditional ranges, layout-sensitive table/form children, or cases where wrappers change selectors/display behavior unpredictably. Preserve child prefixes and styles.

**D. Refusal:** **“I can’t add this container safely because it would change the structure or layout of code I can’t verify.”**

**E. Review/undo.** Show wrapper and selected children in diff and viewport preview; undo removes wrapper or restores original children placement.

**F. Tests.** 1) Before: two static siblings; insert flex wrapper; they align horizontally. 2) Before: section content; insert max-width wrapper; content is centered. 3) Before: `items.map(...)`; wrap one item; refused with D.

**G. Effort M; risk high; depends on:** sibling-range parser, parent semantics, visual and compile validation.

## 14. Card

**A. What it does.** Insert a simple content card with a title and optional supporting text. The user chooses the content; SlightNudge does not invent claims or data.

**B. Exact code written.**

```tsx
<article className="rounded-xl border border-slate-200 p-6"><h3 className="text-lg font-semibold">Title</h3><p className="mt-2 text-sm text-slate-600">Details</p></article>
<article className="rounded-lg bg-white p-4 shadow-sm"><h3 className="font-medium">Plan</h3></article>
<article className="border-l-4 border-blue-600 p-4"><h3 className="font-semibold">Notice</h3><p>Details</p></article>
```

**C. Edge cases.** Refuse if card content is absent and the insertion would fabricate factual text, if parent nesting is invalid, or if user asks for data-driven repetition. Preserve responsive/dark styles and existing design tokens; custom color values not present in the project require compile verification. Existing card component should be reused only when props and import are verified.

**D. Refusal:** **“I can’t create this card safely without its content or a verified project card component.”**

**E. Review/undo.** Show the whole article node and style diff; undo removes it.

**F. Tests.** 1) Before: section; add title and detail; a bordered card appears. 2) Before: section; choose project’s verified Card component; import/props are shown before apply. 3) Before: no content supplied; request “add a card”; refused with D.

**G. Effort M; risk medium; depends on:** content supplied, optional component registry, import/type checking.

## 15. Input

**A. What it does.** Insert a labeled form field for a value the user chooses to collect. The editor adds accessible label and input markup but does not invent submission behavior.

**B. Exact code written.**

```tsx
<label className="grid gap-2"><span>Email</span><input type="email" name="email" autoComplete="email" className="rounded-md border border-slate-300 px-3 py-2" /></label>
<label className="grid gap-2"><span>Search</span><input type="search" name="query" className="rounded-md border border-slate-300 px-3 py-2" /></label>
<label className="grid gap-2"><span>Quantity</span><input type="number" name="quantity" min={1} className="rounded-md border border-slate-300 px-3 py-2" /></label>
```

**C. Edge cases.** Refuse if there is no chosen input type/name/label, nested form, unknown controlled value/onChange requirement, or backend submission request. Preserve dark and focus variants; ensure label `htmlFor`/`id` match if separate. Do not write a fake `value` prop.

**D. Refusal:** **“I can’t add this input safely without its field name, label, and behavior.”**

**E. Review/undo.** Diff shows label, input type/name, accessibility attributes, and styling; undo removes both nodes.

**F. Tests.** 1) Before: form; add labeled email field; label focuses the email input. 2) Before: section; add search field; field renders without submission code. 3) Before: controlled form whose required state handler is unknown; refused with D.

**G. Effort M; risk medium; depends on:** form-context analysis, accessibility checks, action explicitly defined.

## 16. Link

**A. What it does.** Insert a navigational link to a destination the user supplies. The editor does not guess a URL or turn an action button into a link.

**B. Exact code written.**

```tsx
<a href="/pricing" className="text-blue-700 underline">Pricing</a>
<a href="https://example.com" target="_blank" rel="noreferrer">External resource</a>
<Link href="/settings" className="font-medium">Settings</Link>
```

Next `Link` only if import and installed Next conventions are verified. For external new tabs, always include safe `rel` behavior.

**C. Edge cases.** Refuse missing/unsafe URL schemes, `javascript:` URLs, dynamic destinations, nested links/buttons, or unverified framework-specific Link import. Preserve responsive/state/dark variants. CSS Modules and custom link styles remain unchanged.

**D. Refusal:** **“I can’t insert this link safely because its destination is missing or unsafe.”**

**E. Review/undo.** Show exact href and JSX diff; undo removes the node and import.

**F. Tests.** 1) Before: paragraph; add `/pricing`; clicking goes to pricing. 2) Before: section; add trusted external link; new tab has safe `rel`. 3) Before: request `javascript:...`; refused with D.

**G. Effort S; risk medium; depends on:** URL validation, Next Link version check, nesting/accessibility checks.

## 17. Divider

**A. What it does.** Insert a visual separator between nearby content blocks. The user can choose a horizontal or vertical rule when the parent layout supports it.

**B. Exact code written.**

```tsx
<hr className="my-6 border-slate-200" />
<hr className="my-4 border-slate-300" />
<div role="separator" aria-orientation="vertical" className="h-6 border-l border-slate-200" />
```

**C. Edge cases.** Prefer `<hr>` for a thematic break; only use `role="separator"` for a purely decorative flex/grid separator. Refuse vertical insertion if parent layout cannot be verified, and illegal placement inside phrasing content. Preserve dark/breakpoint styles. No styling via global CSS.

**D. Refusal:** **“I can’t place a divider safely here because this location does not accept a separator.”**

**E. Review/undo.** Show semantic tag and exact class string; undo removes it.

**F. Tests.** 1) Before: two paragraphs in section; horizontal divider appears between. 2) Before: verified flex row; vertical divider appears with `aria-orientation`. 3) Before: inside a paragraph; divider insertion refused with D.

**G. Effort S; risk low; depends on:** parent semantics and verified layout direction.

## 18. Badge / status label

**A. What it does.** Insert a small label for a short status or category the user supplies. It is presentational and does not claim that an account, payment, or process has been verified.

**B. Exact code written (Tailwind 4.3.3 examples).**

```tsx
<span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">Draft</span>
<span className="rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-800">Ready</span>
<span className="rounded-md border border-amber-300 px-2 py-1 text-xs text-amber-900">Needs review</span>
```

**C. Edge cases.** Refuse empty labels, unsupported insertion parents, or language that falsely implies a system verification. Preserve breakpoint/state/dark variants. Do not invent severity colors or a project’s custom tokens; use only classes that compile in the project. If a verified project Badge component exists, offer that instead and inspect its props.

**D. Refusal:** **“I can’t add this status label safely because its text or visual meaning is unclear.”**

**E. Review/undo.** Show the literal label and exact JSX/classes; Undo removes the inserted node and optional import.

**F. Tests.** 1) Before: static card; insert “Draft”; a neutral pill appears. 2) Before: static card; insert “Needs review”; amber style appears only if project class compiles. 3) Before: no user-provided status and prompt says “mark payment verified”; refuse with D.

**G. Effort S; risk low; depends on:** wording from user, accessible text, class validation.

## 19. Icon

**A. What it does.** Insert an icon already available in the user’s project. It does not download or invent an icon package.

**B. Exact code written.** For this repo’s installed `lucide-react` v1.55.0, a possible insert is:

```tsx
import { ArrowRight } from 'lucide-react';
<ArrowRight aria-hidden="true" size={16} />
<ArrowRight className="size-4" aria-hidden="true" />
<ArrowRight aria-label="Continue" role="img" size={20} />
```

The utility `size-4` is a Tailwind v4 utility; confirm in the connected project.

**C. Edge cases.** Refuse if the selected icon export is absent, project uses another icon system, or adding the import would conflict. Decorative icons must be hidden from screen readers; meaningful icons need accessible naming. Preserve existing state classes. No icon fonts or remote assets.

**D. Refusal:** **“I can’t add this icon because it isn’t available from a verified project dependency.”**

**E. Review/undo.** Show import and node changes together; undo removes the node and only the import added by this action.

**F. Tests.** 1) Before: button with text; insert existing ArrowRight icon; icon appears and is decorative. 2) Before: icon component already imported; insert use; no duplicate import. 3) Before: requested icon export missing from dependency; refused with D.

**G. Effort S; risk low; depends on:** installed dependency/export check, import manager, accessible naming.

## 20. User-owned project component

**A. What it does.** Insert a component that already exists in the user’s repository, such as their own Button. The editor shows the component’s required properties and lets the user fill them before adding it.

**B. Exact code written.** Example only after inspecting the actual component contract:

```tsx
import { Button } from '@/components/ui/button';
<Button variant="outline" size="sm">Save</Button>
<Button type="submit">Continue</Button>
<ProjectNotice tone="warning" title="Review needed" />
```

These are not assumed APIs: only exact exports/props found in the project may be emitted.

**C. Edge cases.** Refuse unexported components, unknown/required props, server/client boundary mismatch, dynamic props, cyclic import, or components whose implementation executes unsafe code or has no inspectable type/source. Shared component definition edits affect all usages; insertion only creates a new use. Existing dark/responsive variants should come from props or classes documented by source; do not invent prop names. CSS-module styling remains owned by the component.

**D. Refusal:** **“I can’t insert this component safely because its export or required properties could not be verified.”**

**E. Review/undo.** Show source path, import, prop values, and inserted JSX; undo removes only the new use and any newly added import.

**F. Tests.** 1) Before: page imports Button already; add verified `<Button>Save</Button>`; it renders. 2) Before: Button unused but exported with typed `variant`; import and add `variant="outline"`; both appear in diff. 3) Before: requested `Button tone="magic"`, prop absent from source type; refused with D.

**G. Effort L; risk high; depends on:** TypeScript symbol/type inspection, import graph, Next server/client boundaries, compile validation.

---

# Explicit cut list

- **Expressions and arbitrary code:** cut from visual editing. Expressions can execute code and depend on hidden state; a visual guess cannot safely rewrite their behavior. Show the source and ask a developer to edit it manually.
- **3D cameras:** cut. Camera transforms involve scene graphs, coordinate systems, and runtime engines rather than a small local JSX style edit.
- **Particles:** cut. Particle systems add runtime behavior, performance costs, and often dependencies; they are not a clean static source patch.
- **Motion tracking:** cut. It requires video/sensor input and ongoing runtime logic, not a bounded visual source change.
- **Video effects:** cut. Effects can require media pipelines, browser-specific APIs, assets, and lifecycle code. SlightNudge should not imply a safe one-click JSX edit.

---

# Cross-cutting behavior

## 1. Breakpoints and states

Treat a class as a sequence of variant segments plus one utility, not as a string beginning with one guessed prefix. For example, `md:hover:opacity-50` has two conditions and one opacity utility.

- UI selection records **viewport breakpoint** and **state** separately. Base means no responsive prefix; hover/focus/active means a state variant. A tablet preview does not automatically mean “edit only tablet”; the user must choose “this size only” or “all sizes.” Default recommendation: “this size only” after explicit selection.
- Write the canonical composed token, e.g. `md:hover:opacity-50` or `dark:focus-visible:outline-blue-600`. Never replace a base class with a prefixed class, or an existing `md:` token with a base token.
- If both `hover:opacity-50` and `md:hover:opacity-80` exist, changing `md:hover` touches only the latter. If multiple same-property tokens match the chosen condition or ordering makes precedence uncertain, show the conflict and refuse until the user chooses which one to replace.
- State simulation must be honest: hover can be previewed with pointer state; focus must be previewed with keyboard focus; active/pressed is brief and should be a click/press preview. Do not fake dark mode or a breakpoint by only changing the class label; preview at the corresponding media setting.
- Respect user-defined breakpoints and custom variants from project CSS. If they are absent from the project’s discovered Tailwind configuration/theme, do not offer them.

## 2. Tailwind v3 vs v4

This SlightNudge project currently has Tailwind **4.3.3**, configured with `@import "tailwindcss"` in `app/globals.css`. Do not assume a connected repository has the same version.

- Detect exact installed package version from the target project’s lockfile and installed package, then compile candidate classes using that project’s own Tailwind build pipeline. Manifest ranges alone are not enough.
- Maintain versioned utility catalogs. Examples in this spec are v4.3.3-oriented. For v3, preserve the project’s existing configuration conventions and verify each candidate with its own compiler; do not auto-convert class strings between major versions.
- Tailwind v4 is CSS-first and can define tokens/variants in CSS. Tailwind v3 commonly uses a JavaScript config. Discover custom theme values and variants before exposing them. If discovery/compile fails, hide the control or refuse the edit; never silently fall back to a guessed class.
- Keep the source class literal unchanged except for the selected utility tokens. Do not reformat the whole class attribute, reorder unrelated tokens, or migrate a project’s CSS setup as a side effect.
- Use exact named classes in the initial control catalog. Arbitrary values (`[...]`), custom utilities, and unknown variants stay unavailable until a compile probe proves they work and the source patcher can reason about conflicts.

## 3. Diff and preview

Before Apply, show: selected element and source location; whether one instance or every instance changes; the visual preview; each old/new class, style, JSX node, or stylesheet line; all files touched; validation result; and clear Apply / Discard actions. Use readable line-level diffs for JSX/stylesheet changes and a token-level summary for class changes.

After Apply, show the saved source location, success state, Undo action, and whether the preview rebuild succeeded. If the build fails, immediately roll back the transaction and show the compiler error in plain English with a “copy details” option. Never claim success while source and preview disagree. If source changed externally between preview and Apply, discard the stale preview and say: **“This file changed after the preview. Nothing was applied; preview the edit again.”**

Undo restores exact recorded bytes for all files in that transaction, only when every file still matches the recorded after-state. Otherwise refuse and explain that a person changed the source since Apply.

## 4. Recommended milestones

Every milestone ends with a click-through demo and a passing test list. No milestone ships on screenshots alone.

1. **M1 — State and transition basics.** Demo: hover/focus/active and duration/delay/easing on a static button. Tests: preview vs diff match; static literals apply; `cn()`/condition/shared component refuse; responsive + dark prefixes preserved; keyboard focus works; compile passes; external file change blocks Apply/Undo; exact Undo works; reduced motion honored. Easing curve stays behind an experimental switch until its output is verified.
2. **M2 — Transform and opacity/blend.** Demo: move/rotate/scale a card and tune opacity against a real backdrop. Tests: separate transform families preserved; conflicting family prompts; arbitrary/non-Tailwind styles refuse; preview computed style matches source; v4 compile passes; Undo restores exact class.
3. **M3 — Read-only Layers tree, then safe hide/name/lock.** Demo: inspect page hierarchy; hide/show a static element; assign a layer name; lock/unlock it. Tests: tree matches JSX; conditional children identified; metadata diff is visible; custom data readers warning appears; hide conflicts refuse; state survives reload only if source metadata is applied; Undo each change.
4. **M4 — Static sibling reorder.** Demo: reorder two siblings in the sample fixture. Tests: exact order/whitespace/keys preserved; list/conditional/shared cases refuse; all affected selectors/breakpoints preview; compile passes; undo restores exact file.
5. **M5 — Tier 3 insertions: text, divider, link, button, image, icon.** Demo: add an accessible link and local image. Tests: semantic parent, safe URL, alt text, import de-duplication, no invented behavior, Tailwind compile, one-step undo.
6. **M6 — container/card/input and project components.** Demo: add a labeled field and verified project Button. Tests: form semantics, required props, import graph, client/server boundary, CSS modules, typecheck/build, atomic undo.
7. **M7 — Tier 2 structures and motion.** Demo: group a static block, extract a simple component, apply a reduced-motion-safe entrance preset. Tests: multi-file atomicity, no behavior changes, stylesheet parser, motion preference, browser support, full build, rollback after forced failure.
8. **M8 — masks and broader shape tools.** Demo: circle/inset crop on a static image. Tests: style merge, visual comparison, responsive refusal/handling, conflicts, browser rendering, exact undo.

## 5. OPEN QUESTIONS for founder (with recommended answers)

1. **When changing a reusable component, should every place that uses it change?** Recommendation: refuse in M1; later require a separate “edit all uses” confirmation and show every use.
2. **Should layer names and locks appear in production markup as `data-slightnudge-*` attributes?** Recommendation: yes only if the founder accepts this visible, harmless-by-default metadata; otherwise cut rename/lock until the project has an approved source-side metadata format.
3. **Should editing at tablet affect tablet only or all screen sizes?** Recommendation: default to the chosen breakpoint only, with an explicit “all sizes” option and a responsive preview before Apply.
4. **Should visual elements include behavior, such as button actions and form submissions?** Recommendation: no guessed behavior. Require the user to select an existing verified action or leave the control presentational and clearly labeled.
5. **Can SlightNudge add a stylesheet rule or component import when required?** Recommendation: allow only as one atomic multi-file transaction with every file shown and undoable; no hidden helper files.
6. **Should arbitrary CSS values be supported?** Recommendation: not initially. Start with tested presets; consider custom values after each target project’s compiler validates them.
7. **How should an outside code edit affect an open preview?** Recommendation: invalidate the pending change immediately and ask the user to preview again; never auto-merge or overwrite.
8. **Can the editor modify a shared component definition?** Recommendation: only after showing the count and list of affected pages and receiving explicit “all usages” confirmation.

## 6. UNVERIFIED list and how to check

1. **Arbitrary Tailwind easing utility syntax** such as `ease-[cubic-bezier(...)]`: compile a tiny candidate with the connected repository’s installed Tailwind compiler and inspect the generated CSS. This spec uses a static React style property instead, so the utility is not required.
2. **Arbitrary transform utility syntax** such as `rotate-[17deg]`: compile with target project Tailwind and verify computed transform in browser before offering it. Initial catalog should use only named utilities.
3. **Composed custom variants and exact ordering** such as `md:dark:hover:` or project-defined variants: inspect the target project’s CSS-first theme/config and compile a candidate; verify actual CSS at the target viewport/state. Hide unverified combinations.
4. **Tailwind `size-4` and candidate classes in external projects:** run the candidate through that exact project’s Tailwind build, not this app’s compiler. If unavailable, mark the element’s insert option unsupported.
5. **Next.js `<Image>` insertion conventions:** read the connected project’s Next version and its installed `node_modules/next/dist/docs/` guidance, then verify import, required props, and build. Otherwise use a verified native `<img>` insertion or refuse.
6. **Scroll-driven CSS animation support:** detect browser support and compile/render a minimal scroll timeline in the target project; test fallback and reduced-motion. Until then, scroll animation presets are unavailable.
7. **Whether `data-slightnudge-*` metadata is inert for a particular app:** inspect the repository for readers/selectors of those attributes and show the markup diff; if found or unclear, refuse metadata insertion.
8. **Component prop APIs/import aliases:** inspect actual export and TypeScript declaration/source, resolve alias via the project config, and compile the inserted component. Never rely on the example names in this spec.
9. **Current shared-component usage detection completeness:** test across files, barrel exports, higher-order wrappers, and library components. Existing inspection mainly scans a source file and must not be treated as repository-wide proof.
