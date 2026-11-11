import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  console.log('Navigating...');
  await page.goto('http://127.0.0.1:3000/editor', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const frameElement = await page.waitForSelector('iframe', { timeout: 30000 });
  await page.waitForTimeout(2000);
  const frame = await frameElement.contentFrame();
  if (!frame) {
    console.log('No frame');
    await browser.close();
    return;
  }

  console.log('Clicking section#overview...');
  const section = await frame.waitForSelector('section#overview', { timeout: 15000 });
  await section.click({ position: { x: 500, y: 50 }, force: true });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'C:/Users/abhis/.gemini/antigravity/brain/e731c249-0358-4fe2-984b-aa3b6cd4710b/debug_section.png' });
  console.log('Saved debug_section.png');

  const topSelections = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[aria-label="Selected source element"], [class*="sourceSelection"], [class*="moveTrigger"], [class*="floatingFormatting"], [role="toolbar"]'));
    return els.map(el => ({
      tag: el.tagName,
      className: el.className,
      rect: el.getBoundingClientRect(),
      style: el.getAttribute('style'),
      computedBg: getComputedStyle(el).backgroundColor,
      computedBorder: getComputedStyle(el).borderColor
    }));
  });

  const iframeSelections = await frame.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[class*="sn-"], [class*="selection"], [class*="selected"]'));
    return els.map(el => ({
      tag: el.tagName,
      className: el.className,
      rect: el.getBoundingClientRect(),
      computedBg: getComputedStyle(el).backgroundColor,
      computedBorder: getComputedStyle(el).border
    }));
  });

  console.log('TOP SELECTIONS:', JSON.stringify(topSelections, null, 2));
  console.log('IFRAME SELECTIONS:', JSON.stringify(iframeSelections, null, 2));
  await browser.close();
}

test().catch(console.error);
