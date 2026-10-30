# Phase 2A Completion & Verification Report

**Date**: October 20, 2026  
**Active Working Branch**: [`fix/history-resilience`](file:///c:/dev/vibecheck)  
**Merged Target Branch**: [`feat/studio-full-controls`](file:///c:/dev/vibecheck)  
**Safety Tag**: `phase2a-merged`  

---

## Executive Summary

Phase 2A completion followed the mandatory 4-step sequence exactly without skipping or reordering steps:
1. **Step 1 (S5 Theme Verifier Blocker Fixed)**: Re-engineered `lib/slightnudge/tailwind-verifier.ts` to locate and load the target project's real CSS entry point (supporting Tailwind v4 `@theme`, `@config`, `@plugin`, `@source`, and root layout imports), resolve dependencies exclusively from the target project's `node_modules`, cache design systems per (project root, entry mtime, config mtime), and refuse classes that produce no CSS. Validated via new suite `test/s5-theme-support.test.ts` covering subtests (a)-(g). Committed on `fix/phase2a-safety` as [`ed11713`](file:///c:/dev/vibecheck) and [`41b5442`](file:///c:/dev/vibecheck).
2. **Step 2 (End-to-End Verification in Temp Workspace)**: Created an isolated temp copy outside the repository with node_modules junctioned. Ran a full production build (`npm run build`), started the production server on `127.0.0.1:3100`, and executed mutating HTTP requests through the real `/api/slightnudge/apply` API with session tokens and Origin headers. Verified: (i) bogus classes return 409 and leave files unchanged, (ii) `p-4`, `dark:hover:bg-blue-500`, `w-[37px]`, and theme color `bg-brand-500` return 200 and correctly modify files, and (iii) unchanged existing tokens do not trigger refusal. Repeated both on the dev server on `127.0.0.1:3100`. Re-ran all 7 test suites.
3. **Step 3 (Fast-Forward Merge)**: Verified `feat/studio-full-controls` was an ancestor of `fix/phase2a-safety`. Performed a strict fast-forward merge (`git merge --ff-only fix/phase2a-safety`) with zero merge commits. Tagged `phase2a-merged` at [`41b5442`](file:///c:/dev/vibecheck). Re-verified `reorder-safety` and `adapter` test suites.
4. **Step 4 (readHistory() Resilience)**: Created branch `fix/history-resilience`. Wrote failing tests first in `test/history-resilience.test.ts` covering (a)-(f). Resolved the pre-existing fragility in `lib/slightnudge/edit-history.ts` so deleted historical files never crash `apply` or `undo`, missing files are preserved in history marked `missing: true`, paths escaping project root are safely skipped and reported, undo on missing files returns a clear error (`"That file no longer exists."`), and corrupt history files throw a clear error without truncation or overwrite. Committed as [`c4de01d`](file:///c:/dev/vibecheck). Verified 3 consecutive test runs plus regression suites.

---

## Step 1: Fix the S5 Verifier Theme Blocker

### Design Implementation
The root blocker in Phase 2A was that `tailwind-verifier.ts` compiled candidate classes against a hardcoded `@import "tailwindcss";`, which ignored custom theme tokens defined in `@theme` blocks or in legacy `tailwind.config.js` files referenced via `@config`.

The fix implemented the following design:
1. **Target Project Resolution**: Resolves Tailwind from the target project's own `package.json` and `node_modules` by walking up from the target file path. If the target project has no `tailwindcss` dependency or installed package, mutating requests refuse with `"can't verify this class: tailwindcss is not installed"`.
2. **Real CSS Entry Point Detection**: Searches for CSS entries containing `@import "tailwindcss"` or `@tailwind base/components/utilities`, checking root layouts (`app/layout.tsx`, `pages/_app.*`) and common filenames (`app/globals.css`, `src/app/globals.css`, `globals.css`, `src/index.css`, `index.css`, `styles/globals.css`, etc.).
3. **Tailwind v4 Configuration Loading**: Passes the entry file's real content and sets `base` to the entry file's directory so `@theme`, `@config`, `@plugin`, and `@source` resolve identically to the real build. If no entry file exists but a config file does, falls back to `@import "tailwindcss"; @config "<absolute path>";`.
4. **Tailwind v3 PostCSS Support**: For v3 target projects, runs PostCSS using the target project's own `tailwind.config.*`.
5. **Compilation Verification**: Verifies candidate classes generate actual CSS rules. Any engine failure or class producing zero CSS rules triggers refusal.
6. **Design System Caching**: Caches the loaded design system keyed by `(project root, entry file mtime, config mtime)` to ensure rapid verification across repeated applies.

### Commits on `fix/phase2a-safety`
- [`ed11713`](file:///c:/dev/vibecheck): `fix(slightnudge): support project theme colors and CSS config in tailwind verifier`
- [`41b5442`](file:///c:/dev/vibecheck): `fix(test): resolve typescript nullability check in s5-theme-support test`

### Automated Test Suite: `test/s5-theme-support.test.ts`
Failing tests were written first and failures captured in [`step1-s5-theme-support-initial-failures.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step1-s5-theme-support-initial-failures.txt). After fixing, the suite was executed 3 times along with the existing `test/s5-tailwind-compile.test.ts`:

| Test Suite | Run | Evidence File | Result |
| :--- | :--- | :--- | :--- |
| `test/s5-theme-support.test.ts` | Initial Failures | [`step1-s5-theme-support-initial-failures.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step1-s5-theme-support-initial-failures.txt) | **CONFIRMED** (Subtests a and b failed as expected) |
| `test/s5-theme-support.test.ts` | Run 1 | [`step1-s5-theme-support-run1.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step1-s5-theme-support-run1.txt) | **CONFIRMED** (6/6 passed, 0 failed) |
| `test/s5-theme-support.test.ts` | Run 2 | [`step1-s5-theme-support-run2.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step1-s5-theme-support-run2.txt) | **CONFIRMED** (6/6 passed, 0 failed) |
| `test/s5-theme-support.test.ts` | Run 3 | [`step1-s5-theme-support-run3.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step1-s5-theme-support-run3.txt) | **CONFIRMED** (6/6 passed, 0 failed) |
| `test/s5-tailwind-compile.test.ts` | Run 1 | [`step1-s5-tailwind-compile-run1.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step1-s5-tailwind-compile-run1.txt) | **CONFIRMED** (3/3 passed, 0 failed) |
| `test/s5-tailwind-compile.test.ts` | Run 2 | [`step1-s5-tailwind-compile-run2.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step1-s5-tailwind-compile-run2.txt) | **CONFIRMED** (3/3 passed, 0 failed) |
| `test/s5-tailwind-compile.test.ts` | Run 3 | [`step1-s5-tailwind-compile-run3.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step1-s5-tailwind-compile-run3.txt) | **CONFIRMED** (3/3 passed, 0 failed) |

---

## Step 2: End-to-End Verification in Temp Workspace

Verification was executed in a temporary clone outside the repository at `C:\Users\abhis\AppData\Local\Temp\vibecheck-p2a-verify-*` with junctioned `node_modules`. An `@theme` block defining `--color-brand-500: #3b82f6;` was configured in the temporary `app/globals.css`, and a test fixture `fixtures/step2-verify.tsx` was created.

### Production and Dev Server Test Results Table
Evidence file: [`step2-temp-server-e2e.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step2-temp-server-e2e.txt)

| Test ID | Server Mode | Token / Header Setup | Target Class / Edit | Expected Status | Actual Status | File on Disk State | Finding |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **(i)** | Production (`next start -p 3100`) | Valid session token, `Origin: http://localhost:3100` | `bg-nonexistent-999` (bogus) | 409 Conflict | 409 Conflict | Byte-for-byte unchanged | **CONFIRMED** |
| **(ii.1)** | Production (`next start -p 3100`) | Valid session token, `Origin: http://localhost:3100` | `p-4` (standard utility) | 200 OK | 200 OK | Contains `p-4` | **CONFIRMED** |
| **(ii.2)** | Production (`next start -p 3100`) | Valid session token, `Origin: http://localhost:3100` | `dark:hover:bg-blue-500` (stacked variant) | 200 OK | 200 OK | Contains `dark:hover:bg-blue-500` | **CONFIRMED** |
| **(ii.3)** | Production (`next start -p 3100`) | Valid session token, `Origin: http://localhost:3100` | `w-[37px]` (arbitrary value) | 200 OK | 200 OK | Contains `w-[37px]` | **CONFIRMED** |
| **(ii.4)** | Production (`next start -p 3100`) | Valid session token, `Origin: http://localhost:3100` | `bg-brand-500` (project `@theme` color) | 200 OK | 200 OK | Contains `bg-brand-500` | **CONFIRMED** |
| **(iii)** | Production (`next start -p 3100`) | Valid session token, `Origin: http://localhost:3100` | Existing tokens: `existing-token-custom container` | 200 OK (no refusal) | 200 OK | Tokens preserved intact | **CONFIRMED** |
| **(i)** | Dev (`next dev -p 3100`) | Valid session token, `Origin: http://localhost:3100` | `bg-nonexistent-999` (bogus) | 409 Conflict | 409 Conflict | Byte-for-byte unchanged | **CONFIRMED** |
| **(ii.1)** | Dev (`next dev -p 3100`) | Valid session token, `Origin: http://localhost:3100` | `p-4` (standard utility) | 200 OK | 200 OK | Contains `p-4` | **CONFIRMED** |
| **(ii.2)** | Dev (`next dev -p 3100`) | Valid session token, `Origin: http://localhost:3100` | `dark:hover:bg-blue-500` (stacked variant) | 200 OK | 200 OK | Contains `dark:hover:bg-blue-500` | **CONFIRMED** |
| **(ii.3)** | Dev (`next dev -p 3100`) | Valid session token, `Origin: http://localhost:3100` | `w-[37px]` (arbitrary value) | 200 OK | 200 OK | Contains `w-[37px]` | **CONFIRMED** |
| **(ii.4)** | Dev (`next dev -p 3100`) | Valid session token, `Origin: http://localhost:3100` | `bg-brand-500` (project `@theme` color) | 200 OK | 200 OK | Contains `bg-brand-500` | **CONFIRMED** |
| **(iii)** | Dev (`next dev -p 3100`) | Valid session token, `Origin: http://localhost:3100` | Existing tokens: `existing-token-custom container` | 200 OK (no refusal) | 200 OK | Tokens preserved intact | **CONFIRMED** |

### Step 2 Regression Suite Re-runs (Once Each)

| Suite Name | Test File | Evidence File | Pass Count | Finding |
| :--- | :--- | :--- | :--- | :--- |
| `reorder-safety` | `test/reorder-safety.test.ts` | [`step2-reorder-safety.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step2-reorder-safety.txt) | 32/32 | **CONFIRMED** |
| `adapter` | `test/adapter.test.ts` | [`step2-adapter.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step2-adapter.txt) | All passed | **CONFIRMED** |
| `s1-auth-origin` | `test/s1-auth-origin.test.ts` | [`step2-s1-auth-origin.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step2-s1-auth-origin.txt) | 7/7 | **CONFIRMED** |
| `s3-atomic-write` | `test/s3-atomic-write.test.ts` | [`step2-s3-atomic-write.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step2-s3-atomic-write.txt) | 2/2 | **CONFIRMED** |
| `s5-tailwind-compile` | `test/s5-tailwind-compile.test.ts` | [`step2-s5-tailwind-compile.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step2-s5-tailwind-compile.txt) | 3/3 | **CONFIRMED** |
| `s5-theme-support` | `test/s5-theme-support.test.ts` | [`step2-s5-theme-support.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step2-s5-theme-support.txt) | 6/6 | **CONFIRMED** |
| `s2-path-traversal` | `test/s2-path-traversal.test.ts` | [`step2-s2-path-traversal.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step2-s2-path-traversal.txt) | 2/2 | **CONFIRMED** |

Git status was checked after each run; zero tracked files were modified.

---

## Step 3: Fast-Forward Merge

1. Checked out `feat/studio-full-controls`.
2. Confirmed ancestor relationship: `git merge-base --is-ancestor feat/studio-full-controls fix/phase2a-safety` returned exit code `0`.
3. Merged via fast-forward only: `git merge --ff-only fix/phase2a-safety`.
   - Update range: `777c2f4..41b5442`
   - 25 files changed, 1562 insertions(+), 109 deletions(-)
4. Tagged commit: `git tag phase2a-merged`.
5. Captured `git log --oneline -10` in [`step3-git-log.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step3-git-log.txt):
   ```
   41b5442 fix(test): resolve typescript nullability check in s5-theme-support test
   ed11713 fix(slightnudge): support project theme colors and CSS config in tailwind verifier
   e508d80 fix(safety): support __non_webpack_require__ in tailwind-verifier for Next.js webpack server
   e3151d2 fix(safety): refine ESM/CJS loader in tailwind-verifier and update assertion message
   d709584 test(safety): add automated suites for S1 token auth, S3 atomic write retry, and S5 compile verification
   d2bced7 test(safety): S2 regression test for path traversal and junction refusal
   2c198d1 fix(safety): S5 verify Tailwind compilation and AST syntax parse before write
   6174f12 fix(safety): S3 atomic or refuse with retry backoff and no non-atomic fallback
   325e835 fix(safety): S1 authenticated local-only mutating requests with per-session token
   777c2f4 fix(studio): align curved corner pill seamlessly on top of 8px corner curve with zero gap
   ```
6. Re-verified regression suites on `feat/studio-full-controls`:
   - `test/reorder-safety.test.ts`: [`step3-reorder-safety.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step3-reorder-safety.txt) (32/32 pass)
   - `test/adapter.test.ts`: [`step3-adapter.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step3-adapter.txt) (All pass)

---

## Step 4: `readHistory()` Resilience

Created branch `fix/history-resilience` from `feat/studio-full-controls`.

### Problem Solved
In `lib/slightnudge/edit-history.ts`, `readHistory()` previously iterated over every entry in `.slightnudge/history/edits.json` and executed `relativeFilePath(path.resolve(process.cwd(), record.filePath))`, which called `realpathSync(filePath)`. If any previously edited file was subsequently deleted or renamed by the developer, `realpathSync` threw an uncaught `ENOENT`. Because `recordSourceEdit` (Apply), `undoSourceEdit` (Undo), and `canUndoSourceEdit` all invoked `readHistory()`, a single deleted file blocked all Apply and Undo operations workspace-wide.

### Changes Made to `lib/slightnudge/edit-history.ts`
1. **Resilient Record Parsing**:
   - Safely parses JSON; if the file is corrupted, throws a clear error without truncating or overwriting the file.
   - For each record, validates required fields.
   - Checks path containment: any record whose path escapes the workspace root (lexically or via escaping symlink) is skipped and reported (`console.warn`), never followed.
   - Checks if the file exists on disk: if the file exists and is within workspace, marks `missing: false`. If the file does not exist, marks `missing: true` and retains the record in history (never auto-deletes).
2. **Safe Undo**:
   - `undoSourceEdit()` checks `existsSync(absolutePath)`: if the target file has been deleted, returns `{ success: false, error: 'That file no longer exists.' }` instead of crashing with uncaught `ENOENT`.
   - `canUndoSourceEdit()` returns `false` if `record.missing` is true.
3. **Environment Workspace Support**: Added support for `SLIGHTNUDGE_WORKSPACE_ROOT`, `SLIGHTNUDGE_HISTORY_PATH`, and `SLIGHTNUDGE_PENDING_DIR` to guarantee new tests execute in isolated temporary workspaces without mutating the real `.slightnudge` folder.

### Commits on `fix/history-resilience`
- [`c4de01d`](file:///c:/dev/vibecheck): `fix(slightnudge): make readHistory resilient to missing files and corrupt records`

### Automated Test Suite: `test/history-resilience.test.ts`
Initial failure was captured in [`step4-initial-failures.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step4-initial-failures.txt). After fixing, the suite was executed 3 times along with regression suites:

| Suite Name | Run | Evidence File | Results |
| :--- | :--- | :--- | :--- |
| `test/history-resilience.test.ts` | Initial Failures | [`step4-initial-failures.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step4-initial-failures.txt) | **CONFIRMED** (Initial failure shown) |
| `test/history-resilience.test.ts` | Run 1 | [`step4-history-resilience-run1.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step4-history-resilience-run1.txt) | **CONFIRMED** (6/6 passed, 0 failed) |
| `test/history-resilience.test.ts` | Run 2 | [`step4-history-resilience-run2.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step4-history-resilience-run2.txt) | **CONFIRMED** (6/6 passed, 0 failed) |
| `test/history-resilience.test.ts` | Run 3 | [`step4-history-resilience-run3.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step4-history-resilience-run3.txt) | **CONFIRMED** (6/6 passed, 0 failed) |
| `test/reorder-safety.test.ts` | Post Step 4 | [`step4-reorder-safety.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step4-reorder-safety.txt) | **CONFIRMED** (32/32 passed) |
| `test/adapter.test.ts` | Post Step 4 | [`step4-adapter.txt`](file:///c:/dev/vibecheck/docs/phase2b-evidence/step4-adapter.txt) | **CONFIRMED** (All passed) |

---

## Noticed but Not Fixed

1. **Pre-existing Tests Writing into the Real `.slightnudge/history/edits.json`**:
   - Legacy test suites written prior to Phase 2A (`test/s1-auth-origin.test.ts` and `test/s5-theme-support.test.ts` subtest g) write temporary test records into the real `.slightnudge/history/edits.json` during execution and remove them in `finally` blocks. While the new `test/history-resilience.test.ts` uses completely isolated temporary workspaces via `SLIGHTNUDGE_WORKSPACE_ROOT`, the legacy tests were left unmodified to adhere to the mandate of not editing existing test files beyond S5.
2. **Webpack Dynamic-Require Warning**:
   - `lib/slightnudge/tailwind-verifier.ts` dynamically resolves Tailwind packages using `__non_webpack_require__` when running in Webpack, falling back to `createRequire(import.meta.url)` in native Node. Next.js outputs a warning during webpack compilation: `Critical dependency: require function is used in a way in which the dependencies of the variable cannot be statically extracted`. This warning is harmless and deliberate; suppressing it via webpack configuration overrides was omitted to preserve zero-config production build stability.

---

## What I Did NOT Verify

1. **Tailwind v3 Offline Verification**:
   - The active project environment is configured with Tailwind v4 (`tailwindcss@4.3.3` and `@tailwindcss/node@4.3.3`). Tailwind v3 is not installed offline in `node_modules`. Therefore, subtest (d) of `test/s5-theme-support.test.ts` specifically checked for the offline availability of Tailwind v3 and correctly logged `NOTICE [d. Tailwind v3]: UNVERIFIED offline. Node_modules has Tailwind v4.3.3 installed, v3 package not present offline.` rather than faking a v3 environment.
2. **Untracked Scratch Scripts**:
   - Ad-hoc audit scripts in `scratch/` were used for read-only experiments and verification scaffolding. Per Rule 2, files under `scratch/` and evidence directories were not added to git.
