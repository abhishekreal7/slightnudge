# Selection gate step 2 — stopped on a different selected target

No product fixes, original-test changes, merges, pushes or environment/secret edits. Branch remains `ui/unified-editor`, checkpoint `532019b`. New tests/harness and evidence remain uncommitted. The integrity manifest verifies product files and original tests against the beginning of this step.

## Case 8 diagnosis and harness-only correction

See [the side-by-side comparison](case8-comparison.md), [initial diagnostic](case8-diagnostic.json), [actual pointer events](case8-pointer-events.json), [screenshot](case8-after-click.png), [parent DOM](case8-parent.html) and [iframe DOM](case8-iframe.html). The screenshot and sanitized DOM were captured in the reproduced failing state.

Conclusion: **harness coordinate-conversion problem**. Case 7's selection cleared on Escape. The grid was in view. The intended source point (42,1063) hit the correct grid div; the parent hit test returned the iframe, not an editor overlay. At roughly 19.5% scale, the unconverted automation offset (2,2) landed around 10.2 source pixels inside the grid, hitting a repeated article. The editor explicitly refused that repeated article; the old harness waited only for a selected-source attribute and consequently timed out.

The corrected new harness converts the original logical click position to rendered pixels, scrolls using the original method, sends Escape and awaits cleared selection, recognizes source-selection and refusal messages, and measures an overlay only when a selected target exists. Default centre clicks remain default centre clicks. Missing selection is recorded as `MISSING-TARGET` and does not stop the matrix. Only a different selected source identity stops it. Outcome mismatches remain reported separately; expected results are not rewritten.

The corrected diagnostic physically hit the grid and selected `Features.tsx:14:9:div`. [Corrected evidence](corrected-click/case8-diagnostic.json), [pointer events](corrected-click/case8-pointer-events.json), [screenshot](corrected-click/case8-after-click.png). Case 8 also passed in the matrix.

Both 30-case specification blocks are byte-for-byte unchanged. [Proof](expected-list-proof.json), [regression diff](regression-expected.diff), [overfit diff](overfit-expected.diff), [new harness changes](new-harness.diff). These specification blocks include every original selector, click position, expected file/line/tag/outcome, refusal pattern and text restriction.

## Round 1 results and stop

| Entered surface | Suite | Cases completed | Results |
| --- | --- | ---: | --- |
| Flagged old Studio `/studio/m0-control-lab/edit` | Regression | 30/30 | 18 allowed, 12 refused; all unchanged expectations matched |
| Flagged old Studio `/studio/m0-overfit-lab/edit` | Overfit | 0/30 | Editor source-ready wait timed out after 30000ms; cases unreached |
| Old window `/studio/m0-control-lab/window` → canonical default Full | Regression | 0/30 | Editor source-ready wait timed out after 30000ms; cases unreached |
| Old window `/studio/m0-overfit-lab/window` → canonical default Full | Overfit | 1/30 | WRONG TARGET relative to original expectation; stopped |

[Raw output](round-1-raw.log), [git status after round](round-1-git-status.txt), [per-case JSON](all-case-results.json), [per-case CSV](all-case-results.csv). `UNREACHED` means no case click was performed, not an allowed/refused result or a missing-target case. The two startup timeouts have not been diagnosed conclusively and are not treated as passes. The matrix was configured for three rounds but stopped in the first under the user's stop rule.

Overfit case 1 expected `ShellLayout.tsx:9:div`, selector `div#app-shell`, original click `(5,5)`. The real selected identity was `ShellLayout.tsx:10:7:header`. Both `elementFromPoint(5,5)` and the actual pointer event identified that child header. The parent hit was the iframe, not a toolbar. [Stop record](STOP-WRONG-TARGET.json), [screenshot](round-1-old-window-overfit-wrong-target.png).

This is an **expectation-versus-physical-hit mismatch**. It does not demonstrate that the editor mis-mapped the element actually under the pointer. The original M0 suite inspects the requested wrapper locator's metadata after clicking, so it can report the wrapper even when the physical click hit its child. No alternative point, parent promotion, changed expected target, source fix or further test run was attempted after the wrong-target record.

No toolbar click interception was demonstrated in the completed cases or case 8 diagnostic. This is not a blanket toolbar qualification. The wrong-target screenshot shows a floating toolbar near page content, but no further blocking probe was performed after the stop.

## Earlier failing “selection” suite

The earlier file was **`test/step1-selection.test.ts`**, not either 30-case M0 suite.

- On its direct fixture baseline, `#slightnudge-selected-box` was visible and its bounding-box assertion passed. It then timed out after 30000ms waiting for `#slightnudge-file-display`; the expected file/line assertion was never reached.
- On the canonical editor, the unchanged top-level `#target` wait timed out because the target is inside the actual-project iframe. No selection assertion was reached there.
- Its later checks expect `fixtures/1-plain-static.tsx:7` and a class string containing `ml-2`. The current fixture marks the heading at line 8, and the old file-display/class-display selectors describe an older UI contract. Those assertions were not changed or re-run in this step.

Those failures matter: they leave a selection regression gap and cannot be counted as green. They do not by themselves demonstrate wrong selection in the current editor. The iframe-aware M0 gate is intended to check real selected targets while retaining its own original expectations. Its results here are only partial.

Historical raw output: `../unified-editor-evidence/02-baseline-selection.log` and `../unified-editor-evidence/round-3-selection-full.log`. Original M0 baselines from the previous gate passed all 60 direct-preview inspection cases; see `../selection-gate-evidence/baseline-regression.log` and `../selection-gate-evidence/baseline-overfit.log`.

## Retained harness attempts

`attempt-1-diagnostic-startup.log` records an initial diagnostic script import failure before browser testing. `attempt-2-diagnostic.log` is the first completed failing-state reproduction. The final initial-state diagnostic additionally records actual pointer events. The corrected diagnostic is retained separately.

`attempt-1-matrix/` retains a harness-only failed attempt: after an explicit refusal the harness wrongly waited for a nonexistent overlay. It was stopped and preserved before correcting only the new harness. These partial attempts are not passing matrix rounds. No product or original test was modified to obtain a pass.

## Not verified

- Remaining 29 overfit cases through the real editor, and all cases in the two setup-timeout cells.
- Dedicated canonical Full/Fit suite runs. An old-window redirect did enter canonical default Full for the one stopped overfit case.
- The 10-element Fit sample at 50%, 100% and 150%. **No Fit measurement rows exist**; legacy Studio offsets are not substitutes.
- Rounds 2 and 3, interrupted saves, recovery, source writes, apply/undo, production build, deployment or broad browser compatibility.
- Whether any later toolbar, overlay or viewport position blocks content clicks.

Stopped after the first different selected source target, as instructed. Product files and original tests remain unchanged; see [integrity](integrity.json) and [final git status](final-git-status.txt).
