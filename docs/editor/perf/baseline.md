# A1 baseline — incomplete

Amendment 4 is saved verbatim in BRIEF.md. This checkpoint measures only `readHistory()` in the Node engine at revision `f2ed60161d4f0381573cc3e50f2628210292afe9`. It does not measure the current product UI, dev/production HTTP, Apply, Undo or input latency. No product optimization or instrumentation has been added.

## Synthetic library measurement

20 attempts per cell; nearest-rank median and p95, milliseconds. Records use the exported EditRecord shape, deterministic synthetic snapshots and one existing synthetic target path. No developer record contents were read. Histories are written incrementally in an owned temp directory outside the project, then removed. Setup/generation is excluded from timings. Successful reads assert the exact record count and no missing targets. Failed reads are counted separately and never described as successful latency.

| Source lines | Records | History bytes | Successful / attempts | Median ms | p95 ms | Error |
| --- | --- | --- | --- | --- | --- | --- |
| 20 | 0 | 4 | 20 / 20 | 0.23 | 0.46 | {} |
| 20 | 100 | 315892 | 20 / 20 | 30.28 | 62.20 | {} |
| 20 | 500 | 1579892 | 20 / 20 | 421.61 | 3835.52 | {} |
| 20 | 2000 | 6320892 | 20 / 20 | 1850.78 | 5190.72 | {} |
| 2000 | 0 | 4 | 20 / 20 | 0.21 | 0.32 | {} |
| 2000 | 100 | 30381492 | 20 / 20 | 110.30 | 125.96 | {} |
| 2000 | 500 | 151907892 | 20 / 20 | 1425.31 | 3011.91 | {} |
| 2000 | 2000 | 607632892 | 0 / 20 | 1702.38 | 2192.90 | {"ERR_STRING_TOO_LONG": 20} |

CONFIRMED: readHistory cost grows with this synthetic workload. The largest cell is about 608 MB; all twenty attempts failed with ERR_STRING_TOO_LONG. That is a library outcome, not an end-to-end editor result. The initial harness tried building the entire JSON string and itself failed; incremental generation removed that harness limit and exposed the engine outcome. Both raw runs are preserved.

UNVERIFIED: how much of actual Apply/Undo latency is history work, or which stage dominates. h1 is supported only for the read-history component; full h1 and h2–h9 remain UNVERIFIED. A ranked top-three bottleneck list would be premature. Repeated passes show substantial variability; there are no timing gates or claimed A2 wins. The small source has 20 lines, the large source 2000 lines. All entries deliberately refer to the same file; a many-distinct-path distribution remains unmeasured. No caches, history compaction or changes to persistence were made.

[Machine-readable samples](../evidence/amendment4-history-streamed.json) · [Raw output and protected state result](../evidence/amendment4-history-streamed.txt) · [Initial harness limit](../evidence/amendment4-history-baseline.txt)

## Branch provenance

CONFIRMED: the main checkout is feat/editor-sprint1. Its legacy /studio differs from the newer /editor in the existing stage/S1 worktree at scratch/program/worktree. The latter was served on port 3102 for the owner; the former on port 3100. These live servers were not used for measurements. This library checkpoint must not be attributed to stage/S1 or to its newer interface. No branch was merged, rebased, switched or deleted. No old UI files were deleted. Reconciliation with the newer editor remains pending; the old route is not the intended UI target for Amendment 4.

## Resume A1

The remaining A1 work is required before A2–A4 optimization conclusions: browser CDP trace and metrics, longtask/event observers, drag rAF samples, dev React Profiler/render counts, bridge/network volume and bytes; request-local server stage timings with tests proving instrumentation inert in production and unset; 20-run scenario matrix over both modes, file sizes and history counts; separate cold/warm verifier results and top-three evidence table. Reproduce the newer editor in disposable sources for its browser measurements, preserving the branch provenance and existing worktree data. Do not benchmark the owner's live workspaces. Five repeat runs of stable results are required before introducing a relative timing gate.

The existing snapshot runner wraps every group. For another library pass use a new output path and evidence label:

```powershell
node --import tsx scratch/editor-sprint1-run-group.ts amendment4-history-next node --import tsx test/perf/history-baseline.ts docs/editor/evidence/amendment4-history-next.json
```

Tests:

```powershell
node --import tsx scratch/editor-sprint1-run-group.ts amendment4-fixtures-next node --import tsx --test test/perf-fixtures.test.ts
```

A1 intentionally exceeds 60 seconds: eight cells with twenty full-history reads each, including a 608 MB synthetic case. CPU values use process.cpuUsage and can be coarsely quantized on Windows. This is an incomplete A1 checkpoint, not completion of the performance workstream. A3 save queue, caches and interaction proofs; B preview correctness; C control design; D remaining sprint parts are pending.
