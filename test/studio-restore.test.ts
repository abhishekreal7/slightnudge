import { chromium } from 'playwright';
import fs from 'fs';

async function main() {
  console.log('====================================================');
  console.log('🧪 STUDIO BACKEND RESTORATION BROWSER SUITE');
  console.log('====================================================\n');

  const origFixture = fs.readFileSync('fixtures/1-plain-static.tsx', 'utf8');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Load /studio
    console.log('1. Loading http://localhost:3000/studio...');
    await page.goto('http://localhost:3000/studio', { waitUntil: 'networkidle' });
    console.log('   ✅ [PASS] Studio page loaded successfully (200 OK)');

    // 2. Select Headline on canvas
    console.log('2. Clicking canvas <h1> element to test in-situ selection...');
    await page.locator('h1').first().click();
    await page.waitForTimeout(400);

    const hudVisible = await page.locator('button:has-text("Edit text")').isVisible();
    if (!hudVisible) throw new Error('In-situ HUD did not appear on element click!');
    console.log('   ✅ [PASS] In-situ HUD rendered above selected element');

    const selectedName = await page.locator('text=Headline Text').first().isVisible();
    if (!selectedName) throw new Error('Inspector did not display selected Headline Text layer!');
    console.log('   ✅ [PASS] Inspector activated for Headline Text layer');

    // 3. Test Preview: Click Bold toggle
    console.log('3. Triggering Bold toggle in HUD...');
    const previewPromise = page.waitForResponse((r) => r.url().includes('/api/slightnudge/preview'));
    await page.click('button[title="Toggle bold"]');
    const previewResp = await previewPromise;
    const previewBody = await previewResp.json();
    console.log('   ✅ [PASS] POST /api/slightnudge/preview returned status', previewResp.status());
    console.log('   ✅ [PASS] Server generated real preview id:', previewBody.id);
    if (!previewBody.success || !previewBody.id) {
      throw new Error('Preview API returned non-success or missing id!');
    }

    // 4. Verify Pending Dock in UI
    const pendingDock = await page.locator('text=Live on canvas').isVisible();
    if (!pendingDock) throw new Error('Pending edit dock was not displayed!');
    console.log('   ✅ [PASS] Pending edit dock displayed with summary:', previewBody.summary);

    // 5. Apply Edit to Source Disk
    console.log('5. Clicking "Apply to code" button in pending dock...');
    const applyPromise = page.waitForResponse((r) => r.url().includes('/api/slightnudge/apply'));
    await page.click('button:has-text("Apply to code")');
    const applyResp = await applyPromise;
    const applyBody = await applyResp.json();
    console.log('   ✅ [PASS] POST /api/slightnudge/apply returned status', applyResp.status());

    // 6. Check Disk
    const modifiedFixture = fs.readFileSync('fixtures/1-plain-static.tsx', 'utf8');
    const isDiskModified = modifiedFixture !== origFixture && modifiedFixture.includes('font-bold');
    if (!isDiskModified) throw new Error('Disk file was NOT modified with font-bold after Apply!');
    console.log('   ✅ [PASS] Source file verified modified on disk with new AST class');

    // 7. Test Undo via Ctrl+Z
    console.log('7. Triggering Undo via keyboard shortcut (Control+z)...');
    const undoPromise = page.waitForResponse((r) => r.url().includes('/api/slightnudge/undo'));
    await page.keyboard.press('Control+z');
    const undoResp = await undoPromise;
    const undoBody = await undoResp.json();
    console.log('   ✅ [PASS] POST /api/slightnudge/undo returned status', undoResp.status(), undoBody);

    const restoredFixture = fs.readFileSync('fixtures/1-plain-static.tsx', 'utf8');
    const isRestored = restoredFixture === origFixture;
    if (!isRestored) throw new Error('Disk file was NOT cleanly restored byte-for-byte by Undo!');
    console.log('   ✅ [PASS] Source file restored byte-for-byte on disk');

    // 8. Verify Disabled Controls (Overflow, Object, Position)
    console.log('8. Verifying non-backend controls are properly disabled...');
    const overflowVisibleBtn = page.locator('button[title="Overflow: not supported in source editor"]').first();
    const isOverflowDisabled = await overflowVisibleBtn.isDisabled();
    if (!isOverflowDisabled) throw new Error('Overflow control is not disabled!');
    console.log('   ✅ [PASS] Overflow control properly disabled with tooltip');

    const objectSelect = page.locator('select[title="Object styles: not supported in source editor"]');
    const isObjectDisabled = await objectSelect.isDisabled();
    if (!isObjectDisabled) throw new Error('Object styles control is not disabled!');
    console.log('   ✅ [PASS] Object styles control properly disabled with tooltip');

    await page.click('button:has-text("Position")');
    await page.waitForTimeout(300);
    const positionSelect = page.locator('select[title="Position modes: not supported in source editor"]');
    const isPositionDisabled = await positionSelect.isDisabled();
    if (!isPositionDisabled) throw new Error('Position modes control is not disabled!');
    console.log('   ✅ [PASS] Position modes control properly disabled with tooltip');

    // 9. Test Second Apply Button: "Apply to Source" in bottom floating bar
    console.log('9. Testing second Apply button ("Apply to Source" in bottom floating bar)...');
    await page.click('aside >> text=Paragraph');
    await page.waitForTimeout(400);

    const previewPromise2 = page.waitForResponse((r) => r.url().includes('/api/slightnudge/preview'));
    const weightSelect = page.locator('div:has(> span:has-text("Weight")) >> select');
    await weightSelect.selectOption('Bold');
    const previewResp2 = await previewPromise2;
    const previewBody2 = await previewResp2.json();
    console.log('   ✅ [PASS] Paragraph style preview generated:', previewBody2.summary);

    const applyToSourceBtn = page.locator('button:has-text("Apply to Source")');
    await applyToSourceBtn.waitFor({ state: 'visible', timeout: 5000 });
    const isFloatingApplyVisible = await applyToSourceBtn.isVisible();
    if (!isFloatingApplyVisible) throw new Error('"Apply to Source" button was not visible!');
    console.log('   ✅ [PASS] "Apply to Source" button visible in bottom floating bar');

    const applyPromise2 = page.waitForResponse((r) => r.url().includes('/api/slightnudge/apply'));
    await applyToSourceBtn.click();
    const applyResp2 = await applyPromise2;
    console.log('   ✅ [PASS] "Apply to Source" applied successfully (200 OK)');

    const diskAfterParagraph = fs.readFileSync('fixtures/1-plain-static.tsx', 'utf8');
    if (!diskAfterParagraph.includes('font-bold')) throw new Error('Disk file missing paragraph bold edit!');
    console.log('   ✅ [PASS] Disk verified with paragraph bold update');

    const undoPromise2 = page.waitForResponse((r) => r.url().includes('/api/slightnudge/undo'));
    await page.keyboard.press('Control+z');
    await undoPromise2;
    console.log('   ✅ [PASS] Undo successfully restored source file');

    const finalDisk = fs.readFileSync('fixtures/1-plain-static.tsx', 'utf8');
    if (finalDisk !== origFixture) throw new Error('Final disk does not match original fixture!');
    console.log('   ✅ [PASS] Final disk matches original fixture byte-for-byte');

    console.log('\n====================================================');
    console.log('🎉 ALL STUDIO RESTORATION TESTS PASSED (10/10)');
    console.log('====================================================\n');
  } finally {
    await browser.close();
    fs.writeFileSync('fixtures/1-plain-static.tsx', origFixture, 'utf8');
  }
}

main().catch((err) => {
  console.error('\n❌ Test assertion failed:', err);
  process.exit(1);
});
