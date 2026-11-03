# Local build scan performance repair

The user's slow/hanging localhost report was investigated on 2026-11-03. No gate workloads were running. The long-lived root Next dev server used approximately 1.45GB working set; the machine had 2.32GB free of 15.63GB RAM. Existing Chrome processes also consumed substantial memory. No user browser tabs or unrelated processes were closed.

Warm direct HTTP checks returned homepage 200 in 289ms and /editor 200 in 94ms. A separate browser check showed homepage load about 1.54s and initial editor hydration long tasks up to 452ms; editor connection took approximately six seconds (the original measurement included another five seconds of observation). This is limited sampling, not a full performance profile.

## Proven unnecessary build workload

There were 28,057 TypeScript/TSX files under generated scratch folders. The installed Tailwind 4.3.3 oxide scanner, run with the actual project root and automatic glob, measured:

| Measurement | Before | After |
|---|---:|---:|
| Scan milliseconds | 14,249 | 629 |
| Files selected | 38,001 | 2,186 |
| Selected scratch files | 35,816 | 0 |
| Candidate strings | 21,011 | 16,771 |

This is about 22.7× faster for this scanner invocation, **not** a claim that the entire website is 22.7× faster. Generated gate checkouts and logs were needlessly included in the app's source discovery. Nothing in scratch was deleted.

## Changes and proof

- `.gitignore`: add root `/scratch/`, which the automatic Tailwind scanner respects.
- `tsconfig.json`: exclude `scratch` from TypeScript's broad TS/TSX include patterns.
- New `test/generated-source-exclusion.test.cjs`: creates a tiny disposable Git/source fixture, copies the real ignore/config rules, and uses the installed scanner and ts-morph TypeScript config reader. Before: both discover the generated file and the test fails. After: neither discovers it, actual app sources/utilities remain included, generated utility excluded. Existing tests/limits unchanged.

Raw test evidence: `generated-source-exclusion-before.log`, `generated-source-exclusion-after.log`. The first test-authoring attempt used the native TypeScript 7 package's unavailable config API; the final regression uses the same ts-morph TypeScript API already used by the editor. The failing before log records the genuine exclusion assertion after that setup correction.

Only the verified root project's Next process tree was restarted, retaining `.next` caches and project state. This also loads the previously committed manifest plugin fix. The server remains available at http://127.0.0.1:3000. No environment files or secrets were inspected.

## Browser verification after restart

`generated-source-exclusion-browser.json`: cold homepage DOM-ready 5155ms; editor DOM-ready 486ms / source-ready 2848ms; repeated editor DOM-ready 79ms / source-ready 2646ms. All three navigations reported zero page errors. Cold and warm timings differ and are not a controlled benchmark. Restart plus build exclusions changed together, so the exact whole-page improvement cannot be attributed entirely to the scanner exclusion.

## Limits

The machine still has limited free RAM (about 2GB in a later observation); no hardware diagnosis or unrelated browser cleanup was performed. Four initial editor long tasks and the prior post-Save reload issue are not proven resolved. No source Save/Undo, full gate, production build, 500-element drag-performance or customer-project compatibility test was run for this focused build configuration change. The generated folders are excluded from the root application build only; independently opened projects still use their own build configuration. Existing uncommitted editor visual changes and next-env.d.ts remain preserved.
