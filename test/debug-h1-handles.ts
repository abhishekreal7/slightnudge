import { chromium } from 'playwright';

async function check() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:3000/editor', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const frameElement = await page.waitForSelector('iframe', { timeout: 30000 });
  const frame = await frameElement.contentFrame();
  if (!frame) throw new Error('No frame');

  const h1 = await frame.waitForSelector('h1', { timeout: 15000 });
  await h1.click();
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    const handles = Array.from(document.querySelectorAll('[role="slider"][aria-label*="Resize width"]'));
    return handles.map(h => ({
      label: h.getAttribute('aria-label'),
      rect: h.getBoundingClientRect()
    }));
  });

  console.log('H1 resize handles in DOM:', JSON.stringify(info, null, 2));
  await browser.close();
}

check().catch(console.error);

