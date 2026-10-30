# SlightNudge: useful power, a quiet interface

Founder direction, 25 October 2026. This is a product proposal, not a claim that these features already work. It preserves the approved source-safety rules and milestone approval gates. It does not authorize replacing the current Studio design.

## The central idea

Give users a small set of operations they can combine: **select, choose the scope, change, compare, review, apply**. Scope means which screen size or interaction state receives the change. The same sequence should work for a heading, a row of cards, or a button's hover appearance.

The lesson from the founder's keyframe example is that a clear representation of a relationship can make a difficult task understandable. Our equivalent should begin with **design states and layout relationships**. Users describe how an existing interface should behave, while SlightNudge turns that intention into a small, verified source change.

No feature ships merely because it looks impressive. It needs a recurring user task, an understandable action, a predictable preview, a precise source target, and a working recovery path. Source changes remain explicit, reviewable and undoable.

## Three ideas to build around

### 1. Edit a state, see the difference

Select a button. Choose Default or Hover. Change its appearance and switch between the two to compare. Later, a small transition control explains how the change happens: duration and easing, meaning the speed and acceleration of the transition.

The same scope model extends to screen sizes: change a heading on mobile while keeping its desktop appearance. Tablet-only edits have a visible upper bound. Looking at a tablet preview must not silently change the scope of the next edit.

Only relevant states appear in the normal flow. Advanced combinations open on demand. An override, meaning a value replacing an inherited/default value for that scope, has a clear reset action. Reset removes that override; it does not invent a replacement default.

Tailwind already has a vocabulary for state and screen-size variants; these are implementation building blocks, not proof that every project's styling can be edited safely. Detect and validate the project's actual version and configuration before enabling the action. See [state variants](https://tailwindcss.com/docs/hover-focus-and-other-states) and [responsive ranges](https://tailwindcss.com/docs/responsive-design).

**Demo gate:** edit one static button's Hover appearance; Default remains unchanged; compare both; review the exact change; Apply and Undo. Repeat at one bounded screen range. Unknown variants, conditional classes and ambiguous sources refuse without writing.

### 2. Manipulate relationships directly

Show the gap between cards as an editable handle. Show padding around a section as an inset. Let a user choose Row, Column, Wrap, Fill or Fit where the real layout supports it. These actions should explain the layout the browser is actually using.

Dragging a gap changes the parent container's supported spacing value. It does not pretend that the child moved independently. Dragging snaps to the project's verified spacing options; arbitrary values stay out of the first release.

When spacing comes from a parent, say “This space comes from the row's gap” and offer Select row. If a width comes from a shared component or unsupported stylesheet, explain that source instead of displaying an invented editable value. Structural changes such as introducing a wrapper remain behind their approved later milestone.

The broader design precedent is that relationships between a container and its contents can be easier to manage than independently positioning every item. Figma documents this approach in [auto layout](https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout-in-Figma). Our implementation must map to the existing project's real layout, rather than assuming a design-tool model is interchangeable with CSS.

**Demo gate:** change the real gap of a static row and undo it; switch an already-supported layout at one screen range; verify neighboring elements and unrelated ranges remain correct. A selected child whose spacing is controlled by its parent directs the user to that parent before any edit.

### 3. Show the consequence before committing

Compare the current page with the proposed change in place. Explain the affected element, screen range, state and source location. Keep the detailed code comparison expandable so a founder can understand the result without reading code first.

Start with the current one-pending-edit contract. A future change set can combine related changes into one reviewed operation only after every patch can apply and undo together. A change set is not permission to accumulate unvalidated edits or silently write several files.

For example, a later card refinement could combine padding, type and a Hover treatment in one named review. The first release should perform these as separate safe edits until grouped transactions pass their tests. Whole-file rollback must never erase an unrelated outside edit.

**Demo gate:** the preview is clearly unsaved; comparison works without applying; Discard restores the preview; Apply changes only reviewed source; Undo restores the exact accepted change. A lost response after a write must be reconciled before offering a retry.

## Features these ideas make possible

| Capability | Useful result | How it stays quiet | Release condition |
| --- | --- | --- | --- |
| Direct text editing | Correct a real heading or label without hunting through files | Appears on an editable text selection | Literal text first; literal prop call sites in M2b; computed/fetched values refuse |
| Screen/state editing | Fix mobile layout or a Hover treatment without changing everything | One compact scope control | Project-verified variants, visible scope, correct preview and exact Undo |
| Spacing and alignment handles | Make a row or section feel right with direct feedback | Relevant handles appear only on selection | Actual parent/child layout is known; supported source change only |
| Style explanation | Understand why a control is inherited, overridden or unavailable | Details open from the value's origin indicator | Read-only explanation must be accurate; no automatic stylesheet rewrite |
| Copy appearance | Reuse typography, color or spacing on a compatible target | A context action with selectable categories | One target at a time first; verified project tokens; no behavior/content copying |
| Responsive comparison | See whether a change improves mobile while preserving desktop | Open a focused comparison view when needed | Same source revision; bounded resource use; no hidden cross-device edits |
| Project-native insertion | Insert a component the project already uses, with its existing look | Searchable insert menu with verified choices | Known export, required literal props and reviewed imports; no invented button or form behavior |
| Small motion controls | Build a useful Hover transition or later entrance treatment | Interaction section opens on demand | States/transitions before timelines; reduced-motion behavior; approved animation milestone and safe source output |
| Change sets and recipes | Reuse a proven refinement without rebuilding it manually | Optional named actions; one review | Atomic application and Undo; cross-file changes wait for M6 |

Shared component definitions remain refused for now. A later call-site editor must distinguish the chosen instance; a repeated rendered source marker is not permission to change every instance. Layer rename and lock stay cut. Editor-only Hide stays separate from Hide on page.

## Interface rules

- Selection determines the first controls: Content and Type for text; Layout and Spacing for a container; Source, Fit and Size for an image. Keep other relevant sections available but closed.
- Keep the floating toolbar small. It contains immediate actions for the selected item; the inspector contains detailed settings. Avoid showing the same Apply action in multiple competing review bars.
- Use a stable neutral surface, readable type, consistent control heights and one restrained accent. Selected, hovered, unavailable, inherited and unsaved states need distinct meanings, not decorative color.
- Show real units and values. Label inherited values. A missing source value must never masquerade as zero, Auto, or an editable default.
- Reserve empty space deliberately. Do not put every state, breakpoint, token, timeline and import option in the default view.
- Explain refusals where the action was attempted, with the reason and a useful recovery step. “Unsupported” without a reason is insufficient.
- Keep keyboard focus visible and input shortcuts predictable. Escape closes transient UI; it must not silently accept or destroy a pending source edit.
- Never remove the plain source-review explanation just to make the interface cleaner. Safety should be understandable, not hidden.

## What we should not build now

Do not add a full motion timeline simply to resemble After Effects. Start with state pairs and transitions; introduce a timeline only when a validated user task needs several timed stages and the source transaction can support them.

Keep expressions, 3D cameras, particles, motion tracking and video effects cut. Avoid unsupported universal HTML/component imports, automatic dependency installation, invented interactions, and broad one-click visual fixes that cannot explain which source rules will change.

## Delivery order

1. Close the current reliability gate and publish its real limitations. Preserve the latest Studio interface.
2. Unify the Playground and imported-page renderer. Finish the approved core controls with real values, precise scope, review and Undo.
3. Add literal prop call-site editing, the accurate element tree and safe static structure operations through the existing milestones.
4. Add appearance reuse and responsive comparison once targeting and project-specific style validation are dependable.
5. Add verified project-native insertion; then atomic grouping/extraction and meaningful motion presets through their approved milestones.
6. Test complete founder workflows in a private beta. Prioritize successful tasks, understandable refusals, fast recovery and time saved over the number of controls.

The near-term acceptance task is concrete: **a founder can correct a heading, tighten a card layout and make one mobile adjustment, understand every proposed change, and recover completely with Discard or Undo.** That workflow should succeed on qualified real projects before we advertise broader power.
