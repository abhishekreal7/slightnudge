import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { Page } from 'playwright';

export async function checkAdvancedImages(page: Page, baseURL: string, workspace: string, root: string, repository?: { id: string; root: string; url: string }) {
  page.setDefaultTimeout(60000);
  const projectRoot = repository?.root || workspace;
  const file = path.join(projectRoot, repository ? 'app/page.tsx' : 'fixtures/1-plain-static.tsx'), original = fs.readFileSync(file, 'utf8');
  const red = await sharp({ create: { width: 200, height: 100, channels: 3, background: 'red' } }).png().toBuffer();
  const blue = await sharp({ create: { width: 200, height: 100, channels: 3, background: 'blue' } }).png().toBuffer();
  fs.writeFileSync(path.join(projectRoot, 'public/advanced-original.png'), red);
  const source = `import Photo from 'next/image';import Original from '../public/advanced-original.png';
export default function Page(){return <main className="grid grid-cols-2 gap-6 p-8">
<Photo id="next-static" src={Original} alt="Static import"/>
<Photo id="next-literal" src="/advanced-original.png" width={200} height={100} sizes="(max-width: 600px) 100vw, 200px" className="object-cover" alt="Literal image"/>
<div className="relative h-[100px] w-[200px]"><Photo id="next-fill" src={Original} fill sizes="200px" alt="Fill image"/></div>
<img id="native-set" src="/advanced-original.png" srcSet="/advanced-original.png 1x, /advanced-original.png 2x" width={200} height={100} alt="Density image"/>
<picture><source media="(min-width: 700px)" type="image/avif" srcSet="/advanced-original.png 200w, /advanced-original.png 400w" sizes="200px"/><source media="(max-width: 699px)" type="image/webp" srcSet="/advanced-original.png 1x, /advanced-original.png 2x"/><img id="native-picture" src="/advanced-original.png" width={200} height={100} alt="Picture image"/></picture>
</main>}`;
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
  const frame = page.frameLocator('iframe[title="Actual project"]');
  const color = async (id: string) => { const buffer = await frame.locator('#' + id).screenshot(); const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true }); const at = (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * info.channels; return [...data.subarray(at, at + 3)]; };
  try {
    for (const windowMode of [false, true]) {
      fs.writeFileSync(file, source); await page.goto('about:blank');
      const route = repository ? `/studio/${repository.id}/${windowMode ? 'window' : 'edit'}?preview=${encodeURIComponent(repository.url)}` : '/studio' + (windowMode ? '/window' : '');
      await page.goto(baseURL + route, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
      if (windowMode) await page.getByRole('button', { name: 'Toggle design panel', exact: true }).click();
      else await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption('1');
      const before = await frame.locator('img').evaluateAll(images => images.map(image => ({ id: image.id, src: image.getAttribute('src'), srcset: image.getAttribute('srcset'), width: image.getAttribute('width'), height: image.getAttribute('height'), sizes: image.getAttribute('sizes') })));
      for (const id of ['next-static', 'next-literal', 'next-fill', 'native-set', 'native-picture']) {
        console.log('Advanced image', windowMode ? 'window' : 'Studio', id);
        await frame.locator('#' + id).click();
        await page.getByRole('region', { name: 'Image content', exact: true }).waitFor();
        const expectedAlt = await frame.locator('#' + id).getAttribute('alt');
        await page.waitForFunction(value => (document.querySelector('[aria-label="Image alt text"]') as HTMLInputElement | null)?.value === value, expectedAlt);
        const [response] = await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/preview' && response.request().method() === 'POST'), page.getByLabel('Replace image', { exact: true }).setInputFiles({ name: 'blue.png', mimeType: 'image/png', buffer: blue })]);
        const result = await response.json(); assert.equal(result.success, true, JSON.stringify(result)); await idle();
        assert.equal(fs.readFileSync(file, 'utf8'), source, 'Replacement must remain a draft');
        const pixel = await color(id); assert.ok(pixel[2] > 235 && pixel[0] < 20, `Blue replacement pixels: ${id} ${pixel}`);
        if (id === 'next-literal') {
          const [fitResponse] = await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/preview' && response.request().method() === 'POST'), page.getByRole('combobox', { name: 'Image fit', exact: true }).selectOption('object-contain')]);
          assert.equal((await fitResponse.json()).success, true); await idle(); assert.equal(await frame.locator('#' + id).evaluate(image => getComputedStyle(image).objectFit), 'contain');
        }
        const input = page.getByRole('textbox', { name: 'Image alt text', exact: true }); await input.fill('New & clear ' + id);
        const [altResponse] = await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/preview' && response.request().method() === 'POST'), input.press('Enter')]); assert.equal((await altResponse.json()).success, true); await idle();
        assert.equal(await frame.locator('#' + id).getAttribute('alt'), 'New & clear ' + id);
      }
      assert.equal(await frame.locator('source').first().getAttribute('media'), '(min-width: 700px)');
      assert.equal(await frame.locator('source').first().getAttribute('type'), 'image/avif');
      assert.match((await frame.locator('source').first().getAttribute('srcset'))!, /\.avif 200w, .*\.avif 400w/);
      assert.match((await frame.locator('source').nth(1).getAttribute('srcset'))!, /\.webp 1x, .*\.webp 2x/);
      for (const width of [375, 1000]) {
        const control = page.getByRole('spinbutton', { name: 'Preview width', exact: true }); await control.fill(String(width)); await control.press('Enter');
        const deadline = Date.now() + 15000; while (await frame.locator('#native-picture').evaluate(() => innerWidth) !== width && Date.now() < deadline) await page.waitForTimeout(50);
        assert.equal(await frame.locator('#native-picture').evaluate(() => innerWidth), width);
        const pixel = await color('native-picture'); assert.ok(pixel[2] > 230 && pixel[0] < 25, `Picture active candidate at ${width}: ${pixel}`);
        assert.match((await frame.locator('#native-picture').evaluate(image => (image as HTMLImageElement).currentSrc)), new RegExp(width < 700 ? '\\.webp$' : '\\.avif$'));
      }
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
      await page.getByLabel('Draft status', { exact: true }).filter({ hasText: '11 changes' }).waitFor(); await idle();
      await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/apply' && response.request().method() === 'POST'), page.getByRole('button', { name: 'Save changes', exact: true }).click()]); await idle();
      assert.ok(fs.readFileSync(file, 'utf8').includes('width={200} height={100}'));
      assert.ok(fs.readFileSync(file, 'utf8').includes("import Original from"), 'The original shared import is preserved');
      for (const item of before) { const image = frame.locator('#' + item.id); assert.equal(await image.getAttribute('width'), item.width); assert.equal(await image.getAttribute('height'), item.height); assert.equal(await image.getAttribute('sizes'), item.sizes); }
      await page.screenshot({ path: path.join(root, `docs/advanced-image-${windowMode ? 'window' : 'studio'}.png`) });
      await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/undo' && response.request().method() === 'POST'), page.getByRole('button', { name: 'Undo', exact: true }).click()]); await idle();
      assert.equal(fs.readFileSync(file, 'utf8'), source);
      const restored = await frame.locator('img').evaluateAll(images => images.map(image => ({ id: image.id, src: image.getAttribute('src'), srcset: image.getAttribute('srcset'), width: image.getAttribute('width'), height: image.getAttribute('height'), sizes: image.getAttribute('sizes') })));
      assert.deepEqual(restored, before); assert.deepEqual(fs.readFileSync(path.join(projectRoot, 'public/advanced-original.png')), red);
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      console.log(`PASS advanced images ${repository ? 'imported ' : 'local '}${windowMode ? 'window' : 'Studio'}: actual optimized next/image static/literal/fill, native density and picture AVIF/WebP sources, pixels across breakpoints, dimensions/sizes, alt, refresh, grouped Save and exact source/DOM Undo`);
    }
    assert.deepEqual(errors, []); return 2;
  } catch (error) { console.log('Advanced image notice', await page.getByLabel('Editor notice', { exact: true }).allTextContents()); await page.screenshot({ path: path.join(root, 'docs/advanced-image-failure.png') }); throw error; }
  finally { fs.writeFileSync(file, original); }
}
