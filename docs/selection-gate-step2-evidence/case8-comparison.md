# Case 8: original versus iframe harness

## Identical specification

`selector: 'section#features div.mt-12.grid', clickPosition: { x: 2, y: 2 }`.

Expected: `Features.tsx:14:div`, `allowed`. Neither original file nor either 30-case expected-result list was edited. Both expected-list diffs are empty; see `expected-list-proof.json`.

| Step | Original `test/m0-regression.test.ts` | First iframe copy | Corrected new harness only |
| --- | --- | --- | --- |
| Surface | Direct preview, viewport 1440 × 900 | Real legacy Studio iframe, source viewport 1200 px, auto-fit | Same real editor surfaces |
| Entry wait | `goto(..., {waitUntil:'domcontentloaded'})`, then `waitForSelector('section#top')` | Same load event, then `[data-source-ready="true"]` | Same as the first copy |
| Locator | `page.locator(s.selector)` | `frameLocator(...).locator(s.selector)` | Unchanged iframe locator |
| Between cases | No selection-clear action | `page.keyboard.press('Escape')`, without awaiting cleared state | Scroll, Escape, then wait for selected-source to become empty |
| Scroll | `locator.scrollIntoViewIfNeeded()` | Same method | Same method |
| Case 8 click | `locator.click({position:s.clickPosition})` on an unscaled preview | Same numeric offset on a CSS-transformed editor canvas | Convert the original source CSS offset by measured rendered/source scale, then `locator.click({position})` |
| Other cases | `locator.click()` for the default centre | Same default centre | Same default centre |
| After click | Read requested locator's attributes; call `inspectElement` on them | Wait for nonempty editor `data-selected-source` | Wait for editor `source-selection` or `selection-refused`; verify actual selected source identity |
| Missing selection | Not tested | Uncaught default 30000ms timeout aborts suite | Same 30000ms wait, recorded as `MISSING-TARGET`; continue |

The original does not verify which source target the editor selected. Both original M0 suites passed in the previous gate; their passing locator-based inspection did not establish real editor hit-testing.

## Failing-state observations

The diagnostic replays cases 1–7, then the original failing iframe click for case 8. Evidence: `case8-diagnostic.log`, `case8-diagnostic.json`, `case8-pointer-events.json`, `case8-before-click.png`, `case8-after-click.png`, `case8-parent.html`, `case8-iframe.html`. DOM snapshots omit scripts, hidden fields, and token/nonce/secret attributes.

- Previous selection: `Features.tsx:13:122:h2`; after Escape: no selection. State from case 7 was cleared.
- Source grid rect: x=40, y=1061, width=1120, height=230 CSS px.
- Iframe scroll: x=0, y=0; viewport 1200 × 3749 CSS px. The intended point is inside the viewport.
- Iframe rendered rect: x=578.84375, y=48, width=234.30249, height=732 px. Scale is about 0.19525.
- Grid rendered rect: x=586.65625, y=255.15625, width=218.6875, height=44.921875 px.
- Intended inside-frame point: (42, 1063). `elementFromPoint` returns `div`, empty id, classes `mt-12 grid gap-4 md:grid-cols-3`, mapped to `Features.tsx:14`.
- Parent `elementFromPoint` at the transformed intended point (587.04434, 255.55295) returns the actual-project iframe. No editor toolbar or overlay was found intercepting this point. Screenshots show the cleared state.
- Actual failing `pointerdown`: (50.22363, 1071.17969), on `article`, empty id, classes `rounded-3xl border border-slate-200 bg-white p-7 transition-shadow hover:shadow-lg border-emerald-200 bg-emerald-50/70`, mapped to `Features.tsx:16`.
- Editor message: `selection-refused`, reason: “This source element has several rendered instances. Select a unique element to edit safely.” No selected-source signal followed.

At this transform scale, the unconverted 2 px automation offset became about 10.2 source CSS px. That changes the hit from the exposed rounded corner of the grid to its repeated article child. This is a harness coordinate-conversion problem, not proof that the grid cannot be selected, and not stale selection or a toolbar interception.

## Corrected-click proof

Evidence is retained separately in `corrected-click.log` and `corrected-click/`.

Using the same source specification (2,2), converted to about (0.3905,0.3905) outer-page pixels, produced `pointerdown` (41.97803,1062.93408) on the expected grid div. The real editor selected `src/components/sections/Features.tsx:14:9:div`. No product source change was made. The original 2 px logical click position was preserved.

This rules out the earlier blanket product-can't-select conclusion for case 8. It does not claim that other selections or scales have passed; those are recorded by the separate matrix runs.
