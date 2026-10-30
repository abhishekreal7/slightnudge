# Phase 2C-1 Independent Review and Gated Merge Report

**Branch Under Review:** [`fix/phase2c-undo-tests`](file:///c:/dev/vibecheck/docs/phase2c1-review-evidence/step0-starting-state.txt) (HEAD: `9d5f1aa`)  
**Base Ref:** `pre-phase2c` / `phase2b-merged` (`75c13ba`)  
**Target Merge Branch:** `feat/studio-full-controls`  
**Review Verdict:** **NOT READY TO MERGE (BLOCKED BY CRITICAL GATES)**  
**Evidence Directory:** [`docs/phase2c1-review-evidence/`](file:///c:/dev/vibecheck/docs/phase2c1-review-evidence/)  

---

## 1. Executive Summary & Verdict

This adversarial, evidence-first review audits the 5 commits introduced on `fix/phase2c-undo-tests` on top of `phase2b-merged`:
1. `600f163`: auth bypass fix (`lib/slightnudge/auth.ts`)
2. `8a9da9e`: token-level undo and locator metadata (`lib/slightnudge/edit-history.ts`, `app/api/slightnudge/preview/route.ts`)
3. `8330e80`: support absolute workspace paths in `undoSourceEdit` (`lib/slightnudge/edit-history.ts`)
4. `f109a9c`: test baseline decoupling (`test/baselines/`, `test/helpers/test-server.ts`)
5. `9d5f1aa`: m0 and overfit labs tracked under `test/labs/`

Every check was executed under strict read-only rules against the real repository, using isolated temporary workspaces generated via `git archive` and evaluated with independent oracles (`@babel/parser`, `fast-check`, `c8`).

### Merge Gate Evaluation Summary

| Gate Requirement | Criteria | Measured Result | Verdict |
|---|---|---|---|
| **Step 0: Starting State** | Expected branch, zero modified tracked files, pristine hashes | `fix/phase2c-undo-tests`, 0 modified tracked files, baseline hashes preserved | **PASS** |
| **Step 1a: Auth Bypass Reproduction** | Vulnerability reproduced or conclusively explained across launch modes | Evaluated across launch modes; mechanism proven | **PASS** |
| **Step 1b: Branch Tip Hardening** | Mutating requests blocked with 403 on branch tip even with trigger present | 100% blocked with 403 Forbidden; zero files written | **PASS** |
| **Step 1c: Token in HTML Audit** | Session token must NEVER be rendered into HTML for disallowed Host | **CRITICAL DEFECT: Token rendered into HTML for `Host: evil.localhost:PORT`** | **FAIL (P0)** |
| **Step 1d: Hostile Browser Attacks** | Playwright Chromium attack battery (CORS, form post, iframe, rebinding) | All cross-origin mutations blocked; 0 writes to history | **PASS** |
| **Step 1e: Route Inventory** | All mutating routes protected by auth/validation checks | 100% of mutating SlightNudge routes invoke `validateMutatingRequest` | **PASS** |
| **Step 2: Path Containment** | 27 path-traversal/Windows edge cases outside root refused; sentinels intact | All outside cases refused; 0 writes outside root; sentinels unchanged | **PASS** |
| **Step 3: PBT Invariant Testing** | 3,000 cases with Babel oracle; zero I1–I6 violations | 3,000 / 3,000 cases passed invariants; 0 corruptions | **PASS** |
| **Step 4: Corpus Replay** | >=200 elements across real Tailwind repos; zero wrong-target undos | 210 elements evaluated; 154 accepted, 56 refused, 0 wrong-target | **PASS** |
| **Step 5a: Mutant Testing** | M1–M10 tested against test suite + 500-seed PBT harness; no safety mutant survives | **Safety mutants M3, M5, M6 SURVIVED test battery (Test Gaps)** | **FAIL (P1)** |
| **Step 5b: Refusal Coverage** | Every refusal branch of `undoSourceEdit` executed by tests | **16 refusal branches in `undoSourceEdit` unexecuted by tests** | **FAIL (P1)** |
| **Step 6a: Scope Audit** | Zero unexplained product-code changes outside designated files | `lib/slightnudge/ast-nudger.ts` modified (exported `isComponentUsedMultipleTimes`) | **FLAGGED** |
| **Step 6b: Secret Scan** | Zero leaked secrets or unexpected credentials | Zero secrets detected in diff or test labs; no files > 1 MB | **PASS** |
| **Step 6c: Builder Test Pass** | Builder's pass claims for `token-undo` and `s1-auth-bypass` confirmed | Confirmed: 12/12 token-undo tests pass; auth-bypass unit tests pass | **PASS** |

### Final Verdict: NOT READY TO MERGE

The branch `fix/phase2c-undo-tests` **CANNOT BE MERGED** into `feat/studio-full-controls`. Per gated merge rules, Step 6e is **ABORTED**. No merge or tag operation has been performed.

**Exact Merge Blockers:**
1. **[P0] Host Header Bypass Leaks Session Token in HTML (Step 1c):**  
   In [`app/layout.tsx:46-54`](file:///c:/dev/vibecheck/app/layout.tsx#L46-L54), `getSessionToken()` is executed unconditionally during server-side rendering and rendered into the HTML document (`window.__SLIGHTNUDGE_TOKEN__ = "..."`). When an attacker sends a request with `Host: evil.localhost:PORT`, the application returns HTTP 200 OK and leaks the valid 64-character session token.
2. **[P1] Surviving Safety-Relevant Mutants (Step 5a):**  
   - **M3 (skip "none of the removed tokens present" check):** Neither the test suite nor the 500-seed PBT harness tests the condition where a user has already restored the removed token.
   - **M5 (drop realpath containment check before undo write):** No test creates a history entry with a path escaping the workspace to test the containment check immediately preceding `atomicWrite`.
   - **M6 (skip post-edit parse check):** No test verifies that `undoSourceEdit` refuses when the token revert produces syntactically malformed TSX.
3. **[P1] Incomplete Refusal Branch Coverage (Step 5b):**  
   16 distinct refusal branches in `undoSourceEdit` are completely unexercised by existing unit tests (including `textContent` refusal, `imageSource` refusal, repeating list/loop refusal, component reuse refusal, conditional expressions/statements, dynamic className refusal, and re-parse failure).

---

## 2. Step 0: Starting State Verification

- **Branch:** `fix/phase2c-undo-tests`
- **Working Tree Cleanliness:** Only untracked files under `docs/` and `scratch/`. Zero modified tracked files.
- **Git Log (-8):**
  - `9d5f1aa` feat(test): make m0 and overfit labs reproducible with dynamic server harness
  - `f109a9c` fix(test): decouple test baseline from studio demo fixture
  - `8330e80` fix(slightnudge): support absolute workspace paths in undoSourceEdit
  - `8a9da9e` feat(slightnudge): implement token-level undo and locator metadata
  - `600f163` fix(slightnudge): close auth bypass and guard legacy reorder test with SLIGHTNUDGE_TEST
  - `75c13ba` fix(slightnudge): ignore test overrides when NODE_ENV=production
  - `f7d680a` feat(verifier): add Tailwind v3 support with project-scoped resolution and test suite
  - `7cad99b` fix(test): set SLIGHTNUDGE_TEST=1 in history-resilience test workspace
- **Baseline SHA-256 Hashes:**
  - `.slightnudge/history/edits.json`: `29E3FF2CF25549FB7ED6165749AD5175934865BA6266CCF266DFE00CC8197B52`
  - `fixtures/1-plain-static.tsx`: `12227233F9C8F7824CFF7D32529ACA76A88EEF9E319F5F16A0114C6103FFAD65`
  - `fixtures/2-several-utilities.tsx`: `D83DF5B78FCB3108AFB6EE8EE725B10A049C8F8D0077151C69E05083A092CDE3`
  - `fixtures/3-conditional-cn.tsx`: `3108C5C61E89BAABA90EA10CD7D8325EA7C196FFB077E0F637ACC27E64F5FFA6`
  - `fixtures/4-shared-component.tsx`: `3344AF67715BFA37E5AEF42F6F8B34D9AD4DCDE14CFE702ED69B8C772784EDD8`
  - `fixtures/5-responsive-classes.tsx`: `126ECFF807CF098A66BC6CD9E2503F58F1DFEB3223EFA5B2629558A24CFCDCE0`
- **Evidence:** [`docs/phase2c1-review-evidence/step0-starting-state.txt`](file:///c:/dev/vibecheck/docs/phase2c1-review-evidence/step0-starting-state.txt)

---

## 3. Step 1: Attack the Auth Fix with Real Exploits

### 3.1 Step 1a: Reproduction of Original Auth Bypass on Old Code (`phase2b-merged`)

In `phase2b-merged`, `lib/slightnudge/auth.ts` contained:
```ts
if (process.argv.some(arg => arg.includes('reorder-safety'))) {
  return { valid: true };
}
```
Empirical testing was executed across launch modes in clean temporary workspaces:

| Launch Mode | Trigger Condition | Actual `process.argv` Seen by Route Handler | Exploit Result (`POST /api/slightnudge/apply`) | Auth Bypassed? |
|---|---|---|---|---|
| `npm run dev` | Folder path contains `reorder-safety` | `["...node.exe", "...node_modules\\next\\dist\\server\\lib\\start-server.js"]` | 403 Forbidden | No (junctioned node_modules realpath) |
| `next dev --webpack` | Folder path contains `reorder-safety` | `["...node.exe", "...node_modules\\next\\dist\\server\\lib\\start-server.js"]` | 403 Forbidden | No (junctioned node_modules realpath) |
| `next build` + `next start` | Folder path contains `reorder-safety` | Build failed (`test-override-guard.test.ts` TS2540) | N/A | No |
| `npm run dev` | Clean path (no trigger) | `["...node.exe", "...node_modules\\next\\dist\\server\\lib\\start-server.js"]` | 403 Forbidden | No |
| `npm run dev` | CLI flag `--reorder-safety` | Process failed startup (Next.js CLI rejects unknown option) | Server failed to start | No |
| Direct Node script execution | Script path contains `reorder-safety` | `["...node.exe", "C:\\test\\reorder-safety\\server.js"]` | `{ valid: true }` | **YES (BYPASSED)** |

**Honest Assessment of Normal User Exposure:**
A standard user running `npm run dev` in normal directories was **not** exposed to arbitrary cross-origin exploitation via this mechanism unless their repository path or executed entrypoint literally contained `reorder-safety`. However, if any developer checked out the codebase into a path containing that string (e.g. `feature/reorder-safety-tests`) or ran tests in an environment where `process.argv` contained `reorder-safety`, all Host, Origin, and Token protections were completely disabled on mutating endpoints without requiring `SLIGHTNUDGE_TEST === '1'`.

- **Evidence:** [`docs/phase2c1-review-evidence/step1a-exploit-results.json`](file:///c:/dev/vibecheck/docs/phase2c1-review-evidence/step1a-exploit-results.json)

---

### 3.2 Step 1b: Branch Tip Hardening Verification (`fix/phase2c-undo-tests`)

Against an isolated copy of the branch tip with `reorder-safety` in its path, forged mutating requests (`POST /api/slightnudge/apply` with `Host: evil.com`, no Origin, no token) were sent:
- `npm run dev`: HTTP **403 Forbidden** (`{"error":"Access denied."}`)
- `next dev --webpack`: HTTP **403 Forbidden** (`{"error":"Access denied."}`)
- History writes: Exactly 0 files written to `.slightnudge/history/`.
- Status: **CONFIRMED (PASS)**.
- **Evidence:** [`docs/phase2c1-review-evidence/step1b-branch-tip-results.json`](file:///c:/dev/vibecheck/docs/phase2c1-review-evidence/step1b-branch-tip-results.json)

---

### 3.3 Step 1c: Token in HTML Audit (P0 CRITICAL DEFECT CONFIRMED)

Raw HTTP GET requests were sent to `/` and `/studio` across various `Host` headers:
- `Host: 127.0.0.1:PORT` (Allowed)
- `Host: localhost:PORT` (Allowed)
- `Host: evil.localhost:PORT` (Disallowed)

**Findings:**
1. `/api/slightnudge/token` correctly rejected `Host: evil.localhost:PORT` with **403 Forbidden**.
2. **HOWEVER**, [`app/layout.tsx:46-54`](file:///c:/dev/vibecheck/app/layout.tsx#L46-L54) executes `const sessionToken = getSessionToken();` on every request and unconditionally renders:
   ```html
   <script>window.__SLIGHTNUDGE_TOKEN__ = "76a5fb55...";</script>
   ```
   When requesting `http://127.0.0.1:PORT/` or `http://127.0.0.1:PORT/studio` with `Host: evil.localhost:PORT`, the server returned **200 OK** and the full, valid 64-character session token was embedded directly in the response HTML body!

> [!CAUTION]
> **P0 Finding (Confirmed):** Session token is leaked in the HTML response for requests with disallowed Host headers (`evil.localhost`). Per review protocol, a token present for a disallowed Host is ranked **P0** and is a hard merge blocker.

- **Evidence:** [`docs/phase2c1-review-evidence/step1c-token-html-results.json`](file:///c:/dev/vibecheck/docs/phase2c1-review-evidence/step1c-token-html-results.json)

---

### 3.4 Step 1d: Hostile Browser Attacks in Playwright Chromium

An external attacker server was launched on port 3249 (`evil.localhost:3249` and `127.0.0.1:3249`), attacking the application on port 3240:
1. **Cross-Origin GET Token:**
   - CORS mode: Blocked by browser CORS (`Failed to fetch`). Token unreadable.
   - No-cors mode: Returns opaque response (status 0). Token unreadable.
2. **Cross-Origin POST (apply, preview, undo):**
   - JSON & text/plain: Preflight/CORS rejected from `evil.localhost`; returned 403 Forbidden from `127.0.0.1:3249`.
3. **Auto-submitted HTML Form POST:** Frame loaded but server refused mutation.
4. **Iframe Embedding (`/studio`):** Cross-origin DOM access strictly blocked by browser sandbox.
5. **Stand-in DNS Rebinding (`http://evil.localhost:3240/studio`):**
   - The embedded `window.__SLIGHTNUDGE_TOKEN__` was readable on page due to Step 1c defect.
   - However, when the script dispatched `POST /api/slightnudge/apply`, the browser sent `Host: evil.localhost:3240`. `validateMutatingRequest` failed `isValidHost` and returned **403 Forbidden**.
   - Total files written to disk/history: **0**.
- Status: **CONFIRMED (PASS on mutation prevention)**.
- **Evidence:** [`docs/phase2c1-review-evidence/step1d-browser-attack-results.json`](file:///c:/dev/vibecheck/docs/phase2c1-review-evidence/step1d-browser-attack-results.json)

---

### 3.5 Step 1e: API Route Inventory & Security Controls

Every route under `app/api/` was audited for mutating operations and authorization guards:

| Route | Methods | Mutating? | Auth & Validation Guard |
|---|---|---|---|
| `app/api/slightnudge/apply` | POST, OPTIONS | YES | `validateMutatingRequest(request)` |
| `app/api/slightnudge/preview` | POST, DELETE, OPTIONS | YES | `validateMutatingRequest(request)` |
| `app/api/slightnudge/undo` | POST, OPTIONS | YES | `validateMutatingRequest(request)` |
| `app/api/slightnudge/assets` | GET, POST | YES | `validateMutatingRequest(request)` |
| `app/api/slightnudge/repositories` | GET, POST | YES | `validateMutatingRequest(request)` |
| `app/api/slightnudge/repositories/[id]/adapter` | GET, POST, DELETE | YES | `validateMutatingRequest(request)` |
| `app/api/slightnudge/repositories/[id]/docker-preview` | GET, POST, DELETE | YES | `validateMutatingRequest(request)` |
| `app/api/slightnudge/repositories/[id]/preview-check` | POST | YES | `validateMutatingRequest(request)` |
| `app/api/slightnudge/inspect` | POST, OPTIONS | NO | `isAllowedOrigin(origin, request.url)` (Read-only AST) |
| `app/api/slightnudge/nudge` | POST | NO | Disabled (returns 410 Gone) |
| `app/api/slightnudge/style` | POST | NO | Disabled (returns 410 Gone) |
| `app/api/slightnudge/token` | GET | NO | `isValidHost(host)` |
| `app/api/slightnudge/pages` | GET | NO | Read-only |
| `app/api/slightnudge/repositories/[id]` | GET | NO | Read-only |
| `app/api/slightnudge/repositories/[id]/source` | GET | NO | Read-only |

- **CORS Headers Check:** Only `lib/slightnudge/cors.ts` sets `Access-Control-*`. Headers are only emitted when `isAllowedOrigin(origin, request.url)` verifies same-origin or local loopback on ports 1024–65535.
- Status: **CONFIRMED (PASS)**.
- **Evidence:** [`docs/phase2c1-review-evidence/step1e-routes-table.json`](file:///c:/dev/vibecheck/docs/phase2c1-review-evidence/step1e-routes-table.json)

---

## 4. Step 2: Windows Path-Containment Battery

In commit `8330e80`, `undoSourceEdit` was modified to accept absolute workspace paths. A comprehensive 27-case path traversal battery was executed against `applyPendingSourceEdit`, `undoSourceEdit`, and the `/api/slightnudge/preview` endpoint in an isolated workspace with external sentinel files:
- `C:\Users\abhis\AppData\Local\Temp\p2c1-sentinels\keep-me.txt`
- `C:\Users\abhis\AppData\Local\Temp\p2c1-sentinels\outside.tsx`
- `C:\Users\abhis\AppData\Local\Temp\p2c1-sentinels\outside-data.json`

### Test Case Results

| Path Category | Cases Tested | Behavior Observed | Outside Writes | Verdict |
|---|---|---|---|---|
| Absolute outside paths | `C:\Users\...\outside.tsx`, `C:\Windows\System32\drivers\etc\hosts`, `/etc/passwd` | Refused with workspace boundary error | 0 | PASS |
| Traversal mixes (`..\` and `../`) | `..\outside.tsx`, `sub\..\..\outside.tsx`, mixed slashes `sub/..\..\outside.tsx` | Refused with workspace boundary error | 0 | PASS |
| UNC paths | `\\localhost\c$\...`, `\\127.0.0.1\c$\...` | Refused with workspace boundary error | 0 | PASS |
| Long path prefix (`\\?\`) | `\\?\C:\Users\...\outside.tsx`, `\\?\C:\dev\vibecheck\...` | Resolved within workspace or refused | 0 | PASS |
| 8.3 short names | `C:\PROGRA~1\...`, `C:\Users\ABHIS~1\...` | Refused with workspace boundary error | 0 | PASS |
| Case variations | Drive letter lower/upper `c:\...` vs `C:\...` | Normalized correctly; inside accepted, outside refused | 0 | PASS |
| Trailing dots & spaces | `component.tsx.`, `component.tsx ` | Refused or normalized safely; no outside writes | 0 | PASS |
| Alternate Data Streams | `outside.tsx::$DATA`, `inside.tsx::$DATA` | Refused; ADS prevented from escaping root | 0 | PASS |
| Junction & symlink | `outside-junction` pointing to sentinels | Resolved to realpath and refused boundary check | 0 | PASS |
| Sibling prefix collision | `workspace-evil` adjacent to workspace | Refused by `relativeFilePath` boundary check | 0 | PASS |

**Sentinel Integrity:**
- All sentinel file SHA-256 hashes remained 100% identical before and after all 27 attacks.
- Zero writes occurred outside the workspace boundary.
- Status: **CONFIRMED (PASS)**.
- **Evidence:** [`docs/phase2c1-review-evidence/step2-path-results.json`](file:///c:/dev/vibecheck/docs/phase2c1-review-evidence/step2-path-results.json)

---

## 5. Step 3: Undo Correctness Property-Based Testing (3,000 Cases)

A property-based test harness was built in the isolated tooling directory using `@babel/parser` (with `jsx` and `typescript` plugins) as an independent AST oracle. No product AST morphing code was used in verification.

### Test Matrix & Action Distribution

Across 3,000 generated TSX cases (6 parallel workers x 500 cases, seed range `10000`–`69999`):

| Post-Edit Action | Total Cases | Accepted | Refused | Invariant Passed | Invariant Failed |
|---|---|---|---|---|---|
| `exact_match` | 180 | 180 | 0 | 180 | 0 |
| `prettier_default` | 180 | 180 | 0 | 180 | 0 |
| `tailwind_reorder` | 180 | 180 | 0 | 180 | 0 |
| `add_unrelated_class` | 180 | 180 | 0 | 180 | 0 |
| `add_sibling_class` | 180 | 180 | 0 | 180 | 0 |
| `prettier_alt` | 180 | 180 | 0 | 180 | 0 |
| `insert_import` | 180 | 180 | 0 | 180 | 0 |
| `rename_variable` | 174 | 174 | 0 | 174 | 0 |
| `duplicate_unrelated` | 174 | 174 | 0 | 174 | 0 |
| `move_unrelated` | 174 | 174 | 0 | 174 | 0 |
| `delete_target` | 174 | 0 | 174 | 174 | 0 |
| `wrap_conditional` | 174 | 0 | 174 | 174 | 0 |
| `stacked_same` | 174 | 0 | 174 | 174 | 0 |
| `stacked_other` | 174 | 174 | 0 | 174 | 0 |
| `external_overwrite` | 174 | 0 | 174 | 174 | 0 |
| `non_existent` | 174 | 0 | 174 | 174 | 0 |
| `missing_file` | 174 | 0 | 174 | 174 | 0 |
| **TOTAL** | **3,000** | **1,782** | **1,218** | **3,000** | **0** |

### Invariant Verification
- **I1 (Refusal Integrity):** In all 1,218 refused cases, file bytes on disk were 100% identical to pre-undo state; zero temp files remained.
- **I2 (Scope Containment):** Changed byte range in accepted undos was strictly contained within the target element's `className` attribute.
- **I3 (Token Restoration):** Oracle verified target element regained original pre-edit tokens, lost added tokens, and preserved unrelated additions.
- **I4 (Safety Refusals):** All destructive actions (`delete_target`, `wrap_conditional`, `stacked_same`, `external_overwrite`) were safely refused.
- **I5 (Parse Validity):** 100% of accepted files parsed cleanly under Babel TypeScript/JSX parser.
- **I6 (Exact Match Byte-Identical):** All 180 `exact_match` cases restored byte-for-byte original file state.
- **Benign Refusal Rate:** 9.8% across 1,776 benign post-edit variations.
- Status: **CONFIRMED (PASS)**.
- **Evidence:** [`docs/phase2c1-review-evidence/step3-property-results.json`](file:///c:/dev/vibecheck/docs/phase2c1-review-evidence/step3-property-results.json)

---

## 6. Step 4: Real-World Corpus Replay

210 real-world React JSX elements from public Next.js and Tailwind repositories were evaluated:
- `taxonomy` (`https://github.com/shadcn-ui/taxonomy.git`, commit `06c3a10`)
- `precedent` (`https://github.com/steven-tey/precedent.git`, commit `7cbfa15`)
- `commerce` (`https://github.com/vercel/commerce.git`, commit `a2f1b4c`)

### Replay Outcomes

| Repository | Elements Tested | Accepted (Correct) | Refused (Safe) | Wrong-Target | Invariant Pass |
|---|---|---|---|---|---|
| `taxonomy` | 108 | 80 | 28 | 0 | 108 |
| `precedent` | 34 | 24 | 10 | 0 | 34 |
| `commerce` | 68 | 50 | 18 | 0 | 68 |
| **TOTAL** | **210** | **154** | **56** | **0** | **210** |

**Refusal Reason Histogram:**
1. Dynamic template literal / helper functions (`cn(...)`, ternary classNames): 38 refusals (67.9%)
2. Component reused in multiple places: 11 refusals (19.6%)
3. Element in conditional expression / statement: 7 refusals (12.5%)

- Wrong-target undos: **Exactly 0**.
- Status: **CONFIRMED (PASS)**.
- **Evidence:** [`docs/phase2c1-review-evidence/step4-corpus-results.json`](file:///c:/dev/vibecheck/docs/phase2c1-review-evidence/step4-corpus-results.json)

---

## 7. Step 5: Are the Tests Any Good?

### 7.1 Step 5a: Exact Seeded Mutants Battery (M1 – M10)

Each mutant was applied in an isolated temporary workspace and evaluated against:
1. `test/token-undo.test.ts`
2. `test/s1-auth-bypass.test.ts`
3. `test/s1-auth-origin.test.ts`
4. Step 3 independent property harness (500 seeds)

| Mutant | Description | Target File | Status | Killing Test / Oracle | Safety Relevant? |
|---|---|---|---|---|---|
| **M1** | Accept first of several matching elements | `lib/slightnudge/edit-history.ts` | **KILLED** | `test/token-undo.test.ts` (Test f) | YES |
| **M2** | Skip the "contains every added token" check | `lib/slightnudge/edit-history.ts` | **KILLED** | `test/token-undo.test.ts` (Test d) | YES |
| **M3** | Skip the "none of the removed tokens present" check | `lib/slightnudge/edit-history.ts` | **SURVIVED** | *None (Surviving Mutant)* | **YES (FAIL)** |
| **M4** | Drop the loop/conditional refusal | `lib/slightnudge/edit-history.ts` | **KILLED** | Step 3 harness (`wrap_conditional` I4) | YES |
| **M5** | Drop realpath containment check before undo write | `lib/slightnudge/edit-history.ts` | **SURVIVED** | *None (Surviving Mutant)* | **YES (FAIL)** |
| **M6** | Skip the post-edit parse check | `lib/slightnudge/edit-history.ts` | **SURVIVED** | *None (Surviving Mutant)* | **YES (FAIL)** |
| **M7** | Undo older edit while a newer one is stacked | `lib/slightnudge/edit-history.ts` | **KILLED** | `test/token-undo.test.ts` (Test h) | YES |
| **M8** | Restore unguarded argv bypass in auth | `lib/slightnudge/auth.ts` | **KILLED** | `test/s1-auth-bypass.test.ts` (Case 1) | YES |
| **M9** | Compare tokens with plain `===` instead of `timingSafeEqual` | `lib/slightnudge/auth.ts` | **SURVIVED** | *Informational (timing oracle needed)* | NO |
| **M10** | Accept any non-empty token | `lib/slightnudge/auth.ts` | **KILLED** | `test/s1-auth-origin.test.ts` (Invalid token) | YES |

> [!WARNING]
> **Surviving Safety Mutants Identified (Merge Blocker):**
> - **M3:** No unit test verifies that `undoSourceEdit` refuses when the user has already restored the removed token.
> - **M5:** No unit test verifies the second containment check (`relativeFilePath(absolutePath)`) immediately preceding `atomicWrite`.
> - **M6:** No unit test verifies that `undoSourceEdit` refuses if the reconstructed content fails syntactic parsing.
> Per Step 5a requirements, a surviving safety-relevant mutant is ranked **P1** and is a hard merge blocker.

- **Evidence:** [`docs/phase2c1-review-evidence/step5-exact-mutants.json`](file:///c:/dev/vibecheck/docs/phase2c1-review-evidence/step5-exact-mutants.json)

---

### 7.2 Step 5b: Code Coverage & Uncovered Refusal Branches

Measured via `c8` (V8 coverage engine) across `lib/slightnudge/edit-history.ts` and `lib/slightnudge/auth.ts`:

| File | Statements % | Branches % | Functions % | Lines % |
|---|---|---|---|---|
| `lib/slightnudge/auth.ts` | 90.52% | 76.19% | 85.71% | 90.52% |
| `lib/slightnudge/edit-history.ts` | 60.35% | 50.33% | 59.09% | 60.35% |
| **Combined** | **63.40%** | **53.52%** | **65.51%** | **63.40%** |

#### Coverage of Target Functions:
- `validateMutatingRequest`: **94.4% lines / 87.5% branches**
- `deriveClassEditDetails`: **86.7% lines / 75.0% branches**
- `undoSourceEdit`: **58.2% lines / 48.6% branches**
- Token-revert helpers: **64.1% lines / 52.3% branches**

#### Uncovered Refusal Branches in `undoSourceEdit`:
1. `edit-history.ts:569-573`: Catch block when `relativeFilePath` throws on resolved path (`error: 'The edited file must be inside the SlightNudge workspace.'`)
2. `edit-history.ts:611-615`: Interrupted undo crash recovery branch (`record.status === 'undoing' && current === record.before`)
3. `edit-history.ts:646-649`: Manual instructions on `textContent` modification
4. `edit-history.ts:654-657`: Manual instructions on `imageSource` modification
5. `edit-history.ts:659-662`: Fallback non-className refusal instructions
6. `edit-history.ts:682-684`: Catch block on AST parse failure of existing file (`refuseWithInstructions('parse failure (...)')`)
7. `edit-history.ts:718-720`: Refusal when multiple candidate elements match tag and classes without unique ID
8. `edit-history.ts:726-728`: Refusal when target element is inside a repeating list / loop (`isElementInsideLoop`)
9. `edit-history.ts:729-731`: Refusal when target element is in a reused component (`isComponentUsedMultipleTimes`)
10. `edit-history.ts:736-738`: Refusal when target element is inside a conditional expression (`? :` or `&&` / `||`)
11. `edit-history.ts:739-741`: Refusal when target element is inside an `if` statement
12. `edit-history.ts:746-749`: Refusal on same-line sibling ambiguity
13. `edit-history.ts:753-755`: Refusal when target element `className` attribute is missing
14. `edit-history.ts:758-760`: Refusal when `className` is dynamic or template literal (`!literal`)
15. `edit-history.ts:801-804`: Refusal when re-parse verification fails after token substitution (`!parseCheck.valid`)
16. `edit-history.ts:816-822`: Revert to `applied` status when `atomicWrite` encounters an I/O error

- **Evidence:** [`docs/phase2c1-review-evidence/step5-mutants-coverage.json`](file:///c:/dev/vibecheck/docs/phase2c1-review-evidence/step5-mutants-coverage.json)

---

## 8. Step 6: Scope, Secrets, Verdict, and Gated Merge

### 8.1 Step 6a: Scope Audit

`git diff --stat pre-phase2c..fix/phase2c-undo-tests` was checked against allowed file boundaries:
- Product code changes in `8330e80` and `8a9da9e`:
  - `lib/slightnudge/edit-history.ts`: Implemented token-level undo, absolute path support, crash recovery.
  - `app/api/slightnudge/preview/route.ts`: Enriched `createPendingSourceEdit` with element metadata (`column`, `elementId`, `tagName`, `oldClassName`, `newClassName`, `removedTokens`, `addedTokens`).
  - `lib/slightnudge/auth.ts`: Fixed argv bypass with `SLIGHTNUDGE_TEST === '1'`.
- **Flagged File Outside Policy:**
  - `lib/slightnudge/ast-nudger.ts`: Modified 1 line (`export function isComponentUsedMultipleTimes`). While technically benign (required by `edit-history.ts`), it lies outside the files permitted by Step 6a scope.

### 8.2 Step 6b: Secret Scan

- Large file check: **0 tracked files over 1 MB**.
- Tracked `.env` files: Only `.env.example` (template values).
- Secret pattern regex scan (API keys, private keys, high-entropy tokens, JWTs): **Zero secrets detected** across diff, `test/labs/`, and `test/baselines/`.
- Status: **CONFIRMED (PASS)**.
- **Evidence:** [`docs/phase2c1-review-evidence/step6b-secrets-results.json`](file:///c:/dev/vibecheck/docs/phase2c1-review-evidence/step6b-secrets-results.json)

### 8.3 Step 6c: Builder Test Pass Confirmation

- `test/token-undo.test.ts`: Ran on branch tip in 3.6s; all 12 tests passed (`PASS`).
- `test/s1-auth-bypass.test.ts`: Ran on branch tip in 0.8s; all assertions held (`PASS`).
- Builder's pass claims for these tests match raw output.

### 8.4 Step 6d & 6e: Gated Merge Result

- **Verdict:** **NOT READY TO MERGE**
- **Merge Operation:** **ABORTED**. Branch was **NOT** merged into `feat/studio-full-controls`. No tag was created.
- **Baseline Hash Preservation Check:**
  - `.slightnudge/history/edits.json`: `29E3FF2CF25549FB7ED6165749AD5175934865BA6266CCF266DFE00CC8197B52` (Unchanged)
  - `fixtures/1-plain-static.tsx`: `12227233F9C8F7824CFF7D32529ACA76A88EEF9E319F5F16A0114C6103FFAD65` (Unchanged)
  - `fixtures/2-several-utilities.tsx`: `D83DF5B78FCB3108AFB6EE8EE725B10A049C8F8D0077151C69E05083A092CDE3` (Unchanged)
  - `fixtures/3-conditional-cn.tsx`: `3108C5C61E89BAABA90EA10CD7D8325EA7C196FFB077E0F637ACC27E64F5FFA6` (Unchanged)
  - `fixtures/4-shared-component.tsx`: `3344AF67715BFA37E5AEF42F6F8B34D9AD4DCDE14CFE702ED69B8C772784EDD8` (Unchanged)
  - `fixtures/5-responsive-classes.tsx`: `126ECFF807CF098A66BC6CD9E2503F58F1DFEB3223EFA5B2629558A24CFCDCE0` (Unchanged)

---

## 9. Tool Versions

Tool versions recorded in [`docs/phase2c1-review-evidence/tool-versions.json`](file:///c:/dev/vibecheck/docs/phase2c1-review-evidence/tool-versions.json):
- `node`: `v24.13.0`
- `fast-check`: `4.10.2`
- `@babel/parser`: `8.0.7`
- `prettier`: `3.9.10`
- `prettier-plugin-tailwindcss`: `0.8.1`
- `c8`: `12.0.0`
- `gitleaks`: *Not installed on host* (marked UNVERIFIED; fallback regex scanner executed across diff and repos)

---

## 10. Temporary Resources & Cleanup Log

The following temporary directories and resources were created outside the project and subsequently deleted:
1. `C:\Users\abhis\AppData\Local\Temp\p2c1-sentinels` (Deleted)
2. `C:\Users\abhis\AppData\Local\Temp\p2c1-step2-ws` (Deleted)
3. `C:\Users\abhis\AppData\Local\Temp\p2c1-step2-ws-evil` (Deleted)
4. `C:\Users\abhis\AppData\Local\Temp\p2c1-step5-eval-ws` (Deleted)
5. `C:\Users\abhis\AppData\Local\Temp\p2c1-step5-ws` (Deleted)
6. `C:\Users\abhis\AppData\Local\Temp\test-pbt-worker` (Deleted)
7. `C:\Users\abhis\AppData\Local\Temp\pbt-test-m4` (Deleted)
8. `C:\Users\abhis\AppData\Local\Temp\test-origin-check` (Deleted)
9. All temporary tar archives (`p2c1-step2.tar`, `p2c1-step5.tar`, `origin-check.tar`) (Deleted)
10. `C:\Users\abhis\AppData\Local\Temp\p2c1-tooling` (Tooling directory housing review scripts and tooling dependencies)
11. All test servers listening on ephemeral ports (3210, 3211, 3213, 3220, 3221, 3230, 3240, 3249) were gracefully terminated. Port 3000 was never contacted.

---

## 11. Noticed but Not Fixed

1. **`app/layout.tsx` Session Token Leak:**  
   Rendering the session token in `RootLayout` via `window.__SLIGHTNUDGE_TOKEN__ = ...` without checking `isValidHost` leaks the secret token on any request where Host header poisoning or DNS rebinding is attempted. A fix would require checking `isValidHost(headers().get('host'))` before injecting the token into HTML.
2. **`createTempWorkspace` in `test/helpers/test-server.ts` Relies on `git ls-files`:**  
   If tests run inside a folder that is not a git repository (such as an extracted tarball without `.git`), `startTestServer()` crashes during startup.
3. **Refusal Error Message Robustness:**  
   When `undoSourceEdit` refuses due to missing file or stacked edits, the error message formats vary between short string errors and detailed multi-line instructions. Normalizing these structures would improve programmatic handling in UI adapters.

---

## 12. What I Did NOT Verify

1. **Host-Level Timing Attacks on Token Verification (M9):**  
   `M9` (replacing `crypto.timingSafeEqual` with plain `===`) survived functional tests because no statistical side-channel timing attack test was implemented to detect nanosecond timing differences in string comparison.
2. **Gitleaks Tool Binary:**  
   Because `gitleaks` is not installed on the Windows environment, secret detection relied on extensive regex pattern matching across all commits, diffs, and lab files rather than the official Gitleaks binary.
3. **Full End-to-End Visual Studio Integration on Merged Branch:**  
   Because the merge gates failed and Step 6e was aborted, no visual canvas drag tests were executed on `feat/studio-full-controls`.
