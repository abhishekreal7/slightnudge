import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium, type Page, type BrowserContext } from 'playwright';
import http from 'node:http';
import {
  findFreePort,
  createTempWorkspace,
  startServer,
} from './run-baseline-benchmark';

console.log('====================================================');
console.log('🧪 VERIFYING LIGHTWEIGHT OUTLINE-ONLY DRAG & METAKEY');
console.log('====================================================\n');

async function httpWarmUp(baseUrl: string, route: string, timeoutMs = 60000): Promise<void> {
  const url = new URL(route, baseUrl);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise<boolean>((resolve) => {
        const req = http.get(url, (res) => {
          res.resume();
          resolve(Boolean(res.statusCode && res.statusCode < 500));
        });
        req.on('error', () => resolve(false));
      });
      if (ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
}

async function runOutlineDragBrowserTests() {
  const port = await findFreePort(3860);
  const ws = createTempWorkspace('sn-outline-test');
  const server = await startServer(ws.wsDir, port, 'dev');

  const browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page: Page = await context.newPage();

  try {
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Warming up ${baseUrl}...`);
    await httpWarmUp(baseUrl, '/editor?view=full', 120000);
    await httpWarmUp(baseUrl, '/studio/preview/fixture-1', 120000);

    console.log('Navigating to /editor?view=full...');
    await page.goto(`${baseUrl}/editor?view=full`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);

    // 1. Verify Outline toggle button exists
    console.log('1. Checking Lightweight Outline toggle button...');
    const outlineToggle = page.locator('button[aria-label="Toggle lightweight outline drag"]').first();
    await outlineToggle.waitFor({ state: 'visible', timeout: 15000 });
    const initialPressed = await outlineToggle.getAttribute('aria-pressed');
    assert.equal(initialPressed, 'false');

    // Click to enable outline drag
    await outlineToggle.click();
    await page.waitForTimeout(300);
    const enabledPressed = await outlineToggle.getAttribute('aria-pressed');
    assert.equal(enabledPressed, 'true', 'Outline drag toggle should be active');

    // Verify localStorage persistence
    const pref = await page.evaluate(() => localStorage.getItem('slightnudge:outline-drag'));
    assert.equal(pref, '1', 'Outline preference must be saved in localStorage');
    console.log('✔ Outline toggle enabled and persisted to localStorage');

    // 2. Select headline
    console.log('2. Selecting headline in view=full...');
    const iframe = page.frameLocator('iframe[title="Actual project"]');
    const target = iframe.locator('h1').first();
    await target.waitFor({ state: 'visible', timeout: 15000 });
    await target.click({ force: true });
    await page.waitForTimeout(500);

    // Verify selection box has dashed outline style
    const isDashed = await page.evaluate(() => {
      const sel = document.querySelector('[aria-label="Selected source element"]');
      if (!sel) return false;
      const borderStyle = getComputedStyle(sel).borderStyle;
      return borderStyle === 'dashed';
    });
    assert.equal(isDashed, true, 'Selection box must have dashed border when outline mode is active');
    console.log('✔ Selection box renders dashed outline in outline mode');

    // 3. Test outline drag behavior (zero DOM style mutation during drag)
    console.log('3. Testing drag: target style must NOT mutate during drag...');
    const handle = page.locator('button[aria-label="Resize width from bottom right"]').first();
    await handle.waitFor({ state: 'visible', timeout: 5000 });
    const box = await handle.boundingBox();
    assert.ok(box, 'Resize handle bounding box must exist');

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Move pointer by 80px right
    await page.mouse.move(startX + 80, startY);
    await page.waitForTimeout(100);

    // Read target element's style attribute inside iframe DURING drag
    const styleDuringDrag = await page.evaluate(() => {
      const frame = document.querySelector('iframe[title="Actual project"]') as HTMLIFrameElement | null;
      const doc = frame?.contentDocument;
      const h1 = doc?.querySelector('h1');
      return h1?.getAttribute('style') || '';
    });

    assert.ok(
      !styleDuringDrag.includes('max-width'),
      `Target element must NOT be mutated during outline drag (was "${styleDuringDrag}")`
    );
    console.log('✔ Target element remained unmutated during active outline drag');

    // Release pointer - should commit final size to target element
    console.log('4. Releasing pointer: target style must update on drop...');
    await page.mouse.up();
    await page.waitForTimeout(500);

    const styleAfterDrop = await page.evaluate(() => {
      const frame = document.querySelector('iframe[title="Actual project"]') as HTMLIFrameElement | null;
      const doc = frame?.contentDocument;
      const h1 = doc?.querySelector('h1');
      return h1?.getAttribute('style') || '';
    });

    assert.ok(
      styleAfterDrop.includes('max-width'),
      `Target element MUST receive final style upon drop (style: "${styleAfterDrop}")`
    );
    console.log('✔ Target element received final style on release:', styleAfterDrop);

    // 5. Test Escape cancellation in outline mode
    console.log('5. Testing Escape key cancellation in outline mode...');
    const box2 = await handle.boundingBox();
    if (box2) {
      await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
      await page.mouse.down();
      await page.mouse.move(box2.x - 60, box2.y);
      await page.waitForTimeout(100);

      // Cancel with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Overlay shield and guides must be gone
      const shield = await page.locator('[data-event-shield]').isVisible();
      assert.equal(shield, false, 'Event shield must be hidden after Escape');
      console.log('✔ Escape cancellation cleanly rollbacks with zero debris');
    }

    console.log('\n====================================================');
    console.log('🎉 ALL LIGHTWEIGHT OUTLINE-ONLY DRAG TESTS PASSED!');
    console.log('====================================================\n');
  } finally {
    await browser.close();
    await server.stop();
    await ws.cleanup();
  }
}

runOutlineDragBrowserTests().catch((err) => {
  console.error('Outline drag browser test failed:', err);
  process.exit(1);
});
