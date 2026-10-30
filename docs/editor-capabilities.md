# Editor capability boundaries

This describes the current implementation, not the complete launch roadmap. Qualification status and remaining work are maintained in [saas-completion-tracker.md](saas-completion-tracker.md).

| Workflow | Current boundary |
| --- | --- |
| Edit the real local site | Local Next.js development preview, embedded in a separate editing window. Browse mode restores normal page interaction. |
| Edit text in place | Static JSX text and supported static button/link labels; typography stays on the real element. Prop-driven, repeated and dynamic text must be changed in source. A static label does not require a `className`. |
| Edit appearance | Supported literal Tailwind utilities, verified against the project's compiler and rendered result. Conditional/computed class expressions remain protected. |
| Move an element visually | Centered Move control, including containers and their contents, in Default scope. Custom transforms and animations that cannot be preserved are refused. Imported projects require the current adapter. |
| Rearrange siblings | Direct source siblings, preserving CSS order constraints. Component roots and generated children require source changes. |
| Move between containers | Destination picker, at the end of a static container in the same component and source file. Empty self-closing containers are supported. Form/component-context changes are refused. |
| Adjust layout | Grid columns/gap and flex direction/wrapping/alignment/distribution. Authored tokens and computed values are distinguished. |
| Keep editing | Supported changes across up to 16 files on one page share a chronological draft Undo/Redo history and refresh recovery, in both imported Studio and the separate editing window. |
| Imported canvas | One measured full-page preview with Fit, zoom, pan and continuous source drafts. Vertical viewport units use a 720px canvas design viewport; native viewport behavior is available in the separate window. Protocol 6 required. See [imported-canvas.md](imported-canvas.md). |
| Save and Undo | Explicit grouped source Save/Undo with durable journals, conflict checks, member ownership, idempotent receipts, and explicit interruption recovery. Source files are replaced individually; a multi-file save is a recoverable transaction. |
| Change history | On-demand dialog shows draft/redoable gestures and up to 50 grouped save receipts, including undone and attention states. Reading history never resumes source writes. Older arbitrary rollback remains unsupported. |
| Responsive editing | Exact preview widths and project-defined minimum-width edit scopes, including custom names. Base/larger-screen cascade, draft recovery and Save/Undo are verified. Raw/max-only queries, container queries and combined interaction scopes remain unsupported. |
| Project compatibility | Next.js source adapters; the current local/new imported workflow is qualified primarily on Next 16 and Tailwind 4. Historical Next 14/Tailwind 3 results do not qualify every new feature. Vite and other framework adapters remain unsupported. |
| Adapter lifecycle | Protocol mismatch detection and generated-file integrity checks. Modified files, missing backups, replaced adapter folders and unknown folder contents are preserved. Older adapters without integrity records require manual migration. |
| Compatibility guidance | Collapsed project-setup report separates installed versions from declarations, identifies router structure, and explains source/style limits. Metadata detection does not certify runtime editing. See [project-compatibility.md](project-compatibility.md). |

Local filesystem editing APIs are disabled in the production web server. A hosted launch therefore still needs a completed local-companion connection/deployment flow; a successful production build alone does not make imported-project editing available in the cloud.

No live account, payment or deployment integration is claimed as verified until the intended Supabase project, payment sandbox and hosting target are configured and tested.
