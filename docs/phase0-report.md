# Phase 0 Baseline & Verification Report (v2)

**Audit Mode**: READ-ONLY Baseline Verification  
**Git Tag**: `pre-program` (created on HEAD: `23fc56c`)  
**Current Branch**: `tools/coverage` (checked out: YES)  
**Evidence Directory**: [`docs/phase0-evidence/`](file:///c:/dev/vibecheck/docs/phase0-evidence)  
**Dev Server**: Running on `http://localhost:3000` (Next.js 16.4.0)

---

## 1. Executive Summary & Ranked Findings

Every finding is ranked by severity:
- **P0**: Wrong target, silent code corruption, data loss, or security vulnerability.
- **P1**: Correctness bug, test flakiness, or undo failure.
- **P2**: Visual glitch, feel imperfection, or redundant UI duplicate.

| ID | Rank | Status | Claim / Issue | Root Cause / Impact | Evidence Artifact |
| :---: | :---: | :---: | :--- | :--- | :--- |
| **S1** | **P0** | **CONFIRMED** | **Missing-Origin Bypass & Unvalidated Host** | `apply` and `preview` routes check `if (origin && !isAllowedOrigin(origin, request.url))`. Requests with missing `Origin` bypass the check entirely. `Host` header is never validated. Dev server binds to localhost without host verification. | [task4-findings-s1-s5.txt](file:///c:/dev/vibecheck/docs/phase0-evidence/task4-findings-s1-s5.txt#L8-L26) |
| **S2** | **P0** | **CONFIRMED** | **Pending-Preview Directory Traversal Blocked** | Placing pending edit JSON pointing outside project root (relative `../../` or absolute) is safely rejected by `relativeFilePath` using `realpathSync`. External files remain pristine. | [task4-findings-s1-s5.txt](file:///c:/dev/vibecheck/docs/phase0-evidence/task4-findings-s1-s5.txt#L28-L38) |
| **S3** | **P0** | **CONFIRMED** | **Atomic Write Falls Back to Non-Atomic Overwrite** | In `atomicWrite()` ([`lib/slightnudge/edit-history.ts`](file:///c:/dev/vibecheck/lib/slightnudge/edit-history.ts#L83-L88)), when `renameSync()` exhausts retries (e.g. Windows file lock), code explicitly falls back to direct `writeFileSync(filePath, contents)`, breaking atomic guarantees. | [task4-findings-s1-s5.txt](file:///c:/dev/vibecheck/docs/phase0-evidence/task4-findings-s1-s5.txt#L40-L82) |
| **S5** | **P0** | **CONFIRMED** | **Zero Tailwind Compilation Verification on Apply** | Applying an edit writes the class string directly to source disk without running Tailwind / PostCSS compilation. Bogus classes (`completely-bogus-tailwind-class-99999-invalid`) are written directly to production source code. | [task4-findings-s1-s5.txt](file:///c:/dev/vibecheck/docs/phase0-evidence/task4-findings-s1-s5.txt#L95-L110) |
| **T2.1**| **P1** | **CONFIRMED** | **Test Suites Fail (Previous "100% Pass" Was False)** | 8 of 10 SlightNudge suites fail consistently across 3 consecutive runs: `test:m0` (port 3001 refused), `test:overfit` (port 3002 refused), `test:fixtures` (`ml-2.5` mutation in Fixture 1), `test:step1` (timeout on `#slightnudge-file-display`), `move-expectations` (timeout & fixture mutation). Only `reorder-safety` and `adapter` pass. | [task2-test-inventory-runs.txt](file:///c:/dev/vibecheck/docs/phase0-evidence/task2-test-inventory-runs.txt) |
| **T2.2**| **P1** | **CONFIRMED** | **Test Suites Mutate Fixture Files on Disk** | Running `move-expectations` and `studio-restore` modifies `fixtures/1-plain-static.tsx` during test execution without restoring it, leaving a dirty git worktree. | [task2-test-inventory-runs.txt](file:///c:/dev/vibecheck/docs/phase0-evidence/task2-test-inventory-runs.txt) |
| **S4** | **P1** | **CONFIRMED** | **Undo Fails After External Prettier Reformatting** | If Prettier or an external formatter reformats whitespace or quotes after an edit, `undoSourceEdit` refuses with: `"This file changed after the visual edit. Nothing was overwritten; review the source before undoing."` | [task4-findings-s1-s5.txt](file:///c:/dev/vibecheck/docs/phase0-evidence/task4-findings-s1-s5.txt#L84-L93) |
| **S6** | **P1** | **CONFIRMED** | **Loop, Same-Line & Conditional Protections Active in UI** | Testing Fixtures 3, 4, 5 in the live browser confirmed that keyboard nudging is safely blocked on dynamic `cn(...)` conditionals, array loops, and same-line siblings. DOM classes remained unaltered. | [task3-capability-matrix.txt](file:///c:/dev/vibecheck/docs/phase0-evidence/task3-capability-matrix.txt#L33-L40) |
| **M1** | **P1** | **CONFIRMED** | **Move Engine Drag Flakiness & 150% Zoom Timeout** | Drag reorder at 150% zoom in flex-row hits a 30000ms Playwright timeout because mouse coordinates scale with CSS zoom and miss the drop line threshold. Small drags at 100% zoom intermittently trigger micro-movement (>0.5px) due to subpixel DPI rounding. | [task5-open-move-work.txt](file:///c:/dev/vibecheck/docs/phase0-evidence/task5-open-move-work.txt#L4-L24) |
| **C1** | **P1** | **CONFIRMED** | **Coverage Study Data Falsified / Unreliable** | Re-check of 40 sampled commits showed only 30.0% agreement with [`docs/coverage-study.md`](file:///c:/dev/vibecheck/docs/coverage-study.md). 37.5% of sample were non-UI commits (lockfiles, package.json). Order-only partials represent only 3 commits (+0.92%), completely refuting the claimed +48% coverage jump. 5 repos had 0 commits. | [`tools/coverage-study/README.md`](file:///c:/dev/vibecheck/tools/coverage-study/README.md) |
| **U1** | **P2** | **CONFIRMED** | **Duplicate Apply Buttons in Studio** | "Apply to code" (right inspector) and "Apply to Source" (bottom floating review bar) execute the exact same function `applySourceEdit` and endpoint `POST /api/slightnudge/apply`. Redundant duplicate UI control. | [task3-capability-matrix.txt](file:///c:/dev/vibecheck/docs/phase0-evidence/task3-capability-matrix.txt#L24-L25) |
| **U2** | **P2** | **CONFIRMED** | **Inspect Endpoint Dead Code in Studio Overlay** | `POST /api/slightnudge/inspect` is never called by `SlightNudgeOverlay.tsx`. `refusalReason` is declared in the interface but unused in the overlay render logic. | [task3-capability-matrix.txt](file:///c:/dev/vibecheck/docs/phase0-evidence/task3-capability-matrix.txt) |

---

## 2. Task 1: Branch Map & Merge Lineage

**Raw Evidence**: [`docs/phase0-evidence/task1-branch-map.txt`](file:///c:/dev/vibecheck/docs/phase0-evidence/task1-branch-map.txt)

- **Current Branch**: `tools/coverage` (checked out: **YES**)
- **Newest Product Commits**: `feat/studio-full-controls` (Commit `777c2f4`, Oct 20 15:53:29 2026: *"fix(studio): align curved corner pill seamlessly on top of 8px corner curve with zero gap"*). `tools/coverage` is 1 commit ahead of `feat/studio-full-controls`, containing the audit suite.
- **Uncommitted Changes**: Clean worktree.

### Branch Inventory & Lineage Table

| Branch | Last Commit SHA | Last Commit Date | Ahead/Behind vs `feat/studio-full-controls` | Status Relative to Studio Product HEAD |
| :--- | :---: | :---: | :---: | :--- |
| **`tools/coverage`** (Current) | `23fc56c` | 2026-10-20 17:26 | Ahead 1, Behind 0 | **Current HEAD** (Descendant of `feat/studio-full-controls`) |
| **`feat/studio-full-controls`** | `777c2f4` | 2026-10-20 15:53 | Ahead 0, Behind 0 | **Newest SlightNudge product work** (Base of studio controls) |
| **`restore/backend-wiring`** | `18f2187` | 2026-10-20 00:10 | Ahead 0, Behind 8 | Ancestor (8 commits behind `feat/studio-full-controls`) |
| **`move-fix`** | `7047221` | 2026-10-13 11:40 | Ahead 0, Behind 19 | Ancestor (19 commits behind; contains multi-slot move fix) |
| **`backup-move-fix`** | `b4cdb85` | 2026-10-13 02:09 | Ahead 1, Behind 21 | **DIVERGED** (Option A reorder feel branch created 9.5h before `move-fix`) |
| **`ui-extras`** | `4dbfb3e` | 2026-10-13 01:59 | Ahead 1, Behind 21 | **DIVERGED** (Layout focus mode & zoom controls experiment) |
| **`diag/move-feel`** | `ba48948` | 2026-10-12 03:24 | Ahead 0, Behind 21 | Ancestor (Micro-moves & negative margin support) |
| **`m0-fix`** | `ba48948` | 2026-10-12 03:24 | Ahead 0, Behind 21 | Identical to `diag/move-feel` |
| **`ui/layout-focus-mode`** | `ba48948` | 2026-10-12 03:24 | Ahead 0, Behind 21 | Identical to `diag/move-feel` |
| **`slightnudge`** | `048664d` | 2026-10-11 16:10 | Ahead 0, Behind 23 | Ancestor (Initial M0 baseline: `ml-2` -> `ml-2.5`) |
| **`codex/m0`** | `048664d` | 2026-10-11 16:10 | Ahead 0, Behind 23 | Identical to `slightnudge` |

---

## 3. Task 2: Test Inventory & 3x Execution Results

**Raw Evidence**:
- Summary Log: [`docs/phase0-evidence/task2-test-inventory-runs.txt`](file:///c:/dev/vibecheck/docs/phase0-evidence/task2-test-inventory-runs.txt)
- Individual Logs: [`docs/phase0-evidence/task2-runs/`](file:///c:/dev/vibecheck/docs/phase0-evidence/task2-runs/)

### Test Suite Categorization (25 Files in `test/`)

1. **SlightNudge Visual Editor Suites (19 files)**:
   - `test/fixtures.test.ts`: Fixture markup verification
   - `test/m0-regression.test.ts`: 30-selection baseline regression suite
   - `test/m0-overfit.test.ts`: Overfitting check against secondary app
   - `test/step1-selection.test.ts`: In-situ element selection & HUD
   - `test/step2-nudging.test.ts`: Arrow key class nudging scale
   - `test/step3-file-git.test.ts`: Disk application & git status
   - `test/reorder-safety.test.ts`: AST drag/reorder safety guards
   - `test/adapter.test.ts`: Next.js source adapter & asset regex
   - `test/move-expectations.test.ts`: Drag-and-drop matrix (block, flex, zoom)
   - `test/studio-restore.test.ts`: Studio backend restoration flow
   - `test/studio-benchmark.test.ts`: Studio rendering benchmark
   - `test/drag-diagnosis.test.ts`: Drag interaction feel diagnosis
   - `test/drag-resize-move.test.ts`: Resize & move end-to-end
   - `test/in-situ-focus.test.ts`: Focus mode & bridge tests
   - `test/inspect-rects.ts`, `repro-glitch.ts`, `take-screenshot.ts`, `test-full-flow.ts`, `verify-fix.ts`, `verify-live-move.ts`: Verification helpers.
2. **Unrelated VibeCheck Web Scanner & Billing Suites (5 files)**:
   - `test/unit.test.ts`: Scanner pipeline unit tests
   - `test/payments.test.ts`: Dodo Payments webhooks & checkout
   - `test/security-hardening.test.ts`: Monitoring & signature verification
   - `test/analytics-funnel.test.ts`: Marketing analytics & funnels
   - `test/pipeline-integration.test.ts`: Crawler pipeline integration

### 3x Test Execution Results Table

| Suite | Run 1 Status | Run 2 Status | Run 3 Status | Fixture Worktree Impact | Failure Root Cause / Notes |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`test:m0`** | ❌ FAIL (1) | ❌ FAIL (1) | ❌ FAIL (1) | CLEAN | `ERR_CONNECTION_REFUSED http://127.0.0.1:3001/` (Hardcoded port 3001) |
| **`test:overfit`** | ❌ FAIL (1) | ❌ FAIL (1) | ❌ FAIL (1) | CLEAN | `ERR_CONNECTION_REFUSED http://127.0.0.1:3002/` (Hardcoded port 3002) |
| **`test:fixtures`** | ❌ FAIL (1) | ❌ FAIL (1) | ❌ FAIL (1) | CLEAN | `Fixture 1 starts with ml-2` failed (`ml-2.5` present in source) |
| **`test:step1`** | ❌ FAIL (1) | ❌ FAIL (1) | ❌ FAIL (1) | CLEAN | Timeout 30000ms: `#slightnudge-file-display` not found in current overlay |
| **`test:step2`** | ❌ FAIL (1) | ❌ FAIL (1) | ❌ FAIL (1) | CLEAN | Playwright step fails on HUD element assertions |
| **`test:step3`** | ❌ FAIL (1) | ❌ FAIL (1) | ❌ FAIL (1) | CLEAN | Asserts on outdated step 3 overlay selectors |
| **`reorder-safety`**| ✅ **PASS** (0) | ✅ **PASS** (0) | ✅ **PASS** (0) | CLEAN | Pure AST unit tests: 100% passing across all 3 runs (~1.5s) |
| **`adapter`** | ✅ **PASS** (0) | ✅ **PASS** (0) | ✅ **PASS** (0) | CLEAN | Regex & bridge unit tests: 100% passing across all 3 runs (~1.0s) |
| **`move-expectations`**| ❌ FAIL (1) | ❌ FAIL (1) | ❌ FAIL (1) | ⚠️ **MUTATED** | Duration ~120s per run; mutates `fixtures/1-plain-static.tsx`; timeout on flex-row@150% |
| **`studio-restore`** | ❌ FAIL (1) | ❌ FAIL (1) | ❌ FAIL (1) | ⚠️ **MUTATED** | Mutates `fixtures/1-plain-static.tsx`; expects specific headline state |

> [!IMPORTANT]
> **Debunking the "100% Pass" Claim**:  
> The previous Phase 0 report claimed all test suites were passing. In reality, **8 out of 10 SlightNudge suites fail consistently**. Only `reorder-safety` and `adapter` pass. Furthermore, running `move-expectations` and `studio-restore` modifies `fixtures/1-plain-static.tsx` on disk and leaves a dirty worktree.

---

## 4. Task 3: Capability Matrix of Every Studio Control

**Raw Evidence**:
- Matrix Log: [`docs/phase0-evidence/task3-capability-matrix.txt`](file:///c:/dev/vibecheck/docs/phase0-evidence/task3-capability-matrix.txt)
- Screenshots: [`docs/phase0-evidence/screenshots/`](file:///c:/dev/vibecheck/docs/phase0-evidence/screenshots/)

| Control | UI Location | Handler | API Route | AST Function | Status | Evidence / Notes |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **Edit text** | In-situ HUD pill | `handleEditTextClick -> setInlineEditing` | `POST /api/slightnudge/preview` (`kind: 'text'`) | `updateStaticJsxText` | **WORKING** | Inline input renders above element on click; applies via preview/apply. ([Screenshot](file:///c:/dev/vibecheck/docs/phase0-evidence/screenshots/03-edit-text-active.png)) |
| **Bold toggle** | In-situ HUD pill / Inspector | `toggleStyleValue('fontWeight', 'font-bold')` | `POST /api/slightnudge/preview` | `updateStaticTailwindClass` | **WORKING** | Fires preview request, status 200, updates DOM class. ([Screenshot](file:///c:/dev/vibecheck/docs/phase0-evidence/screenshots/04-bold-toggled.png)) |
| **Italic toggle** | Inspector Typography | `toggleStyleValue('fontStyle', 'italic')` | `POST /api/slightnudge/preview` | `updateStaticTailwindClass` | **WORKING** | Toggles `italic` utility class via AST nudger. |
| **Underline toggle** | Inspector Typography | `toggleStyleValue('textDecoration', 'underline')` | `POST /api/slightnudge/preview` | `updateStaticTailwindClass` | **WORKING** | Toggles `underline` utility class via AST nudger. |
| **Font size - / +** | In-situ HUD / Inspector | `nudgeStyleProperty('fontSize', 'down' \| 'up')` | `POST /api/slightnudge/preview` | `updateStaticTailwindClass` | **WORKING** | Steps through Tailwind scale `text-xs` -> `text-7xl`. |
| **Text Alignment** | Inspector Typography / HUD | `setStyleValue('alignment', val)` | `POST /api/slightnudge/preview` | `updateStaticTailwindClass` | **WORKING** | Swaps `text-left`, `text-center`, `text-right`. |
| **Color controls** | Inspector Colors | `setStyleValue('textColor' \| 'backgroundColor', hex)`| `POST /api/slightnudge/preview` | `updateStaticTailwindClass` | **WORKING** | Curated palette swatches work. Arbitrary hex is not verified. |
| **HUD "..." menu** | In-situ HUD pill right end | `toggleMoreActions` | `None (Client popover)` | `None` | **UI-ONLY** | Client-side popover for inspect and class copying. ([Screenshot](file:///c:/dev/vibecheck/docs/phase0-evidence/screenshots/05-hud-more-menu.png)) |
| **Layers panel** | Left Sidebar: Layers tab | `selectLayer / toggleLayerVisibility` | `POST /api/slightnudge/preview` (on reorder) | `reorderElement` | **WORKING** | Renders DOM tree in sidebar; select syncs with canvas. |
| **Pages switcher** | Left Sidebar: Pages tab | `switchActiveRoute` | Next.js client router | `None` | **WORKING** | Switches routes in canvas iframe. |
| **Display** | Right Inspector: Layout | `setStyleValue('display', val)` | `POST /api/slightnudge/preview` | `updateStaticTailwindClass` | **WORKING** | `block`, `flex`, `grid`, `hidden`. ([Screenshot](file:///c:/dev/vibecheck/docs/phase0-evidence/screenshots/06-design-panel.png)) |
| **Width & Height** | Right Inspector: Dimensions | `setStyleValue('width' \| 'height', val)` | `POST /api/slightnudge/preview` | `updateStaticTailwindClass` | **WORKING** | `w-auto`, `w-full`, `h-auto`, `h-full`. |
| **Overflow** | Right Inspector: Dimensions | `setStyleValue('overflow', val)` | `POST /api/slightnudge/preview` | `updateStaticTailwindClass` | **WORKING** | `overflow-hidden`, `overflow-auto`. |
| **Object** | Right Inspector: Image | `updateStaticImageSource` | `POST /api/slightnudge/preview` | `updateStaticImageSource` | **WORKING** | Active when `<img>` or `<Image>` is selected. |
| **Position** | Right Inspector: Layout | `setStyleValue('position', val)` | `POST /api/slightnudge/preview` | `updateStaticTailwindClass` | **WORKING** | `static`, `relative`, `absolute`, `sticky`. |
| **Dimensions options** | Right Inspector: Dimensions (...) | `toggleDimensionsOptionsMenu` | `None (Client UI)` | `None` | **UI-ONLY** | Popover for min/max and aspect-ratio constraints. |
| **Spacing box** | Right Inspector: Spacing | `nudgeSpacingProperty(prop, dir)` | `POST /api/slightnudge/preview` | `updateStaticTailwindClass` | **WORKING** | Interactive nested box model for Margin & Padding. |
| **Typeface & Text** | Right Inspector: Typography | `setStyleValue('fontFamily' \| 'lineHeight' \| 'letterSpacing', val)` | `POST /api/slightnudge/preview` | `updateStaticTailwindClass` | **WORKING** | Font family, line height, tracking, text case. |
| **Settings tab** | Right Inspector: Settings tab | `setActiveTab('settings')` | `None (Client UI)` | `None` | **UI-ONLY** | Canvas preferences & grid toggles. ([Screenshot](file:///c:/dev/vibecheck/docs/phase0-evidence/screenshots/07-settings-panel.png)) |
| **Apply to code** | Right Inspector: Pending edit dock| `applySourceEdit` | `POST /api/slightnudge/apply` | `applyPendingSourceEdit` | **WORKING** | Writes pending edit to disk file. ([Screenshot](file:///c:/dev/vibecheck/docs/phase0-evidence/screenshots/08-pending-edit-dock.png)) |
| **Apply to Source** | Bottom Floating Review Bar | `applySourceEdit` | `POST /api/slightnudge/apply` | `applyPendingSourceEdit` | **DUPLICATE** | **Exact same code path** as "Apply to code". Redundant duplicate button. |
| **Discard button** | Pending dock / review bar | `discardPendingEdit` | `DELETE /api/slightnudge/preview?id=...` | `discardPendingSourceEdit` | **WORKING** | Reverts DOM and deletes pending preview JSON. |
| **Undo & Ctrl+Z** | Header / In-situ HUD / Shortcut | `undoLastEdit / handleKeyDown(Ctrl+Z)` | `POST /api/slightnudge/undo` | `undoSourceEdit` | **WORKING** | Restores previous source snapshot from history. |
| **Deselect** | Canvas background click / Escape | `setSelected(null)` | `None (Client state)` | `None` | **WORKING** | Clears active selection and removes HUD. |
| **Desktop/Tablet/Mobile**| Studio Header | `setViewportWidth(1440 \| 768 \| 375)` | `None (Client UI)` | `None` | **WORKING** | Resizes canvas preview container width. |
| **Project switcher**| Studio Top Header | `onSelectRepository(repoId)` | `GET /api/slightnudge/repositories` | `None` | **WORKING** | Switches workspace target repository. |
| **Explore card & tabs**| Bottom right canvas / Inspector | `setActiveExploreTab` | `None (Client UI)` | `None` | **UI-ONLY** | Recommendations & preset tokens. |

---

## 5. Task 4: Reviewer Findings Verification (S1 - S6)

**Raw Evidence**:
- S1-S5 Log: [`docs/phase0-evidence/task4-findings-s1-s5.txt`](file:///c:/dev/vibecheck/docs/phase0-evidence/task4-findings-s1-s5.txt)
- S6 Studio UI Log: [`docs/phase0-evidence/task3-capability-matrix.txt`](file:///c:/dev/vibecheck/docs/phase0-evidence/task3-capability-matrix.txt#L33-L40)
- S6 Screenshots: [`docs/phase0-evidence/screenshots/09-s6-fixture3-refusal.png`](file:///c:/dev/vibecheck/docs/phase0-evidence/screenshots/09-s6-fixture3-refusal.png), [`10-s6-fixture4-refusal.png`](file:///c:/dev/vibecheck/docs/phase0-evidence/screenshots/10-s6-fixture4-refusal.png), [`11-s6-fixture5-refusal.png`](file:///c:/dev/vibecheck/docs/phase0-evidence/screenshots/11-s6-fixture5-refusal.png)

### S1: Origin Check, Host Validation, Dev Server Binding
- **Test S1.1**: Sent `POST /api/slightnudge/preview` with **no Origin header**.
  - **Result**: Request was **NOT** blocked by the origin check (returned HTTP 400 instead of HTTP 403). The code checks `if (origin && !isAllowedOrigin(...))` which evaluates to `false` when `origin` is null.
  - **Status**: **CONFIRMED (VULNERABILITY)**. Requests lacking an Origin header completely bypass CORS/origin enforcement.
- **Test S1.2**: Sent `POST /api/slightnudge/apply` with **no Origin header** and a fake `previewId`.
  - **Result**: Did not block with 403; it proceeded to file reading and failed with `ENOENT` (HTTP 400).
- **Test S1.3**: Sent `POST /api/slightnudge/apply` with malicious `Host: attacker-domain.evil.com`.
  - **Result**: `Host` header was ignored and unvalidated.
- **Dev Server Binding**: Runs via `next dev --webpack`, binding to `localhost` (`127.0.0.1` / `::1`). Without Origin enforcement on missing headers or Host validation, local servers are exposed to DNS rebinding and cross-site request attacks.

### S2: Pending-Preview Path Traversal Outside Project Root
- **Experiment in Temp Workspace**: Placed pending edit JSON with `filePath: "../../s2-outside/sensitive-outside.txt"` and absolute path outside root.
- **Result**: `applyPendingSourceEdit` threw: `"The edited file must be inside the SlightNudge workspace."`
- **Outside File Status**: Content remained `"CRITICAL OUTSIDE DATA"`. Zero bytes overwritten.
- **Status**: **CONFIRMED (SAFE)**. Path traversal outside project root is strictly refused by `relativeFilePath()`.

### S3: Atomic Write Fallback on Rename Failure
- **Experiment in Temp Workspace**: Forced `renameSync` to repeatedly throw `EPERM` simulating a Windows file lock.
- **Result**: After 5 retry attempts, `atomicWrite` executed its catch-block fallback:
  ```ts
  // lib/slightnudge/edit-history.ts (lines 83-88)
  fs.writeFileSync(filePath, contents, { encoding: 'utf8', mode: existingMode });
  ```
- **Status**: **CONFIRMED (HAZARD)**. Code explicitly falls back to a direct non-atomic overwrite when file rename fails.

### S4: Undo After External Reformatting (Prettier)
- **Experiment in Temp Workspace**: Applied a valid edit, reformatted the file with Prettier-style quote and whitespace changes, and called `undoSourceEdit()`.
- **Result**: Undo safely refused with:
  `"This file changed after the visual edit. Nothing was overwritten; review the source before undoing."`
- **Status**: **CONFIRMED**. Reformatting invalidates the before/after checksum match, preventing accidental clobbering of developer changes.

### S5: Tailwind Compile Check on Apply
- **Experiment in Temp Workspace**: Applied an edit containing a completely fabricated class: `completely-bogus-tailwind-class-99999-invalid`.
- **Result**: `applyPendingSourceEdit` returned `{ success: true }` and wrote the bogus class directly to disk without compiling Tailwind CSS, PostCSS, or checking the class whitelist.
- **Status**: **CONFIRMED (HAZARD)**. Apply performs zero compile or syntax verification on Tailwind classes.

### S6: Loop, Same-Line & Conditional Protections via Live Studio UI
- **Fixture 3 (Conditional `cn(...)`)**: ArrowRight pressed in browser on `#target`. Class remained unchanged: `"ml-2 p-4 text-white rounded bg-slate-700"`. ([Screenshot](file:///c:/dev/vibecheck/docs/phase0-evidence/screenshots/09-s6-fixture3-refusal.png))
- **Fixture 4 (Repeated loop item `.map(...)`)**: Selection blocked. DOM class remained unchanged. ([Screenshot](file:///c:/dev/vibecheck/docs/phase0-evidence/screenshots/10-s6-fixture4-refusal.png))
- **Fixture 5 (Same-line siblings)**: ArrowRight pressed in browser on `#target`. Class remained unchanged: `"ml-2 md:ml-4 lg:ml-8 p-4 bg-purple-600 text-white rounded"`. ([Screenshot](file:///c:/dev/vibecheck/docs/phase0-evidence/screenshots/11-s6-fixture5-refusal.png))
- **Status**: **CONFIRMED (SAFE)**. M0 safety protections successfully refuse edits in the browser UI.

---

## 6. Task 5: Open Move-Work Items

**Raw Evidence**: [`docs/phase0-evidence/task5-open-move-work.txt`](file:///c:/dev/vibecheck/docs/phase0-evidence/task5-open-move-work.txt)

1. **Flaky `block@100%`**:
   - Subpixel rendering on 100% DPI causes `Math.hypot(ms.left - initS.left, ms.top - initS.top)` to intermittently exceed the `0.5px` threshold during small drag (reporting 0.6px - 0.8px drift), causing flakiness in automated runs.
2. **`flex-row@100%/120%` Landing Position & `flex-row@150%` Timeout**:
   - In flex-row, `dropLineCoordAtRelease` vs `finalTargetCoord` delta exceeds the 4px pass boundary due to CSS flex gap and margin offsets.
   - At 150% zoom, pointer drag coordinates calculated in Playwright fail to cross the zoom-scaled swap threshold, resulting in an unhandled 30000ms timeout.
3. **Animation Timing Measured from Real Frames**:
   - Under 150% zoom, FLIP animation frames intermittently spike to 9.2px - 11.4px/frame on initial release, failing the `maxSingleFrameSiblingJumpPx <= 8px` constraint.
4. **Browser Tests for Failed Preview, Rapid Double Drag, Alt+Drag Then Undo**:
   - Rapid double drag is tested in `test/drag-diagnosis.test.ts`.
   - Alt+Drag triggers Option A spacing nudge (adjusts margin/padding class without reordering DOM).
5. **Full Edit History of `test/move-expectations.test.ts`**:
   - Single commit: `7047221` (Oct 13 11:40:27 2026), 796 lines added.
6. **Diff of `test/verify-live-move.ts`**:
   - Drag distance increased from 60px to 100px:
     ```diff
     - await page.mouse.move(moveBox.x + moveBox.width / 2, moveBox.y + moveBox.height / 2 + 60);
     + await page.mouse.move(moveBox.x + moveBox.width / 2, moveBox.y + moveBox.height / 2 + 100);
     ```
7. **What `backup-move-fix` Contained**:
   - Commit `b4cdb85` (Oct 13 02:09:18 2026). Contained initial Option A implementation, but lacked `test/reorder-safety.test.ts` (395 lines), multi-slot safety guards, and same-line AST resolution.

---

## 7. Task 6: Audit of `/docs/coverage-study.md` (DO NOT RELY ON)

> [!CAUTION]
> **DO NOT RELY ON `/docs/coverage-study.md`**  
> An independent audit of [`docs/coverage-study.md`](file:///c:/dev/vibecheck/docs/coverage-study.md) was conducted on branch `tools/coverage` (Seed: 42, Mulberry32 PRNG, 40 commits audited across all 4 verdict buckets). The study's claims and data are fundamentally flawed and should not be used as product requirements.

### Key Audit Corrections
1. **Severe Verdict Disagreement (30.0% Agreement)**:
   Across 40 sampled commits, the study's reported verdicts matched actual AST engine output in only **12 out of 40 cases (30.0%)**.
2. **Heavy Data Contamination (Only 62.5% Truly UI-Only)**:
   15 of the 40 sampled commits (37.5%) were non-UI commits touching lockfiles (`yarn.lock` 421 KB), `package.json`, `middleware.ts`, `route.ts`, or markdown documentation.
3. **The "+48.0% Coverage via Normalizer" Claim is Debunked**:
   The study claimed normalizing class order would convert 156 `PARTIAL` commits to `REPRODUCED`, jumping coverage from 9.2% to 57.2%. In reality, genuine order-only diffs account for only **3 commits (1.9% of PARTIALs)**. A normalizer adds at most **+0.92%**, reaching **10.15%**, not 57.2%.
4. **Ghost Repositories**:
   11 of the 30 repositories had fewer than 5 sampled commits. **5 repositories had literally 0 commits** (`covid-vacuna`, `tailwindcss-com`, `tremor-raw`, `tailwind-heropatterns`, `formik`), despite being advertised as active parts of the 30-repo sample.
5. **Normalizer Violates Safety Invariants**:
   A canonical token normalizer re-sorts all classes on an element, directly violating the SlightNudge rule: *"an edit changes only the targeted token and leaves every other token's order untouched."* It creates massive Git diff churn and destroys authored developer groupings.

---

## 8. Proposed Fix Order

1. **Security & Data Safety (P0)**:
   - **Fix S1**: Enforce mandatory Origin validation in `/api/slightnudge/preview` and `/api/slightnudge/apply`. Reject any request with a missing or unlisted Origin header (HTTP 403). Validate the `Host` header against allowed local domains.
   - **Fix S3**: In `atomicWrite()`, remove the direct `writeFileSync()` fallback on rename failure. If `renameSync()` fails after retries, abort cleanly and throw an explicit error rather than performing a non-atomic write.
   - **Fix S5**: Add a lightweight Tailwind class validation step before applying edits, ensuring newly introduced utilities conform to valid Tailwind syntax.
2. **Test Harness & Worktree Isolation (P1)**:
   - Fix hardcoded ports in `test:m0` (port 3001) and `test:overfit` (port 3002).
   - Update `fixtures/1-plain-static.tsx` back to `ml-2` so `test:fixtures` passes cleanly.
   - Fix `move-expectations` and `studio-restore` to restore fixtures on test teardown, preventing dirty git worktrees.
   - Update `test:step1`, `test:step2`, `test:step3` selectors to match the current Studio overlay markup.
3. **Move & Drag Feel (P1 & P2)**:
   - Fix flex-row@150% zoom drag coordinate scaling to prevent 30s timeouts.
   - Adjust subpixel threshold for small drags in block layout to eliminate flakiness.
   - Consolidate duplicate Apply buttons: remove the redundant "Apply to Source" button from the floating review bar and keep "Apply to code" in the inspector dock.

---

## 9. What I did NOT verify

1. **Dev Server Ports 3001 & 3002 Execution**:
   Because `test:m0` and `test:overfit` hardcode navigation to `http://127.0.0.1:3001` and `http://127.0.0.1:3002`, and the local Next.js dev server was running solely on port 3000, the individual assertions within those two test suites could not be executed to completion without spawning secondary dev servers on those ports.
2. **WebKit & Firefox Cross-Browser Rendering**:
   Playwright browser audits were executed exclusively under Chromium. Cross-browser drag feel, FLIP glide timing, and cursor tracking under Firefox and WebKit were not measured.
3. **Multi-Repo Git Workspace Switching Under High Latency**:
   The Project Switcher was verified against local mock repositories in the repository store. Remote Git clone latency, network timeouts, and branch switching under slow network conditions were not tested.
4. **Native Touch & Mobile Gesture Events**:
   Viewport switching was verified via CSS container width scaling. Physical touch events (`touchstart`, `touchmove`, `touchend`) on actual mobile device hardware were not verified.
5. **Temporary Folders Cleaned Up**:
   - `C:\Users\abhis\AppData\Local\Temp\slightnudge-task4-1792498391654` (Cleaned up and deleted).
   - Zero temp folders failed to delete.
