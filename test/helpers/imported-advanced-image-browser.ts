import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import type { Page } from 'playwright';
import { prepareSourceProject } from './prepare-source-project';
import { checkAdvancedImages } from './advanced-image-browser';

export async function checkImportedAdvancedImages(page: Page, baseURL: string, workspace: string, root: string, workflow = checkAdvancedImages) {
  const repo = path.join(workspace, '.slightnudge/repositories/source-proof'); fs.mkdirSync(repo, { recursive: true });
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'development', CI: '1', NEXT_TELEMETRY_DISABLED: '1' };
  for (const key of ['PATH', 'SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']) if (process.env[key]) env[key] = process.env[key];
  prepareSourceProject(root, workspace, repo, env);
  fs.mkdirSync(path.join(repo, 'public'), { recursive: true });
  const port = await new Promise<number>(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const value = (server.address() as net.AddressInfo).port; server.close(() => resolve(value)); }); });
  const child = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '-H', '127.0.0.1', '-p', String(port)], { cwd: repo, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let diagnostics = ''; for (const stream of [child.stdout, child.stderr]) stream?.on('data', chunk => { diagnostics = (diagnostics + chunk).slice(-8000); });
  try {
    const url = `http://127.0.0.1:${port}/`; let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) { try { if ((await fetch(url, { signal: AbortSignal.timeout(5000) })).ok) { ready = true; break; } } catch {} await page.waitForTimeout(300); }
    if (!ready) throw new Error(diagnostics || 'Imported project did not start.');
    return await workflow(page, baseURL, workspace, root, { id: 'source-proof', root: repo, url });
  } catch (error) { console.log(diagnostics); throw error; }
  finally { if (child.pid) { try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {} } }
}
