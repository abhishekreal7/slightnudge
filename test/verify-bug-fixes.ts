import { chromium } from 'playwright';

async function verifyFixes() {
  console.log('Verifying bug fixes on live canvas...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:3000/editor', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const frameElement = await page.waitForSelector('iframe', { timeout: 30000 });
  await page.waitForTimeout(3000);
  const frame = await frameElement.contentFrame();
  if (!frame) throw new Error('No frame found');

  const artifactDir = 'C:/Users/abhis/.gemini/antigravity/brain/e731c249-0358-4fe2-984b-aa3b6cd4710b';

  // 1. Select the Hero CTA button
  const ctaBtn = await frame.waitForSelector('a:has-text("Start Building for Free")', { timeout: 30000 });
  await ctaBtn.click({ force: true });
  await page.waitForTimeout(800);

  // Take screenshot 1: CTA Selected (Check for no stray arc)
  await page.screenshot({ path: `${artifactDir}/fix_verify_cta_selected.png` });

  const ctaData = await page.evaluate(() => {
    const sel = document.querySelector('[class*="sourceSelection"]');
    const svg = sel?.querySelector('svg');
    const arcs = Array.from(sel?.querySelectorAll('[class*="handleArc"]') || []).map(a => a.getAttribute('d'));
    const guideV = document.querySelector('[class*="smartGuideV"]') as HTMLElement;
    const guideH = document.querySelector('[class*="smartGuideH"]') as HTMLElement;
    const handles = Array.from(sel?.querySelectorAll('[data-resize-handle]') || []).map(h => ({
      handle: h.getAttribute('data-resize-handle'),
      classes: h.className,
    }));
    return {
      variant: sel?.getAttribute('data-selection-variant'),
      selRect: sel?.getBoundingClientRect(),
      arcCount: arcs.length,
      arcs,
      guideVDisplay: guideV ? guideV.style.display : null,
      guideHDisplay: guideH ? guideH.style.display : null,
      handles,
    };
  });
  console.log('Verification Data for CTA Button:', JSON.stringify(ctaData, null, 2));

  // 2. Perform a drag resize on the bottom-right corner handle of the CTA button
  const seHandle = await page.$('button[aria-label="Resize width from bottom right"]');
  if (seHandle) {
    console.log('Dragging SE handle to test height constraint and guide line cleanup...');
    const box = await seHandle.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      // Drag down and to the right
      await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 60, { steps: 5 });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${artifactDir}/fix_verify_cta_dragging.png` });

      const dragData = await page.evaluate(() => {
        const sel = document.querySelector('[class*="sourceSelection"]');
        const arcs = Array.from(sel?.querySelectorAll('[class*="handleArc"]') || []);
        const guideV = document.querySelector('[class*="smartGuideV"]') as HTMLElement;
        const guideH = document.querySelector('[class*="smartGuideH"]') as HTMLElement;
        return {
          selRect: sel?.getBoundingClientRect(),
          arcCount: arcs.length,
          guideVDisplay: guideV ? guideV.style.display : null,
          guideHDisplay: guideH ? guideH.style.display : null,
        };
      });
      console.log('During Drag Data:', JSON.stringify(dragData, null, 2));
      if (dragData.guideVDisplay !== 'none' || dragData.guideHDisplay !== 'none') {
        throw new Error('Guides should stay none during drag');
      }

      // Release mouse
      await page.mouse.up();
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${artifactDir}/fix_verify_cta_drag_released.png` });

      const postDragData = await page.evaluate(() => {
        const guideV = document.querySelector('[class*="smartGuideV"]') as HTMLElement;
        const guideH = document.querySelector('[class*="smartGuideH"]') as HTMLElement;
        const sel = document.querySelector('[class*="sourceSelection"]');
        return {
          guideVDisplay: guideV ? guideV.style.display : null,
          guideHDisplay: guideH ? guideH.style.display : null,
          selRect: sel?.getBoundingClientRect(),
        };
      });
      console.log('Post Drag Data (Guides must be none):', JSON.stringify(postDragData, null, 2));
      if (!postDragData.selRect || postDragData.selRect.height < 40) {
        throw new Error(`Post-drag selection height collapsed: ${JSON.stringify(postDragData.selRect)}`);
      }
    }
  }

  // 3. Move drag test: verify zero green guide cuts, no spurious popover on release, and synced outline
  const moveBtn = await page.$('button[aria-label="Move element"]');
  if (moveBtn) {
    console.log('Testing Move drag gesture...');
    const moveBox = await moveBtn.boundingBox();
    if (moveBox) {
      await page.mouse.move(moveBox.x + moveBox.width / 2, moveBox.y + moveBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(moveBox.x + moveBox.width / 2 + 80, moveBox.y + moveBox.height / 2 + 90, { steps: 10 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${artifactDir}/move_drag_in_progress_v2.png` });

      const duringMove = await page.evaluate(() => {
        const guideV = document.querySelector('[class*="smartGuideV"]') as HTMLElement;
        const guideH = document.querySelector('[class*="smartGuideH"]') as HTMLElement;
        return {
          guideVDisplay: guideV ? guideV.style.display : null,
          guideHDisplay: guideH ? guideH.style.display : null,
        };
      });
      if (duringMove.guideVDisplay !== 'none' || duringMove.guideHDisplay !== 'none') {
        throw new Error(`Smart guides visible during move: ${JSON.stringify(duringMove)}`);
      }

      await page.mouse.up();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${artifactDir}/move_drag_released_v2.png` });

      const afterMove = await page.evaluate(() => {
        const movePopover = document.getElementById('selection-move-controls');
        const sel = document.querySelector('[class*="sourceSelection"]') as HTMLElement;
        const guideV = document.querySelector('[class*="smartGuideV"]') as HTMLElement;
        const guideH = document.querySelector('[class*="smartGuideH"]') as HTMLElement;
        return {
          movePopoverOpen: Boolean(movePopover),
          selRect: sel?.getBoundingClientRect(),
          guideVDisplay: guideV ? guideV.style.display : null,
          guideHDisplay: guideH ? guideH.style.display : null,
        };
      });
      const btnBox = await ctaBtn.boundingBox();
      console.log('Move Release Data:', JSON.stringify({ ...afterMove, btnBox }, null, 2));
      if (afterMove.movePopoverOpen) {
        throw new Error('Move popover should not open automatically after dragging!');
      }
      if (!afterMove.selRect || !btnBox || Math.abs(afterMove.selRect.top - btnBox.y) > 4 || Math.abs(afterMove.selRect.left - btnBox.x) > 4) {
        throw new Error(`Selection drifted after move release: sel=${JSON.stringify(afterMove.selRect)} btn=${JSON.stringify(btnBox)}`);
      }
    }
  }

  // 4. Clear selection by clicking canvas gutter
  console.log('Clicking canvas background gutter to test full deselect and guide cleanup...');
  await page.click('[data-editor-canvas]', { position: { x: 10, y: 50 } });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${artifactDir}/fix_verify_canvas_clean.png` });

  const cleanData = await page.evaluate(() => {
    const sel = document.querySelector('[class*="sourceSelection"]');
    const guideV = document.querySelector('[class*="smartGuideV"]') as HTMLElement;
    const guideH = document.querySelector('[class*="smartGuideH"]') as HTMLElement;
    return {
      hasSelection: Boolean(sel),
      guideVDisplay: guideV ? guideV.style.display : null,
      guideHDisplay: guideH ? guideH.style.display : null,
    };
  });
  console.log('Clean Canvas Data:', JSON.stringify(cleanData, null, 2));

  await browser.close();
}

verifyFixes().catch(console.error);

