import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/fixtures/1');
  await page.waitForSelector('#target');
  await page.click('#target');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'recordings/studio-preview.png' });
  await browser.close();
  console.log('Studio screenshot captured successfully!');
}

main().catch(console.error);
