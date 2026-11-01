# Selection gate step 3 — NOT PASSED

Branch: `ui/unified-editor`. No product fixes, existing-test edits, limit changes, merges, pushes, or environment/secret edits. All changes in this submission are new harness/evidence files. The pre-existing `next-env.d.ts` change and other unrelated untracked files are excluded.

## Mandatory stop and execution disclosure

The second-round old-window overfit attempt redirected correctly to `/editor/m0-overfit-lab`, but failed before source readiness. Its browser emitted `Unexpected end of JSON input`, and its screenshot shows the Next.js **Runtime SyntaxError** overlay. This is an observed product-facing load failure, not a missed iframe selector. The originating JSON parse site is unresolved: the saved screenshot exposes only `JSON.parse`, not an application stack frame. No product fix was attempted.

- [Failure screenshot](round-2-old-window-overfit-error.png)
- [Raw failure output](round-2-old-window-overfit.log)
- [Recorded page error and route](round-2-old-window-overfit.json)
- [Stop record](STOP-PRODUCT-LOAD.json)

The initial runner wrongly continued on any nonzero exit unless a WRONG TARGET marker existed. It had finished its remaining scheduled attempts before this continuation reviewed the runtime screenshot. This did not honor the product-load stop rule. Later results are preserved, clearly marked **unqualified**, and must not be presented as three successful passes. The new runner now also stops on a pre-case page error. That change was inspected but was not browser-rerun after the mandatory stop. No browser executions or supplemental replays were started on this continuation.

Before the mandatory stop, 330 M0 cases ran: **234 allowed, 88 refused, 8 NOT-CLICKABLE, no WRONG TARGET**. Across all retained attempts, 663/720 ran: **470 allowed, 175 refused, 18 NOT-CLICKABLE, 57 UNREACHED, no WRONG TARGET**. UNREACHED is distinct from MISSING-TARGET: those cases never executed. Nine expected-node assertions failed across retained attempts because the intended badge was obstructed and unavailable in Layers. No pointer/source equality assertion failed. Explicit refusals and Layers selections have N/A pointer assertions, never fabricated passing pointer assertions.

## Case 1: original click versus physical hit

The original overfit test uses selector `div#app-shell`, calls `scrollIntoViewIfNeeded()`, and then `locator.click({ position: { x: 5, y: 5 } })`. At that exact logical point, `elementFromPoint` returns the **header, ShellLayout.tsx:10**, on all four surfaces. The original test subsequently inspects the requested locator's source metadata; it does not assert the editor's actual selected source. That explains how its direct-preview result can pass despite hitting a descendant.

The new copy preserves the selector, logical initial point and expected source **ShellLayout.tsx:9:div**. It records the initial hit, then searches for a physical point on that container itself. It never redefines a header hit as a wrong selection of the wrapper.

| Surface | Container | Original direct hit | Own container point |
|---|---|---|---|
| Old Studio | 1200 × 1242; zero padding, normal gap | header at logical (5,5) | None; child rectangles cover wrapper. Layers selects wrapper. |
| Old window | 1440 × 1242; zero padding, normal gap | header at logical (5,5) | Found at logical (40,81), in side gutter. |
| /editor Full | 1440 × 1242; zero padding, normal gap | header at logical (5,5) | Found at logical (40,81), in side gutter. |
| /editor Fit | 1200 × 1242; zero padding, normal gap | header at logical (5,5) | None; child rectangles cover wrapper. Layers selects wrapper. |

These dimensions describe the diagnostic captures, not an invariant at every viewport. Header rect is `(0,0,width,61)`, padding `16px 24px`, gap `normal`. Exact iframe offsets, measured scale, initial source node, child styles/rects and screenshots are in [route comparison](case1-route-comparison.md) and its linked JSON/PNG files. The no-exposed-area certificate applies only to the recorded untransformed, unclipped, square-corner rectangular children with pointer events. Searches for other shapes are finite probes, not a mathematical guarantee of exhaustive coverage.

## Harness and unchanged expected results

Only the new `iframe-v3` copies and new helper files were changed. `logicalToScreen` is the single source-to-screen conversion for page-content clicks, using measured iframe scale, border and offset. Each case clears prior selection with Escape, scrolls into view, performs iframe and parent-page hit testing, and waits for the real editor selection/refusal message. Native Layers clicks use Playwright locators.

Each recorded case has separate pointer-source and expected-source assertions. Actual pointerdown source identity includes source file, line, column, tag and instance trace where present. The original expected file/line/tag and safety predicates are preserved. A direct-hit point is sought inside the original element's own area; if none exists, the result is NOT-CLICKABLE and the same source is attempted via Layers. No forced content clicks or product modifications are used. Execution exit zero means completion without WRONG TARGET; it does not mean all fallback assertions passed.

[Expected-list proof](expected-list-proof.json): both 30-entry blocks are byte-identical. [Regression diff](regression-expected.diff) and [overfit diff](overfit-expected.diff) are empty. Original prefixes, including selectors, are checked again by the finalizer. [Protected-file proof](protected-integrity.json) confirms all 397 pre-existing product/test files match their pre-step hashes.

The first two diagnostic attempts hit a new-harness Playwright callback serialization error (`__name`), after routes had loaded. They are retained under `attempt-1-diagnostics` and `attempt-2-diagnostics`. Only the new callback serialization was corrected; there was no application shim.

## Route readiness diagnosis

The two earlier attempts were old Studio overfit and old window control. Both waited the unchanged 30,000ms for visible `[data-source-ready="true"]`, before any case. Fresh direct Playwright loads of those routes and the other three diagnostic cells succeeded in approximately 11–13 seconds. These captures include screenshots, iframe DOM snapshots, console events, response statuses and request errors. No failed requests, page errors or HTTP errors occurred in those successful diagnostics. Thus the exact earlier timeout cause was not established, and cannot be called purely a harness issue.

The later round-2 old-window overfit runtime screenshot establishes an intermittent product-facing loading failure. Full console/response traces and a parent DOM snapshot were **not** captured for that particular failing state; only the saved page-error events, screenshot and raw timeout are available. Server log copies at the stop are `server-*-at-stop.*.log`. They do not establish the client parse origin. No server-log timestamp is asserted as correlated root cause.

Round 3 old Studio overfit reached three cases, then lost its iframe execution context during navigation. Its recorded requests include `ERR_NETWORK_IO_SUSPENDED`; cause is unresolved. The old Studio Step 1 replacement later failed to launch Chromium (180,000ms existing default). Neither is counted as a completed suite. These later incidents occurred after the mandatory stop and remain unqualified observations.

## Product obstruction finding

The floating bottom toolbar physically intercepts page content. For regression case 30, an intended footer badge point maps inside the iframe to the badge, but parent-page `elementFromPoint` returns the editor toolbar or its `Editor view` select. A captured point is `(565.2734375,848)`; badge rect is `(496.5625,835,137.421875,26)`. No unobstructed own point was found in that viewport. The badge is also absent from the Layers list, so the fallback expected-node assertion fails. Fit case 29 encounters a similar obstruction but its Layers fallback succeeds.

[Screenshot](round-1-full-regression-case-30-blocked.png) · [all obstruction records](toolbar-obstructions.md). This is reported as a product finding, not relabeled as a wrong target and not fixed.

## Original Step 1 selection suite and new replacement

The earlier failing file was `test/step1-selection.test.ts`. On its direct fixture baseline, the bounding-box assertion passed, then `#slightnudge-file-display` timed out. On the canonical editor, its top-level `#target` cannot reach iframe content. Its assertion expects `fixtures/1-plain-static.tsx:7`, but the current source marker reports line 8. It also expects old safe/warning text pills that the current editor no longer renders. This matters: the original test is not evidence that current source selection is wrong, but its legacy UI contract is not satisfied either.

The NEW `test/step1-selection.iframe-v3.test.ts` uses iframe-aware lookup, real selection messages and current overlay selectors. All original expected file/line/class/warning values remain unchanged. Completed fixture runs retain three EXPECTED-CONTRACT-FAIL results (fixture 1 line/safety, fixtures 3 and 4 warning text), two PASS results (fixtures 2 and 5), and passing Escape checks; reached pointer assertions pass.

The round-1 old Studio replacement initially used default fixture titles while the Pages panel listed discovered route labels. Its five MISSING-TARGET entries are retained as a new-harness mistake. Only the new replacement was corrected to use stable `/fixtures/N` labels. A separate replay helper exists but was not run because testing stopped. Round 3 old Studio replacement did not launch; its raw log is retained. See [replacement records](step1-replacement-summary.json).

## Raw results and git status after each attempted round

| Round | M0 coverage | Raw output | Git status |
|---|---|---|---|
| 1 | 240/240; 60 geometry measurements | [raw](round-1-raw.log) | [status](round-1-git-status.txt) |
| 2 | 210/240; overfit old-window failed before cases; remainder collected after mandatory stop | [raw](round-2-raw.log) | [status](round-2-git-status.txt) |
| 3 | 213/240; old Studio overfit stopped after 3; all collected after mandatory stop | [raw](round-3-raw.log) | [status](round-3-git-status.txt) |

[All 720 planned case rows, with both assertions](all-case-results.md) · [raw case JSON](all-case-results.json) · [cell summary](round-summary.md) · [qualification totals](qualification-summary.json).

Fit sampled the first ten original expected-allowed elements per lab at 50%, 100% and 150%. [Offsets for all samples](geometry-offsets.md) include requested and measured scale, x/y/width/height error in CSS pixels. Sixty measurements precede the mandatory stop; another 120 are retained unqualified later evidence. Maximum absolute measured error across each set is **0.0078125 CSS px**. Missing/clickability outcomes remain explicit; there is no tolerance change.

## Not verified / remaining

- Three complete, qualifying passes: **not achieved**. No reruns were used to conceal failed attempts.
- Root cause or repair of the runtime JSON parse error, suspended-network navigation, or Chromium launch failure.
- DOM snapshot, full console/network trace or complete application stack for the particular runtime failure; successful route diagnostics have those broader captures only.
- A supplemental old Studio Step 1 replay after its initial new-harness title mismatch.
- Product fix for toolbar/content collision or missing badge in Layers; nine retained fallback assertions fail.
- Original Step 1 legacy contract parity; the new replacement deliberately still fails its unchanged obsolete expectations.
- Other browsers, DPRs, viewport sizes, arbitrary transformed/clipped/rounded shapes or every possible direct-hit point.
- Source saving, Undo, recovery, editing mutations, production build or launch readiness: this step is selection-only.

No original tests, expected lists, timeouts, source mapping, apply/undo code or AST patcher were changed. No merge or push was performed. Only new step-3 harness/evidence files belong in the authorized local commit `test: selection gate harness`.
