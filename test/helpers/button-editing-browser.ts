import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export async function checkButtonEditing(page: Page, baseURL: string, workspace: string) {
  page.setDefaultTimeout(45000);
  const browserErrors: string[] = []; page.on('pageerror', error => browserErrors.push(error.message));
  await page.addInitScript(() => { (window as any).buttonNotices = []; addEventListener('DOMContentLoaded', () => new MutationObserver(() => { const notice = document.querySelector('[aria-label="Editor notice"]')?.textContent; if (notice && (window as any).buttonNotices.at(-1) !== notice) (window as any).buttonNotices.push(notice); }).observe(document.body, { childList: true, subtree: true, characterData: true })); });
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx'), original = fs.readFileSync(file, 'utf8');
  const baseline = original.replace('</nav>', '</nav><button id="native-cta" type="button" className="sn-playground-primary">Save draft <svg aria-hidden="true" width="14" height="14"><path d="M2 7l3 3 7-7"/></svg></button>');
  fs.writeFileSync(file, baseline);
  const frame = page.frameLocator('iframe[title="Actual project"]');
  const toolbar = page.getByRole('toolbar', { name: 'Selection formatting' });
  const status = page.getByLabel('Draft status', { exact: true });
  const header = page.getByRole('banner', { name: 'Editor toolbar' });
  const sourceAction = async (kind: 'apply' | 'undo', action: () => Promise<unknown>) => {
    await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === `/api/slightnudge/${kind}` && response.request().method() === 'POST', { timeout: 90000 }), action()]);
    await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 60000 });
  };
  const primary = frame.locator('a.sn-playground-primary');
  try {
    await page.goto(`${baseURL}/studio`, { waitUntil: 'networkidle', timeout: 120000 });
    await primary.waitFor({ timeout: 120000 });
    // Clicking the icon selects its button, rather than editing the arrow.
    await primary.locator('span').click(); await toolbar.getByRole('button', { name: 'Edit text', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Source layers').getByRole('button', { name: 'Get started', exact: true }).getAttribute('aria-pressed'), 'true');
    const originalSize = await primary.evaluate(element => getComputedStyle(element).fontSize);
    const originalMarkup = await primary.innerHTML();
    await toolbar.getByRole('button', { name: 'Edit text', exact: true }).click();
    let editor = frame.getByRole('textbox', { name: 'Edit selected text' });
    await editor.click();
    assert.equal(await editor.evaluate(element => getComputedStyle(element).fontSize), originalSize);
    assert.equal(await primary.evaluate(() => location.hash), '');
    await editor.press('Control+a'); await editor.press('Backspace'); await editor.press('Enter');
    await page.getByLabel('Editor notice', { exact: true }).filter({ hasText: 'Empty text' }).waitFor();
    assert.match(await primary.textContent() || '', /Get started.*→/);
    assert.equal(await primary.innerHTML(), originalMarkup);
    await toolbar.getByRole('button', { name: 'Edit text', exact: true }).click();
    await editor.press('Control+a'); await editor.pressSequentially('Temporary label'); await editor.press('Escape');
    assert.match(await primary.textContent() || '', /Get started.*→/);
    assert.equal(await primary.innerHTML(), originalMarkup);
    await toolbar.getByRole('button', { name: 'Edit text', exact: true }).click();
    await editor.press('Control+a'); await editor.pressSequentially('Start building'); await editor.press('Enter');
    await status.filter({ hasText: '1 change' }).waitFor();
    assert.equal(await primary.locator('span').textContent(), '→');
    assert.equal(await primary.getAttribute('href'), '#start');
    const oldFill = await primary.evaluate(element => getComputedStyle(element).backgroundColor);
    await toolbar.getByRole('button', { name: 'More formatting options' }).click();
    await page.getByRole('button', { name: 'Fill: Blue', exact: true }).click();
    await status.filter({ hasText: '2 changes' }).waitFor();
    const fill = await primary.evaluate(element => getComputedStyle(element).backgroundColor);
    assert.notEqual(fill, oldFill);
    await toolbar.getByRole('combobox', { name: 'Font size', exact: true }).selectOption('text-lg');
    await status.filter({ hasText: '3 changes' }).waitFor();
    assert.equal(await primary.evaluate(element => getComputedStyle(element).fontSize), '18px');
    await page.getByRole('button', { name: 'Borders', exact: true }).click();
    await page.getByRole('combobox', { name: 'Corner radius' }).selectOption('rounded-full');
    await status.filter({ hasText: '4 changes' }).waitFor();
    assert.equal(await page.getByRole('combobox', { name: 'Corner radius' }).inputValue(), 'rounded-full');
    assert.equal(fs.readFileSync(file, 'utf8'), baseline);
    await page.reload({ waitUntil: 'networkidle' });
    await primary.filter({ hasText: 'Start building' }).waitFor();
    assert.equal(await primary.locator('span').textContent(), '→');
    assert.equal(fs.readFileSync(file, 'utf8'), baseline);
    await sourceAction('apply', () => header.getByRole('button', { name: 'Save changes', exact: true }).click());
    assert.equal(await primary.evaluate(element => getComputedStyle(element).backgroundColor), fill);
    assert.equal(await primary.evaluate(element => getComputedStyle(element).fontSize), '18px');
    const saved = fs.readFileSync(file, 'utf8');
    assert.ok(saved.includes('Start building') && saved.includes('!bg-blue-600') && saved.includes('!rounded-full'));
    assert.equal(await primary.locator('span').textContent(), '→');
    await sourceAction('undo', () => page.getByRole('button', { name: 'Undo', exact: true }).click());
    assert.equal(fs.readFileSync(file, 'utf8'), baseline);
    assert.match(await primary.textContent() || '', /Get started.*→/);
    console.log('PASS link-button label editing, icon selection, empty/cancel recovery, fill/size/radius against project CSS, draft refresh, Save and Undo preserve icon and destination');

    const native = frame.locator('#native-cta'); await native.locator('svg').click();
    await toolbar.getByRole('button', { name: 'Edit text', exact: true }).click();
    editor = frame.getByRole('textbox', { name: 'Edit selected text' });
    await editor.press('Control+a'); await editor.pressSequentially(' Save changes '); await editor.dblclick();
    await editor.press('End'); await editor.press('Enter');
    await status.filter({ hasText: '1 change' }).waitFor();
    await sourceAction('apply', () => header.getByRole('button', { name: 'Save changes', exact: true }).click());
    assert.equal(await native.locator('svg path').getAttribute('d'), 'M2 7l3 3 7-7');
    assert.equal(await native.getAttribute('type'), 'button');
    assert.equal((await native.textContent())?.trim(), 'Save changes');
    await sourceAction('undo', () => page.getByRole('button', { name: 'Undo', exact: true }).click());
    assert.equal(fs.readFileSync(file, 'utf8'), baseline);
    console.log('PASS native button label Save/Undo preserves icon, button type and surrounding source');
    assert.deepEqual(browserErrors, []);
    return 2;
  } catch (error) {
    console.log('Button notices', await page.evaluate(() => (window as any).buttonNotices));
    console.log('Button DOM', await primary.evaluate(element => element.outerHTML).catch(() => 'unavailable'));
    throw error;
  } finally { fs.writeFileSync(file, original); }
}
