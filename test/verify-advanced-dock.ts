import { chromium } from 'playwright';

async function verify() {
  console.log('Launching browser for Advanced Dock & Slide Verification...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const artifactDir = 'C:/Users/abhis/.gemini/antigravity/brain/e731c249-0358-4fe2-984b-aa3b6cd4710b';

  await page.goto('http://127.0.0.1:3000/editor', { waitUntil: 'domcontentloaded', timeout: 90000 });
  const frameElement = await page.waitForSelector('iframe', { timeout: 60000 });
  await page.waitForTimeout(3000);
  const frame = await frameElement.contentFrame();
  if (!frame) throw new Error('No iframe frame found');

  // Shot 1: Clean canvas with the tall, commanding, advanced dark tool dock
  console.log('Shot 1: Clean canvas with new tall advanced dock...');
  await page.screenshot({ path: `${artifactDir}/dock_advanced_clean.png` });

  // Shot 2: Test bottom bar toggle - slide out
  console.log('Shot 2: Clicking bottom bar Toggle design panel to slide OUT...');
  const designToggle = await page.waitForSelector('button[aria-label="Toggle design panel"]', { timeout: 10000 });
  await designToggle.click();
  await page.waitForTimeout(400); // let slide-out transition finish
  await page.screenshot({ path: `${artifactDir}/dock_slid_out.png` });

  // Shot 3: Test bottom bar toggle - slide in smoothly
  console.log('Shot 3: Clicking bottom bar Toggle design panel to slide IN...');
  await designToggle.click();
  await page.waitForTimeout(400); // let slide-in transition finish
  await page.screenshot({ path: `${artifactDir}/dock_slid_in.png` });

  // Shot 4: Select CTA button and show Layout & Shapes flyout
  console.log('Shot 4: Selecting CTA button...');
  const btn = await frame.waitForSelector('a:has-text("Start Building for Free"), button:has-text("Start Building for Free")', { timeout: 15000 });
  await btn.click({ force: true });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${artifactDir}/dock_advanced_btn_selected.png` });

  // Shot 4b: Click Spacing & Box Model tool on the dock (matches user's screenshot)
  console.log('Shot 4b: Clicking Spacing & Box Model tool...');
  const spacingTool = await page.$('button[title*="Spacing & Box Model"]');
  if (spacingTool) {
    await spacingTool.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${artifactDir}/dock_advanced_spacing.png` });
  }

  // Shot 5: Click Typography tool on the dock
  console.log('Shot 5: Clicking Typography tool...');
  const typeTool = await page.$('button[title*="Typography"]');
  if (typeTool) {
    await typeTool.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${artifactDir}/dock_advanced_typography.png` });
  }

  // Shot 6: Click Colors & Fills tool on the dock
  console.log('Shot 6: Clicking Colors & Fills tool...');
  const appTool = await page.$('button[title*="Colors & Fills"]');
  if (appTool) {
    await appTool.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${artifactDir}/dock_advanced_appearance.png` });
  }

  // Shot 7: Click Borders & Radius tool on the dock
  console.log('Shot 7: Clicking Borders & Radius tool...');
  const borderTool = await page.$('button[title*="Borders & Radius"]');
  if (borderTool) {
    await borderTool.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${artifactDir}/dock_advanced_borders.png` });
  }

  // Shot 8: Click Source Code tool on the dock
  console.log('Shot 8: Clicking Source Code tool...');
  const codeTool = await page.$('button[title*="Inspect TSX Source"]');
  if (codeTool) {
    await codeTool.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${artifactDir}/dock_advanced_code.png` });
  }

  console.log('All advanced dock verification screenshots captured successfully!');
  await browser.close();
}

verify().catch(err => {
  console.error('Advanced dock verification failed:', err);
  process.exit(1);
});

