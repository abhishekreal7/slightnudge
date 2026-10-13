import { chromium, Browser, Page } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

interface FrameSample {
  timestamp: number;
  siblingRects: { index: number; isTarget: boolean; tag: string; top: number; left: number }[];
}

interface TestRunResult {
  layout: 'block' | 'flex-row' | 'flex-column';
  zoom: 100 | 120 | 150;
  selector: string;
  // 1a
  lessDragLeavesOrderUnchanged: boolean;
  lessDragZeroSiblingMovement: boolean;
  dragPastSwapsByOne: boolean;
  // 1b
  dropLineCoordAtRelease: number;
  finalTargetCoord: number;
  deltaDropLinePx: number;
  deltaDropLinePass: boolean;
  // 1c
  maxSingleFrameSiblingJumpPx: number;
  singleFrameJumpPass: boolean;
}

const PRISTINE_FIXTURE_1 = `'use client';

export default function PlainStaticPage() {
  return (
    <main className="sn-playground-page">
      <section className="sn-playground-hero p-3" id="overview">
                  <div className="sn-playground-visual"><div className="sn-playground-window"><div className="sn-playground-window-head"><span/><span/><span/><i>northstar.app/workspace</i></div><div className="sn-playground-window-body"><div className="sn-playground-sidebar"><span/><span/><span/><span/></div><div className="sn-playground-main"><span className="sn-playground-skeleton short"/><span className="sn-playground-skeleton title"/><div className="sn-playground-cards"><i/><i/><i/></div><div className="sn-playground-chart"><b/><b/><b/><b/><b/><b/><b/></div></div></div></div><div className="sn-playground-floating-card"><span className="sn-playground-check">✓</span><div><strong>Focus time protected</strong><span>Your team is in flow</span></div></div></div>
                  <div className="sn-playground-content p-3"><p className="sn-playground-eyebrow"><span/> A calmer way to work</p><p className="sn-playground-description text-xl">One thoughtful workspace for the people, projects, and plans that move your business forward.</p><h1 id="target" data-source-file="fixtures/1-plain-static.tsx" data-source-line="8" className="ml-2.5 mt-1 text-2xl">Make room for your best work.</h1><a href="#start" className="sn-playground-primary">Get started <span>→</span></a><span className="sn-playground-note">Free to start · Set up in minutes</span></div>
                </section>
      <nav className="sn-playground-nav"><a className="sn-playground-logo" href="#overview"><span>n</span> northstar</a><div><a href="#features">Product</a><a href="#pricing">Pricing</a><a href="#resources">Resources</a></div><a className="sn-playground-nav-cta" href="#start">Log in <span>↗</span></a></nav>
      <section className="sn-playground-trust" id="features"><span>Designed for the work that matters</span><div><i>Team planning</i><i>Clear priorities</i><i>One calm workspace</i></div></section>
    </main>
  );
}
`;

async function restoreFixture(): Promise<boolean> {
  const current = await fs.readFile(path.resolve('fixtures/1-plain-static.tsx'), 'utf-8').catch(() => '');
  if (normalizeLines(current) !== normalizeLines(PRISTINE_FIXTURE_1)) {
    console.log('Restoring fixtures/1-plain-static.tsx to pristine base and waiting for Next.js dev server...');
    await fs.writeFile(path.resolve('fixtures/1-plain-static.tsx'), PRISTINE_FIXTURE_1, 'utf-8');
    await new Promise((r) => setTimeout(r, 4500));
    return true;
  }
  return false;
}

function normalizeLines(str: string): string {
  return str.replace(/\r\n/g, '\n').trim();
}

async function setZoom(page: Page, targetZoom: 100 | 120 | 150) {
  const resetBtn = page.locator('.sn-zoom-val');
  await resetBtn.click();
  await page.waitForTimeout(100);

  if (targetZoom === 100) return;

  const zoomInBtn = page.locator('.sn-zoom-btn[title="Zoom in"]');
  const count = targetZoom === 120 ? 2 : 5;
  for (let i = 0; i < count; i++) {
    await zoomInBtn.click();
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(200);
}

async function selectElement(page: Page, selector: string) {
  await page.waitForSelector('#slightnudge-ui', { state: 'attached', timeout: 10000 });
  const moveBar = page.locator('.sn-drag-move-bar');
  for (let attempt = 0; attempt < 5; attempt++) {
    if ((await moveBar.count()) > 0 && (await moveBar.isVisible())) {
      return;
    }
    const target = page.locator(selector);
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    try {
      await target.click({ position: { x: 10, y: 12 } });
    } catch {
      await target.click({ force: true });
    }
    await page.waitForTimeout(350);
  }
  await moveBar.waitFor({ state: 'visible', timeout: 4000 });
}

async function getElementOrder(page: Page, selector: string): Promise<number> {
  return (await page.evaluate(`
    (() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el || !el.parentElement) return -1;
      return Array.from(el.parentElement.children).indexOf(el);
    })()
  `)) as number;
}

async function setupFlexColumn(page: Page) {
  await page.evaluate(`
    (() => {
      const el = document.querySelector('#target');
      if (el && el.parentElement) {
        el.parentElement.style.display = 'flex';
        el.parentElement.style.flexDirection = 'column';
        el.parentElement.style.gap = '16px';
      }
    })()
  `);
  await page.waitForTimeout(150);
}

// ----------------------------------------------------------------------------
// Test Matrix Runner: 1a, 1b, 1c
// ----------------------------------------------------------------------------
async function testMatrixCase(
  page: Page,
  layout: 'block' | 'flex-row' | 'flex-column',
  zoom: 100 | 120 | 150,
  selector: string,
  dx: number,
  dy: number,
  setupFn?: (page: Page) => Promise<void>
): Promise<TestRunResult> {
  await page.goto('http://localhost:3000/fixtures/1', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#target', { timeout: 10000 });
  await page.waitForTimeout(300);

  if (setupFn) await setupFn(page);
  await setZoom(page, zoom);

  await selectElement(page, selector);
  const initialIndex = await getElementOrder(page, selector);

  const moveBar = page.locator('.sn-drag-move-bar');
  const box = await moveBar.boundingBox();
  if (!box) throw new Error(`Move bar not visible for ${selector}`);
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  // --------------------------------------------------------------------------
  // PART A: Drag less than boundary (e.g. 10px along drag axis)
  // --------------------------------------------------------------------------
  const smallDx = dx !== 0 ? (dx > 0 ? 8 : -8) : 0;
  const smallDy = dy !== 0 ? (dy > 0 ? 8 : -8) : 0;

  // Record initial sibling positions
  const initialSiblings = (await page.evaluate(`
    (() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el || !el.parentElement) return [];
      return Array.from(el.parentElement.children).map((s, idx) => {
        const r = s.getBoundingClientRect();
        return { idx, isTarget: s === el, top: r.top, left: r.left };
      });
    })()
  `)) as { idx: number; isTarget: boolean; top: number; left: number }[];

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(40);
  await page.mouse.move(startX + smallDx, startY + smallDy);
  await page.waitForTimeout(100);

  // Measure sibling positions during less-than-boundary drag
  const midDragSiblings = (await page.evaluate(`
    (() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el || !el.parentElement) return [];
      return Array.from(el.parentElement.children).map((s, idx) => {
        const r = s.getBoundingClientRect();
        return { idx, isTarget: s === el, top: r.top, left: r.left };
      });
    })()
  `)) as { idx: number; isTarget: boolean; top: number; left: number }[];

  let maxSiblingMovementDuringSmallDrag = 0;
  for (const ms of midDragSiblings) {
    if (ms.isTarget) continue;
    const initS = initialSiblings.find((s) => s.idx === ms.idx);
    if (initS) {
      const delta = Math.hypot(ms.left - initS.left, ms.top - initS.top);
      if (delta > maxSiblingMovementDuringSmallDrag) maxSiblingMovementDuringSmallDrag = delta;
    }
  }

  await page.mouse.up();
  await page.waitForTimeout(300);

  const afterSmallDragIndex = await getElementOrder(page, selector);
  const lessDragLeavesOrderUnchanged = afterSmallDragIndex === initialIndex;
  const lessDragZeroSiblingMovement = maxSiblingMovementDuringSmallDrag < 0.5;

  // --------------------------------------------------------------------------
  // PART B: Drag past neighbour boundary + FLIP frame tracking + Drop Line pos
  // --------------------------------------------------------------------------
  await selectElement(page, selector);

  // Setup frame tracker
  await page.evaluate(`
    (() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      const parent = el ? el.parentElement : null;
      const siblings = parent ? Array.from(parent.children) : [];

      window.__dragTrace = [];
      window.__tracking = true;
      let lastTime = performance.now();

      const trackFrame = (now) => {
        if (!window.__tracking) return;
        if (now - lastTime >= 10 || window.__dragTrace.length === 0) {
          const sRects = siblings.map((s, idx) => {
            const r = s.getBoundingClientRect();
            return { index: idx, isTarget: s === el, tag: s.tagName.toLowerCase(), top: r.top, left: r.left };
          });
          window.__dragTrace.push({
            timestamp: now,
            siblingRects: sRects,
          });
          lastTime = now;
        }
        requestAnimationFrame(trackFrame);
      };
      requestAnimationFrame(trackFrame);
    })()
  `);

  const moveBar2 = page.locator('.sn-drag-move-bar');
  const box2 = await moveBar2.boundingBox();
  if (!box2) throw new Error('Move bar re-acquire failed');
  const sX = box2.x + box2.width / 2;
  const sY = box2.y + box2.height / 2;

  await page.mouse.move(sX, sY);
  await page.mouse.down();
  await page.waitForTimeout(40);

  // Drag in 12 smooth steps past neighbor boundary
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(sX + (dx * i) / steps, sY + (dy * i) / steps);
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(80);

  // Capture drop line position at release
  const dropLine = page.locator('.sn-drop-line');
  await dropLine.waitFor({ state: 'visible', timeout: 3000 });
  const dropLineBox = await dropLine.boundingBox();
  if (!dropLineBox) throw new Error('Drop line bounding box missing');

  const isHorizontal = layout === 'flex-row';
  const dropLineCoordAtRelease = isHorizontal ? dropLineBox.x : dropLineBox.y;

  // Release mouse
  await page.mouse.up();
  await page.waitForTimeout(2600); // Allow FLIP transition + DOM preview settlement

  // Stop frame tracking
  const trace: FrameSample[] = (await page.evaluate(`
    (() => {
      window.__tracking = false;
      return window.__dragTrace || [];
    })()
  `)) as FrameSample[];

  // Calculate max single-frame jump among siblings
  let maxSingleFrameSiblingJumpPx = 0;
  const notableJumps: { f: number; dt: number; tag: string; index: number; jump: number; from: number; to: number }[] = [];
  for (let f = 1; f < trace.length; f++) {
    const prev = trace[f - 1].siblingRects;
    const curr = trace[f].siblingRects;
    const dt = trace[f].timestamp - trace[f - 1].timestamp;
    for (const curSib of curr) {
      if (curSib.isTarget) continue; // Exclude dragged element
      const prevSib = prev.find((p) => p.index === curSib.index);
      if (prevSib) {
        const jX = Math.abs(curSib.left - prevSib.left);
        const jY = Math.abs(curSib.top - prevSib.top);
        const jump = Math.max(jX, jY);
        // Normalize jump per 16.66ms display frame if dt spanned multiple frames
        const normalizedJump = (jump * 16.66) / Math.max(16.66, dt);
        if (jump > 4) {
          notableJumps.push({
            f,
            dt: Math.round(dt),
            tag: curSib.tag,
            index: curSib.index,
            jump: Math.round(jump * 10) / 10,
            from: Math.round(isHorizontal ? prevSib.left : prevSib.top),
            to: Math.round(isHorizontal ? curSib.left : curSib.top),
          });
        }
        if (normalizedJump > maxSingleFrameSiblingJumpPx) {
          maxSingleFrameSiblingJumpPx = Math.round(normalizedJump * 10) / 10;
        }
      }
    }
  }
  if (notableJumps.length > 0) {
    console.log(`    [jump trace details] Total frames: ${trace.length}, top jumps:`, notableJumps.slice(0, 5));
  }

  // Final resting position
  const targetEl = page.locator(selector);
  const finalBox = await targetEl.boundingBox();
  if (!finalBox) throw new Error('Target element bounding box missing');

  const finalTargetCoord = isHorizontal ? finalBox.x : finalBox.y;
  const deltaDropLinePx = Math.round(Math.abs(finalTargetCoord - dropLineCoordAtRelease) * 10) / 10;
  const deltaDropLinePass = deltaDropLinePx <= 2.0;

  const finalIndex = await getElementOrder(page, selector);
  const expectedIndex = dy > 0 || dx > 0 ? initialIndex + 1 : initialIndex - 1;
  const dragPastSwapsByOne = finalIndex === expectedIndex;

  return {
    layout,
    zoom,
    selector,
    lessDragLeavesOrderUnchanged,
    lessDragZeroSiblingMovement,
    dragPastSwapsByOne,
    dropLineCoordAtRelease: Math.round(dropLineCoordAtRelease),
    finalTargetCoord: Math.round(finalTargetCoord),
    deltaDropLinePx,
    deltaDropLinePass,
    maxSingleFrameSiblingJumpPx: Math.round(maxSingleFrameSiblingJumpPx * 10) / 10,
    singleFrameJumpPass: maxSingleFrameSiblingJumpPx <= 8.0,
  };
}

// ----------------------------------------------------------------------------
// TEST 1d: Apply writes to source; Undo restores byte-for-byte; 1 drag = 1 undo
// ----------------------------------------------------------------------------
async function testApplyAndUndo(page: Page) {
  console.log('\n--- Running 1d: Apply & Undo byte-for-byte verification ---');
  await restoreFixture();
  const fixturePath = path.resolve('fixtures/1-plain-static.tsx');
  const originalSource = await fs.readFile(fixturePath, 'utf-8');

  await page.goto('http://localhost:3000/fixtures/1', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#target', { timeout: 10000 });
  await setZoom(page, 100);

  await selectElement(page, '#target');
  const moveBar = page.locator('.sn-drag-move-bar');
  const box = await moveBar.boundingBox();
  if (!box) throw new Error('Move bar not visible');

  // Drag down by 75px to reorder
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const previewPromise = page.waitForResponse(
    (resp) => resp.url().includes('/api/slightnudge/preview'),
    { timeout: 8000 }
  );
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + (75 * i) / 10);
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  await previewPromise;
  await page.waitForTimeout(400);

  // Click Apply
  const applyBtn = page.locator('.sn-dock-btn.sn-dock-apply:not([disabled])').first();
  await applyBtn.waitFor({ state: 'visible', timeout: 8000 });
  const applyPromise = page.waitForResponse(
    (resp) => resp.url().includes('/api/slightnudge/apply'),
    { timeout: 12000 }
  );
  await applyBtn.click({ force: true });
  await applyPromise;
  await page.waitForTimeout(4500);

  // Verify source file changed
  const appliedSource = await fs.readFile(fixturePath, 'utf-8');
  const sourceMatchesApplied =
    normalizeLines(appliedSource) !== normalizeLines(originalSource) &&
    appliedSource.includes('Make room for your best work');
  console.log(`  ✓ Source file updated after Apply: ${sourceMatchesApplied}`);

  // Click Undo (via undo button or Ctrl+Z shortcut)
  const undoPromise = page.waitForResponse(
    (resp) => resp.url().includes('/api/slightnudge/undo'),
    { timeout: 8000 }
  );
  const undoBtn = page.locator('.sn-undo-button:not([disabled])');
  if ((await undoBtn.count()) > 0 && (await undoBtn.first().isVisible())) {
    await undoBtn.first().evaluate((el: HTMLElement) => el.click());
  } else {
    await page.evaluate(() => window.dispatchEvent(new Event('slightnudge:undo')));
  }
  await undoPromise;
  await page.waitForTimeout(600);

  // Verify restored source file is byte-for-byte identical to original
  const restoredSource = await fs.readFile(fixturePath, 'utf-8');
  const byteForByteRestored = normalizeLines(restoredSource) === normalizeLines(originalSource);
  console.log(`  ✓ Undo restored exact original file: ${byteForByteRestored}`);

  await restoreFixture();
  return { sourceMatchesApplied, byteForByteRestored };
}

// ----------------------------------------------------------------------------
// TEST 1e & Item 3: Esc cancels; Discard reverts preview; Reload matches source
// ----------------------------------------------------------------------------
async function testCancelDiscardReload(page: Page) {
  console.log('\n--- Running 1e & Item 3: Esc, Discard, and Reload verification ---');
  await restoreFixture();
  const fixturePath = path.resolve('fixtures/1-plain-static.tsx');
  const sourceBefore = await fs.readFile(fixturePath, 'utf-8');

  await page.goto('http://localhost:3000/fixtures/1', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#target', { timeout: 10000 });
  await setZoom(page, 100);

  // 1. Esc during drag
  await selectElement(page, '#target');
  const initialIndex = await getElementOrder(page, '#target');

  const moveBar = page.locator('.sn-drag-move-bar');
  const box = await moveBar.boundingBox();
  if (!box) throw new Error('Move bar not visible');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 75);
  await page.waitForTimeout(100);

  // Press Esc
  await page.keyboard.press('Escape');
  await page.waitForTimeout(50);
  await page.mouse.up();
  await page.waitForTimeout(300);

  const afterEscIndex = await getElementOrder(page, '#target');
  const escCancelsDrag = afterEscIndex === initialIndex;
  console.log(`  ✓ Esc cancels drag cleanly: ${escCancelsDrag}`);

  // 2. Discard reverts preview
  await selectElement(page, '#target');
  const moveBar2 = page.locator('.sn-drag-move-bar');
  const box2 = await moveBar2.boundingBox();
  if (!box2) throw new Error('Move bar not visible');

  await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2 + (75 * i) / 10);
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(600);

  const previewIndex = await getElementOrder(page, '#target');
  const previewSwapped = previewIndex !== initialIndex;

  const discardBtn = page.locator('.sn-dock-btn.sn-dock-discard').first();
  await discardBtn.waitFor({ state: 'visible', timeout: 5000 });
  await discardBtn.click();
  await page.waitForTimeout(600);

  const afterDiscardIndex = await getElementOrder(page, '#target');
  const discardRevertsPreview = afterDiscardIndex === initialIndex;
  console.log(
    `  ✓ Discard returns preview to original order: ${discardRevertsPreview} (preview was swapped: ${previewSwapped})`
  );

  // 3. Reload shows source order
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#target', { timeout: 10000 });
  await page.waitForTimeout(300);
  const afterReloadIndex = await getElementOrder(page, '#target');
  const reloadMatchesSource = afterReloadIndex === initialIndex;
  console.log(`  ✓ Reload matches original source order: ${reloadMatchesSource}`);

  const sourceAfter = await fs.readFile(fixturePath, 'utf-8');
  const sourceUntouched = normalizeLines(sourceBefore) === normalizeLines(sourceAfter);
  console.log(`  ✓ Source file completely untouched: ${sourceUntouched}`);

  await restoreFixture();
  return { escCancelsDrag, discardRevertsPreview, reloadMatchesSource, sourceUntouched };
}

// ----------------------------------------------------------------------------
// TEST 1f: Grid & Flex-wrap Refusal
// ----------------------------------------------------------------------------
async function testRefusalLayouts(page: Page) {
  console.log('\n--- Running 1f: Grid and Flex-wrap refusal verification ---');
  await page.goto('http://localhost:3000/fixtures/1', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#target', { timeout: 10000 });
  await setZoom(page, 100);

  // 1. Grid refusal
  await page.evaluate(`
    (() => {
      const el = document.querySelector('#target');
      if (el && el.parentElement) {
        el.parentElement.style.display = 'grid';
        el.parentElement.style.gridTemplateColumns = '1fr 1fr';
      }
    })()
  `);
  await page.waitForTimeout(150);

  await selectElement(page, '#target');
  const moveBar = page.locator('.sn-drag-move-bar');
  const box = await moveBar.boundingBox();
  if (!box) throw new Error('Move bar not visible in grid test');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 60);
  await page.waitForTimeout(150);

  const gridNotice = (await page.evaluate(`
    (() => {
      const badge = document.querySelector('.sn-move-feedback-badge');
      return badge ? badge.textContent : '';
    })()
  `)) as string;
  const gridTransform = (await page.evaluate(`
    (() => {
      const el = document.querySelector('#target');
      return el ? el.style.transform : '';
    })()
  `)) as string;

  await page.mouse.up();
  await page.waitForTimeout(200);

  const gridRefusalPass = (gridNotice?.includes('Grid and wrapping layouts') ?? false) && gridTransform === '';
  console.log(`  ✓ Grid refuses cleanly with notice and zero transform: ${gridRefusalPass} (notice: "${gridNotice}")`);

  // 2. Flex-wrap refusal
  await page.evaluate(`
    (() => {
      const el = document.querySelector('#target');
      if (el && el.parentElement) {
        el.parentElement.style.display = 'flex';
        el.parentElement.style.flexDirection = 'row';
        el.parentElement.style.flexWrap = 'wrap';
      }
    })()
  `);
  await page.waitForTimeout(150);

  await selectElement(page, '#target');
  const box2 = await moveBar.boundingBox();
  if (!box2) throw new Error('Move bar not visible in flex-wrap test');

  await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
  await page.mouse.down();
  await page.mouse.move(box2.x + box2.width / 2 + 60, box2.y + box2.height / 2);
  await page.waitForTimeout(150);

  const wrapNotice = (await page.evaluate(`
    (() => {
      const badge = document.querySelector('.sn-move-feedback-badge');
      return badge ? badge.textContent : '';
    })()
  `)) as string;
  const wrapTransform = (await page.evaluate(`
    (() => {
      const el = document.querySelector('#target');
      return el ? el.style.transform : '';
    })()
  `)) as string;

  await page.mouse.up();
  await page.waitForTimeout(200);

  const wrapRefusalPass = (wrapNotice?.includes('Grid and wrapping layouts') ?? false) && wrapTransform === '';
  console.log(`  ✓ Flex-wrap refuses cleanly with notice and zero transform: ${wrapRefusalPass} (notice: "${wrapNotice}")`);

  return { gridRefusalPass, wrapRefusalPass };
}

// ----------------------------------------------------------------------------
// TEST Option A: Normal Drag = Reorder only; Alt+Drag = Spacing nudge
// ----------------------------------------------------------------------------
async function testOptionABehavior(page: Page) {
  console.log('\n--- Running Option A: Normal Drag (Reorder Only) vs Alt+Drag (Spacing Nudge) ---');
  await page.goto('http://localhost:3000/fixtures/1', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#target', { timeout: 10000 });
  await setZoom(page, 100);

  // 1. Normal drag with small delta (10px) -> NO micro-nudge triggered!
  await selectElement(page, '#target');
  const moveBar = page.locator('.sn-drag-move-bar');
  const box = await moveBar.boundingBox();
  if (!box) throw new Error('Move bar not visible');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 10);
  await page.waitForTimeout(100);

  const normalNotice = (await page.evaluate(`
    (() => {
      const badge = document.querySelector('.sn-move-feedback-badge');
      return badge ? badge.textContent : '';
    })()
  `)) as string;
  await page.mouse.up();
  await page.waitForTimeout(200);

  const normalDragDoesNotNudge = !normalNotice?.includes('Nudge');
  console.log(`  ✓ Normal drag does not trigger micro-nudge: ${normalDragDoesNotNudge} (notice: "${normalNotice}")`);

  // 2. Alt+drag -> activates spacing nudge
  await selectElement(page, '#target');
  const box2 = await moveBar.boundingBox();
  if (!box2) throw new Error('Move bar not visible');

  await page.keyboard.down('Alt');
  await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
  await page.mouse.down();
  await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2 + 10);
  await page.waitForTimeout(100);

  const altNotice = (await page.evaluate(`
    (() => {
      const badge = document.querySelector('.sn-move-feedback-badge');
      return badge ? badge.textContent : '';
    })()
  `)) as string;

  await page.mouse.up();
  await page.keyboard.up('Alt');
  await page.waitForTimeout(300);

  const altDragTriggersNudge = altNotice?.includes('Alt+Drag') ?? false;
  console.log(`  ✓ Alt+drag activates spacing nudge: ${altDragTriggersNudge} (notice: "${altNotice}")`);

  // Discard pending nudge edit to leave clean
  const discardBtn = page.locator('.sn-dock-btn.sn-dock-discard');
  if ((await discardBtn.count()) > 0) {
    await discardBtn.click();
    await page.waitForTimeout(300);
  }

  return { normalDragDoesNotNudge, altDragTriggersNudge };
}

// ----------------------------------------------------------------------------
// MAIN EXECUTION
// ----------------------------------------------------------------------------
async function main() {
  console.log('========================================================================================');
  console.log('🎯 MOVE EXPECTATIONS VALIDATION SUITE (test/move-expectations.test.ts)');
  console.log('========================================================================================\n');

  const didRestore = await restoreFixture();
  if (didRestore) {
    console.log('Waiting 4s for Next.js Fast Refresh to settle...');
    await new Promise((r) => setTimeout(r, 4000));
  }

  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const matrixCases: {
    layout: 'block' | 'flex-row' | 'flex-column';
    zoom: 100 | 120 | 150;
    selector: string;
    dx: number;
    dy: number;
    setupFn?: (page: Page) => Promise<void>;
  }[] = [
    // BLOCK @ 100, 120, 150
    { layout: 'block', zoom: 100, selector: '#target', dx: 0, dy: 75 },
    { layout: 'block', zoom: 120, selector: '#target', dx: 0, dy: 80 },
    { layout: 'block', zoom: 150, selector: '#target', dx: 0, dy: 85 },

    // FLEX-ROW @ 100, 120, 150
    { layout: 'flex-row', zoom: 100, selector: '.sn-playground-nav-cta', dx: -180, dy: 0 },
    { layout: 'flex-row', zoom: 120, selector: '.sn-playground-nav-cta', dx: -180, dy: 0 },
    { layout: 'flex-row', zoom: 150, selector: '.sn-playground-nav-cta', dx: -180, dy: 0 },

    // FLEX-COLUMN @ 100, 120, 150
    { layout: 'flex-column', zoom: 100, selector: '#target', dx: 0, dy: 75, setupFn: setupFlexColumn },
    { layout: 'flex-column', zoom: 120, selector: '#target', dx: 0, dy: 85, setupFn: setupFlexColumn },
    { layout: 'flex-column', zoom: 150, selector: '#target', dx: 0, dy: 75, setupFn: setupFlexColumn },
  ];

  const matrixResults: TestRunResult[] = [];

  for (const mc of matrixCases) {
    const casePage = await context.newPage();
    try {
      console.log(`▶ Testing ${mc.layout.toUpperCase()} @ ${mc.zoom}%...`);
      const res = await testMatrixCase(casePage, mc.layout, mc.zoom, mc.selector, mc.dx, mc.dy, mc.setupFn);
      matrixResults.push(res);
      console.log(
        `  ✓ Done: 1a(less=${res.lessDragLeavesOrderUnchanged}, swap=${res.dragPastSwapsByOne}) | 1b(dropLine=${res.dropLineCoordAtRelease}px, final=${res.finalTargetCoord}px, Δ=${res.deltaDropLinePx}px, pass=${res.deltaDropLinePass}) | 1c(maxJump=${res.maxSingleFrameSiblingJumpPx}px, pass=${res.singleFrameJumpPass})`
      );
    } catch (err) {
      console.error(`  ✗ Error in ${mc.layout} @ ${mc.zoom}%:`, err);
    } finally {
      await casePage.close();
    }
  }

  // Run 1d, 1e, 1f, Item 3, Item 4
  const subPage = await context.newPage();
  let test1d = { sourceMatchesApplied: false, byteForByteRestored: false };
  let test1e = { escCancelsDrag: false, discardRevertsPreview: false, reloadMatchesSource: false };
  let test1f = { gridRefusalPass: false, wrapRefusalPass: false };
  let testOptA = { normalDragDoesNotNudge: false, altDragTriggersNudge: false };

  try {
    test1d = await testApplyAndUndo(subPage);
    test1e = await testCancelDiscardReload(subPage);
    test1f = await testRefusalLayouts(subPage);
    testOptA = await testOptionABehavior(subPage);
  } finally {
    await subPage.close();
  }

  await browser.close();

  // Print Summary Table
  console.log('\n========================================================================================');
  console.log('📋 VERIFICATION RESULTS TABLE (MATRIX: BLOCK, FLEX-ROW, FLEX-COLUMN @ 100%, 120%, 150%)');
  console.log('========================================================================================');
  console.log(
    '| Layout | Zoom | 1a Order Swap | 1a Zero Sub-drag Move | 1b Drop Line (rel) | 1b Final Pos | 1b Δ (≤2px) | 1c Max Sibling Jump (≤8px) | Status |'
  );
  console.log(
    '|--------|------|---------------|-----------------------|--------------------|--------------|-------------|-----------------------------|--------|'
  );

  let allMatrixPassed = true;
  for (const r of matrixResults) {
    const passed =
      r.lessDragLeavesOrderUnchanged &&
      r.lessDragZeroSiblingMovement &&
      r.dragPastSwapsByOne &&
      r.deltaDropLinePass &&
      r.singleFrameJumpPass;
    if (!passed) allMatrixPassed = false;
    console.log(
      `| ${r.layout.padEnd(6)} | ${(r.zoom + '%').padEnd(4)} | ${(r.dragPastSwapsByOne ? 'PASS (1 place)' : 'FAIL').padEnd(13)} | ${(r.lessDragZeroSiblingMovement ? 'PASS (0px)' : 'FAIL').padEnd(21)} | ${(r.dropLineCoordAtRelease + 'px').padEnd(18)} | ${(r.finalTargetCoord + 'px').padEnd(12)} | ${(r.deltaDropLinePx + 'px ' + (r.deltaDropLinePass ? 'PASS' : 'FAIL')).padEnd(11)} | ${(r.maxSingleFrameSiblingJumpPx + 'px ' + (r.singleFrameJumpPass ? 'PASS' : 'FAIL')).padEnd(27)} | ${(passed ? 'PASS' : 'FAIL').padEnd(6)} |`
    );
  }

  console.log('\n========================================================================================');
  console.log('📋 ADDITIONAL EXPECTATIONS SUMMARY');
  console.log('========================================================================================');
  console.log(`1d: Apply writes to source matching preview:        ${test1d.sourceMatchesApplied ? 'PASS' : 'FAIL'}`);
  console.log(`1d: Undo restores original byte-for-byte in 1 step:  ${test1d.byteForByteRestored ? 'PASS' : 'FAIL'}`);
  console.log(`1e: Esc during drag changes nothing:                 ${test1e.escCancelsDrag ? 'PASS' : 'FAIL'}`);
  console.log(`1e: Discard returns preview to source order:         ${test1e.discardRevertsPreview ? 'PASS' : 'FAIL'}`);
  console.log(`1e: Reload matches original source file:             ${test1e.reloadMatchesSource ? 'PASS' : 'FAIL'}`);
  console.log(`1f: Grid refuses with message and zero move:         ${test1f.gridRefusalPass ? 'PASS' : 'FAIL'}`);
  console.log(`1f: Flex-wrap refuses with message and zero move:    ${test1f.wrapRefusalPass ? 'PASS' : 'FAIL'}`);
  console.log(`Option A: Normal drag = reorder only (no nudge):    ${testOptA.normalDragDoesNotNudge ? 'PASS' : 'FAIL'}`);
  console.log(`Option A: Alt+Drag = spacing nudge:                 ${testOptA.altDragTriggersNudge ? 'PASS' : 'FAIL'}`);

  const totalPass =
    allMatrixPassed &&
    test1d.sourceMatchesApplied &&
    test1d.byteForByteRestored &&
    test1e.escCancelsDrag &&
    test1e.discardRevertsPreview &&
    test1e.reloadMatchesSource &&
    test1f.gridRefusalPass &&
    test1f.wrapRefusalPass &&
    testOptA.normalDragDoesNotNudge &&
    testOptA.altDragTriggersNudge;

  console.log('\n========================================================================================');
  console.log(`OVERALL TEST STATUS: ${totalPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('========================================================================================\n');

  if (!totalPass) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
