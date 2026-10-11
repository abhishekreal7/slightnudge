import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/fixtures/1');
  await page.waitForSelector('#target');

  const beforeRect = await page.evaluate(() => {
    const el = document.querySelector('#target')!;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  });
  console.log('Before h1 rect:', beforeRect);

  const beforeChildren = await page.evaluate(() => {
    const parent = document.querySelector('.sn-playground-content')!;
    return Array.from(parent.children).map((c) => c.tagName + '#' + c.id + '.' + c.className);
  });
  console.log('Parent children before:', beforeChildren);

  await page.click('#target');
  await page.waitForTimeout(200);

  const moveBar = await page.$('.sn-drag-move-bar');
  if (moveBar) {
    const box = await moveBar.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 80);
      await page.mouse.up();
      await page.waitForTimeout(500);
    }
  }

  const afterChildren = await page.evaluate(() => {
    const parent = document.querySelector('.sn-playground-content')!;
    return Array.from(parent.children).map((c) => c.tagName + '#' + c.id + '.' + c.className);
  });
  console.log('Parent children after:', afterChildren);

  const afterRect = await page.evaluate(() => {
    const el = document.querySelector('#target')!;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  });
  console.log('After h1 rect:', afterRect);

  const selectedBoxRect = await page.evaluate(() => {
    const el = document.querySelector('#slightnudge-selected-box')!;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  });
  console.log('Selected box rect:', selectedBoxRect);

  await browser.close();
}

test().catch(console.error);
