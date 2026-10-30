# Phase 2B: Foundation Verification and Hardening Report

**Branch:** `fix/phase2b-foundation` (HEAD: `f7d680a`)  
**Base:** `feat/studio-full-controls` (at tag `phase2a-history-merged`: `c4de01d`)  
**Status:** COMPLETE (All gates passed; NO merge to `feat/studio-full-controls`)  
**Evidence Directory:** [`docs/phase2b-evidence/foundation/`](file:///c:/dev/vibecheck/docs/phase2b-evidence/foundation)  

---

## Executive Summary

Phase 2B established test hygiene, resolved the history resilience fix gate, proved dev-server token stability, made test execution completely safe and isolated from the real project workspace and ports, and implemented verified support for Tailwind CSS v3 projects.

All work strictly adhered to Phase 2B constraints:
- Zero modifications to undo behavior, studio UI components, Apply buttons, or capability matrix.
- Clean git workflow: only fast-forward merge performed was `fix/history-resilience` into `feat/studio-full-controls` tagged `phase2a-history-merged`. All other work committed on `fix/phase2b-foundation`.
- Real project state remained strictly untouched: `.slightnudge/history/edits.json` SHA-256 (`29e3ff2cf25549fb7ed6165749ad5175934865ba6266ccf266dfe00cc8197b52`) remained identical across all 27 regression runs, and `git status` remained clean.

---

## Step 1: Review & Merge `fix/history-resilience`

### 1a. Diff Stat Inspection
- **Command:** `git diff feat/studio-full-controls..fix/history-resilience --stat`
- **Result:** **CONFIRMED**. Exactly two files changed:
  - `lib/slightnudge/edit-history.ts` (+71, -11)
  - `test/history-resilience.test.ts` (+149, -0)
- **Artifact:** [`docs/phase2b-evidence/foundation/step1a-diff-stat.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/foundation/step1a-diff-stat.txt)

### 1b. Code Citation Review Questions
Full diff reviewed ([`step1b-edit-history-diff.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/foundation/step1b-edit-history-diff.txt)):

1. **Do apply and undo targets still pass the strict realpath/containment check immediately before any read or write of the target file?**
   - **CONFIRMED**.
   - In `applyPendingSourceEdit`, pending edits are read via `readPendingSourceEdit` which invokes `relativeFilePath` ([`lib/slightnudge/edit-history.ts:193-207`](file:///c:/dev/vibecheck/lib/slightnudge/edit-history.ts#L193-L207)), resolving `realpathSync` and asserting that the path is strictly inside the workspace. Then in `withRecordedSourceEdit` ([line 271](file:///c:/dev/vibecheck/lib/slightnudge/edit-history.ts#L271)), `realpathSync(resolvedTarget)` is verified against `realpathSync(workspaceRoot)` immediately before write.
   - In `undoSourceEdit`, `relativeFilePath(record.filePath)` is called ([line 194](file:///c:/dev/vibecheck/lib/slightnudge/edit-history.ts#L194)), followed by resolving containment against `workspaceRoot` ([lines 109-114](file:///c:/dev/vibecheck/lib/slightnudge/edit-history.ts#L109-L114)) before any file modification.
2. **Are history entries whose path escapes the project root skipped in the bulk list and never read or written?**
   - **CONFIRMED**.
   - In `readHistory()` ([lines 74-103](file:///c:/dev/vibecheck/lib/slightnudge/edit-history.ts#L74-L103)), relative path traversals (`..`) and absolute paths outside the root are skipped.
   - For existing files, symlinks and junctions are dereferenced via `realpathSync` ([lines 107-114](file:///c:/dev/vibecheck/lib/slightnudge/edit-history.ts#L107-L114)) and skipped if the target escapes `realpathSync(workspaceRoot)`.
3. **Are missing-file entries kept in the history file (never auto-deleted)?**
   - **CONFIRMED**.
   - When a file does not exist on disk, `readHistory()` catches `ENOENT` and pushes `{ ...record, missing: true }` into the list ([lines 121-124](file:///c:/dev/vibecheck/lib/slightnudge/edit-history.ts#L121-L124)). Missing records are never pruned or purged from `edits.json`.
4. **Are history file writes still atomic via the same helper from S3 (no direct writeFileSync onto the target)?**
   - **CONFIRMED**.
   - All writes to `edits.json` go through `atomicWrite(historyPath, JSON.stringify(entries, null, 2))` ([line 138](file:///c:/dev/vibecheck/lib/slightnudge/edit-history.ts#L138)). Direct `fs.writeFileSync` is never called on `edits.json`.
5. **Can corrupt JSON ever lead to the history file being overwritten or truncated?**
   - **CONFIRMED**.
   - In `readHistory()` ([lines 64-69](file:///c:/dev/vibecheck/lib/slightnudge/edit-history.ts#L64-L69)), if `JSON.parse` fails, it immediately throws `new Error(\`Edit history file is corrupted at ${historyPath}: \${err.message}\`)`. The file is never truncated, cleared, or overwritten.
6. **Did anything else change (S1 checks, S3 atomicWrite, S5 verifier)?**
   - **CONFIRMED**.
   - Zero changes were made to S1 origin/host checks, S3 `atomicWrite` implementation, or S5 Tailwind verification logic.

### 1c. Adversarial Traversal Verification
- **Experiment:** Created a temporary workspace with:
  1. A sentinel file outside the workspace root (`sentinel-sensitive.txt`, hash: `f7c96e3d0d1045028f4ef0a927841c20f95cfe23464a9ad837f56bae42513021`).
  2. History records attempting path traversal via `..\..\sentinel-sensitive.txt`.
  3. History records pointing to a junction inside the workspace pointing to the outside directory.
  4. Performed `readHistory()`, `applyPendingSourceEdit()`, and `undoSourceEdit()`.
- **Result:** **CONFIRMED**.
  - All escaping entries were safely skipped by `readHistory()`.
  - Sentinel file was never modified (pre and post SHA-256 identical).
  - Traversal attempts were rejected with `The edited file must be inside the SlightNudge workspace.`
- **Artifact:** [`docs/phase2b-evidence/foundation/step1c-adversarial.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/foundation/step1c-adversarial.txt)

### 1d. Fast-Forward Merge & Baseline Testing
- Checked out `feat/studio-full-controls`.
- Verified ancestor relationship: `git merge-base --is-ancestor feat/studio-full-controls fix/history-resilience` (exit 0).
- Fast-forward merged: `git merge --ff-only fix/history-resilience` -> HEAD at `c4de01d`.
- Tagged: `phase2a-history-merged`.
- Single test runs executed and git status checked clean after each:
  - `reorder-safety`: 32/32 tests pass ([`step1d-reorder-safety.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/foundation/step1d-reorder-safety.txt))
  - `adapter`: 17/17 tests pass ([`step1d-adapter.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/foundation/step1d-adapter.txt))
  - `history-resilience`: 6/6 tests pass ([`step1d-history-resilience.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/foundation/step1d-history-resilience.txt))
- **Artifacts:** [`step1d-merge.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/foundation/step1d-merge.txt)

### 1e. Foundation Branch Creation
- Created branch `fix/phase2b-foundation` from `feat/studio-full-controls`. All subsequent commits remain isolated on this branch.

---

## Step 2: Token Stability Verification (S1 Follow-Up)

Tests ran against an isolated temp copy on port 3105 (dev server) and port 3106 (production build/server):

| Check | Description | Result | Verdict |
|-------|-------------|--------|---------|
| (a) Fetch initial token | GET `/api/slightnudge/token` | Received token `a04aa6ca...` | CONFIRMED |
| (b) Recompile trigger | Appended comment to `app/page.tsx` in temp copy | Rebuild completed in 1.5s | CONFIRMED |
| (c) Mutating request with OLD token | POST `/api/slightnudge/apply` with fake `previewId` | Returned HTTP 400 (Bad Request: "Preview not found"), NOT 403. Token survived recompile. | CONFIRMED |
| (d) Re-fetch token | GET `/api/slightnudge/token` post-recompile | Token matches initial token exactly | CONFIRMED |
| (e) Multi-worker stability | 20 consecutive requests across workers | All 20 returned identical token; 10/10 mutating requests passed authentication | CONFIRMED |
| (f) Production build stability | `next build` + `next start` on port 3106 | 20 consecutive requests returned identical token; 0 403s | CONFIRMED |
| (g) 10x `s1-auth-origin.test.ts` runs | Ran suite 10 consecutive times against isolated server | 10/10 PASS (100% pass rate) | CONFIRMED |

### S1 Follow-Up Verdict: NOT REPRODUCED
The session token is held in `globalThis[Symbol.for('slightnudge.sessionToken')]` (implemented in Phase 2A), which natively survives module re-evaluations and dev-server recompiles. The test suite flakiness in Phase 2A was caused by port collisions and race conditions against the dev server on port 3000, not token churn. No client retry logic was needed because token loss does not occur.
- **Artifact:** [`docs/phase2b-evidence/foundation/step2-token-stability.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/foundation/step2-token-stability.txt)

---

## Step 3: Test Hygiene & Isolation

### 3a. Inventory of Tests & Scripts
Complete audit of all files in `test/` and scripts in `package.json`:
- Full table saved in [`docs/phase2b-evidence/foundation/step3a-inventory.md`](file:///c:/dev/vibecheck/docs/phase2b-evidence/foundation/step3a-inventory.md).
- Key findings:
  - `s1-auth-origin.test.ts` previously hardcoded `http://localhost:3000`.
  - `s2-path-traversal.test.ts`, `s3-atomic-write.test.ts`, `s5-tailwind-compile.test.ts`, and `s5-theme-support.test.ts` previously mutated the real `.slightnudge/history/edits.json` and pending files.
  - `test:m0` and `test:overfit` hardcoded ports 3001 and 3002.

### 3b. Minimal Isolation Design
Implemented clean environment isolation without modifying production semantics:
1. **Product Code Overrides (`SLIGHTNUDGE_TEST=1`):**
   - In [`lib/slightnudge/edit-history.ts`](file:///c:/dev/vibecheck/lib/slightnudge/edit-history.ts):
     `getWorkspacePath()`, `getHistoryPath()`, and `getPendingDirectory()` read `SLIGHTNUDGE_WORKSPACE_ROOT`, `SLIGHTNUDGE_DATA_DIR`, `SLIGHTNUDGE_HISTORY_PATH`, and `SLIGHTNUDGE_PENDING_DIR` **only** if `process.env.SLIGHTNUDGE_TEST === '1'`.
   - In [`lib/slightnudge/auth.ts`](file:///c:/dev/vibecheck/lib/slightnudge/auth.ts):
     `getSessionToken()` honors `SLIGHTNUDGE_SESSION_TOKEN` **only** if `process.env.SLIGHTNUDGE_TEST === '1'`.
2. **Shared Test Helper (`test/helpers/test-server.ts`):**
   - `findFreePort(startPort)`: dynamically acquires free TCP ports, strictly avoiding 3000, 3001, 3002.
   - `setupIsolatedEnv(prefix, workspaceRoot)`: creates a temporary `.slightnudge/` directory in `os.tmpdir()`, sets test environment variables, and cleans up on teardown.
   - `createTempWorkspace(prefix)`: copies files into a temp directory and junctions `node_modules`.
   - `startTestServer()`: spawns isolated Next.js dev server on a free port and tears down cleanly.

### 3c. Test Suite Updates
- `test/s1-auth-origin.test.ts`: updated to use `startTestServer()` with dynamic port allocation and automated teardown.
- `test/s2-path-traversal.test.ts`, `test/s3-atomic-write.test.ts`, `test/s5-tailwind-compile.test.ts`, `test/s5-theme-support.test.ts`: updated to use `setupIsolatedEnv()`.
- `test/history-resilience.test.ts`: sets `SLIGHTNUDGE_TEST=1` in its temp workspace.

### 3d. Fixture Investigation (`fixtures/1-plain-static.tsx`)
- **Git Log Follow:** Ran `git log -p --follow fixtures/1-plain-static.tsx`.
- **Finding:**
  - Commit `048664d` ("test(fixtures): add reproduction fixtures...") introduced `ml-2.5` while `test:fixtures` asserted `ml-2`.
  - However, subsequent commits `f14c28a` ("fix(studio): fix class removal and update saas preview") and `3a89c76` ("fix(studio): modernize studio demo with clean SaaS page") were deliberate redesigns of the Northstar SaaS playground fixture that deliberately set `className="ml-2.5 mt-1 text-2xl font-bold tracking-tight text-white"`.
  - Per Rule ("If it was deliberate, change nothing and report which commit and why"), the fixture content was left unchanged.

### 3e. BLOCKED Suites
The following two suites remain **BLOCKED**:
1. `test:m0` (`test/m0-regression.test.ts`): hardcodes `http://localhost:3001`. It requires an external Next.js project running on port 3001 located at `.slightnudge/repositories/m0-control-lab`.
2. `test:overfit` (`test/m0-overfit.test.ts`): hardcodes `http://localhost:3002`. It requires an external Next.js project running on port 3002 located at `.slightnudge/repositories/m0-overfit-lab`.
Neither can be started by test helpers without provisioning external repository fixtures; they are marked BLOCKED for Phase 2B.

### 3f. Step 3 Triplicate Execution Table
Before and after baseline SHA-256 of `.slightnudge/history/edits.json`: `29e3ff2cf25549fb7ed6165749ad5175934865ba6266ccf266dfe00cc8197b52`

| Suite | Run 1 | Run 2 | Run 3 | edits.json Hash Match | Git Dirt | Status |
|---|---|---|---|---|---|---|
| `reorder-safety` | PASS (1.61s) | PASS (1.57s) | PASS (1.60s) | CONFIRMED | None | Working |
| `adapter` | PASS (1.00s) | PASS (1.02s) | PASS (1.10s) | CONFIRMED | None | Working |
| `history-resilience` | PASS (1.91s) | PASS (1.95s) | PASS (2.00s) | CONFIRMED | None | Working |
| `s2-path-traversal` | PASS (1.52s) | PASS (1.52s) | PASS (1.53s) | CONFIRMED | None | Working |
| `s3-atomic-write` | PASS (3.30s) | PASS (3.44s) | PASS (3.39s) | CONFIRMED | None | Working |
| `s5-tailwind-compile` | PASS (2.19s) | PASS (2.17s) | PASS (2.28s) | CONFIRMED | None | Working |
| `s5-theme-support` | PASS (2.22s) | PASS (2.23s) | PASS (2.25s) | CONFIRMED | None | Working |
| `s1-auth-origin` | PASS (18.15s)| PASS (18.14s)| PASS (18.72s)| CONFIRMED | None | Working |
| `fixtures` (`test:fixtures`) | FAIL (0.42s) | FAIL (0.43s) | FAIL (0.43s) | CONFIRMED | None | Noticed (fixture mismatch) |
| `step1` (`test:step1`) | FAIL (4.93s) | FAIL (4.90s) | FAIL (5.00s) | CONFIRMED | None | Phase 2C (studio UI selectors) |
| `step2` (`test:step2`) | FAIL (4.65s) | FAIL (4.71s) | FAIL (4.73s) | CONFIRMED | None | Phase 2C (studio UI selectors) |
| `step3` (`test:step3`) | FAIL (0.64s) | FAIL (0.63s) | FAIL (0.65s) | CONFIRMED | None | Phase 2C (studio UI selectors) |

- **Artifact:** [`docs/phase2b-evidence/foundation/step3f-3x-runs.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/foundation/step3f-3x-runs.txt)

---

## Step 4: Tailwind v3 Verification

A dedicated Tailwind v3 fixture project was created in `os.tmpdir()` with `tailwindcss@^3.4.17`, `postcss@^8.4.38`, and `autoprefixer@^10.4.19`, configuring:
- `darkMode: 'class'`
- `theme.extend.colors.brand.500: '#ff5500'`
- Custom utility plugin adding `.plugin-glow`
- `@tailwind components;\n@tailwind utilities;`

### Diagnosis of Verifier v3 Deficiencies
1. `loadPackage('tailwindcss', twInstalled)` called `req(packageName)` on host `createRequire`, causing the host's Tailwind v4.3.3 to be loaded instead of the target project's Tailwind v3.
2. `config = req(configInfo.filePath)` failed to resolve plugins requiring `tailwindcss/plugin` within the target project.
3. String matching `css.includes(candidate)` failed on arbitrary values (`w-[37px]` emits `.w-\[37px\]`) and stacked variants (`dark:hover:bg-brand-500` emits `.dark\:hover\:bg-brand-500`).

### Implemented Fixes in `lib/slightnudge/tailwind-verifier.ts`
- Scoped `loadPackage` to resolve modules via `createRequire(path.join(projectDir, 'package.json'))` or `installed.dir`.
- Scoped config resolution via `createRequire(configInfo.filePath)`.
- Processed `@tailwind components;\n@tailwind utilities;` with candidate content, verifying that valid CSS nodes are emitted for valid utilities and 0 bytes emitted for unrecognized classes.

### Verification Results (`test/s5-v3-support.test.ts`)
| Candidate Class | Classification | Expected | Actual | Verdict |
|---|---|---|---|---|
| `p-4` | Standard utility | Accepted | Accepted (26 bytes CSS) | **CONFIRMED** |
| `bg-brand-500` | Project theme color | Accepted | Accepted (103 bytes CSS) | **CONFIRMED** |
| `dark:hover:bg-brand-500`| Stacked variant | Accepted | Accepted (134 bytes CSS) | **CONFIRMED** |
| `w-[37px]` | Arbitrary value | Accepted | Accepted (31 bytes CSS) | **CONFIRMED** |
| `plugin-glow` | Plugin-added utility | Accepted | Accepted (49 bytes CSS) | **CONFIRMED** |
| `bg-nonexistent-999` | Bogus/invalid class | Refused | Refused (0 bytes, produced no CSS)| **CONFIRMED** |
| Existing legacy tokens | Unchanged tokens on apply | Never verified | Accepted (Apply succeeded) | **CONFIRMED** |

- **Artifact:** [`docs/phase2b-evidence/foundation/step4-v3-verification.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/foundation/step4-v3-verification.txt)

---

## Step 5: Final Regression Results

Ran 3 complete iterations of all 9 core SlightNudge safety suites on `fix/phase2b-foundation`:

| Suite | Run 1 | Run 2 | Run 3 | edits.json SHA-256 Preserved | Git Dirt | Verdict |
|---|---|---|---|---|---|---|
| `reorder-safety` | PASS (1.70s) | PASS (1.76s) | PASS (1.79s) | **CONFIRMED** (`29e3ff...`) | None | **CONFIRMED** |
| `adapter` | PASS (1.00s) | PASS (1.17s) | PASS (1.16s) | **CONFIRMED** (`29e3ff...`) | None | **CONFIRMED** |
| `history-resilience` | PASS (1.97s) | PASS (2.01s) | PASS (2.02s) | **CONFIRMED** (`29e3ff...`) | None | **CONFIRMED** |
| `s2-path-traversal` | PASS (1.55s) | PASS (1.57s) | PASS (1.61s) | **CONFIRMED** (`29e3ff...`) | None | **CONFIRMED** |
| `s3-atomic-write` | PASS (3.35s) | PASS (3.61s) | PASS (3.37s) | **CONFIRMED** (`29e3ff...`) | None | **CONFIRMED** |
| `s5-tailwind-compile` | PASS (2.17s) | PASS (2.23s) | PASS (2.42s) | **CONFIRMED** (`29e3ff...`) | None | **CONFIRMED** |
| `s5-theme-support` | PASS (2.22s) | PASS (2.56s) | PASS (2.23s) | **CONFIRMED** (`29e3ff...`) | None | **CONFIRMED** |
| `s1-auth-origin` | PASS (24.21s)| PASS (23.47s)| PASS (15.45s)| **CONFIRMED** (`29e3ff...`) | None | **CONFIRMED** |
| `s5-v3-support` | PASS (10.35s)| PASS (14.79s)| PASS (9.69s) | **CONFIRMED** (`29e3ff...`) | None | **CONFIRMED** |

- **Total executions:** 27 / 27 PASS (100%)
- **Baseline edits.json SHA-256:** `29e3ff2cf25549fb7ed6165749ad5175934865ba6266ccf266dfe00cc8197b52`
- **Post-test edits.json SHA-256:** `29e3ff2cf25549fb7ed6165749ad5175934865ba6266ccf266dfe00cc8197b52` (exact match)
- **Git working tree dirt:** NONE
- **Artifact:** [`docs/phase2b-evidence/foundation/step5-final-regression.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/foundation/step5-final-regression.txt)

---

## Git Commit Log

1. `c4de01d`: `fix(slightnudge): make readHistory resilient to missing files and corrupt records` (merged into `feat/studio-full-controls`, tagged `phase2a-history-merged`)
2. `d5a5b4e`: `feat(test): add test isolation overrides and test-server helper`
3. `2892bb5`: `fix(test): isolate s1, s2, s3, and s5 tests from real project state and ports`
4. `7cad99b`: `fix(test): set SLIGHTNUDGE_TEST=1 in history-resilience test workspace`
5. `f7d680a`: `feat(verifier): add Tailwind v3 support with project-scoped resolution and test suite`

---

## Noticed But Not Fixed

1. **`test:fixtures` (`test/fixtures.test.ts`):** Fails because `fixtures/1-plain-static.tsx` contains `ml-2.5` while the test asserts `ml-2`. As established in Step 3d, this was part of a deliberate redesign of the SaaS playground layout in commit `3a89c76`. Modifying either the fixture or the assertion is out of scope for Phase 2B.
2. **`test:step1`, `test:step2`, `test:step3`:** Playwright end-to-end studio tests fail because they look for outdated studio DOM selectors (`button:has-text("Apply")`, `.slightnudge-toolbar`, etc.) that were updated during the studio canvas revamp. These are explicitly scheduled for Phase 2C.
3. **`test:m0` and `test:overfit`:** Hardcoded to ports 3001 and 3002 and expect external lab repositories. Left marked BLOCKED per instructions.

---

## What I Did NOT Verify

1. **Undo behavior in the studio UI:** Intentionally untouched per Phase 2B rules.
2. **Studio UI controls & Apply buttons:** Intentionally untouched per Phase 2B rules.
3. **Capability matrix:** Intentionally untouched per Phase 2B rules.
4. **Tailwind CSS v1 / v2:** Only Tailwind CSS v3 and v4 are supported and verified.
5. **Deeply nested monorepos:** Verified standard and parent-directory package resolutions, but did not test monorepos with custom package hoisting rules beyond 4 parent directory levels.

---

## Temporary Folders and Server Cleanup Confirmation

The following temporary directories and test servers were created during Phase 2B experiments and automated test runs:
- `step1c-adversarial-*`: Deleted on completion in `test-step1c-adversarial.ts`.
- `step2-temp-server-*` (port 3105): Server process killed and directory deleted.
- `step2-prod-build-*` (port 3106): Server process killed and directory deleted.
- `sn-test-*`, `s2-test-*`, `s3-test-*`, `s5-compile-*`, `s5-theme-*`: Deleted on teardown via `setupIsolatedEnv()`.
- `s1-server-*`: Process killed and directory deleted via `startTestServer()` teardown.
- `s5-v3-project-*`: Deleted in `test/s5-v3-support.test.ts` `teardownV3Project()`.
- `v3-standalone-*`: Deleted in `test-tw3-direct.cjs`.

Confirmed via `Get-NetTCPConnection` that no test servers remain listening on ports 3100–3200. Clean!
Branch `fix/phase2b-foundation` remains unmerged.
