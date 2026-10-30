# Project compatibility checks

Project setup includes a collapsed **Editing compatibility** panel. Opening it shows four capabilities: text/button labels, appearance/layout, responsive styles, and generated/shared content. Each has a clear availability or setup label, followed by the next setup action. Installed versions and router details stay inside a separate collapsed **Project details** section. Inspection reads metadata without installing packages, changing configuration or executing project code.

The installed package version is distinguished from a declared dependency range. A fresh managed clone cannot borrow the editor's own dependencies. Direct `node_modules` paths support junction-based installs; Plug'n'Play and workspace-root resolution need separate support.

| Project shape | Setup behavior | Qualification boundary |
| --- | --- | --- |
| Next.js, App Router, Tailwind 4 | Detect installed framework/compiler and show supported static editing | Generated multi-file qualification plus fresh Next SaaS starter browser checks on Next 15.6.0-canary.59 / Tailwind 4.1.7; tested static targets only |
| Next.js, Tailwind 3 | Detect compiler and explain literal class limits | Fresh NextSaaS Lite editing qualification and EdgeOne translated/shared-source protection checks on Next 14 / Tailwind 3.4; TypeScript config/compiler regressions included |
| Pages Router or mixed routers | Show structure and a limited qualification notice | Metadata detection does not certify full end-to-end editing |
| Next.js without Tailwind | Explain static text editing and protected styles | CSS modules and CSS-in-JS are not rewritten |
| Dependencies not installed | Show setup needed and disable adapter installation; do not present declaration as runtime evidence | Install dependencies and connect a running preview to verify the adapter |
| Next.js before 13 | Disable source-mapping enable action and explain minimum version | Existing adapter API also refuses installation |
| Vite / other frameworks | Explain source editing is unavailable; retain source inspection | This does not add a Vite source adapter |
| Workspace root / custom source root | Explain app-root requirement or unknown page structure | App-root selection/migration remains future work |

The panel deliberately says **Detected**, not “fully supported.” Connecting a running preview still verifies protocol and project identity. Each selected element and style change retains its own source/compiler/render checks.

Next.js development commands omit `--webpack` for Next 14 and early 15, which use Webpack by default and reject that option. Next 15.6 canary and 16+ receive the explicit flag. Adapter protocol 13 adds trusted Next Link mappings and reversible link/button attributes to optimized-image mappings, responsive candidate replay, fit/focal verification, percentage-width verification, Browse-mode keyboard preservation, individual React hydration checks and exact AOS runtime-class preservation. Unknown class changes still fail the source checks. Existing older adapters require the reversible remove/enable update and a development-server restart.

## Verification

- [High-fidelity editing qualification](high-fidelity-qualification.md): Open React on Next 15.1.11 / Tailwind 4.3.3; 12 real-API browser groups in Studio and the editing window, mixed two-file Save/exact Undo, original interactions, application typecheck/build. This preserves imported image assets and effects; it does not add image-component replacement or motion timeline controls.

- `npx tsx test/project-compatibility.test.ts`: metadata matrix for Next 12/14/16, Tailwind 3/4/5, App/Pages/mixed routers, Vite, missing installs, ancestor dependency isolation, malformed manifests and no config execution. These are synthetic metadata fixtures, not newly qualified framework runtimes.
- `npx tsx test/review-consent.browser.ts --compatibility --gates`: real repository-details API and setup UI in a disposable app; keyboard expansion, installed-version copy, CSS-only guidance, older-Next disabled action and Vite guidance; then application typecheck/build.
- Current combined core-editing, compatibility and application-gate evidence: `docs/editing-readiness-current.log`. Screenshot: `docs/project-compatibility.png`.

Fresh public-project results and exact limits are documented in [Real-website qualification](real-website-qualification.md). Older TypeScript adapters now report that an update is needed; remove/enable source mapping preserves original configuration and still refuses to overwrite locally modified generated files. Other framework adapters, Pages Router/monorepo editing qualification and shared/prop-driven source editing remain outside this matrix. [Real-project grouped Save/Undo and recovery](real-multi-file-qualification.md) have now passed separately on two public applications. No production deployment or live account/payment integration is included.

[Native image framing](image-framing.md) and [native image content editing](image-content.md) cover fit/focal styles, replacement and alt text. [Optimized and responsive image editing](advanced-images.md) adds default-imported `next/image` components, literal/static raster sources, source aliases, dimensions/fill preservation, and complete literal native responsive sets. Twenty image cases across local/imported Studio and window views verify real pixels, breakpoint switching, recovery and exact Save/Undo. Custom/prop-driven providers remain protected; the new browser matrix uses a generated Next.js 16.4.3 project, not every public-project provider.

[Component action editing](component-actions.md) adds native/Next Link literal destinations and opening behavior, plus static native-button type and enabled properties. Ownership inspection explains computed providers and source scope. Shared/generated targets, custom navigation handlers and arbitrary component props remain protected. Local/imported Studio and window workflows cover draft recovery, actual Browse behavior, Save and exact Undo on the generated Next.js project.
