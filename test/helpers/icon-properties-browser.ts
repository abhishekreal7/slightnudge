import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export async function checkIconProperties(page: Page, baseURL: string, workspace: string, evidenceRoot: string, repository?: { id: string; root: string; url: string }, replacement = false) {
  page.setDefaultTimeout(45000);
  await page.addInitScript(() => { (window as any).__iconMessages = []; addEventListener('message', event => { if (event.data?.channel === 'slightnudge') (window as any).__iconMessages.push({ type: event.data.type, id: event.data.selection?.elementId, tag: event.data.selection?.tagName, reason: event.data.reason }); }); });
  page.on('pageerror', error => console.log('Icon page error', error.message));
  const file = repository ? path.join(repository.root, 'app/page.tsx') : path.join(workspace, 'fixtures/1-plain-static.tsx');
  const original = fs.readFileSync(file, 'utf8');
  const fixture = `'use client';
import { ArrowRight as Mark } from 'lucide-react';
export default function Page(){return <main className="flex flex-col gap-8 p-12">
<h1 className="text-3xl">Icon editing</h1>
<button id="action" className="flex items-center gap-4" onClick={()=>{document.body.dataset.clicks='1'}}>Continue<Mark id="mark" size={24} strokeWidth={2} color="#112233" onClick={()=>{document.body.dataset.iconClicks='1'}}/></button>
<svg id="native" width={24} height={24} strokeWidth={2} stroke="#112233" fill="none" viewBox="0 0 24 24"><path d="M2 12h20"/></svg>
<Mark id="other" size={18}/><Mark id="computed" size={12+8}/><Mark id="styled" className="w-6 h-6"/>
</main>}`;
  const panel = page.getByRole('region', { name: 'Icon appearance', exact: true });
  const frame = page.frameLocator('iframe[title="Actual project"]');
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
  const preview = async (action: () => Promise<unknown>) => {
    const [response] = await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/preview' && response.request().method() === 'POST' && response.request().postDataJSON().operation !== 'inspect'), action()]);
    const result = await response.json(); assert.equal(result.success, true, JSON.stringify(result)); await idle();
    const noticeNode = page.getByLabel('Editor notice', { exact: true });
    const notice = await noticeNode.count() ? await noticeNode.innerText() : '';
    assert.ok(!/refused|could not|unsupported|not a function|changed outside|style rule/i.test(notice), notice);
  };
  const select = async (id: string, value: string) => {
    console.log('Icon properties: selecting', id);
    await frame.locator('#' + id).click(); await panel.waitFor();
    try { await page.waitForFunction(value => (document.querySelector('[aria-label="Icon size (px)"]') as HTMLInputElement)?.value === value, value); }
    catch (error) { console.log('Icon selection state', id, await page.locator('body').innerText(), await page.evaluate(() => (window as any).__iconMessages?.slice(-12)), await panel.locator('input').evaluateAll(inputs => inputs.map(input => ({ label: input.getAttribute('aria-label'), value: (input as HTMLInputElement).value, disabled: (input as HTMLInputElement).disabled })))); throw error; }
  };
  const change = async (name: string, value: string) => { const input = panel.getByRole('textbox', { name, exact: true }); await input.fill(value); await preview(() => input.press('Enter')); };
  try {
    for (const windowMode of [false, true]) {
      console.log(`Icon properties: ${repository ? 'imported' : 'local'} ${windowMode ? 'window' : 'Studio'}`);
      fs.writeFileSync(file, fixture); await page.goto('about:blank');
      const editorURL = baseURL + (repository ? `/studio/${repository.id}/${windowMode ? 'window' : 'edit'}?preview=${encodeURIComponent(repository.url)}` : '/studio' + (windowMode ? '/window' : ''));
      for (let attempt = 0; ; attempt++) {
        try { await page.goto(editorURL, { waitUntil: 'domcontentloaded', timeout: 120000 }); break; }
        catch (error) { if (attempt >= 2 || !/ERR_NETWORK_IO_SUSPENDED|ERR_CONNECTION_RESET/.test(String(error))) throw error; await page.waitForTimeout(500); }
      }
      await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 }); await idle();
      if (windowMode) await page.getByRole('button', { name: 'Toggle design panel', exact: true }).click();
      else await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption('1');
      await select('mark', '24');
      if (replacement) {
        const replace = panel.getByRole('button', { name: 'Replace icon', exact: true });
        await replace.click(); const picker = panel.getByRole('group', { name: 'Icon choices', exact: true });
        const search = picker.getByRole('textbox', { name: 'Search icons', exact: true });
        await search.fill('no-such-icon'); await picker.getByText('No matching icons.', { exact: true }).waitFor();
        await search.press('Escape'); assert.equal(await picker.count(), 0); await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Replace icon');
        await replace.click(); const first = picker.getByRole('button', { name: 'Choose Arrow Right', exact: true }); await first.focus(); await first.press('ArrowRight');
        assert.equal(await picker.getByRole('button', { name: 'Choose Arrow Left', exact: true }).evaluate(element => document.activeElement === element), true);
        await picker.getByRole('button', { name: 'Choose Arrow Left', exact: true }).press('Escape');
        const choose = async (name: string) => { await replace.click(); await search.fill(name); await preview(() => picker.getByRole('button', { name: `Choose ${name}`, exact: true }).click()); await replace.filter({ hasText: name }).waitFor(); };
        let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); let held = false;
        let finishHold!: () => void; const continued = new Promise<void>(resolve => { finishHold = resolve; });
        const inspect = (request: import('playwright').Request) => { if (request.method() !== 'POST' || new URL(request.url()).pathname !== '/api/slightnudge/preview') return false; const body = request.postDataJSON(); return body.kind === 'icon' && body.operation === 'inspect' && body.elementId === 'mark' && !!body.parentPreviewId; };
        const hold = async (route: import('playwright').Route) => {
          const paused = !held && inspect(route.request());
          if (paused) { held = true; await gate; }
          try { await route.continue(); }
          catch (error) { if (!/already handled|Target page.*closed/.test(String(error))) throw error; }
          finally { if (paused) finishHold(); }
        };
        await page.route('**/api/slightnudge/preview', hold);
        try {
          const pending = page.waitForRequest(inspect);
          await replace.click(); await search.fill('Heart'); await preview(() => picker.getByRole('button', { name: 'Choose Heart', exact: true }).click()); await pending;
          assert.equal(await replace.isDisabled(), true); assert.equal(await panel.getByRole('textbox', { name: 'Icon size (px)', exact: true }).isDisabled(), true);
        } finally { release(); if (held) await continued; await page.unroute('**/api/slightnudge/preview', hold); }
        await replace.filter({ hasText: 'Heart' }).waitFor(); await frame.locator('#mark.lucide-heart').waitFor(); assert.equal(await frame.locator('#other.lucide-arrow-right').count(), 1);
        await choose('Star'); await frame.locator('#mark.lucide-star').waitFor();
        await page.getByRole('button', { name: 'Undo', exact: true }).click(); await idle(); await frame.locator('#mark.lucide-heart').waitFor();
        await page.getByRole('button', { name: 'Redo', exact: true }).click(); await idle(); await frame.locator('#mark.lucide-star').waitFor();
        await replace.filter({ hasText: 'Star' }).waitFor(); await choose('Heart');
        console.log('Icon replacement: picker search/keyboard, isolated shape changes and Undo/Redo verified');
      }
      const size = panel.getByRole('textbox', { name: 'Icon size (px)', exact: true });
      await size.fill('48'); await size.press('Escape'); assert.equal(await size.inputValue(), '24');
      await size.fill('9999'); await size.press('Enter'); await panel.getByText('Choose 8–256 px.', { exact: true }).waitFor(); assert.equal(await frame.locator('#mark').getAttribute('width'), '24');
      await change('Icon size (px)', '32'); await change('Icon stroke', '1.5'); await change('Icon color', '#abcdef');
      console.log('Icon properties: three Lucide props staged');
      assert.equal(await frame.locator('#mark').evaluate(element => getComputedStyle(element).width), '32px');
      assert.equal(await frame.locator('#mark').getAttribute('stroke-width'), '1.5');
      await page.getByRole('button', { name: 'Undo', exact: true }).click(); await idle(); assert.equal(await frame.locator('#mark').getAttribute('stroke'), '#112233');
      await page.getByRole('button', { name: 'Redo', exact: true }).click(); await idle(); assert.equal(await frame.locator('#mark').getAttribute('stroke'), '#abcdef');
      await select('native', '24'); await change('Icon size (px)', '40');
      assert.equal(await frame.locator('#native path').getAttribute('d'), 'M2 12h20'); assert.equal(await frame.locator('#other').getAttribute('width'), '18');
      await select('computed', ''); assert.equal(await size.isDisabled(), true);
      await select('styled', '24'); assert.equal(await size.isDisabled(), true);
      assert.equal(fs.readFileSync(file, 'utf8'), fixture);
      console.log('Icon properties: native icon and ownership refusals verified');
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 }); await idle();
      await frame.locator('#mark[width="32"][stroke="#abcdef"]').waitFor(); await frame.locator('#native[width="40"]').waitFor();
      if (replacement) await frame.locator('#mark.lucide-heart').waitFor();
      console.log('Icon properties: refreshed draft restored');
      await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/apply' && response.request().method() === 'POST'), page.getByRole('button', { name: 'Save changes', exact: true }).click()]); await idle();
      assert.ok(fs.readFileSync(file, 'utf8').includes('size={32}')); assert.ok(fs.readFileSync(file, 'utf8').includes('document.body.dataset.clicks'));
      if (windowMode) { await page.getByRole('button', { name: 'Browse', exact: true }).click(); const browseFrame = page.frames().find(frame => frame.url().includes('__slightnudge_session=')); assert.ok(browseFrame); await browseFrame.waitForFunction(() => (window as any).__slightnudge_inspect === false); await frame.locator(replacement ? '#mark' : '#action').click(); assert.equal(await frame.locator('body').getAttribute('data-clicks'), '1'); if (replacement) assert.equal(await frame.locator('body').getAttribute('data-icon-clicks'), '1'); await page.getByRole('button', { name: 'Edit', exact: true }).click(); }
      if (windowMode) {
        const actualFrame = page.frames().find(frame => frame.url().includes('__slightnudge_session='));
        assert.ok(actualFrame); await actualFrame.waitForFunction(() => (window as any).__slightnudge_inspect === true);
        const design = page.getByRole('button', { name: 'Toggle design panel', exact: true });
        if (await design.getAttribute('aria-expanded') !== 'true') await design.click();
      }
      await select('mark', '32');
      if (replacement) { assert.ok(fs.readFileSync(file, 'utf8').includes('<Heart id="mark"')); assert.ok(fs.readFileSync(file, 'utf8').includes('<Mark id="other"')); }
      await page.screenshot({ path: path.join(evidenceRoot, `docs/${replacement ? 'icon-replacement' : 'icon-properties'}-${repository ? 'imported-' : ''}${windowMode ? 'window' : 'studio'}.png`) });
      await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/undo' && response.request().method() === 'POST'), page.getByRole('button', { name: 'Undo', exact: true }).click()]); await idle();
      assert.equal(fs.readFileSync(file, 'utf8'), fixture); await frame.locator('#mark[width="24"][stroke="#112233"]').waitFor();
      if (replacement) await frame.locator('#mark.lucide-arrow-right').waitFor();
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      console.log(`PASS ${replacement ? 'icon replacement' : 'icon properties'} ${repository ? 'imported' : 'local'} ${windowMode ? 'window' : 'Studio'}: nested selection, properties, Escape, invalid/provider/class refusal, Undo/Redo, refresh recovery, Save and exact source Undo`);
    }
  } finally { fs.writeFileSync(file, original); }
  return 2;
}
