import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function main() {
  if (!fs.existsSync('recordings')) {
    fs.mkdirSync('recordings', { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/fixtures/1');
  await page.waitForSelector('#target');

  // 1. Select the target element
  await page.click('#target');
  await page.waitForTimeout(300);

  const moveBar = await page.$('.sn-drag-move-bar');
  if (!moveBar) {
    throw new Error('Move bar not found!');
  }
  const moveBox = await moveBar.boundingBox();
  if (!moveBox) {
    throw new Error('Move bar bounding box not found!');
  }

  console.log('--- TEST 1: LIVE BILATERAL MOVE ADAPTATION ---');
  // Start drag
  await page.mouse.move(moveBox.x + moveBox.width / 2, moveBox.y + moveBox.height / 2);
  await page.mouse.down();

  // Move down by 60px (towards primary CTA sibling)
  await page.mouse.move(moveBox.x + moveBox.width / 2, moveBox.y + moveBox.height / 2 + 60);
  await page.waitForTimeout(200);

  const validSwapState = await page.evaluate(() => {
    const target = document.querySelector('#target') as HTMLElement | null;
    const nextSibling = target?.nextElementSibling as HTMLElement | null;
    const dropLine = document.querySelector('.sn-drop-line') as HTMLElement | null;
    const selectedBox = document.querySelector('#slightnudge-selected-box') as HTMLElement | null;
    const ghostChip = document.querySelector('.sn-drag-ghost-chip') as HTMLElement | null;

    return {
      targetTransform: target?.style.transform,
      siblingTransform: nextSibling?.style.transform,
      hasDropLine: Boolean(dropLine),
      dropLineClasses: dropLine?.className,
      isInvalidDrop: selectedBox?.classList.contains('is-invalid-drop'),
      ghostChipInvalid: ghostChip?.classList.contains('is-invalid'),
    };
  });

  console.log('Valid Swap State:', validSwapState);
  await page.screenshot({ path: 'recordings/live-swap-valid.png' });

  console.log('--- TEST 2: INVALID MOVE WITH RED LINE & OUTLINE ---');
  // Drag far left (dx = -400px), moving across outside container towards illustration
  await page.mouse.move(moveBox.x + moveBox.width / 2 - 400, moveBox.y + moveBox.height / 2);
  await page.waitForTimeout(200);

  const invalidDropState = await page.evaluate(() => {
    const target = document.querySelector('#target') as HTMLElement | null;
    const dropLine = document.querySelector('.sn-drop-line') as HTMLElement | null;
    const selectedBox = document.querySelector('#slightnudge-selected-box') as HTMLElement | null;
    const ghostChip = document.querySelector('.sn-drag-ghost-chip') as HTMLElement | null;
    const noticeBadge = document.querySelector('.sn-move-feedback-badge') as HTMLElement | null;

    return {
      targetTransform: target?.style.transform,
      hasDropLine: Boolean(dropLine),
      dropLineClasses: dropLine?.className,
      isInvalidOutline: selectedBox?.classList.contains('is-invalid-drop'),
      ghostChipInvalid: ghostChip?.classList.contains('is-invalid'),
      noticeText: noticeBadge?.textContent,
    };
  });

  console.log('Invalid Drop State:', invalidDropState);
  await page.screenshot({ path: 'recordings/invalid-drop-red-line.png' });

  // Release mouse
  await page.mouse.up();
  await page.waitForTimeout(300);

  const cleanupState = await page.evaluate(() => {
    const target = document.querySelector('#target') as HTMLElement | null;
    const dropLine = document.querySelector('.sn-drop-line') as HTMLElement | null;
    const ghostChip = document.querySelector('.sn-drag-ghost-chip') as HTMLElement | null;
    return {
      targetTransform: target?.style.transform,
      hasDropLine: Boolean(dropLine),
      hasGhostChip: Boolean(ghostChip),
    };
  });

  console.log('Cleanup State:', cleanupState);
  await browser.close();

  if (!validSwapState.targetTransform || !validSwapState.siblingTransform) {
    throw new Error('Live bilateral transform was not applied during valid swap!');
  }
  if (!invalidDropState.isInvalidOutline || !invalidDropState.dropLineClasses?.includes('is-invalid')) {
    throw new Error('Invalid drop indicator / red outline was not rendered!');
  }

  console.log('✅ ALL LIVE MOVE & RED LINE VALIDATIONS PASSED!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
