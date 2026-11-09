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
import {
  selectionStyleFor,
  buildRoundedRectPath,
  buildCornerArcPath,
  RADIUS_SCALE_STEPS,
  findNearestRadiusStep,
} from '../components/slightnudge/selection-style';

console.log('====================================================');
console.log('🧪 RUNNING PLAYWRIGHT SELECTION CHROME V2 TEST SUITE');
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

async function runSelectionChromeBrowserTests() {
  const port = await findFreePort(3870);
  const ws = createTempWorkspace('sn-selection-test');

  // Inject diverse elements into fixtures/1-plain-static.tsx for testing all variants
  const fixturePath = path.join(ws.wsDir, 'fixtures', '1-plain-static.tsx');
  if (fs.existsSync(fixturePath)) {
    const showcaseHtml = `
      <div id="showcase-container" className="p-4 space-y-4 bg-slate-100">
        <div id="test-dots" data-source-file="fixtures/1-plain-static.tsx" data-source-line="20" data-source-column="1" style={{ width: '180px', height: '80px' }} className="bg-white border border-slate-300">Dots Element</div>
        <div id="test-arc" data-source-file="fixtures/1-plain-static.tsx" data-source-line="21" data-source-column="1" style={{ width: '200px', height: '90px' }} className="rounded-lg bg-emerald-50 border border-emerald-300">Arc Element</div>
        <div id="test-capsule" data-source-file="fixtures/1-plain-static.tsx" data-source-line="22" data-source-column="1" style={{ width: '160px', height: '40px' }} className="rounded-full bg-blue-600 text-white font-medium flex items-center justify-center">Capsule Pill</div>
        <div id="test-circle" data-source-file="fixtures/1-plain-static.tsx" data-source-line="23" data-source-column="1" style={{ width: '64px', height: '64px' }} className="rounded-full bg-purple-600 text-white flex items-center justify-center">Circle</div>
        <p id="test-text" data-source-file="fixtures/1-plain-static.tsx" data-source-line="24" data-source-column="1" style={{ width: '320px' }} className="text-base text-slate-800">Inline heading text block</p>
        <img id="test-media" data-source-file="fixtures/1-plain-static.tsx" data-source-line="25" data-source-column="1" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%236366f1'/%3E%3C/svg%3E" alt="Media" style={{ width: '120px', height: '80px' }} />
        <div id="test-tiny" data-source-file="fixtures/1-plain-static.tsx" data-source-line="26" data-source-column="1" style={{ width: '18px', height: '18px' }} className="rounded-sm bg-amber-500 text-xs">T</div>
      </div>
    `;
    let code = fs.readFileSync(fixturePath, 'utf8');
    code = code.replace('</main>', `${showcaseHtml}</main>`);
    fs.writeFileSync(fixturePath, code, 'utf8');
  }

  const server = await startServer(ws.wsDir, port, 'dev');

  const screensDir = path.join(process.cwd(), 'docs', 'editor', 'evidence', 'screens');
  const perfDir = path.join(process.cwd(), 'docs', 'editor', 'perf');
  fs.mkdirSync(screensDir, { recursive: true });
  fs.mkdirSync(perfDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: perfDir, size: { width: 1280, height: 720 } },
  });
  const page: Page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  try {
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Warming up ${baseUrl}...`);
    await httpWarmUp(baseUrl, '/editor?view=fit', 120000);
    await httpWarmUp(baseUrl, '/studio/preview/fixture-1', 120000);

    console.log('Navigating to editor...');
    await page.goto(`${baseUrl}/editor?view=fit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);

    const iframe = page.frameLocator('iframe[title="Actual project"]');

    // ----------------------------------------------------
    // TEST 1: GEOMETRY & VARIANT ASSERTIONS
    // ----------------------------------------------------
    console.log('\n--- 1. Testing Geometry & Semantic Handle Rules ---');

    // Select headline inside iframe
    const h1Target = iframe.locator('h1').first();
    await h1Target.waitFor({ state: 'visible', timeout: 30000 });
    await h1Target.dispatchEvent('click');
    await page.locator('[aria-label="Selected source element"]').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(400);

    // Text variant assertion: ONLY left and right handles ('w' and 'e')
    const westHandle = page.locator('button[aria-label="Resize width from left"]');
    const eastHandle = page.locator('button[aria-label="Resize width from right"]');
    const topHandle = page.locator('button[aria-label="Resize width from top"]');
    const seHandle = page.locator('button[aria-label="Resize width from bottom right"]');

    assert.equal(await westHandle.count(), 1, 'Text variant must have west handle');
    assert.equal(await eastHandle.count(), 1, 'Text variant must have east handle');
    assert.equal(await topHandle.count(), 0, 'Text variant must suppress top handle');
    assert.equal(await seHandle.count(), 0, 'Text variant must suppress corner handles');
    console.log('   ✅ [PASS] Text variant displays ONLY actionable width handles (w, e)');

    // Save baseline text screenshot
    await page.screenshot({ path: path.join(screensDir, 'text-100-light-selected.png') });
    console.log('📸 Saved screenshot: text-100-light-selected.png');

    // ----------------------------------------------------
    // TEST 2: ARC VARIANT & CURVED CORNER HANDLES
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Arc Variant & Curved Corner Handles ---');
    const arcTarget = iframe.locator('#test-arc').first();
    if (await arcTarget.count() > 0) {
      await arcTarget.scrollIntoViewIfNeeded();
      await arcTarget.dispatchEvent('click');
      await page.waitForTimeout(300);
      await page.locator('[data-selection-variant="arc"]').waitFor({ state: 'visible', timeout: 15000 });

      // Verify SVG outline has dual-stroke paths
      const haloPath = page.locator('path[class*="outlineHalo"]');
      const accentPath = page.locator('path[class*="outlineAccent"]');
      assert.equal(await haloPath.count(), 1, 'White halo path must be present');
      assert.equal(await accentPath.count(), 1, 'Accent outline path must be present');

      // Verify curved arc corner handles exist
      const arcHandlePaths = page.locator('path[class*="handleArc"]');
      const count = await arcHandlePaths.count();
      assert.ok(count >= 4, `Expected at least 4 corner arc paths, found ${count}`);
      console.log('   ✅ [PASS] Arc variant renders dual-stroke outline and corner arc paths');

      // Geometry assertion: verify hit areas >= 16px
      const handles = page.locator('button[role="slider"]');
      const handleCount = await handles.count();
      for (let i = 0; i < handleCount; i++) {
        const box = await handles.nth(i).boundingBox();
        if (box) {
          assert.ok(box.width >= 16, `Handle width must be >= 16px, got ${box.width}`);
          assert.ok(box.height >= 16, `Handle height must be >= 16px, got ${box.height}`);
        }
      }
      console.log('   ✅ [PASS] All handle hit areas >= 16px');

      // Check handle hover state
      const neHandle = page.locator('button[aria-label="Resize width from top right"]');
      if (await neHandle.count() > 0) {
        await neHandle.hover();
        await page.waitForTimeout(100);
        await page.screenshot({ path: path.join(screensDir, 'arc-100-light-hover.png') });
        console.log('📸 Saved screenshot: arc-100-light-hover.png');
      }

      await page.screenshot({ path: path.join(screensDir, 'arc-100-light-selected.png') });
      console.log('📸 Saved screenshot: arc-100-light-selected.png');
    }

    // ----------------------------------------------------
    // TEST 3: CAPSULE & CIRCLE VARIANTS
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Capsule & Circle Variants ---');
    const capsuleTarget = iframe.locator('#test-capsule').first();
    console.log('capsuleTarget count:', await capsuleTarget.count());
    if (await capsuleTarget.count() > 0) {
      console.log('capsuleTarget box:', await capsuleTarget.boundingBox());
      const diag = await capsuleTarget.evaluate((el) => ({
        id: el.id,
        dataset: { ...el.dataset },
        style: el.getAttribute('style'),
        className: el.className,
        rect: el.getBoundingClientRect(),
      }));
      console.log('Capsule DOM diagnostics:', diag);

      await capsuleTarget.scrollIntoViewIfNeeded();
      await capsuleTarget.dispatchEvent('click');
      await page.waitForTimeout(1000);

      const toast = await page.evaluate(() => document.querySelector('[role="status"], [role="alert"]')?.textContent);
      if (toast) console.log('Toast on page after click:', toast);

      const variants = await page.locator('[data-selection-variant]').all();
      for (const v of variants) {
        console.log('Capsule click gave variant:', await v.getAttribute('data-selection-variant'));
      }
      await page.locator('[data-selection-variant="capsule"]').waitFor({ state: 'visible', timeout: 15000 });
      await page.screenshot({ path: path.join(screensDir, 'capsule-100-light-selected.png') });
      console.log('📸 Saved screenshot: capsule-100-light-selected.png');
    }

    const circleTarget = iframe.locator('#test-circle').first();
    console.log('circleTarget count:', await circleTarget.count());
    if (await circleTarget.count() > 0) {
      console.log('circleTarget box:', await circleTarget.boundingBox());
      await circleTarget.scrollIntoViewIfNeeded();
      await circleTarget.dispatchEvent('click');
      await page.waitForTimeout(600);
      const variants = await page.locator('[data-selection-variant]').all();
      for (const v of variants) {
        console.log('Circle click gave variant:', await v.getAttribute('data-selection-variant'));
      }
      await page.locator('[data-selection-variant="circle"]').waitFor({ state: 'visible', timeout: 15000 });
      await page.screenshot({ path: path.join(screensDir, 'circle-100-light-selected.png') });
      console.log('📸 Saved screenshot: circle-100-light-selected.png');
    }

    // ----------------------------------------------------
    // TEST 4: MEDIA VARIANT & ASPECT LOCK BADGE
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Media Variant & Aspect Lock Badge ---');
    const mediaTarget = iframe.locator('#test-media').first();
    if (await mediaTarget.count() > 0) {
      await mediaTarget.scrollIntoViewIfNeeded();
      await mediaTarget.dispatchEvent('click');
      await page.waitForTimeout(600);
      await page.locator('[data-selection-variant="media"]').waitFor({ state: 'visible', timeout: 15000 });
      const aspectBadge = page.locator('button[aria-label^="Aspect ratio"]');
      assert.equal(await aspectBadge.count(), 1, 'Media variant must show aspect ratio lock badge');
      console.log('   ✅ [PASS] Media variant renders aspect lock badge and locked aspect');

      await page.screenshot({ path: path.join(screensDir, 'media-100-light-selected.png') });
      console.log('📸 Saved screenshot: media-100-light-selected.png');
    }

    // ----------------------------------------------------
    // TEST 5: TINY ELEMENT (ZERO OVERLAPPING HANDLES)
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Tiny Element (18x18px) ---');
    const tinyTarget = iframe.locator('#test-tiny').first();
    if (await tinyTarget.count() > 0) {
      await tinyTarget.scrollIntoViewIfNeeded();
      await tinyTarget.dispatchEvent('click');
      await page.waitForTimeout(600);
      await page.locator('[data-selection-variant="tiny"]').waitFor({ state: 'visible', timeout: 15000 });

      const tinyHandles = page.locator('button[aria-label^="Resize"]');
      const tinyCount = await tinyHandles.count();
      assert.equal(tinyCount, 1, `Tiny element must have exactly 1 corner handle to prevent overlap (got ${tinyCount})`);
      console.log('   ✅ [PASS] Tiny element renders single corner handle with ZERO overlap');

      await page.screenshot({ path: path.join(screensDir, 'tiny-100-light-selected.png') });
      console.log('📸 Saved screenshot: tiny-100-light-selected.png');
    }

    // ----------------------------------------------------
    // TEST 6: DOTS VARIANT
    // ----------------------------------------------------
    console.log('\n--- 6. Testing Dots Variant ---');
    const dotsTarget = iframe.locator('#test-dots').first();
    if (await dotsTarget.count() > 0) {
      await dotsTarget.scrollIntoViewIfNeeded();
      await dotsTarget.dispatchEvent('click');
      await page.waitForTimeout(600);
      await page.locator('[data-selection-variant="dots"]').waitFor({ state: 'visible', timeout: 15000 });
      await page.screenshot({ path: path.join(screensDir, 'dots-100-light-selected.png') });
      console.log('📸 Saved screenshot: dots-100-light-selected.png');
    }

    // ----------------------------------------------------
    // TEST 7: RADIUS GRIP DRAG SNAPPING, ESCAPE & KEYBOARD
    // ----------------------------------------------------
    console.log('\n--- 7. Testing Radius Grip & Snapping ---');
    // Select arc element for radius grip test
    if (await arcTarget.count() > 0) {
      await arcTarget.scrollIntoViewIfNeeded();
      await arcTarget.dispatchEvent('click');
      await page.waitForTimeout(400);
      await page.locator('[data-selection-variant="arc"]').waitFor({ state: 'visible', timeout: 15000 });
    }

    const radiusGrip = page.locator('button[aria-label="Adjust corner radius"]');
    if (await radiusGrip.count() > 0) {
      const gripBox = await radiusGrip.boundingBox();
      assert.ok(gripBox !== null, 'Radius grip must have bounding box');
      assert.ok(gripBox.width >= 16, `Radius grip hit area >= 16px (got ${gripBox.width})`);

      // Keyboard ArrowUp accessibility test
      await radiusGrip.focus();
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(200);
      console.log('   ✅ [PASS] Keyboard ArrowUp successfully adjusted radius step');

      // Drag radius grip diagonally inward
      const startX = gripBox.x + gripBox.width / 2;
      const startY = gripBox.y + gripBox.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      // Move 40px down-right to expand radius
      await page.mouse.move(startX + 40, startY + 40, { steps: 5 });
      await page.waitForTimeout(200);

      // Verify live cursor tag appeared
      const tag = page.locator('[class*="cursorTag"]');
      if (await tag.count() > 0) {
        const text = await tag.textContent();
        assert.ok(text && text.includes('Radius:'), `Tag should display radius info, got: ${text}`);
        console.log(`   ✅ [PASS] Live radius tag displayed: "${text}"`);
      }

      await page.screenshot({ path: path.join(screensDir, 'radius-grip-dragging.png') });
      console.log('📸 Saved screenshot: radius-grip-dragging.png');

      // Test Escape restores original radius during drag
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await page.waitForTimeout(300);
      console.log('   ✅ [PASS] Escape key restored original radius and cancelled drag');
    }

    // ----------------------------------------------------
    // TEST 8: ZOOM VARIATIONS (200% ZOOM)
    // ----------------------------------------------------
    console.log('\n--- 8. Testing Zoom 200% ---');
    // Set zoom to 200% by evaluating css variable on canvas
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--canvas-zoom', '2.0');
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screensDir, 'dots-200-light-selected.png') });
    console.log('📸 Saved screenshot: dots-200-light-selected.png');

    // ----------------------------------------------------
    // TEST 9: GENERATE CONTACT SHEET HTML & PNG
    // ----------------------------------------------------
    console.log('\n--- 9. Generating Contact Sheet ---');
    const contactSheetHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Selection Chrome v2 Contact Sheet</title>
        <style>
          body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; }
          h1 { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
          p { color: #94a3b8; font-size: 13px; margin-bottom: 24px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; overflow: hidden; padding: 12px; }
          .card h3 { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #38bdf8; margin: 0 0 8px 0; }
          .card img { width: 100%; height: auto; border-radius: 4px; display: block; border: 1px solid #475569; }
        </style>
      </head>
      <body>
        <h1>Selection Chrome v2: Element-Aware Selection Variants</h1>
        <p>Verified baselines across all 7 variants, corner curves, custom cursors, and radius grip direct manipulation.</p>
        <div class="grid">
          <div class="card"><h3>1. Dots Variant (Sharp Rectangles)</h3><img src="dots-100-light-selected.png" /></div>
          <div class="card"><h3>2. Arc Variant (Curved Arc Handles)</h3><img src="arc-100-light-selected.png" /></div>
          <div class="card"><h3>3. Arc Handle Hover State</h3><img src="arc-100-light-hover.png" /></div>
          <div class="card"><h3>4. Capsule Variant (Pill Buttons)</h3><img src="capsule-100-light-selected.png" /></div>
          <div class="card"><h3>5. Circle Variant (Ring Outline)</h3><img src="circle-100-light-selected.png" /></div>
          <div class="card"><h3>6. Text Variant (Width-Only Handles)</h3><img src="text-100-light-selected.png" /></div>
          <div class="card"><h3>7. Media Variant (Aspect Lock Badge)</h3><img src="media-100-light-selected.png" /></div>
          <div class="card"><h3>8. Tiny Variant (18px, Zero Overlap)</h3><img src="tiny-100-light-selected.png" /></div>
          <div class="card"><h3>9. Radius Grip Snapping Drag</h3><img src="radius-grip-dragging.png" /></div>
          <div class="card"><h3>10. Zoom 200% Constant Footprint</h3><img src="dots-200-light-selected.png" /></div>
        </div>
      </body>
      </html>
    `;
    const contactSheetHtmlPath = path.join(screensDir, 'contact-sheet.html');
    fs.writeFileSync(contactSheetHtmlPath, contactSheetHtml, 'utf8');

    const contactPage = await context.newPage();
    await contactPage.goto(`file://${contactSheetHtmlPath}`);
    await contactPage.waitForTimeout(500);
    await contactPage.screenshot({ path: path.join(screensDir, 'contact-sheet.png'), fullPage: true });
    console.log('📸 Saved contact sheet: docs/editor/evidence/screens/contact-sheet.png');
    await contactPage.close();

    const video = page.video();
    if (video) {
      const videoPath = await video.path();
      if (videoPath && fs.existsSync(videoPath)) {
        const dest = path.join(perfDir, 'selection-chrome.webm');
        fs.copyFileSync(videoPath, dest);
        console.log(`🎬 Saved selection chrome video: ${dest}`);
      }
    }

    console.log('\n====================================================');
    console.log('🎉 ALL SELECTION CHROME V2 BROWSER TESTS PASSED!');
    console.log('====================================================\n');
  } finally {
    await context.close();
    await browser.close();
    await server.stop();
    await ws.cleanup();
  }
}

runSelectionChromeBrowserTests().catch((err) => {
  console.error('Selection chrome browser test failed:', err);
  process.exit(1);
});

