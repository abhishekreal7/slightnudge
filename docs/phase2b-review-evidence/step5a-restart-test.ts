import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn, execSync, ChildProcess } from 'node:child_process';
import { createTempWorkspace, findFreePort } from '../../test/helpers/test-server';

async function waitForServer(port: number, timeoutMs = 45000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await new Promise<number>((resolve, reject) => {
        const req = http.request(
          {
            host: '127.0.0.1',
            port,
            path: '/api/slightnudge/token',
            method: 'GET',
            headers: {
              Host: `127.0.0.1:${port}`,
              Origin: `http://127.0.0.1:${port}`,
            },
            timeout: 1500,
          },
          (r) => resolve(r.statusCode || 0)
        );
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
      });
      if (res === 200) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function spawnDevServer(wsDir: string, port: number, dataDir: string, editsPath: string, pendingDir: string): ChildProcess {
  const env = {
    ...process.env,
    PORT: String(port),
    SLIGHTNUDGE_TEST: '1',
    SLIGHTNUDGE_WORKSPACE_ROOT: wsDir,
    SLIGHTNUDGE_DATA_DIR: dataDir,
    SLIGHTNUDGE_HISTORY_PATH: editsPath,
    SLIGHTNUDGE_PENDING_DIR: pendingDir,
  };

  return spawn(
    'npx.cmd',
    ['next', 'dev', '--webpack', '-H', '127.0.0.1', '-p', String(port)],
    {
      cwd: wsDir,
      env,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
}

function killProc(proc: ChildProcess) {
  try {
    if (proc.pid) {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
    }
  } catch {}
  try {
    proc.kill('SIGKILL');
  } catch {}
}

async function run() {
  console.log('========================================================================');
  console.log('STEP 5a: TOKEN AND SERVER RESTART TEST');
  console.log('========================================================================\n');

  const port = await findFreePort(3125);
  const workspace = createTempWorkspace('sn-step5a');
  console.log(`Temp workspace: ${workspace.wsDir}`);
  console.log(`Port: ${port}`);

  let serverProc: ChildProcess | null = null;
  const evidenceDir = path.join(process.cwd(), 'docs', 'phase2b-review-evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const logs: string[] = [];
  page.on('console', msg => {
    console.log(`[PAGE LOG] ${msg.text()}`);
    logs.push(`[CONSOLE ${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
    logs.push(`[PAGE ERROR] ${err.message}`);
  });
  page.on('request', req => {
    if (req.url().includes('/api/')) console.log(`[REQ] ${req.method()} ${req.url()}`);
  });
  page.on('response', res => {
    if (res.url().includes('/api/')) console.log(`[RES] ${res.status()} ${res.url()}`);
  });

  try {
    // 1. Start Server 1
    console.log('1. Starting initial dev server...');
    serverProc = spawnDevServer(workspace.wsDir, port, workspace.dataDir, workspace.editsPath, workspace.pendingDir);
    const ready1 = await waitForServer(port);
    if (!ready1) throw new Error('Initial dev server failed to start');
    console.log('   Dev server 1 is responsive.');

    // 2. Open Studio in browser
    console.log(`2. Navigating to http://127.0.0.1:${port}/studio ...`);
    await page.goto(`http://127.0.0.1:${port}/studio`, { waitUntil: 'networkidle', timeout: 60000 });
    console.log('   Waiting 3s for Next.js dev compiler and Fast Refresh to settle...');
    await page.waitForTimeout(3000);

    console.log('   Waiting for layers sidebar...');
    await page.waitForSelector('span:has-text("Text")', { timeout: 30000 });
    console.log('   Layers sidebar rendered.');

    // 3. Make a nudge
    console.log('3. Selecting Text layer and nudging...');
    const textLayer = page.locator('div:has(> span:has-text("Text"))').first();
    await textLayer.click();
    await page.waitForTimeout(1000);

    // Verify selection took effect
    const selectedState = await page.evaluate(() => {
      return document.querySelector('.bg-\\[\\#EFF5F0\\]')?.textContent || 'none';
    });
    console.log(`   Selected layer element text: "${selectedState}"`);

    await page.keyboard.press('ArrowRight');
    console.log('   Pressed ArrowRight. Waiting for pending edit UI...');
    await page.waitForTimeout(2000);

    const applyButton = page.locator('button:has-text("Apply to Source"), button:has-text("Apply to code")').first();
    await applyButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('   Apply button is visible.');

    // 4. Restart server process (new process, same port)
    console.log('4. Killing initial dev server and restarting new server process on same port...');
    killProc(serverProc);
    await new Promise(r => setTimeout(r, 1500));

    serverProc = spawnDevServer(workspace.wsDir, port, workspace.dataDir, workspace.editsPath, workspace.pendingDir);
    const ready2 = await waitForServer(port);
    if (!ready2) throw new Error('Restarted dev server failed to become responsive');
    console.log('   Dev server 2 is responsive on the same port.');

    // 5. Press Apply or observe HMR behavior
    console.log('5. Clicking "Apply to Source"...');
    let clickError: string | null = null;
    try {
      await applyButton.click({ timeout: 5000 });
    } catch (err: any) {
      clickError = err.message;
      console.log(`   applyButton.click caught: ${err.message}`);
    }
    await page.waitForTimeout(2000);

    // 6. Record what user sees
    const screenshotApplyPath = path.join(evidenceDir, 'step5a-restart-apply.png');
    await page.screenshot({ path: screenshotApplyPath, fullPage: true });
    console.log(`   Screenshot saved: ${screenshotApplyPath}`);

    // Inspect button state and messages
    const buttonText = await applyButton.innerText().catch(() => 'N/A');
    const isButtonDisabled = await applyButton.isDisabled().catch(() => false);
    const isButtonVisible = await applyButton.isVisible().catch(() => false);

    // Find any error text or alerts on page
    const pageText = await page.evaluate(() => document.body.innerText);
    const toasts = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('[role="alert"], .sn-toast, .toast, [class*="toast"], [class*="error"], [class*="alert"]'));
      return els.map(e => (e as HTMLElement).innerText).filter(Boolean);
    });

    // Also test direct apply API fetch from page context with old token to observe exact HTTP response
    const apiWithOldToken = await page.evaluate(async () => {
      try {
        const token = (window as any).__SLIGHTNUDGE_TOKEN__ || 'old-token';
        const res = await fetch('/api/slightnudge/apply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-slightnudge-token': token,
          },
          body: JSON.stringify({ previewId: '00000000-0000-0000-0000-000000000000' }),
        });
        const body = await res.text();
        return { status: res.status, body };
      } catch (e: any) {
        return { error: e.message };
      }
    });
    console.log(`   API response with old token on restarted server: status=${apiWithOldToken.status}, body=${apiWithOldToken.body}`);

    console.log('\n--- OBSERVATIONS AFTER RESTART & APPLY ---');
    console.log(`Apply Button visible:  ${isButtonVisible}`);
    console.log(`Apply Button text:     "${buttonText}"`);
    console.log(`Apply Button disabled: ${isButtonDisabled}`);
    console.log(`Click error:           ${clickError || 'none'}`);
    console.log(`Toast / alert elements found:\n${JSON.stringify(toasts, null, 2)}`);

    // 7. Check if page reload fixes it
    console.log('\n7. Reloading page...');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    const screenshotReloadPath = path.join(evidenceDir, 'step5a-after-reload.png');
    await page.screenshot({ path: screenshotReloadPath, fullPage: true });
    console.log(`   Screenshot saved: ${screenshotReloadPath}`);

    // Check if studio reloaded cleanly with new token
    const tokenInBrowser = await page.evaluate(() => (window as any).__SLIGHTNUDGE_TOKEN__);
    console.log(`   New token in browser window.__SLIGHTNUDGE_TOKEN__: ${tokenInBrowser ? tokenInBrowser.slice(0, 16) + '...' : 'undefined'}`);

    // Try a fresh nudge and apply after reload
    console.log('   Testing fresh nudge and apply after reload...');
    await page.waitForSelector('span:has-text("Text")', { timeout: 10000 });
    const textLayerAfter = page.locator('div:has(> span:has-text("Text"))').first();
    await textLayerAfter.click();
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);

    const applyButtonAfter = page.locator('button:has-text("Apply to Source"), button:has-text("Apply to code")').first();
    await applyButtonAfter.waitFor({ state: 'visible', timeout: 5000 });
    await applyButtonAfter.click();
    await page.waitForTimeout(2500);

    const buttonTextAfter = await applyButtonAfter.innerText().catch(() => 'N/A');
    const isVisibleAfter = await applyButtonAfter.isVisible().catch(() => false);
    console.log(`   Apply button after reload apply: visible=${isVisibleAfter}, text="${buttonTextAfter}"`);

    const resultSummary = {
      buttonStateBeforeReload: { visible: isButtonVisible, text: buttonText, disabled: isButtonDisabled },
      toastsOnApplyAfterRestart: toasts,
      browserLogs: logs.filter(l => l.includes('403') || l.includes('error') || l.includes('token') || l.includes('Apply') || l.includes('Failed')),
      reloadFixedToken: !!tokenInBrowser,
      postReloadApplySucceeded: !isVisibleAfter || buttonTextAfter.includes('Applied') || !buttonTextAfter.includes('Apply to Source'),
    };

    fs.writeFileSync(path.join(evidenceDir, 'step5a-results.json'), JSON.stringify(resultSummary, null, 2), 'utf8');
    console.log('\nStep 5a results written to docs/phase2b-review-evidence/step5a-results.json');

  } finally {
    await browser.close().catch(() => {});
    if (serverProc) {
      killProc(serverProc);
    }
    await workspace.cleanup().catch(() => {});
  }
}

run().catch((err) => {
  console.error('STEP 5a FAILED:', err);
  process.exit(1);
});
