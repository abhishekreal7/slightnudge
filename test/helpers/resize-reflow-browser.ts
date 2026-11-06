import assert from 'node:assert/strict';
import type { Page } from 'playwright';
export const resizePointerFixture = `'use client';
export default function Page(){return <main className="min-h-screen bg-white p-8"><p id="wrap" className="w-full max-w-2xl text-2xl">${'A thoughtful workspace gives people room to make their best work together. '.repeat(10)}</p></main>}`;
export async function checkResizeReflow(page: Page, base: string, _workspace: string) {
  await page.goto(base + '/editor?view=fit', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
  for (const zoom of [.75, 1, 1.5]) {
    await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption(String(zoom));
    const target = page.frameLocator('iframe[title="Actual project"]').locator('#wrap');
    await target.click();
    const edge = page.getByRole('button', { name: 'Resize width from right', exact: true });
    await edge.scrollIntoViewIfNeeded();
    const box = (await edge.boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 2;
    const height = await target.evaluate(el => el.getBoundingClientRect().height);
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x - 240 * zoom, y, { steps: 6 });
    await page.waitForTimeout(100);
    const next = (await edge.boundingBox())!;
    const dx = next.x + next.width / 2 - (x - 240 * zoom), dy = next.y + next.height / 2 - y;
    console.log(JSON.stringify({ zoom, dx, dy, beforeHeight: height, afterHeight: await target.evaluate(el => el.getBoundingClientRect().height), hitHeight: box.height }));
    assert.ok(await target.evaluate(el => el.getBoundingClientRect().height) > height, 'Fixture must reflow during width resize');
    assert.ok(Math.abs(dx) <= 1.5 && Math.abs(dy) <= 1.5, 'The active side dot stays at its pickup Y while text reflows');
    assert.ok(box.height / zoom <= 31, 'Only the area around the visible side dot is a resize hit target (CSS px before canvas zoom)');
    await page.keyboard.press('Escape'); await page.mouse.up();
    await page.waitForFunction(() => !document.querySelector('[data-resize-capture]'));
  }
  console.log('PASS side-dot X/Y pickup anchoring during text reflow at three zoom levels; compact hit target');
  return 1;
}
