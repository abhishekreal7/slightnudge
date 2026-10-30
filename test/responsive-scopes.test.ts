import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getProjectResponsiveScopes, compileScopedProjectClasses, verifyTailwindClass } from '../lib/slightnudge/tailwind-verifier';
import { chromium } from 'playwright';
import { getSourceCanvasBridge } from '../lib/slightnudge/source-canvas-bridge';
import { resolveResponsiveScopes } from '../lib/slightnudge/source-canvas-contract';
import { updateStaticTailwindClass } from '../lib/slightnudge/ast-nudger';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-responsive-scopes-'));
try {
  fs.symlinkSync(path.join(process.cwd(), 'node_modules'), path.join(root, 'node_modules'), 'junction');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ dependencies: { tailwindcss: '4.3.3' } }));
  fs.writeFileSync(path.join(root, 'styles.css'), '@import "tailwindcss";\n@theme { --breakpoint-sm:initial; --breakpoint-md:52rem; --breakpoint-tablet:58rem; }');
  const scopes = await getProjectResponsiveScopes(root);
  assert.equal(scopes.find(scope => scope.name === 'md')?.minWidth, 832);
  assert.equal(scopes.find(scope => scope.name === 'tablet')?.minWidth, 928);
  assert.equal(scopes.some(scope => scope.name === 'sm'), false);
  const source = 'export default function Page(){return <h1 className="text-lg md:text-2xl tablet:text-3xl lg:text-5xl">Hello</h1>}';
  const target = { filePath: path.join(root, 'page.tsx'), sourceText: source, line: 1, column: source.indexOf('<h1') + 1, property: 'fontSize' as const, value: 'text-4xl', breakpoint: 'tablet', dryRun: true };
  assert.throws(() => updateStaticTailwindClass(target), /not supported/);
  const result = updateStaticTailwindClass({ ...target, verifiedResponsiveScope: true });
  assert.equal(result.success, true); assert.ok(result.newClassName?.includes('tablet:text-4xl')); assert.ok(result.newClassName?.includes('md:text-2xl')); assert.ok(result.newClassName?.includes('lg:text-5xl')); assert.ok(result.newClassName?.startsWith('text-lg '));
  assert.throws(() => updateStaticTailwindClass({ ...target, breakpoint: 'tablet:hover', verifiedResponsiveScope: true }), /not supported/);
  const generated = await compileScopedProjectClasses('text-xl md:text-4xl tablet:text-3xl lg:text-5xl', root, { path: 'page.tsx', line: 1, column: 1 });
  let baselineCss = ''; for (const utility of ['text-lg', 'md:text-2xl', 'lg:text-5xl']) { const value = await verifyTailwindClass(utility, root); baselineCss += `@layer utilities {${value.css || ''}}`; }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>:root{--text-lg:1.125rem;--text-2xl:1.5rem;--text-5xl:3rem}${baselineCss}\n${generated}</style><h1 id="edited" data-source-file="page.tsx" data-source-line="1" data-source-column="1" class="text-xl md:text-4xl tablet:text-3xl lg:text-5xl">Edited</h1><h1 id="other" class="text-lg md:text-2xl lg:text-5xl">Other</h1>`);
    for (const [width, edited, other] of [[375, '20px', '18px'], [832, '36px', '24px'], [928, '30px', '24px'], [1024, '48px', '48px']] as const) {
      await page.setViewportSize({ width, height: 800 });
      assert.equal(await page.locator('#edited').evaluate(element => getComputedStyle(element).fontSize), edited);
      assert.equal(await page.locator('#other').evaluate(element => getComputedStyle(element).fontSize), other, 'Draft styles must not change another element sharing utilities');
    }
  } finally { await browser.close(); }
  const largerFontBrowser = await chromium.launch({ args: ['--blink-settings=defaultFontSize=20'] });
  try {
    const page = await largerFontBrowser.newPage();
    await page.route('http://127.0.0.1:46114/**', route => route.fulfill({ contentType: 'text/html', body: route.request().url().includes('/frame') ? `<style>@layer theme,base,components,utilities;html{font-size:10px}:root{--text-lg:2rem}@layer utilities{.text-lg{font-size:var(--text-lg)}}</style><h1 data-source-file="page.tsx" data-source-line="1" data-source-column="1" id="edited" class="text-lg">Preview</h1><h1 id="other" class="text-lg">Other</h1><script>${getSourceCanvasBridge(true)}</script>` : '<script>window.messages=[];addEventListener("message",e=>messages.push(e.data))</script><iframe style="width:768px;height:600px;border:0" src="/frame?__slightnudge_session=test&__slightnudge_parent=http://127.0.0.1:46114"></iframe>' }));
    await page.goto('http://127.0.0.1:46114/'); await page.waitForFunction(() => (window as any).messages.some((message: any) => message.type === 'source-viewport'));
    const message = await page.evaluate(() => (window as any).messages.find((message: any) => message.type === 'source-viewport'));
    assert.equal(message.initialFontSize, 20, 'Media query em/rem units follow the browser initial font, not a custom document root font');
    assert.equal(resolveResponsiveScopes([{ name: 'md', minWidth: 768, media: '(width >= 48rem)' }], message.initialFontSize)[0].minWidth, 960);
    const frame = page.frames()[1]; assert.equal(await frame.locator('body').evaluate(() => matchMedia('(min-width:48rem)').matches), false);
    await page.locator('iframe').evaluate(element => { element.style.width = '960px'; }); assert.equal(await frame.locator('body').evaluate(() => matchMedia('(min-width:48rem)').matches), true);
    await page.locator('iframe').evaluate(element => { element.style.width = '1160px'; });
    const position = { path: 'page.tsx', line: 1, column: 1 };
    const className = 'text-lg tablet:text-7xl lg:text-5xl';
    const unusedThemeCss = await compileScopedProjectClasses(className, root, position), probeCss = await verifyTailwindClass('tablet:text-7xl', root);
    await page.evaluate(data => (document.querySelector('iframe') as HTMLIFrameElement).contentWindow!.postMessage(data, location.origin), { channel: 'slightnudge', session: 'test', type: 'source-edit', requestId: 'unused-theme', operation: 'preview', selection: position, kind: 'style', property: 'fontSize', utility: 'tablet:text-7xl', value: className, responsiveMedia: '(width >= 58rem)', css: unusedThemeCss, probeCss: `@layer utilities{${probeCss.css}}`, replaceCss: true });
    await page.waitForFunction(() => (window as any).messages.some((item: any) => item.requestId === 'unused-theme'));
    const result = await page.evaluate(() => (window as any).messages.find((item: any) => item.requestId === 'unused-theme')); assert.equal(result.success, true, result.reason);
    assert.equal(await frame.locator('#edited').evaluate(element => getComputedStyle(element).fontSize), '45px', 'An unused theme variable must be available during the draft, matching the saved compiler output');
    assert.equal(await frame.locator('#other').evaluate(element => getComputedStyle(element).fontSize), '20px', 'Existing project theme values must stay authoritative');
    const replacement = 'text-lg tablet:text-6xl lg:text-5xl', replacementCss = await compileScopedProjectClasses(replacement, root, position), replacementProbe = await verifyTailwindClass('tablet:text-6xl', root);
    await page.evaluate(data => (document.querySelector('iframe') as HTMLIFrameElement).contentWindow!.postMessage(data, location.origin), { channel: 'slightnudge', session: 'test', type: 'source-edit', requestId: 'replace-theme', operation: 'preview', selection: position, kind: 'style', property: 'fontSize', utility: 'tablet:text-6xl', value: replacement, responsiveMedia: '(width >= 58rem)', css: replacementCss, probeCss: `@layer utilities{${replacementProbe.css}}`, replaceCss: true });
    await page.waitForFunction(() => (window as any).messages.some((item: any) => item.requestId === 'replace-theme'));
    assert.equal((await page.evaluate(() => (window as any).messages.find((item: any) => item.requestId === 'replace-theme'))).success, true);
    assert.equal(await frame.locator('#edited').evaluate(element => getComputedStyle(element).fontSize), '37.5px');
    assert.equal(await frame.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--text-7xl')), '', 'Superseded draft theme definitions must not accumulate');
    await page.locator('iframe').evaluate(element => { element.style.width = '375px'; }); assert.equal(await frame.locator('#edited').evaluate(element => getComputedStyle(element).fontSize), '20px');
  } finally { await largerFontBrowser.close(); }
  fs.writeFileSync(path.join(root, 'styles.css'), '@import "tailwindcss";\n@import "./screens.css";');
  fs.writeFileSync(path.join(root, 'screens.css'), '@theme { --breakpoint-tablet:60rem; }');
  assert.equal((await getProjectResponsiveScopes(root)).find(scope => scope.name === 'tablet')?.minWidth, 960);
  fs.writeFileSync(path.join(root, 'screens.css'), '@theme { --breakpoint-tablet:63rem; }');
  assert.equal((await getProjectResponsiveScopes(root)).find(scope => scope.name === 'tablet')?.minWidth, 1008, 'Imported theme edits must not reuse a stale cached breakpoint');
  console.log('PASS responsive scopes: compiler-defined custom/changed/removed screens; isolated variant replacement; unverified and compound scopes refused');
} finally {
  assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(root).startsWith('sn-responsive-scopes-'));
  fs.unlinkSync(path.join(root, 'node_modules')); fs.rmSync(root, { recursive: true, force: true });
}
