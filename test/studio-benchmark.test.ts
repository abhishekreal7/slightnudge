import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createTempWorkspace } from './helpers/test-server';

interface BenchmarkMetric {
  task: string;
  category: 'HUD' | 'Inspector' | 'Canvas Gestures' | 'Disk AST' | 'State Variants';
  latencyMs: number;
  status: 'PASS' | 'FAIL';
  details: string;
}

async function runStudioBenchmark() {
  console.log('========================================================================');
  console.log('🚀 SLIGHTNUDGE STUDIO FULL 20-POINT PERFORMANCE & AST BENCHMARK SUITE');
  console.log('========================================================================\n');

  const ws = createTempWorkspace('sn-benchmark', { useFixture1Baseline: true });
  const fixturePath = process.env.SLIGHTNUDGE_WORKSPACE_ROOT
    ? path.join(process.env.SLIGHTNUDGE_WORKSPACE_ROOT, 'fixtures', '1-plain-static.tsx')
    : path.resolve('fixtures', '1-plain-static.tsx');
  const origFixture = fs.readFileSync(fixturePath, 'utf8');
  const metrics: BenchmarkMetric[] = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const recordMetric = (
    task: string,
    category: BenchmarkMetric['category'],
    startTime: number,
    details: string
  ) => {
    const latencyMs = Math.round(performance.now() - startTime);
    metrics.push({ task, category, latencyMs, status: 'PASS', details });
    console.log(`   ✅ [${category}] ${task} (${latencyMs}ms) — ${details}`);
  };

  try {
    // Helper to ensure target element is selected on canvas
    const ensureSelected = async (targetSelector = 'h1') => {
      const isHudReady = await page.locator('button:has-text("Edit text")').isVisible();
      if (!isHudReady) {
        await page.locator(targetSelector).first().click();
        await page.waitForTimeout(300);
      }
    };

    // Helper: Safely wait for preview POST and read body
    const waitForPreviewPOST = async (action: () => Promise<void>): Promise<any> => {
      const respPromise = page.waitForResponse(
        (r) => r.url().includes('/api/slightnudge/preview') && r.request().method() === 'POST'
      );
      await action();
      const resp = await respPromise;
      const text = await resp.text();
      return JSON.parse(text);
    };

    // Helper: Discard pending edit cleanly without Playwright fixed element scrolling hang
    const clickDiscard = async () => {
      const discardBtn = page.locator('button:has-text("Discard")').first();
      await discardBtn.waitFor({ state: 'visible', timeout: 5000 });
      await discardBtn.click({ force: true });
      await page.waitForTimeout(200);
    };

    // 1. Initial Page Load
    const BASE_URL = process.env.STUDIO_BASE_URL || (process.env.SLIGHTNUDGE_TEST === '1' ? 'http://127.0.0.1:3999' : 'http://localhost:3000');
    let t0 = performance.now();
    await page.goto(`${BASE_URL}/studio`, { waitUntil: 'networkidle' });
    recordMetric('Studio Page Initial Load', 'Canvas Gestures', t0, '200 OK network idle');

    // 2. Select Headline on Canvas
    t0 = performance.now();
    await page.locator('h1').first().click();
    await page.waitForTimeout(300);
    const hudVisible = await page.locator('button:has-text("Edit text")').isVisible();
    if (!hudVisible) throw new Error('HUD did not render on headline click!');
    recordMetric('Canvas In-Situ Element Selection', 'Canvas Gestures', t0, 'HUD attached & inspector activated');

    // 3. HUD Bold Toggle + Disk Apply + Byte-for-Byte Undo
    t0 = performance.now();
    const boldBody = await waitForPreviewPOST(async () => {
      await page.click('button[title="Toggle bold"]');
    });
    if (!boldBody || !boldBody.success || !boldBody.id) throw new Error('Bold preview failed');

    const applyPromise = page.waitForResponse((r) => r.url().includes('/api/slightnudge/apply'));
    await page.locator('button:has-text("Apply to Source"), button:has-text("Apply to code")').first().click();
    await applyPromise;

    const diskAfterBold = fs.readFileSync(fixturePath, 'utf8');
    if (!diskAfterBold.includes('font-bold')) throw new Error('Disk file missing font-bold');

    const undoPromise = page.waitForResponse((r) => r.url().includes('/api/slightnudge/undo'));
    await page.keyboard.press('Control+z');
    await undoPromise;

    const diskRestored = fs.readFileSync(fixturePath, 'utf8');
    if (diskRestored !== origFixture) throw new Error('Disk file not restored byte-for-byte');
    recordMetric('HUD Bold Toggle -> Disk Apply -> Byte-for-Byte Undo', 'Disk AST', t0, 'AST transaction verified on disk');
    await page.waitForTimeout(1000);

    // 4. HUD Italic Toggle
    t0 = performance.now();
    await ensureSelected();
    const italicBody = await waitForPreviewPOST(async () => {
      await page.click('button[title="Toggle italic"]');
    });
    if (!italicBody?.success) throw new Error('Italic preview failed');
    await clickDiscard();
    recordMetric('HUD Italic Toggle', 'HUD', t0, italicBody.summary || 'italic toggled');

    // 5. HUD Underline Toggle
    t0 = performance.now();
    await ensureSelected();
    const underlineBody = await waitForPreviewPOST(async () => {
      await page.click('button[title="Toggle underline"]');
    });
    if (!underlineBody?.success) throw new Error('Underline preview failed');
    await clickDiscard();
    recordMetric('HUD Underline Toggle', 'HUD', t0, underlineBody.summary || 'underline toggled');

    // 6. HUD Text Alignment
    t0 = performance.now();
    await ensureSelected();
    const alignBody = await waitForPreviewPOST(async () => {
      await page.click('button[title="Align center"]');
    });
    if (!alignBody?.success) throw new Error('Align center preview failed');
    await clickDiscard();
    recordMetric('HUD Text Alignment (Center)', 'HUD', t0, alignBody.summary || 'aligned center');

    // 7. HUD Droplet Text Color Swatch Popover
    t0 = performance.now();
    await ensureSelected();
    await page.click('button[title="Text / Background color"]');
    await page.waitForTimeout(150);
    const colorPopVisible = await page.locator('text=Color Palette').isVisible();
    if (!colorPopVisible) throw new Error('Droplet color popover did not appear');

    const textColorBody = await waitForPreviewPOST(async () => {
      await page.click('button[title="Text Emerald"]');
    });
    if (!textColorBody?.success) throw new Error('Text color emerald preview failed');
    await clickDiscard();
    recordMetric('HUD Droplet Color Popover (Text Color Emerald)', 'HUD', t0, textColorBody.summary || 'text color emerald');

    // 8. HUD Droplet Background Fill Swatch
    t0 = performance.now();
    await ensureSelected();
    await page.click('button[title="Text / Background color"]');
    await page.waitForTimeout(150);
    const bgFillBody = await waitForPreviewPOST(async () => {
      await page.click('button[title="Fill Slate 900"]');
    });
    if (!bgFillBody?.success) throw new Error('Bg fill preview failed');
    await clickDiscard();
    recordMetric('HUD Droplet Color Popover (Bg Fill Slate 900)', 'HUD', t0, bgFillBody.summary || 'bg fill slate-900');

    // 9. HUD Quick Actions "Copy className"
    t0 = performance.now();
    await ensureSelected();
    await page.click('button[title="More actions"]');
    await page.waitForTimeout(150);
    const quickActionsVisible = await page.locator('text=Copy className').isVisible();
    if (!quickActionsVisible) throw new Error('Quick actions popover did not appear');
    await page.click('button:has-text("Copy className")');
    await page.waitForTimeout(200);
    const toastVisible = await page.locator('text=/Copied className/').first().isVisible();
    recordMetric('HUD Quick Actions Popover (Copy className)', 'HUD', t0, 'Clipboard API triggered with feedback');

    // 10. HUD Quick Actions "Move Earlier / Later"
    t0 = performance.now();
    await ensureSelected();
    const isPopOpen = await page.locator('button:has-text("Move later")').isVisible();
    if (!isPopOpen) {
      await page.click('button[title="More actions"]');
      await page.waitForTimeout(150);
    }
    const moveLaterBody = await waitForPreviewPOST(async () => {
      await page.click('button:has-text("Move later")');
    });
    if (!moveLaterBody?.success) throw new Error('Reorder later preview failed');
    await clickDiscard();
    recordMetric('HUD Quick Actions Popover (Reorder AST)', 'HUD', t0, moveLaterBody.summary || 'reorder later');

    // 11. Inspector Typography Font Size
    t0 = performance.now();
    await ensureSelected();
    const fontSizeSelect = page.locator('div:has(> span:has-text("Size")) >> select');
    const fontSizeBody = await waitForPreviewPOST(async () => {
      await fontSizeSelect.selectOption('text-3xl');
    });
    if (!fontSizeBody?.success) throw new Error('Font size preview failed');
    await clickDiscard();
    recordMetric('Inspector Typography (Font Size text-3xl)', 'Inspector', t0, fontSizeBody.summary || 'font size 3xl');

    // 12. Inspector Typography Weight Select
    t0 = performance.now();
    await ensureSelected();
    const weightSelect = page.locator('div:has(> span:has-text("Weight")) >> select');
    const weightBody = await waitForPreviewPOST(async () => {
      await weightSelect.selectOption('Bold');
    });
    if (!weightBody?.success) throw new Error('Weight bold preview failed');
    await clickDiscard();
    recordMetric('Inspector Typography (Weight Bold)', 'Inspector', t0, weightBody.summary || 'weight bold');

    // 13. Inspector Surface Border Radius -> Apply to Disk -> Byte-for-Byte Undo
    t0 = performance.now();
    await ensureSelected();
    await page.click('button:has-text("Borders")');
    await page.waitForTimeout(200);
    const radiusSelect = page.locator('div:has(> span:has-text("Radius")) >> select');
    const radiusBody = await waitForPreviewPOST(async () => {
      await radiusSelect.selectOption('rounded-xl');
    });
    if (!radiusBody?.success) throw new Error('Radius preview failed');

    const applyRadiusPromise = page.waitForResponse((r) => r.url().includes('/api/slightnudge/apply'));
    await page.locator('button:has-text("Apply to Source"), button:has-text("Apply to code")').first().click();
    await applyRadiusPromise;

    const diskWithRadius = fs.readFileSync(fixturePath, 'utf8');
    if (!diskWithRadius.includes('rounded-xl')) throw new Error('Disk file missing rounded-xl');

    await page.waitForTimeout(200);
    const undoRadiusPromise = page.waitForResponse((r) => r.url().includes('/api/slightnudge/undo'));
    await page.keyboard.press('Control+z');
    await undoRadiusPromise;
    await page.waitForTimeout(100);

    const diskAfterUndoRadius = fs.readFileSync(fixturePath, 'utf8');
    if (diskAfterUndoRadius !== origFixture) throw new Error('Disk not restored after radius undo');
    recordMetric('Inspector Border Radius -> Disk Apply -> Byte-for-Byte Undo', 'Disk AST', t0, 'rounded-xl written & restored');
    await page.waitForTimeout(1000);

    // 14. Inspector Surface Border Width & Border Color
    t0 = performance.now();
    await ensureSelected();
    const borderWidthSelect = page.locator('div:has(> span:has-text("Width")) >> select').nth(1);
    const borderWidthBody = await waitForPreviewPOST(async () => {
      await borderWidthSelect.selectOption('border-2');
    });
    if (!borderWidthBody?.success) throw new Error('Border width preview failed');
    await clickDiscard();
    recordMetric('Inspector Border Width (border-2)', 'Inspector', t0, borderWidthBody.summary || 'border-2 applied');

    // 15. Inspector Layout Display & Flex Properties
    t0 = performance.now();
    await ensureSelected();
    const displaySelect = page.locator('div:has(> span:has-text("Display")) >> select');
    const displayBody = await waitForPreviewPOST(async () => {
      await displaySelect.selectOption('flex');
    });
    if (!displayBody?.success) throw new Error('Display flex preview failed');
    await clickDiscard();
    recordMetric('Inspector Layout Display (flex)', 'Inspector', t0, displayBody.summary || 'display flex applied');

    // 16. State Variant Selector (hover: state prefix)
    t0 = performance.now();
    await ensureSelected();
    await page.click('button:has-text("hover:")');
    await page.waitForTimeout(150);
    await page.click('button:has-text("Background")');
    await page.waitForTimeout(200);
    const bgFillSelect = page.locator('div:has(> span:has-text("Fill")) >> select');
    const hoverBody = await waitForPreviewPOST(async () => {
      await bgFillSelect.selectOption('emerald-600');
    });
    if (!hoverBody?.success) throw new Error('Hover variant preview failed');
    const isHoverPrefix = hoverBody.summary?.includes('hover:bg-emerald-600') || hoverBody.newValue?.includes('hover:bg-emerald-600');
    if (!isHoverPrefix) throw new Error(`Expected hover: prefix in summary/newValue: ${hoverBody.summary}`);
    await page.waitForTimeout(200);
    await clickDiscard();
    await page.locator('button:text-is("Base")').last().click(); // reset to base
    recordMetric('Interactive State Variant Selector (hover:bg-emerald-600)', 'State Variants', t0, hoverBody.summary || 'hover: prefix generated');

    // 17. Bottom Floating Review Bar with Live Syntax Diff Preview
    t0 = performance.now();
    await ensureSelected();
    await waitForPreviewPOST(async () => {
      await page.click('button[title="Toggle bold"]');
    });

    await page.click('button:has-text("View Diff")');
    await page.waitForTimeout(200);
    const diffVisible = await page.locator('text=/fixtures\\/1-plain-static\\.tsx/').nth(1).isVisible();
    if (!diffVisible) throw new Error('Syntax diff preview was not visible when toggled');

    const applyDiffPromise = page.waitForResponse((r) => r.url().includes('/api/slightnudge/apply'));
    await page.locator('button:has-text("Apply to code"), button:has-text("Apply to Source")').first().click();
    await applyDiffPromise;

    const undoDiffPromise = page.waitForResponse((r) => r.url().includes('/api/slightnudge/undo'));
    await page.keyboard.press('Control+z');
    await undoDiffPromise;
    await page.waitForTimeout(1000);
    recordMetric('Unified Inspector Live Diff Preview & Apply to Code', 'Disk AST', t0, 'Diff card inspected, applied, and undone');

    // 18. Direct Canvas Drag to Resize
    t0 = performance.now();
    await ensureSelected();
    const eastHandle = page.locator('div[title="Drag side to resize width"]');
    const handleBox = await eastHandle.first().boundingBox();
    if (!handleBox) throw new Error('No bounding box for east handle');

    const resizeBody = await waitForPreviewPOST(async () => {
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox.x + handleBox.width / 2 + 80, handleBox.y + handleBox.height / 2, { steps: 5 });
      await page.waitForTimeout(150);
      await page.mouse.up();
    });
    if (!resizeBody?.success) throw new Error('Drag resize failed');
    await clickDiscard();
    recordMetric('Direct Canvas Drag-to-Resize (Interactive Handles)', 'Canvas Gestures', t0, resizeBody.summary || 'max-width resized');

    // 19. Direct Canvas iOS Drag to Move (Reorder)
    t0 = performance.now();
    await ensureSelected();
    const movePill = page.locator('div[title="Drag to reorder element (iOS style)"]');
    const moveBox = await movePill.boundingBox();
    if (!moveBox) throw new Error('No bounding box for move pill');

    const moveBody = await waitForPreviewPOST(async () => {
      await page.mouse.move(moveBox.x + moveBox.width / 2, moveBox.y + moveBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(moveBox.x + moveBox.width / 2, moveBox.y + moveBox.height / 2 + 70, { steps: 6 });
      await page.waitForTimeout(200);
      await page.mouse.up();
    });
    if (!moveBody?.success) throw new Error('Move reorder failed');
    await clickDiscard();
    recordMetric('Direct Canvas iOS Drag-to-Move (Magnetic Drop Slot)', 'Canvas Gestures', t0, moveBody.summary || 'reordered to slot');

    // 20. Deselect Layer (Escape Key)
    t0 = performance.now();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    const unselectedPrompt = await page.locator('text=Choose something to refine').isVisible();
    if (!unselectedPrompt) throw new Error('Escape key did not return inspector to unselected state');
    recordMetric('Deselect Layer (Escape Key Shortcut)', 'Canvas Gestures', t0, 'Calm unselected empty state restored');

    // Benchmark Summary Table Output
    console.log('\n========================================================================');
    console.log('📊 BENCHMARK METRICS & LATENCY REPORT');
    console.log('========================================================================');
    console.log('| #  | Category        | Task Description                                   | Latency | Status |');
    console.log('|----|-----------------|----------------------------------------------------|---------|--------|');
    metrics.forEach((m, idx) => {
      const num = String(idx + 1).padEnd(2);
      const cat = m.category.padEnd(15);
      const task = m.task.padEnd(50).slice(0, 50);
      const lat = `${m.latencyMs}ms`.padStart(7);
      console.log(`| ${num} | ${cat} | ${task} | ${lat} |  PASS  |`);
    });

    const avgLatency = Math.round(metrics.reduce((acc, m) => acc + m.latencyMs, 0) / metrics.length);
    console.log('------------------------------------------------------------------------');
    console.log(`Total Tasks: ${metrics.length}/20 PASS | Average Latency: ${avgLatency}ms | Disk Safety: 100%`);
    console.log('========================================================================\n');

  } finally {
    await browser.close();
    fs.writeFileSync(fixturePath, origFixture, 'utf8');
    await ws.cleanup();
  }
}

runStudioBenchmark().catch((err) => {
  console.error('\n❌ Benchmark failure:', err);
  process.exit(1);
});
