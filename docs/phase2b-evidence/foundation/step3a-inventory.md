# Test Hygiene Inventory (Step 3a)

| Test File | Writes to Real .slightnudge/ or fixtures/ or Tracked Files | Hardcoded Port | Needs Server |
|-----------|------------------------------------------------------------|----------------|--------------|
| `test/adapter.test.ts` | No | No | No |
| `test/analytics-funnel.test.ts` | No | No | No |
| `test/drag-diagnosis.test.ts` | No | Yes (3000, line 32) | Yes |
| `test/drag-resize-move.test.ts` | Yes (`fixtures/1-plain-static.tsx` lines 9, 132; `.slightnudge/history/edits.json` line 111) | Yes (3000, line 18) | Yes |
| `test/fixtures.test.ts` | Yes (`fixtures/1-plain-static.tsx` lines 33, 42) | No | No |
| `test/history-resilience.test.ts` | No (isolated in temp workspace) | No | No |
| `test/in-situ-focus.test.ts` | Yes (`.slightnudge/repositories/abhishekreal7-keymail` lines 59, 64) | No (mock Request uses 3000/3001) | No |
| `test/inspect-rects.ts` | No | Yes (3000, line 6) | Yes |
| `test/m0-overfit.test.ts` | No | Yes (3002, line 240) | Yes |
| `test/m0-regression.test.ts` | No | Yes (3001, line 240) | Yes |
| `test/move-expectations.test.ts` | Yes (`fixtures/1-plain-static.tsx` line 48) | Yes (3000, line 131) | Yes |
| `test/payments.test.ts` | No | No | No |
| `test/pipeline-integration.test.ts` | No | No | No |
| `test/reorder-safety.test.ts` | No (uses scratch-test-fixtures) | No (mock Request uses 3000) | No |
| `test/repro-glitch.ts` | No | Yes (3000, line 6) | Yes |
| `test/s1-auth-origin.test.ts` | No (reads `edits.json` line 168) | Yes (3000, lines 9, 33) | Yes |
| `test/s2-path-traversal.test.ts` | Yes (`.slightnudge/pending/` lines 34, 96) | No | No |
| `test/s3-atomic-write.test.ts` | Yes (`.slightnudge/pending/` line 19; `.slightnudge/history/edits.json` lines 87, 105) | No | No |
| `test/s5-tailwind-compile.test.ts` | Yes (`.slightnudge/pending/` line 20; `.slightnudge/history/edits.json` lines 64, 76) | No | No |
| `test/s5-theme-support.test.ts` | Yes (`.slightnudge/pending/` line 224; `.slightnudge/history/edits.json` lines 234, 247) | No | No |
| `test/security-hardening.test.ts` | No | No | No |
| `test/step1-selection.test.ts` | No | Yes (3000, lines 31, 67, 92, 118, 144) | Yes |
| `test/step2-nudging.test.ts` | No | Yes (3000, lines 75, 99, 120, 135, 148) | Yes |
| `test/step3-file-git.test.ts` | Yes (`fixtures/1-plain-static.tsx` line 58; git commits line 67; `.slightnudge/history/edits.json` lines 41, 81) | Yes (3000, lines 41, 81, 107, 124, 147) | Yes |
| `test/studio-benchmark.test.ts` | Yes (`fixtures/1-plain-static.tsx` lines 17, 363; `.slightnudge/history/edits.json`) | Yes (3000, line 66) | Yes |
| `test/studio-restore.test.ts` | Yes (`fixtures/1-plain-static.tsx` lines 9, 138; `.slightnudge/history/edits.json`) | Yes (3000, line 18) | Yes |
| `test/take-screenshot.ts` | No | Yes (3000, line 6) | Yes |
| `test/test-full-flow.ts` | No | Yes (3000, line 6) | Yes |
| `test/unit.test.ts` | No | No | No |
| `test/verify-fix.ts` | No | Yes (3000, line 6) | Yes |
| `test/verify-live-move.ts` | No | Yes (3000, line 12) | Yes |

## Package.json Scripts Inventory

| Script | Command | Writes to Real Files | Port | Needs Server |
|--------|---------|----------------------|------|--------------|
| `dev` | `next dev --webpack -H 127.0.0.1` | No | 3000 (default) | Is the server |
| `build` | `next build --webpack` | Writes to `.next/` | None | No |
| `start` | `next start` | No | 3000 (default) | Is the server |
| `worker` | `tsx worker/index.ts` | No | None | No |
| `test` | `tsx test/unit.test.ts && tsx test/payments.test.ts && tsx test/security-hardening.test.ts && tsx test/analytics-funnel.test.ts` | No | None | No |
| `test:payments` | `tsx test/payments.test.ts` | No | None | No |
| `test:security` | `tsx test/security-hardening.test.ts` | No | None | No |
| `test:integration` | `tsx test/pipeline-integration.test.ts` | No | None | No |
| `test:fixtures` | `tsx test/fixtures.test.ts` | Yes (`fixtures/1-plain-static.tsx`) | None | No |
| `test:step1` | `tsx test/step1-selection.test.ts` | No | 3000 | Yes |
| `test:step2` | `tsx test/step2-nudging.test.ts` | No | 3000 | Yes |
| `test:step3` | `tsx test/step3-file-git.test.ts` | Yes (`fixtures/`, git, history) | 3000 | Yes |
| `test:m0` | `tsx test/m0-regression.test.ts` | No | 3001 | Yes (external repo) |
| `test:overfit` | `tsx test/m0-overfit.test.ts` | No | 3002 | Yes (external repo) |
| `spike` | `tsx spikes/phase1-spike.ts` | No | None | No |
