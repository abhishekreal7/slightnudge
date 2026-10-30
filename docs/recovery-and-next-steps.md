# Recovery audit and next steps

> **26 October 2026, source canvas:** [Shared source rendering](unified-source-canvas.md) replaces the local handcrafted page. The latest qualification scope and remaining route, production and layout boundaries are recorded there. Earlier renderer descriptions below are historical.

> **26 October 2026:** [Continuous local drafts](continuous-draft.md) replace the per-gesture review lock in the local Studio. Gestures accumulate, draft Undo/Redo and refresh recovery are available, and one Save writes the combined revision. Imported previews retain explicit review; broader renderer and conflict-resolution gates remain open. Earlier reports below describe the previous workflow.

> **Current product priority:** direct manipulation. [Centered drag movement](centered-drag-move.md) implements and tests the requested selection design and local heading/paragraph dragging. [Snapped resizing](direct-manipulation.md) records the preceding slice. Broader source-attached geometry, imported-project movement and parent-aware rearrangement remain next.

> **Latest work, 25 October 2026:** [Refresh recovery and checkpoints](m0-tab-recovery.md) records the new tab-local reference, receipt verification after reload, real-API browser tests and remaining limitations. [Exact-edit Undo recovery](m0-undo-recovery.md) and [Move control](studio-move-control.md) record earlier slices. Results below remain historical. The next major product step is one source-rendered canvas; M0 still has ordinary preview restoration, imported reload qualification, conflict/repair UX, timing, broader qualification and independent review gates.

25 October 2026. Local branch: `codex/source-sync-recovery`. This report distinguishes saved changes from unfinished verification; a failed or disconnected run is not proof that files were lost. No commit, push, or deployment was performed.

## What the audit confirmed

- The working tree contains the recent Projects redesign, scoped typography styles, Studio resize work, review safety work, and experimental live-project canvas. These changes remain uncommitted. No reset, commit, push, or deployment was performed.
- The local application responds at `http://127.0.0.1:3000/workspace` (HTTP 200).
- Workspace regression: **9 browser cases passed** on a disposable copy. Its existing import API was mocked for these interface checks; this is not evidence of a successful real import.
- Source bridge regression: **21 cases passed**, covering preview ownership, verified styles, discard, external DOM changes, repeated runtime markers, missing utilities, and prevented form submission in editing mode.
- A fresh real-source run reproduced the unfinished refresh problem after Undo. The exact source restoration passed before the live-preview connection check timed out. This is a synchronization failure, not evidence that the source edit was lost.

## Repair under verification

The experimental live-project canvas previously gave each refreshed page only two seconds to announce readiness. It could start a replacement navigation before a slow Next.js development rebuild finished. It now gives that navigation a bounded readiness window, then verifies the expected class or text in the document before retrying. Editing remains blocked if the source revision cannot be confirmed.

The refresh strategy waits for readiness before checking the revision, then requests a fresh document if a ready page is still stale. It makes at most five attempts within a 30-second recovery budget, with increasing delays between attempts so slower public projects have time to compile. This avoids spending repeated checks on unchanged old HTML. The earlier delayed-refresh implementation passed 7 real-API checks, typecheck and build (`recovery-refresh-confirmed.log`); the final backoff variant is being rechecked separately. A polling experiment showed the same stale document behavior, was not promoted into the real adapter, and its test-only option was removed.

A regression deliberately delays refreshed iframe documents by six seconds. The source expectations remain unchanged: Preview must not write; Apply must change only the intended literal; Undo must restore the exact original bytes; the actual page must render the corresponding values.

This delayed-refresh regression now passes **7 real-API checks** (`recovery-slow-refresh-trace.log`). The generated SaaS benchmark completed **30 candidates: 20 allowed, 10 refused, zero wrong targets**, with exact Apply bytes, actual rendered styles, and exact Undo (`recovery-source-sample-release.log`, `recovery-source-sample-results.json`). Its 10 refusals cover repeated list content and conditional classes, rather than allowing an ambiguous edit. Application typecheck and build both exited 0. A separate current-code workspace run also passed 9 UI checks plus typecheck/build (`recovery-final-gates.log`).

The final refresh implementation was then rerun on all 30 generated-app candidates with the same result: **20 allowed, 10 refused, zero wrong targets** (`recovery-current-source-final.log`, `recovery-current-source-results.json`). Final delayed-refresh, typecheck and build evidence is `recovery-refresh-confirmed.log`.

An additional regression exposed a repeated source marker reaching preview before a later refusal. The bridge now refuses it before preview or Apply, with: “This source element appears more than once on the page. Editing shared instances is not supported yet. Nothing was changed.” The refusal test failed first, then passed after the guard was added.

Additional checks: 3 Apply-race cases and 3 adapter-wrapper regression cases passed. These are scoped checks, not a claim that every archived test passes.

Thirty-candidate results are written incrementally with an explicit `complete` flag, so an interrupted report cannot look like a finished benchmark. Elements whose children cover every exposed click point are reported as refused; they are not counted as successful physical selections.

## Recommended next milestones

1. **Finish the editing foundation.** Pass real Preview / Apply / reload / Undo workflows, confirm zero wrong targets, test stale source and interrupted connections, and get independent review. Preserve the latest Studio shell. Do not advertise the experimental imported-project route as ready before these checks pass.
2. **Make the sample use the same real renderer.** Replace the handcrafted Playground representation with actual source rendering while preserving its interface. This removes a second source of truth and prevents the sample from drifting away from its file.
3. **Complete everyday editing.** Show actual values, clear disabled-control reasons, and precise breakpoint/state scopes. Verify text, type, spacing, layout, colors, borders, and resizing in connected projects before increasing the control count.
4. **Edit literal props at the correct instance.** A prop is a value passed into a component, such as a hero title. Edit its literal call site; ask which instance when ambiguous, and refuse computed or fetched values.
5. **Add safe structure and insertion.** Start with a read-only element tree, static sibling reorder, editor-only hiding, and basic element insertion. Introduce grouping and component extraction only with one reviewed, undoable transaction across every affected file.
6. **Expand compatibility and run a private beta.** Vite source mapping remains unsupported. Estimate: **M** for a development adapter, source markers, session bridge, compatibility checks, and a separate real-project regression set. Onboard a small founder group and measure successful edits, refusals, recovery failures, and time saved before expanding animations or external imports.

## Compatibility measured in disposable projects

These are installed versions from the recorded clones, not promises about future upstream releases. Installation of the adapter is distinct from passing the full editing workflow.

| Project | Next.js | Tailwind | Lockfile | Adapter | Current qualification |
| --- | --- | --- | --- | --- | --- |
| Generated SaaS, separate section components, props, mapped list and conditional class | 16.4.3 | 4.3.3 | Uses existing installed dependencies via junction in the disposable copy | Installed | 30 candidates: 20 allowed, 10 refused, zero wrong targets; exact source/render/Undo verified |
| bennyjoel/nextjs-saas-starter-lite | 14.2.35 | 3.4.19 | package-lock.json generated in clone | Installed | NOT QUALIFIED by the recovery rerun: reconnect confirmation timed out after exact source Undo. Only 2/30 candidates recorded (1 allowed, 1 refused); incomplete, not a pass. Prior 24/6 result is historical. |
| EdgeOneDev/saas-starter | 14.0.4 | 3.4.17 | package-lock.json | Installed | `/en` landing route: 30 candidates completed, 7 allowed, 23 refused, zero wrong targets; allowed edits passed source/render/Undo (`recovery-public3-backoff.log`) |
| ShadcnDeck/chatdeck-shadcn-saas-landing-page-template | Not qualified | Not qualified | Not qualified | Not installed | Previously skipped because no root LICENSE was found |
| Vite + React | Unsupported | Detected separately per future project | Project dependent | Not implemented | Do not offer source editing |

A fresh EdgeOne clone failed with `Could not resolve host: github.com`. A subsequent read-only `git ls-remote` succeeded, confirming intermittent connectivity. The retry uses another disposable clone; no original project was changed to work around it.

The public-template results do not close the real-project gate: the bennyjoel recovery rerun remains incomplete. Keep the experimental imported editor unpromoted and repair/retest that reconnect path before claiming broad support or starting the next feature milestone. EdgeOne's refusal count includes covered, moving and unavailable elements; it is not 23 successful editor selections.

Across the two completed runs there are **60 candidates: 27 allowed, 33 refused, zero recorded wrong targets**. Do not label this as a completed 90-candidate qualification. The five largest recorded refusal reasons are: covered click area (9), repeated list instance (6), unstable/moving element (4), conditional class call (3), and variable-built class (3).

Latest current-code gates: `recovery-current-final-gates.log` records 9 workspace browser cases, application typecheck exit 0 and application build exit 0. These gates do not turn the incomplete public-project run into a pass.

## Local demo and changed files

The current application is running at `http://localhost:3000/workspace`. If it is stopped, run `npm run dev -- -p 3000` from `C:\dev\vibecheck`.

The final health check found port 3000 had stopped. It was restarted as a hidden local development process; both `/workspace` and `/studio` then returned HTTP 200. No deployment was performed.

For a safe clickable Studio demo, run `node --import tsx test/review-consent.browser.ts --m1 --demo`. It opens a disposable copy: select the heading, toggle Bold, review Before/After, Discard; repeat and Apply to code, then Undo. Source writes affect that copy only. The experimental imported-project interactive demo flag is now explicitly refused before it creates a workspace, rather than opening a preview whose project process has already stopped. Its refusal regression passes. Imported live-source workflows are tested headlessly and are not promoted through the normal setup screen yet.

This recovery changes the live-project canvas refresh logic and the compiled source bridge's repeated-marker guard. Test changes add the delayed-refresh regression, explicit compatibility readiness, physical-selection/report diagnostics, unavailable-element refusals, and a guard for the unsupported demo mode. The latest workspace styling, Studio layout, original fixtures, authentication, and billing were not changed by this recovery. The existing unrelated fixture edit remains preserved.

## Limits and UNVERIFIED items

- This audit can confirm saved files and current test results. Without a prior snapshot of every unfinished buffer, it cannot prove that no unsaved edit was lost in an earlier disconnected session.
- The 30-candidate workflows exercise the landing route in document order. They are not broad coverage of every route or every inspector control. Selection-stage refusals (hidden, covered, moving, or missing elements) must be distinguished from source-editor refusals when interpreting counts.
- A connection lost after the server writes but before the response arrives needs an explicit transaction-status recovery test before claiming complete network fault tolerance. Do not automatically retry an uncertain write. This remains UNVERIFIED in this recovery.
- The default Playground is still a handcrafted representation. Its migration to the same source renderer as imported projects is a separate milestone.
- Vite mapping, literal-prop call-site edits, arbitrary styling imports, and atomic multi-file structure edits remain outside this recovery. No broad “edit anything” claim is justified.
- The version table records installed dependencies. It does not certify that these are the globally latest releases today.
- Docker's CLI is installed, but `docker version` cannot connect to `dockerDesktopLinuxEngine` because the engine pipe is absent. These checks run disposable local processes; the Docker import path remains UNVERIFIED. The executable was verified at the user's per-user installation. To start it in PowerShell, run `Start-Process -FilePath 'C:\Users\abhis\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe' -WindowStyle Hidden`, wait until Docker reports its Linux engine is running, then run `docker version`. No Docker settings were changed by this audit.

## Review gate and cleanup

Run the independent reviewer prompt in a fresh session before approving this foundation milestone. Passing a scoped browser test is not proof that every historical test or arbitrary project works.

A previous automatic approval review rejected deletion of `C:\Users\abhis\AppData\Local\Temp\sn-review-consent-6e9G9A` with the reason “blocked by policy.” That deletion was not bypassed. This disposable path may require manual cleanup.

The successful EdgeOne run also reported incomplete automatic cleanup at `C:\Users\abhis\AppData\Local\Temp\sn-review-consent-DCouMI`; its remaining path was confirmed to exist. Delete this disposable directory manually. No original project or fixture is inside it.

The founder's newer product direction is recorded in [product-interactions-direction.md](product-interactions-direction.md). Proposed capabilities are explicitly separated from delivered functionality; the reliability gate still comes first.
