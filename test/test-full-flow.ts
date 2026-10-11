import { chromium } from 'playwright';

async function testReorder() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/fixtures/1');
  await page.waitForSelector('#target');

  // Click #target
  await page.click('#target');
  await page.waitForTimeout(300);

  // Click Move later (ArrowDown in HUD)
  const downBtn = await page.$('button[aria-label="Move later"]');
  if (downBtn) {
    await downBtn.click();
    await page.waitForTimeout(600);

    const reorderedCheck = await page.evaluate(() => {
      const target = document.querySelector('#target')!;
      const box = document.querySelector('#slightnudge-selected-box')!;
      const tRect = target.getBoundingClientRect();
      const bRect = box.getBoundingClientRect();
      return {
        targetTop: tRect.top,
        boxTop: bRect.top,
        diff: Math.abs(tRect.top - bRect.top),
        heightDiff: Math.abs(tRect.height - bRect.height),
      };
    });
    console.log('After HUD Move Later:', reorderedCheck);

    await page.screenshot({ path: 'recordings/after-hud-move-later.png' });

    // Click Discard in inspector or HUD
    const discardBtn = await page.$('.sn-inspector-apply-card button:first-child');
    if (discardBtn) {
      await discardBtn.click();
      await page.waitForTimeout(600);
      console.log('Discarded reorder preview cleanly');
    }
  }

  await browser.close();
}

testReorder().catch(console.error);
