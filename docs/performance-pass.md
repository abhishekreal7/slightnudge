# Performance pass — 5 November 2026

## Changes

- `lib/slightnudge/imported-canvas-runtime.ts`: cache pinned CSS declarations by declaration identity, serialized content, and viewport width. Mutation and resize observation remain active. CSSOM edits, inline edits, newly inserted stylesheets, priorities, and width-dependent viewport units continue to update. Weak keys allow removed declarations to be collected.
- `app/layout.tsx`: read request headers only for the development-only local-editor authorization check. Production no longer makes every public page dynamic through the root layout. Production still omits the local editor token; development retains the host check.
- Browser harness: include the existing uncommitted recovery/resize runtime dependencies in disposable copies. Add `--performance-baseline` to compare the two changed runtime files against Git HEAD without altering working source.
- Browser navigation: request canonical `/editor` Fit/Full views, opening the inspector for tests that assume it is initially visible. The core Full-view test still opens it through its existing toggle action. Legacy Studio URLs now redirect to Full view with no inspector, violating the old tests' setup assumptions. Assertions and time limits are unchanged.

## Measured result

Real Chromium, synthetic document with 2,000 CSS rules, 30 style updates:

| Measurement | Git HEAD runtime | Updated runtime |
| --- | ---: | ---: |
| CSS property reads | 360,090 | 30 |
| Aggregate animation-frame callback work | 267 ms | 99 ms |
| Wall time including frame waits | 979 ms | 989 ms |

The sampled callback work fell about 63%. This is a focused synthetic comparison, not an end-to-end FPS, interaction-latency, or whole-product speed claim. Frame waits dominate wall time. Reproduce with `npx tsx test/canvas-performance.test.ts --baseline` and `npx tsx test/canvas-performance.test.ts`. The baseline is the runtime at Git HEAD at execution time.

The production build confirms public pages including Home, Guide, Pricing, and Terms are prerendered. Dynamic editor and account routes remain dynamic where their own request dependencies require it. No network-latency improvement has been claimed from a synthetic build result.

## Validation

- PASS: focused browser performance test, including live CSSOM/inline edits, width-dependent units, newly inserted stylesheet and `!important` preservation.
- PASS: existing imported canvas runtime test.
- PASS: application typecheck and production build in a disposable copy.
- PASS: production HTTP/security smoke (no local source token, filesystem editor unavailable, authenticated boundaries enforced).
- PASS: production boundaries, studio recovery, resize anchoring, canonical editor routing, and 40 source-rendered bridge cases.
- PASS: complete core workflows in both Fit and Full views (text/button/icon, alignment/fill, width/padding, keyboard ownership, Move/Undo/Redo, grid, section ordering, responsive isolation, grouped Save/exact Undo). Both use real APIs and disposable source copies. See `performance-core-final.log`.
- Imported browser workflow: sizing, pinned viewport units, dynamic content growth/removal, cross-origin reload, and Fit positioning passed. Inline text entry timed out at `test/helpers/imported-canvas-browser.ts:67` in both the changed runtime and the Git HEAD runtime using the same corrected navigation. This is an unresolved baseline failure, not a complete imported-workflow pass. See `performance-imported-current.log` and `performance-imported-current-baseline.log`.

Initial legacy-navigation runs were not green. The imported test's iframe-height timeout reproduced without these changes. The baseline core test timed out looking for Width in a closed inspector; the first changed run timed out earlier waiting for inspection. Neither initial core run established a complete regression pass. These failures are retained in the `performance-*-baseline.log` and `performance-*-verified.log` evidence.

Build output includes warnings from the unchanged Tailwind verifier's dynamic `createRequire` use. They did not fail the build. Existing fixture and `next-env.d.ts` modifications were not reverted. No deployment or commit was performed.
