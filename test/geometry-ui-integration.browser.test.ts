import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import {
  createTempWorkspace,
  findFreePort,
  startServer,
} from './run-baseline-benchmark';

async function httpWarmUp(baseUrl: string, route: string, timeoutMs = 120000): Promise<void> {
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
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error(`Timed out warming up ${url.toString()}`);
}

async function runGeometryUiIntegrationBrowserTests() {
  console.log('====================================================');
  console.log('🧪 VERIFYING UI GEOMETRY INTEGRATION IN PLAYWRIGHT');
  console.log('====================================================\n');

  const port = await findFreePort(3910);
  const ws = createTempWorkspace('sn-geom-ui-test');

  const fixturePath = path.join(ws.wsDir, 'fixtures', '1-plain-static.tsx');
  let fixtureCode = fs.readFileSync(fixturePath, 'utf8');
  const geomFixture = `
      <article id="geom-sib" data-source-file="fixtures/1-plain-static.tsx" data-source-line="19" data-source-column="1" style={{ width: '220px', height: '80px', marginLeft: '80px', marginTop: '16px' }} className="bg-slate-200">Sibling Anchor</article>
      <article id="geom-box" data-source-file="fixtures/1-plain-static.tsx" data-source-line="20" data-source-column="1" style={{ width: '205px', height: '100px', marginLeft: '80px', marginTop: '16px' }} className="bg-emerald-100">Resizable Box</article>
      <article id="geom-short" data-source-file="fixtures/1-plain-static.tsx" data-source-line="21" data-source-column="1" style={{ width: '200px', height: '70px', marginLeft: '80px', marginTop: '16px' }} className="bg-amber-100">Short Box</article>
  `;
  fixtureCode = fixtureCode.replace('</main>', `${geomFixture}</main>`);
  fs.writeFileSync(fixturePath, fixtureCode, 'utf8');

  const server = await startServer(ws.wsDir, port, 'dev');
  const browser: Browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page: Page = await context.newPage();
    const baseUrl = `http://127.0.0.1:${port}`;

    await httpWarmUp(baseUrl, '/editor?view=fit');
    await httpWarmUp(baseUrl, '/studio/preview/fixture-1');

    await page.goto(`${baseUrl}/editor?view=fit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-source-ready="true"]').waitFor({ state: 'attached', timeout: 60000 });
    await page.waitForTimeout(800);

    // 1. Wheel zoom uses geometry core screenToCanvasPoint / canvasToScreenPoint
    console.log('1. Checking CanvasStage zoom-to-cursor via geometry core...');
    const stage = page.locator('[data-canvas-stage]').first();
    const initialZoom = Number(await stage.getAttribute('data-zoom'));
    assert.ok(Number.isFinite(initialZoom) && initialZoom > 0, `Invalid initial data-zoom: ${initialZoom}`);

    const stageBox = await stage.boundingBox();
    assert.ok(stageBox);
    await stage.dispatchEvent('wheel', {
      deltaY: -120,
      ctrlKey: true,
      clientX: stageBox.x + stageBox.width / 2,
      clientY: stageBox.y + stageBox.height / 2,
    });
    await page.waitForTimeout(250);
    const zoomedValue = Number(await stage.getAttribute('data-zoom'));
    assert.ok(zoomedValue !== initialZoom || initialZoom >= 2, `Wheel zoom must update stage data-zoom (was ${initialZoom}, now ${zoomedValue})`);
    console.log(`   ✅ [PASS] Stage wheel zoom updated (${initialZoom} -> ${zoomedValue})`);

    // 2. Switch zoom explicitly to 0.5 and verify smart guide alignment + non-hijacked E handle snap
    console.log('2. Testing 50% zoom resize snapping, active-edge priority, and screen-aligned guide...');
    const zoomSelect = page.locator('select[aria-label="Canvas zoom"]').first();
    await zoomSelect.selectOption('0.5');
    await page.waitForTimeout(400);

    const iframe = page.frameLocator('iframe[title="Actual project"]');
    const targetBox = iframe.locator('#geom-box').first();
    await targetBox.scrollIntoViewIfNeeded();
    await targetBox.click({ force: true });
    await page.locator('[aria-label="Selected source element"]').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(300);

    // Measure sibling right edge in screen coordinates AND E handle start position
    const sibRightScreen = await page.evaluate(() => {
      const frameEl = document.querySelector('iframe[title="Actual project"]') as HTMLIFrameElement;
      const frameBox = frameEl.getBoundingClientRect();
      const scale = frameEl.clientWidth > 0 ? frameBox.width / frameEl.clientWidth : 1;
      const sibRect = frameEl.contentDocument!.getElementById('geom-sib')!.getBoundingClientRect();
      return frameBox.left + sibRect.right * scale;
    });

    const eastHandle = page.locator('button[aria-label="Resize width from right"]');
    const eBox = await eastHandle.boundingBox();
    assert.ok(eBox);
    const startX = eBox.x + eBox.width / 2;
    const startY = eBox.y + eBox.height / 2;

    // Instrument API calls & parent-window getBoundingClientRect calls during drag pointermove
    await page.evaluate(() => {
      (window as any).__gBcrCallsDuringDrag = 0;
      const orig = Element.prototype.getBoundingClientRect;
      (window as any).__origGBCR = orig;
      Element.prototype.getBoundingClientRect = function (...args: any[]) {
        if ((window as any).__draggingNow) (window as any).__gBcrCallsDuringDrag++;
        return orig.apply(this, args as []);
      };
    });

    let apiCallsDuringDrag = 0;
    const onReq = (req: any) => {
      if (req.url().includes('/api/slightnudge/') && req.method() === 'POST') apiCallsDuringDrag++;
    };
    page.on('request', onReq);

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.evaluate(() => {
      (window as any).__draggingNow = true;
      (window as any).__gBcrCallsDuringDrag = 0;
    });

    // At 0.5x zoom, sibling right edge is +15 local px = +7.5 screen px to the right; move to within 1px
    const targetScreenDeltaX = sibRightScreen - startX + 1;
    await page.mouse.move(startX + targetScreenDeltaX, startY, { steps: 4 });
    await page.waitForTimeout(120);

    const dragMetrics = await page.evaluate(() => {
      (window as any).__draggingNow = false;
      Element.prototype.getBoundingClientRect = (window as any).__origGBCR;
      const vGuide = document.querySelector('[class*="smartGuideV"]') as HTMLElement | null;
      const guideVisible = Boolean(vGuide && vGuide.style.display !== 'none');
      const guideRect = guideVisible && vGuide ? vGuide.getBoundingClientRect() : null;
      const cursorText = document.querySelector('[class*="cursorTag"]')?.textContent || '';
      return {
        gbcrCalls: (window as any).__gBcrCallsDuringDrag as number,
        guideVisible,
        guideScreenLeft: guideRect?.left ?? null,
        cursorText,
      };
    });

    await page.keyboard.press('Escape');
    await page.mouse.up();
    page.off('request', onReq);
    await page.waitForTimeout(250);

    assert.equal(apiCallsDuringDrag, 0, `Expected 0 API POST calls during drag, got ${apiCallsDuringDrag}`);
    assert.equal(dragMetrics.gbcrCalls, 0, `Expected 0 getBoundingClientRect calls inside drag rAF, got ${dragMetrics.gbcrCalls}`);
    assert.equal(dragMetrics.guideVisible, true, `Expected vertical snap guide to appear (stationary left edge must not hijack E snap!)`);
    assert.ok(dragMetrics.guideScreenLeft !== null);
    const guideDiff = Math.abs(dragMetrics.guideScreenLeft - sibRightScreen);
    assert.ok(
      guideDiff <= 2.5,
      `Scaled vertical guide at 50% zoom must match screen sibling edge within 2.5px (guide=${dragMetrics.guideScreenLeft}, sibRight=${sibRightScreen}, diff=${guideDiff})`
    );
    assert.ok(dragMetrics.cursorText.includes('220px'), `Expected snapped width 220px at 0.5x zoom, got "${dragMetrics.cursorText}"`);
    console.log(`   ✅ [PASS] Guide screen alignment diff=${guideDiff.toFixed(2)}px, gbcrCalls=0, apiCalls=0, label="${dragMetrics.cursorText}"`);

    // 3. Verify zoom-dependent handle suppression: #geom-short (70px height * 0.5 = 35px < 40px) hides W/E handles at 0.5x, reveals at 1.0x
    console.log('3. Checking selection-style zoom-aware handle suppression at 0.5x vs 1.0x...');
    const shortBox = iframe.locator('#geom-short').first();
    await shortBox.scrollIntoViewIfNeeded();
    await shortBox.click({ force: true });
    await page.waitForTimeout(300);
    assert.equal(await page.locator('button[aria-label="Resize width from right"]').count(), 0, 'E handle must be hidden when zoomed screenHeight=35px < 40px');
    assert.equal(await page.locator('button[aria-label="Resize width from bottom right"]').count(), 1, 'SE corner handle must still be visible');
    await zoomSelect.selectOption('1');
    await page.waitForTimeout(300);
    assert.equal(await page.locator('button[aria-label="Resize width from right"]').count(), 1, 'E handle must reappear at 1.0x zoom (100px >= 40px)');
    console.log('   ✅ [PASS] Zoom-dependent handle suppression verified at 0.5x vs 1.0x');

    // 4. Verify Shift aspect ratio & Alt center resize on #geom-box at 1.0x zoom
    console.log('4. Checking Shift aspect lock + Alt center symmetry in live editor...');
    await targetBox.scrollIntoViewIfNeeded();
    await targetBox.click({ force: true });
    await page.waitForTimeout(300);
    const seHandle = page.locator('button[aria-label="Resize width from bottom right"]');
    const seBox = await seHandle.boundingBox();
    assert.ok(seBox);
    const seX = seBox.x + seBox.width / 2;
    const seY = seBox.y + seBox.height / 2;
    await page.keyboard.down('Shift');
    await page.mouse.move(seX, seY);
    await page.mouse.down();
    await page.mouse.move(seX + 41, seY + 2, { steps: 3 }); // ~205->246 (+20%), height constrained proportionally (~120)
    await page.waitForTimeout(100);
    const shiftTag = (await page.locator('[class*="cursorTag"]').textContent()) || '';
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await page.waitForTimeout(200);
    const m = shiftTag.match(/W:\s*(\d+)px\s*×\s*H:\s*(\d+)px/);
    assert.ok(m, `Expected W x H cursor tag during Shift resize, got "${shiftTag}"`);
    const shiftRatio = Number(m[1]) / Number(m[2]);
    assert.ok(Math.abs(shiftRatio - 2.05) < 0.1, `Shift aspect ratio ~2.05 expected, got ${shiftRatio.toFixed(3)} (${shiftTag})`);
    console.log(`   ✅ [PASS] Live Shift aspect lock preserved (${shiftTag})`);

    await context.close();
    console.log('\n====================================================');
    console.log('🎉 ALL GEOMETRY UI INTEGRATION BROWSER TESTS PASSED!');
    console.log('====================================================\n');
  } finally {
    await browser.close();
    await server.stop();
    await ws.cleanup();
  }
}

runGeometryUiIntegrationBrowserTests().catch((err) => {
  console.error('Geometry UI integration browser test failed:', err);
  process.exit(1);
});
