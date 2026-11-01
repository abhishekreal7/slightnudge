# Local commit scope

`54b8f42` contains the Layers display-filter fix, its new browser test and source-based before/after evidence.

The second commit, `fix(editor): prevent toolbar from covering selected content`, contains only the dock hook/CSS fix, new investigation and qualification tools/tests, and this investigation's evidence directory. It includes the requested raw logs, failed exploratory attempts, screenshots, process/memory snapshots, original-expectation proofs, full product diff and three final matrix rounds.

Excluded: existing tests/harnesses, limits/expectations, all server libraries and AST/source-selection code, apply/Undo code, main `.slightnudge` state, environment files/secrets, pre-existing `next-env.d.ts`, unrelated documents/logs/screenshots and scratch files. No merge or push. Lab server processes are stopped after tests; the isolated workspace is retained for inspection.

`staged-files.txt` lists the second commit's exact staged paths. `staged-diff-stat.txt` records its staged summary before final metadata is added. The compact product-only summary is `product-diff-stat.txt`; every product hunk is in `product-diff.patch`.
