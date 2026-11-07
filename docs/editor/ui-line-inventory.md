# UI line inventory

Read-only Git/source inventory; no live server or other worktree was contacted or changed. Facts below are CONFIRMED from committed source, not screenshots or assumptions about uncommitted work.

## History and divergence

stage/S1: `7a4c44a9b8a1c1b08d0c8d15541dabb1900636df`. Sprint: `7944e2703772bf154ce1c8564c85169f833d5d1e`.

Both requested merge-bases are `955007d231d7da7783c6d3222ea2942be03eafb4`. stage/S1 versus feat/editor-sprint1 is 79 versus 12 unique commits; versus feat/studio-full-controls it is 79 versus 0. These counts refer to the captured heads.

None of the requested sprint commits is an ancestor of stage/S1:

| Sprint commit | Purpose | In stage/S1 ancestry |
| --- | --- | --- |
| 1b93d2b | Write-time CAS | No |
| 50e2d69 | Overlay placement/cleanup | No |
| fa2d69c | Apply and shortcuts | No |
| 6cadd06 | Dynamic real-state guard | No |

Absence by ancestry does not prove absence of equivalent behavior. Equivalence is UNVERIFIED.

## UIs from source

The sprint `/studio` is a monolithic client page with a built-in sample canvas, layers and inspector. `/studio/[repoId]` is a separate imported-repository page using StudioLayout and an iframe bridge; source-overlay behavior also lives in SlightNudgeOverlay.

The newer `/editor/[[...project]]` server route supports zero or one project segment, full/fit view and initial inspector/layers query state. It uses EditorClient, which mounts EditorWorkspace after a client effect. EditorWorkspace owns the unified editor; EditorSurface chooses CanvasStage or direct window presentation. SourceProjectCanvas supplies source-backed content. The newer `/studio` redirects into `/editor` unless the explicit legacy environment/query switch is enabled. This is a different routing and state architecture.

Committed literal test IDs found in the inspected entry/main canvas files (dynamic IDs and child components are not an exhaustive selector catalog):

- `HEAD:app/studio/page.tsx`: `editor-canvas`, `editor-drop-indicator`, `editor-toolbar`
- `HEAD:app/studio/[repoId]/page.tsx`: none
- `HEAD:components/slightnudge/SlightNudgeOverlay.tsx`: `editor-drop-indicator`, `editor-target`, `editor-toolbar`
- `stage/S1:app/editor/[[...project]]/page.tsx`: none
- `stage/S1:app/studio/page.tsx`: none
- `stage/S1:components/slightnudge/EditorWorkspace.tsx`: none
- `stage/S1:components/slightnudge/SourceProjectCanvas.tsx`: none

## Engine differences and integration risks

68 engine/API paths differ: 4304 insertions, 331 deletions. Full path lists and per-file stats are in the evidence JSON below. This includes non-editor application APIs, so transplanting the entire tree would widen scope substantially.

- Auth: stage/S1 requires Origin even with a valid token, removes the test session-token override and the reorder-safety process-name bypass. Sprint tests relying on that old behavior need deliberate compatibility review, never weakening auth to make them pass.
- History/atomic writes: stage/S1 adds source-operation locks, unfinished-group recovery guards, history mutation wrappers, operation/result identities, additional record fields and altered retention/write handling. These overlap the sprint CAS changes; blindly replaying a history file risks losing safety behavior or recovery metadata.
- API/client: stage/S1 adds Apply/Undo status routes, draft-view/change-set/history/responsive routes and recovery-aware client operations; preview supports additional edit kinds. Consumers and response contracts differ.
- AST/containment/source mapping: ast-nudger, repository-store, source adapter and loader differ; source-group/journal, source-paths, component ownership and bridge modules are added. New history metadata must preserve recovery information when eventually integrated.
- Tailwind: stage/S1 adds scoped project compilation and responsive-scope discovery using the existing design-system cache, with explicit invalidation in discovery. Cache identity/safety and equivalence to this branch remain unverified by tests here.

Recommendation: **(c) keep both until the owner chooses**. Preserve the newer UI line and this sprint's proven changes. If the owner chooses the newer editor, (a) is the likely integration direction, but reconcile engine behavior and tests individually on a new authorized integration line; do not blindly replay these divergent files. Bringing its entire UI into this branch (b) would also require its bridge, recovery and API contracts. No merge/rebase or deletion has been attempted. No safety equivalence is claimed.

The complete requested worktree listing, thirty-commit log, merge-base stats, engine changed-file list, per-file stats and engine diffs are saved as [raw inventory](evidence/amendment5-inventory.json). Metadata-only changed-file stats include tracked artifacts; their content was not opened. The source inventory does not read developer history, fixtures or environment files.

## stage/S1 last thirty commits

```text
7a4c44a (stage/S1) fix(editor): keep the resize triangle upright at both corners
4d256e2 fix(editor): refine resize cursor size and corner direction
9110807 fix(editor): restore the custom resize cursor
06db13f refactor(editor): move draft updates off the toolbar
fd74045 fix(editor): hide routine draft count from toolbar
dd30309 fix(editor): distinguish preview width from edit scope
d378c1d fix(editor): defer page discovery until the canvas connects
7b13fdb fix(editor): hide idle saved status from the toolbar
c1ed508 fix(editor): load breakpoint metadata after preview connects
a34b9e2 refactor(editor): compact the floating toolbar
3f94b37 fix(editor): place the caret when inline text editing starts
b2ce94d fix(editor): reserve recovery dialog for actionable issues
4044641 fix(editor): show zoom only in Fit canvas
27820c8 fix(playground): open the editor directly and show loading progress
fcf4b4e test(gate): prepare shared warm-up without duplicate editor requests
d70a1e1 test(gate): log shared preview readiness phases
b7ae545 fix(preview): show connection progress and offer retry
683c204 fix(gate): release servers after failed shared warm-up
35e7b18 fix(gate): route bounded workflow evidence to the program stage
dc49a02 (program/integration) docs: record program preflight and preserved work
5a141b2 (tag: pre-program-20261104-5a141b2, docs/component-focus) docs: specify component focus and variants
f95411a (codex/fix-canvas-move-scale) fix(dev): exclude generated worktrees from application source scans
6aa5daf docs: distinguish initial readiness from post-Save reload timeouts
ec3973c test: capture preview readiness before existing deadline
c3cd4d5 docs: record pages manifest reproduction and cold-start qualification
2cb14ad core: publish pages manifests atomically
63152ea docs: record movement and history reliability evidence
d6adcb3 test: tolerate iframe reload while checking restored geometry
72ca1e5 test: prepare zero-offset fixture only in disposable movement runtime
0ee55f7 test: select the actual 75 percent zoom option
```
