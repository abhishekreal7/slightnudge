# SlightNudge implementation roadmap

26 October 2026: [one source canvas](unified-source-canvas.md) replaces the handcrafted local renderer and shares the selection/preview bridge with imported projects. Local fixture rendering and imported connection have different qualification boundaries; production route coverage and parent-aware layout remain open. Earlier descriptions of the separate Playground renderer below are historical.

Latest local editing slice, 26 October 2026: [continuous drafts](continuous-draft.md) allow multiple gestures and element selections before one explicit Save, with draft Undo/Redo and refresh recovery. This supersedes the earlier local per-gesture review lock; imported-project draft transactions remain unqualified.

25 October 2026 · Proposed execution plan · No feature completion implied

Execution evidence: [M0 save outcome recovery](m0-save-recovery.md), [qualification recovery](m0-qualification-recovery.md), [reviewed-save crash recovery](m0-crash-recovery.md), [exact-edit Undo recovery](m0-undo-recovery.md), and [refresh recovery/checkpoints](m0-tab-recovery.md) record the foundation slices. [Selection Move control](studio-move-control.md) records the requested UI follow-up. M0 remains open for ordinary preview restoration, imported reload qualification, conflict/repair UX, preview timing, wider qualification and independent review.

## Outcome

Founder priority, 25 October 2026: prioritize direct manipulation. [Snapped width resizing](direct-manipulation.md) records the first implemented slice. Upcoming work should favor actual-page manipulation geometry, parent-aware movement and padding/gap handles while retaining the source/recovery gates below.

[Centered drag-to-move](centered-drag-move.md) now implements the requested local text-selection styling and position manipulation. It qualifies translation changes on the actual source-rendered fixture as well as the local canvas; imported and structural layout movement are still separate gates.

Make refining an existing website feel direct: select an element, shape its appearance or layout, preview its behavior, and confidently apply the result to the real project.

The first release must let a founder open a qualified real project, correct a heading, tighten a card layout, make a mobile-only adjustment, preview a hover treatment, and undo every accepted edit. Preserve the current Studio visual design, including its canvas and resize work.

“Flawless” is a quality ambition, not a support claim. We will earn trust with explicit support boundaries, measured task completion, and release gates. No promise to edit every React project or every CSS system.

## Evidence and precedence

- Product intent: [product-interactions-direction.md](product-interactions-direction.md).
- Latest recorded foundation results and open failures: [recovery-and-next-steps.md](recovery-and-next-steps.md).
- Historical architecture and controls: [editor-product-plan.md](editor-product-plan.md) and [controls-spec.md](controls-spec.md). Their older completion claims are not current evidence. In particular, do not assume the default Playground is source-rendered.
- This roadmap sequences future work. It does not approve a release, supersede founder decisions, or declare historical tests passed.
- Before implementation, inspect current source and reproduce the baseline. Read the installed Next.js guides in `node_modules/next/dist/docs/` for each affected framework feature, as required by AGENTS.md.

Historical baseline blockers: the Playground had a separate handcrafted representation; imported editing was experimental; one public project's reconnect qualification was incomplete; lost-response recovery after a successful write was unverified. Consult the latest evidence above for subsequent slices. Preserve the existing uncommitted work and distinguish new changes from that baseline.

## Product rules

1. Source is the truth. The page being edited must render from the same source that receives the patch.
2. Every enabled action has an exact target, supported scope, verified preview, explicit Apply, and safe Undo.
3. Preview never writes project files. Selection changes never accept pending work.
4. Show relevant controls on selection. Put detailed settings in expandable inspector sections; retain discoverable labels and keyboard access.
5. Viewport width and edit scope are separate. Looking at mobile must not silently turn the next edit into a mobile override.
6. Report authored, inherited, computed, conflicting, and unavailable values distinctly. Never invent an editable default.
7. Preserve project conventions. Reuse verified tokens and ordinary source constructs; no hidden styling runtime or dependency installation.
8. Keep one pending edit until grouped transactions are proven. A drag is one proposal and one Undo step, not a stream of writes.
9. An unavailable action explains why and offers a concrete next step when possible.
10. State what succeeded: source saved, rendered revision confirmed, or recovery needed. These are different outcomes.

## Shared technical foundation

Extend the existing engine rather than introducing a second editing pipeline. Use the same contracts for Playground and imported projects, with adapters for rendering and source access.

| Contract | Required information or behavior |
| --- | --- |
| Selection | Project/session, route, source node, source revision, rendered instance, and actual layout context; line numbers alone cannot establish identity after an edit |
| Scope | Base or explicit screen range, interaction state, and selected instance; detect project breakpoints rather than hardcoding device names |
| Capability | Whether this property is readable/editable, its value and origin, supported values, and a specific refusal reason |
| Edit proposal | Original target and revision, requested operation, exact patches, scope, validation results, and expected rendered result |
| Transaction | Unique ID, preconditions, durable outcome, before/after fingerprints, and recovery status; retries cannot repeat an accepted write |
| History | One entry per accepted operation; Undo verifies all affected current versions before restoring anything |
| Preview | Ownership tied to proposal and document revision; stale requests, navigation, or selection changes cannot attach a preview to a different element |

Model the lifecycle explicitly: inspecting → ready → preparing → preview/review → applying → confirming rendered revision → saved. Discard returns to ready. Refusal, stale source, and uncertain write outcomes have separate recovery paths. A failed network response must not be presented as proof that the write failed.

For a dropped Apply response, query transaction status before retrying. If status cannot be established, keep editing blocked with a recoverable explanation. If a save succeeds but rendering fails to reconnect, report that distinction and reconnect without replaying the write.

Likely integration points, to confirm before changing code: `lib/slightnudge/ast-nudger.ts`, `edit-history.ts`, `client.ts`, `next-source-adapter.ts`, `components/slightnudge/SourceProjectCanvas.tsx`, `SlightNudgeOverlay.tsx`, `StudioLayout.tsx`, the Studio routes, and the existing preview/apply APIs. Keep patch generation, project validation, and review ownership centralized.

## Milestone 0 — Establish and close the reliability baseline

**Deliverable:** a qualified editing engine with reproducible evidence on supported real projects.

- Inventory current modified files and preserve them. Run tests on disposable project copies.
- Reproduce the incomplete public-project reconnect run; repair its cause and complete the same qualification rather than replacing it with an easier sample.
- Add deterministic failure injection for delayed refresh, stale iframe messages, double Apply, navigation during preparation, concurrent external edits, and connection loss before/after the source write.
- Implement or verify transaction IDs, outcome lookup, duplicate-request protection, and restart recovery for accepted writes. Never automatically retry a write with unknown status.
- Test session/origin boundaries and path containment for all new endpoints and messages.
- Publish a support matrix by installed framework/CSS version and operation. Separate allowed edits, source refusals, unselectable elements, and infrastructure failures.

**Exit gate:** exact source/render/Undo checks pass on the generated sample and both previously exercised public projects; the incomplete run is completed or its environment is explicitly excluded from launch with a documented reason. Zero wrong-target writes; no source mutation on Preview/Discard/refusal; no duplicate writes; recovery resolves injected uncertain outcomes without overwriting external work. Run applicable existing regression suites, typecheck, and production build. Record failures and exclusions, not just successful totals.

**Demo:** interrupt the response after Apply writes; reconnect, confirm the one accepted edit, then Undo it exactly.

## Milestone 1 — One truthful renderer and one editing lifecycle

**Depends on:** M0. **Deliverable:** the current Studio shell editing actual source in both sample and imported flows.

- Replace the handcrafted Playground representation with real source rendering without replacing the approved interface.
- Share selection, proposal, review, history, and recovery behavior between editor paths. Preserve isolation of imported page scripts/styles and session-check all bridge messages.
- Restore the route and viewport after reconnect; re-inspect the target instead of trusting a stale node reference.
- Ensure zoom, scrolling, iframe offsets, and resized canvas dimensions produce correct hit-testing and handles.
- Distinguish edit mode from interaction preview. Editing cannot submit forms or follow links accidentally; interaction preview must not unexpectedly trigger destructive site actions.

**Exit gate:** identical text and style tasks pass through both paths using real APIs and files; no independent mock page model remains in the shipped Playground. Selection outlines, resizing, review, and Undo pass browser and visual checks at supported zooms and widths. All pending-edit ownership race tests pass.

**Demo:** change a real sample heading, reload it, inspect the saved source, and Undo. Repeat on an imported project.

## Milestone 2 — Everyday editing with honest values and scopes

**Depends on:** M1. **Deliverable:** a small, dependable inspector covering the highest-frequency jobs.

- First: literal text; typography; foreground/background; padding/gap; border/radius; supported width/height and row/column alignment. Inventory existing controls before adding any duplicate UI.
- Show real values with units and provenance. Explain parent-controlled layout and offer Select parent.
- Separate screen preview from the scope picker. Resolve installed breakpoint definitions; support bounded ranges only when the project's compiler verifies them.
- Preserve unrelated responsive, dark, and interaction variants. Detect conflicts instead of relying on class order. Refuse ambiguous shorthand/longhand combinations until resolved.
- Reset removes only the selected authored override and reveals the effective inherited value; it never guesses a default.
- Coalesce input scrubbing into one proposal. Numeric inputs support keyboard entry; invalid input preserves the last valid state.
- Maintain a capability registry shared by inspector, canvas handles, and keyboard actions so a hidden route cannot bypass a refusal.

**Exit gate:** every shipped control has at least one real-source success, relevant refusal cases, exact-scope preservation, Discard, Apply, rendered-value verification, and exact Undo. Test custom tokens/breakpoints and both qualified Tailwind versions. Unsupported CSS modules, calculated values, and shared definitions remain explicitly unavailable.

**Demo:** correct a heading, tighten card padding, and make one mobile-only adjustment while desktop remains unchanged.

## Milestone 3 — Direct layout manipulation

**Depends on:** M2. **Deliverable:** layout changes made where users see them.

- Begin with padding insets and a gap handle on supported single-row flex containers. Select and identify the owning parent before editing its gap.
- Snap to verified project spacing values. Display the current value while dragging, with an equivalent numeric/keyboard control.
- Account for zoom and scroll; freeze the proposal's target during a gesture; throttle visual updates without repeatedly patching files.
- Escape cancels the active gesture and restores its pre-gesture preview. Pointer release prepares review; it does not Apply.
- Extend to grid/wrapped layouts only after distinct row/column gap ownership and geometry have dedicated tests.
- Fit, Fill, and fixed sizing appear only when their semantics can be mapped to the actual parent layout. Explain side effects before applying.

**Exit gate:** layout owners and neighboring elements are correct at supported zoom/scroll positions; pointer cancellation/loss and keyboard operation are verified; each gesture yields one proposal and one accepted history entry. No absolute positioning is introduced to imitate a layout change.

**Demo:** select a card row, drag its gap, resize the viewport, review the parent change, Apply, then Undo.

## Milestone 4 — Visual states and meaningful motion

**Depends on:** M2; M3 precedes its product release. **Deliverable:** the first complete “select → shape → play” workflow.

- Compact Default / Hover / Focus-visible / Press controls for supported elements. Forced visual state and real interaction preview must be distinguishable.
- Reuse the property controls and scope model to edit state-specific appearance. Support combined screen/state scope only after project-specific compilation and isolation checks.
- Start with explicit transition properties, duration, and named easing; use existing interaction controls where valid. Avoid defaulting to transition-all.
- Play resets to the initial state before replay. Playback never changes source or commits a proposal.
- Keyboard focus remains real and visible. Nonessential motion respects reduced-motion preferences; if the required source rules cannot be generated safely, the motion action remains unavailable.
- Add an easing curve only after static style merging, conflicts, source output, and numerical validation are tested. Timelines and scroll animation wait for demonstrated multi-stage user needs.

**Exit gate:** default and edited states render correctly; unrelated states/ranges remain unchanged; keyboard activation and reduced-motion behavior pass; accepted source is ordinary project-compatible code; Apply/Undo restores all involved rules exactly.

**Demo:** give a card a subtle hover lift, adjust its speed, replay it, inspect keyboard focus and reduced motion, then undo the accepted change.

## Milestone 5 — Comparison and appearance reuse

**Depends on:** M2 and the one-edit lifecycle. **Deliverable:** faster refinement without a denser default interface.

- Before/after preview compares the same route, content, viewport, and source revision; offer a persistent toggle as well as hold-to-compare for keyboard/touch accessibility.
- Add on-demand side-by-side screen widths, with independent viewport sizes but an explicit shared edit scope. Detect differing revisions and suppress misleading comparisons.
- Copy appearance by category: Type, Color/Surface, or Spacing. Start with one compatible target in the same project; do not copy content, IDs, event handlers, or behavior.
- Review replacement/conflicting values. Do not silently copy only half a category when some properties are unsupported.
- Allow a category containing several properties only once a single reviewed patch can validate, Apply, and Undo the entire category together. Cross-file or multi-target reuse stays deferred.

**Exit gate:** comparisons never write; rapid toggles restore the owned preview correctly; copied categories preserve unrelated target rules; invalid categories fail without partial application. Comparison frames are created on demand and cleaned up after closing.

**Demo:** reuse a heading's type treatment, compare old/new on mobile and desktop, and undo the complete operation once.

## Milestone 6 — Safe composition and reusable work

**Depends on:** M0–M5 release gates. Deliver in independently testable slices:

1. Read-only accurate element tree and literal prop edits at a verified component call site. Show selected instance scope; never patch a shared definition to imitate an instance edit.
2. Static sibling reorder and basic insertion: text, divider, link, image, and button with explicit supplied destination/behavior. Do not invent working form or button actions.
3. Project-native components with verified exports, required props, and reviewed imports/assets.
4. Grouping, extraction, multi-target style reuse, named change sets, and recipes only after multi-file transaction support is proven.

Multi-file support needs preflight version checks, serialization of competing operations, staged writes, durable recovery records, rollback after injected failures, and guarded Undo of edits/new files. A sequence of individual file renames is not sufficient proof of an atomic transaction. Tests must cover interruption at each write boundary and external edits during recovery; never restore snapshots over unrelated later changes.

**Exit gate per slice:** exact target and affected scope are shown; every changed/new file is reviewed; the whole operation succeeds or recovers without a partial accepted result; Undo restores the accepted operation without deleting unrelated work.

## Interface and performance acceptance

- Preserve the Studio shell. Use a small selection toolbar, one inspector, one scope selector, and one authoritative review surface. No always-visible timeline or extra permanent panel.
- Prototype and visually review each new interaction in the existing shell before connecting writes. Prototype controls remain clearly non-shipping until integration gates pass.
- Test narrow editor windows, long values, empty/multiple selections, loading, refusals, offline recovery, and large documents—not only the happy-path screenshot.
- All editing actions need keyboard access, readable focus, descriptive labels, and a non-drag alternative. Test touch targets and reduced motion. Automated accessibility checks supplement manual task completion.
- Initial performance targets on a recorded reference device/project: selection feedback p95 ≤100 ms; local drag feedback p95 ≤32 ms. Measure compiled-preview preparation separately and show progress/cancellation when it exceeds one second. These are targets to validate, not current claims.
- Bound observers, event listeners, comparison frames, and history storage. Include repeated select/edit/discard/reconnect sessions in leak and responsiveness checks.

## Verification and release process

For every milestone, ship a vertical slice through UI → proposal → validation → preview → source → rendered confirmation → Undo. A new inspector section without its end-to-end behavior is unfinished.

Required evidence:

1. Focused engine tests for targeting, scope, class conflicts, stale versions, and transaction behavior.
2. Real-browser tests on disposable real projects. Mocked tests may cover UI races but cannot certify source edits.
3. Semantic rendered assertions and exact source-byte checks; visual inspection for geometry, readability, focus, and responsive behavior.
4. Relevant regression suites, typecheck, production build, and an independent review before promoting the slice. Reviewer checks must not rely only on the implementer's success report.
5. A concise evidence record with revision, installed versions, commands, results, screenshots where relevant, unresolved failures, and support exclusions.

Keep unfinished capabilities disabled by a shared feature/capability gate. Enable by qualified operation/project combination, not by the mere presence of a toolbar. Retain a rollback path to the previous qualified release. Do not commit, deploy, or broaden support claims as an incidental part of implementation.

## Private beta and prioritization

Begin with 5–8 founders using qualified projects. Observe the first task without coaching; record where they hesitate, cannot select an element, misunderstand scope, or cannot recover. Collect operational outcomes without source code, page text, tokens, or repository secrets in analytics.

Proposed beta gates:

- Zero wrong-target writes or source-loss incidents in qualification and observed beta workflows; any occurrence blocks expansion.
- At least 90% completion of the defined supported workflow across at least 30 observed attempts; report participant/project distribution and do not imply statistical certainty from this small sample.
- At least 80% of participants complete the supported workflow without live coaching.
- All scripted Discard/Undo/recovery cases pass. Track real recovery failures separately from unsupported-feature refusals.
- Report time to first successful edit, scope mistakes, refusal reasons, reconnect failures, and task completion by operation and project. Do not inflate success by removing failed selections from the denominator.

Prioritize subsequent work using observed task frequency, user value, support coverage, and implementation risk. A frequent refusal with a safe solution outranks an impressive animation used by nobody.

## Execution order and first work package

Critical path: **M0 reliability → M1 renderer → M2 core controls/scopes → M3 layout handles → M4 states/playback → M5 reuse/comparison → private beta.** M6 expands the proven product after beta evidence; it is not required to expose an enormous feature catalog at launch.

Do not attach calendar promises before M0 reveals the actual remaining engineering work. At each gate, estimate the next slice from verified dependencies and identify its implementation owner and independent reviewer. Split work into reviewable changes with one acceptance demo each.

The first implementation package is deliberately concrete:

1. Capture the current baseline and reproduce the incomplete reconnect qualification.
2. Trace Apply and Undo through request, file write, history record, and rendered-revision confirmation.
3. Add a failing dropped-response regression and transaction-outcome reconciliation.
4. Repair/retest reconnect without weakening revision checks or hiding failures behind longer waits.
5. Complete the real-project qualification and publish a corrected support/evidence report.

Then start the renderer consolidation. This makes the signature experience rest on a trustworthy product rather than a separate demonstration.
