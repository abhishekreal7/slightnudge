import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const suites = [
  { name: 'test:m0', cmd: 'npx tsx test/m0-regression.test.ts' },
  { name: 'test:overfit', cmd: 'npx tsx test/m0-overfit.test.ts' },
  { name: 'test:fixtures', cmd: 'npx tsx test/fixtures.test.ts' },
  { name: 'test:step1', cmd: 'npx tsx test/step1-selection.test.ts' },
  { name: 'test:step2', cmd: 'npx tsx test/step2-nudging.test.ts' },
  { name: 'test:step3', cmd: 'npx tsx test/step3-file-git.test.ts' },
  { name: 'reorder-safety', cmd: 'npx tsx test/reorder-safety.test.ts' },
  { name: 'adapter', cmd: 'npx tsx test/adapter.test.ts' },
  { name: 'move-expectations', cmd: 'npx tsx test/move-expectations.test.ts' },
  { name: 'studio-restore', cmd: 'npx tsx test/studio-restore.test.ts' }
];

let summaryLog = '=== TASK 2: TEST INVENTORY & 3X EXECUTION RUNS ===\n\n';
summaryLog += `Timestamp: ${new Date().toISOString()}\n`;
summaryLog += `Suites to run: ${suites.length} (3 runs each = ${suites.length * 3} runs total)\n\n`;

const outDir = 'docs/phase0-evidence/task2-runs';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

for (const suite of suites) {
  summaryLog += `=======================================================\n`;
  summaryLog += `SUITE: ${suite.name} (${suite.cmd})\n`;
  summaryLog += `=======================================================\n`;

  for (let runIdx = 1; runIdx <= 3; runIdx++) {
    console.log(`Running ${suite.name} (run ${runIdx}/3)...`);
    const startTime = Date.now();
    let exitCode = 0;
    let output = '';

    try {
      output = execSync(suite.cmd, {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (err) {
      exitCode = err.status || 1;
      output = (err.stdout || '') + '\n' + (err.stderr || '') + '\n' + err.message;
    }

    const durationMs = Date.now() - startTime;
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    const fixtureStatus = execSync('git status --porcelain test/fixtures fixtures app', { encoding: 'utf8' }).trim();
    const fixturesClean = fixtureStatus === '' ? 'CLEAN (zero mutations)' : `MUTATED: ${fixtureStatus}`;

    const runFileName = `${suite.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_run${runIdx}.txt`;
    const runFilePath = path.join(outDir, runFileName);
    fs.writeFileSync(runFilePath, output, 'utf8');

    summaryLog += `Run ${runIdx}/3:\n`;
    summaryLog += `  Exit Code: ${exitCode} (${exitCode === 0 ? 'PASSED' : 'FAILED'})\n`;
    summaryLog += `  Duration: ${durationMs}ms\n`;
    summaryLog += `  Fixtures Status: ${fixturesClean}\n`;
    summaryLog += `  Git Worktree Status: ${gitStatus ? gitStatus.split('\n').join('; ') : 'CLEAN'}\n`;
    summaryLog += `  Raw Output Artifact: docs/phase0-evidence/task2-runs/${runFileName}\n\n`;

    console.log(`  -> Run ${runIdx}: Exit ${exitCode}, Duration: ${durationMs}ms, Fixtures: ${fixturesClean}`);
  }
}

fs.writeFileSync('docs/phase0-evidence/task2-test-inventory-runs.txt', summaryLog, 'utf8');
console.log('Saved summary to docs/phase0-evidence/task2-test-inventory-runs.txt');
