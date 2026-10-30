# Phase 2C-1 Report: Auth Bypass, Token-Level Undo, Test Independence, and M0/Overfit Labs

**Date:** 2026-10-21  
**Base Commit / Tag:** `75c13ba` (`pre-phase2c` / `phase2b-merged`)  
**Working Branch:** `fix/phase2c-undo-tests`  
**Primary Evidence Directory:** [`/docs/phase2c-evidence/`](file:///c:/dev/vibecheck/docs/phase2c-evidence/)  
**edits.json Baseline SHA-256:** `29e3ff2cf25549fb7ed6165749ad5175934865ba6266ccf266dfe00cc8197b52`  

---

## Step A: Auth-Bypass Check & Hardening

### 1. Investigation & Finding Summary
- **Finding A.1 (P0 - Critical Security Defect - Inadvertent Auth Bypass via `process.argv`):**
  - **Status:** **CONFIRMED**
  - **Location:** [`lib/slightnudge/auth.ts`](file:///c:/dev/vibecheck/lib/slightnudge/auth.ts#L61-L64)
  - **Original Condition:**
    ```ts
    if (process.argv.some(arg => arg.includes('reorder-safety'))) {
      return { valid: true };
    }
    ```
  - **Vulnerability Mechanism:** Node sets `process.argv[1]` to the absolute path of the script entrypoint (e.g. `C:\path\to\repo\node_modules\next\dist\bin\next`). If the repository was cloned or checked out in a directory with `reorder-safety` in its path (e.g. `c:\work\reorder-safety\...`), or if any CLI flag contained `reorder-safety` (`--filter=reorder-safety`), `arg.includes('reorder-safety')` evaluated to `true`. This completely bypassed Host verification, Origin verification, and Session Token verification for **all** mutating SlightNudge routes (`apply`, `undo`, `preview`, `repositories`, `assets`), even in production (`NODE_ENV=production`).
  - **Evidence Artifact:** [`docs/phase2c-evidence/stepA-argv-investigation.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepA-argv-investigation.txt)
- **Grep Sweep for Other Bypasses in `app/api/` and `lib/slightnudge/`:**
  - `process.argv`: Exclusively found at `lib/slightnudge/auth.ts:62`. No other file checks `process.argv`.
  - `NODE_ENV`: Found only in test override guards (`SLIGHTNUDGE_TEST === '1' && NODE_ENV !== 'production'`) and production gates for dev-only endpoints (`NODE_ENV === 'production'` returns 501 / disables features).
  - `SLIGHTNUDGE_`: Exclusively used for isolated test harnesses and client globals.
  - `skip` / `bypass`: No other bypasses exist across `lib/slightnudge/` or `app/api/`.

### 2. Failing Test & Remediation
- **Failing Test First:** Created [`test/s1-auth-bypass.test.ts`](file:///c:/dev/vibecheck/test/s1-auth-bypass.test.ts) demonstrating that with `SLIGHTNUDGE_TEST` unset, requests lacking valid tokens/Host/Origin were accepted under the old condition, failing the security assertion with `ERR_ASSERTION`.
  - Evidence: [`docs/phase2c-evidence/stepA-failing-test.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepA-failing-test.txt)
- **Fix Applied:**
  - In [`lib/slightnudge/auth.ts`](file:///c:/dev/vibecheck/lib/slightnudge/auth.ts#L61-L64), replaced the bare `process.argv` check with the strict guard:
    ```ts
    if (process.env.SLIGHTNUDGE_TEST === '1' && process.env.NODE_ENV !== 'production' && process.argv.some(arg => arg.includes('reorder-safety'))) {
      return { valid: true };
    }
    ```
  - In [`test/reorder-safety.test.ts`](file:///c:/dev/vibecheck/test/reorder-safety.test.ts), updated the test to use `setupIsolatedEnv('reorder-safety')` from `test/helpers/test-server.ts` to properly acquire `SLIGHTNUDGE_TEST = '1'` in test isolation and clean up on exit.
  - Passing test evidence: [`docs/phase2c-evidence/stepA-passing-test.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepA-passing-test.txt) and [`docs/phase2c-evidence/stepA-reorder-safety.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepA-reorder-safety.txt) (32/32 passing).
- **Step A Commit:** `600f163` (`fix(slightnudge): close auth bypass and guard legacy reorder test with SLIGHTNUDGE_TEST`)

### 3. Step A Triplicate Verification
Both the new `s1-auth-bypass` unit test and the full `s1-auth-origin` integration suite were run 3 consecutive times with pre- and post-run hash and porcelain validation:

| Suite | Run 1 | Run 2 | Run 3 | edits.json SHA-256 | Worktree Dirt | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `s1-auth-bypass` | PASS (0.90s) | PASS (0.85s) | PASS (0.83s) | `29e3ff...` (Identical) | Clean | **CONFIRMED** | [`stepA-auth-bypass-3x.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepA-auth-bypass-3x.txt) |
| `s1-auth-origin` | PASS (23.11s) | PASS (21.44s) | PASS (19.09s) | `29e3ff...` (Identical) | Clean | **CONFIRMED** | [`stepA-s1-suite-3x.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepA-s1-suite-3x.txt) |

---

## Step B: Token-Level Undo

### 1. Design & Implementation Summary
- **Record Shape & Metadata Persistence:**
  - Expanded `PendingEdit` and `EditRecord` in [`lib/slightnudge/edit-history.ts`](file:///c:/dev/vibecheck/lib/slightnudge/edit-history.ts) to persist AST locator identity (`elementId`, `tagName`, `line`, `column`), `oldClassName`, `newClassName`, and exact token diffs (`removedTokens`, `addedTokens`).
  - Updated [`app/api/slightnudge/preview/route.ts`](file:///c:/dev/vibecheck/app/api/slightnudge/preview/route.ts) to populate locator and token metadata during preview preparation.
  - Added `deriveClassEditDetails(before, after, lineHint)` in [`lib/slightnudge/edit-history.ts`](file:///c:/dev/vibecheck/lib/slightnudge/edit-history.ts) to reconstruct locator and token diffs dynamically from AST diffing for legacy records or edits recorded without explicit metadata. If deriving fails, exact-match path is preserved.
- **Undo Precedence Order:**
  - **(i) Exact-Match Path:** If disk content matches `record.after` exactly, restores `record.before` byte-for-byte.
  - **(ii) Token-Level Revert Path:** If disk content differs:
    1. Parses file with `ts-morph` and queries candidate JSX elements matching `elementId` or `tagName` + token constraints.
    2. Enforces strict uniqueness (fails if 0 or >1 candidates match).
    3. Enforces safety constraints: element must not be inside loops (`isElementInsideLoop`), shared component definitions (`isComponentUsedMultipleTimes`), JSX conditional expressions (`&&`, `||`, `? :`), or ambiguous same-line siblings.
    4. Enforces token integrity: element must contain all added tokens and none of the removed tokens.
    5. Reverts in place: removes added tokens and restores removed tokens at original positions, replacing only the exact character slice of the className string literal and leaving all surrounding code, comments, and Prettier formatting untouched.
    6. Syntactic parse check: verifies AST validity via `verifySyntacticParse` before writing.
    7. Project containment check: verifies `relativeFilePath` immediately before writing.
    8. Atomic write: writes through `atomicWrite` (recovering journal state if write fails; no temporary files left behind).
  - **(iii) Refusal with Explicit Instructions:** If any condition fails (element deleted, ambiguous, tokens modified by user, non-class edit where file changed), refuses safely without changing disk. Returns plain-language instructions including file path, line number, tokens to remove, tokens to restore, and confirming nothing was changed.
- **Stacked Edit Safety:** If an element was edited multiple times, attempting to undo an older edit while a newer edit is active on top refuses safely (`"Cannot undo this edit because a newer edit on the same element depends on it. Undo the newer edit first."`).

### 2. Failing Test First & Step B Commits
- **Failing Test First:** Created [`test/token-undo.test.ts`](file:///c:/dev/vibecheck/test/token-undo.test.ts) covering all 12 required scenarios ((a) through (l)). Ran against pre-Step B code and proved failure on Prettier-reformatted files.
  - Evidence: [`docs/phase2c-evidence/stepB-failing-test.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepB-failing-test.txt)
- **Commits:**
  - `8a9da9e`: `feat(slightnudge): implement token-level undo and locator metadata`
  - `8330e80`: `fix(slightnudge): support absolute workspace paths in undoSourceEdit`

### 3. Step B Verification Suite
All 12 test cases in `token-undo` were executed 3 consecutive times, followed by the complete regression battery (reorder-safety, adapter, history-resilience, s1, s2, s3, s5-compile, s5-theme, s5-v3) with pre- and post-run hash and porcelain validation:

| Suite | Run 1 | Run 2 | Run 3 | edits.json SHA-256 | Worktree Dirt | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `token-undo` (a-l) | PASS (3.70s) | PASS (3.86s) | PASS (3.92s) | `29e3ff...` (Identical) | Clean | **CONFIRMED** |
| `reorder-safety` | PASS (1.62s) | - | - | `29e3ff...` (Identical) | Clean | **CONFIRMED** |
| `adapter` | PASS (0.81s) | - | - | `29e3ff...` (Identical) | Clean | **CONFIRMED** |
| `history-resilience` | PASS (1.91s) | - | - | `29e3ff...` (Identical) | Clean | **CONFIRMED** |
| `s1-auth-origin` | PASS (19.82s) | - | - | `29e3ff...` (Identical) | Clean | **CONFIRMED** |
| `s2-path-traversal` | PASS (1.44s) | - | - | `29e3ff...` (Identical) | Clean | **CONFIRMED** |
| `s3-atomic-write` | PASS (3.29s) | - | - | `29e3ff...` (Identical) | Clean | **CONFIRMED** |
| `s5-tailwind-compile`| PASS (2.08s) | - | - | `29e3ff...` (Identical) | Clean | **CONFIRMED** |
| `s5-theme-support` | PASS (1.93s) | - | - | `29e3ff...` (Identical) | Clean | **CONFIRMED** |
| `s5-v3-support` | PASS (33.51s) | - | - | `29e3ff...` (Identical) | Clean | **CONFIRMED** |

- **Step B Full Evidence Output:** [`docs/phase2c-evidence/stepB-validation-raw.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepB-validation-raw.txt)

---

## Step C: Test Baseline Independence

### 1. Historical Baseline Investigation
- **Baseline Commit Discovery:**
  - **Commit:** `c80ffe1` (*"feat(fixtures): introduce initial 7 layout test fixtures"*)
  - **Status:** **CONFIRMED**
  - **Evidence Artifact:** [`docs/phase2c-evidence/stepC-commit-investigation.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-commit-investigation.txt)
  - In commit `c80ffe1`, `fixtures/1-plain-static.tsx` contained `className="ml-2"` on line 11 (within a 17-line static component), which satisfies all expectations in `test/fixtures.test.ts`. Subsequent commits modified this file to redesign the studio demo fixture with `className="ml-2.5"` and expanded UI elements, breaking the fixture test assertions when run directly against the live demo.
- **Tests Dependent on Fixture 1 Class Strings or Line Numbers:**
  - `test/fixtures.test.ts`: Expects `ml-2` on `data-source-line="7"` and tests transitions to `ml-2.5`, `ml-3`, etc.
  - `test/step2-nudging.test.ts`: Expects initial `ml-2` at `fixtures/1-plain-static.tsx:7` and checks `ml-2 -> ml-2.5`.
  - `test/step3-file-git.test.ts`: Directly mutates and restores `fixtures/1-plain-static.tsx` via nudge API and git reset.
  - `test/move-expectations.test.ts`: Navigates to `/fixtures/1` expecting fixture 1 canvas structure.
  - `test/drag-diagnosis.test.ts`: Inspects `fixtures/1-plain-static.tsx` AST structure.
  - `test/step1-selection.test.ts`: Navigates to `/fixtures/1`.

### 2. Isolated Baseline Implementation
- **Baseline Fixture File:** Created [`test/baselines/1-plain-static.tsx`](file:///c:/dev/vibecheck/test/baselines/1-plain-static.tsx) containing the exact historical content from `c80ffe1` (comment-free, exactly matching original source).
- **Temp Workspace Extension:** Extended `createTempWorkspace` in [`test/helpers/test-server.ts`](file:///c:/dev/vibecheck/test/helpers/test-server.ts) with `{ useFixture1Baseline?: boolean }`. When enabled, the historical baseline is copied to `fixtures/1-plain-static.tsx` inside the temporary workspace only. The real `fixtures/` folder is never touched.
- **Test Suite Decoupling:** Updated tests that access `fixtures/1-plain-static.tsx` (`test/fixtures.test.ts`, `test/step2-nudging.test.ts`, `test/step3-file-git.test.ts`, etc.) to obtain their paths from an isolated workspace with `useFixture1Baseline: true`. No assertions were deleted, loosened, or modified.
- **Port Isolation:** Set `BASE_URL = process.env.STUDIO_BASE_URL || (process.env.SLIGHTNUDGE_TEST === '1' ? 'http://127.0.0.1:3999' : 'http://localhost:3000')` across browser tests so that under test mode, tests never hit a running development server on port 3000 and never mutate real project state.

### 3. Step C Triplicate Test Execution Results

All 10 required suites were executed 3 consecutive times with pre- and post-run checks verifying that `.slightnudge/history/edits.json` remained identical to `29e3ff2cf25549fb7ed6165749ad5175934865ba6266ccf266dfe00cc8197b52` and that `fixtures/` was completely untouched (`git status --porcelain fixtures` returned clean):

| Suite | Run 1 | Run 2 | Run 3 | Real-Project Dirt | Status | First Failing Assertion / Failure Reason | Evidence Artifacts |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **`fixtures`** | ✅ PASS | ✅ PASS | ✅ PASS | CLEAN | **CONFIRMED** (PASS) | All 33 unit assertions passed cleanly in isolated workspace | [`stepC-fixtures-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-fixtures-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-fixtures-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-fixtures-run3.txt) |
| **`step1`** | ❌ FAIL | ❌ FAIL | ❌ FAIL | CLEAN | **CONFIRMED** (FAIL) | `page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3999/fixtures/1` (Non-isolation reason: no test server running; Phase 2C-2 work) | [`stepC-step1-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-step1-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-step1-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-step1-run3.txt) |
| **`step2`** | ❌ FAIL | ❌ FAIL | ❌ FAIL | CLEAN | **CONFIRMED** (FAIL) | `ArrowRight nudges ml-2 -> ml-2.5` (Non-isolation reason: browser cannot connect to dev server; Phase 2C-2 work) | [`stepC-step2-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-step2-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-step2-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-step2-run3.txt) |
| **`step3`** | ❌ FAIL | ❌ FAIL | ❌ FAIL | CLEAN | **CONFIRMED** (FAIL) | `Nudge API succeeded` (Non-isolation reason: browser cannot connect to dev server; Phase 2C-2 work) | [`stepC-step3-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-step3-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-step3-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-step3-run3.txt) |
| **`move-expectations`** | ❌ FAIL | ❌ FAIL | ❌ FAIL | CLEAN | **CONFIRMED** (FAIL) | `page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3999/fixtures/1` (Non-isolation reason: no test server running; Phase 2C-2 work) | [`stepC-move-expectations-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-move-expectations-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-move-expectations-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-move-expectations-run3.txt) |
| **`studio-restore`** | ❌ FAIL | ❌ FAIL | ❌ FAIL | CLEAN | **CONFIRMED** (FAIL) | `page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3999/studio` (Non-isolation reason: no test server running; Phase 2C-2 work) | [`stepC-studio-restore-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-studio-restore-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-studio-restore-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-studio-restore-run3.txt) |
| **`drag-diagnosis`** | ✅ PASS | ✅ PASS | ✅ PASS | CLEAN | **CONFIRMED** (PASS) | Diagnostic AST parsing passed on all 3 runs | [`stepC-drag-diagnosis-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-drag-diagnosis-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-drag-diagnosis-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-drag-diagnosis-run3.txt) |
| **`drag-resize-move`** | ❌ FAIL | ❌ FAIL | ❌ FAIL | CLEAN | **CONFIRMED** (FAIL) | `page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3999/studio` (Non-isolation reason: no test server running; Phase 2C-2 work) | [`stepC-drag-resize-move-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-drag-resize-move-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-drag-resize-move-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-drag-resize-move-run3.txt) |
| **`in-situ-focus`** | ✅ PASS | ✅ PASS | ✅ PASS | CLEAN | **CONFIRMED** (PASS) | All CORS, preflight, bridge capabilities, and Next adapter tests passed on all 3 runs | [`stepC-in-situ-focus-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-in-situ-focus-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-in-situ-focus-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-in-situ-focus-run3.txt) |
| **`studio-benchmark`** | ❌ FAIL | ❌ FAIL | ❌ FAIL | CLEAN | **CONFIRMED** (FAIL) | `page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3999/studio` (Non-isolation reason: no test server running; Phase 2C-2 work) | [`stepC-studio-benchmark-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-studio-benchmark-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-studio-benchmark-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepC-studio-benchmark-run3.txt) |

---

## Step D: M0 & Overfit Labs Reproducibility and Dynamic Harness

### 1. Lab Inspection & Buildability
- **Inspection Findings:**
  - Both `.slightnudge/repositories/m0-control-lab` and `.slightnudge/repositories/m0-overfit-lab` were inspected (read-only).
  - **Dependencies:** Both apps use Next.js 16.4.0, React 19.3.0, and Tailwind 4.3.3.
  - **Secrets & Personal Data:** Scanned recursively for `.env*`, API keys, or personal data. None were present in either lab repository.
  - **Rebuildability:** Both labs can be rebuilt and executed entirely from tracked sources without external network access by junctioning `node_modules` from the project root.
  - **Status:** **CONFIRMED**

### 2. Configurable Environment Variables
- In [`test/m0-regression.test.ts`](file:///c:/dev/vibecheck/test/m0-regression.test.ts#L240-L244):
  ```ts
  const baseUrl = process.env.M0_BASE_URL || 'http://127.0.0.1:3001';
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('section#top');

  const repoBase = path.resolve(process.env.M0_REPO_PATH || '.slightnudge/repositories/m0-control-lab');
  ```
- In [`test/m0-overfit.test.ts`](file:///c:/dev/vibecheck/test/m0-overfit.test.ts#L240-L244):
  ```ts
  const baseUrl = process.env.M0_OVERFIT_BASE_URL || 'http://127.0.0.1:3002';
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#app-shell');

  const repoBase = path.resolve(process.env.M0_OVERFIT_REPO_PATH || '.slightnudge/repositories/m0-overfit-lab');
  ```
- **Integrity:** Zero assertions were deleted, skipped, loosened, or modified.

### 3. Tracked Lab Source Copy & Dynamic Lab Server Helper
- **Tracked Copies:** Copied clean sources for both labs into [`test/labs/m0-control-lab`](file:///c:/dev/vibecheck/test/labs/m0-control-lab) and [`test/labs/m0-overfit-lab`](file:///c:/dev/vibecheck/test/labs/m0-overfit-lab), explicitly excluding `.git`, `.next`, `node_modules`, `tsconfig.tsbuildinfo`, `.env*`, and large lockfiles.
- **Helper Extensions in [`test/helpers/test-server.ts`](file:///c:/dev/vibecheck/test/helpers/test-server.ts):**
  - `createTempLabWorkspace(labName)`: Allocates an isolated folder in `os.tmpdir()`, copies tracked lab source files, and creates a directory junction for `node_modules` to eliminate `npm install` delays while preserving full dependency isolation.
  - `startLabServer({ labName, port? })`: Allocates an ephemeral free TCP port on `127.0.0.1`, spawns `next dev --webpack -H 127.0.0.1 -p <port>`, waits for the server to return HTTP 200 on `GET /`, and provides robust process-tree termination teardown.
  - `runLabSuite(labName, testFile)`: Automates launching the ephemeral lab server, running the test with `M0_BASE_URL` / `M0_REPO_PATH` and `SLIGHTNUDGE_TEST=1`, capturing full output, and executing teardown.

### 4. Step D Triplicate Test Execution Results

Both lab test suites were run 3 consecutive times through the helper with pre- and post-run checks verifying `edits.json` hash and porcelain status:

| Suite | Run 1 | Run 2 | Run 3 | Real-Project Dirt | Status | Findings / Notes | Evidence Artifacts |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **`m0-regression`** | ✅ PASS | ✅ PASS | ✅ PASS | CLEAN | **CONFIRMED** (PASS) | All 30 selection specifications passed (Allowed: 16, Refused: 14, Wrong: 0) | [`stepD-m0-regression-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepD-m0-regression-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepD-m0-regression-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepD-m0-regression-run3.txt) |
| **`m0-overfit`** | ✅ PASS | ✅ PASS | ✅ PASS | CLEAN | **CONFIRMED** (PASS) | All 30 selection specifications passed (Allowed: 21, Refused: 9, Wrong: 0) | [`stepD-m0-overfit-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepD-m0-overfit-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepD-m0-overfit-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/stepD-m0-overfit-run3.txt) |

---

## Final Regression Triplicate Battery

The complete 13-suite regression battery was executed on branch `fix/phase2c-undo-tests` 3 consecutive times with pre- and post-run hash and porcelain validation:

| Suite | Run 1 | Run 2 | Run 3 | Real-Project Dirt | edits.json SHA-256 | Status | Evidence Artifacts |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`reorder-safety`** | ✅ PASS (1445ms) | ✅ PASS (1640ms) | ✅ PASS (1963ms) | CLEAN | `29e3ff... (Identical)` | **CONFIRMED** | [`final-reorder-safety-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-reorder-safety-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-reorder-safety-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-reorder-safety-run3.txt) |
| **`adapter`** | ✅ PASS (1238ms) | ✅ PASS (1146ms) | ✅ PASS (1140ms) | CLEAN | `29e3ff... (Identical)` | **CONFIRMED** | [`final-adapter-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-adapter-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-adapter-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-adapter-run3.txt) |
| **`history-resilience`** | ✅ PASS (2133ms) | ✅ PASS (2322ms) | ✅ PASS (1923ms) | CLEAN | `29e3ff... (Identical)` | **CONFIRMED** | [`final-history-resilience-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-history-resilience-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-history-resilience-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-history-resilience-run3.txt) |
| **`s1`** (`s1-auth-origin`) | ✅ PASS (20611ms) | ✅ PASS (21755ms) | ✅ PASS (23379ms) | CLEAN | `29e3ff... (Identical)` | **CONFIRMED** | [`final-s1-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s1-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s1-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s1-run3.txt) |
| **`s2`** (`s2-path-traversal`) | ✅ PASS (1909ms) | ✅ PASS (1495ms) | ✅ PASS (1378ms) | CLEAN | `29e3ff... (Identical)` | **CONFIRMED** | [`final-s2-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s2-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s2-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s2-run3.txt) |
| **`s3`** (`s3-atomic-write`) | ✅ PASS (3388ms) | ✅ PASS (3188ms) | ✅ PASS (3331ms) | CLEAN | `29e3ff... (Identical)` | **CONFIRMED** | [`final-s3-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s3-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s3-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s3-run3.txt) |
| **`s5-compile`** | ✅ PASS (1971ms) | ✅ PASS (1963ms) | ✅ PASS (2193ms) | CLEAN | `29e3ff... (Identical)` | **CONFIRMED** | [`final-s5-compile-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s5-compile-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s5-compile-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s5-compile-run3.txt) |
| **`s5-theme`** | ✅ PASS (2028ms) | ✅ PASS (2215ms) | ✅ PASS (2051ms) | CLEAN | `29e3ff... (Identical)` | **CONFIRMED** | [`final-s5-theme-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s5-theme-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s5-theme-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s5-theme-run3.txt) |
| **`s5-v3`** | ✅ PASS (33051ms) | ✅ PASS (31390ms) | ✅ PASS (30008ms) | CLEAN | `29e3ff... (Identical)` | **CONFIRMED** | [`final-s5-v3-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s5-v3-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s5-v3-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s5-v3-run3.txt) |
| **`test-override-guard`** | ✅ PASS (2080ms) | ✅ PASS (1789ms) | ✅ PASS (1690ms) | CLEAN | `29e3ff... (Identical)` | **CONFIRMED** | [`final-test-override-guard-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-test-override-guard-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-test-override-guard-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-test-override-guard-run3.txt) |
| **`s1-auth-bypass`** (new) | ✅ PASS (1172ms) | ✅ PASS (1222ms) | ✅ PASS (1091ms) | CLEAN | `29e3ff... (Identical)` | **CONFIRMED** | [`final-s1-auth-bypass-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s1-auth-bypass-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s1-auth-bypass-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-s1-auth-bypass-run3.txt) |
| **`token-undo`** (new) | ✅ PASS (4147ms) | ✅ PASS (4354ms) | ✅ PASS (4429ms) | CLEAN | `29e3ff... (Identical)` | **CONFIRMED** | [`final-token-undo-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-token-undo-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-token-undo-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-token-undo-run3.txt) |
| **`fixtures`** (new baseline) | ✅ PASS (2161ms) | ✅ PASS (2169ms) | ✅ PASS (1983ms) | CLEAN | `29e3ff... (Identical)` | **CONFIRMED** | [`final-fixtures-run1.txt`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-fixtures-run1.txt), [`run2`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-fixtures-run2.txt), [`run3`](file:///c:/dev/vibecheck/docs/phase2c-evidence/final-fixtures-run3.txt) |

**Result Summary:** 39 out of 39 test executions passed cleanly (100% pass rate).

---

## Phase 2C-1 Commit History

All changes have been committed directly to `fix/phase2c-undo-tests` with explicit path staging:

1. **`600f163`** - `fix(slightnudge): close auth bypass and guard legacy reorder test with SLIGHTNUDGE_TEST` (Step A)
2. **`8a9da9e`** - `feat(slightnudge): implement token-level undo and locator metadata` (Step B)
3. **`8330e80`** - `fix(slightnudge): support absolute workspace paths in undoSourceEdit` (Step B follow-up)
4. **`f109a9c`** - `fix(test): decouple test baseline from studio demo fixture` (Step C)
5. **`9d5f1aa`** - `feat(test): make m0 and overfit labs reproducible with dynamic server harness` (Step D)

---

## Noticed But Not Fixed

1. **Outdated Studio Selectors in Browser Playwright Tests:**
   Browser tests (`step1`, `step2`, `step3`, `move-expectations`, `studio-restore`, `drag-resize-move`, `studio-benchmark`) fail with connection refused or selector mismatches because the studio demo page was redesigned during Phase 2B, while the test assertions expect the earlier layout. Per user instructions, these failure modes were left untouched and are explicitly designated as Phase 2C-2 scope.
2. **Pre-existing Development Process on Port 3000:**
   An active Node process (PID 30600) was detected listening on port 3000. Under `SLIGHTNUDGE_TEST=1`, test suites now divert browser traffic away from port 3000 to ephemeral free ports or non-listening port `3999`, ensuring test isolation and protecting the real `.slightnudge/history/edits.json` from mutation.
3. **Control Lab Lockfile:**
   `test/labs/m0-control-lab/package-lock.json` was omitted from tracking to prevent repository bloat, as dependencies are junctioned directly from `node_modules`.

---

## What I Did NOT Verify

1. **Live User Dragging & Mouse Gestures:**
   All browser tests were executed using automated Playwright sessions in headless Chromium; manual human interactive drag testing in a live browser window was not performed.
2. **Tailwind CSS v2:**
   Tailwind verifications covered Tailwind CSS v3 and v4 only, matching project requirements.
3. **Live Payment Gateway Network Traffic:**
   Dodo payments API endpoints and webhook signatures were verified via test mocks, not with live external payment provider network calls.
4. **Non-Chromium Browser Engines:**
   Tests were executed against Chromium; WebKit and Firefox rendering was not verified.

---

## Confirmation of Temp Folders and Servers Cleanup

1. **Temporary Directories (`os.tmpdir()`):**
   - `sn-ws-*`: Ephemeral workspace folders created during S1, S2, S3, S5, and Fixture test runs — all removed cleanly via `ws.cleanup()`.
   - `sn-lab-*`: Ephemeral lab workspace copies created during M0 and Overfit test runs — directory junctions unlinked and temp folders removed via `lab.cleanup()`.
   - `sn-tw3-*`: Tailwind v3 test temp directories — unlinked and deleted in `finally` blocks.
2. **Ephemeral Background Servers:**
   - Ephemeral dev servers on dynamic TCP ports (e.g. 58380, etc.) were terminated cleanly via process tree kills (`taskkill /pid <PID> /T /F` on Windows) during `lab.stop()` and `server.stop()`.
   - Pre-existing port 3000 background server was left untouched.
3. **Repository Integrity:**
   - Real `.slightnudge/history/edits.json` SHA-256 verified before and after all runs:
     `29E3FF2CF25549FB7ED6165749AD5175934865BA6266CCF266DFE00CC8197B52` (100% identical).
   - Real `fixtures/` directory: completely clean and untouched (`git status --porcelain fixtures` is empty).
   - Real worktree status: 0 tracked files modified; only untracked `docs/` and `scratch/` artifacts remain.

---

# Phase 2C-2 Studio Polish & Apply Button Consolidation

## 1. Polish Implementation Overview

### A. Drag State Cleanliness & Visual Isolation
- **Active Drag Cleanup:** When a move drag begins (`isDraggingMove === true`), all surrounding clutter is suppressed:
  - HUDBar floating toolbar: `renderHUDBar()` returns `null`.
  - Resize handles (North, South, East, West, corners) and live dimension badges: guarded with `!isDraggingMove`.
  - Move handle grabber pill: styled with `isDraggingMove ? 'opacity-0' : ''`. Keeping the DOM element mounted with `opacity-0` prevents Chromium pointer capture drop (which aborted drag gestures when `pointer-events: none` was applied).
  - Target Drop Indicator: Streamlined to a clean, crisp 2px emerald line (`bg-emerald-500 shadow-sm rounded-full`) tagged with `data-testid="drop-indicator"` and `pointer-events-none`.

### B. Smart HUDBar Headroom & Anti-Collision Placement
- **Headroom Calculation:** HUDBar checks element bounds and viewport headroom:
  - If headroom is insufficient (`rect.top < 180`) or target is a `button` element: flips below with `top-full mt-3`.
  - Otherwise positioned above with `-top-[68px]`, providing an 8px air gap above the `-top-[20px]` move grabber handle.
  - Horizontal position is clamped to viewport bounds, ensuring the HUDBar never clips outside the canvas or overlaps selected content.

### C. Single Unified Apply Button Dock in Inspector
- **Consolidation:** Eliminated the redundant floating canvas review banner (`lines 2315–2386` in `app/studio/page.tsx`).
- **Right Inspector Panel Dock:** Consolidated directly beneath the inspector header (lines 2355–2437):
  - Live pulse status dot (`bg-emerald-500 animate-pulse`) with "Live on canvas" label.
  - Human-readable summary badge (`summary || 'Pending visual change'`).
  - Inline "View Diff" toggle with expandable diff card (`- oldValue` in rose, `+ newValue` in emerald, monospace syntax).
  - Primary "Apply to code" button with real-time loading spinner (`LoaderCircle className="animate-spin"`).
  - Secondary "Discard" button restoring canvas and file state immediately.

---

## 2. Test Verification & Benchmark Results

### A. Core Regression & Polish Suites (100% PASS)
- **`npm test`:** 100% PASS (17 unit, 12 payments, 27 security, 16 funnel).
- **`test/in-situ-focus.test.ts`:** 100% PASS (CORS origin validation, preflight 204, standalone shadow DOM bridge, Next.js config adapter lifecycle).
- **`test/token-undo.test.ts`:** 100% PASS (12/12 scenarios including Prettier reformat preservation, AST token preservation, and atomic write failure isolation).
- **`test/drag-resize-move.test.ts`:** 100% PASS (iOS move pill render, precision edge/corner handles, live dimension badge revealed dynamically during drag and hidden when idle, pending edit dock activation, AST code apply, and byte-for-byte undo).
- **`test/studio-restore.test.ts`:** 100% PASS (10/10 end-to-end studio actions tested against the inspector dock).
- **`test/studio-benchmark.test.ts`:** 100% PASS (20/20 tasks verified with 2418ms avg latency; 100% success rate).

---

## 3. Fixtures & Edit History Baseline Verification

1. **Fixtures Directory (`fixtures/`):**
   - `git status --porcelain fixtures`: **CLEAN (0 dirt)**.
   - `fixtures/1-plain-static.tsx`: completely untouched and identical to repository baseline.
2. **Edit History Baseline (`.slightnudge/history/edits.json`):**
   - Exact length: **462,893 bytes**.
   - Target SHA-256: `29E3FF2CF25549FB7ED6165749AD5175934865BA6266CCF266DFE00CC8197B52`.
   - Verified SHA-256: `29E3FF2CF25549FB7ED6165749AD5175934865BA6266CCF266DFE00CC8197B52` (**100% MATCH**).
