# High-fidelity editing qualification

**Passed on 28 October 2026:** 12 real-API browser check groups across Studio and the separate editing window, zero uncaught browser errors, isolated application typecheck exit 0, and production build exit 0. The test used Open React commit `9da36763df216be7840f3c063edcdcaf7862401e`, Next.js 15.1.11 and Tailwind 4.3.3. Mixed Save changes exactly two original component files; Undo restores all 26 tracked application source files byte for byte.

This experiment exercises the original [Open React template](https://github.com/cruip/open-react-template), rather than a reduced test page or a reconstruction of a Framer screenshot. Its upstream source and assets remain in a disposable checkout. No template assets are incorporated into SlightNudge.

The machine-readable result is [high-fidelity-open-react.json](./high-fidelity-open-react.json); the command output is [high-fidelity-open-react.log](./high-fidelity-open-react.log). The JSON `state` and individual checks are authoritative. Application typecheck/build results appear separately in the command output.

Visual evidence: [native page](./high-fidelity-open-react-native.png), [Studio after Undo](./high-fidelity-open-react-studio.png), and [editing window after Undo](./high-fidelity-open-react-window.png). The Studio screenshot uses whole-page Fit after reloading; editing actions are exercised at 75% zoom. The window uses the actual 1200px page viewport for the final comparison.

## What is exercised

- Compare Studio and the separate editing window against the same native application at 375, 768 and 1200 CSS pixels: typography, gradient CSS, loaded workflow images and responsive card geometry.
- Edit the original animated heading at its rendered type size, then change its `md` typography using the project's own size scale. Verify the smaller viewport remains unchanged and the animated gradient/AOS metadata survive.
- Replace a text color with an opacity suffix and change a layered link's underlying fill while preserving its gradient image, size, position and pseudo-element border mask. A fill color does not replace an opaque gradient image; gradient-stop editing is a separate capability.
- Adjust padding in an original nested workflow card. Recover the mixed text/style draft after browser refresh without writing source.
- Save the mixed draft across two original component files, verify native interactions after Save, and use one Undo to restore every tracked application JS/TS/CSS file byte for byte and compare the restored design again.
- Exercise the original video dialog, Escape dismissal, CSS hover spotlight and pointer-following custom properties. Studio's full-document canvas is checked through the native application; the separate editing window additionally tests Browse with the source overlay connected. Studio does not currently have a Browse toggle.

These are semantic and geometry comparisons, not a pixel-perfect screenshot-diff guarantee. Animated images and states remain controlled by the upstream application. Screenshots are retained for visual inspection.

## Fixes driven by the experiment

Color matching previously treated all `bg-[...]` and `text-[...]` utilities as colors, confusing image positioning/sizing and arbitrary typography with color ownership. The editor now distinguishes those properties and replaces palette colors with alpha suffixes in the selected scope. Custom/ambiguous colors and genuine duplicate color conflicts retain an explicit safety refusal.

Style drafts previously rejected AOS's runtime classes as a source mismatch. Adapter protocol 9 recognizes only `aos-init` and `aos-animate` as AOS-owned state. Style preview, replay, draft checks, Undo and saved-source verification preserve the live state of those classes. Unknown runtime classes still fail source verification. This exception does not claim support for arbitrary animation libraries or silently accept dynamic source classes.

Gradient text often uses transparent text paint, which also made an inherited-color editing caret transparent. The selected inline editor now uses a visible accent caret while retaining the original typography and gradient. The rule applies only to SlightNudge's active text editor; the source is not changed.

Existing imported adapters need the reversible remove/enable update and a preview-server restart. The experiment installs the current adapter in its own checkout; user projects are not updated automatically.

The native interaction test also exposed the standalone inspector intercepting its own shadow-toolbar clicks: the retargeted host's closest source marker was the mapped `html` element. Its mouse/click capture handlers now ignore events whose composed path includes the inspector host. A browser regression verifies Inspect off/on, a real page action, and closing the selected-element panel with a source-mapped document ancestor.

Styled block `div` containers are now included in Layers. The workflow card's decorative pseudo-element intercepts direct canvas hit-testing over its inner content; the experiment selects that styled inner container through the real layer tree and edits its padding. Unstyled pass-through wrappers remain omitted. The test does not disable the upstream pseudo-element or force a click through it.

## Boundaries and next experiments

Longer layer trees exposed an embedded-workspace flex sizing bug that could push the bottom dock below the viewport. Explicit minimum-height constraints now keep the workspace, panels and canvas inside their available height. The browser experiment checks that the dock remains visible after editing the long page.

Cold development compilation also exceeded the old 15-second inspection request budget on one run. Read-only inspection now has a 30-second budget and at most one retry for a timeout, network failure, or 502/503/504 response. Denials are not retried. This policy does not apply to Save/Undo. `test/inspection-client.test.ts` checks the bounded retry and refusal behavior.

This is one complex Next.js/Tailwind site on Chromium. It does not prove general Framer project import or universal editing support. The native comparison also includes the development adapter; it is not a separate no-adapter build comparison.

Image components whose sources come from imports/props, data-generated testimonials, reusable component instance overrides, gradient-stop controls, CSS-in-JS and animation timeline editing remain separate work. Image assets and native effects are preserved and checked here; they are not made editable by this qualification.

The padding test edits a static inner container. Styling a widget node that continually rewrites its own inline styles/custom properties can still be refused by draft-integrity checks; this experiment does not claim general runtime-style ownership support.

The next useful expansion is source-aware image/media editing, followed by explicit instance-versus-shared component ownership and motion controls. Each needs original-source tests, visible unsupported states, draft recovery and exact Save/Undo proof before being advertised.

## Reproduce

```powershell
npm run test:high-fidelity
```

The script includes focused color/property-isolation and runtime-class-ownership regressions, the real-site browser experiment, and isolated application typecheck/build gates. Public checkout versions and commit are recorded in the JSON. No account, billing or deployment service credentials are used.
