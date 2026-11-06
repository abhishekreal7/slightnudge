# Baseline blocker investigation

Product/test reference: `94a05082435520c0d948c2922dd670d586b3bf2a`, security/hardening. Sequential processes only; disposable worktrees inside this project. No product changes, existing test changes, merges, tags or pushes.

| Experiment | Result | Evidence |
| --- | --- | --- |
| Fresh full gate: warm-ups, then regression, then overfit | Four warm-ups passed; regression failed before case 1 with Next manifest JSON parse error. Overfit and later workflows not run. | [raw](2026-11-01T17-49-59-049Z-94a0508/raw.log), [server](2026-11-01T17-49-59-049Z-94a0508/server-3000.log), [status](2026-11-01T17-49-59-049Z-94a0508/git-status-after.txt) |
| Fresh overfit only, same warm-up sequence | Failed before case 1 with the same Next manifest reader error. Regression need not run first. | [raw](2026-11-01T17-53-26-225Z-94a0508-selection-full-overfit/raw.log), [status](2026-11-01T17-53-26-225Z-94a0508-selection-full-overfit/git-status-after.txt) |
| Fresh overfit with read-only manifest observation | 30/30 selection cases completed, but the server read an empty generated manifest during API requests. A workflow PASS is insufficient evidence of server reliability. | [raw](2026-11-01T17-56-39-365Z-94a0508-selection-full-overfit/raw.log), [server](2026-11-01T17-56-39-365Z-94a0508-selection-full-overfit/server-3000.log), [status](2026-11-01T17-56-39-365Z-94a0508-selection-full-overfit/git-status-after.txt) |

## Proven finding

The read-only observer captured `.next/dev/build-manifest.json` with `bytes: 0`, body `""`. Call stack: `next/dist/server/load-manifest.external.js:54` reads it; line 57 parses it. The observed request stack reaches `AppRouteRouteModule.loadManifests`, the generated `/api/slightnudge/responsive` route and Next's development server. Earlier failed page requests reach the same reader via `AppPageRouteModule.loadManifests`.

This establishes a generated-manifest read failure, rather than corrupt project registry, pending preview or edit history JSON. Next's build-manifest plugin emits this asset (`node_modules/next/dist/build/webpack/plugins/build-manifest-plugin.js`). The exact writer/race and connection to the earlier hydration mismatch remain unproven. The diagnostic adds JSON validation and logging after reads; its timing can affect reproduction. It neither repairs bytes nor retries reads. No dependency modifications were made.

Only one gate/test process ran at a time. Process inspection showed its three owned development servers (editor and two preview labs); unrelated Codex runtime services were left untouched. Available C: storage was approximately 62.7 GB. This does not establish or rule out transient resource pressure.

## Changes and remaining work

- Added `tools/observe-next-manifests.mjs`, read-only filesystem observation restricted to generated `.next/*.json` paths.
- Gate starts development servers with that observer, inherited by Next's server subprocess.
- Existing tests and expectations remain unchanged (`git diff --exit-code -- test` passed). Pre-existing `next-env.d.ts` changes remain untouched.
- No product fix was justified by this investigation yet. Do not weaken page-error checks or treat the isolated selection PASS as a full gate pass.
- Next investigation: capture the generated manifest writer and overlapping compile/read events, reproduce with the observer disabled/enabled, and prove a narrowly scoped fix before modifying server integration. Separately reproduce the earlier hydration mismatch; a shared cause has not been established.
- Full/Fit matrix, shared workflows and domain workflows remain unverified in this follow-up because the full gate stopped at its first page error. Part B, fast-forward and `gate-pass-1` remain blocked.
