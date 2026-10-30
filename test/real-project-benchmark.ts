import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { execFileSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { Project, Node, SyntaxKind } from 'ts-morph';
import { createSaasSample } from './helpers/create-saas-sample';

// Public projects, no checkout of environment/credential files, no Apply.
const root = process.cwd();
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-real-projects-'));
const only = process.argv.find(a => a.startsWith('--only='))?.split('=')[1];
const output = path.join(root, only ? `docs/studio-real-project-${only}.json` : 'docs/studio-real-project-results.json');
const env: NodeJS.ProcessEnv = { NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1', CI: '1', GIT_TERMINAL_PROMPT: '0' };
for (const k of ['PATH', 'SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']) if (process.env[k]) env[k] = process.env[k];
const urls = [
  'https://github.com/ShadcnDeck/chatdeck-shadcn-saas-landing-page-template',
  'https://github.com/bennyjoel/nextjs-saas-starter-lite',
  'https://github.com/EdgeOneDev/saas-starter',
  'generated-latest-next-tailwind-saas',
];
const results: any[] = [];
const cleanup: string[] = [];
function save() { fs.writeFileSync(output, JSON.stringify({ date: new Date().toISOString(), policy: '30 distinct visible elements sampled uniformly in document order on the landing page; identical policy for every rendered project. Operation: inspect then dry-run font weight. No source writes.', results, cleanup }, null, 2)); }
async function command(exe: string, args: string[], cwd: string, timeout = 240000) {
  return await new Promise<{ code: number | null; log: string }>((resolve, reject) => {
    const child = spawn(exe, args, { cwd, env, windowsHide: true });
    let log = '';
    child.stdout.on('data', d => { log = (log + d.toString()).slice(-12000); });
    child.stderr.on('data', d => { log = (log + d.toString()).slice(-12000); });
    child.once('error', reject);
    const timer = setTimeout(() => { if (child.pid) try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {} }, timeout);
    child.once('exit', code => { clearTimeout(timer); resolve({ code, log }); });
  });
}
async function freePort() {
  return new Promise<number>(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const port = (s.address() as net.AddressInfo).port; s.close(() => resolve(port)); }); });
}
function safeFile(file: string) {
  return !file.split('/').some(p => /^\.env(?:\.|$)|secret|credential|token|^id_rsa|\.(pem|key|p12|pfx)$/i.test(p));
}
function sourceHash(repo: string, files: string[]) {
  // Read only ordinary application code, never private or environment files.
  return new Map(files.filter(f => safeFile(f) && !f.endsWith('next-env.d.ts') && /\.[jt]sx?$/.test(f)).map(f => [f, fs.readFileSync(path.join(repo, f), 'utf8')]));
}
try {
  fs.mkdirSync(path.join(workspace, '.slightnudge/repositories'), { recursive: true });
  fs.mkdirSync(path.join(workspace, 'lib/slightnudge'), { recursive: true });
  fs.copyFileSync(path.join(root, 'lib/slightnudge/next-source-loader.cjs'), path.join(workspace, 'lib/slightnudge/next-source-loader.cjs'));
  process.chdir(workspace);
  const { installNextSourceAdapter } = await import(pathToFileURL(path.join(root, 'lib/slightnudge/next-source-adapter.ts')).href);
  const { inspectElement, updateStaticTailwindClass } = await import(pathToFileURL(path.join(root, 'lib/slightnudge/ast-nudger.ts')).href);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [index, url] of urls.entries()) {
      if (only && Number(only) !== index + 1) continue;
      const id = `project-${index + 1}`;
      const repo = path.join(workspace, '.slightnudge/repositories', id);
      const result: any = { url, next: 'unavailable', tailwind: 'unavailable', lockfiles: [], adapter: 'not run', vite: 'unsupported', selections: [] };
      results.push(result); save();
      let server: ReturnType<typeof spawn> | undefined;
      let page: Awaited<ReturnType<typeof browser.newPage>> | undefined;
      try {
        console.log(`Cloning ${url}`);
        const npmPath = execFileSync('where.exe', ['npm'], { encoding: 'utf8' }).split(/\r?\n/).find(p => p.endsWith('npm.cmd'))!;
        const npmCli = path.join(path.dirname(npmPath), 'node_modules/npm/bin/npm-cli.js');
        let files: string[];
        if (index === 3) {
          const versions: Record<string, string> = {};
          for (const name of ['next', 'react', 'tailwindcss', '@tailwindcss/postcss', 'typescript', '@types/react', '@types/node']) {
            const lookup = await command(process.execPath, [npmCli, 'view', name, 'version'], workspace);
            assert.equal(lookup.code, 0, `Registry version lookup must succeed for ${name}`);
            versions[name] = lookup.log.trim();
          }
          createSaasSample(repo, versions);
          result.registryVersions = versions;
          files = fs.readdirSync(repo, { recursive: true }).map(String).filter(f => fs.statSync(path.join(repo, f)).isFile()).map(f => f.replaceAll('\\', '/'));
        } else {
          const cloned = await command('git', ['-c', 'credential.helper=', 'clone', '--depth', '1', '--no-checkout', url, repo], workspace);
          if (cloned.code !== 0) throw new Error(`Public clone failed: ${cloned.log}`);
          result.commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8', env }).trim();
          files = execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD'], { cwd: repo, encoding: 'utf8', env }).split(/\r?\n/).filter(Boolean).filter(safeFile);
          for (let i = 0; i < files.length; i += 50) execFileSync('git', ['checkout', 'HEAD', '--', ...files.slice(i, i + 50)], { cwd: repo, env, stdio: 'ignore' });
        }
        const licenses = files.filter(f => /(^|\/)licen[sc]e(?:\.|$)/i.test(f));
        result.license = licenses;
        result.routes = ['app', 'pages', 'src/app', 'src/pages'].filter(d => fs.existsSync(path.join(repo, d)));
        const pkg = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
        const deps = { ...pkg.devDependencies, ...pkg.dependencies };
        result.nextDeclared = deps.next || 'none'; result.tailwindDeclared = deps.tailwindcss || 'none';
        result.lockfiles = files.filter(f => /^(package-lock.json|pnpm-lock.yaml|yarn.lock|bun.lockb?|bun.lock)$/.test(f));
        if (!licenses.length || !result.routes.length || !deps.next || !deps.tailwindcss) throw new Error('Required LICENSE, Next routes or Tailwind is missing.');
        const installed = await command(process.execPath, [npmCli, 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--legacy-peer-deps'], repo);
        result.installExit = installed.code;
        if (installed.code !== 0) throw new Error(`Dependency installation failed: ${installed.log}`);
        result.next = JSON.parse(fs.readFileSync(path.join(repo, 'node_modules/next/package.json'), 'utf8')).version;
        result.tailwind = JSON.parse(fs.readFileSync(path.join(repo, 'node_modules/tailwindcss/package.json'), 'utf8')).version;
        result.installedLockfiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb'].filter(f => fs.existsSync(path.join(repo, f)));
        fs.writeFileSync(path.join(workspace, '.slightnudge/repositories.json'), JSON.stringify([{ id, localPath: repo }]));
        await installNextSourceAdapter(id);
        result.adapter = 'installed; rendering pending';
        const originals = sourceHash(repo, files);
        const port = await freePort();
        const args = [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', '-H', '127.0.0.1', '-p', String(port)];
        if (Number(result.next.split('.')[0]) >= 16) args.push('--webpack');
        let serverLog = '';
        server = spawn(process.execPath, args, { cwd: repo, env: { ...env, PORT: String(port) }, windowsHide: true });
        server.stdout!.on('data', d => { serverLog = (serverLog + d.toString()).slice(-12000); });
        server.stderr!.on('data', d => { serverLog = (serverLog + d.toString()).slice(-12000); });
        const base = `http://127.0.0.1:${port}`;
        let rendered = false;
        for (let attempt = 0; attempt < 45; attempt++) {
          if (server.exitCode !== null) break;
          try { const r = await fetch(base, { signal: AbortSignal.timeout(5000) }); if (r.ok) { rendered = true; break; } } catch {}
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        if (!rendered) { result.adapter = 'installed; runtime failed (see error log)'; result.runtimeLog = serverLog; throw new Error('Landing page did not render; inspect runtimeLog for adapter, dependency or environment failure. No secret values were supplied.'); }
        page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        await page.route('http://localhost:3000/**', route => route.abort());
        await page.route('http://127.0.0.1:3000/**', route => route.abort());
        await page.route(`${base}/__m0-host`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body style="margin:0"><script>window.__benchmarkSelection=null;addEventListener('message',e=>{if(e.origin===location.origin&&e.source===document.querySelector('iframe').contentWindow&&e.data?.session==='disposable-m0'&&e.data?.type==='source-selection')window.__benchmarkSelection=e.data.selection;});</script><iframe style="width:100%;height:100vh;border:0" src="${base}/?__slightnudge_session=disposable-m0&__slightnudge_parent=${encodeURIComponent(base)}"></iframe></body></html>` }));
        await page.goto(`${base}/__m0-host`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const frame = page.frameLocator('iframe');
        await frame.locator('[data-source-file]').first().waitFor({ timeout: 60000 });
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => undefined);
        await frame.locator('h1').first().waitFor({ state: 'attached', timeout: 45000 }).catch(() => undefined);
        await page.waitForTimeout(1000);
        const candidates = await frame.locator('body *').evaluateAll(elements => elements.filter(el => {
          const r = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return /^(H[1-6]|P|A|BUTTON|SECTION|ARTICLE|INPUT|LI|IMG|SUMMARY|LABEL|FOOTER|NAV|DIV|SPAN)$/.test(el.tagName) && r.width > 2 && r.height > 2 && el.getRootNode() === document && style.visibility !== 'hidden' && !el.closest('nextjs-portal,#__slightnudge_root');
        }).map((el, n) => {
          el.setAttribute('data-benchmark-index', String(n)); // DOM only in throwaway browser
          return { n, tag: el.tagName.toLowerCase(), text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100) };
        }));
        result.visibleCandidates = candidates.length;
        if (candidates.length < 30) {
          result.renderDiagnostic = { candidates, text: (await frame.locator('body').innerText()).slice(0, 1600) };
          throw new Error(`Only ${candidates.length} distinct visible candidate elements rendered; cannot honestly record 30.`);
        }
        for (let j = 0; j < 30; j++) {
          const candidate = candidates[Math.floor(j * (candidates.length - 1) / 29)];
          const loc = frame.locator(`[data-benchmark-index="${candidate.n}"]`);
          // Animated landing pages may never satisfy Playwright's stability wait.
          // Scroll without modifying the application or disabling its animation.
          await loc.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
          await page.waitForTimeout(700); // Let scroll entrance animations finish.
          // Exercise the bridge's capture listener without activating links/forms.
          await page.evaluate(() => { (window as any).__benchmarkSelection = null; });
          await loc.evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
          const dom = await loc.evaluate(el => {
            const m = el.closest('[data-source-file]'); const r = el.getBoundingClientRect(); const mr = m?.getBoundingClientRect();
            return { file: m?.getAttribute('data-source-file'), line: Number(m?.getAttribute('data-source-line')), column: Number(m?.getAttribute('data-source-column')), classes: typeof el.className === 'string' ? el.className : '', rect: mr && { top: mr.top, left: mr.left, width: mr.width, height: mr.height }, clickedRect: { top: r.top, left: r.left, width: r.width, height: r.height } };
          });
          const row: any = { selection: j + 1, ...candidate, ...dom, outcome: 'refused' };
          if (dom.file) {
            await page.waitForFunction(() => Boolean((window as any).__benchmarkSelection), { timeout: 10000 });
            const bridge: { path: string; line: number; column: number; tagName: string } = await page.evaluate(() => (window as any).__benchmarkSelection);
            assert.equal(bridge.path, dom.file, 'Embedded bridge must report the selected source file');
            assert.equal(bridge.line, dom.line); assert.equal(bridge.column, dom.column); assert.equal(bridge.tagName, candidate.tag);
            row.embeddedBridgeVerified = true;
          }
          if (!dom.file || !safeFile(dom.file) || !originals.has(dom.file)) row.reason = 'No verifiable source marker for this visible element.';
          else {
            const filePath = path.join(repo, dom.file);
            const inspection = inspectElement({ filePath, line: dom.line, column: dom.column, tagName: candidate.tag, className: dom.classes, rect: dom.rect, clickedRect: dom.clickedRect });
            row.textEditable = inspection.textEditable; row.textReason = inspection.textReason;
            if (!inspection.safeToEdit) row.reason = inspection.reason || 'Inspection refused.';
            else if (inspection.line !== dom.line || inspection.column !== dom.column || inspection.tagName !== candidate.tag) { row.outcome = 'WRONG TARGET'; row.reason = 'Inspection accepted a different source position or tag.'; }
            else {
              const before = originals.get(dom.file)!;
              const proposal = updateStaticTailwindClass({ filePath, line: dom.line, column: dom.column, property: 'fontWeight', value: 'font-bold', dryRun: true });
              if (!proposal.success) row.reason = proposal.reason || 'Dry-run style change refused.';
              else {
                // Independent parse: only the selected JSX className may change.
                const project = new Project({ useInMemoryFileSystem: true });
                const ast = project.createSourceFile('source.tsx', before);
                const node = ast.getDescendants().find(n => (Node.isJsxOpeningElement(n) || Node.isJsxSelfClosingElement(n)) && ast.getLineAndColumnAtPos(n.getStart()).line === dom.line && ast.getLineAndColumnAtPos(n.getStart()).column === dom.column);
                const attr = node && (Node.isJsxOpeningElement(node) || Node.isJsxSelfClosingElement(node)) ? node.getAttribute('className') : undefined;
                if (!attr) { row.outcome = 'WRONG TARGET'; row.reason = 'No independent class attribute at accepted source location.'; }
                else {
                  const newAst = project.createSourceFile('after.tsx', proposal.updatedSource!);
                  const a = ast.getDescendantsOfKind(SyntaxKind.JsxAttribute).filter(x => x.getNameNode().getText() === 'className');
                  const b = newAst.getDescendantsOfKind(SyntaxKind.JsxAttribute).filter(x => x.getNameNode().getText() === 'className');
                  const indexOfTarget = a.findIndex(x => x.getStart() === attr.getStart());
                  const expected = before.slice(0, attr.getStart()) + b[indexOfTarget]?.getText() + before.slice(attr.getEnd());
                  if (a.length !== b.length || expected !== proposal.updatedSource) { row.outcome = 'WRONG TARGET'; row.reason = 'Dry run changed code outside the selected class attribute.'; }
                  else row.outcome = 'allowed';
                }
              }
            }
          }
          result.selections.push(row); save();
        }
        for (const [file, original] of originals) assert.equal(fs.readFileSync(path.join(repo, file), 'utf8'), original, `Benchmark must not mutate ${file}`);
        result.adapter = result.selections.some((s: any) => s.file) ? 'runtime source markers verified' : 'no runtime source markers';
        console.log(`${url}: ${result.selections.filter((s: any) => s.outcome === 'allowed').length} allowed, ${result.selections.filter((s: any) => s.outcome === 'refused').length} refused, ${result.selections.filter((s: any) => s.outcome === 'WRONG TARGET').length} wrong targets`);
      } catch (error) { result.error = error instanceof Error ? error.message : String(error); console.log(`${url}: ${result.error.slice(0, 400)}`); }
      finally { await page?.close(); if (server?.pid) try { execFileSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {} save(); }
    }
  } finally { await browser.close(); }
} finally {
  process.chdir(root);
  assert.ok(path.resolve(workspace).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(workspace).startsWith('sn-real-projects-'));
  try { fs.rmSync(workspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }); }
  catch { cleanup.push(workspace); }
  save();
  console.log(`Results: ${output}. Manual cleanup: ${cleanup.length ? cleanup.join(', ') : 'none'}`);
}
