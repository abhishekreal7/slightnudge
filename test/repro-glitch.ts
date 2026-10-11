import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/fixtures/1');
  await page.waitForSelector('#target');

  await page.click('#target');
  await page.waitForTimeout(300);

  const moveBar = await page.$('.sn-drag-move-bar');
  if (moveBar) {
    const box = await moveBar.boundingBox();
    if (box) {
      // Mouse down on move bar
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      // Move down by 80px
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 80);
      await page.waitForTimeout(100);
      // Mouse up
      await page.mouse.up();
      await page.waitForTimeout(200);

      // Check if moveGhostOffset or isDraggingMove is stuck!
      const isSelectedBoxShifted = await page.$eval('#slightnudge-selected-box', (el) => {
        return (el as HTMLElement).style.top;
      });
      console.log('Selected box top style after mouse up:', isSelectedBoxShifted);
    }
  }

  await page.screenshot({ path: 'recordings/repro-check.png' });
  await browser.close();
}

main().catch(console.error);
