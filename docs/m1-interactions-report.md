# M1 — Interaction styles and a cleaner inspector

## Founder summary

This milestone adds styles for Hover, Focus and Pressed, plus transition presets. A transition controls how smoothly a visual property changes. Every supported change is proposed first, applied only after your click, and can be undone during the same Studio session.

The newer Studio layout is preserved. The duplicate review surfaces, decorative glow on the formatting toolbar, fake page choices and misleading controls have been removed or simplified. This is a bounded milestone, not a claim that every possible project or style can already be edited precisely.

Branch: `codex/m1-interactions`. No commit, push or deployment. Original fixtures were not changed. Tests write only to disposable copies. Auth and billing were not changed. The editing engine and preview route received only the changes needed for these controls.

## What works

- Default, Hover, Focus and Pressed select separate styles. Focus writes `focus-visible:`; Pressed writes `active:`. Existing default, responsive and dark-mode classes remain intact.
- Transition properties: none, common properties, colors, opacity, transform and all properties.
- Duration: 75, 100, 150, 200, 300, 500, 700 and 1000 milliseconds.
- Delay: zero plus the same duration presets.
- Easing: linear, ease-in, ease-out and ease-in-out. Easing describes how a transition speeds up or slows down.
- No-op changes keep source bytes untouched and show “This style is already applied.”
- Review has one place to inspect Before and After, Apply or Discard. An outside source edit cancels a stale proposal. Undo restores the saved source snapshot.
- Control selectors retain their native keyboard behavior; arrow keys in a selector do not nudge a selected page element.
- Reduced-motion preferences disable animation in the editor preview. This does not add a reduced-motion rule to the user's source.

Examples:

```text
Before: font-normal md:font-medium dark:font-semibold
Choose Hover → Bold
After:  font-normal md:font-medium dark:font-semibold hover:font-bold

Before: duration-100 hover:duration-500
Choose Default → Duration 200 ms
After:  duration-200 hover:duration-500

Before: duration-100 duration-500
Choose Duration 200 ms
After:  refused; source unchanged
```

## What was cut or corrected

- Fake page switches for pages this canvas does not render.
- Reorder quick actions and the drag handle that implied reliable rearrangement.
- The south resize handle labelled as height even though it changed width.
- Unsupported Height, Overflow, Object fit and Position controls.
- The editor On/Off switch, which implied functionality it did not implement.
- The box diagram suggesting independent margin and padding editing; replaced by the supported all-sides padding control.
- Font names that mapped to unrelated font families; only real sans, serif and mono choices remain.
- Freeform hex entry and unsupported palette choices; supported color presets remain.
- Invented pixel labels on utility presets. A Tailwind utility is a short class name defining a style; its actual size can depend on the project's configuration.

The Source tab now names its actual purpose. The floating formatting bar uses neutral surfaces, modest shadows and restrained active states.

## Safe refusals and deferred work

Conflicting classes in the chosen scope are refused:

> This element has conflicting styles in this state. Resolve the conflict in code before editing.

Existing custom transition values are refused:

> This style uses a custom value that cannot be replaced safely. Nothing was changed.

Conditional class expressions, ambiguous/shared definitions and unsupported source targets remain refused. Combined scopes such as `md:hover:`, bounded tablet edits, custom curve values, transforms, insertion, grouping and component extraction are not part of this milestone. Text and spacing nudges must use Default; state-specific text replacement would invent behavior.

No visual curve editor or arbitrary new CSS values were introduced. Those need their own compilation checks and reviewable source rules.

## Click-through demo

Run from `C:\dev\vibecheck`:

```powershell
node --import tsx test/review-consent.browser.ts --m1 --demo
```

This opens a disposable copy, first runs the real API checks, then reloads Studio for you. Allow the initial compilation to finish. Changes in that browser affect only the copy. Close its browser to remove the copy and stop its server.

1. Select the large heading.
2. Choose Hover in the right inspector. Click B in the floating toolbar.
3. Inspect `hover:font-bold` in the review. Click Discard and confirm the preview reverts.
4. Repeat, then click Apply to code. Choose Default and confirm its original visual weight returns.
5. Click Undo and confirm the applied change is removed.
6. Expand Transitions. Choose Duration → 200 ms. Review, Apply, then Undo.
7. Repeat with Delay and Easing. Confirm no source write happens before Apply.

The ordinary development app is at `http://127.0.0.1:3000/studio`, but use the disposable demo for source-write experiments.

## Evidence and commands

Tests were written before the transition implementation. The initial source test failed because the transition property was unsupported. Source expectations were not changed to make the implementation pass. UI removal assertions were updated to match the explicitly removed features; a cold-start readiness timeout was increased without changing behavior expectations.

```powershell
node --import tsx test/m1-interactions.test.ts
node --import tsx test/apply-review-race.test.ts
node --import tsx test/adapter-webpack-regression.test.ts
node --import tsx test/review-consent.browser.ts --current-studio
node --import tsx test/review-consent.browser.ts --current-live
node --import tsx test/review-consent.browser.ts --m1 --gates --screenshot
```

Results are recorded in the milestone logs. The application typecheck/build operate on the disposable application and the new harness, excluding historical tests, documentation and scratch files. This is not a claim that every historical repository test passes.

| Check | Result |
| --- | --- |
| Source changes, refusals, exact no-op preservation | 17 passed |
| Offered utility compilation in installed Tailwind 4.3.3 | 30 passed |
| Apply race and exact Undo | 3 passed |
| Source adapter regression checks | 3 passed |
| Existing Studio consent checks, mocked responses | 16 passed |
| Existing Studio real API workflow | 7 passed |
| M1 real API workflow, including no-op and removed UI | 26 passed |

That is 72 scoped source/workflow cases and 30 utility compilation checks. Compilation is verified against installed Next.js 16.4.3 and Tailwind 4.3.3. The final gate output is `docs/m1-release-evidence.log`; earlier regression results are `docs/m1-review-final.log` and `docs/m1-live-regression.log`.

## Files and scope of the diff

- `app/studio/page.tsx`: state targeting, transition controls, exact-scope selections, no-op handling, keyboard guards and removal of misleading UI.
- `app/studio/review-controls.module.css`: neutral review/state/transition controls and formatting toolbar, with preview reduced-motion rules.
- `lib/slightnudge/interaction-controls.ts`: preset values and scope-aware selection helper.
- `lib/slightnudge/ast-nudger.ts`: transition class families, conservative conflict/custom-value refusal and exact no-op preservation.
- `app/api/slightnudge/preview/route.ts`: transition property whitelist and specific refusal reason.
- `test/m1-interactions.test.ts`, `test/helpers/m1-interactions-browser.ts`: source and real API cases.
- `test/review-consent.browser.ts`: disposable runner integration and real demo labelling.
- `test/helpers/current-studio-review-browser.ts`: expectations for intentionally removed UI.
- This report and milestone evidence logs.

There were already extensive unrelated working-tree changes before this milestone. A full `git diff` includes those earlier changes; they are not all M1 work. Do not reset or discard them.

## Risks and UNVERIFIED items

1. **The current Studio canvas is still a handcrafted rendering.** Its starting layout and style metadata are not a universal rendering of the selected source. The tests prove exact supported source updates and this canvas's review flow; they do not prove visual parity for arbitrary real projects.
2. **CSS precedence is not universally verified.** A separate stylesheet can override a Tailwind utility. The preview uses a simulated style on this canvas; a class compiling successfully does not prove it wins in the user's actual page. Before general release, verify the resulting computed style in the actual embedded project and refuse edits whose effect cannot be established.
3. **Imported-project inspector integration is UNVERIFIED for the new controls.** This milestone integrates the standalone Studio UI. Run the same interaction suite in the imported-project surface before exposing these controls there.
4. **Focus/Pressed are style previews.** They do not make an otherwise non-focusable heading keyboard-focusable or invent button actions. Real keyboard behavior needs separate checks on focusable elements.
5. **Tailwind v3 behavior for these new controls is UNVERIFIED here.** The current 30 compilation checks use v4.3.3. Run the same suite against a disposable v3 project before claiming support for these controls there.
6. **Custom curves, compound variants and arbitrary stylesheet/import changes are deferred.** The source engine does not guess a safe replacement.
7. A pre-existing build warning about `module.createRequire` in the Tailwind verifier remains. A successful build does not establish that every production verifier configuration works.
8. Undo is scoped to the current Studio session, not a persistent cross-session history.

## Approval gate

Stop here. Run an independent reviewer prompt in a fresh session against this branch, this report and the source diff. Review the precision limits above before typing **approved M1**. M2 has not started.
