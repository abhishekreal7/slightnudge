import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export async function checkStudioReloadRecovery(page: Page, baseURL: string, workspace: string) {
  const source = path.join(workspace, 'fixtures/1-plain-static.tsx');
  const original = fs.readFileSync(source, 'utf8');
  const counts = { apply: 0, undo: 0, applyStatus: 0, undoStatus: 0 };
  let statusAvailable = true;
  for (const kind of ['apply', 'undo'] as const) {
    await page.route(`**/api/slightnudge/${kind}/status`, async route => {
      counts[kind === 'apply' ? 'applyStatus' : 'undoStatus']++;
      if (statusAvailable) await route.continue(); else await route.abort('connectionreset');
    });
  }
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/api/slightnudge/apply') counts.apply++;
    if (pathname === '/api/slightnudge/undo') counts.undo++;
  });
  const hydrated = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/pages'));
  await page.goto(`${baseURL}/studio`, { waitUntil: 'domcontentloaded' }); await hydrated;
  const apply = page.getByRole('button', { name: 'Apply to code', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Recover previous source operation' });
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
  const renderCurrent = async () => {
    const rendered = await page.request.get(`${baseURL}/fixtures/1`);
    assert.equal(rendered.status(), 200, 'The actual source route must finish rebuilding before the next editing task');
    await idle();
  };
  const prepare = async () => {
    await renderCurrent(); await page.locator('h1').click();
    const prepared = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/preview') && response.request().method() === 'POST');
    await page.getByTitle('Toggle bold', { exact: true }).click();
    const proposal = await (await prepared).json(); assert.equal(proposal.success, true, proposal.error);
    await apply.waitFor(); return proposal;
  };
  const save = async () => { await apply.click(); await apply.waitFor({ state: 'hidden' }); await idle(); };
  const undo = async () => {
    await renderCurrent();
    const response = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/undo'));
    await page.getByTitle('Undo visual adjustment (Ctrl+Z)').click(); assert.equal((await (await response).json()).success, true); await renderCurrent();
  };
  const drop = async (kind: 'apply' | 'undo', write: boolean) => {
    await page.route(`**/api/slightnudge/${kind}`, async route => {
      if (write) { const response = await route.fetch(); assert.equal((await response.json()).success, true); }
      await route.abort('connectionreset');
    }, { times: 1 });
  };
  const reloadBlocked = async (kind: 'save' | 'Undo') => {
    await page.reload({ waitUntil: 'domcontentloaded' }); await dialog.waitFor();
    const check = dialog.getByRole('button', { name: `Check ${kind} status`, exact: true }); await check.waitFor(); await idle();
    const before = { apply: counts.apply, undo: counts.undo };
    await page.keyboard.press('Control+z');
    assert.equal(counts.apply, before.apply); assert.equal(counts.undo, before.undo);
    assert.equal(await dialog.isVisible(), true);
    return check;
  };
  const verifyAcceptedCheckpoint = async () => {
    await prepare(); await save();
    const accepted = fs.readFileSync(source, 'utf8'); assert.notEqual(accepted, original);
    const before = { apply: counts.apply, undo: counts.undo };
    await page.reload({ waitUntil: 'domcontentloaded' }); await idle(); await dialog.waitFor({ state: 'hidden' });
    assert.equal(counts.apply, before.apply); assert.equal(counts.undo, before.undo);
    assert.equal(fs.readFileSync(source, 'utf8'), accepted);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('h1')!).fontWeight === '700');
    await undo(); assert.equal(fs.readFileSync(source, 'utf8'), original);
    console.log('PASS: a confirmed editing checkpoint restores after normal reload, verifies its receipt, and preserves explicit Undo without replaying a write');
  };
  if (process.argv.includes('--checkpoint-only')) { await verifyAcceptedCheckpoint(); return 1; }

  // Save accepted by the real backend; response and status are both lost.
  await prepare(); statusAvailable = false; await drop('apply', true); await apply.click();
  await page.getByText('Save status unconfirmed', { exact: true }).waitFor();
  const saved = fs.readFileSync(source, 'utf8'); assert.notEqual(saved, original);
  const applyBeforeReload = counts.apply;
  const checkSave = await reloadBlocked('save');
  assert.equal(counts.apply, applyBeforeReload, 'Reload must not replay Apply');
  await page.screenshot({ path: path.join(process.cwd(), 'docs/m0-tab-recovery.png'), animations: 'disabled' });
  statusAvailable = true; await checkSave.click(); await dialog.waitFor({ state: 'hidden' });
  assert.equal(fs.readFileSync(source, 'utf8'), saved); assert.equal(counts.apply, applyBeforeReload);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('h1')!).fontWeight === '700');
  await undo(); assert.equal(fs.readFileSync(source, 'utf8'), original);
  console.log('PASS: full reload preserves an unknown accepted Apply; only read-only status checks run; restored accepted edit can be undone');

  // Browser intent exists but no request reaches a source mutation.
  await prepare(); statusAvailable = false; await drop('apply', false); await apply.click();
  await page.getByText('Save status unconfirmed', { exact: true }).waitFor();
  assert.equal(fs.readFileSync(source, 'utf8'), original);
  const unwrittenCount = counts.apply;
  await reloadBlocked('save'); statusAvailable = true;
  await dialog.getByRole('button', { name: 'Check save status', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' }); await apply.waitFor();
  assert.equal(counts.apply, unwrittenCount, 'An unchanged source does not authorize automatic Apply');
  assert.equal(fs.readFileSync(source, 'utf8'), original);
  await save(); assert.equal(counts.apply, unwrittenCount + 1); await undo();
  assert.equal(fs.readFileSync(source, 'utf8'), original);
  console.log('PASS: reload before a source write restores local review; only explicit Apply saves it');

  await prepare(); await save(); const older = fs.readFileSync(source, 'utf8');
  await prepare(); await save(); assert.notEqual(fs.readFileSync(source, 'utf8'), older);
  statusAvailable = false; await drop('undo', true);
  await page.getByTitle('Undo visual adjustment (Ctrl+Z)').click();
  await page.getByText('Undo status unconfirmed. Editing is paused until it is checked.', { exact: true }).waitFor();
  const undoBeforeReload = counts.undo;
  const checkUndo = await reloadBlocked('Undo');
  assert.equal(fs.readFileSync(source, 'utf8'), older);
  assert.equal(counts.undo, undoBeforeReload);
  statusAvailable = true; await checkUndo.click(); await dialog.waitFor({ state: 'hidden' });
  assert.equal(counts.undo, undoBeforeReload);
  assert.equal(fs.readFileSync(source, 'utf8'), older);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('h1')!).fontWeight === '700');
  await undo(); assert.equal(fs.readFileSync(source, 'utf8'), original);
  assert.equal(counts.undo, undoBeforeReload + 1, 'Only a separate explicit Undo may restore the older edit');
  console.log('PASS: full reload pins unknown Undo to the newer accepted edit and preserves the older Undo step');

  await prepare(); await save(); statusAvailable = false; await drop('undo', false);
  await page.getByTitle('Undo visual adjustment (Ctrl+Z)').click();
  await page.getByText('Undo status unconfirmed. Editing is paused until it is checked.', { exact: true }).waitFor();
  const unstartedUndo = counts.undo;
  await reloadBlocked('Undo'); statusAvailable = true;
  await dialog.getByRole('button', { name: 'Check Undo status', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
  assert.equal(counts.undo, unstartedUndo);
  assert.notEqual(fs.readFileSync(source, 'utf8'), original);
  await undo(); assert.equal(counts.undo, unstartedUndo + 1); assert.equal(fs.readFileSync(source, 'utf8'), original);
  console.log('PASS: unwritten Undo survives reload and requires a fresh explicit Undo');

  await prepare();
  await page.evaluate(() => {
    const originalSet = Storage.prototype.setItem;
    (window as any).__restoreRecoveryStorage = () => { Storage.prototype.setItem = originalSet; };
    Storage.prototype.setItem = function(key, value) { if (key.startsWith('slightnudge:write-recovery:')) throw new DOMException('Quota', 'QuotaExceededError'); originalSet.call(this, key, value); };
  });
  const beforeQuota = counts.apply; await apply.click();
  await page.getByLabel('Editor notice', { exact: true }).filter({ hasText: 'No write was sent.' }).waitFor();
  assert.equal(counts.apply, beforeQuota); assert.equal(fs.readFileSync(source, 'utf8'), original);
  await page.evaluate(() => (window as any).__restoreRecoveryStorage());
  await page.getByRole('button', { name: 'Discard', exact: true }).click(); await apply.waitFor({ state: 'hidden' });
  console.log('PASS: unavailable recovery storage refuses Apply before any mutation request');
  await verifyAcceptedCheckpoint();
  return 6;
}
