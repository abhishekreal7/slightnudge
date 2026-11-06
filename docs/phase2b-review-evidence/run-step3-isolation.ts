import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const BASELINE_HASH = '29e3ff2cf25549fb7ed6165749ad5175934865ba6266ccf266dfe00cc8197b52';
const EDITS_PATH = path.join(process.cwd(), '.slightnudge', 'history', 'edits.json');
const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'phase2b-review-evidence');

function getEditsHash(): string {
  if (!fs.existsSync(EDITS_PATH)) return 'FILE_NOT_FOUND';
  const buf = fs.readFileSync(EDITS_PATH);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function getSlightnudgeListing(): string {
  const targets = [
    path.join(process.cwd(), '.slightnudge'),
    path.join(process.cwd(), '.slightnudge', 'history'),
    path.join(process.cwd(), '.slightnudge', 'pending'),
  ];
  const lines: string[] = [];
  for (const dir of targets) {
    if (!fs.existsSync(dir)) {
      lines.push(`${dir}: NOT_FOUND`);
      continue;
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      try {
        const st = fs.statSync(full);
        lines.push(`${path.relative(process.cwd(), full)} | size=${st.size} | mtime=${st.mtime.toISOString()}`);
      } catch (err: any) {
        lines.push(`${path.relative(process.cwd(), full)} | error=${err.message}`);
      }
    }
  }
  return lines.sort().join('\n');
}

function getGitStatus(): string {
  return execSync('git status --porcelain', { encoding: 'utf8' }).trim();
}

const suites = [
  { name: 'reorder-safety', cmd: 'npx tsx test/reorder-safety.test.ts' },
  { name: 'adapter', cmd: 'npx tsx test/adapter.test.ts' },
  { name: 'history-resilience', cmd: 'npx tsx test/history-resilience.test.ts' },
  { name: 's1-auth-origin', cmd: 'npx tsx test/s1-auth-origin.test.ts' },
  { name: 's2-path-traversal', cmd: 'npx tsx test/s2-path-traversal.test.ts' },
  { name: 's3-atomic-write', cmd: 'npx tsx test/s3-atomic-write.test.ts' },
  { name: 's5-tailwind-compile', cmd: 'npx tsx test/s5-tailwind-compile.test.ts' },
  { name: 's5-theme-support', cmd: 'npx tsx test/s5-theme-support.test.ts' },
  { name: 's5-v3-support', cmd: 'npx tsx test/s5-v3-support.test.ts' },
  { name: 'fixtures', cmd: 'npx tsx test/fixtures.test.ts' },
];

console.log('========================================================================');
console.log('STEP 3: ISOLATION PROOF AND REGRESSION EXECUTION');
console.log('========================================================================\n');

const initialHash = getEditsHash();
const initialListing = getSlightnudgeListing();
const initialGit = getGitStatus();

console.log(`Initial edits.json SHA-256: ${initialHash}`);
console.log(`Initial Hash Matches Baseline: ${initialHash.toLowerCase() === BASELINE_HASH.toLowerCase()}`);
console.log(`Initial .slightnudge listing:\n${initialListing}\n`);

const results: any[] = [];
let fullLog = '';

for (const suite of suites) {
  console.log(`------------------------------------------------------------------------`);
  console.log(`>>> Running Suite: ${suite.name}`);
  console.log(`    Command: ${suite.cmd}`);

  const beforeHash = getEditsHash();
  const beforeListing = getSlightnudgeListing();
  const beforeGit = getGitStatus();

  const start = Date.now();
  const proc = spawnSync(suite.cmd, { shell: true, encoding: 'utf8' });
  const duration = ((Date.now() - start) / 1000).toFixed(2);

  const afterHash = getEditsHash();
  const afterListing = getSlightnudgeListing();
  const afterGit = getGitStatus();

  const exitCode = proc.status;
  const hashUnchanged = beforeHash === afterHash && afterHash.toLowerCase() === BASELINE_HASH.toLowerCase();
  const listingUnchanged = beforeListing === afterListing;
  const gitUnchanged = beforeGit === afterGit;

  console.log(`    Exit Code:       ${exitCode} (${exitCode === 0 ? 'PASS' : 'FAIL'}) in ${duration}s`);
  console.log(`    Hash Unchanged:  ${hashUnchanged} (${afterHash})`);
  console.log(`    Listing Same:    ${listingUnchanged}`);
  console.log(`    Git Unchanged:   ${gitUnchanged}`);

  results.push({
    suite: suite.name,
    exitCode,
    duration: `${duration}s`,
    hashUnchanged,
    listingUnchanged,
    gitUnchanged,
    afterHash,
  });

  fullLog += `\n========================================================================\n`;
  fullLog += `SUITE: ${suite.name} (exit ${exitCode} in ${duration}s)\n`;
  fullLog += `COMMAND: ${suite.cmd}\n`;
  fullLog += `HASH BEFORE: ${beforeHash}\n`;
  fullLog += `HASH AFTER:  ${afterHash} (Matches baseline: ${hashUnchanged})\n`;
  fullLog += `LISTING MATCH: ${listingUnchanged}\n`;
  fullLog += `GIT STATUS MATCH: ${gitUnchanged}\n`;
  fullLog += `--- STDOUT ---\n${proc.stdout || ''}\n`;
  fullLog += `--- STDERR ---\n${proc.stderr || ''}\n`;
}

// Write the full raw output log
fs.writeFileSync(path.join(EVIDENCE_DIR, 'step3-isolation-raw.txt'), fullLog, 'utf8');

console.log('\n========================================================================');
console.log('STEP 3 SUMMARY TABLE');
console.log('========================================================================');
console.table(results);
