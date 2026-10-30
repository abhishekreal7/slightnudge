import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export async function checkCurrentStudioLive(page: Page, baseURL: string, workspace: string) {
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  const original = fs.readFileSync(file, 'utf8');
  const classes = original.match(/<h1\s+id="target"[^>]*className="([^"]*)"/)![1];
  const expected = original.replace(`className="${classes}"`, `className="${classes} font-bold"`);
  let applies = 0;
  if (process.argv.includes('--trace')) {
    page.on('response', async r => { const p = new URL(r.url()).pathname; if (p.startsWith('/api/slightnudge/') && !p.endsWith('/token')) console.log(`Live API ${p}: ${r.status()} ${p.endsWith('/inspect') ? JSON.stringify(await r.json()) : ''}`); });
  }
  page.on('request', r => { if (new URL(r.url()).pathname.endsWith('/apply')) applies++; });
  const hydrated = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/pages'));
  await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded' });
  await hydrated;
  const heading = page.locator('h1').filter({ hasText: 'Make room for your best work.' });
  const apply = page.getByRole('button', { name: 'Apply to code', exact: true });
  await heading.click();
  const originalWeight = await heading.evaluate(el => getComputedStyle(el).fontWeight);
  const prepare = async () => {
    const response = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/preview') && r.request().method() === 'POST');
    await page.getByTitle('Toggle bold', { exact: true }).click();
    const proposal = await (await response).json();
    assert.equal(proposal.success, true, proposal.error);
    await apply.waitFor();
    assert.equal(proposal.newClassName, `${classes} font-bold`);
  };
  await prepare();
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  assert.equal(await heading.evaluate(el => getComputedStyle(el).fontWeight), '700');
  await page.locator('p').filter({ hasText: 'One thoughtful workspace for the people' }).first().click();
  assert.equal(applies, 0);
  await page.getByRole('button', { name: 'Discard', exact: true }).last().click();
  await apply.waitFor({ state: 'hidden' });
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  assert.equal(await heading.evaluate(el => getComputedStyle(el).fontWeight), originalWeight);
  await prepare();
  const applied = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/apply'));
  await apply.click();
  assert.equal((await (await applied).json()).success, true);
  await page.getByText('Not saved to source', { exact: true }).waitFor({ state: 'hidden' });
  assert.equal(fs.readFileSync(file, 'utf8'), expected);
  const undone = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/undo'));
  await page.getByTitle('Undo visual adjustment (Ctrl+Z)').click();
  assert.equal((await (await undone).json()).success, true);
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  await page.waitForFunction(weight => getComputedStyle(document.querySelector('h1')!).fontWeight === weight, originalWeight);
  await heading.click();
  await prepare();
  const external = original + '\n// External edit in disposable copy only\n';
  fs.writeFileSync(file, external);
  const stale = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/apply'));
  await apply.click();
  assert.equal((await (await stale).json()).code, 'SOURCE_CHANGED');
  await page.getByText('Not saved to source', { exact: true }).waitFor({ state: 'hidden' });
  assert.equal(fs.readFileSync(file, 'utf8'), external);
  assert.equal(await heading.evaluate(el => getComputedStyle(el).fontWeight), originalWeight);
  assert.equal(applies, 2);
  return 7;
}
