import { gradientUtility,shadowUtility } from '../lib/slightnudge/appearance-values';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { getProjectResponsiveScopes, compileScopedProjectClasses, verifyTailwindClass } from '../lib/slightnudge/tailwind-verifier';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-responsive-tailwind3-'));
try {
  fs.writeFileSync(path.join(root, 'package.json'), '{"private":true}');
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'development', CI: '1' }; for (const key of ['PATH', 'SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']) if (process.env[key]) env[key] = process.env[key];
  const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  execFileSync(process.execPath, [npm, 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--save-exact', 'tailwindcss@3.4.19', 'postcss@8.5.6'], { cwd: root, env, timeout: 180000, stdio: 'pipe', windowsHide: true });
  const config = path.join(root, 'tailwind.config.cjs');
  const sourceConfig = 'module.exports={theme:{screens:{phone:"480px",tablet:"860px",desktop:"1180px",landscape:{raw:"(orientation: landscape)"},small:{max:"639px"}}}}';
  fs.writeFileSync(config, sourceConfig); fs.writeFileSync(path.join(root, 'styles.css'), '@tailwind utilities;');
  assert.deepEqual((await getProjectResponsiveScopes(root)).map(scope => [scope.name, scope.minWidth]), [['phone', 480], ['tablet', 860], ['desktop', 1180]]);
  const gradient=gradientUtility({angle:120,stops:[{color:'#123456',position:0},{color:'#abcdef',position:100}]});
  const shadow=shadowUtility({x:0,y:8,blur:24,spread:0,color:'#00000026'});
  for(const token of [gradient,shadow,'tablet:min-w-fit','tablet:grow','tablet:shrink-0'])assert.equal((await verifyTailwindClass(token,root)).verified,true,token);
  const baseline = await verifyTailwindClass('text-lg tablet:text-3xl desktop:text-5xl', root);
  const scoped = await compileScopedProjectClasses('text-lg tablet:text-4xl desktop:text-5xl', root, { path: 'page.tsx', line: 1, column: 1 });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage(); await page.setContent(`<style>${baseline.css}\n${scoped}</style><h1 id="edited" data-source-file="page.tsx" data-source-line="1" data-source-column="1" class="text-lg tablet:text-4xl desktop:text-5xl">Edited</h1><h1 id="other" class="text-lg tablet:text-3xl desktop:text-5xl">Other</h1>`);
    for (const [width, edited, other] of [[375, '18px', '18px'], [860, '36px', '30px'], [1180, '48px', '48px']] as const) {
      await page.setViewportSize({ width, height: 800 }); assert.equal(await page.locator('#edited').evaluate(element => getComputedStyle(element).fontSize), edited); assert.equal(await page.locator('#other').evaluate(element => getComputedStyle(element).fontSize), other);
    }
  } finally { await browser.close(); }
  fs.writeFileSync(config, sourceConfig.replace('860px', '900px'));
  assert.equal((await getProjectResponsiveScopes(root)).find(scope => scope.name === 'tablet')?.minWidth, 900);
  fs.unlinkSync(config);
  const typedConfig = path.join(root, 'tailwind.config.ts');
  fs.writeFileSync(typedConfig, 'import type { Config } from "tailwindcss"; export default {theme:{screens:{tablet:"912px"},extend:{colors:{brand:"#123456"}}}} satisfies Config;');
  assert.deepEqual((await getProjectResponsiveScopes(root)).map(scope => [scope.name, scope.minWidth]), [['tablet', 912]]);
  assert.equal((await verifyTailwindClass('text-brand', root)).verified, true, 'The actual TypeScript theme must be compiled');
  fs.writeFileSync(typedConfig, 'import missing from "./missing-plugin"; export default { plugins: [missing] };');
  assert.equal((await verifyTailwindClass('block', root)).verified, false, 'Broken project configuration must not fall back to the default theme');
  console.log('PASS Tailwind 3 responsive compatibility: actual CJS/TypeScript screens and theme, removed defaults, raw/max-only scopes omitted, compiler-ordered preview cascade, other elements unaffected, changed configuration refreshed, broken config safely refused');
} finally {
  assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(root).startsWith('sn-responsive-tailwind3-'));
  fs.rmSync(root, { recursive: true, force: true });
}
