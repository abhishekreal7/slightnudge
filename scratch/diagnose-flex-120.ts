import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/fixtures/1');
  await page.waitForSelector('#target');

  // Zoom to 120%
  const zoomInBtn = page.locator('.sn-zoom-btn[title="Zoom in"]');
  await zoomInBtn.click();
  await page.waitForTimeout(100);
  await zoomInBtn.click();
  await page.waitForTimeout(300);

  const nav = await page.locator('.sn-playground-nav').boundingBox();
  console.log('Nav box @ 120%:', nav);
  const cta = await page.locator('.sn-playground-nav-cta').boundingBox();
  console.log('CTA box @ 120%:', cta);
  const links = await page.locator('.sn-playground-nav > div').boundingBox();
  console.log('Links box @ 120%:', links);

  // Click CTA to select it
  await page.click('.sn-playground-nav-cta');
  await page.waitForTimeout(300);

  // Measure what slotRestingRects computes inside browser
  const slotData = await page.evaluate(() => {
    const el = document.querySelector('.sn-playground-nav-cta') as HTMLElement;
    const parent = el.parentElement as HTMLElement;
    const allSiblings = Array.from(parent.children) as HTMLElement[];
    const currentIndex = allSiblings.indexOf(el);

    const results = [];
    const startScrollX = window.scrollX;
    const startScrollY = window.scrollY;

    for (let k = 0; k < allSiblings.length; k++) {
      const order = [...allSiblings];
      const [moved] = order.splice(currentIndex, 1);
      order.splice(k, 0, moved);
      order.forEach((c) => parent.appendChild(c));
      const r = el.getBoundingClientRect();
      results.push({
        k,
        top: r.top + startScrollY,
        left: r.left + startScrollX,
        width: r.width,
        height: r.height,
        clientLeft: r.left,
      });
    }
    // Restore
    allSiblings.forEach((c) => parent.appendChild(c));
    return { results, currentIndex, parentStyle: window.getComputedStyle(parent).justifyContent };
  });

  console.log('Slot data evaluated:', JSON.stringify(slotData, null, 2));

  // Now perform actual swap
  await page.evaluate(() => {
    const el = document.querySelector('.sn-playground-nav-cta') as HTMLElement;
    el.previousElementSibling?.before(el);
  });
  await page.waitForTimeout(500);

  const swappedCTA = await page.locator('.sn-playground-nav-cta').boundingBox();
  console.log('Swapped CTA actual bounding box:', swappedCTA);

  await browser.close();
}

main().catch(console.error);
