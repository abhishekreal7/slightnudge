import { chromium, Browser, Page } from 'playwright';

interface FrameSample {
  timestamp: number;
  targetRect: { top: number; left: number; width: number; height: number };
  siblingRects: { index: number; tag: string; top: number; left: number }[];
}

interface DragTestResult {
  layout: 'block' | 'flex-row' | 'flex-column' | 'grid';
  zoom: number; // 100 or 120
  dragDelta: { dx: number; dy: number };
  initialTargetRect: { top: number; left: number };
  expectedTargetRect: { top: number; left: number };
  actualFinalTargetRect: { top: number; left: number };
  positionError: { errX: number; errY: number };
  siblingMovements: { index: number; tag: string; deltaX: number; deltaY: number }[];
  singleFrameJumpsOver8px: { frame: number; tag: string; jumpX: number; jumpY: number }[];
  notice: string | null;
}

async function runDragTest(
  page: Page,
  selector: string,
  dx: number,
  dy: number,
  layout: 'block' | 'flex-row' | 'flex-column' | 'grid',
  zoom: number,
  setupParentLayout?: (page: Page) => Promise<void>
): Promise<DragTestResult> {
  // Navigate fresh to studio fixture
  const BASE_URL = process.env.STUDIO_BASE_URL || (process.env.SLIGHTNUDGE_TEST === '1' ? 'http://127.0.0.1:3999' : 'http://localhost:3000');
  await page.goto(`${BASE_URL}/studio?file=fixtures/1-plain-static.tsx`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#target', { timeout: 10000 });
  await page.waitForTimeout(400);

  // Apply zoom if not 100%
  if (zoom !== 100) {
    if (zoom === 120) {
      const zoomPlus = page.locator('.sn-zoom-btn[title="Zoom in"]');
      if (await zoomPlus.count() > 0) {
        await zoomPlus.click();
        await page.waitForTimeout(100);
        await zoomPlus.click();
        await page.waitForTimeout(200);
      }
    }
  }

  // Optional custom parent layout injection (e.g. flex-column)
  if (setupParentLayout) {
    await setupParentLayout(page);
    await page.waitForTimeout(200);
  }

  // 1. Click element to select it
  const targetLocator = page.locator(selector);
  await targetLocator.scrollIntoViewIfNeeded();
  await targetLocator.click({ force: true });
  await page.waitForTimeout(300);
  try {
    await page.waitForSelector('.sn-drag-move-bar', { timeout: 6000 });
  } catch {
    // Retry click if selection needed another frame
    await targetLocator.click({ force: true });
    await page.waitForSelector('.sn-drag-move-bar', { timeout: 6000 });
  }
  await page.waitForTimeout(200);

  // 2. Setup frame-by-frame tracker in page without esbuild named functions
  await page.evaluate(`
    (() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      const parent = el ? el.parentElement : null;
      const siblings = parent ? Array.from(parent.children) : [];

      window.__dragTrace = [];
      window.__tracking = true;

      const trackFrame = () => {
        if (!window.__tracking) return;
        const tRect = el ? el.getBoundingClientRect() : { top: 0, left: 0, width: 0, height: 0 };
        const sRects = siblings.map((s, idx) => {
          const r = s.getBoundingClientRect();
          return { index: idx, tag: s.tagName.toLowerCase(), top: r.top, left: r.left };
        });
        window.__dragTrace.push({
          timestamp: performance.now(),
          targetRect: { top: tRect.top, left: tRect.left, width: tRect.width, height: tRect.height },
          siblingRects: sRects,
        });
        requestAnimationFrame(trackFrame);
      };
      requestAnimationFrame(trackFrame);
    })()
  `);

  // 3. Record initial rects
  const initialData = await page.evaluate(`
    (() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      const parent = el.parentElement;
      const siblings = Array.from(parent.children);
      const r = el.getBoundingClientRect();
      return {
        target: { top: r.top, left: r.left },
        siblings: siblings.map((s, idx) => {
          const sr = s.getBoundingClientRect();
          return { index: idx, tag: s.tagName.toLowerCase(), top: sr.top, left: sr.left };
        }),
      };
    })()
  `) as { target: { top: number; left: number }; siblings: { index: number; tag: string; top: number; left: number }[] };

  const moveBar = page.locator('.sn-drag-move-bar');
  const moveBox = await moveBar.boundingBox();
  if (!moveBox) throw new Error('Move bar not visible');

  const startX = moveBox.x + moveBox.width / 2;
  const startY = moveBox.y + moveBox.height / 2;

  // 4. Perform drag in discrete steps
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(50);

  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const curX = startX + (dx * i) / steps;
    const curY = startY + (dy * i) / steps;
    await page.mouse.move(curX, curY);
    await page.waitForTimeout(30);
  }

  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(400); // Wait for drop settling and preview DOM update

  // Stop tracking
  await page.evaluate(`window.__tracking = false;`);

  const finalTraceData = await page.evaluate(`
    (() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      const parent = el ? el.parentElement : null;
      const siblings = parent ? Array.from(parent.children) : [];
      const r = el ? el.getBoundingClientRect() : { top: 0, left: 0 };
      const notice = document.querySelector('#slightnudge-nudge-notice') ? document.querySelector('#slightnudge-nudge-notice').textContent : null;
      return {
        trace: window.__dragTrace || [],
        finalTarget: { top: r.top, left: r.left },
        finalSiblings: siblings.map((s, idx) => {
          const sr = s.getBoundingClientRect();
          return { index: idx, tag: s.tagName.toLowerCase(), top: sr.top, left: sr.left };
        }),
        notice,
      };
    })()
  `) as { trace: FrameSample[]; finalTarget: { top: number; left: number }; finalSiblings: { index: number; tag: string; top: number; left: number }[]; notice: string | null };

  // 5. Calculate metrics
  const expectedTargetRect = {
    left: initialData.target.left + dx,
    top: initialData.target.top + dy,
  };
  const actualFinalTargetRect = finalTraceData.finalTarget;
  const positionError = {
    errX: Math.round(actualFinalTargetRect.left - expectedTargetRect.left),
    errY: Math.round(actualFinalTargetRect.top - expectedTargetRect.top),
  };

  // Sibling movement deltas
  const siblingMovements = finalTraceData.finalSiblings.map((fs) => {
    const initS = initialData.siblings.find((is) => is.index === fs.index);
    const dX = initS ? Math.round(fs.left - initS.left) : 0;
    const dY = initS ? Math.round(fs.top - initS.top) : 0;
    return { index: fs.index, tag: fs.tag, deltaX: dX, deltaY: dY };
  });

  // Single-frame jumps over 8px
  const singleFrameJumpsOver8px: { frame: number; tag: string; jumpX: number; jumpY: number }[] = [];
  const trace = finalTraceData.trace || [];
  for (let f = 1; f < trace.length; f++) {
    const prev = trace[f - 1];
    const curr = trace[f];
    const targetJumpX = Math.abs(curr.targetRect.left - prev.targetRect.left);
    const targetJumpY = Math.abs(curr.targetRect.top - prev.targetRect.top);
    if (targetJumpX > 8 || targetJumpY > 8) {
      singleFrameJumpsOver8px.push({
        frame: f,
        tag: 'target',
        jumpX: Math.round(targetJumpX),
        jumpY: Math.round(targetJumpY),
      });
    }

    // Check siblings for instant jump reflows
    for (let s = 0; s < curr.siblingRects.length; s++) {
      const curSib = curr.siblingRects[s];
      const prevSib = prev.siblingRects.find((ps) => ps.index === curSib.index);
      if (prevSib) {
        const sJumpX = Math.abs(curSib.left - prevSib.left);
        const sJumpY = Math.abs(curSib.top - prevSib.top);
        if (sJumpX > 8 || sJumpY > 8) {
          singleFrameJumpsOver8px.push({
            frame: f,
            tag: `${curSib.tag}#${curSib.index}`,
            jumpX: Math.round(sJumpX),
            jumpY: Math.round(sJumpY),
          });
        }
      }
    }
  }

  return {
    layout,
    zoom,
    dragDelta: { dx, dy },
    initialTargetRect: initialData.target,
    expectedTargetRect,
    actualFinalTargetRect,
    positionError,
    siblingMovements,
    singleFrameJumpsOver8px,
    notice: finalTraceData.notice,
  };
}

async function main() {
  console.log('========================================================================');
  console.log('🧪 DIAGNOSTIC PLAYWRIGHT TEST: MOVE/DRAG BEHAVIOR ACROSS 4 LAYOUTS & ZOOMS');
  console.log('========================================================================\n');

  const browser: Browser = await chromium.launch({ headless: true });
  const page: Page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const testCases: {
    layout: 'block' | 'flex-row' | 'flex-column' | 'grid';
    zoom: number;
    selector: string;
    dx: number;
    dy: number;
    setupParent?: (page: Page) => Promise<void>;
  }[] = [
    // 1. BLOCK @ 100%
    {
      layout: 'block',
      zoom: 100,
      selector: '#target',
      dx: 0,
      dy: 60,
    },
    // 2. BLOCK @ 120%
    {
      layout: 'block',
      zoom: 120,
      selector: '#target',
      dx: 0,
      dy: 60,
    },
    // 3. FLEX-ROW @ 100%
    {
      layout: 'flex-row',
      zoom: 100,
      selector: '.sn-playground-nav-cta',
      dx: -140,
      dy: 0,
    },
    // 4. FLEX-ROW @ 120%
    {
      layout: 'flex-row',
      zoom: 120,
      selector: '.sn-playground-nav-cta',
      dx: -140,
      dy: 0,
    },
    // 5. FLEX-COLUMN @ 100%
    {
      layout: 'flex-column',
      zoom: 100,
      selector: '#target',
      dx: 0,
      dy: 60,
      setupParent: async (p) => {
        await p.evaluate(`
          (() => {
            const el = document.querySelector('#target');
            if (el && el.parentElement) {
              el.parentElement.style.display = 'flex';
              el.parentElement.style.flexDirection = 'column';
              el.parentElement.style.gap = '16px';
            }
          })()
        `);
      },
    },
    // 6. FLEX-COLUMN @ 120%
    {
      layout: 'flex-column',
      zoom: 120,
      selector: '#target',
      dx: 0,
      dy: 60,
      setupParent: async (p) => {
        await p.evaluate(`
          (() => {
            const el = document.querySelector('#target');
            if (el && el.parentElement) {
              el.parentElement.style.display = 'flex';
              el.parentElement.style.flexDirection = 'column';
              el.parentElement.style.gap = '16px';
            }
          })()
        `);
      },
    },
    // 7. GRID @ 100%
    {
      layout: 'grid',
      zoom: 100,
      selector: '.sn-playground-content',
      dx: -280,
      dy: 0,
    },
    // 8. GRID @ 120%
    {
      layout: 'grid',
      zoom: 120,
      selector: '.sn-playground-content',
      dx: -280,
      dy: 0,
    },
  ];

  const results: DragTestResult[] = [];

  for (const tc of testCases) {
    try {
      console.log(`▶ Running: layout=${tc.layout}, zoom=${tc.zoom}%, drag=(${tc.dx}, ${tc.dy})...`);
      const res = await runDragTest(page, tc.selector, tc.dx, tc.dy, tc.layout, tc.zoom, tc.setupParent);
      results.push(res);
      console.log(`  ✓ Completed: Error=(dx:${res.positionError.errX}px, dy:${res.positionError.errY}px), Jumps >8px: ${res.singleFrameJumpsOver8px.length}`);
    } catch (err) {
      console.error(`  ✗ Error in ${tc.layout} @ ${tc.zoom}%:`, err instanceof Error ? err.message : err);
    }
  }

  await browser.close();

  console.log('\n========================================================================');
  console.log('📊 MEASURED DIAGNOSTIC DATA REPORT');
  console.log('========================================================================\n');

  for (const r of results) {
    console.log(`------------------------------------------------------------------------`);
    console.log(`Layout: ${r.layout.toUpperCase()} | Zoom: ${r.zoom}% | Drag Delta: (${r.dragDelta.dx}px, ${r.dragDelta.dy}px)`);
    console.log(`Initial Pos:    (${Math.round(r.initialTargetRect.left)}, ${Math.round(r.initialTargetRect.top)})`);
    console.log(`Expected Final: (${Math.round(r.expectedTargetRect.left)}, ${Math.round(r.expectedTargetRect.top)})`);
    console.log(`Actual Final:   (${Math.round(r.actualFinalTargetRect.left)}, ${Math.round(r.actualFinalTargetRect.top)})`);
    console.log(`Position Error: ΔX = ${r.positionError.errX}px, ΔY = ${r.positionError.errY}px`);
    console.log(`Notice / Status: ${r.notice || 'none'}`);
    console.log(`Sibling Movements:`);
    r.siblingMovements.forEach((s) => {
      console.log(`  - [${s.index}] <${s.tag}>: ΔX = ${s.deltaX}px, ΔY = ${s.deltaY}px`);
    });
    console.log(`Single-Frame Jumps > 8px (Harsh Reflows): count = ${r.singleFrameJumpsOver8px.length}`);
    if (r.singleFrameJumpsOver8px.length > 0) {
      r.singleFrameJumpsOver8px.slice(0, 5).forEach((j) => {
        console.log(`  - Frame ${j.frame} (${j.tag}): jumpX = ${j.jumpX}px, jumpY = ${j.jumpY}px`);
      });
      if (r.singleFrameJumpsOver8px.length > 5) {
        console.log(`  - ... and ${r.singleFrameJumpsOver8px.length - 5} more jump frames`);
      }
    }
  }

  console.log('\n========================================================================');
  console.log('🏁 DIAGNOSIS COMPLETE - NUMBERS REPORTED ABOVE');
  console.log('========================================================================\n');
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
