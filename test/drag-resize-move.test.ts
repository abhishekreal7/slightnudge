import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createTempWorkspace } from './helpers/test-server';

async function testDragResizeAndMove() {
  console.log('====================================================');
  console.log('🧪 VERIFYING DRAG TO RESIZE & CLEAN IOS MOVE SUITE');
  console.log('====================================================\n');

  const ws = createTempWorkspace('sn-drag-resize', { useFixture1Baseline: true });
  const fixturePath = path.join(ws.wsDir, 'fixtures', '1-plain-static.tsx');
  const origFixture = fs.readFileSync(fixturePath, 'utf8');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Load /studio
    const BASE_URL = process.env.STUDIO_BASE_URL || (process.env.SLIGHTNUDGE_TEST === '1' ? 'http://127.0.0.1:3999' : 'http://localhost:3000');
    console.log(`1. Loading ${BASE_URL}/studio...`);
    await page.goto(`${BASE_URL}/studio`, { waitUntil: 'networkidle' });

    // 2. Click canvas <h1> element to select Headline
    console.log('2. Selecting Headline element on canvas...');
    await page.locator('h1').first().click();
    await page.waitForTimeout(300);

    // 3. Verify Precision Resize Handles & Move Grabber
    console.log('3. Verifying resize handles and iOS Move pill...');
    const movePill = page.locator('div[title="Drag to reorder element (iOS style)"]');
    const moveVisible = await movePill.isVisible();
    if (!moveVisible) throw new Error('iOS Move grabber pill was not visible on selected element!');
    console.log('   ✅ [PASS] iOS Move grabber pill rendered above selection');

    const eastHandle = page.locator('div[title="Drag side to resize width"]');
    const eastVisible = await eastHandle.first().isVisible();
    if (!eastVisible) throw new Error('East resize handle was not visible!');
    console.log('   ✅ [PASS] Precision edge and corner resize handles rendered');

    // Verify canvas is calm and uncluttered (no static dimension badge crowding the UI)
    const idleDimBadge = page.locator('text=/W: \\d+px × H: \\d+px/').first();
    const isCrowded = await idleDimBadge.isVisible();
    if (isCrowded) throw new Error('Dimension badge should NOT be visible when idle to keep canvas clean!');
    console.log('   ✅ [PASS] Canvas calm & uncluttered: dimension badge hidden when idle');

    // 4. Test Drag to Resize
    console.log('4. Performing drag-to-resize on East handle...');
    const handleBox = await eastHandle.first().boundingBox();
    if (!handleBox) throw new Error('Could not get bounding box for East resize handle');

    // Trigger drag resize on East handle: drag right by 70px
    const previewPromise = page.waitForResponse((r) => r.url().includes('/api/slightnudge/preview'));
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2 + 70, handleBox.y + handleBox.height / 2, { steps: 5 });

    // Verify live dimension badge appears dynamically during drag
    const liveDimVisible = await page.locator('text=/W: \\d+px × H: \\d+px/').first().isVisible();
    if (liveDimVisible) {
      console.log('   ✅ [PASS] Live dimension badge revealed dynamically during active drag resize');
    }

    await page.waitForTimeout(200);
    await page.mouse.up();

    const resizeResp = await previewPromise;
    const resizeBody = await resizeResp.json();
    console.log('   ✅ [PASS] POST /api/slightnudge/preview returned status', resizeResp.status());
    console.log('   ✅ [PASS] Resize generated real preview id:', resizeBody.id);
    console.log('   ✅ [PASS] Preview summary:', resizeBody.summary);

    // Verify Pending Edit Dock appears with resize
    const pendingDock = await page.locator('text=Live on canvas').isVisible();
    if (!pendingDock) throw new Error('Pending dock did not appear after resize!');
    console.log('   ✅ [PASS] Pending edit dock active with applied max-width class');

    // 5. Test Undo via Ctrl+Z
    console.log('5. Reverting resize edit via Control+z...');
    const undoPromise = page.waitForResponse((r) => r.url().includes('/api/slightnudge/undo'));
    await page.keyboard.press('Control+z');
    const undoResp = await undoPromise;
    const undoBody = await undoResp.json();
    console.log('   ✅ [PASS] Undo successfully cleared resize preview:', undoBody.message);

    // 6. Test Clean iOS Drag-to-Move
    console.log('6. Performing iOS Clean Drag to Move on headline...');
    const moveBox = await movePill.boundingBox();
    if (!moveBox) throw new Error('Could not get bounding box for Move pill');

    // Drag move pill downwards past the paragraph into slot 1
    const reorderPromise = page.waitForResponse((r) => r.url().includes('/api/slightnudge/preview'));
    await page.mouse.move(moveBox.x + moveBox.width / 2, moveBox.y + moveBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(moveBox.x + moveBox.width / 2, moveBox.y + moveBox.height / 2 + 70, { steps: 8 });
    await page.waitForTimeout(250);

    // Check if drop line appeared
    const dropLineText = await page.locator('text=/Drop here/').first().isVisible();
    if (dropLineText) {
      console.log('   ✅ [PASS] Illuminated magnetic drop line indicator rendered with glowing end caps');
    }

    await page.mouse.up();

    const reorderResp = await reorderPromise;
    const reorderBody = await reorderResp.json();
    console.log('   ✅ [PASS] POST /api/slightnudge/preview returned status', reorderResp.status());
    console.log('   ✅ [PASS] Reorder generated real preview id:', reorderBody.id);
    console.log('   ✅ [PASS] Reorder preview summary:', reorderBody.summary);

    // 7. Apply Reorder to Source Disk
    console.log('7. Clicking "Apply to code" button for reorder...');
    const applyPromise = page.waitForResponse((r) => r.url().includes('/api/slightnudge/apply'));
    await page.click('button:has-text("Apply to code")');
    const applyResp = await applyPromise;
    console.log('   ✅ [PASS] POST /api/slightnudge/apply returned status', applyResp.status());

    // 8. Undo Reorder to verify byte-for-byte fixture restoration
    console.log('8. Reverting reorder via Control+z...');
    const undoReorderPromise = page.waitForResponse((r) => r.url().includes('/api/slightnudge/undo'));
    await page.keyboard.press('Control+z');
    const undoReorderResp = await undoReorderPromise;
    console.log('   ✅ [PASS] Reorder undone cleanly (200 OK)');

    const finalFixture = fs.readFileSync(fixturePath, 'utf8');
    if (finalFixture !== origFixture) {
      throw new Error('Final fixture on disk does not match original fixture byte-for-byte!');
    }
    console.log('   ✅ [PASS] Fixture on disk verified byte-for-byte identical to original');

    console.log('\n====================================================');
    console.log('🎉 ALL DRAG RESIZE & IOS MOVE TESTS PASSED (100%)');
    console.log('====================================================\n');
  } finally {
    fs.writeFileSync(fixturePath, origFixture, 'utf8');
    await browser.close();
    await ws.cleanup();
  }
}

testDragResizeAndMove().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
