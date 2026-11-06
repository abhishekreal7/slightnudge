import { execSync } from 'child_process';
import fs from 'fs';

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (e) {
    return 'ERROR: ' + e.message;
  }
}

const currentBranch = run('git branch --show-current');
const branchLines = run('git for-each-ref --format="%(refname:short)" refs/heads/').split('\n').filter(Boolean);

let out = '=== TASK 1: BRANCH MAP EVIDENCE ===\n\n';
out += 'Current Branch: ' + currentBranch + '\n';
out += 'Is tools/coverage checked out?: ' + (currentBranch === 'tools/coverage' ? 'YES' : 'NO') + '\n\n';

out += '--- BRANCH INVENTORY ---\n';
for (const b of branchLines) {
  const lastCommit = run(`git log -n 1 --format="%h | %ci | %s (%an)" ${b}`);
  out += `Branch: ${b}\n  Last Commit: ${lastCommit}\n`;
}

out += '\n--- MERGE BASE & AHEAD/BEHIND COMPARISON (relative to feat/studio-full-controls) ---\n';
const baseRef = 'feat/studio-full-controls';
for (const b of branchLines) {
  if (b === baseRef) continue;
  const mb = run(`git merge-base ${baseRef} ${b}`);
  const counts = run(`git rev-list --left-right --count ${baseRef}...${b}`);
  const [aheadBase, aheadBranch] = counts.split(/\s+/);
  out += `Branch: ${b} vs ${baseRef}:\n`;
  out += `  Merge Base: ${mb}\n`;
  out += `  ${baseRef} is ahead by: ${aheadBase}, ${b} is ahead by: ${aheadBranch}\n`;
  out += `  Status: ${aheadBranch === '0' ? 'MERGED/ANCESTOR of ' + baseRef : (aheadBase === '0' ? 'DESCENDANT of ' + baseRef : 'DIVERGED')}\n\n`;
}

out += '\n--- MERGE BASE & AHEAD/BEHIND COMPARISON (relative to restore/backend-wiring) ---\n';
const restoreRef = 'restore/backend-wiring';
for (const b of branchLines) {
  if (b === restoreRef) continue;
  const mb = run(`git merge-base ${restoreRef} ${b}`);
  const counts = run(`git rev-list --left-right --count ${restoreRef}...${b}`);
  const [aheadRestore, aheadBranch] = counts.split(/\s+/);
  out += `Branch: ${b} vs ${restoreRef}:\n`;
  out += `  Merge Base: ${mb}\n`;
  out += `  ${restoreRef} is ahead by: ${aheadRestore}, ${b} is ahead by: ${aheadBranch}\n`;
  out += `  Status: ${aheadBranch === '0' ? 'MERGED/ANCESTOR of ' + restoreRef : (aheadRestore === '0' ? 'DESCENDANT of ' + restoreRef : 'DIVERGED')}\n\n`;
}

out += '\n--- UNCOMMITTED CHANGES (git status --porcelain) ---\n';
const status = run('git status --porcelain');
out += status ? status : '(clean worktree)';

fs.writeFileSync('docs/phase0-evidence/task1-branch-map.txt', out, 'utf8');
console.log('Successfully written docs/phase0-evidence/task1-branch-map.txt');
