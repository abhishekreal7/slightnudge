import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import type { Page } from 'playwright';
import { prepareSourceProject } from './prepare-source-project';

type Target = { file: string; line: number; column: number; tag: string; text: string };
type GroupBody = { operation: string; transactionId: string; repositoryId: string; members: { previewId: string; filePath: string }[] };

/** Original public components, real drafts and group writer. Fault injection
 * replaces only the transport with a worker that exits inside the real writer. */
export async function checkRealMultiFile(page: Page, baseURL: string, workspace: string, evidenceRoot: string) {
  const selected = process.argv.find(arg => arg.startsWith('--public='))?.slice(9);
  assert.ok(selected === 'next-saas' || selected === 'open-react', 'Choose a public multi-component project');
  const evidence = path.join(evidenceRoot, `docs/real-multi-file-${selected}`);
  const report: Record<string, any> = { date: new Date().toISOString(), state: 'running', checks: [], targets: [], faults: [], boundary: 'Original public page; tracked application JS/TS/CSS snapshots; no account/payment flows' };
  const saveReport = () => fs.writeFileSync(evidence + '.json', JSON.stringify(report, null, 2));
  const phase = (name: string) => { report.phase = name; saveReport(); console.log(`${selected}: ${name}`); };
  const pass = (name: string) => { report.checks.push(name); saveReport(); console.log(`PASS ${selected}: ${name}`); };
  const repo = path.join(workspace, '.slightnudge/repositories/source-proof');
  fs.mkdirSync(repo, { recursive: true });
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'development', CI: '1', NEXT_TELEMETRY_DISABLED: '1', GIT_TERMINAL_PROMPT: '0' };
  for (const key of ['PATH', 'SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']) if (process.env[key]) env[key] = process.env[key];
  if (selected === 'next-saas') {
    env.POSTGRES_URL = 'postgres://qualification:qualification@127.0.0.1:9/qualification';
    env.STRIPE_SECRET_KEY = 'sk_test_qualification_only';
    env.AUTH_SECRET = 'slightnudge-disposable-ui-qualification-only';
    report.services = 'Nonfunctional loopback PostgreSQL and Stripe/auth placeholders solely for module validation';
  }
  phase('clone and install original public application');
  let prepared: ReturnType<typeof prepareSourceProject>;
  try { prepared = prepareSourceProject(evidenceRoot, workspace, repo, env); }
  catch (error) { report.state = 'failed'; report.error = error instanceof Error ? error.stack : String(error); saveReport(); throw error; }
  Object.assign(report, { project: prepared.url, commit: prepared.commit, next: prepared.next, tailwind: prepared.tailwind }); saveReport();
  const files = execFileSync('git', ['ls-files'], { cwd: repo, encoding: 'utf8' }).split(/\r?\n/).filter(file => /\.(?:[jt]sx?|css)$/.test(file) && !/(^|\/)\.env|secret|credential|next-env\.d\.ts/i.test(file) && fs.existsSync(path.join(repo, file)));
  const baseline = new Map(files.map(file => [file, fs.readFileSync(path.join(repo, file))]));
  report.sourceFilesChecked = baseline.size;
  const snapshot = () => new Map(files.map(file => [file, fs.readFileSync(path.join(repo, file))]));
  const equal = (expected: Map<string, Buffer>) => { for (const [file, bytes] of expected) assert.deepEqual(fs.readFileSync(path.join(repo, file)), bytes, `Source bytes: ${file}`); };
  const changedFiles = () => files.filter(file => !fs.readFileSync(path.join(repo, file)).equals(baseline.get(file)!));
  const port = await new Promise<number>(resolve => { const socket = net.createServer(); socket.listen(0, '127.0.0.1', () => { const port = (socket.address() as net.AddressInfo).port; socket.close(() => resolve(port)); }); });
  const previewURL = `http://127.0.0.1:${port}/`;
  let diagnostic = '', child: ReturnType<typeof spawn> | undefined;
  const start = () => {
    child = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', ...prepared.webpackArgs, '-H', '127.0.0.1', '-p', String(port)], { cwd: repo, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    for (const stream of [child.stdout, child.stderr]) stream?.on('data', chunk => { diagnostic = (diagnostic + chunk.toString()).slice(-18000); });
  };
  const stop = () => { if (child?.pid && child.exitCode === null) try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); } catch {} };
  const serverReady = async () => {
    for (let i = 0; i < 100; i++) { if (child?.exitCode !== null) break; try { if ((await fetch(previewURL, { signal: AbortSignal.timeout(5000) })).ok) return; } catch {} await page.waitForTimeout(300); }
    throw new Error(`Public application did not render: ${diagnostic}`);
  };
  page.setDefaultTimeout(60000);
  let restartingPreview = false;
  const errors: string[] = [];
  report.expectedRestartErrors = [];
  const onError = (error: Error) => {
    // The intentionally stopped upstream Next server can invalidate chunks in
    // its old iframe. Record only that exact origin/fault-window failure; an
    // editor exception or a post-reconnection chunk failure still fails.
    if (restartingPreview && error.message.startsWith('Loading chunk ') && error.message.includes(`missing: ${new URL(previewURL).origin}/_next/static/chunks/`)) {
      report.expectedRestartErrors.push({ phase: report.phase, message: error.message }); saveReport();
    } else { errors.push(error.message); (report.unexpectedErrorEvents ||= []).push({ phase: report.phase, message: error.message }); saveReport(); }
  };
  page.on('pageerror', onError);
  const frame = page.frameLocator('iframe[title="Actual project"]');
  const toolbar = page.getByRole('toolbar', { name: 'Selection formatting', exact: true });
  const status = page.getByLabel('Draft status', { exact: true });
  const connected = () => page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 120000 });
  const locator = (t: Target) => frame.locator(`${t.tag}[data-source-file=${JSON.stringify(t.file)}][data-source-line="${t.line}"][data-source-column="${t.column}"]`);
  const text = (t: Target, value: string) => locator(t).filter({ hasText: value }).waitFor();
  const select = async (t: Target) => {
    await page.keyboard.press('Escape'); await locator(t).scrollIntoViewIfNeeded();
    await locator(t).click();
    await page.waitForFunction(value => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source') === value, `${t.file}:${t.line}:${t.column}:${t.tag}`);
    await toolbar.waitFor(); await idle();
  };
  const edit = async (t: Target, value: string, count: number) => {
    await select(t);
    const [inspectionResponse] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/inspect') && r.request().method() === 'POST'), toolbar.getByRole('button', { name: 'Edit text', exact: true }).click()]);
    assert.equal((await inspectionResponse.json()).textEditable, true);
    const editor = frame.getByRole('textbox', { name: 'Edit selected text', exact: true }); await editor.waitFor();
    await editor.fill(value);
    const [response] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/slightnudge/preview' && r.request().method() === 'POST'), editor.press('Enter')]);
    const result = await response.json(); assert.equal(result.success, true, result.error);
    await status.filter({ hasText: count === 1 ? '1 change' : `${count} changes · 2 files` }).waitFor();
    await idle(); await text(t, value); equal(baseline);
  };
  let token = '';
  const groupAPI = async (body: Record<string, unknown>) => {
    const response = await page.request.post(`${baseURL}/api/slightnudge/change-set`, { headers: { 'x-slightnudge-token': token }, data: { repositoryId: 'source-proof', ...body } });
    return { status: response.status(), ...(await response.json()) };
  };
  const operation = async (kind: 'save' | 'undo', name = kind === 'save' ? 'Save changes' : 'Undo') => {
    const [response] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/slightnudge/change-set' && r.request().postDataJSON()?.operation === kind, { timeout: 120000 }), page.getByRole('button', { name, exact: true }).click()]);
    const result = await response.json(); assert.equal(result.success, true, result.error); assert.equal(result.state, kind === 'save' ? 'saved' : 'undone');
    await idle(); await connected();
    return { result, body: response.request().postDataJSON() as GroupBody };
  };
  const worker = async (body: GroupBody, operation: 'save' | 'undo' | 'status', crash = false) => {
    const inputFile = path.join(workspace, 'real-group-crash-input.json');
    fs.writeFileSync(inputFile, JSON.stringify({ scopeRoot: repo, repositoryId: 'source-proof', id: body.transactionId, targets: (body.members || []).map(member => ({ previewId: member.previewId, filePath: path.join(repo, member.filePath), sourcePath: member.filePath })) }));
    return await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
      const child = spawn(process.execPath, ['--import', 'tsx', 'test/helpers/group-crash-worker.ts', inputFile, operation, ...(crash ? ['after-file'] : [])], { cwd: workspace, env: { ...env, SLIGHTNUDGE_TEST: '1', SLIGHTNUDGE_WORKSPACE_ROOT: workspace, SLIGHTNUDGE_DATA_DIR: path.join(workspace, '.slightnudge') }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let output = ''; child.stdout.on('data', chunk => { output += chunk.toString(); }); child.stderr.on('data', chunk => { output += chunk.toString(); }); child.once('error', reject); child.once('exit', code => resolve({ code, output }));
    });
  };
  const interrupt = async (kind: 'save' | 'undo') => {
    let body: GroupBody | undefined, didInterrupt = false;
    const handler: Parameters<Page['route']>[1] = async route => {
      const request = route.request().postDataJSON() as GroupBody;
      if (request.operation !== kind || didInterrupt) { await route.continue(); return; }
      didInterrupt = true; body = request;
      const result = await worker(request, kind, true); assert.equal(result.code, 47, result.output);
      await route.abort();
    };
    await page.route('**/api/slightnudge/change-set', handler);
    try {
      await page.getByRole('button', { name: kind === 'save' ? 'Save changes' : 'Undo', exact: true }).click();
      await page.getByRole('button', { name: kind === 'save' ? 'Resume Save' : 'Resume Undo', exact: true }).waitFor({ timeout: 120000 });
      assert.ok(body); report.faults.push({ operation: kind, transaction: body.transactionId, workerExit: 47, boundary: 'after first source file, before completing the group; response aborted' }); saveReport();
      return body;
    } finally { await page.unroute('**/api/slightnudge/change-set', handler); }
  };
  try {
    phase('start and connect original source canvas'); start(); await serverReady();
    await page.goto(`${baseURL}/studio/source-proof/edit?preview=${encodeURIComponent(previewURL)}`, { waitUntil: 'domcontentloaded', timeout: 120000 }); await connected(); await idle();
    token = await page.evaluate(() => (window as any).__SLIGHTNUDGE_TOKEN__ as string);
    phase('qualify literal targets in two original source files');
    const candidates = await frame.locator('h1,h2,h3,p,a,button,span').evaluateAll(elements => elements.filter(el => el.hasAttribute('data-source-file') && el.childElementCount === 0 && (el.textContent || '').trim().length >= 3 && (el.textContent || '').trim().length < 230 && el.getBoundingClientRect().width > 12 && el.getBoundingClientRect().height > 10).map(el => ({ file: el.getAttribute('data-source-file')!, line: Number(el.getAttribute('data-source-line')), column: Number(el.getAttribute('data-source-column')), tag: el.tagName.toLowerCase(), text: (el.textContent || '').trim() })));
    const targets: Target[] = [];
    for (const target of candidates.slice(0, 100)) {
      if (targets.some(t => t.file === target.file) || !baseline.has(target.file) || await locator(target).count() !== 1 || !await locator(target).isVisible()) continue;
      const response = await page.request.post(`${baseURL}/api/slightnudge/repositories/source-proof/inspect`, { data: { path: target.file, line: target.line, column: target.column, tagName: target.tag } });
      const inspection = await response.json();
      if (!inspection.found || !inspection.safeToEdit || !inspection.textEditable || inspection.tagName !== target.tag) continue;
      targets.push(target); if (targets.length === 2) break;
    }
    report.targets = targets; report.candidateCount = candidates.length; saveReport();
    assert.equal(targets.length, 2, 'Need two unique, editable original source files; generated replacement sections do not count');
    const [a, b] = targets;
    pass('two original components qualified with exact source markers and read-only AST inspection');
    phase('alternating two-file draft, shared Undo/Redo and refresh');
    const a1 = a.text + ' [group A]', b1 = b.text + ' [group B]', a2 = a.text + ' [group A refined]';
    await edit(a, a1, 1); await edit(b, b1, 2); await edit(a, a2, 3);
    await page.getByRole('button', { name: 'Undo', exact: true }).click(); await idle(); await text(a, a1); await text(b, b1);
    await page.getByRole('button', { name: 'Redo', exact: true }).click(); await idle(); await text(a, a2);
    await page.reload({ waitUntil: 'domcontentloaded' }); await connected(); await status.filter({ hasText: '3 changes · 2 files' }).waitFor(); await text(a, a2); await text(b, b1); equal(baseline);
    pass('alternating file heads, draft Undo/Redo and browser refresh without source writes');
    phase('explicit grouped Save and exact grouped Undo');
    const clean = await operation('save');
    assert.equal(clean.body.members.length, 2); assert.deepEqual(changedFiles().sort(), targets.map(t => t.file).sort());
    await text(a, a2); await text(b, b1);
    const savedBytes = snapshot(); const receipt = await groupAPI({ operation: 'status', transactionId: clean.body.transactionId });
    assert.equal(receipt.state, 'saved'); equal(savedBytes);
    await operation('undo'); equal(baseline); await text(a, a.text); await text(b, b.text);
    pass('one Save writes exactly two selected files; read-only status and one Undo restore exact original bytes and DOM');

    phase('separate-window draft and external-edit refusal');
    await page.goto(`${baseURL}/studio/source-proof/window?preview=${encodeURIComponent(previewURL)}`, { waitUntil: 'domcontentloaded', timeout: 120000 }); await connected();
    await edit(a, a1, 1); await edit(b, b1, 2);
    fs.appendFileSync(path.join(repo, b.file), '\n// External-editor qualification change\n');
    const external = snapshot();
    const [denialResponse] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/slightnudge/change-set' && r.request().postDataJSON()?.operation === 'save', { timeout: 120000 }), page.getByRole('button', { name: 'Save changes', exact: true }).click()]);
    const denial = await denialResponse.json(); assert.equal(denial.success, false); assert.equal(denial.code, 'GROUP_REFUSED'); equal(external);
    await idle(); assert.equal(await page.getByRole('button', { name: 'Resume Save', exact: true }).count(), 0, 'Pre-write conflict must not masquerade as a partial save');
    // The test acts as the external editor resolving only its own comment.
    fs.writeFileSync(path.join(repo, b.file), baseline.get(b.file)!);
    await operation('save'); await text(a, a1); await text(b, b1); await operation('undo'); equal(baseline);
    pass('external source version preserved; all-member prevalidation prevents partial writes; explicit retry after manual resolution works');

    phase('writer process death after first Save member');
    await edit(a, a1, 1); await edit(b, b1, 2);
    const interruptedSave = await interrupt('save');
    assert.equal(changedFiles().length, 1, 'Worker must really leave one written source member');
    const partial = snapshot(); const freshStatus = await worker(interruptedSave, 'status');
    assert.equal(freshStatus.code, 0, freshStatus.output); assert.equal(JSON.parse(freshStatus.output).state, 'partial'); equal(partial);
    const liveStatus = await groupAPI({ operation: 'status', transactionId: interruptedSave.transactionId }); assert.equal(liveStatus.state, 'partial'); equal(partial);
    pass('actual Save worker death, dropped response and fresh-process/read-only API status preserve the partial state');
    phase('restart imported dev server, reload browser and explicitly resume Save');
    restartingPreview = true;
    stop(); start(); await serverReady();
    phase('reload browser into durable partial-Save recovery');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Resume Save', exact: true }).waitFor({ timeout: 120000 }); equal(partial);
    phase('explicit Resume Save and automatic preview reconnection');
    await operation('save', 'Resume Save'); await text(a, a1); await text(b, b1);
    restartingPreview = false;
    assert.deepEqual(changedFiles().sort(), targets.map(t => t.file).sort());
    pass('imported server restart and browser recovery require explicit Resume Save; both original components render the saved draft');
    phase('writer process death after first Undo member');
    const interruptedUndo = await interrupt('undo');
    assert.equal(changedFiles().length, 1);
    const undoPartial = snapshot(); const undoStatus = await worker(interruptedUndo, 'status');
    assert.equal(undoStatus.code, 0, undoStatus.output); assert.equal(JSON.parse(undoStatus.output).state, 'partial'); equal(undoPartial);
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'Resume Undo', exact: true }).waitFor({ timeout: 120000 }); equal(undoPartial);
    await operation('undo', 'Resume Undo'); equal(baseline); await text(a, a.text); await text(b, b.text);
    pass('interrupted grouped Undo, durable status, refresh and explicit Resume Undo restore all tracked source bytes');
    await select(a); await page.screenshot({ path: evidence + '.png' });
    assert.deepEqual(errors, []); equal(baseline);
    report.state = 'passed'; report.browserErrors = errors; saveReport(); return report.checks.length;
  } catch (error) {
    report.state = 'failed'; report.error = error instanceof Error ? error.stack : String(error); report.browserErrors = errors; report.serverLog = diagnostic;
    report.notices = await page.locator('[role="alert"], [aria-label="Editor notice"]').allTextContents().catch(() => []);
    report.renderedTargets = await frame.locator('[data-source-file]').evaluateAll(elements => elements.filter(el => /^(h1|h2|p|span|a|button)$/i.test(el.tagName)).slice(0, 30).map(el => ({ file: el.getAttribute('data-source-file'), line: el.getAttribute('data-source-line'), column: el.getAttribute('data-source-column'), text: el.textContent?.slice(0, 180) }))).catch(() => []);
    report.changedFiles = changedFiles(); saveReport(); await page.screenshot({ path: evidence + '-failure.png' }).catch(() => {}); throw error;
  } finally { page.off('pageerror', onError); stop(); }
}
