import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createArchiveCopy, computeBaselineHashes, assertBaselineUnchanged, REPO_ROOT } from './helpers.js';

export const MUTANTS = [
  {
    id: 'M1',
    name: 'accept the first of several matching elements',
    targetFile: 'lib/slightnudge/edit-history.ts',
    transform: (src) => src.replace(
      /if\s*\(\s*candidates\.length\s*>\s*1\s*\)\s*\{[\s\S]*?return refuseWithInstructions\(`multiple matching elements found where uniqueness cannot be established`\);[\s\S]*?\}/,
      '/* M1 mutant: skip ambiguity check */'
    ),
    isSafetyRelevant: true,
  },
  {
    id: 'M2',
    name: 'skip the "contains every added token" check',
    targetFile: 'lib/slightnudge/edit-history.ts',
    transform: (src) => src.replace(
      'const hasAllAdded = addedTokens.every(t => currentTokens.includes(t));',
      'const hasAllAdded = true; /* M2 mutant */'
    ),
    isSafetyRelevant: true,
  },
  {
    id: 'M3',
    name: 'skip the "none of the removed tokens present" check',
    targetFile: 'lib/slightnudge/edit-history.ts',
    transform: (src) => src.replace(
      'const hasNoRemoved = removedTokens.every(t => !currentTokens.includes(t));',
      'const hasNoRemoved = true; /* M3 mutant */'
    ),
    isSafetyRelevant: true,
  },
  {
    id: 'M4',
    name: 'drop the loop/conditional refusal',
    targetFile: 'lib/slightnudge/edit-history.ts',
    transform: (src) => src
      .replace(/if\s*\(isElementInsideLoop\(targetEl\)\)\s*\{[\s\S]*?\}/, '/* M4 loop dropped */')
      .replace(/if\s*\(Node\.isConditionalExpression\(ancestor\)[\s\S]*?\}/, '/* M4 conditional dropped */')
      .replace(/if\s*\(Node\.isIfStatement\(ancestor\)\)\s*\{[\s\S]*?\}/, '/* M4 if dropped */'),
    isSafetyRelevant: true,
  },
  {
    id: 'M5',
    name: 'drop the containment check right before the undo write (and the call to assertWriteTargetInsideWorkspace in undoSourceEdit)',
    targetFile: 'lib/slightnudge/edit-history.ts',
    transform: (src) => src
      .replace(/assertWriteTargetInsideWorkspace\(absolutePath\);\s*atomicWrite\(absolutePath,\s*record\.before\);/, 'atomicWrite(absolutePath, record.before);')
      .replace(/assertWriteTargetInsideWorkspace\(absolutePath\);\s*\n\s*\/\/ Write through atomic write path\s*\n\s*records\[index\] = \{ \.\.\.record, status: 'undoing' \};\s*\n\s*writeHistory\(records\);\s*\n\s*try \{\s*\n\s*atomicWrite\(absolutePath, newContent\);/, "records[index] = { ...record, status: 'undoing' };\n    writeHistory(records);\n    try {\n      atomicWrite(absolutePath, newContent);"),
    isSafetyRelevant: true,
  },
  {
    id: 'M6',
    name: 'skip the post-edit parse check and token-multiset post-condition',
    targetFile: 'lib/slightnudge/edit-history.ts',
    transform: (src) => src
      .replace(/const parseCheck = verifySyntacticParse\(absolutePath, newContent\);[\s\S]*?if \(!parseCheck\.valid\) \{[\s\S]*?\}/, '/* M6 parse check dropped */')
      .replace(/if \(beforeSlice !== newBeforeSlice \|\| afterSlice !== newAfterSlice\) \{[\s\S]*?\}/, '/* M6 scope check dropped */')
      .replace(/if \(expectedTokens\.length !== actualTokens\.length \|\| !expectedTokens\.every\(\(t, i\) => t === actualTokens\[i\]\)\) \{[\s\S]*?\}/, '/* M6 multiset check dropped */'),
    isSafetyRelevant: true,
  },
  {
    id: 'M7',
    name: 'undo an older edit while a newer one is stacked',
    targetFile: 'lib/slightnudge/edit-history.ts',
    transform: (src) => src.replace(
      /for\s*\(let i = index \+ 1; i < records\.length; i\+\+\)\s*\{[\s\S]*?if \(sameElement\) \{[\s\S]*?\}[\s\S]*?\}/,
      '/* M7 stacked check dropped */'
    ),
    isSafetyRelevant: true,
  },
  {
    id: 'M8',
    name: 'restore the unguarded argv bypass in lib/slightnudge/auth.ts',
    targetFile: 'lib/slightnudge/auth.ts',
    transform: (src) => src.replace(
      /if \(process\.env\.SLIGHTNUDGE_TEST === '1' && process\.env\.NODE_ENV !== 'production' && process\.argv\.some\(arg => arg\.includes\('reorder-safety'\)\)\) \{[\s\S]*?return \{ valid: true \};[\s\S]*?\}/,
      "if (process.argv.some(arg => arg.includes('reorder-safety'))) {\n    return { valid: true };\n  }"
    ),
    isSafetyRelevant: true,
  },
  {
    id: 'M9',
    name: 'plain === instead of timingSafeEqual (informational)',
    targetFile: 'lib/slightnudge/auth.ts',
    transform: (src) => src.replace(
      /return crypto\.timingSafeEqual\(bufA, bufB\);/,
      'return a === b; /* M9 plain === */'
    ),
    isSafetyRelevant: false,
  },
  {
    id: 'M10',
    name: 'accept any non-empty token',
    targetFile: 'lib/slightnudge/auth.ts',
    transform: (src) => src.replace(
      /if \(!timingSafeEqualStrings\(token, expectedToken\)\) \{/,
      'if (!token || token.trim() === "") { /* M10 non-empty token */'
    ),
    isSafetyRelevant: true,
  },
  {
    id: 'M11',
    name: 'drop the isRequestHostAllowed check in app/layout.tsx',
    targetFile: 'app/layout.tsx',
    transform: (src) => src.replace(
      'const allowToken = isRequestHostAllowed(headerList);',
      'const allowToken = true; /* M11 dropped */'
    ),
    isSafetyRelevant: true,
  },
  {
    id: 'M12',
    name: 'drop the X-Forwarded-Host/Forwarded check inside isRequestHostAllowed',
    targetFile: 'lib/slightnudge/auth.ts',
    transform: (src) => src.replace(
      /const xForwardedHost = headers\.get\('x-forwarded-host'\);[\s\S]*?return true;/,
      'return true; /* M12 dropped forwarded checks */'
    ),
    isSafetyRelevant: true,
  },
  {
    id: 'M13',
    name: 'drop the pre-write hook guard (make the hook active without SLIGHTNUDGE_TEST)',
    targetFile: 'lib/slightnudge/edit-history.ts',
    transform: (src) => src
      .replace(
        /export function setPreWriteTestHook\(hook: \(\(filePath: string\) => void\) \| null\): void \{[\s\S]*?preWriteTestHook = hook;\s*\n\s*\}/,
        'export function setPreWriteTestHook(hook: ((filePath: string) => void) | null): void {\n  preWriteTestHook = hook;\n}'
      )
      .replace(
        /export function invokePreWriteHook\(filePath: string\): void \{[\s\S]*?preWriteTestHook\(filePath\);\s*\n\s*\}/,
        'export function invokePreWriteHook(filePath: string): void {\n  if (preWriteTestHook) preWriteTestHook(filePath);\n}'
      ),
    isSafetyRelevant: true,
  },
];

export async function runMutantBattery() {
  const patchDir = 'C:\\dev\\vibecheck-review-tools\\mutants';
  const evidencePatchDir = path.resolve(REPO_ROOT, 'docs/phase2c1c-evidence/mutants');
  fs.mkdirSync(patchDir, { recursive: true });
  fs.mkdirSync(evidencePatchDir, { recursive: true });

  const testList = [
    'test/token-undo.test.ts',
    'test/undo-refusals.test.ts',
    'test/m5-containment-helper.test.ts',
    'test/prewrite-hook-guard.test.ts',
    'test/s1-auth-bypass.test.ts',
    'test/s1-auth-origin.test.ts',
    'test/token-html-host.test.ts',
    'test/test-override-guard.test.ts',
    'test/history-resilience.test.ts',
  ];

  const results = [];
  const baselineBefore = computeBaselineHashes();

  console.log(`Starting execution of ${MUTANTS.length} mutants against branch tip...\n`);

  for (const m of MUTANTS) {
    console.log(`--- [${m.id}] ${m.name} ---`);
    const copy = createArchiveCopy('HEAD', `mutant-${m.id.toLowerCase()}`);

    try {
      const targetPath = path.join(copy.dir, m.targetFile);
      const originalCode = fs.readFileSync(targetPath, 'utf8');
      const mutatedCode = m.transform(originalCode);

      if (originalCode === mutatedCode) {
        throw new Error(`Mutant transform for ${m.id} made NO changes to ${m.targetFile}`);
      }

      // Write mutated code in copy
      fs.writeFileSync(targetPath, mutatedCode, 'utf8');

      // Create and save .patch file
      let diff = '';
      try {
        diff = execSync(`git diff -u "${m.targetFile}"`, { cwd: copy.dir, encoding: 'utf8' });
      } catch (err) {
        diff = err.stdout || '';
      }
      const patchPath = path.join(patchDir, `${m.id}.patch`);
      const evPatchPath = path.join(evidencePatchDir, `${m.id}.patch`);
      fs.writeFileSync(patchPath, diff, 'utf8');
      fs.writeFileSync(evPatchPath, diff, 'utf8');

      let killed = false;
      let killingTest = null;
      let failureReason = null;

      // Run unit test battery
      for (const t of testList) {
        try {
          execSync(`npx tsx "${t}"`, {
            cwd: copy.dir,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 60000,
          });
        } catch (err) {
          killed = true;
          killingTest = t;
          failureReason = ((err.stdout || '') + '\n' + (err.stderr || '')).trim().slice(0, 500);
          break;
        }
      }

      const status = killed ? 'KILLED' : 'SURVIVED';
      console.log(`Result for ${m.id}: ${status}${killed ? ` (Killed by ${killingTest})` : ''}\n`);

      results.push({
        id: m.id,
        name: m.name,
        targetFile: m.targetFile,
        status,
        killedBy: killingTest,
        reason: failureReason,
        isSafetyRelevant: m.isSafetyRelevant,
        patchFile: `docs/phase2c1c-evidence/mutants/${m.id}.patch`,
      });
    } finally {
      copy.cleanup();
      assertBaselineUnchanged(baselineBefore, `mutant ${m.id}`);
    }
  }

  const outPath = path.resolve(REPO_ROOT, 'docs/phase2c1c-evidence/step3-mutants-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log('All mutants finished. Results written to', outPath);
  return results;
}

if (process.argv[1] && process.argv[1].endsWith('mutants.js')) {
  runMutantBattery().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
