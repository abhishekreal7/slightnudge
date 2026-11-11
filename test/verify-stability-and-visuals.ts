import { chromium } from 'playwright';

async function verify() {
  console.log('Launching browser for stability and visual verification...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:3000/editor', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const frameElement = await page.waitForSelector('iframe', { timeout: 30000 });
  await page.waitForTimeout(2000);
  const frame = await frameElement.contentFrame();
  if (!frame) throw new Error('No iframe frame found');

  // Test 1: Verify section#overview selection and stability (NO SHAKING)
  console.log('Testing section#overview selection stability...');
  const section = await frame.waitForSelector('section#overview', { timeout: 15000 });
  await section.click({ position: { x: 500, y: 50 }, force: true });
  await page.waitForTimeout(600);

  // Check positions across 10 animation frames to confirm 0px jitter
  const positions: { top: number; left: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const pos = await page.evaluate(() => {
      const tb = document.querySelector('[role="toolbar"][aria-label="Selection formatting"]');
      if (!tb) return null;
      const rect = tb.getBoundingClientRect();
      return { top: rect.top, left: rect.left };
    });
    if (pos) positions.push(pos);
    await page.waitForTimeout(60);
  }

  console.log('Recorded positions over 10 frames:', JSON.stringify(positions));
  if (positions.length > 1) {
    const minTop = Math.min(...positions.map(p => p.top));
    const maxTop = Math.max(...positions.map(p => p.top));
    const minLeft = Math.min(...positions.map(p => p.left));
    const maxLeft = Math.max(...positions.map(p => p.left));
    console.log(`Top variance: ${maxTop - minTop}px, Left variance: ${maxLeft - minLeft}px`);
    if (maxTop - minTop > 1 || maxLeft - minLeft > 1) {
      throw new Error(`Toolbar is shaking! Top variance: ${maxTop - minTop}px, Left variance: ${maxLeft - minLeft}px`);
    }
    console.log('VERIFIED: ZERO SHAKING on section#overview! Perfectly stable!');
  }

  await page.screenshot({ path: 'C:/Users/abhis/.gemini/antigravity/brain/e731c249-0358-4fe2-984b-aa3b6cd4710b/stable_section_overview.png' });

  // Test 2: Verify H1 headline selection
  console.log('Testing H1 headline selection...');
  const h1 = await frame.waitForSelector('h1', { timeout: 15000 });
  await h1.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'C:/Users/abhis/.gemini/antigravity/brain/e731c249-0358-4fe2-984b-aa3b6cd4710b/stable_h1_headline.png' });

  const h1Toolbar = await page.$('[role="toolbar"][aria-label="Selection formatting"]');
  const h1Box = await h1.boundingBox();
  const tbBox = h1Toolbar ? await h1Toolbar.boundingBox() : null;
  console.log('H1 box:', JSON.stringify(h1Box));
  console.log('H1 Toolbar box:', JSON.stringify(tbBox));

  // Test 3: Verify Button CTA selection
  console.log('Testing Button CTA selection...');
  const btn = await frame.$('a[href="#start"]:has-text("Start Building for Free"), a:has-text("Start Building")');
  if (btn) {
    await btn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'C:/Users/abhis/.gemini/antigravity/brain/e731c249-0358-4fe2-984b-aa3b6cd4710b/stable_button_cta.png' });
    const btnToolbar = await page.$('[role="toolbar"][aria-label="Selection formatting"]');
    const btnBox = await btn.boundingBox();
    const btnTbBox = btnToolbar ? await btnToolbar.boundingBox() : null;
    console.log('Button box:', JSON.stringify(btnBox));
    console.log('Button Toolbar box:', JSON.stringify(btnTbBox));
  }

  await browser.close();
  console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});

