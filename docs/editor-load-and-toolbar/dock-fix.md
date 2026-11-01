# Dock obstruction fix

The baseline fixed dock box was `(226.03125,836,987.9375,48)` at viewport 1440×900, z-index 90 and pointer-events auto. The historical point `(565,848)` lies inside it. The new reproduction's badge center was `(565.2734375,842)`, also inside its box; parent hit testing returned the dock header rather than the iframe. This reproduces a real content obstruction without claiming identical font/layout timing across captures.

Changes are confined to CSS and `useWindowDock` presentation behavior:

- The dock container has pointer-events none; only button/link/input/select/textarea/role-button controls opt back into pointer events. Background and spacing no longer intercept page clicks.
- Its groups use wrapping flex layout with intrinsic height. The former three-column grid put the fourth group outside its fixed 48px box, defeating box-only collision checks. Every control now participates in the measured dock rectangle.
- The dock observes the already-rendered selection rectangle, scroll/resize and layout mutations. On collision it chooses the nearest free above/below/side band within the viewport. It does not change source selection or source geometry.
- If a selection fills the viewport so no band exists, the dock yields by becoming hidden until a free band or cleared selection exists. Escape still clears selection. This is an explicit behavior, not a claim that an overlapping rectangle can always be placed inside a fully occupied viewport.
- Existing drag, keyboard placement and reset controls remain. Avoidance is scheduled after drag release.

New browser test: `test/editor-toolbar-obstruction.test.ts`.

- `obstruction-before-dock.log/json/png`: exit 1. With the Layers fix present but old dock unchanged, pointer-events is auto, the dock overlaps the selected footer, and the old-position content click does not select the badge.
- `obstruction-after-dock.log/json/png`: initial narrow test exit 0, but visual inspection subsequently found the overflowing fourth group. This is superseded evidence, not final qualification.
- `obstruction-before-overflow.log/json/png`: tightened test exit 1. It proves that controls escape the fixed-height box and can overlap the selected footer even when the box alone clears it.
- `obstruction-after-final.log/json/png`: final layout/control geometry and content-click checks pass, but a hydration page error makes this run non-green. The complete error is preserved; it is not counted as a passing workflow.
- `obstruction-after-cold.*`: exit 0. All seven tightened checks pass, including every interactive control contained by the dock box, the dock and controls outside the selected footer, a native click selecting the badge at the old dock position, and zero page errors.

The padding sample near the rounded corner passed even on the baseline because that point lay outside its rounded shape. It is not offered as proof of the original obstruction; the actual badge-center hit and failed content click establish it. The computed pointer-events assertion and native content click verify the change.

Initial `obstruction-before` and initial text-label-based Layers test attempts are preserved as exploratory evidence, not substituted for the corrected source-based before/after runs. No existing tests or expected results were changed.

The first matrix attempt used the initial overflowing layout. It was intentionally interrupted when visual inspection exposed the issue, before any product change was copied into that running lab. Its raw output/status and tested-source snapshots are preserved under `selection-initial-overflow/`. It is not substituted for the final three-round matrix in `selection/`.
