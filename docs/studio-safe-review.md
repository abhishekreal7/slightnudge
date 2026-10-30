# Studio safety and M0 measurement

Date: 24 October 2026 (India). Branch: `codex/studio-safe-review`. Local work only; no commit, push, or deployment.

## Founder summary

The current Studio keeps its existing interface and corner/resize design. A proposal now holds onto its original element, waits for server acceptance before changing the canvas, shows Before/After and its source file, and requires an explicit Apply or Discard. Discard restores a saved copy of the original visual state. Undo restores an edit made in this Studio session only after the server confirms success. An outside source edit cancels a pending proposal instead of overwriting the file.

The measurements recorded 90 distinct DOM selections: **64 allowed, 26 refused, zero wrong targets detected in this sample**. This covers two public projects and a fresh controlled SaaS app. The first public repository has no LICENSE file and was skipped under your rule; it is not counted as tested. These results measure one font-weight operation. They do not establish that every control or every project is supported.

A source-mapping adapter is the development tool that connects a visible element to its code location. The measurements found that the adapter's generated configuration called itself repeatedly and crashed Next.js. A failing regression reproduced it; the fix captures the project's existing build hook before replacing it. The compatible copies then rendered and reported their source locations through the embedded bridge, which is the message connection between the project preview and the editor.

**Review status: the milestone checks pass; ready for independent review.** Run the reviewer prompt in a fresh session before approving. Further feature milestones remain stopped at this review boundary.

## What works, and what refuses

- Preview is pinned to one element. Selection changes, Escape, additional edits, drag/resize starts and Undo cannot replace a pending or in-flight proposal.
- Source inspection checks the expected tag, line and column before requesting a preview. Text that comes from a prop (a value passed into a component) refuses direct text editing.
- The canvas receives the full validated class list, preserving unrelated styles. Text drafts remain separate until a preview succeeds. Inspector text is submitted on Enter or leaving the field, rather than on every keystroke.
- Review says **Not saved to source**, names the file, and shows Before and After. Apply runs once even when the duplicate existing Apply buttons are clicked quickly. A generic failure keeps the proposal available. A `SOURCE_CHANGED` response restores the visual snapshot, clears the proposal and clears selection.
- Discard waits for server acknowledgement and restores the original element, text and local order. A failed Discard keeps review available.
- Successful Undo restores the saved visual state. Failed Undo reports failure and leaves the applied visual state intact. History from earlier browser sessions is refused in this independent canvas because it cannot reconstruct those visual states safely.
- Reorder refuses: the handcrafted canvas order does not yet correspond to all actual source siblings. Non-base breakpoint/state edits refuse because this canvas cannot yet verify their appearance precisely. Fields without a source operation also refuse.
- Studio identifies its displayed page as **Product Overview**, the source actually used by its canvas. Clicking other page names no longer merely changes the label while leaving the same sample on screen. The user is directed to Workspace for imported projects.

## Compatibility and measurements

Versions below are exact installed versions from each disposable run, except the skipped repository, where only the declared ranges are known. All eligible projects use Next.js and Tailwind; Vite source mapping is unsupported.

| Project | Next.js | Tailwind | Original lockfile | Installed lockfile | Routes | Adapter / render | Allowed | Refused | Wrong target |
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: |
| ShadcnDeck/chatdeck-shadcn-saas-landing-page-template | Not installed; declares `^16.0.3` | Not installed; declares `^4` | pnpm-lock.yaml | Not installed | app/ | Skipped: no LICENSE | — | — | — |
| bennyjoel/nextjs-saas-starter-lite | 14.2.35 | 3.4.19 | None | package-lock.json generated | src/app/ | Rendered without environment files; source markers and embedded messages verified | 28 | 2 | 0 |
| EdgeOneDev/saas-starter | 14.0.4 | 3.4.17 | package-lock.json | package-lock.json | src/app/ | Rendered without environment files; source markers and embedded messages verified | 11 | 19 | 0 |
| Fresh controlled SaaS sample | 16.4.3 | 4.3.3 | None | package-lock.json generated | app/ | Rendered without environment files; source markers and embedded messages verified | 25 | 5 | 0 |

The sample used the versions reported by the npm registry at run time, including React 19.3.1. It contains separate Hero, Features, Pricing, Testimonials, FAQ and Footer components; prop-fed text; a list rendered with `map()`; and a conditional `cn()` class. `map()` creates repeated elements from a list. `cn()` combines class strings. Repeated or conditional styles were refused. Prop-fed paragraphs could receive a static style edit while their text-editing capability was explicitly refused; “allowed” in the table concerns the font-weight operation only.

### Method and limits

Each rendered project received 30 different target elements using the same document-order sampling policy, spread across the landing page. Headings, paragraphs, sections, containers, links, buttons and list structures were eligible. Development overlays and tiny accessibility-only nodes were excluded. The target was scrolled into view and a DOM click was dispatched through the actual installed embedded bridge. All 90 selections verified the bridge's file, line, column and tag against the selected DOM marker.

The existing inspection logic then accepted or refused the element. Accepted elements received a **dry run**, which calculates a change without saving it. An independent syntax-tree comparison checked that the change stayed within the selected JSX class attribute. A syntax tree is the structured representation of code. Original application source bytes were checked afterward. No Apply was issued to these imported project copies.

This is a browser-to-source and edit-engine benchmark, not a complete imported Studio review-and-apply test. It uses dispatched DOM clicks, not physical mouse hit-testing. It covers landing pages, not all routes, actions, responsive sizes or styling systems. It is not the older fixed 30-selector control-lab suite. That narrower scope is deliberate and recorded here rather than overstating coverage.

The initial benchmark accidentally included development overlay nodes. Those counts were discarded and replaced by the embedded, filtered measurements above. The initial adapter crash and intermediate attempts are historical evidence, not successful acceptance results. The authoritative rows are in `studio-real-project-results.json`.

### Top five refusal reasons

- 7: can't edit this safely: class built from a condition (call expression)
- 6: I can't confirm which element this is. Nothing was changed.
- 5: This element repeats from a list, so one edit would change every copy. Nothing was changed.
- 4: can't edit this safely: no className attribute found
- 2: can't edit this safely: class built from a variable

Every detected wrong target: **none in these 90 measurements**. This does not prove that wrong targets are impossible outside this sample.

## Validation and safe demo

All **29 scoped checks passed**: 16 current Studio browser cases using controlled API responses, 7 workflows using the real backend and copied source, 3 source-race/Undo checks, and 3 adapter checks. Application typecheck and production build both exited 0 in a disposable copy. The copy includes the new harness but excludes historical tests, evidence archives and scratch files; this is not a claim that every historical test in the existing dirty tree passes.

`studio-safe-review-gates.log` records the 16 browser cases and both compilation gates. `studio-safe-review-live.log` records the 7 real-backend cases. The source-race and adapter commands below each reported 3 passing cases. The production build retains the existing Tailwind verifier warning described under risks.

Commands below run tests in disposable copies, never against the original fixtures:

```powershell
node --import tsx test/review-consent.browser.ts --current-studio --gates
node --import tsx test/review-consent.browser.ts --current-live
node --import tsx test/apply-review-race.test.ts
node --import tsx test/adapter-webpack-regression.test.ts
node --import tsx test/real-project-benchmark.ts
```

The original Studio regression fails with `--current-studio --current-baseline` because Escape and another selection detach an in-flight proposal from the original element. The adapter regression failed with a stack overflow before its fix. Expected behavior was preserved; selector and timing corrections wait for hydration, server responses and completed state updates rather than changing expected source values.

To open the **current Studio with real writes confined to a disposable copy**:

```powershell
node --import tsx test/review-consent.browser.ts --current-live --demo
```

Wait for “Current Studio demo ready.” The command opens its own browser. Select the headline, click **B** (Toggle bold), read Before/After, try selecting another element, then click Discard. Repeat and choose Apply to code, then Undo. Double-click the headline or choose Edit text to edit literal text. To observe outside-edit cancellation, the automated real-backend test performs that case in the copy. Close the demo browser to delete its temporary copy. The normal server remains available at `http://localhost:3000/studio`; use the disposable demo for source-writing evaluation.

## Files and diff summary

This continuation changes:

- `app/studio/page.tsx`: target and operation guards, source preflight, deferred visual mutations, snapshot restoration, truthful review and page labels, safer draft text and notifications. The shell and resize-handle markup are preserved.
- `lib/slightnudge/client.ts`: preserve the server's `SOURCE_CHANGED` error code.
- `lib/slightnudge/next-source-adapter.ts`: prevent recursive configuration calls; preserve the existing build hook.
- `test/review-consent.browser.ts` and `test/helpers/current-studio-*.ts`: isolated current-interface checks, actual backend checks, and safe interactive demo.
- `test/helpers/live-review-browser.ts`: point the older shared-overlay check at `/fixtures/1`, where that UI actually exists.
- `test/adapter-webpack-regression.test.ts`: adapter regression on a fresh throwaway configuration.
- `test/real-project-benchmark.ts` and `test/helpers/create-saas-sample.ts`: public clones, sample generator, embedded mapping measurement, source checks and cleanup.
- This report, the benchmark JSON/logs, compilation log, and status corrections in the older foundation/product-plan documents.

Earlier shared-overlay, imported-screen and source-race fixes remain in the dirty tree. Marketing CSS/page changes and other historical evidence were already present and are not attributed to this continuation. Original fixtures, auth, billing and API route files have no changes from this continuation. No commits, pushes or deployments were made.

## Risks, unsupported behavior and UNVERIFIED items

1. **UNVERIFIED:** every control, device size and gesture in the independent Studio canvas. The verified flows are listed above. The canvas still uses independent metadata; source preflight refuses stale or mismatched locations. A source-rendered canvas should be integrated inside this existing design before broad capability claims.
2. **UNVERIFIED:** end-to-end imported Studio Apply/Undo against all three public projects. The benchmark verifies embedded mapping plus dry runs; the real Apply/Undo suite verifies the current sample Studio on copied source.
3. **UNVERIFIED:** complete production Tailwind verification. Build retains the existing `module.createRequire failed parsing argument` warning in `tailwind-verifier.ts`. The real development workflow validates a Tailwind class; production runtime compilation needs a dedicated check.
4. **UNVERIFIED:** arbitrary external filesystem writers racing the final rename. The existing second source check catches the reproduced edit arriving during validation, but a separate read and rename are not an operating-system-wide lock.
5. **UNVERIFIED:** persisted visual history across browser sessions, arbitrary multi-file operations, custom Next.js configurations, Turbopack, CSS modules, styled components, shared definitions, and computed/fetched text. These measurements do not grant support for them.
6. **Vite unsupported; effort L.** Add framework detection, a Vite development JSX transform that supplies exact source positions, the existing embedded message contract, and tests on distinct Vite projects covering repeated components, lists, hot reload, file moves and stale source. Reuse safe source-edit logic after mapping is verified. Do not merely attach a Next.js adapter to Vite. No Vite implementation was added.
7. Tablet-only bounded styles, states, safe source-aligned reordering and multi-file insert/extract remain later milestones. The current canvas refuses unsupported source operations explicitly.

## Cleanup and Docker

The public clones and generated benchmark apps were deleted after measurement; there are no blocked clone deletion paths. The interactive demo copy remains only while its browser is open and is removed automatically on close. If cleanup fails, the harness prints its exact path for manual deletion.

Docker CLI was present but the engine was initially stopped. `docker desktop start` succeeded, and `docker version --format '{{.Server.Version}}'` reported engine **29.8.2**. The measurements ran directly with Next.js; Docker-specific imported previews remain unverified.

No environment or secret files were read, filled or created. Public clones used filtered checkout, dependency installation disabled lifecycle scripts, and child processes received a small environment allowlist. Embedded measurement blocked requests to the running workspace on port 3000. No `git reset --hard`, commits, pushes or deployment were used.

## Selection record

Full source positions, class lists, DOM rectangles, text capabilities and refusal reasons are retained in `studio-real-project-results.json`. The readable record follows. “Allowed” means the tested static style operation passed inspection and stayed within the intended source attribute.

### https://github.com/bennyjoel/nextjs-saas-starter-lite

| # | Target text/type | Source | Result | Reason |
| ---: | --- | --- | --- | --- |
| 1 | div: ⚡ NextSaaS LiteGitHubGet Pro ($49)✨ Open Source Next.js | src/app/page.tsx:5:5 | allowed |  |
| 2 | div: ⚡ NextSaaS LiteGitHubGet Pro ($49) | src/app/page.tsx:8:9 | allowed |  |
| 3 | div: ⚡ NextSaaS Lite | src/app/page.tsx:9:11 | allowed |  |
| 4 | span: ⚡ | src/app/page.tsx:10:13 | allowed |  |
| 5 | span: Lite | src/app/page.tsx:10:71 | allowed |  |
| 6 | a: GitHub | src/app/page.tsx:13:13 | allowed |  |
| 7 | a: Get Pro ($49) | src/app/page.tsx:21:13 | allowed |  |
| 8 | div: ✨ Open Source Next.js 14 BoilerplateLaunch Your Next Sa | src/app/page.tsx:35:9 | allowed |  |
| 9 | div: ✨ Open Source Next.js 14 Boilerplate | src/app/page.tsx:36:11 | allowed |  |
| 10 | span: ✨ Open Source Next.js 14 Boilerplate | src/app/page.tsx:37:13 | refused | can't edit this safely: no className attribute found |
| 11 | span: In Hours, Not Weeks. | src/app/page.tsx:41:13 | allowed |  |
| 12 | p: A clean, modular starter built on Next.js 14 App Router | src/app/page.tsx:45:11 | allowed |  |
| 13 | div: Upgrade to Pro — Full Turnkey ($49) →Star on GitHub ⭐ | src/app/page.tsx:48:11 | allowed |  |
| 14 | a: Upgrade to Pro — Full Turnkey ($49) → | src/app/page.tsx:49:13 | allowed |  |
| 15 | a: Star on GitHub ⭐ | src/app/page.tsx:57:13 | allowed |  |
| 16 | div: ⚡Next.js 14 App RouterOptimized for React Server Compon | src/app/page.tsx:70:11 | allowed |  |
| 17 | div: ⚡ | src/app/page.tsx:71:13 | allowed |  |
| 18 | h3: Next.js 14 App Router | src/app/page.tsx:72:13 | allowed |  |
| 19 | p: Optimized for React Server Components, server actions,  | src/app/page.tsx:73:13 | allowed |  |
| 20 | div: 🎨Tailwind CSS ReadyModern dark-mode design system with  | src/app/page.tsx:77:11 | allowed |  |
| 21 | h3: Tailwind CSS Ready | src/app/page.tsx:79:13 | allowed |  |
| 22 | p: Modern dark-mode design system with responsive typograp | src/app/page.tsx:80:13 | allowed |  |
| 23 | div: 🛡️Strict TypeScript100% type-safe codebase with strict  | src/app/page.tsx:84:11 | allowed |  |
| 24 | div: 🛡️ | src/app/page.tsx:85:13 | allowed |  |
| 25 | h3: Strict TypeScript | src/app/page.tsx:86:13 | allowed |  |
| 26 | div: Need Stripe, NextAuth & Database Integration?The Pro ve | src/app/page.tsx:94:9 | allowed |  |
| 27 | h2: Need Stripe, NextAuth & Database Integration? | src/app/page.tsx:95:11 | allowed |  |
| 28 | p: The Pro version includes complete Stripe webhook handli | src/app/page.tsx:98:11 | allowed |  |
| 29 | a: Get SaaS Launch Kit Pro for $49 | src/app/page.tsx:101:11 | allowed |  |
| 30 | p: © 2026 NextSaaS Lite. Released under the MIT License by | src/app/page.tsx:114:9 | refused | can't edit this safely: no className attribute found |

### https://github.com/EdgeOneDev/saas-starter

| # | Target text/type | Source | Result | Reason |
| ---: | --- | --- | --- | --- |
| 1 | div: SaaS StarterHomeAIPricingBlogCasesContactBlocksEnglishS | src/components/layout/layout.tsx:18:5 | refused | can't edit this safely: class built from a variable |
| 2 | a: Cases | src/components/layout/header.tsx:72:11 | refused | I can't confirm which element this is. Nothing was changed. |
| 3 | a: Sign Up | src/components/layout/header.tsx:132:15 | refused | I can't confirm which element this is. Nothing was changed. |
| 4 | div:  | src/components/sections/hero.tsx:89:9 | allowed |  |
| 5 | span: Product | src/components/sections/hero.tsx:112:15 | refused | I can't confirm which element this is. Nothing was changed. |
| 6 | div: 1 | src/components/sections/hero.tsx:150:19 | refused | This element repeats from a list, so one edit would change every copy. Nothing was changed. |
| 7 | div:  | src/components/sections/hero.tsx:172:9 | refused | can't edit this safely: dynamic className |
| 8 | div:  | src/components/sections/hero.tsx:183:19 | allowed |  |
| 9 | span: Ship Fast | src/components/layout/section-layout.tsx:124:19 | refused | I can't confirm which element this is. Nothing was changed. |
| 10 | div: Secure by DefaultAuthentication, authorization, and sec | src/components/ui/card.tsx:8:3 | refused | can't edit this safely: class built from a condition (call expression) |
| 11 | p: Easy theming system with light/dark mode support. Make  | src/components/ui/card.tsx:50:3 | refused | can't edit this safely: class built from a condition (call expression) |
| 12 | h3: SEO Optimized | src/components/ui/card.tsx:35:3 | refused | can't edit this safely: class built from a condition (call expression) |
| 13 | div: And much more...→30+ Components Ready to Use | src/components/sections/features.tsx:30:5 | allowed |  |
| 14 | span: Pricing | src/components/layout/section-layout.tsx:124:19 | refused | I can't confirm which element this is. Nothing was changed. |
| 15 | div: "This template saved us months of development time. We  | src/components/ui/testimonials-grid.tsx:85:5 | refused | can't edit this safely: class built from a variable |
| 16 | div: Founder at TechFlow | src/components/ui/testimonials-grid.tsx:47:13 | allowed |  |
| 17 | div: "As a solo developer, this template gave me everything  | src/components/ui/card.tsx:8:3 | refused | can't edit this safely: class built from a condition (call expression) |
| 18 | div: "The authentication and payment integration worked flaw | src/components/ui/card.tsx:62:3 | refused | can't edit this safely: class built from a condition (call expression) |
| 19 | div:  | src/components/ui/testimonials-grid.tsx:19:9 | allowed |  |
| 20 | div: Alex ThompsonFull-stack Developer | src/components/ui/testimonials-grid.tsx:31:9 | allowed |  |
| 21 | div: 4.9/5Average Rating | src/components/ui/testimonials-grid.tsx:59:9 | refused | can't edit this safely: no className attribute found |
| 22 | span: Frequently Asked Questions | src/components/layout/section-layout.tsx:124:19 | refused | can't edit this safely: no className attribute found |
| 23 | span: Do I need to pay monthly fees? | src/components/ui/faq-list.tsx:29:9 | allowed |  |
| 24 | div: Do you provide support and updates? | src/components/ui/faq-list.tsx:24:5 | allowed |  |
| 25 | div: Still have questions? We're here to help!Contact Suppor | src/components/sections/faq.tsx:29:71 | allowed |  |
| 26 | div: Instant Download30-Day Money BackLifetime Updates | src/components/sections/cta-section.tsx:168:11 | refused | can't edit this safely: component used in several places |
| 27 | footer: SaaS StarterThe complete SaaS starter template to help  | src/components/layout/footer.tsx:51:5 | allowed |  |
| 28 | a:  | src/components/layout/footer.tsx:66:19 | refused | This element repeats from a list, so one edit would change every copy. Nothing was changed. |
| 29 | a: Case Studies | src/components/layout/footer.tsx:87:19 | refused | I can't confirm which element this is. Nothing was changed. |
| 30 | p: Made with ❤️ for developers worldwide | src/components/layout/footer.tsx:103:11 | allowed |  |

### generated-latest-next-tailwind-saas

| # | Target text/type | Source | Result | Reason |
| ---: | --- | --- | --- | --- |
| 1 | section: NorthstarPricingA calmer way to buildMake room for your | components/Hero.tsx:1:96 | allowed |  |
| 2 | nav: NorthstarPricing | components/Hero.tsx:1:133 | allowed |  |
| 3 | a: Pricing | components/Hero.tsx:1:228 | allowed |  |
| 4 | h1: Make room for your next idea. | components/Hero.tsx:1:354 | allowed |  |
| 5 | a: Explore the workspace | components/Hero.tsx:1:465 | allowed |  |
| 6 | p: Made for your everyday work | components/Features.tsx:2:93 | allowed |  |
| 7 | div: Projects with clarityKeep the next step in view.One sha | components/Features.tsx:2:240 | allowed |  |
| 8 | h3: Projects with clarity | components/Features.tsx:2:416 | refused | This element repeats from a list, so one edit would change every copy. Nothing was changed. |
| 9 | article: One shared workspaceBring people and plans together. | components/Features.tsx:2:311 | refused | can't edit this safely: class built from a condition (call expression) |
| 10 | p: Bring people and plans together. | components/Features.tsx:2:473 | refused | This element repeats from a list, so one edit would change every copy. Nothing was changed. |
| 11 | article: Room to focusBuild without the busywork. | components/Features.tsx:2:311 | refused | can't edit this safely: class built from a condition (call expression) |
| 12 | p: Build without the busywork. | components/Features.tsx:2:473 | refused | This element repeats from a list, so one edit would change every copy. Nothing was changed. |
| 13 | section: Simple plansStart small. Grow together.PersonalFreeA qu | components/Pricing.tsx:1:42 | allowed |  |
| 14 | h2: Start small. Grow together. | components/Pricing.tsx:1:147 | allowed |  |
| 15 | article: PersonalFreeA quiet place for your ideas.See what is in | components/Pricing.tsx:1:271 | allowed |  |
| 16 | p: Free | components/Pricing.tsx:1:365 | allowed |  |
| 17 | a: See what is included | components/Pricing.tsx:1:480 | allowed |  |
| 18 | h3: Team | components/Pricing.tsx:1:631 | allowed |  |
| 19 | p: Per person, per month. | components/Pricing.tsx:1:724 | allowed |  |
| 20 | section: From people who buildA little more space to think.We fi | components/Testimonials.tsx:1:47 | allowed |  |
| 21 | p: From people who build | components/Testimonials.tsx:1:83 | allowed |  |
| 22 | p: We finally know what matters this week. | components/Testimonials.tsx:1:280 | allowed |  |
| 23 | p: Illustrative testimonial for this disposable test appli | components/Testimonials.tsx:1:435 | allowed |  |
| 24 | h2: A few useful answers. | components/FAQ.tsx:1:83 | allowed |  |
| 25 | p: Yes. Start with a personal workspace and invite people  | components/FAQ.tsx:1:268 | allowed |  |
| 26 | p: Your content belongs to you. | components/FAQ.tsx:1:510 | allowed |  |
| 27 | div: NorthstarFor the work that matters. | components/Footer.tsx:1:97 | allowed |  |
| 28 | p: For the work that matters. | components/Footer.tsx:1:175 | allowed |  |
| 29 | a: Features | components/Footer.tsx:1:276 | allowed |  |
| 30 | a: Questions | components/Footer.tsx:1:378 | allowed |  |

