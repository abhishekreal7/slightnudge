# Selection gate — stopped at missing selection

Branch: `ui/unified-editor`. Local checkpoint: `532019b`, `checkpoint: unified editor stage 1-2`. No merge or push. The checkpoint includes pre-existing application work as well as Stage 1–2. See `checkpoint-included.txt` (312 files), `checkpoint-excluded.json` (1410 excluded paths with reasons), and `checkpoint-commit.txt`. No environment files, local state, logs, scratch or temporary evidence were committed. Existing test sources were not edited; `integrity.json` records their hashes and the checkpoint path audit.

## Baseline correction

The prior consolidation task ran `test/step1-selection.test.ts`, not these two M0 suites. Its baseline failure was a 30000ms wait for `#slightnudge-file-display`; its canonical-route failure was a top-level `#target` lookup against iframe content. Those results do not establish that the M0 suites failed. No historical raw M0 failure output was found in the inspected documentation logs.

Both original M0 suites passed unchanged in this gate:

| Suite | Allowed | Refused | Wrong targets | Raw output |
| --- | ---: | ---: | ---: | --- |
| M0 regression | 18 | 12 | 0 | [output](baseline-regression.log) |
| M0 overfit | 26 | 4 | 0 | [output](baseline-overfit.log) |

The originals navigate directly to the preview server. They read source attributes from the requested locator and call `inspectElement`; they do not assert which target the real editor selected. Their passing results therefore do not prove editor hit-testing.

## New iframe-aware copies

`test/m0-regression.iframe.test.ts` and `test/m0-overfit.iframe.test.ts` retain their respective entire 30-case specification blocks byte-for-byte. Expected files, lines, tags, selectors, click positions, outcomes, refusal patterns and text restrictions are unchanged. See `expected-lists-proof.json`, both empty `*-expected.diff` files, and `*-copy.diff` for full original/copy diffs. No existing test, limit or expected result was edited.

The new helper physically clicks within `iframe[title="Actual project"]`, reads the real workspace's `data-selected-source`, compares its source identity with the original expected target, measures the selected overlay against the clicked locator, and then uses the original inspection inputs and expectation checks. Allowed/refused results retain the original inspection semantics; no source edits or Save requests are made by this gate.

## Stop evidence

Round 1, legacy Studio surface, regression suite: cases 1–7 selected their expected targets and were allowed. Case 8 physically clicked `section#features div.mt-12.grid` at the unchanged `{x:2,y:2}` position. Expected: `Features.tsx:14:div`, allowed. The editor did not expose a selected source target within 30000ms. The selection predicate, not the iframe locator or click, timed out.

This is recorded as **WRONG TARGET (missing selection)** for gate purposes: the required target was absent. It is not evidence that a different source file was selected. Seven preceding correct real editor selections rule out a general inability to reach iframe content. This run demonstrates a missing-selection failure for this click; it does not conclusively isolate the underlying product mechanism or a coordinate/setup-specific cause.

See `round-1-old-studio-regression.log`, `round-1-old-studio-regression.json`, `STOP-selection-gate.json`, `case-results.json`, and `round-1-git-status.txt`. The runner exited before reaching the remaining cases. No product fix, test expectation change, forced click, timeout increase or alternative click point was attempted after the failure.

## Not verified

- Remaining 23 regression cases through the editor; all 30 overfit cases through the editor.
- Old window route and canonical Full/Fit views.
- Ten-element 50%, 100%, 150% Fit geometry sample. The seven offsets collected on legacy Studio are not substitutes for this sample.
- Second and third matrix runs, or three repetitions of the originals. The explicit stop condition takes precedence over continuing the matrix.
- Save/Undo, source writes, recovery, compatibility or deployment. These are outside this selection-only gate.

There were no product source changes in this task. Only the local checkpoint, new test copies/helper, runner and evidence were created. The originals remain unchanged. The final working tree remains dirty with excluded pre-existing artifacts and the new gate files; see `final-git-status.txt`.
