import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { Page } from 'playwright';

export async function checkImageFraming(page: Page, baseURL: string, workspace: string, root: string) {
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx'), original = fs.readFileSync(file, 'utf8');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200"><path fill="red" d="M0 0h300v200H0z"/><path fill="blue" d="M300 0h300v200H300z"/></svg>';
  const baseline = `export default function Page(){return <main className="p-12"><img id="photo" src="data:image/svg+xml,${encodeURIComponent(svg)}" width="240" height="240" alt="Two color photograph" className="w-60 h-60 object-contain object-center" /></main>}`;
  page.setDefaultTimeout(60000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const frame = page.frameLocator('iframe[title="Actual project"]'), image = frame.locator('#photo');
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
  const color = async () => { const result = await sharp(await image.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true }); const offset = ((Math.floor(result.info.height / 2) * result.info.width) + Math.floor(result.info.width / 2)) * result.info.channels; return [...result.data.subarray(offset, offset + 3)]; };
  try {
    for (const windowMode of [false, true]) {
      fs.writeFileSync(file, baseline); await page.goto('about:blank');
      await page.goto(`${baseURL}/studio${windowMode ? '/window' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
      if (windowMode) await page.getByRole('button', { name: 'Toggle design panel', exact: true }).click();
      else await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption('1');
      await image.click(); await page.getByRole('region', { name: 'Image framing', exact: true }).waitFor();
      const edit = async (name: string, value: string) => {
        const [response] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/slightnudge/preview' && r.request().method() === 'POST'), page.getByRole('combobox', { name, exact: true }).selectOption(value)]);
        const result = await response.json(); assert.equal(result.success, true, result.error); await idle(); assert.equal(fs.readFileSync(file, 'utf8'), baseline);
      };
      await edit('Image fit', 'object-cover'); await edit('Image focal point', 'object-left');
      assert.deepEqual(await color(), [255, 0, 0], 'Left focus must visibly crop to the red part of the real rendered image');
      await edit('Image focal point', 'object-right'); assert.deepEqual(await color(), [0, 0, 255], 'Right focus must visibly crop to blue');
      await page.getByRole('button', { name: 'Undo', exact: true }).click(); await idle(); assert.deepEqual(await color(), [255, 0, 0]);
      await page.getByRole('button', { name: 'Redo', exact: true }).click(); await idle(); assert.deepEqual(await color(), [0, 0, 255]);
      const scope = page.getByRole('combobox', { name: 'Responsive edit scope', exact: true });
      await scope.selectOption('md');
      await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.innerWidth === 768);
      await edit('Image fit', 'object-contain');
      const width = page.getByRole('spinbutton', { name: 'Preview width', exact: true });
      await width.fill('375'); await width.press('Enter');
      await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.innerWidth === 375);
      assert.equal(await image.evaluate(el => getComputedStyle(el).objectFit), 'cover', 'Tablet fit must preserve the phone crop');
      await width.fill('768'); await width.press('Enter');
      await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.innerWidth === 768);
      assert.equal(await image.evaluate(el => getComputedStyle(el).objectFit), 'contain');
      await scope.selectOption('');
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
      await page.getByLabel('Draft status', { exact: true }).filter({ hasText: '4 changes' }).waitFor(); await idle();
      assert.deepEqual(await color(), [0, 0, 255]); assert.equal(fs.readFileSync(file, 'utf8'), baseline);
      await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/slightnudge/apply' && r.request().method() === 'POST'), page.getByRole('button', { name: 'Save changes', exact: true }).click()]); await idle();
      assert.match(fs.readFileSync(file, 'utf8'), /object-cover object-right/); assert.equal(await image.getAttribute('alt'), 'Two color photograph');
      await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/slightnudge/undo' && r.request().method() === 'POST'), page.getByRole('button', { name: 'Undo', exact: true }).click()]); await idle();
      assert.equal(fs.readFileSync(file, 'utf8'), baseline); assert.equal(await image.evaluate(el => getComputedStyle(el).objectFit), 'contain');
      await page.screenshot({ path: path.join(root, `docs/image-framing-${windowMode ? 'window' : 'studio'}.png`) });
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      console.log(`PASS image framing ${windowMode ? 'window' : 'Studio'}: actual crop pixels, fit/focal point, draft Undo/Redo, refresh, Save, source attributes preserved and exact source Undo`);
    }
    assert.deepEqual(errors, []); return 2;
  } finally { fs.writeFileSync(file, original); }
}
