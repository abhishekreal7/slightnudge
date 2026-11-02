import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export async function checkComponentActions(page: Page, baseURL: string, workspace: string, root: string, repository?: { id: string; root: string; url: string }) {
 page=iframePageV3(page);

  page.setDefaultTimeout(60000);
  const file = path.join(repository?.root || workspace, repository ? 'app/page.tsx' : 'fixtures/1-plain-static.tsx'), original = fs.readFileSync(file, 'utf8');
  const fixture = `'use client';import RouteLink from 'next/link';
function Shared(){return <a href="#shared" className="block">Shared link</a>}
export default function Page(){const destination='#computed';return <main className="flex flex-col gap-6 p-8 bg-white min-h-screen">
<a id="native" href="#native-old" rel="nofollow" className="w-fit rounded border p-3">Native link</a>
<RouteLink id="next" href="#next-old" prefetch={false} className="w-fit rounded border p-3">Open <span aria-hidden="true">→</span></RouteLink>
<RouteLink id="other" href="#unchanged" prefetch={false} className="w-fit">Other link</RouteLink>
<form onSubmit={event=>event.preventDefault()} className="flex gap-3"><input aria-label="Form value" defaultValue="Original" className="border p-3"/><button id="action" type="button" className="rounded bg-emerald-700 p-3 text-white" onClick={()=>{document.body.dataset.clicks=String(Number(document.body.dataset.clicks||0)+1)}}>Create</button></form>
<a id="computed" href={destination} className="w-fit">Computed link</a><Shared/><Shared/>
<section id="next-new">New destination</section></main>}`;
  const frame = page.frameLocator('iframe[title="Actual project"]');
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
  const panel = page.getByRole('region', { name: 'Component action', exact: true });
  const select = async (id: string, field: 'Link destination' | 'Button type', expected: string) => {
    await frame.locator('#' + id).click(); await panel.waitFor();
    await page.waitForFunction(({ field, expected }) => (document.querySelector(`[aria-label="${field}"]`) as HTMLInputElement | null)?.value === expected, { field, expected });
  };
  const preview = async (action: () => Promise<unknown>) => {
    const [response] = await Promise.all([page.waitForResponse(response => { if (new URL(response.url()).pathname !== '/api/slightnudge/preview' || response.request().method() !== 'POST') return false; const body = response.request().postDataJSON(); return body.operation !== 'inspect'; }), action()]);
    const result = await response.json(); assert.equal(result.success, true, JSON.stringify(result)); await idle();
  };
  const destination = async (value: string) => { const input = panel.getByRole('textbox', { name: 'Link destination', exact: true }); await input.fill(value); await preview(() => input.press('Enter')); await page.waitForFunction(value => (document.querySelector('[aria-label="Link destination"]') as HTMLInputElement | null)?.value === value, value); };
  try {
    for (const windowMode of [false, true]) {
      console.log(`Component actions: ${repository ? 'imported ' : 'local '}${windowMode ? 'window' : 'Studio'}`);
      fs.writeFileSync(file, fixture); await page.goto('about:blank');
      const route = repository ? `/studio/${repository.id}/${windowMode ? 'window' : 'edit'}?preview=${encodeURIComponent(repository.url)}` : '/studio' + (windowMode ? '/window' : '');
      await page.goto(baseURL + route, { waitUntil: 'domcontentloaded', timeout: 120000 }); await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
      if (windowMode) await page.getByRole('button', { name: 'Toggle design panel', exact: true }).click();
      else await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption('1');
      await select('native', 'Link destination', '#native-old');
      const input = panel.getByRole('textbox', { name: 'Link destination', exact: true });
      await input.fill('#cancelled'); await input.press('Escape'); assert.equal(await input.inputValue(), '#native-old'); assert.equal(await frame.locator('#native').getAttribute('href'), '#native-old');
      await input.fill('javascript:alert(1)'); await input.press('Enter'); await panel.getByText('Use a page path, anchor, web address, email or telephone link.', { exact: true }).waitFor();
      assert.equal(await frame.locator('#native').getAttribute('href'), '#native-old'); assert.equal(fs.readFileSync(file, 'utf8'), fixture);
      await destination('#native-new'); await preview(() => panel.getByRole('combobox', { name: 'Link opening behavior', exact: true }).selectOption('_blank'));
      assert.equal(await frame.locator('#native').getAttribute('rel'), 'nofollow noopener noreferrer');
      await select('next', 'Link destination', '#next-old'); await destination('#next-new');
      await preview(() => panel.getByRole('combobox', { name: 'Link opening behavior', exact: true }).selectOption('_blank'));
      const toolbar = page.getByRole('toolbar', { name: 'Selection formatting', exact: true }); await toolbar.getByRole('button', { name: 'Edit text', exact: true }).click();
      const editor = frame.getByRole('textbox', { name: 'Edit selected text', exact: true }); await editor.waitFor(); await editor.press('Control+a'); await editor.pressSequentially('Open the workspace'); await preview(() => editor.press('Enter'));
      assert.equal(await frame.locator('#next span[aria-hidden]').innerText(), '→'); assert.equal(await frame.locator('#other').getAttribute('href'), '#unchanged');
      console.log('Component actions: destinations, opening props and Next Link label verified');
      await select('action', 'Button type', 'button');
      const enabled = panel.getByRole('checkbox', { name: 'Button enabled', exact: true }); await preview(() => enabled.uncheck()); assert.equal(await frame.locator('#action').isDisabled(), true);
      await page.getByRole('button', { name: 'Undo', exact: true }).click(); await idle(); assert.equal(await frame.locator('#action').isEnabled(), true);
      await page.getByRole('button', { name: 'Redo', exact: true }).click(); await idle(); assert.equal(await frame.locator('#action').isDisabled(), true);
      await preview(() => panel.getByRole('combobox', { name: 'Button type', exact: true }).selectOption('reset'));
      await preview(() => enabled.check()); assert.equal(await frame.locator('#action').isEnabled(), true);
      await select('computed', 'Link destination', '#computed'); assert.equal(await input.isDisabled(), true); await panel.getByText('This property comes from code. Its provider stays in control.', { exact: true }).waitFor();
      await frame.getByRole('link', { name: 'Shared link', exact: true }).first().click();
      await page.getByRole('button', { name: 'Edit shared definition', exact: true }).click();
      await page.getByLabel('Editor notice', { exact: true }).filter({ hasText: /used in several places|several rendered instances/i }).waitFor();
      assert.equal(!await input.count() || await input.isDisabled(), true);
      console.log('Component actions: button props, Undo/Redo and provider/shared protections verified');
      assert.equal(fs.readFileSync(file, 'utf8'), fixture);
      let releaseReplay!: () => void;
      const replayGate = new Promise<void>(resolve => { releaseReplay = resolve; });
      const interceptReplay = async (route: import('playwright').Route) => { await replayGate; await route.continue(); };
      await page.route('**/api/slightnudge/draft-view', interceptReplay);
      const replayRequest = page.waitForRequest(request => new URL(request.url()).pathname === '/api/slightnudge/draft-view');
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
      await replayRequest;
      try {
        await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'true');
        assert.equal(await page.getByRole('button', { name: 'Save changes', exact: true }).isDisabled(), true);
        await frame.locator('#next').dblclick(); assert.equal(await frame.getByRole('textbox', { name: 'Edit selected text', exact: true }).count(), 0);
        assert.equal(fs.readFileSync(file, 'utf8'), fixture);
      } finally { releaseReplay(); }
      await idle(); await page.unroute('**/api/slightnudge/draft-view', interceptReplay); await page.getByLabel('Draft status', { exact: true }).filter({ hasText: '8 changes' }).waitFor();
      assert.equal(await frame.getByRole('textbox', { name: 'Edit selected text', exact: true }).count(), 0);
      console.log('Component actions: held refresh replay blocks Save and inline editing until restored');
      await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
      const replayDeadline = Date.now() + 30000; while (await frame.locator('#next').getAttribute('href') !== '#next-new' && Date.now() < replayDeadline) await page.waitForTimeout(50);
      assert.equal(await frame.locator('#next').getAttribute('href'), '#next-new'); assert.equal(await frame.locator('#action').getAttribute('type'), 'reset');
      await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/apply' && response.request().method() === 'POST'), page.getByRole('button', { name: 'Save changes', exact: true }).click()]); await idle();
      assert.ok(fs.readFileSync(file, 'utf8').includes('document.body.dataset.clicks')); assert.equal(await frame.locator('#other').getAttribute('href'), '#unchanged');
      if (windowMode) {
        await page.getByRole('button', { name: 'Browse', exact: true }).click();
        const value = frame.getByRole('textbox', { name: 'Form value', exact: true }); await value.fill('Edited'); await frame.locator('#action').click(); assert.equal(await value.inputValue(), 'Original');
        assert.equal(await frame.locator('body').getAttribute('data-clicks'), '1');
        const [popup] = await Promise.all([page.waitForEvent('popup'), frame.locator('#next').click()]); await popup.waitForURL('**#next-new', { timeout: 120000 }); assert.equal(await popup.evaluate(() => window.opener), null); await popup.close();
        await page.getByRole('button', { name: 'Edit', exact: true }).click();
      }
      await page.screenshot({ path: path.join(root, `docs/component-actions-${repository ? 'imported-' : ''}${windowMode ? 'window' : 'studio'}.png`) });
      await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/undo' && response.request().method() === 'POST'), page.getByRole('button', { name: 'Undo', exact: true }).click()]); await idle();
      assert.equal(fs.readFileSync(file, 'utf8'), fixture); assert.equal(await frame.locator('#next').getAttribute('href'), '#next-old'); assert.equal(await frame.locator('#next').getAttribute('target'), null); assert.equal(await frame.locator('#native').getAttribute('rel'), 'nofollow'); assert.equal(await frame.locator('#action').getAttribute('type'), 'button');
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      console.log(`PASS component actions ${repository ? 'imported ' : 'local '}${windowMode ? 'window' : 'Studio'}: native/Next Link destination and new-tab props, preserved icon/other usage, label, button type/enabled, Undo/Redo, provider/shared ownership, invalid URL/cancel, refresh, grouped Save/exact Undo${windowMode ? ', real Browse form reset/handler and opener-free Next Link popup' : ''}`);
    }
    assert.deepEqual(errors, []); return 2;
  } catch (error) { console.log('Action notice', await page.getByLabel('Editor notice', { exact: true }).allTextContents()); await page.screenshot({ path: path.join(root, 'docs/component-actions-failure.png') }); throw error; }
  finally { fs.writeFileSync(file, original); }
}
