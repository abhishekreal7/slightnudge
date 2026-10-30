# Real-website editing qualification

Qualification dates: 27–28 October 2026. Environment: Windows, Node 22.19.0, Chromium, and the current SlightNudge working tree. These checks use original elements in fresh public checkouts with the development source adapter. They do not replace the websites with generated fixtures.

| Repository | Installed runtime | Current result |
| --- | --- | --- |
| [bennyjoel/nextjs-saas-starter-lite](real-project-current-2.json) | Next 14.2.35 / Tailwind 3.4.19 | Passed: canvas, text, draft refresh, movement, responsive style editing, source Save/exact Undo, and separate window |
| [EdgeOneDev/saas-starter](real-project-current-3.json) | Next 14.0.4 / Tailwind 3.4.17 | Passed restricted case: viewports, separate window, explicit prop/dynamic-class refusals, intact source and position; shared-component source edits are not claimed |
| [nextjs/saas-starter](real-project-current-next-saas.json) | Next 15.6.0-canary.59 / Tailwind 4.1.7 | Passed: TypeScript config, canvas, text/draft refresh, movement, responsive style editing, source Save/exact Undo, and separate window |

Exact upstream commits, targets, breakpoint values, browser errors, and outcomes are recorded in `real-project-current-2.json`, `real-project-current-3.json`, and `real-project-current-next-saas.json`. Only reports with `state: passed` count as completed qualification. Screenshots use the same filename stems.

A separate [high-fidelity Open React qualification](high-fidelity-qualification.md) now passes 12 real-API groups in both editor views: original responsive design, animated gradient typography, layered button styles, covered container selection through Layers, mixed draft refresh, two-file Save, native dialogs/hover effects, and exact source Undo. Its application typecheck and production build also pass. The report retains explicit image/component/motion editing limits.

## What is exercised

- One cross-origin canvas with stable full-page measurement and the site's original layout.
- Physical selection of visible original elements. Repeated source markers are inventoried as unqualified shared-component targets, rather than counted as successful edits.
- Literal text editing at its original computed size, draft restoration after refreshing Studio, source Save, and byte-exact Undo across the tracked application JS/TS/CSS snapshot.
- A 12-screen-pixel Move at 50% zoom producing a 24-page-pixel movement, followed by Save/exact Undo.
- Breakpoints discovered through the actual application API using the imported project's compiler. A breakpoint style edit is checked above and below its boundary, then saved and undone.
- Native preview widths of 375, 768 and 1200 pixels.
- Separate-window document mode, with either supported text Save/Undo or an explicit refusal before entering inline editing.
- No uncaught browser exceptions and no persistent changes to the application source after successful Undo.

Public installations use `--ignore-scripts --legacy-peer-deps --prefer-offline`. Environment and credential files are excluded, and host service credentials are not forwarded. The Next SaaS starter receives nonfunctional loopback PostgreSQL and placeholder Stripe/auth configuration solely to satisfy module validation; no service operations or customer accounts are tested. Tests run sequentially because concurrent Next servers and browsers exhausted the available local memory. These are development-preview checks of the tested pages, not production deployment checks.

## Fixes found by this work

1. **Multiline JSX after Undo.** Source indentation and HTML entities were being compared directly with rendered DOM text. Render patches now use JSX compiler text semantics; Undo still restores the exact original source bytes.
2. **Generated text entering inline editing.** A read-only source inspection now runs before opening the editor. Prop-driven and translated text receives its specific explanation before contenteditable starts. Local playground targets can still resolve through their stable source IDs when legacy column markers are absent.
3. **Tailwind 3 configuration loading.** Style compilation and breakpoint discovery now use the project's own Tailwind config loader, including TypeScript/ESM configuration. Broken configuration is refused instead of silently compiling against the default theme.
4. **TypeScript Next configuration.** Generated TypeScript wrappers use a static import compatible with Next's actual config loader, preserve the original webpack hook, and exclude generated glue from TypeScript checking. Older TypeScript adapters are flagged for a reversible remove/enable update. The adapter still adds no instrumentation rules to production webpack builds.
5. **Revision-error feedback.** A saved-source revision verification failure retains its useful error instead of later being replaced by a generic connection timeout.

## Reproduction and evidence

Run `npm run test:real-projects` for the three sequential public-project browser checks. The test reads the installed Next CLI's available options to select Webpack, including canary versions which changed bundler defaults before Next 16.

Focused regressions:

- `node --import tsx test/jsx-text.test.ts`
- `node --import tsx test/continuous-draft.test.ts`
- `node --import tsx test/button-editing.test.ts`
- `node --import tsx test/source-rendered-bridge.test.ts`
- `node --import tsx test/responsive-tailwind3.test.ts`
- `node --import tsx test/adapter-webpack-regression.test.ts`

Application typecheck and production build passed; evidence is in `real-project-current-gates.log`. All four local/imported-canvas browser regression groups passed with the real API and disposable source copies, recorded in `real-project-local-regression-and-gates.log`. The isolated application gate excludes historical tests, archived evidence scripts and scratch experiments; a root-wide TypeScript run still reports existing errors in those files, recorded in `real-project-current-types.log`.

## Remaining boundaries

This does not certify every element or route of these projects. Translation dictionaries, prop-driven content, shared repeated component editing, arbitrary CSS/CSS-in-JS rewrites, image editing, Pages Router projects, monorepo roots, non-Webpack previews and other framework adapters retain their existing limits. Deployment/authentication/payment integrations are not claimed by this matrix. The follow-up [real-project multi-file qualification](real-multi-file-qualification.md) now verifies grouped Save/Undo, conflict protection and interrupted-operation recovery on two original public applications; those results are separate from this earlier single-file matrix.

Cruip and NIM were excluded by the qualification harness's root-license-file inventory rule before editing tests ran; those exclusions are not evidence of editor failures.
