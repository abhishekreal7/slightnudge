# Full reliability baseline

**Result: FAIL.** One complete sequential coordinator run at `63152eaba7fbd91bb5041c804c70cfe096d3b759` on `codex/fix-canvas-move-scale`. Exit 1; elapsed 3525.11 seconds (58m 45s). The 24 requested workflows produced **7 PASS, 8 FAIL, 5 TIMEOUT, 4 HARNESS-ERROR**. Warm-up rows are additional and excluded from those counts.

Evidence: [raw output](raw.log), [machine-readable results](results.json), [summary](summary.json), [plan](plan.json), [status before](git-status-before.txt), [status after](git-status-after.txt). Each workflow also has a same-named `.log` and artifacts directory. No new product code, tests, expectations or limits changed during this run. No merge, tag or push; no environment files or secrets inspected. Disposable adapters/projects only.

## Selection outcome versus startup reliability

All four selection suites completed their assertions: 120 cases; **0 WRONG TARGET, 0 MISSING-TARGET, 0 selection page errors**. Counts:

| View / suite | Allowed | Refused | Not clickable | Geometry samples |
|---|---:|---:|---:|---:|
| Full regression | 18 | 12 | 0 | 0 |
| Full overfit | 26 | 4 | 0 | 0 |
| Fit regression | 18 | 12 | 0 | 30 |
| Fit overfit | 25 | 4 | 1 | 30 |

Fit overfit case 1 (`div#app-shell`, ShellLayout.tsx:9:div) had no exposed direct click point and was correctly selected through Layers; expected-source assertion PASS. All 60 Fit geometry samples completed; maximum absolute reported offset was **0.0078125 CSS px**. These results do not establish a performance budget or rotation support.

The coordinator correctly marks the four selection workflow rows FAIL despite `testPassed:true`: their editor server had already exposed an empty manifest during warm-up. This is a separate reliability failure, not a selection-target failure.

## Full workflow table

REAL means real API workflow. MOCKED identifies a workflow that includes mocked failure injection; it does not mean every action in it was mocked. An unrun HARNESS-ERROR row has no mutation proof regardless of its planned API label.

| Workflow | API | Result | Seconds | First failure / qualification |
|---|---|---|---:|---|
| selection-full-regression | REAL | FAIL | 84.22 | All target assertions pass; startup empty manifest observed |
| selection-full-overfit | REAL | FAIL | 75.90 | All target assertions pass; same startup manifest |
| selection-fit-regression | REAL | FAIL | 119.73 | Cases/geometry pass; same startup manifest |
| selection-fit-overfit | REAL | FAIL | 152.25 | Cases/geometry pass; same startup manifest |
| shared-local-studio | REAL | PASS | 93.08 | Completed |
| shared-local-window | REAL | TIMEOUT | 120.86 | Waiting for `[data-source-ready="true"]` after `/editor` navigation |
| shared-imported-studio | planned REAL | HARNESS-ERROR | 0 | Shared runtime retired after prior timeout; not run |
| shared-imported-window | planned REAL | HARNESS-ERROR | 0 | Same dependency; not run |
| movement | REAL | PASS | 131.27 | Completed |
| state-and-transitions | REAL | FAIL | 68.00 | m1-interactions-browser.v3.ts:29: response newClassName undefined, expected hover:font-bold class string |
| responsive | REAL | PASS | 130.39 | Completed |
| responsive-imported | REAL | PASS | 165.94 | Completed |
| appearance-layout | REAL | TIMEOUT | 301.03 | Cap reached during imported checks; prior partial assertions do not qualify entire workflow |
| images-local | REAL | FAIL | 156.40 | advanced-image-browser.v3.ts:34: source-ready wait timed out at existing 120s limit, before image editing |
| images-imported | REAL | PASS | 289.03 | Completed |
| component-actions-local | MOCKED | TIMEOUT | 301.45 | Cap reached during multi-view component-action checks |
| component-actions-imported | MOCKED | TIMEOUT | 301.29 | Cap reached after entering separate-window view and waiting for readiness |
| icon-replacement | planned REAL | HARNESS-ERROR | 0 | Depends on retired owned shared runtime; not run |
| icon-properties | REAL | TIMEOUT | 301.14 | Cap reached during multi-view checks, including imported setup |
| section-order | REAL | PASS | 134.76 | Completed |
| container-move | REAL | PASS | 143.05 | Completed |
| text-editing | REAL | FAIL | 123.70 | inline-text-browser.v4.ts:54: expected response wait timed out at existing 30s limit |
| history | planned REAL | HARNESS-ERROR | 0 | Depends on retired shared runtime; not run in this gate |
| recovery | MOCKED | FAIL | 99.87 | studio-reload-recovery-browser.v3.ts:41, called at :78: enabled Save control did not appear in existing 30s wait |

The earlier isolated history PASS remains evidence at its recorded revision; it is not substituted for the unrun history row here.

## Proven startup finding

`server-58515.log` records `INVALID_NEXT_MANIFEST` for `.next/dev/server/pages-manifest.json`, **bytes:0, body:""**. The stack is the installed Next DevServer.getPagesManifest → requireManifest → Node JSON module loading during server initialization. This is an actual empty disk read, not a guessed JSON failure or a browser assertion.

The existing atomic publisher lists build, loadable, font and app-path manifests; pages-manifest.json is absent from its target set. That establishes a coverage gap, but this task did not prove which writer produced this particular empty file or implement a fix. A new installed-Next publication regression and writer trace should precede a minimal fix. Do not assume adding a filename fixes all readiness timeouts.

## Repair queue supported by this run

1. Trace and reproduce pages-manifest publication in a disposable directory; new failing test before any fix. Keep atomic failure refusal and source write boundaries intact.
2. Capture browser DOM/screenshot, console/network and server timing **before** the source-ready deadline. Diagnose the shared/local-image/separate-window readiness failures; compare fresh versus reused runtime. This run does not establish a common root cause.
3. Diagnose state/transition response matching, inline-text response wait and recovery Save readiness. They may be harness/data/race issues or product defects; the current logs do not justify changing expected results or declaring them product failures.
4. Qualify timed-out and unrun scenarios with existing caps/expectations. Preserve raw failures. Investigate setup cost rather than increasing limits to get PASS.
5. Obtain a complete green gate before enabling canvas-spec features. Do not merge this baseline as launch certification.

## Scope, status and what was NOT verified

The run tests committed HEAD in a disposable checkout. It excludes pre-existing uncommitted changes in EditorWorkspace.tsx, editor-workspace.module.css and next-env.d.ts; those three tracked files remain dirty and were not reverted or committed by this task. The exact status outputs are linked above. Test-generated scratch copies and logs are retained. Recovery also reported a temporary copy requiring manual cleanup; no recursive deletion of that copy or any real project was attempted here.

No product hunks were authored in this task. All workflow processes were sequential and coordinator-owned servers were stopped by its finalizer. No historical comparison, fresh security suite, production build, real-customer project compatibility test, clean installation, billing/licensing/deployment or 500-element performance run was performed. No failure was fixed or reclassified away during the baseline. No three-round repetition was run. Missing/partial workflows remain unverified; no claim of flawless or launch-ready behavior.
