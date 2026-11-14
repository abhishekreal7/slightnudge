import { chromium } from 'playwright';
import http from 'node:http';
import assert from 'node:assert/strict';
import { findFreePort, createTempWorkspace, startServer } from './run-baseline-benchmark';

const artifactDir = 'C:/Users/abhis/.gemini/antigravity/brain/e731c249-0358-4fe2-984b-aa3b6cd4710b';

async function warmUp(baseUrl: string, route: string, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise<boolean>((resolve) => {
        const req = http.get(new URL(route, baseUrl), (res) => {
          res.resume();
          resolve(Boolean(res.statusCode && res.statusCode < 500));
        });
        req.on('error', () => resolve(false));
      });
      if (ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${baseUrl}${route}`);
}

export async function verifyBugFixes(customBaseUrl?: string) {
  console.log('--- Running verifyBugFixes ---');
  let ws: { wsDir: string; cleanup: () => Promise<void> } | null = null;
  let server: { stop: () => Promise<void> } | null = null;
  let baseUrl = customBaseUrl || process.env.BASE_URL;

  if (!baseUrl) {
    const port = await findFreePort(3980);
    ws = createTempWorkspace('sn-verify-bugs');
    server = await startServer(ws.wsDir, port, 'dev');
    baseUrl = `http://127.0.0.1:${port}`;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  try {
    await warmUp(baseUrl, '/editor');
    await warmUp(baseUrl, '/studio/preview/fixture-1');
    await page.goto(`${baseUrl}/editor`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-source-ready="true"]').waitFor({ state: 'attached', timeout: 60000 });
    await page.waitForTimeout(1000);

    const frameElement = await page.waitForSelector('iframe', { timeout: 30000 });
    const frame = await frameElement.contentFrame();
    if (!frame) throw new Error('No iframe frame found');

    // 1. Select the Hero CTA button ("Start Building for Free")
    const ctaBtn = await frame.waitForSelector('a:has-text("Start Building for Free")', { timeout: 30000 });
    await ctaBtn.click({ force: true });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${artifactDir}/fix_verify_cta_selected.png` });

    const ctaData = await page.evaluate(() => {
      const sel = document.querySelector('[class*="sourceSelection"]');
      const arcs = Array.from(sel?.querySelectorAll('[class*="handleArc"]') || []).map((a) => a.getAttribute('d'));
      const guideV = document.querySelector('[class*="smartGuideV"]') as HTMLElement | null;
      const guideH = document.querySelector('[class*="smartGuideH"]') as HTMLElement | null;
      const handles = Array.from(sel?.querySelectorAll('[data-resize-handle]') || []).map((h) => h.getAttribute('data-resize-handle'));
      return {
        variant: sel?.getAttribute('data-selection-variant'),
        selRect: sel?.getBoundingClientRect(),
        arcCount: arcs.length,
        guideVDisplay: guideV ? guideV.style.display : null,
        guideHDisplay: guideH ? guideH.style.display : null,
        handles,
      };
    });

    console.log('CTA Selection Data:', JSON.stringify(ctaData));
    assert.equal(ctaData.variant, 'arc', 'CTA button must have arc selection variant');
    assert.equal(ctaData.arcCount, 8, 'Arc selection chrome must render 8 corner arc segments');
    assert.equal(ctaData.guideVDisplay, 'none', 'Vertical smart guide must be hidden on selection');
    assert.equal(ctaData.guideHDisplay, 'none', 'Horizontal smart guide must be hidden on selection');
    assert(ctaData.handles.includes('se'), 'Resize handles must include "se" handle');

    // 2. Perform SE handle resize drag
    const seHandle = await page.$('button[aria-label="Resize width from bottom right"]');
    assert(seHandle, 'Expected SE resize handle button on CTA');
    const box = await seHandle.boundingBox();
    assert(box, 'Expected bounding box for SE resize handle');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 60, { steps: 5 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${artifactDir}/fix_verify_cta_dragging.png` });

    const duringDragData = await page.evaluate(() => {
      const guideV = document.querySelector('[class*="smartGuideV"]') as HTMLElement | null;
      const guideH = document.querySelector('[class*="smartGuideH"]') as HTMLElement | null;
      const sel = document.querySelector('[class*="sourceSelection"]');
      return {
        guideVDisplay: guideV ? guideV.style.display : null,
        guideHDisplay: guideH ? guideH.style.display : null,
        selRect: sel?.getBoundingClientRect(),
      };
    });

    console.log('During Drag Data:', JSON.stringify(duringDragData));
    assert.equal(duringDragData.guideVDisplay, 'none', 'Vertical guide must remain none during resize drag');
    assert.equal(duringDragData.guideHDisplay, 'none', 'Horizontal guide must remain none during resize drag');
    assert(duringDragData.selRect && duringDragData.selRect.height >= 40, 'Height must not collapse during corner drag');

    await page.mouse.up();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${artifactDir}/fix_verify_cta_drag_released.png` });

    const postDragData = await page.evaluate(() => {
      const guideV = document.querySelector('[class*="smartGuideV"]') as HTMLElement | null;
      const guideH = document.querySelector('[class*="smartGuideH"]') as HTMLElement | null;
      const sel = document.querySelector('[class*="sourceSelection"]');
      return {
        guideVDisplay: guideV ? guideV.style.display : null,
        guideHDisplay: guideH ? guideH.style.display : null,
        selRect: sel?.getBoundingClientRect(),
      };
    });

    console.log('Post Drag Data:', JSON.stringify(postDragData));
    assert.equal(postDragData.guideVDisplay, 'none', 'Vertical guide must remain none after release');
    assert.equal(postDragData.guideHDisplay, 'none', 'Horizontal guide must remain none after release');
    assert(postDragData.selRect && postDragData.selRect.height >= 40, 'Selection height must not collapse after release');

    // 3. Move drag test
    const moveBtn = await page.$('button[aria-label="Move element"]');
    assert(moveBtn, 'Expected Move handle button');
    const moveBox = await moveBtn.boundingBox();
    assert(moveBox, 'Expected bounding box for Move button');

    await page.mouse.move(moveBox.x + moveBox.width / 2, moveBox.y + moveBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(moveBox.x + moveBox.width / 2 + 80, moveBox.y + moveBox.height / 2 + 90, { steps: 10 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${artifactDir}/move_drag_in_progress_v2.png` });

    const duringMove = await page.evaluate(() => {
      const guideV = document.querySelector('[class*="smartGuideV"]') as HTMLElement | null;
      const guideH = document.querySelector('[class*="smartGuideH"]') as HTMLElement | null;
      return {
        guideVDisplay: guideV ? guideV.style.display : null,
        guideHDisplay: guideH ? guideH.style.display : null,
      };
    });

    console.log('During Move Data:', JSON.stringify(duringMove));
    assert.equal(duringMove.guideVDisplay, 'none', 'Vertical guide must stay hidden during move drag');
    assert.equal(duringMove.guideHDisplay, 'none', 'Horizontal guide must stay hidden during move drag');

    await page.mouse.up();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${artifactDir}/move_drag_released_v2.png` });

    const afterMove = await page.evaluate(() => {
      const movePopover = document.getElementById('selection-move-controls');
      const sel = document.querySelector('[class*="sourceSelection"]') as HTMLElement | null;
      const guideV = document.querySelector('[class*="smartGuideV"]') as HTMLElement | null;
      const guideH = document.querySelector('[class*="smartGuideH"]') as HTMLElement | null;
      return {
        movePopoverOpen: Boolean(movePopover),
        selRect: sel?.getBoundingClientRect(),
        guideVDisplay: guideV ? guideV.style.display : null,
        guideHDisplay: guideH ? guideH.style.display : null,
      };
    });

    const btnBox = await ctaBtn.boundingBox();
    console.log('After Move Data:', JSON.stringify({ ...afterMove, btnBox }));
    assert.equal(afterMove.movePopoverOpen, false, 'Move popover should not open automatically on release');
    assert(afterMove.selRect && btnBox, 'Both selection rect and CTA button box must exist');
    assert(Math.abs(afterMove.selRect.top - btnBox.y) <= 4, `Selection top drifted: sel=${afterMove.selRect.top} btn=${btnBox.y}`);
    assert(Math.abs(afterMove.selRect.left - btnBox.x) <= 4, `Selection left drifted: sel=${afterMove.selRect.left} btn=${btnBox.x}`);

    // 4. Test section#overview toolbar stability (jitter <= 1px)
    const sec = await frame.$('section#overview, section');
    if (sec) {
      await sec.click({ position: { x: 500, y: 50 }, force: true });
      await page.waitForTimeout(600);
      const pos: { top: number; left: number }[] = [];
      for (let i = 0; i < 10; i++) {
        const p = await page.evaluate(() => {
          const r = document.querySelector('[role="toolbar"][aria-label="Selection formatting"]')?.getBoundingClientRect();
          return r ? { top: r.top, left: r.left } : null;
        });
        if (p) pos.push(p);
        await page.waitForTimeout(60);
      }
      if (pos.length > 1) {
        const tv = Math.max(...pos.map((x) => x.top)) - Math.min(...pos.map((x) => x.top));
        const lv = Math.max(...pos.map((x) => x.left)) - Math.min(...pos.map((x) => x.left));
        console.log(`Toolbar Jitter: topVar=${tv}px, leftVar=${lv}px`);
        assert(tv <= 1, `Toolbar top jitter exceeded 1px: ${tv}px`);
        assert(lv <= 1, `Toolbar left jitter exceeded 1px: ${lv}px`);
      }
    }

    // 5. Canvas gutter click to clear selection
    await page.click('[data-editor-canvas]', { position: { x: 10, y: 50 } });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${artifactDir}/fix_verify_canvas_clean.png` });

    const cleanData = await page.evaluate(() => {
      const sel = document.querySelector('[class*="sourceSelection"]');
      const guideV = document.querySelector('[class*="smartGuideV"]') as HTMLElement | null;
      const guideH = document.querySelector('[class*="smartGuideH"]') as HTMLElement | null;
      return {
        hasSelection: Boolean(sel),
        guideVDisplay: guideV ? guideV.style.display : null,
        guideHDisplay: guideH ? guideH.style.display : null,
      };
    });

    console.log('Clean Canvas Data:', JSON.stringify(cleanData));
    assert.equal(cleanData.hasSelection, false, 'Canvas gutter click must clear active selection');
    assert.equal(cleanData.guideVDisplay, 'none', 'Guides must be hidden when selection is cleared');
    assert.equal(cleanData.guideHDisplay, 'none', 'Guides must be hidden when selection is cleared');

    assert.equal(errors.length, 0, `Page errors encountered during verification: ${errors.join(', ')}`);
    console.log('--- ALL BUG FIX CHECKS PASSED PERFECTLY ---');
  } finally {
    await browser.close().catch(() => {});
    if (server) await server.stop().catch(() => {});
    if (ws) await ws.cleanup().catch(() => {});
  }
}

if (process.argv[1] && process.argv[1].endsWith('verify-bug-fixes.ts')) {
  verifyBugFixes().catch((err) => {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
  });
}
