# S1 baseline — engine and typing checkpoint

Amendment 9 supersedes the earlier baseline STOP. CONFIRMED: fixture-only crash-test repair, the selected engine/recovery battery and all 56 typing fixes are complete. TypeScript and npm run build pass. **The owner's lag is not yet measured or fixed.** This is the clean checkpoint before dev instrumentation/measurement, not completion of Amendment 8 Steps 3–6.

## Checkout and scope

New integration worktree: `C:\dev\vibecheck\scratch\editor-safety-port-20261108`.
Branch: `codex/editor-safety-port-20261108`.
Committed baseline: `7a4c44a9b8a1c1b08d0c8d15541dabb1900636df` (stage/S1's committed tip at creation).

The original stage/S1 checkout has five uncommitted entries: two docs, two test, one root entry. Only counts and top-level locations were inspected; no uncommitted file was opened or copied. This baseline excludes that uncommitted work. No live server was contacted or stopped. No existing worktree or branch was switched or modified.

The package and lockfile hashes differ from the main checkout, so npm ci ran in the integration worktree: 124 packages added; npm reported four audit findings (three moderate, one high). No audit fix or dependency change was made. Package/lockfile hashes remain unchanged. [Install](../evidence/amendment8-npm-ci.txt) · [Hashes](../evidence/amendment8-dependency-hashes.json)


## Current integration state and method

All code commits are on codex/editor-safety-port-20261108 in C:/dev/vibecheck/scratch/editor-safety-port-20261108. Original product provenance remains 7a4c44a. Crash-fixture setup repair: 8c61361. Current integration tip: 33feb4836f207e25884b6cf19252b0d38bee63da.

The baseline ran before applying the typing changes, on product-identical 8c61361 plus the unchanged new snapshot helper. Each group used a fresh environment-file-excluding Git archive, a disposable Git index, junctioned integration dependencies, nested TEMP/TMP and the existing real-state helper around both checkouts. Failed suites ran once more in isolation; assertions, timeouts, authentication and source verification were not weakened. The 300 randomized stacked-Undo seeds all ran. Temporary copies stage only explicit paths, including the intentional removal of omitted .env.example from their private index; next-env.d.ts is never staged. No environment-file contents were read.

The typing changes were first validated as cumulative overlays in disposable copies while the baseline checkout remained unchanged. The validated bytes were then applied in four cause-specific commits. The original real-state helper was copied unchanged and retained in its own commit. No new dependency, instrumentation or performance optimization is present.

## Crash fixture diagnosis

CONFIRMED BASELINE DEFECT, repaired in test setup only. The scoped case supplied repositoryId but setup wrote only root/page.tsx, and did not generate .slightnudge/repositories.json or its managed repository directory. The child reaches source-paths canonicalFile → registeredProjectRoot → assertSourceScope → pending validation and exits 1 before the intended rename/crash hook. Earlier passing apply-review-race uses an unscoped temporary file and requires no registry. Setup now creates the scoped managed directory and registry before writing its fixture. Every original assertion and expected exit 73 remains unchanged; the entire crash suite passes. [Child stderr, stack and line-level comparison](../evidence/amendment9-fixture-triage.txt) · [Green](../evidence/amendment9-crash-setup-green.txt)

## Baseline results

53 engine/recovery suites pass (including the repaired crash suite and the earlier race suite); 9 remain reproduced BASELINE DEFECTs; 28 browser/lab/live-URL candidates were deferred from the 90-candidate baseline inventory as requested. Six of those browser bridge suites subsequently pass as targeted typing validation, distinguished below. No raw output proves a safety violation under Amendment 9. This is **not** an all-green safety battery: missing setup and obsolete expectations remain visible failures.

| Suite | Result / raw output | Classification | First failing assertion or error |
| --- | --- | --- | --- |
| apply-review-race | [PASS](../evidence/amendment8-s1-apply-review-race.txt) | PASS | Four race cases passed on the original tip. |
| apply-crash-recovery | [Red](../evidence/amendment8-s1-apply-crash-recovery.txt), [retry](../evidence/amendment8-s1-apply-crash-recovery-retry.txt), [setup-only green](../evidence/amendment9-crash-setup-green.txt) | BASELINE DEFECT repaired; PASS | Scoped setup omitted the managed root/registry; child 1 instead of expected 73 before recovery ran. |
| apply-outcome | [FAIL](../evidence/amendment9-engine-apply-outcome.txt), [retry](../evidence/amendment9-engine-apply-outcome-retry.txt) | BASELINE DEFECT | ENOENT: generated .slightnudge/repositories.json is absent. |
| apply-client-recovery | [PASS](../evidence/amendment9-engine-apply-client-recovery.txt) | PASS | All assertions passed. |
| apply-denial | [PASS](../evidence/amendment9-engine-apply-denial.txt) | PASS | All assertions passed. |
| source-operation-lock | [PASS](../evidence/amendment9-engine-source-operation-lock.txt) | PASS | All assertions passed. |
| undo-client-recovery | [PASS](../evidence/amendment9-engine-undo-client-recovery.txt) | PASS | All assertions passed. |
| undo-recovery | [PASS](../evidence/amendment9-engine-undo-recovery.txt) | PASS | All assertions passed. |
| studio-recovery | [PASS](../evidence/amendment9-engine-studio-recovery.txt) | PASS | All assertions passed. |
| s1-auth-bypass | [PASS](../evidence/amendment9-engine-s1-auth-bypass.txt) | PASS | All assertions passed. |
| test-override-guard | [FAIL](../evidence/amendment9-engine-test-override-guard.txt), [retry](../evidence/amendment9-engine-test-override-guard-retry.txt) | BASELINE DEFECT | Session token override honored in dev/test mode (expectation fails). |
| prewrite-hook-guard | [PASS](../evidence/amendment9-engine-prewrite-hook-guard.txt) | PASS | All assertions passed. |
| m5-containment-helper | [PASS](../evidence/amendment9-engine-m5-containment-helper.txt) | PASS | All assertions passed. |
| history-resilience | [PASS](../evidence/amendment9-engine-history-resilience.txt) | PASS | All assertions passed. |
| history-summary | [PASS](../evidence/amendment9-engine-history-summary.txt) | PASS | All assertions passed. |
| s3-atomic-write | [FAIL](../evidence/amendment9-engine-s3-atomic-write.txt), [retry](../evidence/amendment9-engine-s3-atomic-write-retry.txt) | BASELINE DEFECT | SOURCE_OPERATION_BUSY before the intended source atomic-write test. |
| token-undo | [PASS](../evidence/amendment9-engine-token-undo.txt) | PASS | All assertions passed. |
| undo-refusals | [PASS](../evidence/amendment9-engine-undo-refusals.txt) | PASS | All assertions passed. |
| undo-m3-restored-token | [PASS](../evidence/amendment9-engine-undo-m3-restored-token.txt) | PASS | All assertions passed. |
| undo-m5-parent-junction | [PASS](../evidence/amendment9-engine-undo-m5-parent-junction.txt) | PASS | All assertions passed. |
| adapter | [PASS](../evidence/amendment9-engine-adapter.txt) | PASS | All assertions passed. |
| advanced-image-source | [PASS](../evidence/amendment9-engine-advanced-image-source.txt) | PASS | All assertions passed. |
| api-response-diagnostics.v2 | [PASS](../evidence/amendment9-engine-api-response-diagnostics-v2.txt) | PASS | All assertions passed. |
| api-response-helper.v2 | [PASS](../evidence/amendment9-engine-api-response-helper-v2.txt) | PASS | All assertions passed. |
| appearance-layout | [PASS](../evidence/amendment9-engine-appearance-layout.txt) | PASS | All assertions passed. |
| button-editing | [PASS](../evidence/amendment9-engine-button-editing.txt) | PASS | All assertions passed. |
| component-actions | [PASS](../evidence/amendment9-engine-component-actions.txt) | PASS | All assertions passed. |
| component-ownership | [PASS](../evidence/amendment9-engine-component-ownership.txt) | PASS | All assertions passed. |
| component-props | [PASS](../evidence/amendment9-engine-component-props.txt) | PASS | All assertions passed. |
| container-move | [PASS](../evidence/amendment9-engine-container-move.txt) | PASS | All assertions passed. |
| continuous-draft | [PASS](../evidence/amendment9-engine-continuous-draft.txt) | PASS | All assertions passed. |
| direct-manipulation | [PASS](../evidence/amendment9-engine-direct-manipulation.txt) | PASS | All assertions passed. |
| drag-move | [PASS](../evidence/amendment9-engine-drag-move.txt) | PASS | All assertions passed. |
| fixtures | [PASS](../evidence/amendment9-engine-fixtures.txt) | PASS | All assertions passed. |
| hmr-sync | [PASS](../evidence/amendment9-engine-hmr-sync.txt) | PASS | All assertions passed. |
| icon-properties | [PASS](../evidence/amendment9-engine-icon-properties.txt) | PASS | All assertions passed. |
| icon-replacement | [PASS](../evidence/amendment9-engine-icon-replacement.txt) | PASS | All assertions passed. |
| image-assets | [PASS](../evidence/amendment9-engine-image-assets.txt) | PASS | All assertions passed. |
| image-content | [PASS](../evidence/amendment9-engine-image-content.txt) | PASS | All assertions passed. |
| image-framing | [PASS](../evidence/amendment9-engine-image-framing.txt) | PASS | All assertions passed. |
| imported-draft | [FAIL](../evidence/amendment9-engine-imported-draft.txt), [retry](../evidence/amendment9-engine-imported-draft-retry.txt) | BASELINE DEFECT | Expected /different source file or project/; received ENOENT repositories.json. |
| in-situ-focus | [FAIL](../evidence/amendment9-engine-in-situ-focus.txt), [retry](../evidence/amendment9-engine-in-situ-focus-retry.txt) | BASELINE DEFECT | ENOENT .slightnudge while resolving the adapter repository. |
| inspection-client | [PASS](../evidence/amendment9-engine-inspection-client.txt) | PASS | All assertions passed. |
| jsx-text | [PASS](../evidence/amendment9-engine-jsx-text.txt) | PASS | All assertions passed. |
| m1-interactions | [PASS](../evidence/amendment9-engine-m1-interactions.txt) | PASS | All assertions passed. |
| move-controls | [PASS](../evidence/amendment9-engine-move-controls.txt) | PASS | All assertions passed. |
| multi-file-crash | [PASS](../evidence/amendment9-engine-multi-file-crash.txt) | PASS | All assertions passed. |
| multi-file-group | [PASS](../evidence/amendment9-engine-multi-file-group.txt) | PASS | All assertions passed. |
| preview-connection | [FAIL](../evidence/amendment9-engine-preview-connection.txt), [retry](../evidence/amendment9-engine-preview-connection-retry.txt) | BASELINE DEFECT | Access denied: 403 !== 200. |
| project-compatibility | [PASS](../evidence/amendment9-engine-project-compatibility.txt) | PASS | All assertions passed. |
| reorder-safety | [FAIL](../evidence/amendment9-engine-reorder-safety.txt), [retry](../evidence/amendment9-engine-reorder-safety-retry.txt) | BASELINE DEFECT | targetIndex NaN returns status 400 (assertion fails before body validation). |
| s1-auth-origin | [FAIL](../evidence/amendment9-engine-s1-auth-origin.txt), [retry](../evidence/amendment9-engine-s1-auth-origin-retry.txt) | BASELINE DEFECT | Missing Origin must be allowed when token is valid (obsolete expectation). |
| s2-path-traversal | [PASS](../evidence/amendment9-engine-s2-path-traversal.txt) | PASS | All assertions passed. |
| s5-tailwind-compile | [PASS](../evidence/amendment9-engine-s5-tailwind-compile.txt) | PASS | All assertions passed. |
| s5-theme-support | [PASS](../evidence/amendment9-engine-s5-theme-support.txt) | PASS | All assertions passed. |
| s5-v3-support | [PASS](../evidence/amendment9-engine-s5-v3-support.txt) | PASS | All assertions passed. |
| section-order | [PASS](../evidence/amendment9-engine-section-order.txt) | PASS | All assertions passed. |
| shared-instance | [PASS](../evidence/amendment9-engine-shared-instance.txt) | PASS | All assertions passed. |
| style-isolation | [PASS](../evidence/amendment9-engine-style-isolation.txt) | PASS | All assertions passed. |
| token-html-host | [FAIL](../evidence/amendment9-engine-token-html-host.txt), [retry](../evidence/amendment9-engine-token-html-host-retry.txt) | BASELINE DEFECT | 307 !== 200 for the legacy /studio route. |
| undo-stacked-edits | [PASS](../evidence/amendment9-engine-undo-stacked-edits.txt) | PASS | All assertions passed. |
| unified-editor-routing | [PASS](../evidence/amendment9-engine-unified-editor-routing.txt) | PASS | All assertions passed. |
| advanced-image-bridge | UNRUN | DEFERRED | Browser/lab scope deferred as requested. |
| bridge-ready-handshake.browser | UNRUN | DEFERRED | Browser/lab scope deferred as requested. |
| component-actions-bridge | Deferred for baseline; [typed targeted PASS](../evidence/amendment9-browser-fixed-component-actions-bridge.txt) | DEFERRED | Browser/lab scope deferred as requested. |
| component-inline-bridge | UNRUN | DEFERRED | Browser/lab scope deferred as requested. |
| icon-properties-bridge | Deferred for baseline; [typed targeted PASS](../evidence/amendment9-browser-fixed-icon-properties-bridge.txt) | DEFERRED | Browser/lab scope deferred as requested. |
| icon-replacement-bridge | Deferred for baseline; [typed targeted PASS](../evidence/amendment9-browser-fixed-icon-replacement-bridge.txt) | DEFERRED | Browser/lab scope deferred as requested. |
| image-attributes-bridge | Deferred for baseline; [typed targeted PASS](../evidence/amendment9-browser-fixed-image-attributes-bridge.txt) | DEFERRED | Browser/lab scope deferred as requested. |
| imported-canvas-runtime | UNRUN | DEFERRED | Browser/lab scope deferred as requested. |
| in-situ-controls | UNRUN | DEFERRED | Browser/lab scope deferred as requested. |
| m0-overfit.iframe-v3 | UNRUN | DEFERRED | lab harness required |
| m0-overfit.reliability | UNRUN | DEFERRED | lab harness required |
| m0-overfit.reliability.v3 | UNRUN | DEFERRED | lab harness required |
| m0-overfit.security-v2 | UNRUN | DEFERRED | lab harness required |
| m0-overfit | UNRUN | DEFERRED | lab harness required |
| m0-regression.iframe-v3 | UNRUN | DEFERRED | lab harness required |
| m0-regression.reliability | UNRUN | DEFERRED | lab harness required |
| m0-regression.reliability.v3 | UNRUN | DEFERRED | lab harness required |
| m0-regression.security-v2 | UNRUN | DEFERRED | lab harness required |
| m0-regression | UNRUN | DEFERRED | lab harness required |
| move-css-compatibility | UNRUN | DEFERRED | Browser/lab scope deferred as requested. |
| responsive-scopes | UNRUN | DEFERRED | Browser/lab scope deferred as requested. |
| responsive-tailwind3 | UNRUN | DEFERRED | Browser/lab scope deferred as requested. |
| runtime-class-ownership | Deferred for baseline; [typed targeted PASS](../evidence/amendment9-browser-fixed-runtime-class-ownership.txt) | DEFERRED | Browser/lab scope deferred as requested. |
| section-order-bridge | UNRUN | DEFERRED | Browser/lab scope deferred as requested. |
| shared-instance-bridge | UNRUN | DEFERRED | Browser/lab scope deferred as requested. |
| source-document-fence.browser | UNRUN | DEFERRED | Browser/lab scope deferred as requested. |
| source-rendered-bridge | Deferred for baseline; [typed targeted PASS](../evidence/amendment9-browser-fixed-source-rendered-bridge.txt) | DEFERRED | Browser/lab scope deferred as requested. |
| step2-nudging | UNRUN | DEFERRED | deferred: hard-coded live port; requires disposable URL harness |

## Failure classifications

- **apply-outcome, BASELINE DEFECT:** Generated project registry missing (ENOENT repositories.json) in scoped test setup before outcome recovery can run; no raw evidence of a violated safety property. [First](../evidence/amendment9-engine-apply-outcome.txt) · [Retry](../evidence/amendment9-engine-apply-outcome-retry.txt)
- **test-override-guard, BASELINE DEFECT:** Obsolete dev/test token-override expectation: S1 intentionally removed SLIGHTNUDGE_SESSION_TOKEN override. The production override rejection checks pass; no authentication bypass is shown. Keep the stronger product auth and leave the assertion unchanged. [First](../evidence/amendment9-engine-test-override-guard.txt) · [Retry](../evidence/amendment9-engine-test-override-guard-retry.txt)
- **s3-atomic-write, BASELINE DEFECT:** The permanent global rename fault also intercepts S1 source-operation lock acquisition; SOURCE_OPERATION_BUSY occurs before the intended source atomic-write path. No lost edit/outside write or unrecoverable accepted operation is shown. [First](../evidence/amendment9-engine-s3-atomic-write.txt) · [Retry](../evidence/amendment9-engine-s3-atomic-write-retry.txt)
- **imported-draft, BASELINE DEFECT:** Generated repositories.json is absent before the intended wrong-project assertion; the thrown error is ENOENT rather than the expected scope-refusal message. No source write or scope bypass is shown. [First](../evidence/amendment9-engine-imported-draft.txt) · [Retry](../evidence/amendment9-engine-imported-draft-retry.txt)
- **in-situ-focus, BASELINE DEFECT:** Adapter-lifecycle test assumes a registered repository in the disposable source but creates no .slightnudge registry; getNextSourceAdapterStatus fails closed with ENOENT before lifecycle checks. No outside write or authorization bypass is shown. [First](../evidence/amendment9-engine-in-situ-focus.txt) · [Retry](../evidence/amendment9-engine-in-situ-focus-retry.txt)
- **preview-connection, BASELINE DEFECT:** The synthetic Request has Host and token but omits the required Origin header, so S1 denies it with 403 before preview connection. This is auth/test setup mismatch, not a bypass. [First](../evidence/amendment9-engine-preview-connection.txt) · [Retry](../evidence/amendment9-engine-preview-connection-retry.txt)
- **reorder-safety, BASELINE DEFECT:** The targetIndex validation helper sends no x-slightnudge-token and relies on the old process-name reorder auth bypass removed in S1. Auth runs before payload validation; the raw first failure is targetIndex NaN expected status 400, not a successful unsafe reorder. Existing direct AST reorder checks passed. [First](../evidence/amendment9-engine-reorder-safety.txt) · [Retry](../evidence/amendment9-engine-reorder-safety-retry.txt)
- **s1-auth-origin, BASELINE DEFECT:** Obsolete expectations: missing Origin with a valid token is now correctly rejected (403); the old Undo request supplies only filePath, but S1 requires previewId and returns UNDO_TARGET_REQUIRED (400). Valid Host/Origin/token rejection cases pass. No bypass or unrecoverable accepted edit is shown. [First](../evidence/amendment9-engine-s1-auth-origin.txt) · [Retry](../evidence/amendment9-engine-s1-auth-origin-retry.txt)
- **token-html-host, BASELINE DEFECT:** 21/23 Host/token checks pass; the two failures expect 200 HTML at /studio, but S1 intentionally redirects that legacy route to /editor with 307. Invalid/forwarded-host checks pass, and no token/Host bypass is shown. [First](../evidence/amendment9-engine-token-html-host.txt) · [Retry](../evidence/amendment9-engine-token-html-host-retry.txt)

These classifications do not authorize weaker behavior. In particular, Origin/token requirements, project registries, explicit Undo binding and legacy-route redirects remain intact. Valid new Apply/Undo recovery and guarded-hook suites pass. Dedicated S1/S2/S3 proof scripts also pass after their typing-only change: [Auth](../evidence/amendment9-env-security-hardening-v2-proofs.txt), [containment](../evidence/amendment9-env-proofs-s2.txt), [atomic writes](../evidence/amendment9-env-proofs-s3.txt).

## TypeScript and build

The original 56 diagnostics are listed individually and grouped in [diagnostic inventory](../evidence/amendment9-typing-table.md), with [raw original failure](../evidence/amendment8-s1-tsc.txt). No other cause group was present.

| Cause | Original diagnostics | Remaining after group | Commit | Validation |
| --- | ---: | ---: | --- | --- |
| EventTarget focus | 1 | 55 | ed11f8a | [Raw tsc](../evidence/amendment9-types-focus.txt) |
| Readonly NODE_ENV | 9 | 46 | cd08451 | [Raw tsc](../evidence/amendment9-types-env.txt) |
| Optional values | 20 | 26 | 6037c3f | [Raw tsc](../evidence/amendment9-optional-typecheck.txt) |
| Older browser-test typings | 26 | 0 | e86cc17 | [Raw tsc](../evidence/amendment9-types-final-candidate.txt) |

Focus uses React.PointerEvent<HTMLElement> for the HTML drag handle; emitted behavior is unchanged. Tests mutate NODE_ENV through a typed record referencing process.env. Draft assertions now first require renderPatches to exist; optional diagnostic messages receive a fallback without changing success assertions. Browser callbacks use window.location to avoid shadowed Node variables, check HTMLElement/source metadata before use, preserve the serialized probe's inferred return type and require an open browser before close. The stronger return type exposed nullable metadata at callers; explicit checks handle it. There is no new any, suppression, non-null assertion or config relaxation. [Added-line audit](../evidence/amendment9-typing-added-lines.txt) · [Validation summary](../evidence/amendment9-type-validation.json)

Affected direct suites: drag-move, direct-manipulation, account-isolation, production-boundaries, appearance-layout, button-editing, component-ownership, container-move, image-content, image-framing, section-order and shared-instance pass. Six in-memory bridge suites and the new transformed-iframe coordinate probe pass. The latter verifies typed probe serialization, metadata and absent metadata, array/single coordinate conversion, scaled iframe geometry and the actual physical source hit, without a server. [Coordinate proof](../evidence/amendment9-browser-coordinate-probe.txt)

imported-draft still fails before its expected scope-refusal assertion because its generated registry is absent; one post-change retry reproduces it. The formatter/report script still cannot find its historical disposable Prettier tool dependency; one retry reproduces MODULE_NOT_FOUND. These are recorded setup defects, not passing tests. Existing full-editor selection/lab workflows with hard-coded live URLs remain UNVERIFIED and were not contacted. [Retry: imported draft](../evidence/amendment9-types-retry-imported-draft.txt) · [Retry: formatter](../evidence/amendment9-types-retry-format-and-tailwind-report-v2.txt)

CONFIRMED: final TypeScript has zero diagnostics, including the new coordinate test. The literal npm run build succeeds, including Next type checking and static generation. The existing webpack module.createRequire warning remains. [Final tsc](../evidence/amendment9-types-final-candidate.txt) · [Production build](../evidence/amendment9-types-build.txt)

## Measurement status and next step

h2–h9 remain UNVERIFIED by timing evidence. No stuck interval, per-stage timing, top-three bottleneck ranking, remount counter, long-task/frame/render/network/bridge table, delay matrix, speedup or before/after video is claimed. A passing production build now permits production measurement after the required dev-first matrix. No optimization should be selected before those measurements.

Resume at Amendment 9 item 5 / Amendment 8 Step 3: test-first guarded instrumentation, prove production/unset inertness, then disposable dev workspace measurements (20 runs per scenario; small/2000-line sources and 0/500/1500 ms pre-write delays), followed by production, measured-impact fixes, preview check and videos. No owner's server is involved. The current scripts accept fresh unique evidence labels:

```powershell
Set-Location -LiteralPath 'C:\dev\vibecheck'
git -C scratch/editor-safety-port-20261108 status --short
git -C scratch/editor-safety-port-20261108 log -6 --oneline
node --import tsx scratch/editor-sprint1-run-group.ts amendment9-resume-tsc node --import tsx scratch/editor-s1-group.ts amendment9-resume-tsc typecheck
```

After adding the new guard test in the integration worktree, its missing-instrumentation red can run with a fresh label through the same isolation wrapper:

```powershell
node --import tsx scratch/editor-sprint1-run-group.ts amendment9-perf-guard-red node --import tsx scratch/editor-s1-group.ts amendment9-perf-guard-red perf-stage-guard test/perf-stage-guard.test.ts
```

The guard test and measurement harness do not exist yet. Create them in the integration checkout, never in the original S1 worktree. Keep store-v2 parked. Remaining work after performance/preview: safety ports in port-plan.md order, design pass C, controls wave and Part 2c restart/reload/copy work.

## Noticed but not fixed

- Nine reproduced baseline defects above remain; no assertions were rewritten to match stronger auth or changed redirects.
- Historical formatter tool dependency is absent; no new dependency was installed to repair that optional script.
- Webpack warns about module.createRequire in lib/slightnudge/tailwind-verifier.ts.
- Tracked .env.example is deliberately omitted from disposable archives; its contents were not read.
- Windows file-symlink cases requiring unavailable privilege remain UNVERIFIED; directory-junction containment passes. One theme suite cannot perform its optional v3 probe, while dedicated s5-v3-support passes both real v3 cases.
- The integration copy excludes the original S1 worktree's five uncommitted entries. No claim about those uncommitted behaviors is made.

## Protected state and cleanup

[Snapshot/root audit](../evidence/amendment9-audit.json) enumerates every isolation root and before/after pair. All completed protected-state and Git-status comparisons match. All named disposable roots, nested data, dependency junctions, compiler/npm caches and browser temp state are removed at checkpoint. The authorized integration checkout/dependencies remain. No real developer history records were parsed, migrated or edited; required fingerprint snapshots are the only access.

Server instances in this battery: s1-auth-origin twice and token-html-host twice use the unmodified helper's own free-port Next servers; preview-connection twice creates its own port-0 HTTP server. Their awaited teardown runs in finally, and owning groups exit and remove their roots. The HTTP port numbers and helper child PIDs were not all logged; no complete per-PID inventory is claimed. Browser bridge/coordinate tests use routed or in-memory documents and start no server. The original stage/S1 checkout and all pre-existing servers, including 3100/3102, were never contacted, stopped or modified.

## What I did NOT verify

The user's actual lag, dev/production timing matrix, instrumentation inertness, h2–h9 by measurements, performance fixes/budgets/queues, preview correctness on this line, before/after videos, original S1 uncommitted changes, or deferred full-editor/lab/live-URL suites. The nine baseline defects remain failures. No safety-port merge, design pass or controls work was started.
