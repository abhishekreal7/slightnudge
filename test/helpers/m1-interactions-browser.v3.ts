import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Page } from 'playwright';

export async function checkM1Interactions(page: Page, baseURL: string, workspace: string) {
 page=iframePageV3(page);

  page.on('pageerror', error => console.log('Studio browser error:', error.message));
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  const original = fs.readFileSync(file, 'utf8');
  const classes = original.match(/<h1\s+id="target"[^>]*className="([^"]*)"/)![1];
  const ready = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/pages'), { timeout: 120000 });
  await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded' }); await ready;
  const heading = page.locator('h1'); await heading.click();
  const originalWeight = await heading.evaluate(el => getComputedStyle(el).fontWeight);
  const apply = page.getByRole('button', { name: 'Save changes', exact: true }).and(page.locator('button:enabled'));
  const state = page.getByRole('group', { name: 'Element state' });
  let passed = 0;
  for (const [label, prefix] of [['Hover', 'hover'], ['Focus', 'focus-visible'], ['Pressed', 'active']]) {
    await state.getByRole('button', { name: label, exact: true }).click();
    const prepared = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/preview') && r.request().method() === 'POST');
    await page.getByTitle('Toggle bold', { exact: true }).click();
    const proposal = await (await prepared).json();
    assert.equal(proposal.success, true, proposal.error);
    assert.equal(proposal.newClassName, `${classes} ${prefix}:font-bold`);
    await apply.waitFor();
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('iframe')!.contentDocument!.querySelector('h1')!).fontWeight === '700'); passed++;
    if (process.argv.includes('--screenshot') && label === 'Hover') {
      const screenshot = path.join(os.tmpdir(), 'slightnudge-m1-studio.png');
      await page.screenshot({ path: screenshot, animations: 'disabled' });
      console.log(`Studio screenshot: ${screenshot}`);
    }
    const beforeApply = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/apply'));
    await apply.click(); assert.equal((await (await beforeApply).json()).success, true);
    await page.getByText('Not saved to source', { exact: true }).waitFor({ state: 'hidden' });
    assert.equal(fs.readFileSync(file, 'utf8'), original.replace(`className="${classes}"`, `className="${classes} ${prefix}:font-bold"`)); passed++;
    await state.getByRole('button', { name: 'Default', exact: true }).click();
    await page.waitForFunction(w => getComputedStyle(document.querySelector('iframe')!.contentDocument!.querySelector('h1')!).fontWeight === w, originalWeight); passed++;
    const undone = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/undo'));
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    assert.equal((await (await undone).json()).success, true);
    assert.equal(fs.readFileSync(file, 'utf8'), original); passed++;
  }
  await page.getByRole('button', { name: 'Transitions', exact: true }).click();
  for (const [label, value] of [['Transition', 'transition-colors'], ['Duration', 'duration-200'], ['Delay', 'delay-100'], ['Easing', 'ease-in-out']]) {
    await page.getByLabel(label, { exact: true }).selectOption(value);
    await apply.waitFor();
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    await page.getByRole('button', { name: 'Review changes', exact: true }).click();
    assert.ok((await page.getByLabel('After change').textContent())!.includes(value));
    await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
    await page.getByText('Not saved to source', { exact: true }).waitFor({ state: 'hidden' });
    assert.equal(fs.readFileSync(file, 'utf8'), original); passed++;
    await page.getByLabel(label, { exact: true }).selectOption(value);
    await apply.waitFor();
    const applied = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/apply'));
    await apply.click(); assert.equal((await (await applied).json()).success, true);
    await page.getByText('Not saved to source', { exact: true }).waitFor({ state: 'hidden' });
    assert.equal(fs.readFileSync(file, 'utf8'), original.replace(`className="${classes}"`, `className="${classes} ${value}"`)); passed++;
    if (label === 'Duration') {
      const unchanged = fs.readFileSync(file, 'utf8');
      const response = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/preview') && r.request().method() === 'POST');
      await page.getByLabel(label, { exact: true }).selectOption(value);
      assert.equal((await (await response).json()).changed, false);
      await page.getByText('This style is already applied.', { exact: true }).waitFor();
      assert.equal(await apply.count(), 0);
      assert.equal(fs.readFileSync(file, 'utf8'), unchanged); passed++;
    }
    const undone = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/undo'));
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    assert.equal((await (await undone).json()).success, true);
    assert.equal(fs.readFileSync(file, 'utf8'), original); passed++;
  }
  await page.getByRole('button', { name: 'More formatting options', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Move earlier', exact: true }).count(), 0);
  assert.equal(await page.getByTitle('Drag to reorder element (iOS style)').count(), 0);
  assert.equal(await page.getByText('Overflow', { exact: true }).count(), 0);
  assert.equal(await page.getByText('Object', { exact: true }).count(), 0);
  assert.equal(await page.getByText('Position', { exact: true }).count(), 0); passed++;
  return passed;
}
