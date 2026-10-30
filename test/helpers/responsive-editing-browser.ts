import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export async function checkResponsiveEditing(page: Page, baseURL: string, workspace: string, classic = false) {
  page.setDefaultTimeout(45000); const errors: string[] = []; page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => { if (message.text().startsWith('Responsive bridge refusal:')) console.log(message.text()); });
  await page.addInitScript(() => { window.addEventListener('message', event => { if (event.data?.type === 'edit-result' && event.data.success === false) console.log('Responsive bridge refusal:', event.data.reason); }); });
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  const original = `'use client';export default function Page(){return <main className="min-h-screen bg-white p-8"><section className="mx-auto max-w-4xl rounded-xl border border-slate-200 p-8"><p className="mb-4 text-sm text-emerald-700">A little room to create</p><h1 id="responsive-title" className="text-lg font-semibold md:text-2xl lg:text-5xl">Make something that fits.</h1><p className="mt-5 text-base text-slate-600">One layout. Thoughtfully shaped for every screen.</p></section></main>}`;
  fs.writeFileSync(file, original);
  fs.appendFileSync(path.join(workspace, 'app/globals.css'), '\n@theme { --breakpoint-sm: initial; --breakpoint-md: 52rem; --breakpoint-tablet: 58rem; }\n');
  const frame = page.frameLocator('iframe[title="Actual project"]'), heading = frame.locator('#responsive-title');
  const scope = page.getByRole('combobox', { name: 'Responsive edit scope', exact: true }), width = page.getByRole('spinbutton', { name: 'Preview width', exact: true });
  const toolbar = page.getByRole('toolbar', { name: 'Selection formatting' }), size = toolbar.getByRole('combobox', { name: 'Font size', exact: true }), dock = classic ? page.getByLabel('Visual editing workspace', { exact: true }) : page.getByRole('banner', { name: 'Editor toolbar' });
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 90000 });
  const viewport = async (value: number) => { await width.fill(String(value)); await width.press('Enter'); await page.waitForFunction(expected => document.querySelector('iframe')?.contentWindow?.innerWidth === expected, value); };
  const font = async (value: string) => { const deadline = Date.now() + 15000; let actual = ''; while (Date.now() < deadline) { actual = await heading.evaluate(element => getComputedStyle(element).fontSize); if (actual === value) return; await page.waitForTimeout(75); } assert.equal(actual, value); };
  const count = (value: string) => page.getByLabel('Draft status', { exact: true }).filter({ hasText: value }).waitFor();
  try {
    await page.goto(`${baseURL}/studio${classic ? '' : '/window'}`, { waitUntil: 'domcontentloaded', timeout: 120000 }); await heading.waitFor({ timeout: 120000 });
    if (classic) {
      const panel = page.locator('[data-editor-panel="inspector"]'), divider = page.getByRole('separator', { name: 'Resize design panel' });
      const canvas = page.locator('[data-editor-canvas]');
      assert.equal(await page.getByRole('banner', { name: 'Editor toolbar' }).count(), 0);
      assert.equal((await canvas.boundingBox())?.y, 0);
      assert.equal((await panel.boundingBox())?.width, 288);
      await divider.focus(); await divider.press('ArrowLeft'); assert.equal((await panel.boundingBox())?.width, 296);
      const grip = await divider.boundingBox(); assert.ok(grip);
      await page.mouse.move(grip.x + 3, grip.y + 100); await page.mouse.down(); await page.mouse.move(grip.x - 29, grip.y + 100, { steps: 4 }); await page.mouse.up();
      assert.equal((await panel.boundingBox())?.width, 328);
      await page.reload(); await heading.waitFor(); assert.equal((await panel.boundingBox())?.width, 328);
      await divider.focus(); await divider.press('Home'); assert.equal((await panel.boundingBox())?.width, 288);
      await panel.getByRole('button', { name: 'Hide design panel', exact: true }).click(); assert.equal(await panel.isVisible(), false);
      assert.ok(await dock.getByRole('button', { name: 'Save changes', exact: true }).isVisible());
      await page.reload(); await heading.waitFor(); assert.equal(await panel.isVisible(), false);
      await page.getByRole('button', { name: 'Show design panel', exact: true }).click(); assert.ok(await panel.isVisible());
      await page.getByRole('button', { name: 'Focus canvas', exact: true }).click(); assert.equal(await panel.isVisible(), false); assert.equal(await page.locator('[data-editor-panel="layers"]').isVisible(), false);
      assert.ok(await dock.getByRole('button', { name: 'Save changes', exact: true }).isVisible());
      await page.getByRole('button', { name: 'Restore sidebars', exact: true }).click(); assert.ok(await panel.isVisible());
      await page.getByLabel('Workspace options', { exact: true }).click(); assert.equal(await page.getByRole('link', { name: 'Open editing window', exact: true }).getAttribute('href'), '/studio/window');
      await page.keyboard.press('Escape'); assert.equal(await page.getByRole('link', { name: 'Open editing window', exact: true }).isVisible(), false);
      console.log('PASS workspace layout: no top bar, canvas at top, 288px inspector, keyboard and pointer resizing, persisted width/collapse, focus mode, visible Save with hidden panels, workspace navigation');
    }
    await heading.click(); await toolbar.waitFor(); await scope.locator('option[value="tablet"]').waitFor({ state: 'attached' });
    assert.match(await scope.locator('option[value="md"]').innerText(), /832/); assert.equal(await scope.locator('option[value="sm"]').count(), 0);
    await dock.getByRole('button', { name: 'Mobile', exact: true }).click(); await viewport(375); await font('18px');
    await size.selectOption('text-xl'); await count('1 change'); await font('20px');
    await scope.selectOption('md'); await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.innerWidth === 832); await font('24px');
    await size.selectOption('text-4xl'); await count('2 changes'); await font('36px');
    await scope.selectOption('tablet'); await page.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.innerWidth === 928);
    await size.selectOption('text-3xl'); await count('3 changes'); await font('30px');
    for (const hostWidth of [1024, 1280, 1600]) {
      await page.setViewportSize({ width: hostWidth, height: 1000 });
      const dockBox = await dock.boundingBox(), scopeBox = await scope.boundingBox(), saveBox = await dock.getByRole('button', { name: 'Save changes', exact: true }).boundingBox();
      assert.ok(dockBox && scopeBox && saveBox); assert.ok(dockBox.x >= 0 && dockBox.x + dockBox.width <= hostWidth + 1); assert.ok(scopeBox.x >= dockBox.x && saveBox.x + saveBox.width <= dockBox.x + dockBox.width + 1, 'Responsive controls and Save must fit inside the editor toolbar');
    }
    await page.screenshot({ path: path.join(process.cwd(), classic ? 'docs/workspace-layout-selected.png' : 'docs/responsive-custom-scope.png') });
    await viewport(1024); await font('48px'); await viewport(375); await font('20px');
    await size.selectOption('text-6xl'); await page.getByLabel('Editor notice', { exact: true }).filter({ hasText: 'outside the current preview width' }).waitFor(); await idle(); await count('3 changes'); await font('20px');
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    await page.getByRole('button', { name: 'Show tablet', exact: true }).click(); await font('30px');
    await dock.getByRole('button', { name: 'Undo', exact: true }).click(); await idle(); await font('36px');
    await dock.getByRole('button', { name: 'Redo', exact: true }).click(); await idle(); await font('30px');
    await viewport(2000); assert.equal(await heading.evaluate(() => innerWidth), 2000, 'Large previews must not be silently clamped to the editor window');
    await viewport(375); await font('20px');
    await page.reload({ waitUntil: 'domcontentloaded' }); await heading.waitFor({ timeout: 120000 }); await count('3 changes'); await font('20px'); assert.equal(await scope.inputValue(), 'tablet'); assert.equal(await width.inputValue(), '375');
    await page.screenshot({ path: path.join(process.cwd(), classic ? 'docs/workspace-layout-mobile.png' : 'docs/responsive-mobile-draft.png') });
    await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/apply' && response.request().method() === 'POST', { timeout: 90000 }), dock.getByRole('button', { name: 'Save changes', exact: true }).click()]); await idle(); await page.locator('[data-source-ready="true"]').waitFor(); await font('20px');
    const saved = fs.readFileSync(file, 'utf8'); assert.ok(saved.includes('md:text-4xl')); assert.ok(saved.includes('tablet:text-3xl')); assert.ok(saved.includes('lg:text-5xl')); assert.ok(saved.includes('text-xl '));
    await viewport(832); await font('36px'); await viewport(928); await font('30px'); await viewport(1024); await font('48px');
    await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/undo' && response.request().method() === 'POST', { timeout: 90000 }), dock.getByRole('button', { name: 'Undo', exact: true }).click()]); await idle(); assert.equal(fs.readFileSync(file, 'utf8'), original); await viewport(375); await font('18px');
    if (classic) {
      await scope.selectOption(''); await dock.getByRole('button', { name: 'Desktop', exact: true }).click(); await idle();
      const canvas = page.locator('[data-editor-canvas]'), frameBox = await page.locator('iframe').boundingBox(), canvasBox = await canvas.boundingBox();
      assert.ok(frameBox && canvasBox); assert.ok(frameBox.x >= canvasBox.x && frameBox.x + frameBox.width <= canvasBox.x + canvasBox.width + 1, 'Default preview must fit the available canvas');
      const controlsBox = await page.getByRole('region', { name: 'Canvas controls', exact: true }).boundingBox();
      assert.ok(controlsBox && controlsBox.y >= canvasBox.y + canvasBox.height - 1, 'Canvas controls must reserve space outside the page');
      assert.ok(controlsBox.x >= canvasBox.x + 10 && controlsBox.x + controlsBox.width <= canvasBox.x + canvasBox.width - 10, 'Canvas dock must float with space on both sides');
      assert.ok(controlsBox.y + controlsBox.height <= page.viewportSize()!.height - 12, 'Canvas dock must remain detached from the bottom edge');
      await page.screenshot({ path: path.join(process.cwd(), 'docs/workspace-layout-final.png') });
      await page.goto(baseURL + '/studio/window'); await page.locator('[data-source-ready="true"]').waitFor();
      const windowDock = page.getByRole('banner', { name: 'Editor toolbar', exact: true });
      for (const hostWidth of [1024, 1280, 1600]) {
        await page.setViewportSize({ width: hostWidth, height: 1000 });
        const box = await windowDock.boundingBox(), save = await windowDock.getByRole('button', { name: 'Save changes', exact: true }).boundingBox();
        assert.ok(box && save); assert.ok(box.x >= 0 && box.x + box.width <= hostWidth + 1); assert.ok(save.y >= box.y && save.y + save.height <= box.y + box.height + 1, 'Window Save must stay on the dock row');
      }
      console.log('PASS workspace default preview fits canvas, footer reserves page space, separate-window dock remains usable at 1024/1280/1600');
    }
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS responsive browser: actual custom/removed breakpoints, base/md/custom cascade, exact preview widths beyond host size, inactive-scope refusal, no preview writes, draft Undo/Redo, width/scope refresh recovery, Save at another width, rendered breakpoint persistence, exact source Undo');
  } catch (error) { console.log('Responsive editor state', await page.locator('body').innerText().catch(() => 'unavailable')); console.log('Browser errors', errors); await page.screenshot({ path: path.join(process.cwd(), 'docs/responsive-editing-failure.png') }).catch(() => {}); throw error; }
  return 1;
}
