import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  console.log('Navigating to http://127.0.0.1:3000/editor...');
  await page.goto('http://127.0.0.1:3000/editor', { waitUntil: 'domcontentloaded', timeout: 60000 });

  console.log('Waiting for iframe to appear...');
  const frameElement = await page.waitForSelector('iframe', { timeout: 30000 });
  console.log('Found iframe element!');
  await page.waitForTimeout(2000);

  const frame = await frameElement.contentFrame();
  if (!frame) {
    console.log('No content frame found!');
    await browser.close();
    return;
  }

  // 1. Click on H1
  console.log('Clicking H1...');
  const h1 = await frame.waitForSelector('h1', { timeout: 15000 });
  await h1.click();
  await page.waitForTimeout(800);

  await page.screenshot({ path: 'C:/Users/abhis/.gemini/antigravity/brain/e731c249-0358-4fe2-984b-aa3b6cd4710b/flawless_h1_selected.png' });
  console.log('Saved flawless_h1_selected.png');

  const hud = await page.$('[role="toolbar"][aria-label="Selection formatting"]');
  const hudBox = hud ? await hud.boundingBox() : null;
  const moveBtn = await page.$('[aria-label="Move element"]');
  const moveBox = moveBtn ? await moveBtn.boundingBox() : null;
  const badge = await frame.$('[data-source-line="93"]');
  const badgeBox = badge ? await badge.boundingBox() : null;
  const h1Box = await h1.boundingBox();

  if (hud) {
    const debugHud = await hud.evaluate(el => ({
      styleLeft: el.style.left,
      styleTop: el.style.top,
      computedTransform: getComputedStyle(el).transform,
      rect: el.getBoundingClientRect(),
      layersRect: document.querySelector('[data-editor-panel="layers"]')?.getBoundingClientRect()
    }));
    console.log('DEBUG HUD:', JSON.stringify(debugHud, null, 2));
  }

  console.log('H1 box:', JSON.stringify(h1Box));
  console.log('HUD box for H1:', JSON.stringify(hudBox));
  console.log('Move button box:', JSON.stringify(moveBox));
  console.log('Badge box:', JSON.stringify(badgeBox));

  // 2. Click on Hero CTA button "Start Building for Free"
  console.log('Clicking hero CTA button...');
  const heroBtn = await frame.$('a[href="#start"]:has-text("Start Building for Free"), a:has-text("Start Building")');
  if (heroBtn) {
    await heroBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'C:/Users/abhis/.gemini/antigravity/brain/e731c249-0358-4fe2-984b-aa3b6cd4710b/flawless_btn_selected.png' });
    console.log('Saved flawless_btn_selected.png');

    const hudHero = await page.$('[role="toolbar"][aria-label="Selection formatting"]');
    const hudBoxHero = hudHero ? await hudHero.boundingBox() : null;
    const heroBtnBox = await heroBtn.boundingBox();
    console.log('Hero Button box:', JSON.stringify(heroBtnBox));
    console.log('HUD box for hero button:', JSON.stringify(hudBoxHero));
  }

  await browser.close();
  console.log('Done test!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
