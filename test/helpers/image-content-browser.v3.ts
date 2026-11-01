import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { Page } from 'playwright';

export async function checkImageContent(page: Page, baseURL: string, workspace: string, root: string) {
 page=iframePageV3(page);

  page.setDefaultTimeout(60000);
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx'), original = fs.readFileSync(file, 'utf8');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><path fill="red" d="M0 0h200v100H0z"/></svg>';
  const authored = `export default function Page(){return <main className="p-12"><img id="photo" src="data:image/svg+xml,${encodeURIComponent(svg)}" width="200" height="100" className="object-cover" alt="Original &amp; clear" /></main>}`;
  let baseline = authored;
  const png = await sharp({ create: { width: 200, height: 100, channels: 3, background: '#0000ff' } }).png().toBuffer();
  const frame = page.frameLocator('iframe[title="Actual project"]'), image = frame.locator('#photo');
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 120000 });
  const color = async () => { const result = await sharp(await image.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true }); const at = (Math.floor(result.info.height / 2) * result.info.width + Math.floor(result.info.width / 2)) * result.info.channels; return [...result.data.subarray(at, at + 3)]; };
  const alt = async (value: string) => {
    const input = page.getByRole('textbox', { name: 'Image alt text', exact: true }); await input.fill(value);
    const [response] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/slightnudge/preview' && r.request().method() === 'POST'), input.press('Enter')]);
    const result = await response.json(); assert.equal(result.success, true, result.error); await idle(); assert.equal(await image.getAttribute('alt'), value);
  };
  try {
    for (const windowMode of [false, true]) {
      console.log(`Image content: ${windowMode ? 'window' : 'Studio'}`);
      baseline = windowMode ? authored.replace(' className="object-cover"', '').replace(' alt="Original &amp; clear"', '') : authored;
      fs.writeFileSync(file, baseline); await page.goto('about:blank');
      await page.goto(`${baseURL}/studio${windowMode ? '/window' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
      if (windowMode) await page.getByRole('button', { name: 'Toggle design panel', exact: true }).click();
      else await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption('1');
      await image.click(); await page.getByRole('region', { name: 'Image content', exact: true }).waitFor();
      assert.equal(await page.getByRole('combobox', { name: 'Image fit', exact: true }).isDisabled(), windowMode);
      assert.equal(await page.getByRole('textbox', { name: 'Image alt text', exact: true }).isEnabled(), true);
      await page.screenshot({ path: path.join(root, `docs/image-content-controls-${windowMode ? 'window' : 'studio'}.png`) });
      if (windowMode) {
        const [response] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/slightnudge/preview' && r.request().method() === 'POST'), page.getByRole('button', { name: 'Mark as decorative', exact: true }).click()]);
        const result = await response.json(); assert.equal(result.success, true, result.error); await idle(); assert.equal(await image.getAttribute('alt'), '');
      }
      await alt('A "clear" & <useful> description');
      const input = page.getByRole('textbox', { name: 'Image alt text', exact: true });
      await input.fill('Cancelled description'); await input.press('Escape');
      assert.equal(await image.getAttribute('alt'), 'A "clear" & <useful> description');
      await alt(''); assert.equal(await image.getAttribute('alt'), '', 'Decorative images can have an empty alt attribute');
      await alt('A second description');
      const [response] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/slightnudge/preview' && r.request().method() === 'POST'), page.getByLabel('Replace image', { exact: true }).setInputFiles({ name: 'blue.png', mimeType: 'image/png', buffer: png })]);
      const replacement = await response.json(); assert.equal(replacement.success, true, replacement.error); await idle();
      assert.deepEqual(await color(), [0, 0, 255]); assert.equal(fs.readFileSync(file, 'utf8'), baseline);
      assert.equal(await image.getAttribute('width'), '200'); assert.equal(await image.getAttribute('height'), '100');
      const src = await image.getAttribute('src'); assert.match(src!, /^\/slightnudge-assets\//);
      await page.getByRole('button', { name: 'Undo', exact: true }).click(); await idle(); assert.deepEqual(await color(), [255, 0, 0]);
      await page.getByRole('button', { name: 'Redo', exact: true }).click(); await idle(); assert.deepEqual(await color(), [0, 0, 255]);
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
      await image.waitFor();
      await page.getByLabel('Draft status', { exact: true }).filter({ hasText: windowMode ? '5 changes' : '4 changes' }).waitFor(); await idle();
      assert.equal(await image.getAttribute('src'), src); assert.equal(await image.getAttribute('alt'), 'A second description'); assert.deepEqual(await color(), [0, 0, 255]);
      assert.equal(fs.readFileSync(file, 'utf8'), baseline);
      await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/slightnudge/apply' && r.request().method() === 'POST'), page.getByRole('button', { name: 'Save changes', exact: true }).click()]); await idle();
      assert.ok(fs.readFileSync(file, 'utf8').includes(src!)); assert.deepEqual(await color(), [0, 0, 255]);
      await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/slightnudge/undo' && r.request().method() === 'POST'), page.getByRole('button', { name: 'Undo', exact: true }).click()]); await idle();
      assert.equal(fs.readFileSync(file, 'utf8'), baseline); assert.equal(await image.getAttribute('alt'), windowMode ? null : 'Original & clear'); assert.deepEqual(await color(), [255, 0, 0]);
      await page.screenshot({ path: path.join(root, `docs/image-content-${windowMode ? 'window' : 'studio'}.png`) });
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      console.log(`PASS image content ${windowMode ? 'window' : 'Studio'}: real upload and crop pixels, repeated escaped alt edits, immutable drafts, Undo/Redo, refresh, Save, exact source/DOM Undo`);
    }
    assert.deepEqual(errors, []); return 2;
  } catch (error) { console.log('Image content notice', await page.getByLabel('Editor notice', { exact: true }).allTextContents()); await page.screenshot({ path: path.join(root, 'docs/image-content-failure.png') }); throw error; }
  finally { fs.writeFileSync(file, original); }
}
