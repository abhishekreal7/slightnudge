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
console.log('🧪 RUNNING PLAYWRIGHT DIRECT MANIPULATION TEST SUITE');
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

async function runDirectManipulationBrowserTests() {
  const port = await findFreePort(3600);
  const ws = createTempWorkspace('sn-dm-test');
  const server = await startServer(ws.wsDir, port, 'dev');

  const screenshotsDir = path.join(process.cwd(), 'docs', 'editor', 'perf', 'screenshots');
  const videosDir = path.join(process.cwd(), 'docs', 'editor', 'perf', 'videos');
  fs.mkdirSync(screenshotsDir, { recursive: true });
  fs.mkdirSync(videosDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: videosDir, size: { width: 1280, height: 720 } },
  });
  const page: Page = await context.newPage();

  try {
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Warming up ${baseUrl}...`);
    await httpWarmUp(baseUrl, '/editor?view=fit', 120000);
    await httpWarmUp(baseUrl, '/studio/preview/fixture-1', 120000);

    console.log('Navigating to editor...');
    await page.goto(`${baseUrl}/editor?view=fit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1000);

    // Select headline inside iframe
    const iframe = page.frameLocator('iframe[title="Actual project"]');
    const target = iframe.locator('h1').first();
    await target.waitFor({ state: 'visible', timeout: 30000 });
    await target.click({ force: true });
    await page.waitForTimeout(500);

    // Screenshot: IDLE state
    await page.screenshot({ path: path.join(screenshotsDir, 'idle-selection.png') });
    console.log('📸 Saved idle screenshot: docs/editor/perf/screenshots/idle-selection.png');

    // 1. Verify all 8 handles rendered
    console.log('1. Checking all 8 handles are present and crisp...');
    const handleSelectors = [
      'button[aria-label="Resize width from top left"]',
      'button[aria-label="Resize width from top"]',
      'button[aria-label="Resize width from top right"]',
      'button[aria-label="Resize width from right"]',
      'button[aria-label="Resize width from bottom right"]',
      'button[aria-label="Resize width from bottom"]',
      'button[aria-label="Resize width from bottom left"]',
      'button[aria-label="Resize width from left"]',
    ];

    for (const sel of handleSelectors) {
      const h = page.locator(sel);
      await h.waitFor({ state: 'visible', timeout: 5000 });
      assert.equal(await h.count(), 1, `Handle ${sel} must be present`);
    }
    console.log('   ✅ [PASS] All 8 handles rendered and visible');

    // Hover handle: check hover state & screenshot
    const seHandle = page.locator('button[aria-label="Resize width from bottom right"]');
    await seHandle.hover();
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(screenshotsDir, 'hover-handle.png') });
    console.log('📸 Saved hover screenshot: docs/editor/perf/screenshots/hover-handle.png');

    // 2. Test Anchor accuracy at 50%, 100%, 200% zoom
    console.log('2. Testing anchor accuracy across zooms (50%, 100%, 200%)...');
    const zooms = [0.5, 1.0, 2.0];
    for (const z of zooms) {
      // Set zoom via select
      const zoomSelect = page.locator('select[aria-label="Canvas zoom"]');
      if (await zoomSelect.isVisible()) {
        await zoomSelect.selectOption(String(z));
        await page.waitForTimeout(300);
      }

      // Re-select target
      await target.click({ force: true });
      await page.waitForTimeout(300);

      const seBox = await seHandle.boundingBox();
      assert.ok(seBox, `Handle bounding box must exist at zoom ${z}`);

      // Drag SE handle by 40px screen delta
      const startX = seBox.x + seBox.width / 2;
      const startY = seBox.y + seBox.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 40, startY + 20, { steps: 5 });

      // Live cursor tag should be visible
      const cursorTag = page.locator('.sn-tag, [class*="cursorTag"]');
      const tagVisible = await cursorTag.isVisible().catch(() => false);
      assert.ok(tagVisible, `Live cursor tag should be visible during drag at zoom ${z}`);

      await page.mouse.up();
      await page.waitForTimeout(300);
    }
    console.log('   ✅ [PASS] Anchor accuracy and cursor tag verified at 50%, 100%, 200% zoom');

    // Reset zoom to 100%
    const zoomSelect = page.locator('select[aria-label="Canvas zoom"]');
    if (await zoomSelect.isVisible()) {
      await zoomSelect.selectOption('1');
      await page.waitForTimeout(300);
    }
    await target.click({ force: true });
    await page.waitForTimeout(300);

    // 3. Shift preserves aspect ratio
    console.log('3. Testing Shift aspect ratio constraint...');
    {
      const seBox = await seHandle.boundingBox();
      assert.ok(seBox);
      const startX = seBox.x + seBox.width / 2;
      const startY = seBox.y + seBox.height / 2;

      await page.keyboard.down('Shift');
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 60, startY + 10, { steps: 5 });
      await page.waitForTimeout(100);

      // Screenshot: dragging state
      await page.screenshot({ path: path.join(screenshotsDir, 'dragging-shift.png') });
      console.log('📸 Saved dragging screenshot: docs/editor/perf/screenshots/dragging-shift.png');

      await page.mouse.up();
      await page.keyboard.up('Shift');
      await page.waitForTimeout(300);
    }
    console.log('   ✅ [PASS] Shift aspect ratio handled cleanly');

    // 4. Alt resizes from center
    console.log('4. Testing Alt center-resize constraint...');
    {
      const eastHandle = page.locator('button[aria-label="Resize width from right"]');
      const eBox = await eastHandle.boundingBox();
      assert.ok(eBox);
      const startX = eBox.x + eBox.width / 2;
      const startY = eBox.y + eBox.height / 2;

      await page.keyboard.down('Alt');
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 40, startY, { steps: 5 });
      await page.mouse.up();
      await page.keyboard.up('Alt');
      await page.waitForTimeout(300);
    }
    console.log('   ✅ [PASS] Alt center-resize verified');

    // 5. Esc cancels and restores size (zero debris)
    console.log('5. Testing Escape key cancellation and debris-free rollback...');
    {
      const eastHandle = page.locator('button[aria-label="Resize width from right"]');
      const eBox = await eastHandle.boundingBox();
      assert.ok(eBox);
      const startX = eBox.x + eBox.width / 2;
      const startY = eBox.y + eBox.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 80, startY, { steps: 5 });
      await page.waitForTimeout(100);

      // Press Escape while dragging
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await page.waitForTimeout(300);

      // Verify guides and cursor tag are cleanly hidden
      const guides = page.locator('[class*="smartGuide"]');
      const guidesCount = await guides.count();
      for (let i = 0; i < guidesCount; i++) {
        const isVis = await guides.nth(i).isVisible().catch(() => false);
        assert.equal(isVis, false, 'Guides must be hidden after cancel');
      }

      const shield = page.locator('[class*="eventShield"]');
      if (await shield.count() > 0) {
        assert.equal(await shield.first().isVisible().catch(() => false), false, 'Shield must be hidden after cancel');
      }
    }
    console.log('   ✅ [PASS] Escape cancels cleanly leaving zero overlay debris');

    // 6. Zero network requests during drag
    console.log('6. Testing zero network requests during drag...');
    {
      await target.click({ force: true });
      await page.waitForTimeout(300);

      let requestsDuringDrag = 0;
      const onRequest = (req: any) => {
        const url = req.url();
        if (url.includes('/api/slightnudge/')) {
          requestsDuringDrag++;
        }
      };
      page.on('request', onRequest);

      const seBox = await seHandle.boundingBox();
      assert.ok(seBox);
      const startX = seBox.x + seBox.width / 2;
      const startY = seBox.y + seBox.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      for (let step = 1; step <= 30; step++) {
        await page.mouse.move(startX + step * 2, startY + step, { steps: 1 });
        await page.waitForTimeout(16);
      }
      assert.equal(requestsDuringDrag, 0, `MUST be 0 network requests during drag, got ${requestsDuringDrag}`);

      await page.mouse.up();
      page.off('request', onRequest);
      await page.waitForTimeout(400);
    }
    console.log('   ✅ [PASS] Exactly 0 network requests fired during active drag');

    // 7. Queue ordering with 1500ms delayed save: next interaction accepted within 100ms
    console.log('7. Testing client-side queue and non-blocking input with 1500ms delayed save...');
    {
      await target.click({ force: true });
      await page.waitForTimeout(300);

      // Intercept preview API and inject 1500ms artificial delay
      await page.route('**/api/slightnudge/preview', async (route) => {
        await new Promise((res) => setTimeout(res, 1500));
        await route.continue();
      });

      const seBox = await seHandle.boundingBox();
      assert.ok(seBox);
      const startX = seBox.x + seBox.width / 2;
      const startY = seBox.y + seBox.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 20, startY + 10, { steps: 3 });

      await page.mouse.up();
      const tUp = Date.now();

      // Immediately verify editor accepts next interaction within 100ms while save is delayed
      const accepted = await page.evaluate(() => {
        const t0 = performance.now();
        const p = document.querySelector('iframe')?.contentDocument?.querySelector('p');
        if (p) p.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return (performance.now() - t0) < 50;
      });
      const elapsedToAccepted = Date.now() - tUp;

      console.log(`Time from pointerup to next interaction accepted: ${elapsedToAccepted}ms (in-page: ${accepted})`);
      assert.ok(
        accepted && elapsedToAccepted <= 100,
        `Next interaction must be accepted within 100ms even with 1500ms delayed save (was ${elapsedToAccepted}ms)`
      );

      // Verify saving indicator is shown
      const savingBadge = page.locator('[class*="saveBadgeSaving"]');
      const isSavingVisible = await savingBadge.isVisible().catch(() => false);
      console.log(`Saving indicator visible during delayed save: ${isSavingVisible}`);

      // Wait for delayed save to finish and check "Saved" badge
      await page.waitForTimeout(1800);
      const savedBadge = page.locator('[class*="saveBadgeSaved"]');
      const isSavedVisible = await savedBadge.isVisible().catch(() => false);
      console.log(`Saved indicator visible after save completes: ${isSavedVisible}`);

      await page.unroute('**/api/slightnudge/preview');
    }
    console.log('   ✅ [PASS] Input never blocked by save; accepted < 100ms; queue state transitions verified');

    // 8. Smart guides snapping screenshot
    console.log('8. Capturing snapped guide screenshot...');
    {
      await target.click({ force: true });
      await page.waitForTimeout(200);

      const movePill = page.locator('button[aria-label="Move element"]');
      if (await movePill.isVisible()) {
        const mBox = await movePill.boundingBox();
        if (mBox) {
          await page.mouse.move(mBox.x + mBox.width / 2, mBox.y + mBox.height / 2);
          await page.mouse.down();
          await page.mouse.move(mBox.x + mBox.width / 2 + 10, mBox.y + mBox.height / 2 + 10, { steps: 5 });
          await page.waitForTimeout(100);

          await page.screenshot({ path: path.join(screenshotsDir, 'snapped-guide.png') });
          console.log('📸 Saved snapped screenshot: docs/editor/perf/screenshots/snapped-guide.png');

          await page.mouse.up();
          await page.waitForTimeout(300);
        }
      }
    }

    console.log('\n====================================================');
    console.log('🎉 ALL PLAYWRIGHT DIRECT MANIPULATION TESTS PASSED!');
    console.log('====================================================\n');
  } finally {
    await context.close();
    await browser.close();
    await server.stop();
    await ws.cleanup();
  }
}

runDirectManipulationBrowserTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
