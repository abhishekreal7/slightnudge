# Inline Layers fix

The bridge already reports both footer badge instances with distinct source callsite traces. SourceLayers' display allowlist omitted `span`, `label`, `strong`, `em` and `li`, despite recognizing their text icons. The fix adds exactly those five tags to the display filter. No source identity, matching, selection dispatch or AST code changes.

New browser test: `test/editor-inline-layers.test.ts`. Corrected source-title locator pins `span`, `src/components/sections/Footer.tsx:2`; both expected instances remain required.

- Before: `inline-layers-before-source.log/json/png`, exit 1, zero badge source entries.
- After: `inline-layers-after-source.log/json/png`, exit 0, two entries; each selects Footer.tsx:2:span and distinct instance traces remain intact.

The first test iteration searched badge display text. Existing labels are generic “Group” for spans, so its initial after attempt still found zero even though source entries existed. Those initial logs/screenshots are retained separately; they are not evidence against the corrected source-based test or counted as passing runs.

Other intentionally excluded nodes remain excluded: unstyled pass-through divs and tags outside the existing supported display allowlist (for example b/i/small/code, lists' structural wrappers, table cells, SVG shape internals and arbitrary custom tags). This small fix restores the five inline tags already recognized by the panel; it does not redesign the whole tree or add mapping capabilities.
