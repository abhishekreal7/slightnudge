# Unified editor, stages 1–2

Branch: `ui/unified-editor`. No workspace commit or push. No repository files deleted.

## Implementation

One optional-project route: `/editor` and `/editor/<project-id>`, implemented by `app/editor/[[...project]]/page.tsx`.

- `view=full` is the default. It uses the existing unscaled, full-page presentation.
- `view=fit` uses the existing CanvasStage wrapper, starting with scale-to-fit. Existing manual zoom controls remain available. The old Studio workflow explicitly selects 100% during its checks; the added migration test separately checks a 2000px viewport at a scale below 1 in fit view.
- Both views use the same window-style controls, panels, EditorWorkspace state, source canvas, drafts and history. This is routing/presentation consolidation, not deletion of the legacy implementation.
- The four editing routes `/studio`, `/studio/window`, `/studio/<id>/edit`, `/studio/<id>/window` temporarily redirect to the canonical route. Project ID stays in the path; repeated, empty and encoded query values are retained.
- Legacy Studio remains available only when the server process has `SLIGHTNUDGE_LEGACY_STUDIO=1` AND the old Studio URL has `legacyStudio=1`. No .env file was changed. Default rollout has the legacy feature disabled.
- The older `/studio/<id>` project/setup page was not one of the four editing endpoints and was not modified.

## State audit

These identities were retained; no storage migration was introduced:

- Draft storage: `slightnudge:studio:continuous-draft:v1`, with `:<repositoryId>` for imported projects. The project-level draft contains file-specific heads through `draftHeads`/`editPath`. The word studio is a compatibility identifier, not a route lookup.
- Write recovery: `slightnudge:write-recovery:v1:workspace` or `...:project:<encoded-id>`, with `filePath`, `sourcePath` and `repositoryId` on the record.
- Pending source edits are validated by project identity and real source path. History summaries filter by project ID and files within the resolved project root. No view/mode/pathname is part of this lookup.
- Legacy responsive layout preferences may still use the old `:setup` suffix; those are viewport preferences, not source drafts or Save history.

The added browser scenario edits in the real flagged legacy surface, refreshes there, navigates to the canonical route, verifies the original preview ID, continues editing, saves, checks file-specific project history after refresh, and performs exact Undo. It also checks source selection geometry within 1px and unscaled full versus scaled fit rendering.

## Test integrity

Existing test sources and their limits were not edited. A navigation-only wrapper reuses `checkSharedInstances` unchanged. It maps old workflow entry URLs to the canonical path and requested view. Studio-style workflows request the inspector open; window-style workflows open it using their existing actions.

The unchanged selection suite is launched separately with a navigation preload. Only fixture navigation is directed to the canonical route; its selectors, assertions, waits and limits are not adapted. Consequently it cannot qualify the embedded editor's selection UI if it still expects the legacy top-level fixture overlay. Failures are preserved rather than converted into passes.

A SHA-256 manifest covers the pre-existing tests and protected engine files. Raw baseline output, exit status, per-round output, git status and diff statistics are retained alongside this report. The working tree was already extensively dirty before this task; global git status/diff includes that pre-existing work.

## Qualification limits

Final outcome: baseline shared-instance workflows 4/4 passed; baseline selection failed. Round 1 main plus its explicitly recorded imported-Fit supplement passed all eight shared-instance cases; rounds 2 and 3 each passed 8/8. All six canonical selection executions failed at the unchanged top-level target lookup. The added migration scenario passed for local/imported projects in both views, including draft ID recovery, Save history after refresh and exact Undo. Routing tests and the application typecheck passed. This does not make the overall matrix green.

Task-relative existing implementation changes: eight files, 50 inserted lines and 20 removed lines, plus two new route/helper files and three new tests/navigation harness files. No file was removed. Global `git diff --stat` reports 54 tracked files, 2658 insertions and 6535 removed lines, including the extensive pre-existing work; it must not be attributed to this task. New untracked files are listed separately in `task-diff-stat.txt` and final git status.

This is not an all-green qualification. See [results](results.md) for exact outcomes and links to raw logs and git status. The baseline selection suite failed at the legacy file-display selector. On the canonical editor it fails earlier at the top-level target lookup, because the editable page is inside the existing source iframe. No existing selector, assertion or timeout was changed to turn this into a pass. Its later cases are unreached.

Earlier attempts are retained as `attempt-1-*`, `attempt-2-*` and `attempt-3-*`. They include an unexplained runtime SyntaxError, browser/process exits during low available memory, and an aborted status capture. These are not passing runs; the SyntaxError's cause has not been conclusively diagnosed. The first attempt's selection preload did not reach the canonical route and is not canonical selection evidence. Later selection logs explicitly record `SELECTION NAVIGATION /editor?...`.

Round 1's main run passed six shared-instance cases and three migration cases, but its second imported fixture setup collided with the first fixture's existing junction. The separate `round-1-supplement-fit` run covers the two imported Fit workflows and imported Fit migration. It does not erase the main run's setup failure. The supplement's generic completion denominator is eight, although only those two cases were requested in that supplement. Later rounds retain the first disposable imported fixture by renaming it before generating the second one; no checkout files are removed.

Not separately verified in this stage: live view-dropdown transitions during a pending draft; first manual zoom selection when switching Full to Fit; concurrent windows; interrupted writes or local-server restarts; two imported projects with identical relative file names; production build and deployment; broad real-project compatibility; accessibility and visual polish across all browser sizes. The state audit and the added migration checks do not substitute for those scenarios.

No files were deleted from the checkout. No .env files or secrets were edited. No commits, staging, pushes or main-branch changes were made. The baseline HEAD is recorded in `00-head.txt`; all work remains on `ui/unified-editor`. [Task-relative diff statistics](task-diff-stat.txt) compare the eight changed existing implementation files with pre-task snapshots; the separate global git diff includes substantial pre-existing changes and omits untracked files.
