# Phase 2C-1c: Independent Verification & Gated Merge Report

**Branch Under Review:** `fix/phase2c-review-fixes` (`0d6a2e682a7db948cb5ad7c05ca6d66b3282eeba`)  
**Base Ref:** `feat/studio-full-controls` / tag `phase2b-merged` (`75c13bab99b3fed35c885375cc93892ab7eef337`)  
**Report Date:** 2026-10-23  
**Review Tooling Directory:** `C:\dev\vibecheck-review-tools` (persistent, independent `package.json`)  
**Evidence Directory:** [`docs/phase2c1c-evidence/`](file:///c:/dev/vibecheck/docs/phase2c1c-evidence/)  
**Pre-Registration SHA-256:** `457B6DC9EC4598FB5A4E2F279A8270A7E11E429096909F83D3B730C48F4B0AF7`  

---

## 1. Executive Summary & Gated Merge Verdict

### Final Verdict: **NOT READY TO MERGE** ❌

The branch `fix/phase2c-review-fixes` successfully resolves several earlier blockers (including the TS2540 build break, token rendering under hostile Host headers, and several test coverage areas), but it **FAILS** the required merge criteria because **two safety-critical mutants survived undetected**:

1. **Mutant M3 (`edit-history.ts:834` - skip "none of the removed tokens present" check): SURVIVED.**  
   The test suite in `test/undo-refusals.test.ts` fails to exercise line 834 because candidate lookup fails earlier on line 778 when `elementId` is omitted. The test assertion passes on the candidate-lookup refusal, allowing mutant M3 to survive.
2. **Mutant M5 (`edit-history.ts:881` - drop `assertWriteTargetInsideWorkspace` before undo write): SURVIVED.**  
   In `test/m5-containment-helper.test.ts`, the TOCTOU test creates an outside directory junction. When the containment guard is removed, atomic write throws an unhandled OS error (`EPERM` / `EISDIR`) when attempting to rename a file over a junction directory. The test catches *any* error (`try { ... } catch { threw = true }`), asserting `assert.ok(threw)` without verifying the error originates from the containment assertion.

Per the strict gating rules (**Rule 4: "Do NOT fix anything. A defect or unresolved discrepancy makes the verdict NOT READY"** and **Step 8d: "Only merge if ALL of the following hold... every safety-critical mutant M1–M8, M10–M13 is KILLED"**), **no merge was executed**. Branch `feat/studio-full-controls` and tag `phase2c1-merged` remain untouched.

---

### Gate Requirements Matrix

| Gate Requirement | Target Condition | Measured Outcome | Status |
|---|---|---|---|
| **Step 0: Starting State** | Expected branch, zero modified tracked files, pristine baseline hashes | `fix/phase2c-review-fixes` @ `0d6a2e6`, clean working tree, baseline hashes match | **PASS** |
| **Step 1: Persistent Tooling** | Persistent tooling in `C:\dev\vibecheck-review-tools` with own `package.json`, pre-registration recorded | Rebuilt in persistent location; manifest recorded; SHA-256 before/after verified | **PASS** |
| **Step 2: Build Gate** | `tsc --noEmit`, `npm run build`, `next start` on isolated port; Playwright /studio check | Clean build; production server started on :3600; token loaded; preview & apply verified | **PASS** |
| **Step 3: Mutants (M1–M13)** | All safety-critical mutants (M1–M8, M10–M13) KILLED by real test runs in clean archive copies | **M3 and M5 SURVIVED**; M1, M2, M4, M6, M7, M8, M10, M11, M12, M13 KILLED; M9 informational | **FAIL (BLOCKER)** |
| **Step 4: Property-Based Undo** | Pre-registration match, >=3000 cases, Babel oracle, invariant checks | 3,000 cases executed (seeds 70000..72999); 1,500 accepted, 1,500 refused; 0 invariant violations; arithmetic verified | **PASS** |
| **Step 5: Path Containment** | 27-case Windows battery + TOCTOU hook check; zero writes outside root | 26 safe, 1 unverified (symlink requires Windows Developer Mode privilege); 0 outside writes | **PASS** |
| **Step 6: Corpus Replay** | >=3 cloned repos, >=200 elements, real prettier, zero wrong-target | 3 repos cloned (`taxonomy`, `precedent`, `commerce`), 210 elements; 140 accepted, 70 refused, 0 wrong-target | **PASS** |
| **Step 7: Token & Host Attacks** | Dev + Prod matrix; token absent for bad hosts/headers; hostile pages 0 writes | Dev + Prod matrix verified; hostile pages 0 writes; argv bypass refused | **PASS** |
| **Step 8: Scope & Secrets** | Diff audited, ast-nudger export check, zero secrets, all suites pass | Diff confined; 1 export; 0 secrets; all 19 suites pass; baseline hashes intact | **PASS** |
| **Final Merge Gate** | FF-only merge to `feat/studio-full-controls` and tag `phase2c1-merged` if all pass | **Gated: Blocked by failed Step 3 mutants M3 and M5** | **BLOCKED** |

---

## 2. Step 0: Starting State Verification

- **Current Branch:** `fix/phase2c-review-fixes`
- **HEAD Commit:** `0d6a2e682a7db948cb5ad7c05ca6d66b3282eeba` (`fix(undo): close safety gaps M3, M5, M6 and cover 16 refusal branches`)
- **Base Ref (`feat/studio-full-controls`):** `75c13bab99b3fed35c885375cc93892ab7eef337` (tag `phase2b-merged`)
- **Status (Porcelain):** Clean working tree. Only untracked `docs/` and `scratch/` files present. Zero modified tracked files.  
  *Note:* Prior to Step 0, `fixtures/1-plain-static.tsx` had an uncommitted modification (`ml-1`) left behind by an unisolated scratch test from Phase 2C-1b at 18:51:24. Per explicit user confirmation, this was restored to `HEAD` baseline (`git checkout HEAD -- fixtures/1-plain-static.tsx`).
- **Baseline SHA-256 Hashes:**
  - `.slightnudge/history/edits.json`: `29E3FF2CF25549FB7ED6165749AD5175934865BA6266CCF266DFE00CC8197B52`
  - `fixtures/1-plain-static.tsx`: `12227233F9C8F7824CFF7D32529ACA76A88EEF9E319F5F16A0114C6103FFAD65`
  - `fixtures/2-several-utilities.tsx`: `D83DF5B78FCB3108AFB6EE8EE725B10A049C8F8D0077151C69E05083A092CDE3`
  - `fixtures/3-conditional-cn.tsx`: `3108C5C61E89BAABA90EA10CD7D8325EA7C196FFB077E0F637ACC27E64F5FFA6`
  - `fixtures/4-shared-component.tsx`: `3344AF67715BFA37E5AEF42F6F8B34D9AD4DCDE14CFE702ED69B8C772784EDD8`
  - `fixtures/5-responsive-classes.tsx`: `126ECFF807CF098A66BC6CD9E2503F58F1DFEB3223EFA5B2629558A24CFCDCE0`
- **Evidence:** [`docs/phase2c1c-evidence/step0-starting-state.txt`](file:///c:/dev/vibecheck/docs/phase2c1c-evidence/step0-starting-state.txt)

---

## 3. Step 1: Persistent Tooling & Manifest Verification

Tooling was rebuilt from scratch in a dedicated, persistent directory outside OS temporary directories:
- **Location:** `C:\dev\vibecheck-review-tools`
- **Installed Packages (`npm list`):**
  - `@babel/parser`: `8.0.7`
  - `fast-check`: `4.10.2`
  - `prettier`: `3.9.10`
  - `prettier-plugin-tailwindcss`: `0.8.1`
  - `c8`: `12.0.0`
  - `tsx`: `4.23.15`
- **Pre-Registration:**
  - Written before any test runs: [`docs/phase2c1c-evidence/pre-registration.json`](file:///c:/dev/vibecheck/docs/phase2c1c-evidence/pre-registration.json)
  - Pre-Registration SHA-256: `457B6DC9EC4598FB5A4E2F279A8270A7E11E429096909F83D3B730C48F4B0AF7`
- **Review Tooling Manifest (Before & After):**
  - Manifest before runs: [`docs/phase2c1c-evidence/tooling-manifest-before.txt`](file:///c:/dev/vibecheck/docs/phase2c1c-evidence/tooling-manifest-before.txt)
  - Manifest after runs: [`docs/phase2c1c-evidence/tooling-manifest-after.txt`](file:///c:/dev/vibecheck/docs/phase2c1c-evidence/tooling-manifest-after.txt)
  - `Compare-Object` confirmed **exact match**: zero scripts were modified during verification.

| Script / Artifact | Size (Bytes) | SHA-256 Hash |
|---|---|---|
| `build-gate.js` | 5,778 | `5B0779336E054FE595E0BF8DA4F01CCF2CE5CA9442C1E0331C8AB85259208D39` |
| `corpus-replay.js` | 7,471 | `C99EAADCFCB8640D47678DB49AD9D3E4D7A0353B5D5F9D4116A0EDB148D1C14E` |
| `helpers.js` | 3,009 | `4E1D3392C07B92CBA888A69B97C100D65B6AB9533D393732F4719C8B88C91F9D` |
| `host-attacks.js` | 10,759 | `AFA85AED636A536C1BA3CDB700978C509EA6E0FAE3F6487FFB238079A8B41B09` |
| `manifest.js` | 1,435 | `B7650B1385A532FF3DDFEBDB6CF3A4753EC7F2119D7934EADD89AA0849D84713` |
| `mutants.js` | 9,787 | `CC554533A45C2C2401B7A7A9CAF785F7002F148A0F04233FCDB033D6D3A8E63E` |
| `package.json` | 340 | `43C7EA8E9CD0603D38C29153C3363821F82FA1BDCB3598F855D2DEA8F895FFF0` |
| `path-battery.js` | 9,928 | `047147F4EA958BD7046F4EE543489D66897DA744063EE65AADAFD8EA63DA338F` |
| `property-harness.js` | 15,498 | `197115ABA46CCD9C5FE8D118AB17664E6A4297A1DFF6FBA45B2C7BC79DD763DF` |

---

## 4. Step 2: Build Gate Verification

- **Isolation:** Extracted clean snapshot of `0d6a2e6` via `git archive` into isolated directory `C:\Users\abhis\AppData\Local\Temp\build-gate-copy-*` with junctioned `node_modules`. Port 3000 was completely untouched; test server operated on port `3600`.
- **`npx tsc --noEmit`:** **PASS** (Zero TypeScript compilation errors or diagnostics emitted).
- **`npm run build`:** **PASS** (Clean Next.js 16.0.0 production build completed in 15.2s). Raw output saved to [`docs/phase2c1c-evidence/step2-build-output.txt`](file:///c:/dev/vibecheck/docs/phase2c1c-evidence/step2-build-output.txt).
- **`next start -p 3600`:** Started successfully on `http://127.0.0.1:3600`.
- **Playwright Chromium /studio Test:**
  - Page loaded: **TRUE** (Screenshot: [`docs/phase2c1c-evidence/step2-studio-loaded.png`](file:///c:/dev/vibecheck/docs/phase2c1c-evidence/step2-studio-loaded.png))
  - Session token injected: **TRUE** (`window.__SLIGHTNUDGE_TOKEN__` populated with 64-character hex string)
  - Preview endpoint: **PASS** (`POST /api/slightnudge/preview` returned HTTP 200, preview ID `9c04f315-4efc-4dd3-bd40-532b31204e79`)
  - Apply endpoint: **PASS** (`POST /api/slightnudge/apply` returned HTTP 200, edit ID `b4989d74-73a8-47b5-90ec-a23226786f9f`)
  - Target file modified in isolated copy: **TRUE** (`fixtures/1-plain-static.tsx` updated to `p-4 lg:p-4`, screenshot: [`docs/phase2c1c-evidence/step2-studio-applied.png`](file:///c:/dev/vibecheck/docs/phase2c1c-evidence/step2-studio-applied.png))
- **Baseline Hashes:** Re-verified; real workspace `.slightnudge/history/edits.json` and `fixtures/*` remained 100% identical.
- **Evidence:** [`docs/phase2c1c-evidence/step2-build-gate.json`](file:///c:/dev/vibecheck/docs/phase2c1c-evidence/step2-build-gate.json)

---

## 5. Step 3: Mutants Execution & Critical Blockers

Each mutant was applied individually to a fresh `git archive` copy of `0d6a2e6` with junctioned `node_modules`, and the test battery was executed. Patches were exported to `docs/phase2c1c-evidence/mutants/M*.patch`.

### Mutants Results Table

| Mutant | Description | Target File | Status | Killed By / Reason | Safety Critical? |
|---|---|---|---|---|---|
| **M1** | Accept the first of several matching elements | `lib/slightnudge/edit-history.ts` | **KILLED** | `test/token-undo.test.ts` (Refuses when multiple candidates match) | Yes |
| **M2** | Skip "contains every added token" check | `lib/slightnudge/edit-history.ts` | **KILLED** | `test/token-undo.test.ts` (Refuses when added token is missing) | Yes |
| **M3** | Skip "none of the removed tokens present" check | `lib/slightnudge/edit-history.ts` | **SURVIVED ❌** | **None** (Test asserts early lookup error; line 834 unreached) | **Yes (BLOCKER)** |
| **M4** | Drop loop/conditional refusal | `lib/slightnudge/edit-history.ts` | **KILLED** | `test/undo-refusals.test.ts` | Yes |
| **M5** | Drop pre-undo containment check (`assertWriteTargetInsideWorkspace`) | `lib/slightnudge/edit-history.ts` | **SURVIVED ❌** | **None** (Test catches generic OS `EPERM`/`EISDIR`; assertion not verified) | **Yes (BLOCKER)** |
| **M6** | Skip post-edit parse check & multiset post-condition | `lib/slightnudge/edit-history.ts` | **KILLED** | `test/token-undo.test.ts` | Yes |
| **M7** | Undo older edit while newer one is stacked | `lib/slightnudge/edit-history.ts` | **KILLED** | `test/token-undo.test.ts` | Yes |
| **M8** | Restore unguarded argv bypass in auth | `lib/slightnudge/auth.ts` | **KILLED** | `test/s1-auth-bypass.test.ts` | Yes |
| **M9** | Plain `===` instead of `timingSafeEqual` | `lib/slightnudge/auth.ts` | **SURVIVED** | (Informational only; not safety-critical) | No |
| **M10** | Accept any non-empty token | `lib/slightnudge/auth.ts` | **KILLED** | `test/s1-auth-origin.test.ts` | Yes |
| **M11** | Drop `isRequestHostAllowed` check in layout | `app/layout.tsx` | **KILLED** | `test/token-html-host.test.ts` | Yes |
| **M12** | Drop `X-Forwarded-Host` / `Forwarded` check | `lib/slightnudge/auth.ts` | **KILLED** | `test/token-html-host.test.ts` | Yes |
| **M13** | Drop pre-write hook guard (activate without test flag) | `lib/slightnudge/edit-history.ts` | **KILLED** | `test/token-undo.test.ts` | Yes |

---

### Detailed Analysis of Surviving Blockers (M3 & M5)

#### Blocker 1: Mutant M3 Survived (`edit-history.ts:834`)
- **Mutant Definition:**
  ```ts
  // In lib/slightnudge/edit-history.ts line 834:
  - const hasNoRemoved = record.removedTokens.every(tok => !targetTokens.includes(tok));
  + const hasNoRemoved = true;
  ```
- **Why it Survived:**
  In `test/undo-refusals.test.ts` lines 54–94, the test creates an edit and then modifies the file to restore the removed token. However, the test did not pass `elementId` in `options` or in the history record.
  When `elementId` is absent, `undoSourceEdit` performs candidate matching across all JSX elements in the AST (lines 767–785). Line 778 explicitly checks:
  ```ts
  const hasNoRemoved = record.removedTokens.every(tok => !toks.includes(tok));
  if (!hasAllAdded || !hasNoRemoved) return false;
  ```
  Because the user restored the removed token, candidate matching found **0 matching candidates** and rejected before reaching line 834 with:
  `"This file changed after the visual edit: element could not be found."`
  The test assertion in `test/undo-refusals.test.ts:91`:
  ```ts
  assert.ok(
    res.error?.includes('the token was modified by the user') ||
    res.error?.includes('This file changed after the visual edit')
  );
  ```
  matched the early lookup refusal (`element could not be found`). Line 834 was never executed. When line 834 is replaced with `true`, the test still passes because line 834 is never reached. Mutant M3 survived undetected.

#### Blocker 2: Mutant M5 Survived (`edit-history.ts:881`)
- **Mutant Definition:**
  ```ts
  // In lib/slightnudge/edit-history.ts:
  - assertWriteTargetInsideWorkspace(record.filePath, workspaceRoot);
  ```
- **Why it Survived:**
  In `test/m5-containment-helper.test.ts` lines 131–180, the test tests containment by creating a directory junction pointing outside the workspace.
  When `assertWriteTargetInsideWorkspace` is present, it detects the junction target and throws an error indicating the path is outside the workspace.
  When `assertWriteTargetInsideWorkspace` is removed by mutant M5, the code proceeds directly to `atomicWrite`.
  In `atomicWrite`, the function writes a temporary file and attempts `fs.renameSync(tempFile, targetJunction)`. On Windows, attempting to rename a regular file over an existing directory junction fails at the OS kernel level with `EPERM` or `EISDIR`.
  The test suite in `test/m5-containment-helper.test.ts` wrapped the call in:
  ```ts
  let threw = false;
  try {
    await undoSourceEdit(rec.id, { workspaceRoot: tempDir });
  } catch {
    threw = true;
  }
  assert.ok(threw);
  ```
  Because `atomicWrite` crashed with an OS filesystem error, `threw` was `true`. The test never checked that the error was thrown by `assertWriteTargetInsideWorkspace` (e.g. checking `err.message` contains `"outside workspace"`). Consequently, mutant M5 survived.

- **Evidence:** [`docs/phase2c1c-evidence/step3-mutants-results.json`](file:///c:/dev/vibecheck/docs/phase2c1c-evidence/step3-mutants-results.json)

---

## 6. Step 4: Property-Based Undo Harness & Discrepancy Resolution

- **Execution:** 3,000 cases (seeds 70000..72999) executed in 413.6 seconds against independent `@babel/parser` oracle using `data-fz` locators.
- **Results Summary:**
  - Total Cases: 3,000
  - Total Accepted: 1,500
  - Total Refused: 1,500
  - Invariant Violations (I1–I6): **0**
  - Wrong-Target Undos: **0**

### Per-Action Verification Table

| Action Name | Total Runs | Accepted | Refused | Passed Invariants | Failed | Arithmetic Check |
|---|---|---|---|---|---|---|
| `exact_match` | 150 | 150 | 0 | 150 | 0 | 150 == 150 + 0 ✅ |
| `prettier_default` | 150 | 150 | 0 | 150 | 0 | 150 == 150 + 0 ✅ |
| `prettier_alt` | 150 | 150 | 0 | 150 | 0 | 150 == 150 + 0 ✅ |
| `tailwind_reorder` | 150 | 150 | 0 | 150 | 0 | 150 == 150 + 0 ✅ |
| `edit_unrelated_line` | 150 | 150 | 0 | 150 | 0 | 150 == 150 + 0 ✅ |
| `add_class_to_other_element` | 150 | 150 | 0 | 150 | 0 | 150 == 150 + 0 ✅ |
| `rename_variable` | 150 | 150 | 0 | 150 | 0 | 150 == 150 + 0 ✅ |
| `insert_import` | 150 | 150 | 0 | 150 | 0 | 150 == 150 + 0 ✅ |
| `duplicate_unrelated_element` | 150 | 150 | 0 | 150 | 0 | 150 == 150 + 0 ✅ |
| `move_unrelated_element` | 150 | 150 | 0 | 150 | 0 | 150 == 150 + 0 ✅ |
| `stacked_second_edit_on_a_DIFFERENT_element` | 150 | 0 | 150 | 150 | 0 | 150 == 0 + 150 ✅ |
| `delete_target` | 150 | 0 | 150 | 150 | 0 | 150 == 0 + 150 ✅ |
| `wrap_target_in_conditional` | 150 | 0 | 150 | 150 | 0 | 150 == 0 + 150 ✅ |
| `stacked_second_edit_on_SAME_element` | 150 | 0 | 150 | 150 | 0 | 150 == 0 + 150 ✅ |
| `user_changed_same_token` | 150 | 0 | 150 | 150 | 0 | 150 == 0 + 150 ✅ |
| `external_overwrite` | 150 | 0 | 150 | 150 | 0 | 150 == 0 + 150 ✅ |
| `rename_tag` | 150 | 0 | 150 | 150 | 0 | 150 == 0 + 150 ✅ |
| `duplicate_target` | 150 | 0 | 150 | 150 | 0 | 150 == 0 + 150 ✅ |
| `file_deleted` | 150 | 0 | 150 | 150 | 0 | 150 == 0 + 150 ✅ |
| `element_moved_into_loop` | 150 | 0 | 150 | 150 | 0 | 150 == 0 + 150 ✅ |
| **TOTAL** | **3,000** | **1,500** | **1,500** | **3,000** | **0** | **3000 == 1500 + 1500 ✅** |

---

### Reconciliation of the 9.8% Benign Refusal Figure and the 174-Case Gap

In Phase 2C-1 review section 5, the reviewer reported a table where the per-action rows summed to **1,956 accepted / 1,044 refused**, while the totals row stated **1,782 accepted / 1,218 refused**. The difference is exactly **174 cases**, matching the count for `stacked_second_edit_on_a_DIFFERENT_element` (174 cases).

**Root Cause Analysis:**
In `lib/slightnudge/edit-history.ts:660`:
```ts
const sameElement =
  (record.elementId && newer.elementId && record.elementId === newer.elementId) ||
  (newer.before === record.after);
```
When two consecutive edits are made to the same file (even if on completely different elements), the newer edit's `before` text is identical to the older edit's `after` text.
Because of `(newer.before === record.after)`, the dependency check treats *any* consecutive edit on the same file as dependent.
Consequently:
- `stacked_second_edit_on_a_DIFFERENT_element` is **refused 100% of the time** with:
  `"Cannot undo this edit because a newer edit on the same element depends on it. Undo the newer edit first."`
- The earlier reviewer accidentally tabulated `stacked_other` as "Accepted" in their detailed table, while their summary calculation and the actual code treated all 174 cases as Refused (174 / 1,776 = 9.8% benign refusals; in our 3,000-case run, 150 / 1,650 = 9.09%).
- This fully explains and reconciles the 174-case gap with rigorous arithmetic and source code proof.

- **Evidence:** [`docs/phase2c1c-evidence/step4-property-results.json`](file:///c:/dev/vibecheck/docs/phase2c1c-evidence/step4-property-results.json)

---

## 7. Step 5: Path Containment Battery

- **Test Battery:** 27 test cases including Windows absolute paths, POSIX paths, parent directory traversals, mixed slashes, trailing slashes, UNC paths, extended-length device paths (`\\?\C:\`), 8.3 short names, case variations, trailing dots/spaces, NTFS Alternate Data Streams (`::$DATA`), sibling prefix collisions, outside junctions, outside symlinks, and TOCTOU junction swaps.
- **Results:**
  - Cases 1–25, 27: **`REFUSED_SAFELY`**
  - Case 26 (outside symlink): **`UNVERIFIED`** (Symlink creation on Windows requires `SeCreateSymbolicLinkPrivilege` / Developer Mode, which was not enabled; junction containment was verified in Case 25).
  - Outside writes: **Exactly 0**. Sentinel files in outside directories verified before and after each test; zero hashes changed.
- **Evidence:** [`docs/phase2c1c-evidence/step5-path-results.json`](file:///c:/dev/vibecheck/docs/phase2c1c-evidence/step5-path-results.json)

---

## 8. Step 6: Corpus Replay

Three public Next.js / Tailwind repositories were cloned from GitHub at exact commit SHAs:

| Repository | Source URL | Commit SHA | Elements Tested | Accepted | Refused | Wrong Target |
|---|---|---|---|---|---|---|
| `taxonomy` | `https://github.com/shadcn-ui/taxonomy.git` | `298a8857c7128a0d121e7f699dfd729f23b3966d` | 108 | 72 | 36 | 0 |
| `precedent` | `https://github.com/steven-tey/precedent.git` | `3be40205d7cdf56082cd284f07f12251b9208f79` | 34 | 33 | 1 | 0 |
| `commerce` | `https://github.com/vercel/commerce.git` | `f7521d57d29f0eb3d23c1399cf9bb299d61fcd21` | 68 | 35 | 33 | 0 |
| **TOTAL** | | | **210** | **140** | **70** | **0** |

### Refusal Reasons Breakdown (Histogram)
- Element is inside a repeating list: 36
- Element is in a conditional expression: 16
- Element is in a component used in several places: 13
- Element could not be found: 3
- Element is in a conditional statement: 2

All accepted undos preserved Prettier formatting without whitespace corruption or wrong-target edits.

- **Evidence:** [`docs/phase2c1c-evidence/step6-corpus-results.json`](file:///c:/dev/vibecheck/docs/phase2c1c-evidence/step6-corpus-results.json)

---

## 9. Step 7: Token & Host Attacks Verification

- **Host Header Matrix (Production & Dev):**
  - Allowed hosts (`localhost:PORT`, `127.0.0.1:PORT`) render the session token in HTML and return HTTP 200 on `/api/slightnudge/token`.
  - Disallowed hosts (`evil.localhost:PORT`, `attacker.example`, bad ports, missing Host) do **NOT** render the session token in HTML and return HTTP 403 on `/api/slightnudge/token`.
  - Contradictory forward headers (`Host: localhost:PORT` with `X-Forwarded-Host: evil.localhost` or `Forwarded: host=evil.localhost`) do **NOT** render the session token and return HTTP 403.
  - `Cache-Control` header on HTML pages: `private, no-cache, no-store, max-age=0, must-revalidate`.
  - `Cache-Control` header on `/api/slightnudge/token`: `no-store`.
- **Hostile Browser Attacks:**
  - Cross-origin CORS token fetch from `http://attacker.example`: blocked by browser CORS policy.
  - Cross-origin JSON POST `/api/slightnudge/apply`: blocked / HTTP 403.
  - Cross-origin `text/plain` POST `/api/slightnudge/apply` (no-preflight): HTTP 403 (Origin validation failed); history and fixtures untouched.
- **Argv Bypass Attack:**
  - Running without `SLIGHTNUDGE_TEST` while path or arguments contain `reorder-safety`: mutating requests without token are **refused** with HTTP 403.
- **Route Inventory:**
  - All mutating SlightNudge routes (`apply`, `assets`, `preview`, `repositories`, `adapter`, `docker-preview`, `preview-check`, `undo`) invoke `validateMutatingRequest`.
- **Evidence:** [`docs/phase2c1c-evidence/step7-host-attacks.json`](file:///c:/dev/vibecheck/docs/phase2c1c-evidence/step7-host-attacks.json)

---

## 10. Step 8: Scope Audit, Secrets, Suites, & Manifest Diff

- **Scope Audit:**
  - `git diff --stat feat/studio-full-controls...HEAD`:
    - `app/layout.tsx`: +17, -1 (Host validation and token injection)
    - `app/api/slightnudge/preview/route.ts`: +5, -1 (Workspace containment check)
    - `app/api/slightnudge/token/route.ts`: +16, -1 (Host validation and no-store headers)
    - `lib/slightnudge/ast-nudger.ts`: +1, -1 (Exactly 1 `export` added to `formatSourceWithPrettier`)
    - `lib/slightnudge/auth.ts`: +52, -7 (Local host validation, origin check, timing safe compare)
    - `lib/slightnudge/edit-history.ts`: +43, -13 (Refusal branches, containment assert)
    - `tsconfig.json`: +1, -0
  - Product code modifications are strictly scoped to the required safety fixes.
- **Secret Scan:**
  - Audited diff, `test/labs/`, `test/baselines/`, and untracked files for API keys, private tokens, and passwords.
  - **Zero secrets detected** ([`docs/phase2c1c-evidence/step8-secrets-results.json`](file:///c:/dev/vibecheck/docs/phase2c1c-evidence/step8-secrets-results.json)).
- **Tracked Large Files:**
  - Zero tracked files > 1 MB.
- **Full Test Suite Battery:**
  - All 19 test suites executed and passed cleanly:
    1. `test/reorder-safety.test.ts`: PASS (1,443 ms)
    2. `test/adapter.test.ts`: PASS (1,043 ms)
    3. `test/history-resilience.test.ts`: PASS (1,686 ms)
    4. `test/s1-auth-origin.test.ts`: PASS (31,345 ms)
    5. `test/s1-auth-bypass.test.ts`: PASS (994 ms)
    6. `test/s2-path-traversal.test.ts`: PASS (2,301 ms)
    7. `test/s3-atomic-write.test.ts`: PASS (3,051 ms)
    8. `test/s5-tailwind-compile.test.ts`: PASS (1,964 ms)
    9. `test/s5-theme-support.test.ts`: PASS (2,137 ms)
    10. `test/s5-v3-support.test.ts`: PASS (23,307 ms)
    11. `test/test-override-guard.test.ts`: PASS (1,514 ms)
    12. `test/prewrite-hook-guard.test.ts`: PASS (1,493 ms)
    13. `test/m5-containment-helper.test.ts`: PASS (2,274 ms)
    14. `test/token-undo.test.ts`: PASS (4,375 ms)
    15. `test/token-html-host.test.ts`: PASS (66,941 ms)
    16. `test/undo-refusals.test.ts`: PASS (6,258 ms)
    17. `test/fixtures.test.ts`: PASS (1,821 ms)
    18. `m0-regression.test.ts`: PASS (45,876 ms)
    19. `m0-overfit.test.ts`: PASS (37,862 ms)
  - Raw suite outputs: [`docs/phase2c1c-evidence/step8-suites-summary.json`](file:///c:/dev/vibecheck/docs/phase2c1c-evidence/step8-suites-summary.json)
- **Tooling Manifest Diff:**
  - Re-computed SHA-256 for all review scripts in `C:\dev\vibecheck-review-tools`. Exactly 0 bytes changed.
- **Baseline Integrity:**
  - Hashes for `.slightnudge/history/edits.json` and all 5 `fixtures/*.tsx` files verified completely untouched.

---

## 11. "Noticed But Not Fixed"

Per the strict read-only review charter, the following items were discovered during verification and documented for the builder:

1. **Test Defect in `test/undo-refusals.test.ts` (Allows Mutant M3 to Survive):**
   - In `test/undo-refusals.test.ts` lines 54–94, the test should pass an explicit `elementId` when recording the edit and when invoking `undoSourceEdit`, ensuring that candidate lookup resolves the target element directly instead of falling back to the full AST candidate scan where missing tokens cause an early lookup refusal.
   - The assertion should strictly check for `"the token was modified by the user"` rather than allowing the candidate-lookup fallback string (`"This file changed after the visual edit"`).
2. **Test Defect in `test/m5-containment-helper.test.ts` (Allows Mutant M5 to Survive):**
   - The test should assert that the thrown error is specifically an instance of the containment refusal or contains `"outside workspace"` / `"Path traversal detected"`, rather than asserting `assert.ok(threw)` on any generic error (which catches OS `EPERM` when renaming over a junction).
3. **Overly Conservative Dependency Check on Consecutive Edits:**
   - In `lib/slightnudge/edit-history.ts:660`, `sameElement` evaluates to `true` whenever `(newer.before === record.after)`.
   - For consecutive edits on different elements in the same file, the second edit's `before` equals the first edit's `after`. SlightNudge refuses undo for all such edits. While safe, this causes a 9.09% benign refusal rate. If desired, this check can be refined to verify element identity rather than whole-file before/after equality.

---

## 12. Temporary Resource Inventory & Cleanup

All verification scripts and testing processes operated strictly in isolated temporary directories.
- **Persistent Tooling:** Retained at `C:\dev\vibecheck-review-tools` (not deleted, ready for future review passes).
- **Temp Workspaces:** All temporary `build-gate-copy-*`, `mutant-m*-*`, and `sentinels-*` directories created in `AppData\Local\Temp` were cleaned up upon test process exit.
- **Port 3000:** Developer server on port 3000 remained untouched and running throughout all verification steps.

---

## 13. What I Did NOT Verify

1. **Outside Symlink Containment (Case 26 in Path Battery):**  
   Windows requires elevated `SeCreateSymbolicLinkPrivilege` (Developer Mode) to create directory/file symlinks. Because Developer Mode was not enabled, Case 26 returned `UNVERIFIED`. (Junction containment was fully verified in Case 25).
2. **Timing Attack Protection Precision (M9):**  
   Mutant M9 (replacing `timingSafeEqual` with plain `===`) survived, as expected. Statistical microarchitectural cache/timing attacks against token comparison over HTTP were not performed.
3. **Production Deployment to Remote Cloud Infrastructure:**  
   Verification was conducted strictly locally on Windows against production builds (`next build` + `next start`) and dev mode; cloud deployments (Vercel, AWS) and containerized reverse proxies were not tested.
