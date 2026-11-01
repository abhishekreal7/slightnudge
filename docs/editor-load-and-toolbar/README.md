# Editor load and toolbar investigation

Branch: `fix/editor-load-and-toolbar`, created from `24c6259` on `ui/unified-editor`. No merge or push. The required existing commit is confirmed by [git log -n 3 --stat](checkpoint-git-log-stat.txt).

## Result and important limits

Two proven UI defects are fixed: inline source elements excluded from Layers, and a dock that intercepted content / allowed controls to overflow its collision box. The final matrix completed **720/720 cases**: **522 allowed, 192 refused, 6 NOT-CLICKABLE, 0 WRONG TARGET, 0 MISSING-TARGET, 0 UNREACHED, 0 page errors, 0 pointer-source or expected-source assertion failures**. The final browser matrix's authoritative totals and every NOT-CLICKABLE fallback are in [selection/summary.json](selection/summary.json), with [all 720 case rows and both assertions](selection/all-cases.md). No failed attempt is substituted for a qualifying run.

The historical **Unexpected end of JSON input** remains unreproduced. The clean-state experiment returned valid JSON from **150 parallel-burst GETs** (50 each to pages, repository list and repository detail) and completed **50 route loads** after lab hostname setup was corrected. No exact historical parse site or failing JSON payload was recovered. Consequently, no state-write, API, apply/Undo or AST changes were made under the prove-before-fix rule.

An additional hydration error was observed after development recompilation. Its complete stack and source-annotated mismatch are preserved in [obstruction-after-final.json](obstruction-after-final.json). It is non-green evidence. The cold-server run and subsequent matrix are separate observations; their success does **not** prove this intermittent hydration issue resolved.

## Diagnosis evidence

- [Investigation and state-publication/API audit](diagnosis.md).
- [All 79 JSON read sites, with input/source context](json-read-contexts.md); [JSON inventory](json-read-contexts.json).
- [Complete pre-change write implementations for seven state-related modules](state-writer-source-before.json); [write/rename locations](all-state-writes.txt); [API return sites](api-return-sites.txt).
- [Clean lab construction](clean-lab.json): fresh registry, no prior edit history/pending previews; environment files excluded.
- [150 response records](reproduction-bound/parallel-requests.json); [50 route records](reproduction-bound/route-loads.json); [raw experiment](reproduction-bound.log); [load summary](load-summary.json).
- [Initial processes](processes-initial.json), [initial memory](memory-initial.json), [memory during experiment](memory-during.json), [processes during matrix](processes-during-matrix.json), [memory during matrix](memory-during-matrix.json).

The initial lab attempt used a default-bound Next server with browser URLs on 127.0.0.1. Its HMR handshake failures and readiness timeouts are retained in `reproduction-before.log`, `route-loads.json` and matching screenshots. Binding the lab explicitly to 127.0.0.1 corrected that setup; no application configuration was changed. A later restart attempt logged EADDRINUSE and is also retained as setup evidence. The final editor server has `SLIGHTNUDGE_LEGACY_STUDIO=1`, enabling the actual old Studio surface for its legacy-route tests.

No contemporaneous process/RAM dump exists for the historical suspended-network or Chromium launch incidents. Current snapshots and sequential runner code do not establish their historical cause. Neither resource exhaustion nor concurrent test processes is asserted as proven.

## Fixes and before/after tests

1. **`54b8f42` — `fix(layers): restore source-backed inline elements`**. The display filter now includes span/label/strong/em/li, already recognized by its text icon logic. Both badge instances can be selected with distinct instance traces. [Fix report](layers-fix.md), [before](inline-layers-before-source.log), [after](inline-layers-after-source.log).
2. **`fix(editor): prevent toolbar from covering selected content`**. The dock container ignores pointer events except on actual controls. Wrapping flex layout contains every control in its measured box. Collision avoidance moves the dock outside the rendered selection; if the viewport has no free band, it yields until selection clears. [Fix report](dock-fix.md), [old-dock failure](obstruction-before-dock.log), [overflow failure](obstruction-before-overflow.log), [cold-server passing workflow](obstruction-after-cold.log), [screenshot](obstruction-after-cold.png).

Initial text-label test assumptions, the first incomplete dock test, the hydration-error run, and the intentionally interrupted matrix are preserved and identified in those reports. The corrected new tests pin source identity; no original test expectation or limit was edited.

## Final sequential matrix

Each round runs regression then overfit on old Studio, old window, /editor Full and /editor Fit, one suite process at a time. The runner awaits each child exit. A page error before cases rejects readiness immediately; WRONG TARGET stops in the helper. The runner also stops on nonzero exit, incomplete coverage or failed pointer/expected-node assertions. Explicit refusal and Layers fallback have N/A pointer assertions, not fabricated passing equality assertions.

| Round | Raw output | Git status after round |
|---|---|---|
| 1 | [raw](selection/round-1-raw.log) | [status](selection/round-1-git-status.txt) |
| 2 | [raw](selection/round-2-raw.log) | [status](selection/round-2-git-status.txt) |
| 3 | [raw](selection/round-3-raw.log) | [status](selection/round-3-git-status.txt) |

Each round completes 240/240: 174 allowed, 64 refused, two NOT-CLICKABLE. All six NOT-CLICKABLE results are overfit case 1 (`div#app-shell`, ShellLayout.tsx:9:div): old Studio in rounds 1, 2 and 3, and Fit in rounds 1, 2 and 3. Each has a PASS Layers expected-source assertion. Children cover the container's own pointer area in those captures. Full and old window have an exposed side gutter and use direct clicks. No footer case needs a failed Layers fallback in the final matrix.

[Per-cell counts and page errors](selection/cells.json) · [per-case raw data](selection/all-cases.json) · [every NOT-CLICKABLE case and Layers assertion](selection/summary.json). Both original 30-case prefixes, including selectors and expectations, have empty diffs: [regression](selection/regression-expected.diff), [overfit](selection/overfit-expected.diff).

The initial attempt in `selection-initial-overflow/` was manually interrupted when visual review exposed overflowing controls. It is not a final matrix round. Its raw output, statuses and tested source snapshots remain intact. No product source was changed underneath a running qualifying matrix.

## Scope and integrity

[Source-integrity proof](source-integrity.json) records the protected-file comparison and SHA parity between tested lab files and branch files. [Fixture parity](fixture-parity.json) confirms the copied lab fixture sources match the originals used for AST inspection. Only three existing product files change: SourceLayers.tsx, useWindowDock.ts and editor-workspace.module.css. Existing tests, expected-result lists, source mapping, AST patcher, selection dispatch and apply/Undo code remain unchanged.

[Product diff --stat](product-diff-stat.txt) · [every product hunk](product-diff.patch). There is no `core: atomic state writes` commit because that path was not changed. Repository import's fixed temporary file is documented as a static concurrency risk, not repaired without a reproducer.

[Inherited-test integrity](inherited-test-integrity.json) additionally confirms all 209 tests in the prior gate's manifest remain byte-identical, including its previously untracked harness files.

Only these two UI fixes, new harness/tests and requested investigation evidence belong in the local commits. Pre-existing `next-env.d.ts`, unrelated untracked work, main workspace `.slightnudge`, environment files and secrets are excluded. Generated preview-session credentials in server/HTML logs are redacted; request ordering, errors and outcome records are retained.

## Not verified

- Historical JSON parse root cause/payload or a repair for it; intermittent font-link/Suspense hydration root cause or repair.
- Historical concurrency/resource-exhaustion cause for suspended network I/O and Chromium launch timeout.
- Concurrent repository imports, file corruption/fault injection, disk-full/rename failure, multiple writers, Save/Undo recovery or transaction crash safety. No atomic-write improvement is claimed.
- Arbitrary OS/process/transport failures returning valid JSON after a connection is aborted.
- Other browsers, DPRs, viewport widths, narrow-screen wrapping, arbitrary transformed/clipped hit areas, keyboard/drag dock placement, or manual 50%/150% zoom geometry in this task.
- Production build, deployment, licensing, launch readiness or live cloud setup.

The dock's no-free-band hidden fallback is documented behavior; this task's explicit obstruction assertion exercises the selected footer and its control rectangles. The result is bounded selection/UI qualification, not a claim that the entire SaaS is flawless.
