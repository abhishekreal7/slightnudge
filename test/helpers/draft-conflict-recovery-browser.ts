import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import type { Page } from 'playwright';

export async function checkDraftConflictRecovery(page: Page, base: string, workspace: string) {
  const file = path.join(workspace, 'fixtures/1-plain-static.tsx');
  const original = fs.readFileSync(file, 'utf8');
  const key = 'slightnudge:studio:continuous-draft:v1';
  page.setDefaultTimeout(30000);
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
  try {
    await page.goto(base + '/editor?view=full', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
    const heading = page.frameLocator('iframe[title="Actual project"]').locator('h1');
    await heading.click();
    const size = page.getByRole('toolbar', { name: 'Selection formatting' }).getByRole('combobox', { name: 'Font size', exact: true });
    await size.selectOption('text-3xl');
    await page.waitForFunction(key => localStorage.getItem(key) !== null, key);
    await idle();
    const stored = await page.evaluate(key => localStorage.getItem(key), key);
    assert.ok(stored, 'First edit creates a recoverable draft');
    const external = original + '\n// external change retained\n';
    fs.writeFileSync(file, external);
    await heading.click();
    await size.selectOption('text-4xl'); await idle();
    const conflict = page.getByRole('alert', { name: 'Source conflict', exact: true });
    await conflict.waitFor();
    assert.equal(fs.readFileSync(file, 'utf8'), external, 'Refused edit never overwrites external source');
    await Promise.all([
      page.waitForEvent('domcontentloaded'),
      conflict.getByRole('button', { name: 'Back up draft and use current source', exact: true }).click(),
    ]);
    await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
    await idle();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
    const backups = await page.evaluate(key => Object.keys(localStorage).filter(k => k.startsWith(key + ':backup:')).map(k => localStorage.getItem(k)), key);
    assert.ok(backups.includes(stored), 'Exact draft is retained in a separate backup');
    assert.equal(fs.readFileSync(file, 'utf8'), external);
    await heading.click(); await size.selectOption('text-3xl');
    await page.waitForFunction(key => localStorage.getItem(key) !== null, key);
    await idle();
    assert.equal(await conflict.count(), 0, 'Editing continues on the current source');
    assert.ok(await page.evaluate(key => localStorage.getItem(key), key));
    assert.equal(fs.readFileSync(file, 'utf8'), external);
    console.log('PASS conflict refuses overwrite, backs up exact draft, reloads current source and permits a new edit');
    return 1;
  } finally { fs.writeFileSync(file, original); }
}
