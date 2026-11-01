# Load failure investigation

Baseline commit `24c6259` (`test: selection gate harness`) exists. Work proceeds on `fix/editor-load-and-toolbar`; no merge or push. The checkpoint's full three-entry `git log --stat` is saved separately.

## JSON reads and their inputs

[Every lexical read call with source context](json-read-contexts.md) and [machine-readable inventory](json-read-contexts.json) list 79 locations in editor components, editor/project routes, API routes and `lib/slightnudge`. `JSON.parse(...)` arguments and `.json()` response/request variables are preserved exactly in the contexts. Complete pre-change state-related implementations, including their write code, are in [state-writer-source-before.json](state-writer-source-before.json). Supporting grep inventories include all write/rename locations and API return sites.

| File / call group | What is read |
|---|---|
| EditorWorkspace | Browser workspace-layout preference, responsive preference, per-project draft and recovery data; pages API response; responsive metadata response; draft-view patches. Local-storage parses have surrounding try/catch. |
| SourceProjectCanvas | Imported repository detail/compatibility GET; authenticated preview-check POST result. Both async paths catch errors and set visible connection errors. |
| client.ts | Inspect/component props, edit previews, session authorization, source apply/status/undo/group/history responses. Every exact call is in the inventory; mutation endpoints are not retried as a load-failure workaround. |
| Project management client under app/studio/[repoId] | Repository detail, adapter setup/status, compatibility, source and Docker preview start/status/stop responses. Docker logs are strings in a JSON envelope. |
| ChangeHistory and control components | History list, action/icon inspection and image upload JSON responses. |
| API handlers | request.json(): incoming preview, draft, apply/status, Undo/status, responsive, import, inspect and history mutation request bodies. JSON writers (`NextResponse.json(payload)`) are not mistaken for reads. |
| repository-store.ts:23 | `.slightnudge/repositories.json`, an array of registered repositories. Missing file means empty; malformed JSON throws and repository GET handlers return JSON 500. |
| edit-history.ts:140 | History `edits.json`; corrupted input throws a contextual history error, not an empty history. |
| edit-history.ts:512 / 592 / 626 | Pending preview files during pruning/load, and apply-intent JSON recovery records. Pruning/load may throw; callers/API handlers handle failures. No silent loss of corrupt pending edits. |
| source-group-journal.ts | Group transaction/recovery journal JSON. Invalid/corrupt records refuse recovery rather than guessing a transaction outcome. |
| source-operation-lock.ts | On-disk process ticket records. Partial ticket data is treated as busy, preventing entry to the critical section. |
| studio-recovery.ts | Browser-local recovery record supplied by the editor; invalid data returns the explicit recovery result defined by the existing code. |
| next-source-adapter.ts | Adapter ownership/state JSON, project package manifest and Next version manifest; generated legacy bridge code also consumes API JSON. |
| project-compatibility, docker-preview, icon-library, tailwind-verifier | Project/library package/config manifests, not editor draft state. |
| source-canvas-bridge.ts / instance-trace.ts | Session storage for the preview connection; source instance trace strings attached to DOM nodes. Both validate/catch invalid data. |

There is no separate persistent project-registry JSON in this editor: registered imported projects use `repositories.json`; local pages are discovered by `/api/slightnudge/pages` through filesystem scanning. Docker preview logs come from Docker stdout/stderr and are wrapped in a JSON API response; they are not read from a preview-log JSON state file.

An additional dependency candidate is Next's development HMR reader, `node_modules/next/dist/client/dev/hot-reloader/app/web-socket.js:77`: text WebSocket frames are passed to `JSON.parse(event.data)`. The prior screenshot only showed `JSON.parse` with ignored frames, so this is a candidate, **not an established originating frame**. No installed dependency was modified.

## State publication audit

| State | Existing publication / synchronization | Assessment |
|---|---|---|
| Repository index | `repository-store.ts:98–99`: fixed `repositories.json.tmp`, writeFile then rename; initial read outside an import-wide lock | No fsync; fixed temp name and concurrent read-modify-write can conflict. One writer may rename a temp file another writer still has open. Static risk, not reproduced by read-only GET/load experiment. Left unchanged under the prove-before-fix rule. |
| History / source / pending preview / apply intent | Shared `edit-history.ts:atomicWrite`: unique temp, writeSync, fsyncSync, close, rename with bounded Windows-lock retries; refuses and removes temp if rename fails | Already atomic replacement, no non-atomic fallback. History/source mutations use existing source-operation locks. This investigation does not establish a defect in this write path. |
| Group journals | Existing group journal writer uses the same atomicWrite primitive and transaction/source locks | No write-path modification justified by this load experiment. |
| Process tickets | Choosing ticket initially published with exclusive create and fsync; subsequent ticket update uses temp+fsync+rename | Initial choosing publication can be observed incomplete; readers explicitly refuse as busy. This is a lock record, not a source edit. |
| Browser drafts/preferences/recovery | localStorage/sessionStorage string setItem | Browser API publishes a whole string synchronously; storage access and parsing are guarded by existing recovery/error paths. |
| Adapter setup state | Exclusive-create generated JSON; adapter installation guards setup; read/parse errors refuse adapter state | Setup-time partial/failed installation remains a possible explicit error. Not written by the tested GET/load loop. |

`atomicWrite` is already on the apply/Undo path. No change is being made to it without reproducing a defect. Therefore there is no `core: atomic state writes` commit and no apply/Undo hunk to list.

## API body audit

Repository list/detail GET handlers use `NextResponse.json` for success, not-found and caught failures (explicit 400/404/500 as applicable). Pages GET returns a JSON discovery envelope; directory scans catch filesystem failures. Most mutation handlers parse inside try/catch and return a JSON error response. OPTIONS responses can be bodyless; editor fetch callers do not parse OPTIONS bodies.

Transport interruption, a server process crash, or an aborted fetch can still produce no HTTP response or an incomplete body; application return statements cannot guarantee JSON after the connection is gone. A thrown error outside an application's handler catch may be converted by Next to its error response. This audit does not claim every possible transport failure is valid JSON. The experiment saves status/body size and the actual failing payload for any JSON decode failure. No synthetic empty response or corrupt state was injected and then claimed to reproduce the historical failure.

## Clean-state reproduction and setup correction

The lab is `C:/dev/vibecheck-load-lab-20261101`. It copies tracked application source while excluding environment files and creates a fresh `.slightnudge` registry containing only two copied fixture repositories. No previous edits, pending previews or history are copied; the main workspace state is not used by the browser server. Node modules are junctions to existing installations. One browser/test process is run at a time; preview/server processes are infrastructure, not concurrent suites.

The initial lab server used Next's default hostname with browser URLs on `127.0.0.1`. Next logged blocked cross-origin dev resources and the browser logged invalid HMR WebSocket handshakes. Route screenshots stayed at the server-rendered recovery boot screen. That attempt was stopped and preserved in `reproduction-before.log`, `route-loads.json` and the failure screenshots. Lab servers were restarted with `--hostname 127.0.0.1`; application config was not changed. The complete 50-load experiment is recorded separately under `reproduction-bound/` and `reproduction-bound.log`.

## Process / resource evidence

Initial process and memory snapshots, and snapshots during the single reproduction, are saved with this report. Initially available physical RAM was about 2.4 GiB out of 15.6 GiB; during compilation a snapshot showed about 1.2 GiB available. The prior gate runner awaited each child process exit, and the new runner does too. No old gate suite process was found at task start.

These current snapshots do **not** establish historical resource exhaustion or concurrent tests when `ERR_NETWORK_IO_SUSPENDED` and the 180-second Chromium launch timeout occurred. There is no contemporaneous historical process/RAM dump or OOM event proving either cause. Suspended network I/O is not itself an OOM diagnosis. The historical cause remains unresolved; current successful serial launches cannot retroactively prove it. No user's browser processes were terminated; only this task's reproduction/server processes were stopped for the documented lab setup correction.

## Additional observed hydration failure

`obstruction-after-final.json` records a React hydration page error after development recompilation. Its source-annotated mismatch shows the streamed hidden/Suspense placeholder under `app/layout.tsx:64` versus the resource `<link>` at `components/slightnudge/EditorWorkspace.tsx:2222`. The complete message and stack are preserved. This is not the historical `Unexpected end of JSON input`, and no failing JSON payload was observed in that run.

That test is non-green even though its dock geometry checks pass. A fresh editor-server lifecycle is tested separately without changing layout/selection code to suppress or repair hydration. A subsequent clean run cannot prove this intermittent hydration problem resolved. No hydration-warning suppression, console filtering, widened timeout or silent retry is used in the matrix.
