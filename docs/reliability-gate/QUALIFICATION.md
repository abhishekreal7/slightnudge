# Qualification follow-up

Local only. Existing tests/limits/expectations unchanged. Product commit `4653819`, harness evidence commit `754fd00`; no push, merge, tag or Part B.

## Results

- [Parent run](2026-11-01T18-25-02-696Z-94a0508-selection-full-overfit/raw.log): all warm-ups passed, overfit failed before case 1 with Next manifest parse error. Diagnostics identify zero-byte react-loadable-manifest.json.
- [Candidate comparison](2026-11-01T18-29-49-129Z-32c62f8-selection-full-overfit/raw.log): all warm-ups and 30 overfit cases passed; server still read empty react-loadable-manifest.json. Thus not a clean pass.
- [Full gate at 754fd00](2026-11-01T18-34-38-472Z-754fd00/raw.log): 90 selection cases passed; Fit overfit failed before case 1. Shared/domain workflows not run.
- New installed-Webpack behavioral test: [before](webpack-before.log) fails `Reader saw incomplete manifest: [""]`; [after](webpack-after.log) passes. Identical assertions, same compiler, baseline flag omits plugin. Native truncate/write window deliberately widened; this is fault injection, not a natural timing reproduction.
- Separate new loadable-manifest test: [before extension](loadable-before.log) fails same assertion, [after](loadable-after.log) passes. `4653819` adds only react-loadable-manifest.json to the publication target set, plus that new test.
- [Full gate at 4653819](2026-11-01T18-43-25-888Z-4653819/raw.log): all four warm-ups and all 120 selection cases completed. Server diagnostics captured five empty reads of `.next/dev/server/next-font-manifest.json`. Run manually aborted after selection, during shared workflow startup, because server was not clean. Its results.json is partial, not a gate PASS. Shared/domain workflows remain unverified. Owned gate process tree was stopped.

## Scope and limitations

Product hunks since 94a0508: development-only plugin import/registration in next.config.mjs; new atomic manifest writer (temporary file, sync, rename with three attempts, refusal with no direct fallback); exact output-root build-manifest.json and react-loadable-manifest.json interception. AST, mapping, selection, project Apply/Undo untouched.

Diagnostics additionally record network requests/responses/failures, console, DOM at warm-up failure, filesystem manifest reads/writes, and now refuse invalid manifest reads after warm-up or a workflow. That final gate check is syntax-checked, not browser-qualified yet. Its purpose is to prevent successful selection cases from masking server failures.

Loading stall did not recur in the parent/candidate comparisons. Its cause remains unknown. The earlier 406-second warm-up overrun remains unresolved; limits were not raised. Existing tests were checked byte-diff clean except newly added files. Candidate remains unqualified because next-font-manifest publication is unprotected. Further work needs a new failing test and writer evidence for that path before extending the workaround. Hydration mismatch has not been separately reproduced or resolved.

See [tracked diff stat](qualification-diff-stat.txt) and [git status](qualification-status.txt). The pre-existing next-env.d.ts modification remains untouched.
