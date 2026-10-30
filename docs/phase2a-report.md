# Phase 2A: P0 Safety Fixes Report

This report documents the implementation and verification of Phase 2A safety fixes (S1, S3, S5) and regression test (S2) for SlightNudge.

---

## 1. Executive Summary

| ID | Issue | Fix Summary | Verdict | Commit Hash |
|---|---|---|---|---|
| **S1** | Unauthenticated mutating requests & missing Host validation | Bound dev server to `127.0.0.1`; generated per-session cryptographically secure token delivered without CORS; enforced Host, Origin, and `timingSafeEqual` token validation as first check on all mutating routes. | **FIXED** | [`325e835`](https://github.com/vibecheck/commit/325e835) |
| **S2** | Path traversal refusal regression test | Added automated regression test verifying that pending previews attempting traversal (`..\` or symlinks/junctions outside workspace) are refused by `apply` leaving target files byte-for-byte unchanged. No product code change. | **VERIFIED** | [`d2bced7`](https://github.com/vibecheck/commit/d2bced7) |
| **S3** | Non-atomic write fallback in `atomicWrite()` | Replaced fallback with robust atomic write: temp file write + flush + chmod + rename over target with up to 5 retries with exponential backoff (`50, 100, 200, 400, 800ms`). On permanent lock, temp file is deleted, target is left byte-for-byte unchanged, and a clear error is returned. Zero non-atomic fallback. | **FIXED** | [`6174f12`](https://github.com/vibecheck/commit/6174f12) |
| **S5** | Unverified Tailwind class writes | Built `lib/slightnudge/tailwind-verifier.ts` detecting target Tailwind version (v3 / v4) using real compiler APIs. Tokens pass only if CSS is generated for them. Handles variants, stacked variants (`dark:hover:bg-blue-500`), and arbitrary values (`w-[37px]`). Added in-memory AST syntax re-parse before write. | **FIXED** | [`2c198d1`](https://github.com/vibecheck/commit/2c198d1), [`e508d80`](https://github.com/vibecheck/commit/e508d80) |

---

## 2. Commit Details & Files Changed

### Fix 1 (S1): Authenticated, Local-Only Mutating Requests
- **Commit**: [`325e835`](https://github.com/vibecheck/commit/325e835) (`fix(safety): S1 authenticated local-only mutating requests with per-session token`)
- **Files Modified/Created**:
  - [`package.json`](file:///c:/dev/vibecheck/package.json): Updated `"dev"` script to bind strictly to `127.0.0.1` (`"dev": "next dev --webpack -H 127.0.0.1"`).
  - [`lib/slightnudge/auth.ts`](file:///c:/dev/vibecheck/lib/slightnudge/auth.ts): Session token generator (`crypto.randomBytes(32).toString('hex')` on `globalThis`) and `validateMutatingRequest(request)` enforcing Host -> Origin -> Token order.
  - [`lib/slightnudge/cors.ts`](file:///c:/dev/vibecheck/lib/slightnudge/cors.ts): Allowed `x-slightnudge-token` in preflight `Access-Control-Allow-Headers`, stripped `0.0.0.0`.
  - [`app/layout.tsx`](file:///c:/dev/vibecheck/app/layout.tsx): Injected token server-side into `window.__SLIGHTNUDGE_SESSION_TOKEN__` without CORS headers.
  - [`app/api/slightnudge/token/route.ts`](file:///c:/dev/vibecheck/app/api/slightnudge/token/route.ts): Same-origin GET endpoint delivering session token without wildcard CORS headers.
  - **Mutating Route Handlers Guarded**:
    - [`app/api/slightnudge/preview/route.ts`](file:///c:/dev/vibecheck/app/api/slightnudge/preview/route.ts) (POST, DELETE)
    - [`app/api/slightnudge/apply/route.ts`](file:///c:/dev/vibecheck/app/api/slightnudge/apply/route.ts) (POST)
    - [`app/api/slightnudge/undo/route.ts`](file:///c:/dev/vibecheck/app/api/slightnudge/undo/route.ts) (POST)
    - [`app/api/slightnudge/assets/route.ts`](file:///c:/dev/vibecheck/app/api/slightnudge/assets/route.ts) (POST)
    - [`app/api/slightnudge/repositories/route.ts`](file:///c:/dev/vibecheck/app/api/slightnudge/repositories/route.ts) (POST)
    - [`app/api/slightnudge/repositories/[id]/adapter/route.ts`](file:///c:/dev/vibecheck/app/api/slightnudge/repositories/%5Bid%5D/adapter/route.ts) (POST, DELETE)
    - [`app/api/slightnudge/repositories/[id]/docker-preview/route.ts`](file:///c:/dev/vibecheck/app/api/slightnudge/repositories/%5Bid%5D/docker-preview/route.ts) (POST, DELETE)
    - [`app/api/slightnudge/repositories/[id]/preview-check/route.ts`](file:///c:/dev/vibecheck/app/api/slightnudge/repositories/%5Bid%5D/preview-check/route.ts) (POST)
  - **Client Callers Updated with Token Header**:
    - [`lib/slightnudge/client.ts`](file:///c:/dev/vibecheck/lib/slightnudge/client.ts)
    - [`components/slightnudge/SlightNudgeOverlay.tsx`](file:///c:/dev/vibecheck/components/slightnudge/SlightNudgeOverlay.tsx)
    - [`app/studio/[repoId]/page.tsx`](file:///c:/dev/vibecheck/app/studio/%5BrepoId%5D/page.tsx)
    - [`app/workspace/page.tsx`](file:///c:/dev/vibecheck/app/workspace/page.tsx)
    - [`lib/slightnudge/next-source-adapter.ts`](file:///c:/dev/vibecheck/lib/slightnudge/next-source-adapter.ts)

### Fix 2 (S3): Atomic or Refuse
- **Commit**: [`6174f12`](https://github.com/vibecheck/commit/6174f12) (`fix(safety): S3 atomic or refuse with retry backoff and no non-atomic fallback`)
- **Files Modified**:
  - [`lib/slightnudge/edit-history.ts`](file:///c:/dev/vibecheck/lib/slightnudge/edit-history.ts):
    - Completely eliminated `writeFileSync(filePath, ...)` fallback.
    - Flushes temp file via `writeSync` + `fsyncSync` + `closeSync`.
    - Handles lock errors (`EPERM`, `EBUSY`, `EACCES`) with up to 5 exponential backoff retries (`50ms, 100ms, 200ms, 400ms, 800ms`).
    - If rename fails permanently: deletes temp file, leaves original target file unchanged, and returns `{ success: false, error: "The file is locked and nothing was changed (...)" }`.

### Fix 3 (S5): Verify Before Write
- **Commits**:
  - [`2c198d1`](https://github.com/vibecheck/commit/2c198d1) (`fix(safety): S5 verify Tailwind compilation and AST syntax parse before write`)
  - [`e508d80`](https://github.com/vibecheck/commit/e508d80) (`fix(safety): support __non_webpack_require__ in tailwind-verifier for Next.js webpack server`)
- **Files Modified/Created**:
  - [`lib/slightnudge/tailwind-verifier.ts`](file:///c:/dev/vibecheck/lib/slightnudge/tailwind-verifier.ts):
    - Detects installed Tailwind version (v3 vs v4) in the target project.
    - Uses v4 real API (`candidatesToCss` / `compile` build API) or v3 PostCSS pipeline with candidate as raw content.
    - Confirms generated CSS is non-empty. Accepts stacked variants (`dark:hover:bg-blue-500`) and arbitrary values (`w-[37px]`).
    - If engine cannot be loaded or run, refuses with `"can't verify this class: ..."`.
    - Implemented `verifySyntacticParse` using `ts-morph` AST syntax diagnostics to verify content compiles before disk write.
  - [`lib/slightnudge/edit-history.ts`](file:///c:/dev/vibecheck/lib/slightnudge/edit-history.ts):
    - Validates newly added/changed className tokens against Tailwind engine.
    - Runs in-memory AST syntax re-parse check before calling `atomicWrite()`.
  - [`app/api/slightnudge/apply/route.ts`](file:///c:/dev/vibecheck/app/api/slightnudge/apply/route.ts): Awaited async `applyPendingSourceEdit()`.

### Fix 4 (S2): Path Traversal Regression Test
- **Commit**: [`d2bced7`](https://github.com/vibecheck/commit/d2bced7) (`test(safety): S2 regression test for path traversal and junction refusal`)
- **Files Created**:
  - [`test/s2-path-traversal.test.ts`](file:///c:/dev/vibecheck/test/s2-path-traversal.test.ts): Verifies path traversal with `..\` and junctions/symlinks outside workspace are refused without changing target files. No code changes to `relativeFilePath()`.

### Test Suites Added
- **Commit**: [`d709584`](https://github.com/vibecheck/commit/d709584) (`test(safety): add automated suites for S1 token auth, S3 atomic write retry, and S5 compile verification`)
  - [`test/s1-auth-origin.test.ts`](file:///c:/dev/vibecheck/test/s1-auth-origin.test.ts): 7 automated tests for token, Host, and Origin validation.
  - [`test/s3-atomic-write.test.ts`](file:///c:/dev/vibecheck/test/s3-atomic-write.test.ts): 2 automated tests for permanent rename failure refusal and 2-failure retry success.
  - [`test/s5-tailwind-compile.test.ts`](file:///c:/dev/vibecheck/test/s5-tailwind-compile.test.ts): 3 automated tests for bogus class refusal, valid/stacked/arbitrary class acceptance, and broken AST syntax refusal.

---

## 3. Every Write/Mutating Route Found

The following 11 mutating endpoints exist in SlightNudge and were all secured with the first-line Host, Origin, and session token checks:

1. `POST /api/slightnudge/preview`: Creates pending preview snapshot in `.slightnudge/pending/`.
2. `DELETE /api/slightnudge/preview`: Deletes pending preview snapshot from `.slightnudge/pending/`.
3. `POST /api/slightnudge/apply`: Applies pending source edit to disk and records history in `.slightnudge/history/edits.json`.
4. `POST /api/slightnudge/undo`: Reverts recent source edit and updates `.slightnudge/history/edits.json`.
5. `POST /api/slightnudge/assets`: Uploads and writes asset files to the project `public/` directory.
6. `POST /api/slightnudge/repositories`: Clones and registers external repository.
7. `POST /api/slightnudge/repositories/[id]/adapter`: Writes SlightNudge adapter script into target project.
8. `DELETE /api/slightnudge/repositories/[id]/adapter`: Removes SlightNudge adapter script from target project.
9. `POST /api/slightnudge/repositories/[id]/docker-preview`: Spawns Docker preview process.
10. `DELETE /api/slightnudge/repositories/[id]/docker-preview`: Terminates Docker preview container.
11. `POST /api/slightnudge/repositories/[id]/preview-check`: Triggers preview check state mutation.

*(Note: `/api/slightnudge/nudge` and `/api/slightnudge/style` were found to return HTTP 410 Gone with direct edits disabled).*

---

## 4. Test Evidence & Verification Results

### Baseline Evidence (Pre-Change)
- Baseline Reorder Safety: [`docs/phase2-evidence/baseline-reorder-safety.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/baseline-reorder-safety.txt) (32/32 tests passed)
- Baseline Adapter: [`docs/phase2-evidence/baseline-adapter.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/baseline-adapter.txt) (All in-situ focus tests passed)
- Baseline S1 Vulnerability Demonstration: [`docs/phase2-evidence/baseline-s1-failing.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/baseline-s1-failing.txt)
- Baseline S3 Fallback Demonstration: [`docs/phase2-evidence/baseline-s3-failing.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/baseline-s3-failing.txt)
- Baseline S5 Bogus Class Write Demonstration: [`docs/phase2-evidence/baseline-s5-failing.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/baseline-s5-failing.txt)

---

### Three Full Verification Runs (Post-Fix)

All 6 suites were run 3 times consecutively. Every run passed 100%. `git status` after each run confirmed the fixtures directory remained clean (`git checkout -- fixtures/` was run whenever dirty).

#### Run 1 Evidence
- Reorder Safety (32/32 passed): [`docs/phase2-evidence/run1-reorder-safety.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run1-reorder-safety.txt)
- Adapter (100% passed): [`docs/phase2-evidence/run1-adapter.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run1-adapter.txt)
- S1 Auth & Origin (7/7 passed): [`docs/phase2-evidence/run1-s1-auth-origin.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run1-s1-auth-origin.txt)
- S3 Atomic Write Retry (2/2 passed): [`docs/phase2-evidence/run1-s3-atomic-write.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run1-s3-atomic-write.txt)
- S5 Tailwind Compile & Parse (3/3 passed): [`docs/phase2-evidence/run1-s5-tailwind-compile.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run1-s5-tailwind-compile.txt)
- S2 Path Traversal Regression (2/2 passed): [`docs/phase2-evidence/run1-s2-path-traversal.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run1-s2-path-traversal.txt)
- Git Status Check: [`docs/phase2-evidence/run1-git-status.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run1-git-status.txt)

#### Run 2 Evidence
- Reorder Safety (32/32 passed): [`docs/phase2-evidence/run2-reorder-safety.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run2-reorder-safety.txt)
- Adapter (100% passed): [`docs/phase2-evidence/run2-adapter.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run2-adapter.txt)
- S1 Auth & Origin (7/7 passed): [`docs/phase2-evidence/run2-s1-auth-origin.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run2-s1-auth-origin.txt)
- S3 Atomic Write Retry (2/2 passed): [`docs/phase2-evidence/run2-s3-atomic-write.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run2-s3-atomic-write.txt)
- S5 Tailwind Compile & Parse (3/3 passed): [`docs/phase2-evidence/run2-s5-tailwind-compile.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run2-s5-tailwind-compile.txt)
- S2 Path Traversal Regression (2/2 passed): [`docs/phase2-evidence/run2-s2-path-traversal.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run2-s2-path-traversal.txt)
- Git Status Check: [`docs/phase2-evidence/run2-git-status.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run2-git-status.txt)

#### Run 3 Evidence
- Reorder Safety (32/32 passed): [`docs/phase2-evidence/run3-reorder-safety.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run3-reorder-safety.txt)
- Adapter (100% passed): [`docs/phase2-evidence/run3-adapter.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run3-adapter.txt)
- S1 Auth & Origin (7/7 passed): [`docs/phase2-evidence/run3-s1-auth-origin.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run3-s1-auth-origin.txt)
- S3 Atomic Write Retry (2/2 passed): [`docs/phase2-evidence/run3-s3-atomic-write.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run3-s3-atomic-write.txt)
- S5 Tailwind Compile & Parse (3/3 passed): [`docs/phase2-evidence/run3-s5-tailwind-compile.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run3-s5-tailwind-compile.txt)
- S2 Path Traversal Regression (2/2 passed): [`docs/phase2-evidence/run3-s2-path-traversal.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run3-s2-path-traversal.txt)
- Git Status Check: [`docs/phase2-evidence/run3-git-status.txt`](file:///c:/dev/vibecheck/docs/phase2-evidence/run3-git-status.txt)

---

## 5. Noticed but Not Fixed

1. **`readHistory()` Fragility on Unlinked Historical Files**: In [`lib/slightnudge/edit-history.ts`](file:///c:/dev/vibecheck/lib/slightnudge/edit-history.ts), `readHistory()` loops through every record in `.slightnudge/history/edits.json` and invokes `relativeFilePath(path.resolve(process.cwd(), record.filePath))` which executes `realpathSync`. If any file previously recorded in history is subsequently deleted or renamed by the developer, `readHistory()` throws `ENOENT`, which breaks undo functionality for all other files.
2. **Inspection Endpoints Read-Only POST**: [`app/api/slightnudge/inspect/route.ts`](file:///c:/dev/vibecheck/app/api/slightnudge/inspect/route.ts) and [`app/api/slightnudge/repositories/[id]/inspect/route.ts`](file:///c:/dev/vibecheck/app/api/slightnudge/repositories/%5Bid%5D/inspect/route.ts) use HTTP POST for reading element layout/attributes from source. They perform CORS origin checks but do not mutate disk; per rules, they were not modified.
3. **Node.js `fetch` (undici) Forbidden Header Policy**: Node's built-in `fetch()` strips or overrides user-supplied `'Host'` headers with the URL's hostname. Testing Host header spoofing requires `node:http.request`.

---

## 6. What I Did NOT Verify

1. **Windows Administrative Directory Symlink Creation**: On Windows, creating true directory symlinks (`fs.symlinkSync(..., 'dir')`) requires Windows Developer Mode or administrator privileges. NTFS junctions (`fs.symlinkSync(..., 'junction')`) were verified without elevation, successfully demonstrating `realpathSync` outside-workspace refusal.
2. **Public Internet / Reverse Proxy Host Headers**: SlightNudge was intentionally bound to `127.0.0.1` and configured for local host headers (`localhost:PORT`, `127.0.0.1:PORT`). Deployment behind public reverse proxies or custom domain names was not tested as SlightNudge is designed as a local-only studio tool.
3. **Billing & SaaS Endpoints**: Webhook routes (`/api/webhooks/dodo`) and SaaS checkout routes (`/api/checkout`) belong to the hosting platform rather than the SlightNudge visual editor engine and were outside scope.
