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
