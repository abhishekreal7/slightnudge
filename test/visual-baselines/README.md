# Editor overlay baselines

Eighteen 720 by 440 CSS-pixel canvas crops cover nine states on each real editor surface. The viewport is 1440 by 1000 with device scale 1, reduced motion and local Arial. External browser resources are blocked. Each state is asserted before capture.

The installed Playwright 1.64.0 pixelmatch comparator uses threshold 0.15 and permits at most 0.2% differing pixels. Independent geometry assertions enforce exact line thickness, parent width, toolbar placement and gesture cleanup. The Applying and Error images cover the canvas portion of those states. Draft progress and error messages elsewhere in the interface are outside this crop.

Ordinary runs compare images and never update them. Generate candidates deliberately, with protected-state snapshots around the group.

```powershell
node --import tsx scratch/editor-sprint1-run-group.ts overlay-baseline-review node --import tsx test/regenerate-overlay-baselines.ts --update
```

Use a fresh group label for each run. Inspect the eighteen PNGs in `docs/editor/evidence/overlay-baseline-candidates/`. Install reviewed images outside the test run, then run the comparison suite with a new group label.

```powershell
Get-ChildItem -LiteralPath docs/editor/evidence/overlay-baseline-candidates -Filter '*.png' -File | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path 'test/visual-baselines' $_.Name)
}
node --import tsx scratch/editor-sprint1-run-group.ts overlay-baseline-compare node --import tsx --test test/overlay-contract.test.ts
```

The group runner is the existing sprint workspace script recorded in STATE.md. The server helper copies tracked source into a temporary workspace, omits environment files and chooses a free port outside 3000–3002. Review, baseline installation and the next test group are separate operations.
