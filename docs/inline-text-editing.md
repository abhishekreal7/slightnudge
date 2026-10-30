# Editing at the rendered text size

The local heading no longer becomes a plain single-line input in edit mode. The heading and paragraph both use the same DOM node for display and editing, preserving font family, font size, weight, letter spacing, line height, alignment, width, and natural wrapping.

- Edit text or double-click starts editing directly on the heading or paragraph.
- Native caret movement and text selection remain available.
- Typography controls update the same node without replacing uncommitted wording.
- Enter or leaving the text adds it to the draft; Escape restores its previous wording.
- Ctrl+S includes the active wording and any typography changes in one save.
- Paste inserts plain text, with pasted line breaks normalized to spaces. Composition Enter does not submit the edit.
- A selection change during a text commit is queued until that draft edit completes.
- Empty wording restores the previous value, consistent with the local editor's nonempty-text restriction.

The browser owns the text node while editing, so React rerenders cannot reset the caret or replace typed content. Source operations continue through the existing static-text validation and draft transaction pipeline. This is scoped to the local heading and paragraph; imported previews and other text targets retain their existing editing path.

Verification: `npx tsx test/review-consent.browser.ts --inline-text --gates` uses a disposable application/source copy. It checks typography and geometry equality, native caret editing and Undo, Escape, live formatting, text plus typography Save, saved batch Undo, paragraph editing, composition, paste, blur/Enter commits, selection handoff, discard, application typecheck, and build. Screenshot: `docs/inline-text-editing.png`.
