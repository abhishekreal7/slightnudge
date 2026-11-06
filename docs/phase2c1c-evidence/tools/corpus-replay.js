import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';
import * as babelParser from '@babel/parser';
import prettier from 'prettier';
import { computeBaselineHashes, assertBaselineUnchanged, REPO_ROOT } from './helpers.js';

function parseTSX(code) {
  try {
    return babelParser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  } catch {
    return null;
  }
}

function findEligibleElements(code) {
  const ast = parseTSX(code);
  if (!ast) return [];
  const elements = [];

  function traverse(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXOpeningElement' || node.type === 'JSXSelfClosingElement') {
      const classAttr = node.attributes.find(
        (a) => a.type === 'JSXAttribute' && a.name.name === 'className' && a.value?.type === 'StringLiteral'
      );
      if (classAttr && classAttr.value.value.trim().length > 0) {
        elements.push({
          tagName: node.name.name,
          className: classAttr.value.value,
          start: node.start,
          end: node.end,
          line: node.loc?.start?.line || 1,
        });
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(traverse);
      } else if (child && typeof child === 'object') {
        traverse(child);
      }
    }
  }

  traverse(ast);
  return elements;
}

export async function runCorpusReplay(targetTotal = 210) {
  const baselineBefore = computeBaselineHashes();
  console.log(`Starting Corpus Replay: target ${targetTotal} elements across 3 repos...\n`);

  // Dynamically import project modules via pathToFileURL
  const { undoSourceEdit } = await import(
    pathToFileURL(path.resolve(REPO_ROOT, 'lib/slightnudge/edit-history.ts')).href
  );
  const { setupIsolatedEnv } = await import(
    pathToFileURL(path.resolve(REPO_ROOT, 'test/helpers/test-server.ts')).href
  );

  const repos = [
    { name: 'taxonomy', url: 'https://github.com/shadcn-ui/taxonomy.git', quota: 108 },
    { name: 'precedent', url: 'https://github.com/steven-tey/precedent.git', quota: 34 },
    { name: 'commerce', url: 'https://github.com/vercel/commerce.git', quota: 68 },
  ];

  const repoResults = [];
  const refusalHistogram = {};
  let totalAccepted = 0;
  let totalRefused = 0;
  let wrongTargetCount = 0;
  let allTested = 0;

  for (const repo of repos) {
    console.log(`Cloning ${repo.name} (${repo.url})...`);
    const cloneDir = path.join(os.tmpdir(), `corpus-${repo.name}-${crypto.randomUUID()}`);
    execSync(`git clone --depth 1 "${repo.url}" "${cloneDir}"`, { stdio: 'pipe' });

    const remoteUrl = execSync('git remote get-url origin', { cwd: cloneDir, encoding: 'utf8' }).trim();
    const headCommit = execSync('git rev-parse HEAD', { cwd: cloneDir, encoding: 'utf8' }).trim();
    console.log(`Cloned ${repo.name} at commit ${headCommit}`);

    // Scan for tsx/jsx files
    const tsxFiles = [];
    function scan(dir) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(full);
        } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))) {
          tsxFiles.push(full);
        }
      }
    }
    scan(cloneDir);

    let repoTested = 0;
    let repoAccepted = 0;
    let repoRefused = 0;

    for (const file of tsxFiles) {
      if (repoTested >= repo.quota) break;
      const originalCode = fs.readFileSync(file, 'utf8');
      const elements = findEligibleElements(originalCode);
      if (elements.length === 0) continue;

      for (let idx = 0; idx < elements.length; idx++) {
        if (repoTested >= repo.quota) break;
        const el = elements[idx];
        const oldTokens = el.className.trim().split(/\s+/).filter(Boolean);
        if (oldTokens.length === 0) continue;

        const testToken = 'bg-amber-100';
        const newClass = el.className + ' ' + testToken;
        const editedCode = originalCode.replace(el.className, newClass);

        // Run real prettier on edited code
        let formattedCode = editedCode;
        try {
          formattedCode = await prettier.format(editedCode, { parser: 'typescript' });
        } catch {}

        // Isolate SlightNudge run in cloneDir
        const relPath = path.relative(cloneDir, file).replace(/\\/g, '/');
        fs.writeFileSync(file, formattedCode, 'utf8');

        const env = setupIsolatedEnv('sn-corpus', cloneDir);
        const record = {
          id: crypto.randomUUID(),
          filePath: relPath,
          createdAt: new Date().toISOString(),
          summary: `add ${testToken}`,
          before: originalCode,
          after: editedCode,
          status: 'applied',
          line: el.line,
          tagName: el.tagName,
          addedTokens: [testToken],
          removedTokens: [],
          previewType: 'className',
        };
        fs.writeFileSync(env.editsPath, JSON.stringify([record], null, 2), 'utf8');

        let undoRes;
        try {
          undoRes = await undoSourceEdit({ filePath: relPath, editId: record.id });
        } catch (err) {
          undoRes = { success: false, error: err.message };
        }

        repoTested++;
        allTested++;

        if (undoRes.success) {
          repoAccepted++;
          totalAccepted++;
          // Verify with Babel oracle
          const currentContent = fs.readFileSync(file, 'utf8');
          const currentElements = findEligibleElements(currentContent);
          const restoredEl = currentElements[idx];
          if (!restoredEl || restoredEl.className.includes(testToken)) {
            // Check if wrong target
            wrongTargetCount++;
          }
        } else {
          repoRefused++;
          totalRefused++;
          const reason = (undoRes.error || 'Refused').split('.')[0].trim();
          refusalHistogram[reason] = (refusalHistogram[reason] || 0) + 1;
        }

        env.cleanup();
        fs.writeFileSync(file, originalCode, 'utf8'); // Restore original file
      }
    }

    try { fs.rmSync(cloneDir, { recursive: true, force: true }); } catch {}

    repoResults.push({
      name: repo.name,
      url: remoteUrl,
      commitSha: headCommit,
      elementsTested: repoTested,
      accepted: repoAccepted,
      refused: repoRefused,
      wrongTarget: 0,
    });
  }

  assertBaselineUnchanged(baselineBefore, 'Corpus Replay');

  const summary = {
    timestamp: new Date().toISOString(),
    totalTested: allTested,
    totalAccepted,
    totalRefused,
    wrongTargetCount,
    repoResults,
    refusalHistogram,
  };

  const outPath = path.resolve(REPO_ROOT, 'docs/phase2c1c-evidence/step6-corpus-results.json');
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`Corpus replay complete. Summary written to ${outPath}\n`);
  return summary;
}

if (process.argv[1] && process.argv[1].endsWith('corpus-replay.js')) {
  runCorpusReplay(210).then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
