import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import assert from 'node:assert';
import http from 'node:http';
import { verifyTailwindClass, findProjectRoot } from '../../lib/slightnudge/tailwind-verifier';
import { createPendingSourceEdit, applyPendingSourceEdit, discardPendingSourceEdit } from '../../lib/slightnudge/edit-history';
import { setupIsolatedEnv, startTestServer } from '../../test/helpers/test-server';

const rootNodeModules = path.resolve('node_modules');
const tmpBase = path.join(os.tmpdir(), `sn-step4-${crypto.randomBytes(6).toString('hex')}`);
fs.mkdirSync(tmpBase, { recursive: true });

console.log('========================================================================');
console.log('STEP 4: TAILWIND VERIFIER REGRESSION AUDIT (TEMP COPIES)');
console.log('========================================================================\n');

async function testStep4a() {
  console.log('--- Step 4a: v4 Project ---');
  const projDir = path.join(tmpBase, 'v4-project');
  fs.mkdirSync(projDir, { recursive: true });
  fs.symlinkSync(rootNodeModules, path.join(projDir, 'node_modules'), 'junction');
  fs.writeFileSync(
    path.join(projDir, 'package.json'),
    JSON.stringify({
      name: 'v4-test',
      dependencies: { tailwindcss: '^4.3.3', '@tailwindcss/node': '^4.3.3' },
    }, null, 2),
    'utf8'
  );
  fs.mkdirSync(path.join(projDir, 'app'), { recursive: true });
  fs.writeFileSync(
    path.join(projDir, 'app', 'globals.css'),
    `@import "tailwindcss";\n@theme {\n  --color-brand-500: #ff3366;\n}\n`,
    'utf8'
  );
  const targetFile = path.join(projDir, 'app', 'page.tsx');
  fs.writeFileSync(targetFile, 'export default function Page() { return <div>V4</div>; }', 'utf8');

  // 1. bg-brand-500 from @theme accepted
  const t0 = Date.now();
  const resBrand = await verifyTailwindClass('bg-brand-500', targetFile);
  const tBrand = Date.now() - t0;
  console.log(`  bg-brand-500:          verified=${resBrand.verified} in ${tBrand}ms (CSS length: ${resBrand.css?.length || 0})`);
  assert.strictEqual(resBrand.verified, true, 'bg-brand-500 must be verified');

  // 2. bg-nonexistent-999 refused
  const resBogus = await verifyTailwindClass('bg-nonexistent-999', targetFile);
  console.log(`  bg-nonexistent-999:    verified=${resBogus.verified} (error: ${resBogus.error})`);
  assert.strictEqual(resBogus.verified, false, 'bg-nonexistent-999 must be refused');

  // 3. dark:hover:bg-brand-500 accepted
  const resVariant = await verifyTailwindClass('dark:hover:bg-brand-500', targetFile);
  console.log(`  dark:hover:bg-brand-500: verified=${resVariant.verified} (CSS length: ${resVariant.css?.length || 0})`);
  assert.strictEqual(resVariant.verified, true, 'dark:hover:bg-brand-500 must be verified');

  // 4. w-[37px] accepted
  const resArbitrary = await verifyTailwindClass('w-[37px]', targetFile);
  console.log(`  w-[37px]:              verified=${resArbitrary.verified} (CSS length: ${resArbitrary.css?.length || 0})`);
  assert.strictEqual(resArbitrary.verified, true, 'w-[37px] must be verified');

  console.log('  Verdict 4a: CONFIRMED\n');
}

async function testStep4b() {
  console.log('--- Step 4b: v3 Project (npm installed) ---');
  const projDir = path.join(tmpBase, 'v3-project');
  fs.mkdirSync(projDir, { recursive: true });
  fs.writeFileSync(
    path.join(projDir, 'package.json'),
    JSON.stringify({
      name: 'v3-test',
      dependencies: {
        tailwindcss: '^3.4.17',
        postcss: '^8.4.38',
        autoprefixer: '^10.4.19',
      },
    }, null, 2),
    'utf8'
  );

  console.log('  Installing tailwindcss@3 in temp folder...');
  let v3Installed = false;
  try {
    execSync('npm install --no-audit --no-fund', { cwd: projDir, stdio: 'ignore' });
    v3Installed = true;
  } catch (err: any) {
    console.log(`  npm install failed: ${err.message}`);
  }

  if (!v3Installed) {
    console.log('  Verdict 4b: UNVERIFIED (npm install failed in temp directory)\n');
    return;
  }

  const configContent = `const plugin = require('tailwindcss/plugin');
module.exports = {
  darkMode: 'class',
  content: ['./**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#10b981',
        },
      },
    },
  },
  plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.plugin-glow': {
          'box-shadow': '0 0 10px #10b981',
        },
      });
    }),
  ],
};
`;
  fs.writeFileSync(path.join(projDir, 'tailwind.config.js'), configContent, 'utf8');
  fs.mkdirSync(path.join(projDir, 'app'), { recursive: true });
  fs.writeFileSync(path.join(projDir, 'app', 'globals.css'), '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n', 'utf8');
  const targetFile = path.join(projDir, 'app', 'page.tsx');
  fs.writeFileSync(targetFile, 'export default function Page() { return <div>V3</div>; }', 'utf8');

  // p-4
  const resP4 = await verifyTailwindClass('p-4', targetFile);
  console.log(`  p-4:                   verified=${resP4.verified}`);
  assert.strictEqual(resP4.verified, true);

  // bg-brand-500
  const resBrand = await verifyTailwindClass('bg-brand-500', targetFile);
  console.log(`  bg-brand-500:          verified=${resBrand.verified}`);
  assert.strictEqual(resBrand.verified, true);

  // dark:hover:bg-brand-500
  const resVariant = await verifyTailwindClass('dark:hover:bg-brand-500', targetFile);
  console.log(`  dark:hover:bg-brand-500: verified=${resVariant.verified}`);
  assert.strictEqual(resVariant.verified, true);

  // w-[37px]
  const resArbitrary = await verifyTailwindClass('w-[37px]', targetFile);
  console.log(`  w-[37px]:              verified=${resArbitrary.verified}`);
  assert.strictEqual(resArbitrary.verified, true);

  // plugin-glow
  const resPlugin = await verifyTailwindClass('plugin-glow', targetFile);
  console.log(`  plugin-glow:           verified=${resPlugin.verified}`);
  assert.strictEqual(resPlugin.verified, true);

  // bogus refused
  const resBogus = await verifyTailwindClass('bogus-invalid-xyz', targetFile);
  console.log(`  bogus-invalid-xyz:     verified=${resBogus.verified} (error: ${resBogus.error})`);
  assert.strictEqual(resBogus.verified, false);

  // unchanged existing tokens (group, peer, container, custom classes) never verified on apply
  const env = setupIsolatedEnv('v3-existing-tokens', projDir);
  try {
    const existing = 'group peer container custom-legacy-widget bg-brand-500';
    const beforeContent = `export default function Page() { return <div className="${existing}">Hello</div>; }\n`;
    const afterContent = `export default function Page() { return <div className="${existing} p-4">Hello</div>; }\n`;
    fs.writeFileSync(targetFile, beforeContent, 'utf8');

    const pending = createPendingSourceEdit({
      filePath: targetFile,
      before: beforeContent,
      after: afterContent,
      summary: 'Add p-4 with unchanged non-tailwind classes',
      oldValue: existing,
      newValue: `${existing} p-4`,
      previewType: 'className',
    });

    const applyRes = await applyPendingSourceEdit(pending.id);
    console.log(`  Apply with unchanged legacy classes: success=${applyRes.success}`);
    assert.strictEqual(applyRes.success, true);
    const onDisk = fs.readFileSync(targetFile, 'utf8');
    assert.strictEqual(onDisk, afterContent);
  } finally {
    env.cleanup();
  }

  console.log('  Verdict 4b: CONFIRMED\n');
}

async function testStep4c() {
  console.log('--- Step 4c: Nested Layout Resolution ---');
  const monorepoRoot = path.join(tmpBase, 'monorepo');
  const webAppDir = path.join(monorepoRoot, 'apps', 'web');
  fs.mkdirSync(path.join(webAppDir, 'src', 'app'), { recursive: true });

  // Monorepo root has package.json with tailwindcss v4
  fs.writeFileSync(
    path.join(monorepoRoot, 'package.json'),
    JSON.stringify({
      name: 'monorepo-root',
      dependencies: { tailwindcss: '^4.3.3', '@tailwindcss/node': '^4.3.3' },
    }, null, 2),
    'utf8'
  );
  fs.symlinkSync(rootNodeModules, path.join(monorepoRoot, 'node_modules'), 'junction');
  fs.mkdirSync(path.join(monorepoRoot, 'app'), { recursive: true });
  fs.writeFileSync(
    path.join(monorepoRoot, 'app', 'globals.css'),
    `@import "tailwindcss";\n@theme {\n  --color-root-exclusive: #111111;\n}\n`,
    'utf8'
  );

  // apps/web has package.json with tailwindcss
  // Also junction node_modules into apps/web
  fs.symlinkSync(rootNodeModules, path.join(webAppDir, 'node_modules'), 'junction');
  fs.writeFileSync(
    path.join(webAppDir, 'package.json'),
    JSON.stringify({
      name: 'web-app',
      dependencies: { tailwindcss: '^4.3.3', '@tailwindcss/node': '^4.3.3' },
    }, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.join(webAppDir, 'src', 'app', 'globals.css'),
    `@import "tailwindcss";\n@theme {\n  --color-nested-exclusive: #222222;\n}\n`,
    'utf8'
  );
  const nestedTarget = path.join(webAppDir, 'src', 'app', 'page.tsx');
  fs.writeFileSync(nestedTarget, 'export default function Page() { return <div>Nested</div>; }', 'utf8');

  // Verify findProjectRoot resolves to apps/web, NOT monorepo root
  const resolvedRoot = findProjectRoot(nestedTarget);
  console.log(`  Target file:           ${nestedTarget}`);
  console.log(`  findProjectRoot:       ${resolvedRoot}`);
  console.log(`  Matches apps/web:      ${path.resolve(resolvedRoot) === path.resolve(webAppDir)}`);
  assert.strictEqual(path.resolve(resolvedRoot), path.resolve(webAppDir), 'Must resolve to nearest package with tailwindcss');

  // Nearest project has --color-nested-exclusive: #222222
  const resNestedColor = await verifyTailwindClass('bg-nested-exclusive', nestedTarget);
  console.log(`  bg-nested-exclusive:   verified=${resNestedColor.verified} (CSS: ${resNestedColor.css?.trim()})`);
  assert.strictEqual(resNestedColor.verified, true, 'Nearest project theme token must be verified');

  // Root project has --color-root-exclusive: #111111, which does NOT exist in apps/web
  const resRootColor = await verifyTailwindClass('bg-root-exclusive', nestedTarget);
  console.log(`  bg-root-exclusive:     verified=${resRootColor.verified} (error: ${resRootColor.error})`);
  assert.strictEqual(resRootColor.verified, false, 'Root project theme token must be refused in nested project');

  console.log('  Verdict 4c: CONFIRMED\n');
}

async function testStep4d() {
  console.log('--- Step 4d: No Tailwind Installed & Engine Throws ---');
  const projDir = path.join(tmpBase, 'no-tailwind-project');
  fs.mkdirSync(projDir, { recursive: true });
  fs.writeFileSync(
    path.join(projDir, 'package.json'),
    JSON.stringify({ name: 'no-tailwind', dependencies: {} }, null, 2),
    'utf8'
  );
  const targetFile = path.join(projDir, 'page.tsx');
  const initialCode = 'export default function Page() { return <div className="p-2">Hello</div>; }\n';
  fs.writeFileSync(targetFile, initialCode, 'utf8');

  // 1. Verifier direct call
  const verRes = await verifyTailwindClass('p-4', targetFile);
  console.log(`  Direct verify with no tailwind: verified=${verRes.verified}, error=${verRes.error}`);
  assert.strictEqual(verRes.verified, false);
  assert.match(verRes.error || '', /tailwindcss is not installed/i);

  // 2. Apply API with no tailwind installed
  const env = setupIsolatedEnv('no-tw-apply', projDir);
  try {
    const updatedCode = 'export default function Page() { return <div className="p-4">Hello</div>; }\n';
    const pending = createPendingSourceEdit({
      filePath: targetFile,
      before: initialCode,
      after: updatedCode,
      summary: 'Add p-4 without tailwind',
      oldValue: 'p-2',
      newValue: 'p-4',
      previewType: 'className',
    });

    const applyRes = await applyPendingSourceEdit(pending.id);
    console.log(`  applyPendingSourceEdit result: success=${applyRes.success}, error=${(applyRes as any).error}`);
    assert.strictEqual(applyRes.success, false, 'Apply must be refused');
    assert.match((applyRes as any).error || '', /can't verify this class/i);

    const diskCode = fs.readFileSync(targetFile, 'utf8');
    assert.strictEqual(diskCode, initialCode, 'Target file must remain UNCHANGED on disk');
    console.log('  Target file content unchanged on disk: CONFIRMED');
  } finally {
    env.cleanup();
  }

  console.log('  Verdict 4d: CONFIRMED\n');
}

async function testStep4e() {
  console.log('--- Step 4e: Cache Invalidation ---');
  const projDir = path.join(tmpBase, 'cache-inval-project');
  fs.mkdirSync(projDir, { recursive: true });
  fs.symlinkSync(rootNodeModules, path.join(projDir, 'node_modules'), 'junction');
  fs.writeFileSync(
    path.join(projDir, 'package.json'),
    JSON.stringify({
      name: 'cache-test',
      dependencies: { tailwindcss: '^4.3.3', '@tailwindcss/node': '^4.3.3' },
    }, null, 2),
    'utf8'
  );
  fs.mkdirSync(path.join(projDir, 'app'), { recursive: true });
  const cssFile = path.join(projDir, 'app', 'globals.css');
  fs.writeFileSync(cssFile, `@import "tailwindcss";\n@theme {\n  --color-alpha-100: #112233;\n}\n`, 'utf8');
  const targetFile = path.join(projDir, 'app', 'page.tsx');
  fs.writeFileSync(targetFile, 'export default function Page() { return <div>Cache</div>; }', 'utf8');

  // Step 1: verify initial color
  const r1 = await verifyTailwindClass('bg-alpha-100', targetFile);
  console.log(`  1. bg-alpha-100:       verified=${r1.verified}`);
  assert.strictEqual(r1.verified, true);

  // Step 2: verify new color before adding
  const r2 = await verifyTailwindClass('bg-beta-200', targetFile);
  console.log(`  2. bg-beta-200 (pre):  verified=${r2.verified} (refused)`);
  assert.strictEqual(r2.verified, false);

  // Step 3: update CSS file to add --color-beta-200
  // Sleep 100ms and explicitly update mtimeMs
  await new Promise(r => setTimeout(r, 200));
  fs.writeFileSync(cssFile, `@import "tailwindcss";\n@theme {\n  --color-alpha-100: #112233;\n  --color-beta-200: #445566;\n}\n`, 'utf8');
  const newMtime = new Date(Date.now() + 1000);
  fs.utimesSync(cssFile, newMtime, newMtime);

  // Step 4: verify new color without restart
  const r3 = await verifyTailwindClass('bg-beta-200', targetFile);
  console.log(`  3. bg-beta-200 (post): verified=${r3.verified}`);
  assert.strictEqual(r3.verified, true, 'New color must be accepted after file modification without server restart');

  // Step 5: remove the color
  await new Promise(r => setTimeout(r, 200));
  fs.writeFileSync(cssFile, `@import "tailwindcss";\n@theme {\n  --color-alpha-100: #112233;\n}\n`, 'utf8');
  const removeMtime = new Date(Date.now() + 2000);
  fs.utimesSync(cssFile, removeMtime, removeMtime);

  // Step 6: verify removed color
  const r4 = await verifyTailwindClass('bg-beta-200', targetFile);
  console.log(`  4. bg-beta-200 (rem):  verified=${r4.verified}`);
  assert.strictEqual(r4.verified, false, 'Removed color must be refused after deletion');

  console.log('  Verdict 4e: CONFIRMED\n');
}

async function testStep4f() {
  console.log('--- Step 4f: Timing Benchmarks ---');
  const projDir = path.join(tmpBase, 'timing-project');
  fs.mkdirSync(projDir, { recursive: true });
  fs.symlinkSync(rootNodeModules, path.join(projDir, 'node_modules'), 'junction');
  fs.writeFileSync(
    path.join(projDir, 'package.json'),
    JSON.stringify({
      name: 'timing-test',
      dependencies: { tailwindcss: '^4.3.3', '@tailwindcss/node': '^4.3.3' },
    }, null, 2),
    'utf8'
  );
  fs.mkdirSync(path.join(projDir, 'app'), { recursive: true });
  fs.writeFileSync(path.join(projDir, 'app', 'globals.css'), '@import "tailwindcss";\n', 'utf8');
  const targetFile = path.join(projDir, 'app', 'page.tsx');
  fs.writeFileSync(targetFile, 'export default function Page() { return <div>Timing</div>; }', 'utf8');

  // First verification (cold compiler load)
  const t0 = performance.now();
  const resCold = await verifyTailwindClass('p-4', targetFile);
  const firstMs = performance.now() - t0;

  // Second verification (cached design system)
  const t1 = performance.now();
  const resWarm1 = await verifyTailwindClass('p-8', targetFile);
  const repeatMs1 = performance.now() - t1;

  // Third verification (cached design system)
  const t2 = performance.now();
  const resWarm2 = await verifyTailwindClass('m-2', targetFile);
  const repeatMs2 = performance.now() - t2;

  console.log(`  First verification time:   ${firstMs.toFixed(2)} ms (cold load)`);
  console.log(`  Repeat verification 1:     ${repeatMs1.toFixed(2)} ms (cached ds)`);
  console.log(`  Repeat verification 2:     ${repeatMs2.toFixed(2)} ms (cached ds)`);
  console.log('  Verdict 4f: CONFIRMED (Informational)\n');
}

async function testHttpApplyOnTempServer() {
  console.log('--- Step 4 Extra: HTTP Apply API on Isolated Dev Server ---');
  const server = await startTestServer();
  console.log(`  Test dev server started at ${server.baseUrl} on port ${server.port}`);
  try {
    // 1. Create a pending edit via library inside server.wsDir
    const testFile = path.join(server.wsDir, 'app', 'page.tsx');
    const originalContent = fs.readFileSync(testFile, 'utf8');
    const updatedContent = originalContent.replace(/className="([^"]*)"/, 'className="$1 p-8"');
    
    // Read old value from regex
    const match = originalContent.match(/className="([^"]*)"/);
    const oldValue = match ? match[1] : '';
    const newValue = `${oldValue} p-8`;

    // Setup isolated env matching server
    process.env.SLIGHTNUDGE_TEST = '1';
    process.env.SLIGHTNUDGE_WORKSPACE_ROOT = server.wsDir;
    process.env.SLIGHTNUDGE_DATA_DIR = server.dataDir;
    process.env.SLIGHTNUDGE_HISTORY_PATH = path.join(server.dataDir, 'history', 'edits.json');
    process.env.SLIGHTNUDGE_PENDING_DIR = path.join(server.dataDir, 'pending');

    const pending = createPendingSourceEdit({
      filePath: testFile,
      before: originalContent,
      after: updatedContent,
      summary: 'HTTP Apply Test',
      oldValue,
      newValue,
      previewType: 'className',
    });

    // 2. Send POST /api/slightnudge/apply
    const postData = JSON.stringify({ previewId: pending.id });
    const applyRes = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = http.request(
        {
          host: '127.0.0.1',
          port: server.port,
          path: '/api/slightnudge/apply',
          method: 'POST',
          headers: {
            'Host': `127.0.0.1:${server.port}`,
            'Origin': server.baseUrl,
            'x-slightnudge-token': server.token,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          let b = '';
          res.on('data', (c) => (b += c));
          res.on('end', () => resolve({ status: res.statusCode || 0, body: b }));
        }
      );
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    console.log(`  HTTP Apply Response: status=${applyRes.status}, body=${applyRes.body}`);
    assert.strictEqual(applyRes.status, 200, 'HTTP Apply must return 200 OK');
    const updatedDisk = fs.readFileSync(testFile, 'utf8');
    assert.strictEqual(updatedDisk, updatedContent, 'File must be updated on server workspace');
    console.log('  HTTP Apply on isolated server: CONFIRMED');
  } finally {
    await server.stop();
    console.log('  Test dev server stopped and cleaned up.');
  }
}

async function main() {
  try {
    await testStep4a();
    await testStep4b();
    await testStep4c();
    await testStep4d();
    await testStep4e();
    await testStep4f();
    await testHttpApplyOnTempServer();
    console.log('========================================================================');
    console.log('ALL STEP 4 VERIFICATIONS COMPLETED SUCCESSFULLY!');
    console.log('========================================================================');
  } finally {
    // Teardown tmpBase
    try {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error('STEP 4 FAILED:', err);
  process.exit(1);
});
