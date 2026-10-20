# SlightNudge Coverage Study: Independent Audit Suite

This directory contains the independent, reproducible audit of [`docs/coverage-study.md`](../../docs/coverage-study.md).

## 1. Overview & Purpose

The original study claimed a 9.23% (30/325) "byte-for-byte" reproduction rate and argued that adding a "canonical-token-normalizer" would elevate coverage to 57.2% (+48.0%).

This independent audit re-checks these claims skeptically by:
1. Deterministically sampling 40 commits across all 4 verdict buckets using a fixed seed.
2. Re-fetching raw commit diffs directly from upstream GitHub repositories.
3. Auditing whether commits are truly UI-only (modifying only `className` strings or static JSX text).
4. Running the pre-commit code against SlightNudge AST engine functions (`updateStaticTailwindClass`, `updateStaticJsxText`).
5. Auditing all 156 `PARTIAL` commits and 85 `UNSUPPORTED` commits.
6. Evaluating the repository mix across 30 repositories and recalculating coverage.

---

## 2. Deterministic Sampling & Seed

- **Seed**: `42` (saved in [`seed.txt`](./seed.txt))
- **PRNG Algorithm**: Mulberry32 (32-bit state generator)
- **Sample Distribution**: 40 commits total — exactly 10 per bucket:
  - `REPRODUCED`: 10 commits
  - `PARTIAL`: 10 commits
  - `REFUSED`: 10 commits
  - `UNSUPPORTED`: 10 commits

---

## 3. Directory Structure

```text
tools/coverage-study/
├── README.md                           # This documentation
├── seed.txt                            # Seed specification (Seed=42)
├── parse-study.js                      # Parser for Section 7 per-commit markdown table
├── sample.js                           # PRNG Mulberry32 deterministic sampler
├── fetch-diffs.js                      # Diff fetcher with local caching
├── evaluate-engine.ts                  # AST engine tester & UI-only auditor
├── repo-mix.js                         # Repository classification & coverage recalculation
├── analyze-partials.js                 # PARTIAL classification & Wilson CI calculator
├── analyze-unsupported.js              # 85 UNSUPPORTED commits full classifier
├── run-audit.js                        # Master orchestrator script
└── data/
    ├── parsed-study.json               # All 325 parsed commit records
    ├── sampled-40.json                 # The 40 deterministically selected commits
    ├── audit-results-detailed.json     # Detailed audit results & evidence for 40 commits
    ├── repo-stats.json                 # Repository breakdown & counts
    ├── partial-breakdown.json          # 156 PARTIAL breakdown and Wilson CIs
    └── unsupported-classification.json # 85 UNSUPPORTED breakdown
```

---

## 4. How to Reproduce

Run the master audit script:

```bash
node tools/coverage-study/run-audit.js
```

To run individual modules:

```bash
# Check repository mix & under-sampled repos
node tools/coverage-study/repo-mix.js

# Check PARTIAL breakdown & Wilson confidence intervals
node tools/coverage-study/analyze-partials.js

# Check UNSUPPORTED classification
node tools/coverage-study/analyze-unsupported.js

# Run AST engine evaluation across the 40 commits
npx tsx tools/coverage-study/evaluate-engine.ts
```

---

## 5. Summary of Audit Findings

### A. 40 Sampled Commits Agreement Rate: 30.0% (12 / 40)
- **Truly UI-Only**: Only 25 of 40 (62.5%) are strictly UI-only commits. 15 of 40 (37.5%) touched non-JSX files (`package.json`, `yarn.lock`, `middleware.ts`, `global.css`, `funcs.ts`, `.env.example`, `.github/`).
- **Agreement by Bucket**:
  - `REPRODUCED`: 5 / 10 agreed (50.0%) — Commit #157 touched 7 files (including `package.json`), #110 touched `yarn.lock` (421KB), #29 wrapped text in a newly inserted `<span>`, #254 changed 3 classes across breakpoints.
  - `PARTIAL`: 0 / 10 agreed (0.0%) — Almost all were non-UI commits or element insertions.
  - `REFUSED`: 3 / 10 agreed (30.0%) — 7 touched non-JSX files or build configs rather than genuine AST refusals.
  - `UNSUPPORTED`: 4 / 10 agreed (40.0%) — 6 were non-UI commits (`next.config.js`, `global.css`, `funcs.ts`, `package.json`).

### B. Repository Mix
- 11 of 30 repos (36.7%) had fewer than 5 sampled commits.
- 5 repos had 0 commits in the sample (`covid-vacuna`, `tailwindcss-com`, `tremor-raw`, `tailwind-heropatterns`, `formik`).
- Excluding libraries/tooling repos (82 commits across 12 repos):
  - App/Template total: 243 commits.
  - App/Template strict reproductions: 29 / 243 = **11.93%**.

### C. PARTIAL Breakdown (156 Commits)
- `other-non-ui`: 109 (69.9%)
- `formatting-only`: 24 (15.4%)
- `multiple-tokens-changed`: 20 (12.8%)
- `order-only`: **3 (1.9%)**
- **Confidence Intervals (Wilson 95%)**:
  - (A) Byte-identical diff rate (claimed 30 / 325): **9.23%** (95% CI: `[6.54%, 12.87%]`).
  - (B) Token-level exact match with untouched preserved (33 / 325): **10.15%** (95% CI: `[7.32%, 13.92%]`).
  - **Debunking**: The normalizer would NOT boost coverage to 57.2%. Order-only differences represent only 3 commits (+0.92%).

### D. UNSUPPORTED Breakdown (85 Commits)
- Non-UI commits: 62 of 85 (72.9%)
- Missing Tailwind variants: 12 (14.1%) (`dark:hover:`, `supports-backdrop-blur:`, `disabled:`, `group:hover:`, `data-closed:`, `xs:`)
- Element insertions / JSX structure: 10 (11.8%)
- Component extraction: 1 (1.2%)

### E. Canonical Token Normalizer Verdict
- **Rule Violation**: Violates the core engine invariant: *"an edit changes only the targeted token and leaves every other token's order untouched."*
- **Recommendation**: Do NOT build a full class re-sorter. Instead build:
  1. In-place token replacement that preserves existing class list order.
  2. Atomic multi-token replacements.
  3. Expanded variant whitelist (`dark:hover:`, `group-hover:`, `peer-focus:`).
