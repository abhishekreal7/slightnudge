# Pages manifest atomic publication

Product commit: `2cb14ad` (`core: publish pages manifests atomically`). Branch: `codex/fix-canvas-move-scale`. Local only; no merge/tag/push.

## Evidence before the fix

The full baseline at `63152ea` observed `.next/dev/server/pages-manifest.json` with zero bytes while the installed Next DevServer initialized; see `reliability-gate/2026-11-03T10-54-09-847Z-63152ea/server-58515.log`. This was a real startup disk read, separate from the passing selection assertions.

Installed `node_modules/next/dist/build/webpack-config.js:1723` constructs PagesManifestPlugin with `distDir: !dev ? distDir : undefined`. In development, the installed plugin therefore uses its `compilation.emitAsset` branch for pages-manifest.json. Webpack publishes that asset through outputFileSystem.writeFile. Our existing atomic wrapper did not cover this filename.

The new `test/next-pages-manifest-webpack.test.cjs` exercises the installed Next plugin and Webpack emitter in disposable `scratch/pages-manifest-*` directories. It samples publication while the normal target-file truncate window is deliberately widened. Both replacement and cold first publication observed an empty string before the fix. Raw failing outputs: `pages-manifest-before.log`, `pages-manifest-cold-before.log`. No real project was used for truncation experiments.

## Every product hunk

One line in `lib/slightnudge/atomic-build-manifest.cjs`: add `pages-manifest.json` and `server/pages-manifest.json` to the existing atomic publisher's resolved target set, following the existing root/nested app-paths pattern.

This reuses the current exclusive temporary-file creation, complete write, flush, close, and rename with three total attempts. Failure refuses publication; no non-atomic fallback. The filename coverage changes; the writer algorithm does not. The plugin remains wired only to development Webpack in next.config.mjs. Production direct merge/publication behavior in Next is not changed or qualified by this patch.

Source Apply/Undo, AST patching, selection logic, source mapping, bridge commands, API behavior, and real imported-project configuration are unchanged. Pre-existing uncommitted visual changes and next-env.d.ts are preserved separately.

## Focused validation

Seven sequential checks passed after the fix:

| Check | Evidence |
|---|---|
| Installed Next pages-manifest replacement | pages-manifest-after.log |
| Installed Next pages-manifest cold creation | pages-manifest-cold-after.log |
| Atomic visibility and rename refusal | pages-manifest-publication-regression.log |
| Installed Webpack build manifest | pages-manifest-build-regression.log |
| Font manifest | pages-manifest-font-regression.log |
| Loadable manifest | pages-manifest-loadable-regression.log |
| Installed Next app-paths manifest | pages-manifest-app-paths-regression.log |

The new test checks that a reader sees a complete previous/new JSON document, or an absent file before cold publication, never an empty/truncated file. It also checks the exact final routing entries. Existing tests, assertions and limits were not edited.

Fresh browser qualification **PASS** at committed revision `2cb14ad` through `node tools/gate.mjs --workflow selection-full-regression`: all four lab/view warm-ups passed, no invalid manifest reads were observed, and all 30 Full regression cases passed with zero missing/wrong targets and zero page errors. Workflow 77.57s; total 208.56s. Raw evidence: [raw.log](reliability-gate/2026-11-03T12-02-42-990Z-2cb14ad-selection-full-regression/raw.log), [results.json](reliability-gate/2026-11-03T12-02-42-990Z-2cb14ad-selection-full-regression/results.json).

## Not verified

No full-gate rerun or three-round repetition after this fix yet. Preview-readiness timeouts, state/transition response matching, text/recovery failures and multi-view cap overruns remain unresolved. This patch does not prove they share the manifest race as a cause. No production build, customer-project adapter update, deployment, installer, new canvas feature or performance qualification was performed. No secrets/environment files inspected.
