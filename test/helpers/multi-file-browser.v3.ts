import { iframePageV3 } from './gate-page-v3';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import type { Page } from 'playwright';
import { prepareSourceProject } from './prepare-source-project.v3';
export async function checkMultiFile(page: Page, baseURL: string, workspace: string) {
 page=iframePageV3(page);

    page.setDefaultTimeout(60000);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    const repo = path.join(workspace, '.slightnudge/repositories/source-proof');
    fs.mkdirSync(repo, { recursive: true });
    const env: NodeJS.ProcessEnv = { NODE_ENV: 'development', CI: '1', NEXT_TELEMETRY_DISABLED: '1' };
    for (const name of ['PATH', 'SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA'])
        if (process.env[name])
            env[name] = process.env[name];
    prepareSourceProject(process.cwd(), workspace, repo, env);
    const port = await new Promise<number>(resolve => { const socket = net.createServer(); socket.listen(0, '127.0.0.1', () => { const port = (socket.address() as net.AddressInfo).port; socket.close(() => resolve(port)); }); });
    const child = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '-H', '127.0.0.1', '-p', String(port)], { cwd: repo, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let diagnostic = '';
    for (const stream of [child.stdout, child.stderr])
        stream?.on('data', c => diagnostic = (diagnostic + c).slice(-8000));
    const files = ['components/Hero.tsx', 'components/Features.tsx'], before = files.map(file => fs.readFileSync(path.join(repo, file), 'utf8'));
    const frame = page.frameLocator('iframe[title="Actual project"]'), hero = frame.locator('#hero h1'), features = frame.locator('#features h2');
    const dock = page.getByRole('banner', { name: 'Editor toolbar', exact: true }), toolbar = page.getByRole('toolbar', { name: 'Selection formatting', exact: true });
    const idle = () => page.waitForFunction(() => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('aria-busy') === 'false', undefined, { timeout: 120000 });
    const font = async (element: typeof hero, value: string) => { const end = Date.now() + 30000; let current = ''; while (Date.now() < end) {
        current = await element.evaluate(e => getComputedStyle(e).fontSize);
        if (current === value)
            return;
        await page.waitForTimeout(100);
    } assert.equal(current, value); };
    const style = async (element: typeof hero, size: string, count: number) => {
        const identity = await element.evaluate(e => [e.getAttribute('data-source-file'), e.getAttribute('data-source-line'), e.getAttribute('data-source-column'), e.tagName.toLowerCase()].join(':'));
        await element.click();
        await page.waitForFunction(expected => document.querySelector('[aria-label="Visual editing workspace"]')?.getAttribute('data-selected-source') === expected, identity);
        await toolbar.waitFor(); await toolbar.getByRole('combobox', { name: 'Font size', exact: true }).selectOption(size);
        await page.getByLabel('Draft status', { exact: true }).filter({ hasText: count + ' change' }).waitFor(); await idle();
    };
    const groupRequest = async (kind: 'save' | 'undo') => { await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/change-set') && r.request().postDataJSON()?.operation === kind, { timeout: 120000 }), dock.getByRole('button', { name: kind === 'save' ? 'Save changes' : 'Undo', exact: true }).click()]); await idle(); await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 }); };
    try {
        let ready = false;
        for (let i = 0; i < 100; i++) {
            try {
                if ((await fetch('http://127.0.0.1:' + port, { signal: AbortSignal.timeout(5000) })).ok) {
                    ready = true;
                    break;
                }
            }
            catch { }
            await page.waitForTimeout(300);
        }
        assert.ok(ready);
        await page.goto(baseURL + '/studio/source-proof/window?preview=' + encodeURIComponent('http://127.0.0.1:' + port + '/'), { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
        await style(hero, 'text-4xl', 1);
        await style(features, 'text-2xl', 2);
        await style(hero, 'text-6xl', 3);
        await font(hero, '60px');
        await font(features, '24px');
        assert.deepEqual(files.map(f => fs.readFileSync(path.join(repo, f), 'utf8')), before);
        await dock.getByRole('button', { name: 'Undo', exact: true }).click();
        await idle();
        await font(hero, '36px');
        await font(features, '24px');
        await dock.getByRole('button', { name: 'Undo', exact: true }).click(); await idle(); await font(hero, '36px'); await font(features, '30px');
        await dock.getByRole('button', { name: 'Redo', exact: true }).click(); await idle(); await font(hero, '36px'); await font(features, '24px');
        await dock.getByRole('button', { name: 'Redo', exact: true }).click();
        await idle();
        await font(hero, '60px');
        await font(features, '24px');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
        await page.getByLabel('Draft status', { exact: true }).filter({ hasText: '3 changes · 2 files' }).waitFor();
        await font(hero, '60px');
        await font(features, '24px');
        await dock.getByRole('button', { name: 'Toggle design panel', exact: true }).click();
        await page.getByRole('button', { name: 'Review changes', exact: true }).click();
        assert.equal(await page.getByLabel('Change-set files', { exact: true }).locator('li').count(), 2);
        await page.getByRole('button', { name: 'Close design panel', exact: true }).click();
        await groupRequest('save');
        assert.ok(fs.readFileSync(path.join(repo, files[0]), 'utf8').includes('text-6xl'));
        assert.ok(fs.readFileSync(path.join(repo, files[1]), 'utf8').includes('text-2xl'));
        await font(hero, '60px');
        await font(features, '24px');
        await groupRequest('undo');
        assert.deepEqual(files.map(f => fs.readFileSync(path.join(repo, f), 'utf8')), before);
        await font(hero, '48px');
        await font(features, '30px');
        // A real worker dies after writing only the first member. The browser loses
        // the response, reads status, reloads into recovery, and explicitly resumes.
        await style(hero, 'text-4xl', 1);
        await style(features, 'text-2xl', 2);
        await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 }); await page.getByLabel('Draft status', { exact: true }).filter({ hasText: '2 changes · 2 files' }).waitFor(); await font(hero, '36px'); await font(features, '24px');
        let interrupted = false;
        await page.route('**/api/slightnudge/change-set', async (route) => {
            const body = route.request().postDataJSON();
            if (body.operation !== 'save' || interrupted) {
                await route.continue();
                return;
            }
            interrupted = true;
            const input = { root: workspace, scopeRoot: repo, repositoryId: 'source-proof', id: body.transactionId, targets: body.members.map((m: {
                    previewId: string;
                    filePath: string;
                }) => ({ previewId: m.previewId, filePath: path.join(repo, m.filePath), sourcePath: m.filePath })) };
            const inputFile = path.join(workspace, 'group-crash-input.json');
            fs.writeFileSync(inputFile, JSON.stringify(input));
            const workerEnv = { ...env, SLIGHTNUDGE_TEST: '1', SLIGHTNUDGE_WORKSPACE_ROOT: workspace, SLIGHTNUDGE_DATA_DIR: path.join(workspace, '.slightnudge') };
            const exit = await new Promise<number | null>((resolve, reject) => { const worker = spawn(process.execPath, ['--import', 'tsx', 'test/helpers/group-crash-worker.ts', inputFile, 'save', 'after-file'], { cwd: workspace, env: workerEnv, stdio: 'ignore' }); worker.on('error', reject); worker.on('exit', resolve); });
            assert.equal(exit, 47);
            await route.abort();
        });
        await dock.getByRole('button', { name: 'Save changes', exact: true }).click();
        await page.getByRole('button', { name: 'Resume Save', exact: true }).waitFor({ timeout: 120000 });
        assert.notEqual(fs.readFileSync(path.join(repo, files[0]), 'utf8'), before[0]);
        assert.equal(fs.readFileSync(path.join(repo, files[1]), 'utf8'), before[1]);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: 'Resume Save', exact: true }).waitFor({ timeout: 120000 });
        await page.getByRole('button', { name: 'Resume Save', exact: true }).click();
        await idle();
        await page.locator('[data-source-ready="true"]').waitFor({ timeout: 120000 });
        await font(hero, '36px');
        await font(features, '24px');
        await groupRequest('undo');
        assert.deepEqual(files.map(f => fs.readFileSync(path.join(repo, f), 'utf8')), before);
        await page.screenshot({ path: path.join(process.cwd(), 'docs/multi-file-editor.png') });
        assert.deepEqual(errors, []);
        console.log('PASS imported multi-file editor: alternating file heads, untouched source drafts, shared Undo/Redo, refresh recovery, 2-file review, grouped Save/Undo and actual CSS, real process death after first file, lost response status, reload recovery and explicit Resume Save, continued editing');
        return 1;
    }
    catch (error) {
        console.log('Multi-file editor state', await page.locator('body').innerText().catch(() => ''));
        console.log('Imported server', diagnostic);
        await page.screenshot({ path: path.join(process.cwd(), 'docs/multi-file-failure.png') }).catch(() => { });
        throw error;
    }
    finally {
        if (child.pid)
            try {
                execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
            }
            catch { }
    }
}
