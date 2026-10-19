import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:3000/fixtures/1');
  await page.waitForSelector('#target');

  // Zoom to 150% (5 clicks on zoomInBtn)
  const zoomInBtn = page.locator('.sn-zoom-btn[title="Zoom in"]');
  for (let i = 0; i < 5; i++) {
    await zoomInBtn.click();
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(300);

  const cta = page.locator('.sn-playground-nav-cta');
  console.log('CTA count:', await cta.count());
  const boxBefore = await cta.boundingBox();
  console.log('CTA box before scroll:', boxBefore);

  // Scroll into view
  await cta.scrollIntoViewIfNeeded();
  const boxAfter = await cta.boundingBox();
  console.log('CTA box after scrollIntoViewIfNeeded:', boxAfter);

  // Try clicking
  await cta.click({ force: true });
  await page.waitForTimeout(300);

  const moveBar = page.locator('.sn-drag-move-bar');
  console.log('Move bar count:', await moveBar.count(), 'visible:', await moveBar.isVisible());
  const moveBox = await moveBar.boundingBox();
  console.log('Move bar box:', moveBox);

  // Drag -180px
  if (moveBox) {
    const sX = moveBox.x + moveBox.width / 2;
    const sY = moveBox.y + moveBox.height / 2;
    await page.mouse.move(sX, sY);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(sX + (-180 * i) / 12, sY);
      await page.waitForTimeout(25);
    }
    const dropLine = page.locator('.sn-drop-line');
    console.log('Drop line count:', await dropLine.count(), 'visible:', await dropLine.isVisible());
    if (await dropLine.isVisible()) {
      console.log('Drop line box:', await dropLine.boundingBox());
    }
    await page.mouse.up();
    await page.waitForTimeout(2600);
    const finalCTA = await page.locator('.sn-playground-nav-cta').boundingBox();
    console.log('Final CTA box:', finalCTA);
  }

  await browser.close();
}

main().catch(console.error);
