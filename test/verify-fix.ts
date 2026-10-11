import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/fixtures/1');
  await page.waitForSelector('#target');

  // Click #target
  await page.click('#target');
  await page.waitForTimeout(300);

  const initialCheck = await page.evaluate(() => {
    const target = document.querySelector('#target')!;
    const box = document.querySelector('#slightnudge-selected-box')!;
    const hud = document.querySelector('.sn-canvas-hud')!;
    const tRect = target.getBoundingClientRect();
    const bRect = box.getBoundingClientRect();
    const hRect = hud.getBoundingClientRect();
    return {
      targetTop: tRect.top,
      boxTop: bRect.top,
      hudBottom: hRect.bottom,
      diff: Math.abs(tRect.top - bRect.top),
      heightDiff: Math.abs(tRect.height - bRect.height),
    };
  });
  console.log('Initial Alignment Check:', initialCheck);

  // Test drag behavior
  const moveBar = await page.$('.sn-drag-move-bar');
  if (moveBar) {
    const box = await moveBar.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      // Drag down 60px
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 60);
      await page.waitForTimeout(100);

      // During drag check: box should still hug element, ghost chip should be visible
      const duringDragCheck = await page.evaluate(() => {
        const target = document.querySelector('#target')!;
        const box = document.querySelector('#slightnudge-selected-box')!;
        const ghost = document.querySelector('.sn-drag-ghost-chip');
        const tRect = target.getBoundingClientRect();
        const bRect = box.getBoundingClientRect();
        return {
          diff: Math.abs(tRect.top - bRect.top),
          hasGhost: Boolean(ghost),
          ghostText: ghost?.textContent,
        };
      });
      console.log('During Drag Check:', duringDragCheck);

      await page.screenshot({ path: 'recordings/during-drag.png' });

      // Release mouse
      await page.mouse.up();
      await page.waitForTimeout(400);

      const afterReleaseCheck = await page.evaluate(() => {
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
      console.log('After Release Check:', afterReleaseCheck);
    }
  }

  await page.screenshot({ path: 'recordings/verified-alignment.png' });
  await browser.close();
}

main().catch(console.error);
