import fs from 'fs';
import path from 'path';
import { parseCoverageStudy } from './parse-study.js';
import { sampleCommits } from './sample.js';
import { analyzePartials } from './analyze-partials.js';
import { analyzeUnsupported } from './analyze-unsupported.js';
import { analyzeRepoMix } from './repo-mix.js';

console.log('======================================================================');
console.log('           SLIGHTNUDGE COVERAGE STUDY: INDEPENDENT AUDIT              ');
console.log('======================================================================\n');

// 1. Parse study
const rows = parseCoverageStudy();
console.log(`[1] Parsed /docs/coverage-study.md: ${rows.length} total rows.`);

// 2. Fixed seed sample
const seed = 42;
const { sampled } = sampleCommits(seed, 10);
console.log(`[2] Sampled 40 commits using Mulberry32 PRNG with SEED=${seed} (10 per bucket).`);

// 3. Repo Mix
console.log('\n[3] Repository Mix Analysis:');
const repoMix = analyzeRepoMix();
console.log(`  • Overall Claimed Coverage: ${repoMix.overall.reproduced}/${repoMix.overall.total} (${repoMix.overall.rate})`);
console.log(`  • App/Template Coverage (excluding libraries): ${repoMix.appOnly.reproduced}/${repoMix.appOnly.total} (${repoMix.appOnly.rate})`);
console.log(`  • Library Repos Coverage: ${repoMix.libraryOnly.reproduced}/${repoMix.libraryOnly.total} (${repoMix.libraryOnly.rate})`);
console.log(`  • Repos with <5 commits: ${repoMix.flaggedLowCount.length} of 30 repos`);

// 4. Partials Breakdown & Wilson CI
console.log('\n[4] PARTIAL (156) Breakdown & Wilson Confidence Intervals:');
const partials = analyzePartials();
for (const [cat, count] of Object.entries(partials.counts)) {
  console.log(`  • ${cat}: ${count} (${(count / 156 * 100).toFixed(1)}%)`);
}
console.log(`  • (A) Byte-identical diff rate: ${partials.rateA.percentage} (95% CI: ${partials.rateA.intervalStr})`);
console.log(`  • (B) Token-level exact match with untouched preserved: ${partials.rateB.percentage} (95% CI: ${partials.rateB.intervalStr})`);

// 5. Unsupported Breakdown
console.log('\n[5] UNSUPPORTED (85) Classification:');
const unsupported = analyzeUnsupported();
for (const [cat, count] of Object.entries(unsupported.classification).sort((a,b) => b[1] - a[1])) {
  console.log(`  • ${cat}: ${count} (${(count / unsupported.total * 100).toFixed(1)}%)`);
}

console.log('\n======================================================================');
console.log('Audit completed successfully. All data available in tools/coverage-study/data/');
console.log('======================================================================\n');
