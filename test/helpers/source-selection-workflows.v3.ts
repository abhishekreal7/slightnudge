import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Project, Node } from 'ts-morph';
import type { Page } from 'playwright';

/** Thirty candidates; exposed elements use physical clicks and real source edits. */
export async function checkSourceSelections(page: Page, repo: string, output: string) {
 page=iframePageV3(page);

  const frame = page.frameLocator('iframe[title="Actual project"]');
  const currentFrame = (await (await page.locator('iframe[title="Actual project"]').elementHandle())!.contentFrame())!;
  await currentFrame.waitForLoadState('domcontentloaded');
  await currentFrame.waitForFunction(() => Array.from(document.querySelectorAll('[data-source-file]')).filter(el => /^(H[1-6]|P|A|BUTTON|SECTION|ARTICLE|SUMMARY|FOOTER|NAV|BLOCKQUOTE|LI|DIV|SPAN|UL|OL)$/.test(el.tagName) && el.getBoundingClientRect().height > 5).length >= 30, undefined, { timeout: 30000 });
  const targets = await currentFrame.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('[data-source-file]')).filter(el => {
    const rect = el.getBoundingClientRect();
    return /^(H[1-6]|P|A|BUTTON|SECTION|ARTICLE|SUMMARY|FOOTER|NAV|BLOCKQUOTE|LI|DIV|SPAN|UL|OL)$/.test(el.tagName) && rect.width > 5 && rect.height > 5 && !el.closest('nextjs-portal');
  }).slice(0, 30).map((el, index, elements) => ({ file: el.dataset.sourceFile!, line: Number(el.dataset.sourceLine), column: Number(el.dataset.sourceColumn), tag: el.tagName.toLowerCase(), occurrence: elements.slice(0, index).filter(previous => previous.dataset.sourceFile === el.dataset.sourceFile && previous.dataset.sourceLine === el.dataset.sourceLine && previous.dataset.sourceColumn === el.dataset.sourceColumn).length, text: (el.textContent || '').slice(0, 80) })));
  assert.equal(targets.length, 30, 'The sample must contain thirty distinct selectable elements');
  const candidate = process.argv.find(arg => arg.startsWith('--candidate='))?.slice('--candidate='.length);
  if (candidate && !/^(?:[1-9]|[12][0-9]|30)$/.test(candidate)) throw new Error('Diagnostic candidate must be between 1 and 30.');
  const chosenTargets = candidate ? targets.slice(Number(candidate) - 1, Number(candidate)) : targets;
  let applyRequests = 0;
  let droppedAcceptedResponse = false;
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/slightnudge/apply') applyRequests++; });
  if (process.argv.includes('--drop-selection-apply-response')) {
    await page.route('**/api/slightnudge/apply', async route => {
      const response = await route.fetch();
      assert.equal((await response.json()).success, true, 'The real source must save before dropping the Apply response');
      droppedAcceptedResponse = true;
      await route.abort('connectionreset');
    }, { times: 1 });
  }
  const expireAuthorization = process.argv.includes('--expire-selection-token');
  let authorizationRetried = false;
  if (expireAuthorization) {
    await page.route('**/api/slightnudge/apply', async route => {
      const response = await route.fetch({ headers: { ...route.request().headers(), 'x-slightnudge-token': 'expired-session' } });
      assert.equal(response.status(), 403, 'The real authorization guard must refuse the injected expired credential');
      await route.fulfill({ response });
    }, { times: 1 });
  }
  const results: Array<Record<string, unknown>> = [];
  const save = () => {
    fs.writeFileSync(output, JSON.stringify({ method: 'physical click where exposed → real inspection → real preview → explicit Apply/recovery → rendered confirmation → exact source Undo', complete: results.length === chosenTargets.length, fullQualification: !candidate && results.length === 30 && results.every(row => row.outcome === 'allowed' || row.outcome === 'refused') && (!process.argv.includes('--drop-selection-apply-response') || droppedAcceptedResponse) && (!expireAuthorization || authorizationRetried), candidateCount: chosenTargets.length, selections: results }, null, 2));
    if (results.length) console.log(`Selection ${results.length}/${chosenTargets.length}: ${results.at(-1)?.outcome} — ${results.at(-1)?.file}:${results.at(-1)?.line}:${results.at(-1)?.column}`);
  };
  save();
  for (const target of chosenTargets) {
    const trace = (stage: string) => { if (process.argv.includes('--trace-source')) console.log('Source stage:', stage, `${target.file}:${target.line}:${target.column}`); };
    trace('select');
    await page.getByText('Live source connected', { exact: true }).waitFor();
    const row: Record<string, unknown> = { ...target };
    const selector = `[data-source-file=${JSON.stringify(target.file)}][data-source-line="${target.line}"][data-source-column="${target.column}"]`;
    const element = frame.locator(selector).nth(target.occurrence);
    const absolute = path.resolve(repo, target.file);
    assert.ok(absolute.startsWith(path.resolve(repo) + path.sep));
    const original = fs.readFileSync(absolute, 'utf8');
    const unavailable = async () => await element.count() === 0 || !(await element.isVisible());
    if (await unavailable()) {
      row.outcome = 'refused'; row.reason = 'The originally measured element is no longer present or visible after a page rebuild. No source was changed.';
      assert.equal(fs.readFileSync(absolute, 'utf8'), original); results.push(row); save(); continue;
    }
    try { await element.scrollIntoViewIfNeeded({ timeout: 5000 }); }
    catch (cause) {
      const missing = await unavailable();
      if (!missing && !(cause instanceof Error && cause.name === 'TimeoutError')) throw cause;
      row.outcome = 'refused'; row.reason = missing
        ? 'The measured element disappeared or became hidden before it could be selected. No source was changed.'
        : 'The element did not stay stable long enough for a reliable physical selection. No edit was attempted.';
      assert.equal(fs.readFileSync(absolute, 'utf8'), original); results.push(row); save(); continue;
    }
    const exposedPoint = async () => element.evaluate(el => {
      const box = el.getBoundingClientRect();
      const left = Math.max(0, box.left), right = Math.min(innerWidth, box.right);
      const top = Math.max(0, box.top), bottom = Math.min(innerHeight, box.bottom);
      for (const yPart of [.01, .05, .25, .5, .75, .95, .99]) for (const xPart of [.01, .05, .25, .5, .75, .95, .99]) {
        const x = left + (right - left) * xPart, y = top + (bottom - top) * yPart;
        if (document.elementFromPoint(x, y) === el) return { x: x - box.left, y: y - box.top };
      }
      return null;
    });
    let point = await exposedPoint();
    if (!point) { await element.evaluate(el => el.scrollIntoView({ block: 'start' })); point = await exposedPoint(); }
    if (!point) { row.outcome = 'refused'; row.reason = 'No exposed click area belongs to this element; its children cover the visible area.'; results.push(row); save(); continue; }
    row.clicked = true;
    await element.click({ position: point });
    const receipt = `${target.file}:${target.line}:${target.column}:${target.tag}`;
    await page.waitForFunction(expected => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source') === expected, receipt);
    const beforeWeight = await element.evaluate(el => getComputedStyle(el).fontWeight);
    const utility = Number(beforeWeight) >= 700 ? 'font-normal' : 'font-bold';
    const inspection = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/inspect') && r.request().method() === 'POST');
    await page.locator('select').filter({ has: page.locator('option[value="font-bold"]') }).selectOption(utility);
    const inspected = await (await inspection).json();
    row.actualSelection = { file: inspected.path, line: inspected.line, column: inspected.column, tag: inspected.tagName };
    await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 60000 });
    const apply = page.getByRole('button', { name: 'Apply to code', exact: true });
    if (await apply.count() === 0) {
      row.outcome = 'refused'; row.reason = inspected.reason || await page.getByLabel('Editor notice', { exact: true }).innerText();
      assert.equal(fs.readFileSync(absolute, 'utf8'), original); results.push(row); save(); continue;
    }
    // Independently locate the exact JSX attribute before permitting Apply.
    if (inspected.path !== target.file || inspected.line !== target.line || inspected.column !== target.column || inspected.tagName !== target.tag) {
      row.outcome = 'WRONG TARGET'; row.reason = 'The physical click selected a different marker than the requested container; stopped before Apply.';
      results.push(row); save();
      assert.equal(inspected.path, target.file, 'Inspection must resolve the intended source file before Apply');
      assert.equal(inspected.column, target.column, 'A physical click must select the intended marker before Apply');
      assert.equal(inspected.tagName, target.tag);
    }
    const project = new Project({ useInMemoryFileSystem: true });
    const ast = project.createSourceFile('selected.tsx', original);
    const opening = ast.getDescendants().find(node => (Node.isJsxOpeningElement(node) || Node.isJsxSelfClosingElement(node)) && (() => { const pos = ast.getLineAndColumnAtPos(node.getStart()); return pos.line === target.line && pos.column === target.column; })());
    assert.ok(opening && (Node.isJsxOpeningElement(opening) || Node.isJsxSelfClosingElement(opening)));
    const attribute = opening.getAttributes().find(attr => Node.isJsxAttribute(attr) && attr.getNameNode().getText() === 'className');
    assert.ok(attribute && Node.isJsxAttribute(attribute));
    const literal = attribute.getInitializer(); assert.ok(literal && Node.isStringLiteral(literal));
    // The editor replaces an existing weight in place, preserving unrelated order.
    const tokens = literal.getLiteralValue().split(/\s+/);
    const weightIndex = tokens.findIndex(token => /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.test(token));
    if (weightIndex >= 0) tokens[weightIndex] = utility; else tokens.push(utility);
    const quote = literal.getText()[0];
    const expected = original.slice(0, literal.getStart()) + quote + tokens.join(' ') + quote + original.slice(literal.getEnd());
    // The editor can confirm Apply directly or through a read-only recovery
    // lookup. Navigation and a particular network response are not proof of a
    // completed edit. Keep the exact source, rendered result and Undo checks.
    const acceptedResponse = (operation: 'apply' | 'undo') => page.waitForResponse(async response => {
      const pathname = new URL(response.url()).pathname;
      if (pathname !== `/api/slightnudge/${operation}` && !(operation === 'apply' && pathname === '/api/slightnudge/apply/status')) return false;
      const body = response.request().postDataJSON();
      if (body?.repositoryId !== 'source-proof' || body?.sourcePath !== target.file || !response.ok()) return false;
      return (await response.json().catch(() => ({}))).success === true;
    }, { timeout: 60000 }).then(value => ({ value }), cause => ({ error: cause as Error }));
    trace('apply');
    const applyRequestsBefore = applyRequests;
    const needsExplicitRetry: boolean = expireAuthorization && !authorizationRetried;
    const historyPath = path.resolve(repo, '../../history/edits.json');
    const historyCount = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, 'utf8')).length : 0;
    const response = acceptedResponse('apply');
    await apply.click();
    if (needsExplicitRetry) {
      await page.getByLabel('Editor notice', { exact: true }).filter({ hasText: 'The save was denied before writing.' }).waitFor();
      assert.equal(fs.readFileSync(absolute, 'utf8'), original, 'An authorization denial cannot write source');
      assert.equal(await apply.isEnabled(), true, 'The denied review must remain explicitly applicable');
      await apply.click(); authorizationRetried = true;
    }
    const applied = await response; if ('error' in applied) throw applied.error;
    assert.equal((await applied.value.json()).success, true); trace('apply accepted');
    await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 60000 });
    await apply.waitFor({ state: 'hidden' });
    assert.equal(applyRequests - applyRequestsBefore, needsExplicitRetry ? 2 : 1, 'Status recovery must not automatically resend an Apply');
    const savedHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    assert.equal(savedHistory.length, historyCount + 1, 'Exactly one accepted history record belongs to this operation');
    assert.equal(savedHistory.at(-1).before, original);
    assert.equal(savedHistory.at(-1).after, expected);
    if (fs.readFileSync(absolute, 'utf8') !== expected) { row.outcome = 'WRONG TARGET'; row.reason = 'Applied bytes differ from the independently located class attribute.'; results.push(row); save(); throw new Error('Wrong target gate failed.'); }
    await page.getByText('Live source connected', { exact: true }).waitFor();
    const expectedWeight = utility === 'font-bold' ? '700' : '400';
    for (let i = 0; i < 200 && await element.evaluate(el => getComputedStyle(el).fontWeight).catch(() => '') !== expectedWeight; i++) await page.waitForTimeout(50);
    if (await element.evaluate(el => getComputedStyle(el).fontWeight) !== expectedWeight) {
      row.outcome = 'RENDER MISMATCH'; row.sourceClass = tokens.join(' '); row.renderedClass = await element.getAttribute('class'); row.renderedWeight = await element.evaluate(el => getComputedStyle(el).fontWeight);
      row.serverClass = await element.evaluate(async el => { const html = await (await fetch(location.href, { cache: 'no-store' })).text(); const doc = new DOMParser().parseFromString(html, 'text/html'); return Array.from(doc.querySelectorAll('[data-source-file]')).find(node => node.getAttribute('data-source-file') === el.getAttribute('data-source-file') && node.getAttribute('data-source-line') === el.getAttribute('data-source-line') && node.getAttribute('data-source-column') === el.getAttribute('data-source-column'))?.getAttribute('class'); });
      results.push(row); save();
    }
    assert.equal(await element.evaluate(el => getComputedStyle(el).fontWeight), expectedWeight);
    assert.equal(await element.getAttribute('class'), tokens.join(' '), 'The live page must render the complete accepted class list');
    trace('undo');
    const undone = acceptedResponse('undo');
    await page.getByTitle('Undo visual adjustment (Ctrl+Z)').click(); const undoResponse = await undone; if ('error' in undoResponse) throw undoResponse.error;
    assert.equal((await undoResponse.value.json()).success, true); trace('undo accepted');
    await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 60000 });
    assert.equal(fs.readFileSync(absolute, 'utf8'), original);
    const undoneHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    assert.equal(undoneHistory.length, historyCount + 1);
    assert.equal(undoneHistory.at(-1).status, 'undone');
    await page.getByText('Live source connected', { exact: true }).waitFor();
    for (let i = 0; i < 200 && await element.evaluate(el => getComputedStyle(el).fontWeight).catch(() => '') !== beforeWeight; i++) await page.waitForTimeout(50);
    if (await element.evaluate(el => getComputedStyle(el).fontWeight) !== beforeWeight) {
      row.outcome = 'UNDO RENDER MISMATCH'; row.sourceClass = literal.getLiteralValue(); row.renderedClass = await element.getAttribute('class'); row.renderedWeight = await element.evaluate(el => getComputedStyle(el).fontWeight); row.expectedWeight = beforeWeight;
      row.serverClass = await element.evaluate(async el => { const html = await (await fetch(location.href, { cache: 'no-store' })).text(); const doc = new DOMParser().parseFromString(html, 'text/html'); return Array.from(doc.querySelectorAll('[data-source-file]')).find(node => node.getAttribute('data-source-file') === el.getAttribute('data-source-file') && node.getAttribute('data-source-line') === el.getAttribute('data-source-line') && node.getAttribute('data-source-column') === el.getAttribute('data-source-column'))?.getAttribute('class'); });
      results.push(row); save();
    }
    assert.equal(await element.evaluate(el => getComputedStyle(el).fontWeight), beforeWeight);
    assert.equal(await element.getAttribute('class'), literal.getLiteralValue(), 'Undo must render the original complete class list');
    row.outcome = 'allowed'; row.reason = 'Exact source/history Apply, rendered class/weight and exact Undo verified.'; results.push(row); save();
  }
  console.log(`Source selection workflows: ${results.filter(row => row.outcome === 'allowed').length} allowed, ${results.filter(row => row.outcome === 'refused').length} refused, ${results.filter(row => row.outcome === 'WRONG TARGET').length} wrong targets`);
  if (process.argv.includes('--drop-selection-apply-response')) assert.equal(droppedAcceptedResponse, true, 'The response-loss regression must actually save and drop a response');
  if (expireAuthorization) assert.equal(authorizationRetried, true, 'The authorization regression must actually perform an explicit retry');
  return results.length;
}
