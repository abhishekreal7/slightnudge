import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import type { Page } from 'playwright';
import { prepareSourceProject } from './prepare-source-project.v3';
import { checkSourceSelections } from './source-selection-workflows.v3';

export async function checkSourceProject(page: Page, baseURL: string, workspace: string) {
 page=iframePageV3(page);

  if (process.argv.includes('--trace-source')) {
    page.on('console', message => { if (/^Source (proof|notice|lifecycle):/.test(message.text())) console.log(message.text()); });
    page.on('pageerror', cause => console.log('Source page error:', cause.message));
    page.on('response', async response => {
      const api = new URL(response.url()).pathname;
      if (!/^\/api\/slightnudge\/(apply(?:\/status)?|undo|preview)$/.test(api)) return;
      const result = await response.json().catch(() => ({}));
      console.log('Source API:', JSON.stringify({ api, method: response.request().method(), status: response.status(), success: result.success, code: result.code, error: result.error }));
    });
    page.on('framenavigated', frame => { console.log('Source navigation:', frame === page.mainFrame() ? 'editor' : 'project', new URL(frame.url()).pathname); });
    await page.addInitScript(() => window.addEventListener('message', event => {
      if (event.data?.channel === 'slightnudge' && event.data.type === 'edit-result') console.info('Source proof:', JSON.stringify({ success: event.data.success, reason: event.data.reason }));
      if (event.data?.channel === 'slightnudge' && event.data.type === 'source-edit' && event.data.operation === 'verify') {
        const target = event.data.selection;
        const matches = Array.from(document.querySelectorAll('[data-source-file]')).filter(element => element.getAttribute('data-source-file') === target.path && Number(element.getAttribute('data-source-line')) === target.line && Number(element.getAttribute('data-source-column')) === target.column);
        const diagnostic = JSON.stringify({ file: target.path, line: target.line, column: target.column, expectedClass: event.data.expectedClass, classes: matches.map(element => element.getAttribute('class')) });
        if ((window as any).__sourceProofLast !== diagnostic) { (window as any).__sourceProofLast = diagnostic; console.info('Source proof:', diagnostic); }
      }
    }));
    await page.addInitScript(() => {
      if (window !== window.top) return;
      console.info('Source lifecycle:', 'editor document initialized');
      let last = '';
      new MutationObserver(() => {
        const notice = document.querySelector('[aria-label="Editor notice"]')?.textContent || '';
        if (notice && notice !== last) console.info('Source notice:', notice);
        last = notice;
      }).observe(document, { childList: true, characterData: true, subtree: true });
    });
  }
  const root = process.cwd();
  const repo = path.join(workspace, '.slightnudge/repositories/source-proof');
  fs.mkdirSync(repo, { recursive: true });
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'development', CI: '1', NEXT_TELEMETRY_DISABLED: '1', GIT_TERMINAL_PROMPT: '0' };
  for (const key of ['PATH', 'SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']) if (process.env[key]) env[key] = process.env[key];
  const prepared = prepareSourceProject(root, workspace, repo, env);
  const port = await new Promise<number>(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const port = (server.address() as net.AddressInfo).port; server.close(() => resolve(port)); }); });
  const processHandle = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', ...prepared.webpackArgs, '-H', '127.0.0.1', '-p', String(port)], { cwd: repo, env, stdio: 'ignore' });
  try {
    const projectURL = `http://127.0.0.1:${port}${prepared.selected === '3' ? '/en' : ''}`;
    let ready = false;
    for (let i = 0; i < 100; i++) { try { if ((await fetch(projectURL, { signal: AbortSignal.timeout(5000) })).ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 400)); }
    assert.ok(ready, 'Disposable actual project must render without secrets');
    // Regression: a slow rebuild must finish before the editor verifies its
    // revision. Repeatedly replacing a still-loading iframe must not starve it.
    if (process.argv.includes('--slow-refresh')) await page.route(`${projectURL}/**`, async route => {
      if (route.request().isNavigationRequest() && new URL(route.request().url()).searchParams.has('__slightnudge_refresh')) await new Promise(resolve => setTimeout(resolve, 6000));
      await route.continue();
    });
    const compatibility = page.waitForResponse(response => new URL(response.url()).pathname === '/api/slightnudge/repositories/source-proof' && response.request().method() === 'GET', { timeout: 60000 }).catch(() => undefined);
    await page.goto(`${baseURL}/studio/source-proof/edit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const compatibilityResponse = await compatibility;
    assert.ok(compatibilityResponse, 'Project compatibility did not respond before the connection deadline');
    const compatibilityData = await compatibilityResponse.json();
    assert.equal(compatibilityResponse.status(), 200, compatibilityData.error || 'Project compatibility must load');
    assert.equal(compatibilityData.framework, 'Next.js');
    await page.getByLabel('Project URL', { exact: true }).fill(projectURL);
    await page.getByRole('button', { name: 'Connect', exact: true }).click();
    await page.getByText('Live source connected', { exact: true }).waitFor();
    const frame = page.frameLocator('iframe[title="Actual project"]');
    if (!prepared.selected && !process.argv.includes('--selections-only')) {
    const heading = frame.getByRole('heading', { name: 'Less friction. More progress.' });
    const selectHeading = async () => {
      const marker = await heading.evaluate(element => `${(element as HTMLElement).dataset.sourceFile}:${(element as HTMLElement).dataset.sourceLine}:${(element as HTMLElement).dataset.sourceColumn}:${element.tagName.toLowerCase()}`);
      await heading.click();
      await page.waitForFunction(expected => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source') === expected, marker);
    };
    await selectHeading();
    const original = fs.readFileSync(path.join(repo, 'components/Features.tsx'), 'utf8');
    const initialWeight = await heading.evaluate(element => getComputedStyle(element).fontWeight);
    assert.equal(initialWeight, '600');
    await page.getByTitle('Toggle bold', { exact: true }).click();
    const apply = page.getByRole('button', { name: 'Apply to code', exact: true });
    await apply.waitFor();
    assert.equal(fs.readFileSync(path.join(repo, 'components/Features.tsx'), 'utf8'), original);
    assert.equal(await heading.evaluate(element => getComputedStyle(element).fontWeight), '700');
    if (!process.argv.includes('--drop-undo-response')) {
    await page.getByRole('button', { name: 'Discard', exact: true }).click(); await apply.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 60000 });
    for (let attempt = 0; attempt < 100 && await heading.evaluate(element => getComputedStyle(element).fontWeight).catch(() => '') !== initialWeight; attempt++) await page.waitForTimeout(50);
    assert.equal(await heading.evaluate(element => getComputedStyle(element).fontWeight), initialWeight);
    await selectHeading(); await page.getByTitle('Toggle bold', { exact: true }).click(); await apply.waitFor();
    }
    const crashPhase = process.argv.find(arg => arg.startsWith('--crash-apply='))?.slice('--crash-apply='.length);
    if (crashPhase && !['before-source', 'source-written', 'history-written'].includes(crashPhase)) throw new Error('Choose a supported Apply crash boundary.');
    const dropResponse = process.argv.includes('--drop-apply-response') || Boolean(crashPhase);
    const deferStatus = process.argv.includes('--defer-apply-status');
    let applyRequests = 0;
    let savedButDropped = false;
    if (dropResponse) {
      page.on('request', request => { if (new URL(request.url()).pathname === '/api/slightnudge/apply') applyRequests++; });
      await page.route('**/api/slightnudge/apply', async route => {
        if (crashPhase) {
          const proposal = route.request().postDataJSON();
          assert.equal(proposal.repositoryId, 'source-proof');
          assert.equal(proposal.sourcePath, 'components/Features.tsx');
          const workerEnv = { ...env, SLIGHTNUDGE_TEST: '1', SLIGHTNUDGE_WORKSPACE_ROOT: workspace, SLIGHTNUDGE_DATA_DIR: path.join(workspace, '.slightnudge') };
          const { spawnSync } = await import('node:child_process');
          const crashed = spawnSync(process.execPath, ['--import', 'tsx', 'test/helpers/apply-crash-worker.ts', crashPhase, proposal.previewId, path.join(repo, proposal.sourcePath), proposal.repositoryId, proposal.sourcePath], { cwd: workspace, env: workerEnv, encoding: 'utf8', timeout: 30000 });
          assert.equal(crashed.status, 73, crashed.stderr);
          assert.equal(fs.readFileSync(path.join(repo, proposal.sourcePath), 'utf8'), crashPhase === 'before-source' ? original : original.replace('mt-3 text-3xl font-semibold', 'mt-3 text-3xl font-bold'));
          const historyFile = path.join(workspace, '.slightnudge/history/edits.json');
          assert.equal(fs.existsSync(historyFile) ? JSON.parse(fs.readFileSync(historyFile, 'utf8')).length : 0, crashPhase === 'history-written' ? 1 : 0);
        } else {
          const response = await route.fetch();
          assert.equal((await response.json()).success, true, 'The real server must save before its response is dropped');
        }
        savedButDropped = true;
        await route.abort('connectionreset');
      }, { times: 1 });
      if (deferStatus) await page.route('**/api/slightnudge/apply/status', route => route.abort('connectionreset'), { times: 1 });
    }
    const applied = dropResponse ? null : page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/apply'));
    await apply.click();
    if (applied) assert.equal((await (await applied).json()).success, true);
    if (dropResponse && deferStatus) {
      const checkStatus = page.getByRole('button', { name: 'Check save status', exact: true });
      await checkStatus.waitFor();
      assert.equal(savedButDropped, true);
      assert.equal(await page.getByRole('button', { name: 'Discard', exact: true }).isDisabled(), true, 'An uncertain save cannot be discarded as unsaved');
      await page.getByText('Save status unconfirmed', { exact: true }).waitFor();
      await page.screenshot({ path: path.join(root, 'docs/m0-uncertain-save.png'), animations: 'disabled' });
      if (crashPhase === 'before-source') assert.equal(fs.readFileSync(path.join(repo, 'components/Features.tsx'), 'utf8'), original);
      else assert.notEqual(fs.readFileSync(path.join(repo, 'components/Features.tsx'), 'utf8'), original);
      await checkStatus.click();
    }
    if (crashPhase === 'before-source') {
      await page.getByLabel('Editor notice', { exact: true }).filter({ hasText: 'The source still matches the reviewed original.' }).waitFor();
      assert.equal(fs.readFileSync(path.join(repo, 'components/Features.tsx'), 'utf8'), original);
      assert.equal(applyRequests, 1, 'Recovery cannot automatically replay an unwritten intent');
      assert.equal(await apply.isEnabled(), true);
      await apply.click(); // Explicit retry, not an automatic replay.
    }
    await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
    await apply.waitFor({ state: 'hidden' });
    await page.getByText('Live source connected', { exact: true }).waitFor();
    await heading.waitFor();
    assert.equal(fs.readFileSync(path.join(repo, 'components/Features.tsx'), 'utf8'), original.replace('mt-3 text-3xl font-semibold', 'mt-3 text-3xl font-bold'));
    await page.waitForFunction(() => Boolean(document.querySelector('iframe')));
    await selectHeading();
    for (let attempt = 0; attempt < 200 && await heading.evaluate(element => getComputedStyle(element).fontWeight).catch(() => '') !== '700'; attempt++) await page.waitForTimeout(50);
    assert.equal(await heading.evaluate(element => getComputedStyle(element).fontWeight), '700');
    const dropUndo = process.argv.includes('--drop-undo-response');
    if (dropUndo) {
      // Keep an older accepted edit underneath the one whose response is lost.
      const olderSource = fs.readFileSync(path.join(repo, 'components/Features.tsx'), 'utf8');
      await page.getByTitle('Toggle bold', { exact: true }).click(); await apply.waitFor();
      await apply.click(); await apply.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
      await page.getByText('Live source connected', { exact: true }).waitFor();
      const newerSource = fs.readFileSync(path.join(repo, 'components/Features.tsx'), 'utf8');
      assert.notEqual(newerSource, olderSource);
      let undoWrites = 0;
      let statusReads = 0;
      let target: Record<string, string> | undefined;
      page.on('request', request => {
        const pathname = new URL(request.url()).pathname;
        if (pathname === '/api/slightnudge/undo') undoWrites++;
        if (pathname === '/api/slightnudge/undo/status') statusReads++;
      });
      await page.route('**/api/slightnudge/undo', async route => {
        target = route.request().postDataJSON();
        assert.ok(target?.previewId); assert.ok(target?.editId);
        const response = await route.fetch();
        assert.equal((await response.json()).success, true);
        await route.abort('connectionreset');
      }, { times: 1 });
      await page.route('**/api/slightnudge/undo/status', route => route.abort('connectionreset'), { times: 1 });
      await page.getByTitle('Undo visual adjustment (Ctrl+Z)').click();
      const checkUndo = page.getByRole('button', { name: 'Check Undo status', exact: true }).first();
      await checkUndo.waitFor();
      await page.getByText('Undo status unconfirmed. Editing is paused until it is checked.', { exact: true }).waitFor();
      assert.equal(fs.readFileSync(path.join(repo, 'components/Features.tsx'), 'utf8'), olderSource);
      assert.equal(undoWrites, 1); assert.equal(statusReads, 1);
      // A mutation control must not create a new review while Undo is unknown.
      let previews = 0;
      const countPreview = (request: import('playwright').Request) => { if (new URL(request.url()).pathname === '/api/slightnudge/preview' && request.method() === 'POST') previews++; };
      page.on('request', countPreview);
      await heading.click(); // Selection events are ignored while the source outcome is unknown.
      assert.equal(await apply.count(), 0);
      assert.equal(previews, 0);
      await checkUndo.click();
      await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
      await page.getByText('Live source connected', { exact: true }).waitFor();
      assert.equal(undoWrites, 1, 'Check Undo status must never repeat the source mutation');
      assert.equal(statusReads, 2);
      assert.equal(fs.readFileSync(path.join(repo, 'components/Features.tsx'), 'utf8'), olderSource);
      let history = JSON.parse(fs.readFileSync(path.join(workspace, '.slightnudge/history/edits.json'), 'utf8'));
      assert.equal(history.length, 2); assert.equal(history[0].status, 'applied'); assert.equal(history[1].status, 'undone');
      const token = await (await page.request.get(`${baseURL}/api/slightnudge/token`)).json();
      const duplicate = await page.request.post(`${baseURL}/api/slightnudge/undo`, { headers: { origin: baseURL, 'x-slightnudge-token': token.token }, data: target });
      assert.equal((await duplicate.json()).success, true);
      assert.equal(fs.readFileSync(path.join(repo, 'components/Features.tsx'), 'utf8'), olderSource, 'A duplicate bound request must leave the older accepted edit intact');
      history = JSON.parse(fs.readFileSync(path.join(workspace, '.slightnudge/history/edits.json'), 'utf8'));
      assert.equal(history[0].status, 'applied');
      page.off('request', countPreview);
      console.log('PASS: real lost Undo response; unknown status pauses editing; explicit read-only check; duplicate receipt retains older edit');
    }
    const undo = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/undo'));
    await page.getByTitle('Undo visual adjustment (Ctrl+Z)').click(); await undo;
    await page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false');
    await page.getByText('Live source connected', { exact: true }).waitFor();
    assert.equal(fs.readFileSync(path.join(repo, 'components/Features.tsx'), 'utf8'), original);
    await heading.waitFor();
    for (let attempt = 0; attempt < 100 && await heading.evaluate(element => getComputedStyle(element).fontWeight).catch(() => '') !== initialWeight; attempt++) await page.waitForTimeout(50);
    assert.equal(await heading.evaluate(element => getComputedStyle(element).fontWeight), initialWeight);
    if (dropResponse) {
      assert.equal(savedButDropped, true);
      assert.equal(applyRequests, crashPhase === 'before-source' ? 2 : 1, 'Recovery must not send a write without an explicit Apply');
      const history = JSON.parse(fs.readFileSync(path.join(workspace, '.slightnudge/history/edits.json'), 'utf8'));
      assert.equal(history.length, 1, 'A lost response must not duplicate history');
      assert.equal(history[0].status, 'undone');
      if (crashPhase) console.log(`PASS: real worker exited at ${crashPhase}; HTTP status reconciliation; ${applyRequests} explicit Apply request(s); one history record; exact source/render Undo`);
      else console.log(`PASS: real saved response dropped; ${deferStatus ? 'unknown outcome blocks Discard; explicit status check' : 'automatic status lookup'}; one Apply; rendered confirmation; exact Undo`);
    }
    }
    const candidate = process.argv.find(arg => arg.startsWith('--candidate='))?.slice('--candidate='.length);
    const resultKey = `${prepared.selected || 'sample'}${candidate ? `-candidate-${candidate}` : ''}${process.argv.includes('--drop-selection-apply-response') ? '-response-loss' : ''}${process.argv.includes('--expire-selection-token') ? '-authorization' : ''}`;
    const selections = process.argv.includes('--selections') ? await checkSourceSelections(page, repo, path.join(root, `docs/source-rendered-selections-${resultKey}.json`)) : 0;
    if (process.argv.includes('--screenshot')) await page.screenshot({ path: path.join(process.env.TEMP!, 'slightnudge-live-source.png'), animations: 'disabled' });
    return (prepared.selected || process.argv.includes('--selections-only') ? 0 : 7) + selections;
  } catch (cause) {
    console.log('Source proof failure notice:', await page.getByLabel('Editor notice', { exact: true }).innerText({ timeout: 1000 }).catch(() => 'none'));
    console.log('Source proof failure alert:', await page.getByRole('alert').allTextContents().catch(() => []));
    throw cause;
  } finally { if (processHandle.pid) try { execFileSync('taskkill', ['/pid', String(processHandle.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {} }
}
