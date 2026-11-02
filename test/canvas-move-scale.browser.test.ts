import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

// Read-only geometry regression: no source editing or draft creation.
const base = process.env.CANVAS_TEST_URL || 'http://localhost:3000';
const browser = await chromium.launch({ headless: true });
const evidence = 'docs/canvas-move-scale';
fs.mkdirSync(evidence, { recursive: true });
const rows: unknown[] = [];
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/editor?view=fit`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
  await page.frameLocator('iframe[title="Actual project"]').locator('h1').first().click();
  for (const scale of ['0.5', '1', '1.5']) {
    await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption(scale);
    const move = page.getByRole('button', { name: 'Move element', exact: true });
    await move.waitFor();
    await page.waitForTimeout(150);
    const geometry = await move.evaluate(element => {
      const r = element.getBoundingClientRect();
      const selection = element.closest('[aria-label="Selected source element"]')!.getBoundingClientRect();
      return { width: r.width, height: r.height, centerOffset: r.x + r.width / 2 - selection.x - selection.width / 2, ancestors: [...(function* () { let e: Element | null = element; while (e) { yield e; e = e.parentElement; } })()].map(e => ({ className: e.getAttribute('class'), scale: getComputedStyle(e).scale, transform: getComputedStyle(e).transform })) };
    });
    rows.push({ scale, geometry });
    console.log(JSON.stringify({ scale, geometry }));
    fs.writeFileSync(`${evidence}/geometry.json`, JSON.stringify(rows, null, 2));
    await page.screenshot({ path: `${evidence}/zoom-${scale}.png` });
    assert.ok(geometry.width >= 25 && geometry.width <= 29, 'Move width must stay between 25 and 29 screen pixels');
    assert.ok(geometry.height >= 25 && geometry.height <= 29, 'Move height must stay between 25 and 29 screen pixels');
    assert.ok(Math.abs(geometry.centerOffset) <= 1, 'Move stays centered on the selection');
  }
  assert.deepEqual(errors, []);
  console.log('PASS Move remains screen-sized and centered at 50%, 100%, 150%');
} finally { await browser.close(); }
