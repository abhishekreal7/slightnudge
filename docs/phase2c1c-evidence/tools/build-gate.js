import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { createArchiveCopy, findFreePort, computeBaselineHashes, assertBaselineUnchanged, REPO_ROOT } from './helpers.js';

export async function runBuildGate() {
  const baselineBefore = computeBaselineHashes();
  console.log('Starting Step 2 Build Gate in clean archive copy...\n');

  const copy = createArchiveCopy('HEAD', 'build-gate-copy');
  const results = {
    tscPassed: false,
    buildPassed: false,
    studioLoaded: false,
    tokenAvailable: false,
    previewWorked: false,
    applyWroteFile: false,
  };

  try {
    // 1. npx tsc --noEmit
    console.log('Running npx tsc --noEmit...');
    execSync('npx tsc --noEmit', { cwd: copy.dir, stdio: ['ignore', 'pipe', 'pipe'] });
    results.tscPassed = true;
    console.log('tsc --noEmit: PASS');

    // 2. npm run build
    console.log('Running npm run build...');
    const buildOutput = execSync('npm run build', { cwd: copy.dir, encoding: 'utf8' });
    results.buildPassed = true;
    console.log('npm run build: PASS');

    const buildLogPath = path.resolve(REPO_ROOT, 'docs/phase2c1c-evidence/step2-build-output.txt');
    fs.writeFileSync(buildLogPath, buildOutput, 'utf8');

    // 3. next start on free port
    const port = await findFreePort(3600);
    console.log(`Starting next start on 127.0.0.1:${port}...`);
    const serverProc = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['next', 'start', '-H', '127.0.0.1', '-p', String(port)],
      { cwd: copy.dir, stdio: ['ignore', 'pipe', 'pipe'], shell: true }
    );

    // Wait for server ready
    const startWait = Date.now();
    let ready = false;
    while (Date.now() - startWait < 40000) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/`);
        if (res.status === 200) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!ready) {
      throw new Error(`Production server failed to start within timeout on port ${port}`);
    }

    // 4. Playwright Chromium verification of /studio
    console.log('Opening /studio in Playwright Chromium...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    await page.goto(`http://127.0.0.1:${port}/studio`, { waitUntil: 'networkidle' });
    results.studioLoaded = true;

    // Check token available to page
    const pageToken = await page.evaluate(() => window.__SLIGHTNUDGE_TOKEN__);
    results.tokenAvailable = Boolean(pageToken && pageToken.length > 20);
    console.log(`Token available on /studio: ${results.tokenAvailable}`);

    // Screenshot initial studio load
    const shotPath = path.resolve(REPO_ROOT, 'docs/phase2c1c-evidence/step2-studio-loaded.png');
    await page.screenshot({ path: shotPath });

    // Test nudge preview and apply
    const previewRes = await page.evaluate(async (tok) => {
      try {
        const res = await fetch('/api/slightnudge/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-slightnudge-token': tok,
          },
          body: JSON.stringify({
            kind: 'style',
            filePath: 'fixtures/1-plain-static.tsx',
            line: 8,
            tagName: 'div',
            property: 'padding',
            value: 'p-4',
          }),
        });
        const data = await res.json();
        return { status: res.status, data };
      } catch (err) {
        return { error: err.message };
      }
    }, pageToken);

    results.previewWorked = Boolean(previewRes.data?.id);
    console.log(`Preview response: status ${previewRes.status}, id: ${previewRes.data?.id}`);

    if (results.previewWorked) {
      const applyRes = await page.evaluate(async ({ id, tok }) => {
        try {
          const res = await fetch('/api/slightnudge/apply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-slightnudge-token': tok,
            },
            body: JSON.stringify({ previewId: id }),
          });
          const data = await res.json();
          return { status: res.status, data };
        } catch (err) {
          return { error: err.message };
        }
      }, { id: previewRes.data.id, tok: pageToken });

      console.log(`Apply response: status ${applyRes.status}, data: ${JSON.stringify(applyRes.data)}`);

      const targetInCopy = path.join(copy.dir, 'fixtures/1-plain-static.tsx');
      const targetContent = fs.readFileSync(targetInCopy, 'utf8');
      results.applyWroteFile = applyRes.status === 200 && targetContent.includes('p-4 lg:p-4');
      console.log(`Apply wrote file in copy: ${results.applyWroteFile}`);

      // Screenshot after apply
      const afterShotPath = path.resolve(REPO_ROOT, 'docs/phase2c1c-evidence/step2-studio-applied.png');
      await page.screenshot({ path: afterShotPath });
    }

    await browser.close();

    try {
      execSync(`taskkill /pid ${serverProc.pid} /T /F`, { stdio: 'ignore' });
    } catch {}
  } finally {
    copy.cleanup();
    assertBaselineUnchanged(baselineBefore, 'Build Gate');
  }

  const outPath = path.resolve(REPO_ROOT, 'docs/phase2c1c-evidence/step2-build-gate.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log('Build gate complete. Output saved to', outPath);
  return results;
}

if (process.argv[1] && process.argv[1].endsWith('build-gate.js')) {
  runBuildGate().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
