import { chromium } from 'playwright';

async function verify() {
  console.log('Launching browser for Right Tool Dock & Flawless Selection Verification...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const artifactDir = 'C:/Users/abhis/.gemini/antigravity/brain/e731c249-0358-4fe2-984b-aa3b6cd4710b';

  await page.goto('http://127.0.0.1:3000/editor', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const frameElement = await page.waitForSelector('iframe', { timeout: 30000 });
  await page.waitForTimeout(3000);
  const frame = await frameElement.contentFrame();
  if (!frame) throw new Error('No iframe frame found');

  // Shot 1: Clean canvas with RightToolDock (Image 1 style) floating unobtrusively on the right
  console.log('Shot 1: Clean canvas with sleek right tool dock...');
  await page.screenshot({ path: `${artifactDir}/dock_clean_canvas.png` });

  // Shot 2: Select the CTA button "Start Building for Free"
  console.log('Shot 2: Selecting CTA button...');
  const btn = await frame.waitForSelector('a:has-text("Start Building for Free"), button:has-text("Start Building for Free")', { timeout: 15000 });
  await btn.click({ force: true });
  await page.waitForTimeout(1000);

  // Inspect the handles and HUD geometry
  const handlesInfo = await page.evaluate(() => {
    const handles = Array.from(document.querySelectorAll('[data-resize-handle]'));
    const hud = document.querySelector('[role="toolbar"][aria-label="Selection formatting"]');
    const move = document.querySelector('[role="button"][aria-label="Move element"]');
    const dock = document.querySelector('[aria-label="Design tools dock"]');
    const flyout = document.querySelector('[role="dialog"]');

    return {
      handles: handles.map(h => ({
        handle: h.getAttribute('data-resize-handle'),
        classes: h.className,
        rect: h.getBoundingClientRect()
      })),
      hudRect: hud?.getBoundingClientRect(),
      moveRect: move?.getBoundingClientRect(),
      hasDock: Boolean(dock),
      dockRect: dock?.getBoundingClientRect(),
      hasFlyout: Boolean(flyout),
      flyoutRect: flyout?.getBoundingClientRect(),
    };
  });

  console.log('Button Selection Details:', JSON.stringify(handlesInfo, null, 2));

  await page.screenshot({ path: `${artifactDir}/dock_btn_selected_with_flyout.png` });

  // Shot 3: Switch to Typography tool on the dock
  console.log('Shot 3: Clicking Typography tool on the dock...');
  const typeTool = await page.$('button[title*="Typography"]');
  if (typeTool) {
    await typeTool.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${artifactDir}/dock_typography_flyout.png` });
  }

  // Shot 4: Switch to Appearance tool on the dock
  console.log('Shot 4: Clicking Appearance tool on the dock...');
  const appTool = await page.$('button[title*="Colors, Radius"]');
  if (appTool) {
    await appTool.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${artifactDir}/dock_appearance_flyout.png` });
  }

  // Shot 5: Close the flyout by clicking close button on flyout
  console.log('Shot 5: Closing flyout...');
  const closeBtn = await page.$('[role="dialog"] button[aria-label="Close panel"]');
  if (closeBtn) {
    await closeBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${artifactDir}/dock_collapsed_with_selection.png` });
  }

  // Shot 6: Select H1 text element
  console.log('Shot 6: Selecting H1 headline...');
  const h1 = await frame.waitForSelector('h1', { timeout: 15000 });
  await h1.click({ force: true });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${artifactDir}/dock_h1_selected.png` });

  console.log('All screenshots captured successfully!');
  await browser.close();
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

