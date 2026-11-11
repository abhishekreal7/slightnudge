import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { getSourceCanvasBridge } from '../lib/slightnudge/source-canvas-bridge';
import { predictElementScreenRect } from '../lib/editor/geometry';
import { hydrateSerializedTransformChain } from '../components/slightnudge/direct-manipulation-engine';
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
      <article id="geom-box" data-source-file="fixtures/1-plain-static.tsx" data-source-line="20" data-source-column="1" style={{ width: '205px', height: '100px', marginLeft: '80px', marginTop: '16px' }} className="bg-emerald-100 rounded-lg">Resizable Box</article>
      <article id="geom-short" data-source-file="fixtures/1-plain-static.tsx" data-source-line="21" data-source-column="1" style={{ width: '200px', height: '70px', marginLeft: '80px', marginTop: '16px' }} className="bg-amber-100">Short Box</article>
      <article id="geom-rotated" data-source-file="fixtures/1-plain-static.tsx" data-source-line="22" data-source-column="1" style={{ width: '160px', height: '80px', marginLeft: '140px', marginTop: '48px', transform: 'rotate(30deg)' }} className="bg-indigo-100">Rotated Box</article>
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
      const accentEl = document.querySelector('[aria-label="Selected source element"] path[class*="outlineAccent"]') as SVGPathElement | null;
      const accentRight = accentEl ? accentEl.getBoundingClientRect().right : 0;
      const arcPaths = Array.from(document.querySelectorAll('[aria-label="Selected source element"] path[class*="handleArc"]'));
      const arcMaxRight = arcPaths.reduce((maxR, el) => Math.max(maxR, el.getBoundingClientRect().right), 0);
      return {
        gbcrCalls: (window as any).__gBcrCallsDuringDrag as number,
        guideVisible,
        guideScreenLeft: guideRect?.left ?? null,
        cursorText,
        arcCount: arcPaths.length,
        arcGapPx: accentRight > 0 ? Math.abs(accentRight - arcMaxRight) : 999,
      };
    });

    await page.keyboard.press('Escape');
    await page.mouse.up();
    page.off('request', onReq);
    await page.waitForTimeout(250);

    assert.equal(apiCallsDuringDrag, 0, `Expected 0 API POST calls during drag, got ${apiCallsDuringDrag}`);
    assert.equal(dragMetrics.gbcrCalls, 0, `Expected 0 getBoundingClientRect calls inside drag rAF, got ${dragMetrics.gbcrCalls}`);
    assert.equal(dragMetrics.guideVisible, true, `Expected vertical snap guide to appear (stationary left edge must not hijack E snap!)`);
    assert.ok(dragMetrics.arcCount >= 4 && dragMetrics.arcGapPx <= 3, `Expected dynamic arc paths to track resized outline within 3px, got count=${dragMetrics.arcCount} gap=${dragMetrics.arcGapPx.toFixed(2)}px`);
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
    await shortBox.dispatchEvent('click');
    const eastHandleLoc = page.locator('button[aria-label="Resize width from right"]');
    await eastHandleLoc.waitFor({ state: 'detached', timeout: 5000 });
    assert.equal(await eastHandleLoc.count(), 0, 'E handle must be hidden when zoomed screenHeight=35px < 40px');
    assert.equal(await page.locator('button[aria-label="Resize width from bottom right"]').count(), 1, 'SE corner handle must still be visible');
    await zoomSelect.selectOption('1');
    await eastHandleLoc.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await eastHandleLoc.count(), 1, 'E handle must reappear at 1.0x zoom (70px >= 40px)');
    console.log('   ✅ [PASS] Zoom-dependent handle suppression verified at 0.5x vs 1.0x');

    // 4. Verify Shift aspect ratio & Alt center resize on #geom-box at 1.0x zoom
    console.log('4. Checking Shift aspect lock + Alt center symmetry in live editor...');
    await targetBox.scrollIntoViewIfNeeded();
    await targetBox.dispatchEvent('click');
    await eastHandleLoc.waitFor({ state: 'visible', timeout: 5000 });
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

    // 5. Verify oriented Quad SVG chrome & local-axis resize on 30deg rotated element
    console.log('5. Checking oriented Quad SVG chrome and rotated local-axis resize...');
    const rotatedBox = iframe.locator('#geom-rotated').first();
    await rotatedBox.scrollIntoViewIfNeeded();
    await rotatedBox.dispatchEvent('click');
    const orientedSel = page.locator('[aria-label="Selected source element"][data-selection-oriented="true"]');
    await orientedSel.waitFor({ state: 'visible', timeout: 5000 });

    const quadInfo = await page.evaluate(() => {
      const pathEl = document.querySelector('[aria-label="Selected source element"] path[class*="outlineAccent"]');
      const d = pathEl?.getAttribute('d') || '';
      const nums = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
      const nwBtn = document.querySelector('button[aria-label="Resize width from top left"]') as HTMLElement | null;
      const seBtn = document.querySelector('button[aria-label="Resize width from bottom right"]') as HTMLElement | null;
      const eBtn = document.querySelector('button[aria-label="Resize width from right"]') as HTMLElement | null;
      const frameEl = document.querySelector('iframe[title="Actual project"]') as HTMLIFrameElement;
      const rotEl = frameEl.contentDocument!.getElementById('geom-rotated')!;
      const rotAabb = rotEl.getBoundingClientRect();
      const frameBox = frameEl.getBoundingClientRect();
      const nwRect = nwBtn?.getBoundingClientRect();
      const seRect = seBtn?.getBoundingClientRect();
      const gripBtn = document.querySelector('button[aria-label="Adjust corner radius"]') as HTMLElement | null;
      const gripRect = gripBtn?.getBoundingClientRect();
      return {
        d,
        coordCount: nums.length,
        topEdgeSlopeY: nums.length >= 4 ? Math.abs(nums[3] - nums[1]) : 0,
        eCursor: eBtn?.style.cursor || '',
        actualScreenSpanX: seRect && nwRect ? Math.abs(seRect.left - nwRect.left) : 0,
        expectedTopLeftScreenX: frameBox.left + rotAabb.left,
        expectedTopLeftScreenY: frameBox.top + rotAabb.top,
        aabbWidth: rotAabb.width,
        aabbHeight: rotAabb.height,
        nwCenterX: nwRect ? nwRect.left + nwRect.width / 2 : 0,
        nwCenterY: nwRect ? nwRect.top + nwRect.height / 2 : 0,
        gripCenterX: gripRect ? gripRect.left + gripRect.width / 2 : 0,
        gripCenterY: gripRect ? gripRect.top + gripRect.height / 2 : 0,
        gripPresent: Boolean(gripRect),
      };
    });
    assert.ok(quadInfo.coordCount >= 8, `Oriented SVG outline must emit 4-corner polygon path, got "${quadInfo.d}"`);
    assert.ok(quadInfo.topEdgeSlopeY > 30, `30deg rotated 160px top edge must drop >30px in Y across quad, got ${quadInfo.topEdgeSlopeY}`);
    assert.equal(quadInfo.eCursor, 'nwse-resize', `East handle rotated +30deg must use nwse-resize cursor, got "${quadInfo.eCursor}"`);
    assert.ok(quadInfo.aabbWidth > 170 && quadInfo.aabbHeight > 140, `Expected expanded rotated AABB >170x140, got ${quadInfo.aabbWidth}x${quadInfo.aabbHeight}`);
    assert.ok(quadInfo.gripPresent, 'Expected corner radius grip on rotated card');
    assert.ok(
      quadInfo.gripCenterX > quadInfo.nwCenterX &&
        quadInfo.gripCenterY > quadInfo.nwCenterY &&
        Math.hypot(quadInfo.gripCenterX - quadInfo.nwCenterX, quadInfo.gripCenterY - quadInfo.nwCenterY) <= 26,
      `Rotated radius grip must sit inside rotated nw corner, got grip=(${quadInfo.gripCenterX.toFixed(1)}, ${quadInfo.gripCenterY.toFixed(1)}) vs nw=(${quadInfo.nwCenterX.toFixed(1)}, ${quadInfo.nwCenterY.toFixed(1)})`
    );

    // Drag rotated East handle +40px along its +30deg local X axis -> W becomes 200px, H remains 80px
    const rotEBox = await page.locator('button[aria-label="Resize width from right"]').boundingBox();
    assert.ok(rotEBox);
    const reX = rotEBox.x + rotEBox.width / 2;
    const reY = rotEBox.y + rotEBox.height / 2;
    await page.mouse.move(reX, reY);
    await page.mouse.down();
    await page.mouse.move(reX + 40 * Math.cos((30 * Math.PI) / 180), reY + 40 * Math.sin((30 * Math.PI) / 180), { steps: 4 });
    await page.waitForTimeout(100);
    const rotCursorText = (await page.locator('[class*="cursorTag"]').textContent()) || '';
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await page.waitForTimeout(200);
    assert.ok(rotCursorText.includes('W: 200px') && rotCursorText.includes('H: 80px'), `Expected rotated local resize ~W: 200px x H: 80px, got "${rotCursorText}"`);
    console.log(`   ✅ [PASS] Oriented quad topEdgeSlopeY=${quadInfo.topEdgeSlopeY.toFixed(1)}px, cursor=${quadInfo.eCursor}, localResize="${rotCursorText}"`);

    // 6. Verify editing window panel clearance against resting bottom dock
    console.log('6. Checking floating slide-over panel clearance against bottom command dock...');
    await iframe.locator('main').click({ position: { x: 10, y: 10 } }).catch(() => {});
    await page.locator('[data-editor-canvas]').click({ position: { x: 20, y: 20 } }).catch(() => {});
    await page.locator('button[aria-label="Move editing toolbar"]').focus();
    await page.keyboard.press('Home');
    await page.waitForTimeout(200);
    await page.locator('button[aria-label="Toggle layers"]').click();
    await page.locator('[data-editor-rail="left"] button[aria-label="Layers"]').click();
    const layersPanel = page.locator('[data-editor-panel="layers"]');
    await layersPanel.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(220);
    const panelBox = await layersPanel.boundingBox();
    const dockBox = await page.locator('header[aria-label="Editor toolbar"]').boundingBox();
    assert.ok(panelBox && dockBox, 'Expected visible layers panel and editor toolbar dock');
    assert.ok(panelBox.y >= 12 && panelBox.y <= 32, `Expected clean top studio margin (12..32px), got y=${panelBox.y}`);
    assert.ok(panelBox.y + panelBox.height <= dockBox.y - 4, `Layers panel must clear bottom dock without overlap (${panelBox.y + panelBox.height} vs ${dockBox.y})`);
    await page.locator('button[aria-label="Close layers"]').click();
    console.log(`   ✅ [PASS] Floating panel top=${panelBox.y.toFixed(0)}px bottom=${(panelBox.y + panelBox.height).toFixed(0)}px clears dock=${dockBox.y.toFixed(0)}px`);

    // 7. Verify cross-origin fallback when iframe contentDocument is inaccessible (returns null)
    console.log('7. Testing cross-origin selection.transformChain fallback when iframe.contentDocument returns null...');
    await page.evaluate(() => {
      const iframeEl = document.querySelector('iframe[title="Actual project"]') as HTMLIFrameElement | null;
      if (!iframeEl) throw new Error('Missing preview iframe');
      Object.defineProperty(iframeEl, 'contentDocument', {
        get: Function('return null') as () => null,
        configurable: true,
      });
    });
    await iframe.locator('#geom-short').first().click({ force: true });
    await page.waitForTimeout(200);
    await iframe.locator('#geom-rotated').first().click({ force: true });
    await page.waitForTimeout(350);

    const xoQuadInfo = await page.evaluate(() => {
      const iframeEl = document.querySelector('iframe[title="Actual project"]') as HTMLIFrameElement | null;
      const docBlocked = iframeEl?.contentDocument === null;
      const box = document.querySelector('[aria-label="Selected source element"]') as HTMLElement | null;
      const path = box?.querySelector('svg path') as SVGPathElement | null;
      const d = path?.getAttribute('d') || '';
      const nums = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      const topEdgeSlopeY = nums.length >= 4 ? Math.abs(nums[3] - nums[1]) : 0;
      const eBtn = box?.querySelector('button[aria-label="Resize width from right"]') as HTMLElement | null;
      const eCursor = eBtn ? getComputedStyle(eBtn).cursor : '';
      return { docBlocked, d, coordCount: nums.length, topEdgeSlopeY, eCursor };
    });
    assert.equal(xoQuadInfo.docBlocked, true, 'Expected iframe.contentDocument to simulate cross-origin null');
    assert.ok(xoQuadInfo.coordCount >= 8, `Cross-origin oriented SVG outline must emit 4-corner quad path, got "${xoQuadInfo.d}"`);
    assert.ok(xoQuadInfo.topEdgeSlopeY > 30, `Cross-origin rotated quad top edge must drop >30px, got ${xoQuadInfo.topEdgeSlopeY}`);
    assert.equal(xoQuadInfo.eCursor, 'nwse-resize', `Cross-origin rotated East handle must keep nwse-resize cursor, got "${xoQuadInfo.eCursor}"`);

    const xoEBox = await page.locator('button[aria-label="Resize width from right"]').boundingBox();
    assert.ok(xoEBox, 'Expected visible East handle under cross-origin fallback');
    const xoX = xoEBox.x + xoEBox.width / 2;
    const xoY = xoEBox.y + xoEBox.height / 2;
    await page.mouse.move(xoX, xoY);
    await page.mouse.down();
    await page.mouse.move(xoX + 40 * Math.cos((30 * Math.PI) / 180), xoY + 40 * Math.sin((30 * Math.PI) / 180), { steps: 4 });
    await page.waitForTimeout(100);
    const xoCursorText = (await page.locator('[class*="cursorTag"]').textContent()) || '';
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await page.waitForTimeout(150);
    assert.ok(xoCursorText.includes('W: 200px') && xoCursorText.includes('H: 80px'), `Expected cross-origin rotated local resize ~W: 200px x H: 80px, got "${xoCursorText}"`);
    console.log(`   ✅ [PASS] Cross-origin fallback rendered oriented quad (slope=${xoQuadInfo.topEdgeSlopeY.toFixed(1)}px) & rotated resize "${xoCursorText}"`);

    // 8. True cross-origin postMessage bridge test (http://127.0.0.1 vs http://localhost): transformChain + maxWidth >= 1
    console.log('8. Verifying live cross-origin bridge transformChain oracle & small maxWidth gesture...');
    const xoPage = await context.newPage();
    const xoParentOrigin = 'http://127.0.0.1:46141';
    const xoFrameOrigin = 'http://localhost:46141';
    const frameHtml = `<!doctype html><html><body style="margin:0;padding:0;">
      <div id="wrap" style="transform:translate(40px,24px) scale(1.25);transform-origin:0 0;overflow:auto;width:300px;height:180px;">
        <div style="height:250px;padding-top:20px;">
          <div id="xo-rot" data-source-file="xo.tsx" data-source-line="10" data-source-column="3" style="width:140px;height:60px;margin-left:30px;margin-top:35px;transform:rotate(30deg);">Rotated XO</div>
          <div id="xo-tiny" data-source-file="xo.tsx" data-source-line="11" data-source-column="3" style="width:10px;height:10px;max-width:40px;">Tiny</div>
        </div>
      </div>
      <script>window.__slightnudge_hydrated = true; document.getElementById('wrap').scrollTop = 25;</script>
      <script>${getSourceCanvasBridge(true, 'repo-xo')}</script>
    </body></html>`;
    await xoPage.route(`${xoParentOrigin}/**`, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html><body style="margin:0;">
          <script>
            window.__msgs = [];
            window.addEventListener('message', (e) => { if (e.data?.channel === 'slightnudge') window.__msgs.push(e.data); });
          </script>
          <iframe src="${xoFrameOrigin}/frame?__slightnudge_session=xo&__slightnudge_parent=${encodeURIComponent(xoParentOrigin)}" style="width:600px;height:400px;border:0;"></iframe>
        </body></html>`,
      })
    );
    await xoPage.route(`${xoFrameOrigin}/**`, (route) => route.fulfill({ contentType: 'text/html', body: frameHtml }));
    await xoPage.goto(xoParentOrigin, { waitUntil: 'domcontentloaded' });
    await xoPage.waitForFunction(() => (window as any).__msgs.some((m: any) => m.type === 'bridge-ready'), undefined, { timeout: 5000 });
    await xoPage.evaluate(() => {
      const f = document.querySelector('iframe')!;
      f.contentWindow!.postMessage({ channel: 'slightnudge', session: 'xo', type: 'bridge-ack' }, 'http://localhost:46141');
    });

    const xoIsBlocked = await xoPage.evaluate(() => {
      try {
        return document.querySelector('iframe')!.contentDocument === null;
      } catch {
        return true;
      }
    });
    assert.equal(xoIsBlocked, true, 'Cross-origin iframe must block parent contentDocument access');

    const xoFrame = xoPage.frameLocator('iframe');
    await xoFrame.locator('#xo-rot').click({ force: true });
    await xoPage.waitForFunction(() => (window as any).__msgs.some((m: any) => m.type === 'source-selection' && m.selection?.transformChain?.length), undefined, { timeout: 5000 });

    const { selectionChain, actualRect } = await xoPage.evaluate(async () => {
      const selMsg = [...(window as any).__msgs].reverse().find((m: any) => m.type === 'source-selection' && m.selection);
      const iframeRect = document.querySelector('iframe')!.getBoundingClientRect();
      return {
        selectionChain: selMsg.selection.transformChain,
        actualRect: {
          left: selMsg.selection.rect.left + iframeRect.left,
          top: selMsg.selection.rect.top + iframeRect.top,
          width: selMsg.selection.rect.width,
          height: selMsg.selection.rect.height,
        },
        relRect: selMsg.selection.rect,
      };
    });
    assert.ok(Array.isArray(selectionChain) && selectionChain.length >= 3, 'Expected full ancestor transformChain from cross-origin iframe');
    const hydrated = hydrateSerializedTransformChain(selectionChain);
    const predicted = predictElementScreenRect(hydrated, { originX: 0, originY: 0, panX: 0, panY: 0, zoom: 1 }).bounds;
    const bridgeRel = await xoPage.evaluate(() => {
      const selMsg = [...(window as any).__msgs].reverse().find((m: any) => m.type === 'source-selection' && m.selection);
      return selMsg.selection.rect;
    });
    const maxErr = Math.max(
      Math.abs(predicted.left - bridgeRel.left),
      Math.abs(predicted.top - bridgeRel.top),
      Math.abs(predicted.width - bridgeRel.width),
      Math.abs(predicted.height - bridgeRel.height)
    );
    assert.ok(maxErr <= 0.5, `Cross-origin transformChain prediction must match DOM rect within 0.5px, got err=${maxErr}px (pred=${JSON.stringify(predicted)}, actual=${JSON.stringify(bridgeRel)})`);

    // Verify small maxWidth gesture (< 24px legacy floor) succeeds cleanly over cross-origin bridge
    await xoFrame.locator('#xo-tiny').click({ force: true });
    await xoPage.waitForFunction(() => (window as any).__msgs.filter((m: any) => m.type === 'source-selection').length >= 2, undefined, { timeout: 5000 });
    await xoPage.evaluate(() => {
      const tinySel = [...(window as any).__msgs].reverse().find((m: any) => m.type === 'source-selection')?.selection;
      const f = document.querySelector('iframe')!;
      f.contentWindow!.postMessage({ channel: 'slightnudge', session: 'xo', requestId: 'g-small', type: 'source-edit', operation: 'gesture', selection: tinySel, maxWidth: 12 }, 'http://localhost:46141');
    });
    await xoPage.waitForFunction(() => (window as any).__msgs.some((m: any) => m.type === 'edit-result' && m.requestId === 'g-small'), undefined, { timeout: 5000 });
    const tinyResult = await xoPage.evaluate(() => (window as any).__msgs.find((m: any) => m.type === 'edit-result' && m.requestId === 'g-small'));
    assert.equal(tinyResult.success, true, `Small-element gesture command failed: ${tinyResult.reason}`);
    assert.equal(tinyResult.selection.computed.maxWidth, '12px', `Expected maxWidth updated to 12px (<24px), got ${tinyResult.selection.computed.maxWidth}`);
    await xoPage.close();
    console.log(`   ✅ [PASS] Live cross-origin bridge transformChain err=${maxErr.toFixed(3)}px & tiny maxWidth=12px`);

    // 9. Repeated same-origin Move drag persistence: no custom-transform error, no height=0 collapse, no overlay/element desync
    console.log('9. Checking consecutive same-origin Move drags keep overlay synced & persist cleanly...');
    const movePage = await context.newPage();
    await movePage.goto(`${baseUrl}/editor?view=fit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await movePage.locator('[data-source-ready="true"]').waitFor({ state: 'attached', timeout: 60000 });
    await movePage.locator('select[aria-label="Canvas zoom"]').first().selectOption('1');
    await movePage.waitForTimeout(400);

    const moveIframe = movePage.frameLocator('iframe[title="Actual project"]');
    const heading = moveIframe.locator('#target').first();
    await heading.scrollIntoViewIfNeeded();
    await heading.click({ force: true });
    await movePage.locator('[aria-label="Selected source element"]').waitFor({ state: 'visible', timeout: 15000 });
    await movePage.waitForTimeout(250);

    const moveBtn1 = await movePage.locator('button[aria-label="Move element"]').boundingBox();
    assert.ok(moveBtn1, 'Expected Move handle for heading');
    const preview1Promise = movePage.waitForResponse(
      (res) => res.url().includes('/api/slightnudge/preview') && res.request().method() === 'POST' && Boolean(res.request().postData()?.includes('"kind":"move"')),
      { timeout: 15000 }
    );
    await movePage.mouse.move(moveBtn1.x + moveBtn1.width / 2, moveBtn1.y + moveBtn1.height / 2);
    await movePage.mouse.down();
    await movePage.mouse.move(moveBtn1.x + moveBtn1.width / 2 - 20, moveBtn1.y + moveBtn1.height / 2 - 48, { steps: 8 });
    await movePage.waitForTimeout(150);
    await movePage.mouse.up();
    const preview1Res = await preview1Promise;
    assert.equal(preview1Res.status(), 200);
    await movePage.waitForTimeout(1000);

    const afterDrag1Toast = await movePage.locator('[role="status"][aria-label="Editor notice"]').textContent().catch(() => null);
    assert.ok(
      !afterDrag1Toast || !afterDrag1Toast.includes('custom or animated transform'),
      `Move drop must not trigger custom-transform error toast, got "${afterDrag1Toast}"`
    );
    const h1Box1 = await heading.boundingBox();
    const selBox1 = await movePage.locator('[aria-label="Selected source element"]').boundingBox();
    assert.ok(h1Box1 && selBox1, 'Expected visible heading and selection chrome after Move 1');
    assert.ok(selBox1.height >= 16, `Selection overlay height must not collapse after drop, got ${selBox1.height}`);
    const err1 = Math.max(Math.abs(h1Box1.x - selBox1.x), Math.abs(h1Box1.y - selBox1.y));
    assert.ok(err1 <= 2.5, `Heading and green box must stay synced after Move 1 drop (err=${err1.toFixed(1)}px, h1=${JSON.stringify(h1Box1)}, sel=${JSON.stringify(selBox1)})`);
    const classesAfter1 = (await heading.getAttribute('class')) || '';
    const styleAfter1 = (await heading.getAttribute('style')) || '';
    assert.ok(classesAfter1.includes('translate-y-[-48px]'), `Expected persisted translate-y-[-48px] class, got "${classesAfter1}"`);
    assert.ok(!styleAfter1.includes('translate'), `Expected no orphaned inline style.translate, got "${styleAfter1}"`);

    // Second Move drag from the new position (+24px down, +12px right -> Y=-24px)
    const moveBtn2 = await movePage.locator('button[aria-label="Move element"]').boundingBox();
    assert.ok(moveBtn2, 'Expected Move handle before Move 2');
    const preview2Promise = movePage.waitForResponse(
      (res) => res.url().includes('/api/slightnudge/preview') && res.request().method() === 'POST' && Boolean(res.request().postData()?.includes('"kind":"move"')),
      { timeout: 15000 }
    );
    await movePage.mouse.move(moveBtn2.x + moveBtn2.width / 2, moveBtn2.y + moveBtn2.height / 2);
    await movePage.mouse.down();
    await movePage.mouse.move(moveBtn2.x + moveBtn2.width / 2 + 12, moveBtn2.y + moveBtn2.height / 2 + 24, { steps: 8 });
    await movePage.waitForTimeout(150);
    const midH1 = await heading.boundingBox();
    const midSel = await movePage.locator('[aria-label="Selected source element"]').boundingBox();
    assert.ok(midH1 && midSel);
    const midErr = Math.max(Math.abs(midH1.x - midSel.x), Math.abs(midH1.y - midSel.y));
    assert.ok(midErr <= 2.5, `Heading and green box must move together during Move 2 (err=${midErr.toFixed(1)}px, h1=${JSON.stringify(midH1)}, sel=${JSON.stringify(midSel)})`);
    await movePage.mouse.up();
    await preview2Promise;
    await movePage.waitForTimeout(800);

    const h1Box2 = await heading.boundingBox();
    const selBox2 = await movePage.locator('[aria-label="Selected source element"]').boundingBox();
    assert.ok(h1Box2 && selBox2);
    assert.ok(selBox2.height >= 16, `Selection overlay height collapsed after Move 2: ${selBox2.height}`);
    const err2 = Math.max(Math.abs(h1Box2.x - selBox2.x), Math.abs(h1Box2.y - selBox2.y));
    assert.ok(err2 <= 2.5, `Heading and green box drifted after Move 2 release (err=${err2.toFixed(1)}px)`);
    await movePage.close();
    console.log(`   ✅ [PASS] Consecutive Move drags synced cleanly (err1=${err1.toFixed(1)}px, midErr=${midErr.toFixed(1)}px, err2=${err2.toFixed(1)}px)`);

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
