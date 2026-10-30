# Responsive editing

The toolbar separates **preview width** from **edit scope**. Device buttons choose convenient preview widths; the numeric field accepts 240–3840 CSS pixels, including widths wider than the editor window. Custom widths do not retain a misleading device-preset label.

**All sizes** edits the base utility. A named project breakpoint edits that breakpoint and larger screens, while preserving the base and other breakpoint tokens. Larger breakpoints can override a smaller scope, matching the project's own CSS cascade. Text content is shared across sizes.

Choosing a breakpoint opens its actual starting width. If the preview is later narrowed below that scope, a **Show [scope]** control returns to the appropriate width. Attempting an edit outside its active media query is refused without changing source or leaving a visual draft change.

Breakpoint discovery uses the project's Tailwind compiler and theme/configuration, rather than hardcoded Tailwind defaults. Supported scopes are named, simple minimum-width screens. Custom names, changed values and removed defaults are respected. Raw, maximum-only and compound queries, container-query scopes, and combined responsive/interaction-state editing are outside this implementation.

For `em`/`rem` media queries, the preview reports the browser's initial font size. Width labels and scope selection respect that preference, independently of a custom document-root font size.

## Correctness and recovery

- Preview CSS compiles the edited element's complete class set in native compiler order. Editor-owned, zero-specificity source markers isolate that CSS to its subject, preserving higher-breakpoint precedence and other elements sharing utility classes.
- Each complete style revision replaces the previous draft CSS; superseded rules and theme defaults do not accumulate.
- Rejected previews restore both the original classes and the preceding draft stylesheet.
- Newly used Tailwind 4 theme variables are available during previews. Supplemental defaults preserve existing project theme values and are discarded with the draft stylesheet.
- The browser verifies the project's media query and rendered property before accepting a responsive gesture.
- Computed-value verification records its viewport width so changing the preview does not compare unrelated responsive states during Save verification. Source classes and structural mappings remain verified.
- Draft Undo/Redo, explicit Save, exact source Undo and refresh recovery retain responsive edits. Preview width/scope preferences are stored per project.
- A draft retains its own viewport metadata, and a retained historical Save checkpoint cannot overwrite newer preview preferences. The imported setup view uses separate preferences from the editing window.
- Configuration discovery refreshes imported theme CSS and Tailwind 3 configuration. Responsive preview responses refresh the available scope metadata, including when a scope is removed.

Imported projects now require source adapter protocol 6. Earlier adapters report an upgrade requirement before accepting editor commands. Responsive scope editing is available in imported Studio and the editing window; the imported project setup/source inspection view retains its viewport previews. The centered Move control keeps its existing appearance and remains available with All sizes and the Default interaction state. See `imported-canvas.md` for canvas viewport limits.

## Qualification

- `npm run test:responsive`: compiler and browser cascade checks, real editor flow, application typecheck and build.
- `npm run test:responsive-imported`: real separate localhost project, responsive edit, mobile inheritance, refresh, Save at another width and exact Undo, alongside the existing imported-window editing workflow.
- `npm run test:responsive-tailwind3`: installs pinned Tailwind 3/PostCSS packages with scripts disabled in a disposable directory; verifies custom/removed/raw/max-only screens, actual browser cascade, isolated previews and refreshed configuration.

Evidence: `docs/responsive-editing-qualification.log`, `docs/responsive-imported-final.log`, `docs/responsive-imported-qualification.log`, `docs/responsive-tailwind3-qualification.log`; screenshots include custom-scope, mobile-draft and imported-window views.
