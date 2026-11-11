# Engine/recovery baseline table (in progress)

Tests use the unmodified product tip plus the committed crash-fixture setup repair. Each failed suite has one isolated retry. No baseline safety violation has been demonstrated.

| Suite | Result | Classification | First failing assertion or error / interpretation |
| --- | --- | --- | --- |
| apply-outcome | [raw failure](amendment9-engine-apply-outcome.txt) / [raw failure](amendment9-engine-apply-outcome-retry.txt) | BASELINE DEFECT | Generated project registry missing (ENOENT repositories.json) in scoped test setup before outcome recovery can run; no raw evidence of a violated safety property. |
| apply-client-recovery | [pass](amendment9-engine-apply-client-recovery.txt) | PASS | All assertions passed. |
| apply-denial | [pass](amendment9-engine-apply-denial.txt) | PASS | All assertions passed. |
| source-operation-lock | [pass](amendment9-engine-source-operation-lock.txt) | PASS | All assertions passed. |
| undo-client-recovery | [pass](amendment9-engine-undo-client-recovery.txt) | PASS | All assertions passed. |
| undo-recovery | [pass](amendment9-engine-undo-recovery.txt) | PASS | All assertions passed. |
| studio-recovery | [pass](amendment9-engine-studio-recovery.txt) | PASS | All assertions passed. |
| s1-auth-bypass | [pass](amendment9-engine-s1-auth-bypass.txt) | PASS | All assertions passed. |
| test-override-guard | [raw failure](amendment9-engine-test-override-guard.txt) / [raw failure](amendment9-engine-test-override-guard-retry.txt) | BASELINE DEFECT | Obsolete dev/test token-override expectation: S1 intentionally removed SLIGHTNUDGE_SESSION_TOKEN override. The production override rejection checks pass; no authentication bypass is shown. Keep the stronger product auth and leave the assertion unchanged. |
| prewrite-hook-guard | [pass](amendment9-engine-prewrite-hook-guard.txt) | PASS | All assertions passed. |
| m5-containment-helper | [pass](amendment9-engine-m5-containment-helper.txt) | PASS | All assertions passed. |
| history-resilience | [pass](amendment9-engine-history-resilience.txt) | PASS | All assertions passed. |
| history-summary | [pass](amendment9-engine-history-summary.txt) | PASS | All assertions passed. |
| s3-atomic-write | [raw failure](amendment9-engine-s3-atomic-write.txt) / [raw failure](amendment9-engine-s3-atomic-write-retry.txt) | BASELINE DEFECT | The permanent global rename fault also intercepts S1 source-operation lock acquisition; SOURCE_OPERATION_BUSY occurs before the intended source atomic-write path. No lost edit/outside write or unrecoverable accepted operation is shown. |
| token-undo | [pass](amendment9-engine-token-undo.txt) | PASS | All assertions passed. |
| undo-refusals | [pass](amendment9-engine-undo-refusals.txt) | PASS | All assertions passed. |
| undo-m3-restored-token | [pass](amendment9-engine-undo-m3-restored-token.txt) | PASS | All assertions passed. |
| undo-m5-parent-junction | [pass](amendment9-engine-undo-m5-parent-junction.txt) | PASS | All assertions passed. |
| adapter | [pass](amendment9-engine-adapter.txt) | PASS | All assertions passed. |
| advanced-image-source | [pass](amendment9-engine-advanced-image-source.txt) | PASS | All assertions passed. |
| api-response-diagnostics.v2 | [pass](amendment9-engine-api-response-diagnostics-v2.txt) | PASS | All assertions passed. |
| api-response-helper.v2 | [pass](amendment9-engine-api-response-helper-v2.txt) | PASS | All assertions passed. |
| appearance-layout | [pass](amendment9-engine-appearance-layout.txt) | PASS | All assertions passed. |
| button-editing | [pass](amendment9-engine-button-editing.txt) | PASS | All assertions passed. |
| component-actions | [pass](amendment9-engine-component-actions.txt) | PASS | All assertions passed. |
| component-ownership | [pass](amendment9-engine-component-ownership.txt) | PASS | All assertions passed. |
| component-props | [pass](amendment9-engine-component-props.txt) | PASS | All assertions passed. |
| container-move | [pass](amendment9-engine-container-move.txt) | PASS | All assertions passed. |
| continuous-draft | [pass](amendment9-engine-continuous-draft.txt) | PASS | All assertions passed. |
| direct-manipulation | [pass](amendment9-engine-direct-manipulation.txt) | PASS | All assertions passed. |
| drag-move | [pass](amendment9-engine-drag-move.txt) | PASS | All assertions passed. |
| fixtures | [pass](amendment9-engine-fixtures.txt) | PASS | All assertions passed. |
| hmr-sync | [pass](amendment9-engine-hmr-sync.txt) | PASS | All assertions passed. |
| icon-properties | [pass](amendment9-engine-icon-properties.txt) | PASS | All assertions passed. |
| icon-replacement | [pass](amendment9-engine-icon-replacement.txt) | PASS | All assertions passed. |
| image-assets | [pass](amendment9-engine-image-assets.txt) | PASS | All assertions passed. |
| image-content | [pass](amendment9-engine-image-content.txt) | PASS | All assertions passed. |
| image-framing | [pass](amendment9-engine-image-framing.txt) | PASS | All assertions passed. |
| imported-draft | [raw failure](amendment9-engine-imported-draft.txt) / [raw failure](amendment9-engine-imported-draft-retry.txt) | BASELINE DEFECT | Generated repositories.json is absent before the intended wrong-project assertion; the thrown error is ENOENT rather than the expected scope-refusal message. No source write or scope bypass is shown. |
| in-situ-focus | [raw failure](amendment9-engine-in-situ-focus.txt) / [raw failure](amendment9-engine-in-situ-focus-retry.txt) | BASELINE DEFECT | Adapter-lifecycle test assumes a registered repository in the disposable source but creates no .slightnudge registry; getNextSourceAdapterStatus fails closed with ENOENT before lifecycle checks. No outside write or authorization bypass is shown. |
| inspection-client | [pass](amendment9-engine-inspection-client.txt) | PASS | All assertions passed. |
| jsx-text | [pass](amendment9-engine-jsx-text.txt) | PASS | All assertions passed. |
| m1-interactions | [pass](amendment9-engine-m1-interactions.txt) | PASS | All assertions passed. |
| move-controls | [pass](amendment9-engine-move-controls.txt) | PASS | All assertions passed. |
| multi-file-crash | [pass](amendment9-engine-multi-file-crash.txt) | PASS | All assertions passed. |
| multi-file-group | [pass](amendment9-engine-multi-file-group.txt) | PASS | All assertions passed. |
| preview-connection | [raw failure](amendment9-engine-preview-connection.txt) / [raw failure](amendment9-engine-preview-connection-retry.txt) | BASELINE DEFECT | The synthetic Request has Host and token but omits the required Origin header, so S1 denies it with 403 before preview connection. This is auth/test setup mismatch, not a bypass. |
| project-compatibility | [pass](amendment9-engine-project-compatibility.txt) | PASS | All assertions passed. |
| reorder-safety | [raw failure](amendment9-engine-reorder-safety.txt) / [raw failure](amendment9-engine-reorder-safety-retry.txt) | BASELINE DEFECT | The targetIndex validation helper sends no x-slightnudge-token and relies on the old process-name reorder auth bypass removed in S1. Auth runs before payload validation; the raw first failure is targetIndex NaN expected status 400, not a successful unsafe reorder. Existing direct AST reorder checks passed. |
| s1-auth-origin | [raw failure](amendment9-engine-s1-auth-origin.txt) / [raw failure](amendment9-engine-s1-auth-origin-retry.txt) | BASELINE DEFECT | Obsolete expectations: missing Origin with a valid token is now correctly rejected (403); the old Undo request supplies only filePath, but S1 requires previewId and returns UNDO_TARGET_REQUIRED (400). Valid Host/Origin/token rejection cases pass. No bypass or unrecoverable accepted edit is shown. |
| s2-path-traversal | [pass](amendment9-engine-s2-path-traversal.txt) | PASS | All assertions passed. |
| s5-tailwind-compile | [pass](amendment9-engine-s5-tailwind-compile.txt) | PASS | All assertions passed. |
| s5-theme-support | [pass](amendment9-engine-s5-theme-support.txt) | PASS | All assertions passed. |
| s5-v3-support | [pass](amendment9-engine-s5-v3-support.txt) | PASS | All assertions passed. |
| section-order | [pass](amendment9-engine-section-order.txt) | PASS | All assertions passed. |
| shared-instance | [pass](amendment9-engine-shared-instance.txt) | PASS | All assertions passed. |
| style-isolation | [pass](amendment9-engine-style-isolation.txt) | PASS | All assertions passed. |
| token-html-host | [raw failure](amendment9-engine-token-html-host.txt) / [raw failure](amendment9-engine-token-html-host-retry.txt) | BASELINE DEFECT | 21/23 Host/token checks pass; the two failures expect 200 HTML at /studio, but S1 intentionally redirects that legacy route to /editor with 307. Invalid/forwarded-host checks pass, and no token/Host bypass is shown. |
