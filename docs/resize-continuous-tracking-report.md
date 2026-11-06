# Continuous width-drag tracking

The user reported separation of the cursor and dot on both side and corner controls. The previous tests measured horizontal alignment at supported width presets, which missed intermediate movement and vertical drift caused by text reflow.

## Reproduced

- `continuous-width-before.log`: the intermediate-position test fails because the edge stays at a preset while the pointer moves 8px. Width preview previously used `snapWidth` on every move.
- `resize-reflow-before.log`: at 75% zoom, the active side dot shifts **72 screen px vertically** as text grows from 448px to 640px tall. The resize hit target was 334.5 screen px tall because it covered the whole element edge.
- Corner controls displayed diagonal cursors and accepted pointerdown, but the safe engine authors only supported `max-w-*` values. It does not author height, so those controls could not perform real two-axis corner resizing.
- After corner controls were disabled, their old 30px hit areas obstructed the side-dot pickup on short text. `continuous-width-pickup-diagnostic.log` records `elementFromPoint(703,48)` returning the disabled bottom-right corner button, whose rectangle starts at that exact Y. This was a product obstruction, not a selection-harness failure.

## Changes

Product changes for this follow-up are in `EditorWorkspace.tsx` and `editor-workspace.module.css`:

1. During a side drag, temporary maximum width follows the continuous pointer-derived width, bounded by the existing width scale. Only release snaps to an existing supported utility. The badge states the release width; transient pixel widths are never saved as new arbitrary utilities.
2. The active side grip retains its picked vertical location while text reflows. Its position accounts for source-box top changes and is clamped to the actual edge. It returns to the midpoint when the gesture ends. Measurements are read at pointerdown; this adds no layout read per pointermove.
3. Side hit targets are 18 × 30 CSS px around the dot instead of covering the entire edge. Original dots and Move-button design are retained.
4. Unsupported corner controls are disabled with a reason explaining that height follows content and a side dot edits maximum width. **Real diagonal corner resizing remains unimplemented.** This change makes that limit explicit; it does not implement two-axis resizing.
5. Disabled corner hit areas shrink to the 10px visible dots and sit below the side controls. Their tooltip reason remains available without blocking the side-dot pickup.

No AST patcher, compiler, source mapping, Apply/Undo implementation, bridge protocol or server write path changes. Source changes still use the existing preview, verification, draft, Save and Undo paths. Existing unrelated dirty changes were preserved; no commit, merge or push was made.

## Evidence

| Check | Evidence |
| --- | --- |
| Intermediate widths at 8/19/31/47 CSS px of pointer travel, start/center/end anchors, 75%/100%/150% zoom | `continuous-width-final-fit.log` |
| Full-view intermediate tracking, compact hit targets, non-preset release, real Save and exact Undo on final CSS | `continuous-width-final-full.log` |
| Wrapping text at 75%, 100%, 150%: measured X and Y offsets **0px**, native height 448 → 640px, hit target 30 CSS px before zoom | `resize-reflow-final.log` |
| Consecutive resize with delayed real validation; subsequent Move, serialized draft parents, real Save and exact Undo | `continuous-width-final-save.log` |
| Earlier Full-view Save/Undo regression with continuous preview | `continuous-width-save-regression.log` |
| TypeScript: 66 errors, normalized diagnostics identical to the prior baseline; no new diagnostics after correcting the new reflow helper's driver signature | `continuous-width-final-typecheck.log` |
| Whitespace check | `git diff --check` passes |

The first post-fix reflow run, `resize-reflow-after.log`, records X/Y offsets of 0px at all three zoom levels but fails the new harness's hit-height assertion at 150%. That assertion compared screen pixels to a CSS-pixel limit. The new test now divides by zoom; the limit remains 31 CSS px. Existing tests, their expected results and limits were not edited.

`continuous-width-final-pointer-race.log` and an earlier `continuous-width-final-fit.log` attempt failed the final pickup. The new harness was first synchronized to the selected outline, but that did not fix it. The exact-point diagnostic then proved the disabled-corner obstruction above. Do not describe those failed pickups as a proven test race or count them as passes. The obstruction was fixed in CSS and the same pickup assertion passes afterward.

The final intermediate-width workflow also tests a non-preset live width of 749px releasing to `max-w-3xl` (768px), source remaining unchanged before Save, real Save, and byte-identical source Undo. Tests use disposable copies; the refusal of corner gestures is explicit and tested.

## What I did NOT verify

- The user's existing tab, physical OS pointer hotspot rendering, other browsers or DPR settings.
- A complete selection/shared-instance gate, production build or drag frame-time budget.
- A green project-wide typecheck: the existing 66 diagnostics remain.
- Real corner/height resizing, rotation, imported-project width dragging, every CSS layout or animation.
- Pointer alignment beyond parent limits or the supported width range. A pointer can physically leave a constrained element; the editor does not warp or fake the OS pointer. The active grip stays on the real edge if height shrinks past its pickup point.
- Pixel-exact width persistence: release deliberately snaps to the existing supported source scale, so the final edge may move on release. The badge announces that result.

Do not describe this as full free resizing or a flawless whole-editor qualification.
