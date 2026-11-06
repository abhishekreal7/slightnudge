# Reliability baseline — stopped before Part B

Branch: `security/hardening`. Valid baseline run: **94a0508** (application code unchanged from 81d2b45 / 58618d0). No push, fast-forward, release tag or defect-fix branch was made.

**Result: FAIL / incomplete.** The Full regression suite passed 30/30. The Full overfit suite then raised a hydration page error before case 1. The gate stopped immediately. Fit selection, shared-instance and domain workflows were not run in this baseline. An isolated passing comparison is not a replacement for those missing gate results.

## Gate implementation

Added [tools/gate.mjs](C:/dev/vibecheck/tools/gate.mjs) and the `gate` npm script in [package.json](C:/dev/vibecheck/package.json). Run from the project folder with `npm run gate`.

The coordinator reuses existing iframe-aware `m0-*.reliability.test.ts` commands, the existing four-case shared-instance security driver and the existing review-consent browser commands. No test, selector, expected-result list or test limit was edited. It creates an isolated detached worktree, uses copied temporary lab projects, generates their adapter with the product revision being tested, starts fresh loopback editor/lab servers, warms both labs in Full/Fit, then runs commands sequentially. It stops the selection servers before the domain drivers start their own isolated servers. All explicit outputs and temporary projects are under this project folder; no real project state is copied into the test editor.

Warm-up alone has a **180-second limit per lab/view**, including compiler startup and the same iframe-document request. The existing 30-second selection readiness wait and each workflow's own waits remain unchanged. Warm-up is read-only setup, not a new test. The browser observer adds only page-error reporting/stop detection; it does not rewrite URLs, change locators, inject source patches, suppress errors or alter expected values.

The manifest includes movement, state/transitions, local/imported responsive, appearance/layout, local/imported advanced images, local/imported component actions, icon replacement/properties, section order, container move, inline text, history and recovery. Existing recovery/action fault-injection workflows are labelled **REAL + MOCKED**, and any command reporting mocked API is labelled MOCKED. These labels do not claim that unrun commands passed. See the exact [command plan](C:/dev/vibecheck/docs/reliability-gate/2026-11-01T16-08-11-579Z-94a0508/plan.json).

Local infrastructure commits:

- `a4ff43a` — `test: add sequential reliability baseline gate`.
- `94a0508` — `fix(gate): use a file URL for the Windows observer preload`.

The first launch at a4ff43a failed in coordinator setup because Node's Windows ESM preload needed a file URL. No server or suite started in that attempt. Its [raw output](C:/dev/vibecheck/docs/reliability-gate/2026-11-01T16-07-00-984Z-a4ff43a/raw.log) is retained. The two-line runner-only correction was committed before the valid baseline attempt. This is not hidden as a product test pass.

## Baseline output

| Workflow | API | Result | Seconds |
|---|---|---|---:|
| Warm-up Control Full | REAL | PASS | 124.27 |
| Warm-up Control Fit | REAL | PASS | 14.50 |
| Warm-up Overfit Full | REAL | PASS | 20.04 |
| Warm-up Overfit Fit | REAL | PASS | 3.60 |
| Selection Full regression | REAL | PASS, 30/30 | 62.12 |
| Selection Full overfit | REAL | FAIL before case 1 | 3.82 |
| Selection Fit regression | REAL | NOT RUN | 0 |
| Selection Fit overfit | REAL | NOT RUN | 0 |
| Shared-instance four workflows | REAL | NOT RUN | 0 |
| Movement | REAL | NOT RUN | 0 |
| State and transitions | REAL | NOT RUN | 0 |
| Responsive local / imported | REAL | NOT RUN | 0 |
| Appearance/layout | REAL | NOT RUN | 0 |
| Advanced images local / imported | REAL | NOT RUN | 0 |
| Component actions local / imported | REAL + MOCKED failure injection | NOT RUN | 0 |
| Icon replacement / properties | REAL | NOT RUN | 0 |
| Section order | REAL | NOT RUN | 0 |
| Container move | REAL | NOT RUN | 0 |
| Text editing | REAL | NOT RUN | 0 |
| History | REAL | NOT RUN | 0 |
| Recovery | REAL + MOCKED failure injection | NOT RUN | 0 |

The printed raw table contains a separate row for every configured command. [Raw complete baseline output](C:/dev/vibecheck/docs/reliability-gate/2026-11-01T16-08-11-579Z-94a0508/raw.log), [machine results](C:/dev/vibecheck/docs/reliability-gate/2026-11-01T16-08-11-579Z-94a0508/results.json), [git status afterward](C:/dev/vibecheck/docs/reliability-gate/2026-11-01T16-08-11-579Z-94a0508/git-status-after.txt).

Full regression results: **18 allowed, 12 refused, 0 wrong targets**, both assertion families satisfied for the cases where applicable. [All 30 original per-case results](C:/dev/vibecheck/docs/reliability-gate/2026-11-01T16-08-11-579Z-94a0508/selection-full-regression-artifacts/editor-load-and-toolbar/selection/round-1-full-regression.json). The other **90 scheduled selection cases were not reached**. No claim of 0 UNREACHED is made.

Full overfit failed at `/editor/m0-overfit-lab?...&view=full`. [Full error/stack](C:/dev/vibecheck/docs/reliability-gate/2026-11-01T16-08-11-579Z-94a0508/selection-full-overfit.log) records the mismatch: RootLayout's expected `.sn-main-content` div versus a hidden streamed div, and the EditorClient Loading editor div versus Suspense. [Editor server log](C:/dev/vibecheck/docs/reliability-gate/2026-11-01T16-08-11-579Z-94a0508/server-3000.log) also contains an earlier manifest/JSON error during development compilation. These are retained as findings, not fixed or filtered out.

## Historical comparison of only the failing workflow

The historical [Full overfit cell](C:/dev/vibecheck/docs/editor-load-and-toolbar/selection/round-1-full-overfit.json) contains 30 cases with zero wrong targets and zero page errors. That justified comparing this failing workflow. No other domain workflow was run for comparison.

Each command was `node tools/gate.mjs --workflow selection-full-overfit --ref <commit>`, using one fresh detached temporary worktree/server group at a time. Only this workflow ran after the same warm-up setup. Product files came from the named commit, while **the exact same 244 existing test files from 94a0508** were held fixed at every revision. Their hashes are identical across comparisons; no test definitions were adapted to make older revisions pass. [Integrity proof](C:/dev/vibecheck/docs/reliability-gate/test-integrity.json), [comparison data](C:/dev/vibecheck/docs/reliability-gate/comparison-summary.json).

| Product ref | Overfit Full | Cases reached | Seconds | Raw output |
|---|---|---:|---:|---|
| 7f1b9cd | FAIL: page error before cases | 0 | 19.15 | [raw](C:/dev/vibecheck/docs/reliability-gate/2026-11-01T16-17-51-145Z-7f1b9cd-selection-full-overfit/raw.log) |
| 5f40e10 | PASS | 30 | 78.29 | [raw](C:/dev/vibecheck/docs/reliability-gate/2026-11-01T16-22-22-802Z-5f40e10-selection-full-overfit/raw.log) |
| 7f76c57 | PASS | 30 | 82.26 | [raw](C:/dev/vibecheck/docs/reliability-gate/2026-11-01T16-25-59-548Z-7f76c57-selection-full-overfit/raw.log) |
| 7f9281f | PASS | 30 | 111.78 | [raw](C:/dev/vibecheck/docs/reliability-gate/2026-11-01T16-30-07-702Z-7f9281f-selection-full-overfit/raw.log) |
| 5a1c06f | PASS | 30 | 90.93 | [raw](C:/dev/vibecheck/docs/reliability-gate/2026-11-01T16-35-21-307Z-5a1c06f-selection-full-overfit/raw.log) |
| 58618d0 | PASS | 30 | 74.66 | [raw](C:/dev/vibecheck/docs/reliability-gate/2026-11-01T16-39-37-995Z-58618d0-selection-full-overfit/raw.log) |

Every run directory also contains its own `git-status-before.txt`, `git-status-after.txt`, worktree status, plan, server logs and test-file hashes. Successful comparisons preserve the original per-case JSON and both source assertions in their artifacts directory.

**First failing commit conclusion:** the earliest observed failure was already at **7f1b9cd**, before security hardening. However, its signature differs from the HEAD failure. [Its error stack](C:/dev/vibecheck/docs/reliability-gate/2026-11-01T16-17-51-145Z-7f1b9cd-selection-full-overfit/selection-full-overfit.log) is `Unexpected end of JSON input` at `next/dist/server/load-manifest.external.js:57:25`, via Next's `loadManifests`; the editor route returned 500. This is evidence of a Next development manifest-load failure, not evidence that the repository registry or pending-preview JSON failed to parse in that attempt.

There is **no reproduced pass-to-fail transition at a particular hardening commit** in these six single attempts. All five later isolated workflows passed. The application code at 58618d0 and HEAD is identical, but the full HEAD gate had first run another selection suite and then failed hydration. The isolated comparison did not replay that preceding suite, as instructed to run only the failed workflow. This supports an unresolved timing/order/environment-dependent possibility; it does not prove its cause. One attempt per ref is insufficient to assign a deterministic regression or dismiss the hydration error as harmless.

## Part B decision

**Not started.** A failure at the starting revision may be ignored under the requested rule, but that does not convert the 90 unreached selection cases and all unreached domain workflows into passes. The two observed error signatures are also different. Therefore the “everything green” condition was not met.

- `ui/unified-editor` remains at 7f1b9cd.
- `gate-pass-1` was not created.
- `fix/inventory-defects` was not created.
- B1–B7 were not modified or newly tested; the known Tailwind metadata bypass, border scope display, empty Save availability, readiness UX, imported Save timeout, clipboard/document wording and legacy labels remain outstanding.
- No defect fix, AST/source-mapping change, Apply/Undo change, legacy-route removal or source edit to a real project occurred.

## Diff and every changed hunk

[Diff stat](C:/dev/vibecheck/docs/reliability-gate/diff-stat.txt): **2 infrastructure files, 193 insertions** relative to 81d2b45. [Complete patch](C:/dev/vibecheck/docs/reliability-gate/changes.patch).

Product hunks: **none** in app/components/lib/fixtures/Next configuration. Infrastructure hunks:

1. package.json: add only `gate: node tools/gate.mjs`.
2. New tools/gate.mjs: existing-command registry and historical proof references; isolated safe-path worktree/fixture setup and fixed test hashes; loopback fresh servers; bounded warm-up and timing output; unchanged existing suite invocations; page-error observer and wrong-target stop enforcement; real/mocked labels; raw logs/results/status/one summary table; cleanup of owned processes and nonzero exit; `--ref`/`--workflow` comparison entry points.
3. Follow-up gate-only hunk: import `pathToFileURL` and use a file URL for the Windows preload. No test/product file was changed to resolve the setup error.

Generated evidence and retained scratch worktrees are local artifacts, not product changes. The pre-existing modified next-env.d.ts and untracked feature-inventory.md were excluded from infrastructure commits and left untouched. [Final status snapshot](C:/dev/vibecheck/docs/reliability-gate/final-git-status.txt).

## Not verified

- Full gate success, Fit selection, shared instances and every listed domain workflow at HEAD: not reached after the mandated stop.
- The gate's unexecuted workflow branches are configured from existing commands but not validated by this run; no all-workflows reliability claim is made.
- No 20-cycle imported Save experiment, formatter experiment, new forged draft experiment, defect tests, production build or launch-readiness verification was run in this task.
- No causal first bad commit or fix for hydration/manifest-load intermittency was established. No repeat trials were substituted for the failed baseline.
- Warm-up includes only readiness/compilation, not UI mutation or an assertion that the application is globally error-free. An isolated pass does not clear an earlier full-gate failure.
- No existing tests, limits or expected results were edited; no .env or secrets were inspected; no push or merge back was performed. Only one test command ran at a time. Owned servers and browsers were stopped, and temporary worktrees remain available inside the project for review.

Stopped at the Part A gate, as required.
