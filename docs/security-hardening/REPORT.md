# Security hardening — stopped at regression readiness failure

Branch: `security/hardening`. Local only; no push. `ui/unified-editor` was fast-forwarded from 24c6259 to 7f1b9cd using `merge --ff-only`, then this branch was created. See fast-forward.txt and initial-git-status.txt.

## Result

The security/diagnostic fixes have passing focused tests. The required three-round selection gate is **not passed**. Its first cell (round 1, old Studio, M0 regression) timed out before case 1 waiting for `[data-source-ready="true"]` under the unchanged 30-second limit. The screenshot shows Connecting; server-matrix-3001.log shows the fixture compiling `/page`. The editor route returned 200, the repository endpoint returned 200, and preview-check returned 200 after 14.7 seconds. This evidence supports a cold-preview readiness timeout, not a proven wrong-selection defect. No additional product fix or retry of the matrix was made.

`selection/round-1-raw.log`, `selection/round-1-git-status.txt`, `selection/round-1-old-studio-regression-error.png` and `selection/STOP.json` preserve the failure. `selection/all-cases.md/json` accounts for all 720 scheduled cases: **720 UNREACHED**, 0 observed wrong targets, 0 observed page errors. Zero observed errors with zero cases is not a passing gate. Rounds 2 and 3 were not started; no fabricated output/status exists for them. No NOT-CLICKABLE/Layers claim can be made from this run.

## Proof before fix and final checks

| Item | Before | Final evidence |
|---|---|---|
| S1 | Missing-Origin requests reached validation; argv auth bypass and static-token override also reproduced. Foreign Origin/wrong Host were already rejected. | S1-before-complete.log/json; S1-final.log/json: 16 checks pass. Mandatory Origin, allowed Host and random process token. App-controlled dev/start bind 127.0.0.1. |
| S2 | Local junction resolver and cross-project/unbound persisted scope were accepted at the resolver/state-reader boundary. Parent/absolute pending escape was already rejected. | S2-before-complete and S2-before-unbound-history; S2-final.log/json: 16 checks pass. No claim of a demonstrated cross-project Apply exploit where old request-scope checks already refused. |
| S3 | Forced rename already refused with original byte-identical: **no non-atomic fallback existed**. Six attempts and truncated short writes failed new checks. | S3-before-complete; S3-final.log/json: four checks pass; initial rename plus three retries, original unchanged on failure, complete UTF-8 writes. |
| API bodies | New malformed-body tests failed to expose URL/status/body diagnostics before. | response-diagnostics-final.log: 15 cases pass; response-helper-final.log: six checks pass. responses-verified browser evidence: three UI alerts, no page errors. |
| Hydration/startup | Owned callsite attributes mismatch after HMR; full stylesheet/Suspense mismatch reproduced. Precedence alone failed. | hydration.md contains complete evidence chain. Final 16 recompile cycles: zero page failures, zero hydration mismatches. Two font/startup checks also pass. |
| Shared instances | Initial NEW driver discarded the legacy feature flag; fixed only its setup. Next run had an imported Save response timeout. Both failed outputs retained. | shared-workflows.log: all four original workflows pass in the final diagnostic run, including refresh, Save and exact Undo. Original assertions and limits unchanged. Earlier timeout remains an intermittent reliability observation. |

The security proofs modify only designated scratch copies. The formatter/rename/path experiments never operate on registered real projects. One test process ran at a time. Regression servers and browser workflows use separate temporary state, and owned test servers were stopped afterward.

## Product changes and commits

| Local commit | Every product hunk / test mapping |
|---|---|
| 5f40e10 — fix(security): require mutation origins and loopback binding | auth.ts removes environment token override and argv bypass; missing Origin refuses. package.json start binds loopback. S1.md maps each hunk to tests. |
| 7f76c57 — core: validate persisted source project boundaries | New source-paths canonical file/registered-root/scope helpers; repository-store canonical registry/local path/root resolution; edit-history validates registered and unbound history/pending scope. S2.md and S2-product-hunks.patch list all hunks and tests. |
| 7f9281f — core: complete atomic writes and bound rename retries | edit-history complete-buffer write loop; three transient-lock backoffs. S3.md and S3-product-hunks.patch map both hunks to before/after tests. |
| 5a1c06f — core: surface bounded API response diagnostics | New response helper; thin-client reader/diagnostic catches; UI reader imports and replacements; project route discovery catch; serialized legacy bridge helper. response-diagnostics.md and response-product-hunks.patch enumerate hunks and validation. |
| 58618d0 — fix(editor): stabilize hydration and self-host editor fonts | RootLayout font variables; EditorWorkspace removes body font links; shared EditorClient mount boundary; three route imports; owned-control instrumentation exclusion. hydration.md and hydration-product-hunks.patch map each hunk to checks. |

`all-product-hunks.patch` contains the complete product diff against 7f1b9cd. `product-diff-stat.txt`: **22 product files, 197 insertions, 109 deletions**. The AST patcher, source-loader implementation and selection-dispatch logic were not changed. The root webpack config explicitly changes which owned editor controls are instrumented; editable customer fixtures remain included. Original test hashes are unchanged (`protected-check.json`). Existing next-env.d.ts changes and unrelated untracked files are excluded from commits.

## Path and API audit

`route-path-inventory.txt` and `path-inputs-original-audit.txt` list request/disk consumers with file:line references. Preview/inspect/responsive resolve filePath/sourcePath or repository IDs; Apply and its status read pending/history targets and validate optional repository scope; Undo and its status bind accepted edit IDs to resolved paths; change-set resolves each member; draft-view reopens a scoped pending snapshot; history reads registered-project records; repository source/inspect endpoints resolve query/body source paths. Repository adapter/preview lifecycle operations resolve registered IDs; assets use a registered root and reject linked storage directories/files. Pending IDs use UUID validation, not arbitrary filenames. Disk-state targets now pass canonical registered scope checks before source access. This is a pre-access containment check, not a filesystem sandbox against same-user directory replacement.

`mutation-auth-route-audit.txt` records use of the central guard in source-mutating routes. Read-only inspection POSTs retain their read-only contract. `client-json-audit.txt` shows remaining JSON.parse calls are local storage or server manifest/state reads, not bare API response parsing.

## Report only: S4 and S5

`S4-S5-report.json/log` preserve exact strings and messages from temporary sources. Prettier 3.6.2 was installed only under scratch with a project-local cache; root dependencies were unchanged.

S4: Apply succeeded, then Prettier reformatted the file. Undo returned **“Undid temp padding edit.”** It restored the changed class while preserving formatter output. The result is not byte-identical to the pre-format source.

S5: Apply rejected the declared invalid class with **`can't verify this class: "definitely-not-a-tailwind-utility" produced no CSS`**, leaving source unchanged. A forged temporary draft with `addedTokens: []` bypassed that verification and Apply saved the invalid class. This is a remaining validation gap, reported without a fix as instructed.

## Not verified / limitations

- The three-round selection requirement, Fit geometry and Layers fallback verification remain unverified because the matrix stopped before its first case. Selection expectations were copied byte-identically; both expected-list diffs are empty.
- The intermittent imported Save response timeout is not fully explained by the successful rerun. No existing timeout or assertion was relaxed.
- Production build/deployment, production font availability and offline first-build font downloading were not tested. No new final typecheck or complete historical test suite was run.
- No exhaustive route fuzzing, hostile same-user filesystem race, import-store directory tampering, hardware/power-loss durability or parent-directory fsync test was performed.
- Existing generated adapters need regeneration for the new browser response diagnostics. Only temporary adapters were generated; real imported projects were not restarted or changed.
- Finite HMR probes do not establish that every timing is flawless. No hydration suppression was introduced.
- No environment files or credentials were inspected or changed. No real project source was edited. No merge back or push occurred.

Stop: the regression gate is incomplete and this branch is not declared launch ready.
