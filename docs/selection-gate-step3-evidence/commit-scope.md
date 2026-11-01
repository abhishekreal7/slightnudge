# Authorized local commit scope

Commit message: `test: selection gate harness` on `ui/unified-editor`.

Included: only new `selection-gate-v3*` helper/runner/diagnostic/report/finalizer/supplement files, new M0 `iframe-v3` copies, the new Step 1 `iframe-v3` replacement, and this step's `docs/selection-gate-step3-evidence/` directory. Raw logs and screenshots in this directory are intentionally included as requested evidence, including failed attempts. The supplement is unexecuted scaffolding, not a passing run.

Excluded: every pre-existing test and product file; `next-env.d.ts`; old step-1/2 evidence/harnesses; unrelated docs, screenshots and logs; scratch/temp files; `.slightnudge` state; `.env` files and secrets. No merge or push.

`protected-integrity.json` verifies 397 protected files. `staged-files.txt` lists the exact included paths; `staged-diff-stat.txt` is the staged diff summary before the commit. These are new files only. Final branch/status verification is reported with the commit result.
