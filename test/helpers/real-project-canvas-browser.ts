import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import type { Page } from 'playwright';
import { prepareSourceProject } from './prepare-source-project';

type Target = { file: string; line: string; column: string; tag: string; text: string };

// Exercise unmodified application elements in fresh public checkouts, not injected fixtures.
export async function checkRealProjectCanvas(page: Page, baseURL: string, workspace: string, evidenceRoot: string) {
  assert.ok(process.argv.some(arg => arg.startsWith('--public=')), 'Real-project qualification requires a public repository');
  page.setDefaultTimeout(60000);
  const repo = path.join(workspace, '.slightnudge/repositories/source-proof');
  fs.mkdirSync(repo, { recursive: true });
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'development', CI: '1', NEXT_TELEMETRY_DISABLED: '1', GIT_TERMINAL_PROMPT: '0' };
  for (const key of ['PATH', 'SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']) if (process.env[key]) env[key] = process.env[key];
  const servicePlaceholders = process.argv.includes('--public=next-saas');
  if (servicePlaceholders) {
    // The public landing page imports service modules which validate config
    // at module load. Supply nonfunctional local values, never host accounts.
    // No database, authentication or payment operation is exercised here.
    env.POSTGRES_URL = 'postgres://qualification:qualification@127.0.0.1:9/qualification';
    env.STRIPE_SECRET_KEY = 'sk_test_qualification_only';
    env.AUTH_SECRET = 'slightnudge-disposable-ui-qualification-only';
  }
  const prepared = prepareSourceProject(evidenceRoot, workspace, repo, env);
  const evidence = path.join(evidenceRoot, `docs/real-project-current-${prepared.selected}`);
  const files = execFileSync('git', ['ls-files'], { cwd: repo, encoding: 'utf8' }).split(/\r?\n/).filter(file => /\.(?:[jt]sx?|css)$/.test(file) && !/(^|\/)\.env|secret|credential|next-env\.d\.ts/i.test(file) && fs.existsSync(path.join(repo, file)));
  const originals = new Map(files.map(file => [file, fs.readFileSync(path.join(repo, file), 'utf8')]));
  const assertOriginal = () => { for (const [file, content] of originals) assert.equal(fs.readFileSync(path.join(repo, file), 'utf8'), content, `Original source must be intact: ${file}`); };
  const port = await new Promise<number>(resolve => { const socket = net.createServer(); socket.listen(0, '127.0.0.1', () => { const port = (socket.address() as net.AddressInfo).port; socket.close(() => resolve(port)); }); });
  const child = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', ...prepared.webpackArgs, '-H', '127.0.0.1', '-p', String(port)], { cwd: repo, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let diagnostic = '';
  for (const stream of [child.stdout, child.stderr]) stream?.on('data', chunk => { diagnostic = (diagnostic + chunk.toString()).slice(-16000); });
  const errors: string[] = [];
  const onError = (error: Error) => errors.push(error.message);
  page.on('pageerror', onError);
  const report: Record<string, unknown> = { date: new Date().toISOString(), project: prepared.url, commit: prepared.commit, next: prepared.next, tailwind: prepared.tailwind, serviceConfiguration: servicePlaceholders ? 'Nonfunctional loopback PostgreSQL / Stripe / auth placeholders for module validation; no service flows tested' : 'No service credentials configured', state: 'running', checks: [], targets: [] };
  const checks = report.checks as string[], outcomes = report.targets as Record<string, unknown>[];
  const saveReport = () => fs.writeFileSync(`${evidence}.json`, JSON.stringify(report, null, 2));
  const check = (name: string) => { checks.push(name); console.log(`PASS ${prepared.selected}: ${name}`); saveReport(); };
  const phase = (name: string) => { report.phase = name; console.log(`Real project ${prepared.selected}: ${name}`); saveReport(); };
  const previewURL = `http://127.0.0.1:${port}${prepared.selected === '3' ? '/en' : '/'}`;
  const frame = page.frameLocator('iframe[title="Actual project"]');
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 120000 });
  const connected = () => page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
  const locator = (target: Target) => frame.locator(`${target.tag}[data-source-file=${JSON.stringify(target.file)}][data-source-line="${target.line}"][data-source-column="${target.column}"]`).filter({ visible: true }).first();
  const select = async (target: Target) => {
    await page.keyboard.press('Escape');
    const element = locator(target); await element.scrollIntoViewIfNeeded();
    const point = await element.evaluate(el => {
      const box = el.getBoundingClientRect();
      for (const y of [.1, .5, .9]) for (const x of [.1, .5, .9]) {
        if (document.elementFromPoint(box.left + box.width * x, box.top + box.height * y) === el) return { x: box.width * x, y: box.height * y };
      }
      return null;
    });
    assert.ok(point, `The original ${target.tag} must have an exposed click area: ${target.file}:${target.line}`);
    await element.click({ position: point });
    await page.waitForFunction(value => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source') === value, `${target.file}:${target.line}:${target.column}:${target.tag}`);
    await idle();
  };
  const commitAndUndo = async (target: Target, expected: string) => {
    assertOriginal();
    phase(`save ${target.file}:${target.line}`);
    await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/apply' && response.request().method() === 'POST'), page.getByRole('button', { name: 'Save changes', exact: true }).click()]); await idle(); await connected();
    assert.ok(fs.readFileSync(path.join(repo, target.file), 'utf8').includes(expected), 'Save writes the actual selected source');
    assert.notEqual(fs.readFileSync(path.join(repo, target.file), 'utf8'), originals.get(target.file), 'Save must produce a real source change');
    for (const [file, content] of originals) if (file !== target.file) assert.equal(fs.readFileSync(path.join(repo, file), 'utf8'), content, 'Unselected application files stay intact');
    phase(`undo ${target.file}:${target.line}`);
    await Promise.all([page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/undo' && response.request().method() === 'POST'), page.getByRole('button', { name: 'Undo', exact: true }).click()]); await idle(); await connected(); assertOriginal();
  };
  try {
    phase('start public application with development adapter');
    let ready = false;
    for (let i = 0; i < 100; i++) { if (child.exitCode !== null) break; try { if ((await fetch(previewURL, { signal: AbortSignal.timeout(5000) })).ok) { ready = true; break; } } catch {} await page.waitForTimeout(300); }
    assert.ok(ready, `Public application with the source adapter must render: ${diagnostic}`);
    phase('connect current full-page canvas');
    const editURL = `${baseURL}/studio/source-proof/edit?preview=${encodeURIComponent(previewURL)}`;
    await page.goto(editURL, { waitUntil: 'domcontentloaded', timeout: 120000 }); await connected();
    const iframe = page.locator('iframe[title="Actual project"]');
    await frame.locator('html[data-editor-canvas-page]').waitFor({ state: 'attached' });
    assert.equal(await iframe.count(), 1);
    await page.waitForFunction(() => (document.querySelector('iframe')?.clientHeight || 0) > 300);
    const height = await iframe.evaluate(el => el.clientHeight); await page.waitForTimeout(700);
    assert.equal(await iframe.evaluate(el => el.clientHeight), height, 'Full-page height must settle');
    check('single full-page canvas with stable document height');
    const candidates = await frame.locator('h1,h2,h3,p,a,button').evaluateAll(elements => elements.filter(el => el.hasAttribute('data-source-file') && el.childElementCount === 0 && (el.textContent || '').trim().length >= 6 && (el.textContent || '').trim().length < 240 && el.getBoundingClientRect().width > 30 && el.getBoundingClientRect().height > 12).map(el => ({ file: el.getAttribute('data-source-file')!, line: el.getAttribute('data-source-line')!, column: el.getAttribute('data-source-column')!, tag: el.tagName.toLowerCase(), text: (el.textContent || '').trim() })));
    assert.ok(candidates.length >= 2, 'Real page must expose multiple original mapped text elements');
    report.candidateCount = candidates.length;
    const token = await page.evaluate(() => (window as any).__SLIGHTNUDGE_TOKEN__ as string);
    const scopesResponse = await page.request.post(`${baseURL}/api/slightnudge/responsive`, { headers: { 'x-slightnudge-token': token }, data: { repositoryId: 'source-proof', filePath: candidates[0].file } });
    const scopeMetadata = await scopesResponse.json(); report.responsive = { status: scopesResponse.status(), ...scopeMetadata }; saveReport();
    assert.ok(scopesResponse.ok(), `Real project responsive discovery: ${scopeMetadata.error}`);
    assert.ok(scopeMetadata.breakpoints.length > 0, 'The project compiler must expose its actual breakpoints');
    check('project breakpoints discovered through the actual compiled API');
    await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption('0.5');
    const distinct = candidates.filter((target, index, list) => index === list.findIndex(other => other.file === target.file && other.line === target.line && other.column === target.column));
    const ordered = [...distinct.filter((target, index) => distinct.findIndex(other => other.tag === target.tag) === index), ...distinct];
    const qualified: Target[] = [];
    const visited = new Set<string>();
    for (const target of ordered.slice(0, 14)) {
      const key = `${target.file}:${target.line}:${target.column}`;
      if (visited.has(key)) continue; visited.add(key);
      phase(`edit original ${target.tag}: ${target.file}:${target.line}`);
      await page.keyboard.press('Escape');
      if (await frame.locator(`[data-source-file=${JSON.stringify(target.file)}][data-source-line="${target.line}"][data-source-column="${target.column}"]`).count() > 1) {
        outcomes.push({ ...target, outcome: 'not-qualified', reason: 'Repeated source marker in a shared component; no edit attempted. This run qualifies unique source targets.' }); assertOriginal(); saveReport(); continue;
      }
      await select(target);
      const toolbar = page.getByRole('toolbar', { name: 'Selection formatting', exact: true });
      const edit = toolbar.getByRole('button', { name: 'Edit text', exact: true });
      if (!(await edit.count()) || await edit.isDisabled()) { assertOriginal(); outcomes.push({ ...target, outcome: 'protected', reason: 'Inline editing unavailable for this source expression' }); continue; }
      const size = await locator(target).evaluate(el => getComputedStyle(el).fontSize);
      const preflight = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/inspect') && response.request().method() === 'POST');
      await edit.click();
      const inspection = await (await preflight).json(); await idle();
      const editor = frame.getByRole('textbox', { name: 'Edit selected text', exact: true });
      if (!inspection.textEditable) {
        assert.equal(await editor.count(), 0, 'Generated/translated text must be refused before entering contenteditable');
        const notice = page.getByLabel('Editor notice', { exact: true }); await notice.waitFor();
        outcomes.push({ ...target, outcome: 'protected', reason: await notice.innerText() }); assertOriginal(); saveReport(); continue;
      }
      await editor.waitFor(); assert.equal(await editor.evaluate(el => getComputedStyle(el).fontSize), size);
      const changed = `${target.text} (review)`;
      await editor.fill(changed); await editor.press('Enter'); await idle();
      await page.getByLabel('Draft status', { exact: true }).filter({ hasText: '1 change' }).waitFor(); assertOriginal();
      await page.reload({ waitUntil: 'domcontentloaded' }); await connected(); await idle();
      await locator(target).filter({ hasText: changed }).waitFor();
      await commitAndUndo(target, '(review)');
      outcomes.push({ ...target, outcome: 'passed', operations: ['physical selection', 'original-size inline text', 'draft refresh', 'save', 'exact undo'] }); qualified.push(target); saveReport();
      if (qualified.length === 3) break;
    }
    assert.ok(qualified.length >= 2 || prepared.selected === '3' && outcomes.filter(outcome => outcome.outcome === 'protected').length >= 2, 'Real pages must demonstrate original text editing or explicit protection for translated content');
    check(qualified.length >= 2 ? 'original mapped text targets: physical selection, native typography, draft recovery, source Save and exact Undo' : 'translated text safely refused before inline editing');
    const target = qualified.find(candidate => candidate.tag === 'p') || qualified[0] || distinct.find(candidate => outcomes.some(outcome => outcome.file === candidate.file && outcome.line === candidate.line && /prop|generat|literal/i.test(String(outcome.reason))));
    assert.ok(target, 'Movement needs a uniquely mapped original element');
    await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption('0.5'); await select(target);
    const before = await locator(target).evaluate(el => el.getBoundingClientRect().x);
    const move = page.getByRole('button', { name: 'Move element', exact: true });
    const box = await move.boundingBox(); assert.ok(box, 'Selected original element must expose Move');
    phase('scaled movement on original element');
    const movementPreview = page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/preview' && response.request().method() === 'POST');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2, { steps: 6 }); await page.mouse.up(); await idle();
    const movementResult = await (await movementPreview).json(); await idle();
    if (!movementResult.success) {
      const reason = movementResult.error || movementResult.reason || '';
      assert.match(reason, /component used in several places|class built from a variable|dynamic|static class|repeated|prop/i, 'Only an explicit source safety refusal counts as a protected result');
      assertOriginal(); assert.ok(Math.abs(await locator(target).evaluate(el => el.getBoundingClientRect().x) - before) < 2, 'Refused movement must restore the visual position');
      report.protectedMovement = reason; check('shared/dynamic source movement refused with original source and position intact');
    } else {
    await page.getByLabel('Draft status', { exact: true }).filter({ hasText: '1 change' }).waitFor();
    assert.ok(Math.abs(await locator(target).evaluate(el => el.getBoundingClientRect().x) - before - 24) < 2, '50% zoom must map 12 screen pixels to 24 page pixels');
    await commitAndUndo(target, 'translate-x-[24px]'); check('scaled Move, source Save and exact Undo');
    }
    const width = page.getByRole('spinbutton', { name: 'Preview width', exact: true });
    const setWidth = async (value: number) => {
      await width.fill(String(value)); await width.press('Enter');
      for (let attempt = 0; attempt < 50 && await frame.locator('html').evaluate(() => innerWidth) !== value; attempt++) await page.waitForTimeout(100);
      assert.equal(await frame.locator('html').evaluate(() => innerWidth), value);
    };
    const breakpoint = scopeMetadata.breakpoints.find((item: { minWidth: number }) => item.minWidth >= 640 && item.minWidth <= 1024);
    assert.ok(breakpoint, 'The real project needs a tablet-range breakpoint for this qualification');
    const scope = page.getByRole('combobox', { name: 'Responsive edit scope', exact: true });
    await setWidth(breakpoint.minWidth - 1); const below = await locator(target).evaluate(el => getComputedStyle(el).fontSize);
    await setWidth(breakpoint.minWidth); await scope.selectOption(breakpoint.name); await select(target);
    const font = page.getByRole('toolbar', { name: 'Selection formatting', exact: true }).getByRole('combobox', { name: 'Font size', exact: true });
    const utility = (await font.inputValue()) === 'text-4xl' ? 'text-5xl' : 'text-4xl';
    const stylePreview = page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/preview' && response.request().method() === 'POST');
    await font.selectOption(utility); const styleResult = await (await stylePreview).json(); await idle();
    if (!styleResult.success) {
      const reason = styleResult.error || styleResult.reason || '';
      assert.match(reason, /component used in several places|class built from a variable|dynamic|static class|repeated|prop/i, 'Compiler or internal failures must not be mislabeled as supported refusals');
      report.protectedResponsiveEdit = reason; assertOriginal(); check('shared/dynamic source responsive edit explicitly protected');
    } else {
    await page.getByLabel('Draft status', { exact: true }).filter({ hasText: '1 change' }).waitFor();
    const atBreakpoint = await locator(target).evaluate(el => getComputedStyle(el).fontSize);
    await setWidth(breakpoint.minWidth - 1); assert.equal(await locator(target).evaluate(el => getComputedStyle(el).fontSize), below, 'Responsive edit must preserve the smaller viewport');
    await setWidth(breakpoint.minWidth); assert.equal(await locator(target).evaluate(el => getComputedStyle(el).fontSize), atBreakpoint);
    await commitAndUndo(target, utility); await scope.selectOption(''); check('real breakpoint style edit, smaller-screen isolation, Save and exact Undo');
    }
    await scope.selectOption('');
    for (const value of [375, 768, 1200]) await setWidth(value);
    check('native responsive widths: 375, 768 and 1200');
    await page.screenshot({ path: `${evidence}.png` });
    phase('separate window');
    await page.goto(`${baseURL}/studio/source-proof/window?preview=${encodeURIComponent(previewURL)}`, { waitUntil: 'domcontentloaded', timeout: 120000 }); await connected();
    assert.equal(await frame.locator('html').getAttribute('data-editor-canvas-page'), null);
    await select(target);
    const windowPreflight = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/inspect') && response.request().method() === 'POST');
    await page.getByRole('toolbar', { name: 'Selection formatting', exact: true }).getByRole('button', { name: 'Edit text', exact: true }).click();
    const inspection = await (await windowPreflight).json(); await idle();
    const editor = frame.getByRole('textbox', { name: 'Edit selected text', exact: true });
    if (inspection.textEditable) {
    await editor.fill(`${target.text} (window review)`); await editor.press('Enter'); await idle();
    await page.getByLabel('Draft status', { exact: true }).filter({ hasText: '1 change' }).waitFor();
    await commitAndUndo(target, '(window review)'); check('separate-window native document, text edit, Save and exact Undo');
    } else {
      assert.equal(await editor.count(), 0); await page.getByLabel('Editor notice', { exact: true }).waitFor(); assertOriginal();
      check('separate-window native document with translated-text protection');
    }
    assert.deepEqual(errors, [], 'No uncaught browser errors'); assertOriginal();
    report.state = 'passed'; report.browserErrors = errors; saveReport();
    return checks.length;
  } catch (error) {
    report.state = 'failed'; report.error = error instanceof Error ? error.stack : String(error); report.browserErrors = errors; report.serverLog = diagnostic;
    report.notice = await page.locator('[role="alert"], [aria-label="Editor notice"]').allTextContents().catch(() => []);
    report.renderedTargets = await frame.locator('[data-source-file]').evaluateAll(elements => elements.filter(el => /^(h1|h2|p|a|button)$/i.test(el.tagName)).slice(0, 25).map(el => ({ file: el.getAttribute('data-source-file'), line: el.getAttribute('data-source-line'), text: el.textContent?.slice(0, 240) }))).catch(() => []);
    report.runtime = await frame.locator('html').evaluate(() => ({ ready: document.readyState, hydrated: (window as any).__slightnudge_hydrated, bridge: (window as any).__slightnudge_bridge_active })).catch(() => ({})); saveReport();
    report.actualSelection = await page.getByLabel('Visual editing workspace', { exact: true }).getAttribute('data-selected-source').catch(() => null); saveReport();
    await page.screenshot({ path: `${evidence}-failure.png` }).catch(() => {});
    console.log(`Real-project diagnostics: ${evidence}.json`); throw error;
  } finally {
    page.off('pageerror', onError);
    if (child.pid) try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {}
  }
}
