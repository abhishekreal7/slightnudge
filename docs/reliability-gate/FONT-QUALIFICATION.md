# Font manifest qualification

Local commits: `3e2ebcb` font publication fix and `2b26542` strict gate manifest check. No merge, tag, push or Part B.

Installed Next font plugin emits `server/next-font-manifest.json` through Webpack (`node_modules/next/dist/build/webpack/plugins/next-font-manifest-plugin.js:113`). Previous diagnostics observed this exact file empty during requests.

New test `test/next-font-manifest-webpack.test.cjs` runs installed Webpack and deliberately widens native truncate/write time. [Before](font-before.log): assertion fails because a reader sees an empty manifest. [After](font-after.log): passes. Existing tests and expectations unchanged.

Every product hunk this step: extend the exact output-path target list in atomic-build-manifest.cjs with `server/next-font-manifest.json`. Gate hunk: reject INVALID_NEXT_MANIFEST diagnostics in editor/preview logs after warm-up and after each workflow. This gate check ran during the full baseline below.

## Full baseline at 2b26542

[Raw output](2026-11-01T19-13-27-120Z-2b26542/raw.log), [partial results](2026-11-01T19-13-27-120Z-2b26542/results.json).

- Four warm-ups passed: 71.51, 8.45, 22.32 and 5.33 seconds.
- Full regression, Full overfit, Fit regression and Fit overfit passed: 120 cases completed. Strict generated-manifest checks passed after these stages.
- Four shared-instance workflows driver failed waiting for `[data-source-ready="true"]` (120-second locator wait). No claim that its four constituent workflows passed. Driver elapsed 1100.83 seconds; this long elapsed time remains unexplained.
- Movement failed waiting for top-document `h1` (30-second locator wait).
- State/transitions failed waiting for top-document `h1`.
- Gate was manually stopped while responsive workflow was running after these failures. No full gate PASS. Raw output and partial results were preserved; remaining workflows are unverified, not passing. Owned process tree was stopped.

`test/helpers/drag-move-browser.ts:12-13` navigates `/studio` then calls `page.locator('h1').click()`. It does not enter the preview iframe. This is evidence of a harness assumption incompatible with the consolidated route; it is not evidence the movement product behavior failed. Existing tests were not modified to bypass it. Shared preview readiness failure is separate and unresolved.

## Limits

No historical six-commit comparisons of these newly reached workflow failures were performed in this step. Their classification as baseline-existing versus regression is unverified. No full shared/domain qualification. No proof the earlier hydration mismatch is solved. Earlier loading stall and 406-second timeout overrun remain unexplained; no limits increased. Atomic publication is restricted to the editor server config, not automatically installed in imported preview projects. All manifest variants/framework versions are not covered.

Tracked step diff: three files, 54 insertions, one deletion, including the new test. [Diff stat](font-qualification-diff-stat.txt), [status](font-qualification-status.txt). Pre-existing next-env.d.ts modifications remain untouched.

Next: reproduce the shared readiness failure and compare failing existing workflows on the requested historical refs. Resolve the old route/top-document harness assumption through an explicitly scoped harness update before claiming domain coverage. The baseline remains blocked.
