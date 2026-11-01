import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { execFileSync, spawn } from 'node:child_process';
import type { Page } from 'playwright';
import { prepareSourceProject } from './prepare-source-project.v3';

/** Keep the upstream design and components intact. Exercise the actual UI/API,
 * compare against its native page, and check all tracked application source. */
export async function checkHighFidelity(page: Page, baseURL: string, workspace: string, evidenceRoot: string) {
 page=iframePageV3(page);

  assert.ok(process.argv.includes('--public=open-react'), 'This qualification targets the original Open React site');
  const evidence = path.join(evidenceRoot, 'docs/high-fidelity-open-react');
  const report: Record<string, any> = { date: new Date().toISOString(), state: 'running', checks: [], modes: [], errors: [], limits: [
    'Image asset replacement, component props, generated testimonial data and animation timeline editing are not qualified or added by this experiment.',
    'Native comparisons use the same upstream page with its development source adapter, without the editor canvas styles. Chromium only.',
  ] };
  const save = () => fs.writeFileSync(evidence + '.json', JSON.stringify(report, null, 2));
  const phase = (name: string) => { report.phase = name; save(); console.log(`High fidelity: ${name}`); };
  const pass = (name: string) => { report.checks.push(name); save(); console.log(`PASS high fidelity: ${name}`); };
  const repo = path.join(workspace, '.slightnudge/repositories/source-proof'); fs.mkdirSync(repo, { recursive: true });
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'development', CI: '1', NEXT_TELEMETRY_DISABLED: '1', GIT_TERMINAL_PROMPT: '0' };
  for (const key of ['PATH', 'SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']) if (process.env[key]) env[key] = process.env[key];
  phase('prepare original public application');
  let prepared: ReturnType<typeof prepareSourceProject>;
  try { prepared = prepareSourceProject(evidenceRoot, workspace, repo, env); }
  catch (error) { report.state = 'failed'; report.error = error instanceof Error ? error.stack : String(error); save(); throw error; }
  Object.assign(report, { project: prepared.url, commit: prepared.commit, next: prepared.next, tailwind: prepared.tailwind });
  const files = execFileSync('git', ['ls-files'], { cwd: repo, encoding: 'utf8' }).split(/\r?\n/).filter(f => /\.(?:[jt]sx?|css)$/.test(f) && !/(^|\/)\.env|secret|credential|next-env\.d\.ts/i.test(f) && fs.existsSync(path.join(repo, f)));
  const originals = new Map(files.map(f => [f, fs.readFileSync(path.join(repo, f))])); report.sourceFilesChecked = files.length;
  const changedFiles = () => files.filter(f => !fs.readFileSync(path.join(repo, f)).equals(originals.get(f)!));
  const intact = () => assert.deepEqual(changedFiles(), [], 'All tracked application source bytes must match');
  const port = await new Promise<number>(resolve => { const socket = net.createServer(); socket.listen(0, '127.0.0.1', () => { const p = (socket.address() as net.AddressInfo).port; socket.close(() => resolve(p)); }); });
  const previewURL = `http://127.0.0.1:${port}/`;
  const native = await page.context().browser()!.newPage({ viewport: { width: 1200, height: 1000 } });
  // tsx retains function names through this helper; browser evaluations run
  // outside that transform's scope. This shim is test-only, never page source.
  await page.addInitScript('window.__name = value => value');
  await native.addInitScript('window.__name = value => value');
  const child = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', ...prepared.webpackArgs, '-H', '127.0.0.1', '-p', String(port)], { cwd: repo, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let diagnostic = ''; for (const stream of [child.stdout, child.stderr]) stream?.on('data', chunk => { diagnostic = (diagnostic + chunk.toString()).slice(-18000); });
  const onError = (error: Error) => { report.errors.push({ phase: report.phase, message: error.message }); save(); };
  page.on('pageerror', onError); native.on('pageerror', onError); page.setDefaultTimeout(60000);
  const frame = page.frameLocator('iframe[title="Actual project"]');
  const toolbar = page.getByRole('toolbar', { name: 'Selection formatting', exact: true });
  const connected = () => page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
  const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 120000 });
  // These selectors identify authored elements, never injected test content.
  const selectors = {
    heading: 'h1[data-source-file="components/hero-home.tsx"]',
    paragraph: 'p[data-source-file="components/hero-home.tsx"]',
    button: 'a[data-source-file="components/hero-home.tsx"]:has-text("Schedule Demo")',
    card: 'a[data-source-file="components/workflows.tsx"]',
    cardContent: 'a[data-source-file="components/workflows.tsx"] > div > div:last-child',
  };
  const measure = async (root: Page | ReturnType<Page['frameLocator']>) => root.locator('body').evaluate(() => {
    const style = (selector: string, properties: string[]) => {
      const el = document.querySelector<HTMLElement>(selector)!; const css = getComputedStyle(el);
      return Object.fromEntries(properties.map(p => [p, css.getPropertyValue(p)]));
    };
    return {
      heading: style('h1', ['font-size', 'font-family', 'font-weight', 'line-height', 'color', 'background-image', 'background-size', 'background-clip', 'animation-name']),
      paragraph: style('p[data-source-file="components/hero-home.tsx"]', ['font-size', 'line-height', 'color', 'width']),
      button: style('a[data-source-file="components/hero-home.tsx"][href="#0"]', ['background-image', 'background-size', 'border-radius', 'font-size']),
      cards: [...document.querySelectorAll('a[data-source-file="components/workflows.tsx"]')].map(el => ({ width: Math.round(el.getBoundingClientRect().width), top: Math.round(el.getBoundingClientRect().top - el.parentElement!.getBoundingClientRect().top) })),
      assets: [...document.querySelectorAll<HTMLImageElement>('img[alt^="Workflow"]')].map(el => ({ alt: el.alt, width: el.width, naturalWidth: el.naturalWidth, complete: el.complete })),
    };
  });
  const width = async (value: number) => {
    const input = page.getByRole('spinbutton', { name: 'Preview width', exact: true }); await input.fill(String(value)); await input.press('Enter');
    await frame.locator('html').evaluate((_, v) => new Promise<void>((resolve, reject) => { let count = 0; const check = () => innerWidth === v ? resolve() : ++count > 100 ? reject(new Error('Viewport did not resize')) : setTimeout(check, 100); check(); }), value);
    await page.waitForTimeout(400);
  };
  const select = async (selector: string, fromLayers = false) => {
    const close = page.getByRole('button', { name: 'Close formatting options', exact: true });
    if (await close.count()) await close.click();
    const el = frame.locator(selector).first(); await el.scrollIntoViewIfNeeded();
    if (fromLayers) {
      const toggle = page.getByRole('button', { name: 'Toggle layers', exact: true });
      if (await toggle.count() && await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
      const suffix = await el.evaluate(el => ` · ${el.getAttribute('data-source-file')}:${el.getAttribute('data-source-line')}`);
      await page.getByRole('navigation', { name: 'Source layers', exact: true }).locator(`button[title$=${JSON.stringify(suffix)}]`).click();
    } else {
    const point = await el.evaluate(el => { const b = el.getBoundingClientRect(); for (const y of [.15, .5, .85]) for (const x of [.03, .5, .97]) if (document.elementFromPoint(b.x + b.width * x, b.y + b.height * y) === el) return { x, y }; return null; });
    assert.ok(point, `Exposed authored target: ${selector}`);
    // Coordinates inside the iframe are CSS pixels; the canvas may be scaled.
    // Click the corresponding physical point, rather than adding an unscaled
    // offset to Playwright's transformed element origin.
    const box = await el.boundingBox(); assert.ok(box);
    await page.mouse.click(box.x + box.width * point.x, box.y + box.height * point.y);
    }
    await toolbar.waitFor(); await idle();
    const location = await el.evaluate(el => `${el.getAttribute('data-source-file')}:${el.getAttribute('data-source-line')}:${el.getAttribute('data-source-column')}:${el.tagName.toLowerCase()}`);
    await page.waitForFunction(value => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source') === value, location);
  };
  const preview = async (action: () => Promise<unknown>) => {
    const [response] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/slightnudge/preview' && r.request().method() === 'POST'), action()]);
    const result = await response.json(); assert.equal(result.success, true, result.error || result.reason); await idle(); intact();
  };
  const source = async (operation: 'save' | 'undo') => {
    const [response] = await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === '/api/slightnudge/change-set' && r.request().postDataJSON()?.operation === operation, { timeout: 120000 }), page.getByRole('button', { name: operation === 'save' ? 'Save changes' : 'Undo', exact: true }).click()]);
    const result = await response.json(); assert.equal(result.success, true, result.error); await idle(); await connected();
  };
  const interactions = async (windowMode: boolean) => {
    // Studio is a full-document design canvas, not an interactive viewport.
    // Check its saved page natively; the separate window also exercises Browse
    // with overlays connected. Never dispatch synthetic widget events.
    if (windowMode) await page.getByRole('button', { name: 'Browse', exact: true }).click();
    else { await native.reload({ waitUntil: 'networkidle' }); await native.getByRole('button', { name: '⌖ Inspect: ON', exact: true }).click(); }
    const surface = windowMode ? frame : native;
    const video = surface.getByRole('button', { name: 'Watch the video', exact: true }); await video.click();
    // Headless UI's role wrapper contains fixed children and has zero height;
    // verify the visible player instead of treating the wrapper box as a modal.
    const dialog = surface.getByRole('dialog', { includeHidden: true });
    const player = dialog.locator('video[controls]'); await player.waitFor(); assert.equal(await player.count(), 1);
    await player.press('Escape'); await dialog.waitFor({ state: 'detached' });
    const card = surface.locator(selectors.card).first(); await card.scrollIntoViewIfNeeded(); await card.hover();
    await card.evaluate(el => new Promise<void>((resolve, reject) => { let tries = 0; const check = () => el.style.getPropertyValue('--mouse-x') && el.style.getPropertyValue('--mouse-y') && parseFloat(getComputedStyle(el, '::after').opacity) > .1 ? resolve() : ++tries > 30 ? reject(new Error('Spotlight did not track pointer and reveal its hover effect')) : setTimeout(check, 50); check(); }));
    assert.ok(parseFloat(await card.evaluate(el => getComputedStyle(el, '::after').opacity)) > 0, 'Native hover spotlight remains visible');
    if (windowMode) await page.getByRole('button', { name: 'Edit', exact: true }).click();
  };
  try {
    phase('start original application'); let ready = false;
    for (let i = 0; i < 100; i++) { if (child.exitCode !== null) break; try { if ((await fetch(previewURL, { signal: AbortSignal.timeout(5000) })).ok) { ready = true; break; } } catch {} await page.waitForTimeout(300); }
    assert.ok(ready, diagnostic);
    await native.goto(previewURL, { waitUntil: 'networkidle', timeout: 120000 });
    for (const image of await native.locator('img[alt^="Workflow"]').all()) { await image.scrollIntoViewIfNeeded(); await image.evaluate(el => new Promise<void>((resolve, reject) => { const img = el as HTMLImageElement; if (img.complete && img.naturalWidth) resolve(); else { img.addEventListener('load', () => resolve(), { once: true }); img.addEventListener('error', () => reject(new Error('Native image failed to load')), { once: true }); } })); }
    await native.locator('h1').scrollIntoViewIfNeeded();
    report.native = {};
    for (const w of [375, 768, 1200]) { await native.setViewportSize({ width: w, height: 1000 }); await native.locator('h1').evaluate(() => document.fonts.ready); await native.waitForTimeout(400); report.native[w] = await measure(native); }
    assert.ok(report.native[1200].assets.length === 3 && report.native[1200].assets.every((a: any) => a.complete && a.naturalWidth > 0), 'Original image assets must load');
    await native.screenshot({ path: evidence + '-native.png' });
    for (const windowMode of [false, true]) {
      const mode = windowMode ? 'window' : 'studio'; phase(`${mode}: compare native design`);
      await page.goto(`${baseURL}/studio/source-proof/${windowMode ? 'window' : 'edit'}?preview=${encodeURIComponent(previewURL)}`, { waitUntil: 'domcontentloaded', timeout: 120000 }); await connected(); await idle();
      if (windowMode) await page.getByRole('button', { name: 'Toggle design panel', exact: true }).click();
      const scope = page.getByRole('combobox', { name: 'Responsive edit scope', exact: true }); await scope.selectOption('');
      const result: Record<string, any> = { mode, comparisons: {} }; report.modes.push(result);
      for (const w of [375, 768, 1200]) { await width(w); await frame.locator('h1').evaluate(() => document.fonts.ready); const measured = await measure(frame); assert.deepEqual(measured, report.native[w], `${mode} must preserve authored design at ${w}px`); result.comparisons[w] = measured; }
      pass(`${mode}: native typography, gradients, three image assets and responsive card geometry at 375/768/1200px`);
      if (!windowMode) await page.getByRole('combobox', { name: 'Canvas zoom', exact: true }).selectOption('0.75');
      phase(`${mode}: verify native interactions before editing`); await interactions(windowMode); intact();
      pass(`${mode}: original video dialog, Escape, hover spotlight and pointer tracking ${windowMode ? 'in Browse' : 'on the native page'}`);
      phase(`${mode}: animated heading text and responsive typography`); await select(selectors.heading);
      const heading = frame.locator(selectors.heading); const originalFont = await heading.evaluate(el => getComputedStyle(el).fontSize);
      const [inspectionResponse] = await Promise.all([
        page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/inspect') && r.request().method() === 'POST' && r.ok()),
        toolbar.getByRole('button', { name: 'Edit text', exact: true }).click(),
      ]);
      const inspection = await inspectionResponse.json(); assert.equal(inspection.textEditable, true, JSON.stringify(inspection));
      const editor = frame.getByRole('textbox', { name: 'Edit selected text', exact: true }); await editor.waitFor();
      assert.equal(await editor.evaluate(el => getComputedStyle(el).fontSize), originalFont);
      assert.notEqual(await editor.evaluate(el => getComputedStyle(el).caretColor), 'rgba(0, 0, 0, 0)', 'Gradient text needs a visible editing caret despite transparent text paint');
      await editor.fill('A clearer workflow for product teams'); await preview(() => editor.press('Enter'));
      if (!windowMode) {
        const dock = await page.getByRole('region', { name: 'Canvas controls', exact: true }).boundingBox();
        result.dockAfterEditing = dock; save();
        assert.ok(dock && dock.y >= 0 && dock.y + dock.height <= page.viewportSize()!.height, 'Long pages and layer trees must keep the canvas controls in the visible workspace');
      }
      await scope.selectOption('md'); await width(768); await select(selectors.heading);
      const runtimeClasses = await heading.evaluate(el => [...el.classList].filter(c => c.startsWith('aos-')));
      assert.ok(runtimeClasses.includes('aos-init') && runtimeClasses.includes('aos-animate'), 'The upstream entrance animation must be initialized and visible');
      await preview(() => toolbar.getByRole('combobox', { name: 'Font size', exact: true }).selectOption('text-6xl'));
      for (const cls of runtimeClasses) assert.ok(await heading.evaluate((el, c) => el.classList.contains(c), cls), `Style editing must preserve runtime class ${cls}`);
      assert.equal(await heading.evaluate(el => getComputedStyle(el).fontSize), '64px', 'Use the upstream project’s 4rem text-6xl token, not the editor’s default scale');
      await width(375); assert.equal(await heading.evaluate(el => getComputedStyle(el).fontSize), report.native[375].heading['font-size']);
      await scope.selectOption(''); await width(1200);
      const preserved = await heading.evaluate(el => { const css = getComputedStyle(el); return { background: css.backgroundImage, animation: css.animationName, clip: css.backgroundClip, aos: el.getAttribute('data-aos') }; });
      assert.deepEqual(preserved, { background: report.native[1200].heading['background-image'], animation: 'gradient', clip: 'text', aos: 'fade-up' });
      pass(`${mode}: original-size inline text and responsive typography preserve animated gradient and AOS metadata`);
      phase(`${mode}: opacity color and layered button fill`); await select(selectors.paragraph);
      await toolbar.getByRole('button', { name: 'More formatting options', exact: true }).click();
      await preview(() => page.getByRole('button', { name: 'Text color: White', exact: true }).click());
      assert.ok(!(await frame.locator(selectors.paragraph).getAttribute('class'))!.includes('text-indigo-200/65'), 'Replace the original alpha color rather than stacking conflicting utilities');
      await page.getByRole('button', { name: 'Close formatting options', exact: true }).click();
      await select(selectors.button);
      await page.mouse.move(10, 10); await page.waitForTimeout(350);
      const surface = await frame.locator(selectors.button).evaluate(el => { const css = getComputedStyle(el), before = getComputedStyle(el, '::before'); return { image: css.backgroundImage, size: css.backgroundSize, position: css.backgroundPosition, mask: before.maskImage, border: before.borderWidth }; });
      await toolbar.getByRole('button', { name: 'More formatting options', exact: true }).click();
      await preview(() => page.getByRole('button', { name: 'Fill: Blue', exact: true }).click());
      await page.mouse.move(10, 10); await page.waitForTimeout(350);
      const afterSurface = await frame.locator(selectors.button).evaluate(el => { const css = getComputedStyle(el), before = getComputedStyle(el, '::before'); return { image: css.backgroundImage, size: css.backgroundSize, position: css.backgroundPosition, mask: before.maskImage, border: before.borderWidth }; });
      assert.deepEqual(afterSurface, surface, 'Fill color must preserve the gradient image, sizing, position and pseudo-element border');
      await page.getByRole('button', { name: 'Close formatting options', exact: true }).click();
      pass(`${mode}: alpha text color replacement and independent fill preserve layered background and pseudo border`);
      phase(`${mode}: nested card spacing through Layers`); await select(selectors.cardContent, true);
      await preview(() => toolbar.getByRole('combobox', { name: 'Padding', exact: true }).selectOption('p-8'));
      assert.equal(await frame.locator(selectors.cardContent).first().evaluate(el => getComputedStyle(el).paddingTop), '32px');
      await page.reload({ waitUntil: 'domcontentloaded' }); await connected(); await idle();
      await heading.filter({ hasText: 'A clearer workflow for product teams' }).waitFor();
      assert.equal(await frame.locator(selectors.cardContent).first().evaluate(el => getComputedStyle(el).paddingTop), '32px'); intact();
      pass(`${mode}: nested card spacing and mixed drafts survive refresh without source writes`);
      phase(`${mode}: save and exact Undo`); await source('save');
      assert.deepEqual(changedFiles().sort(), ['components/hero-home.tsx', 'components/workflows.tsx']);
      assert.match(fs.readFileSync(path.join(repo, 'components/hero-home.tsx'), 'utf8'), /md:text-6xl/);
      await interactions(windowMode); await source('undo'); intact();
      await heading.filter({ hasText: 'AI-driven tools for product teams' }).waitFor();
      await width(1200); assert.deepEqual(await measure(frame), report.native[1200]);
      await interactions(windowMode); intact();
      await page.screenshot({ path: `${evidence}-${mode}.png` });
      pass(`${mode}: mixed two-file Save, native interactions after Save, exact source Undo and restored design`);
    }
    assert.deepEqual(report.errors, []); intact(); report.state = 'passed'; save(); return report.checks.length;
  } catch (error) {
    report.state = 'failed'; report.error = error instanceof Error ? error.stack : String(error); report.serverLog = diagnostic; report.changedFiles = changedFiles();
    report.notices = await page.getByLabel('Editor notice', { exact: true }).allTextContents().catch(() => []); save();
    await page.screenshot({ path: evidence + '-failure.png' }).catch(() => {}); throw error;
  } finally {
    page.off('pageerror', onError); await native.close();
    if (child.pid && child.exitCode === null) try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); } catch {}
  }
}
