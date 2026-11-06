# Manifest publication candidate — not qualified

Local commit: `32c62f8` (`fix(dev): publish the build manifest atomically`). Branch security/hardening. No push, merge or gate tag.

## Evidence

The observation-only run [server log](2026-11-01T18-04-11-020Z-94a0508-selection-full-overfit/server-3000.log) records Webpack's `go$writeFile` → `doWrite` writing the same generated build-manifest.json that Next's request workers read. This run completed 30/30 overfit cases. The earlier [empty-read evidence](2026-11-01T17-56-39-365Z-94a0508-selection-full-overfit/server-3000.log) recorded a zero-byte build manifest. The instrumented writer run did not reproduce a zero-byte read between its write-start and write-end events, so the exact overlap remains inferred from these two observations, not captured in one trace.

## Every product hunk

1. `next.config.mjs`: import the new plugin; register it only in the existing development Webpack branch.
2. `lib/slightnudge/atomic-build-manifest.cjs`: create a same-directory unique temporary file, write and sync, close, rename; retry rename three times; report failure and clean up the temporary file. No direct-write fallback.
3. Same file: wrap the compiler output filesystem after environment initialization; intercept only the exact build-manifest.json at its output root. Delegate other writes unchanged.

No AST patcher, selection, source mapping, source Apply/Undo or project state changes. Preview projects do not receive this plugin; this candidate applies to the editor's development server only.

## Tests and limits

- New `test/next-manifest-publication.test.cjs` passed: readers see previous bytes before rename; replacement succeeds; three failed renames preserve existing bytes.
- [Initial test failure](manifest-test-before.log) was MODULE_NOT_FOUND, not a behavioral reproduction. It does **not** satisfy a strong failing-before regression requirement. [Passing output](manifest-test-after.log).
- The test exercises the writer, not a complete installed Webpack compilation or the hook integration. This is a material qualification gap.
- Existing tests/limits/expected results were not edited. `git diff --exit-code 94a0508 -- test ':!test/next-manifest-publication.test.cjs'` passed.

## Full gate result

[Raw output](2026-11-01T18-09-56-489Z-32c62f8/raw.log): FAIL at the first warm-up. The page remained on "Opening editor…"; `[data-source-ready="true"]` never became ready. [Screenshot](2026-11-01T18-09-56-489Z-32c62f8/warmup-m0-control-lab-full-failure.png). The recorded warm-up elapsed time was 406.12 seconds despite its configured 180-second budget; timeout enforcement/elapsed-clock behavior itself needs investigation. No limits were raised.

There were no INVALID_NEXT_MANIFEST markers in the captured editor server log for this run. That is insufficient to prove the race eliminated. The new warm-up failure has not been attributed to the candidate versus environment or an existing loading failure. All selection and domain workflows were NOT RUN.

## Status

Candidate is unqualified. Do not advance ui/unified-editor or create gate-pass-1. Part B remains blocked. Next: capture failed/unfinished script and RSC requests, console messages and DOM during this loading state, compare the parent commit under the same diagnostic setup, and prove the plugin's installed Webpack integration with a behavioral before/after test. The hydration mismatch remains unresolved.

Tracked candidate diff: three files, 80 insertions, including the new test. Diagnostics additionally change tools/gate.mjs and add tools/observe-next-manifests.mjs; these remain uncommitted. Pre-existing next-env.d.ts changes remain untouched.
