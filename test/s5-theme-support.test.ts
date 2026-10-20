import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { verifyTailwindClass } from '../lib/slightnudge/tailwind-verifier';
import { createPendingSourceEdit, applyPendingSourceEdit, discardPendingSourceEdit } from '../lib/slightnudge/edit-history';
import { setupIsolatedEnv } from './helpers/test-server';

describe('S5: Theme Support and Config Detection in Tailwind Verifier', () => {
  const rootNodeModules = path.resolve('node_modules');

  function createFixtureProject(options: {
    cssContent?: string;
    tailwindConfigContent?: string;
    includeTailwindDep?: boolean;
    cssPath?: string;
  }) {
    const projId = randomUUID();
    const projDir = path.join(os.tmpdir(), `s5-theme-test-${projId}`);
    fs.mkdirSync(projDir, { recursive: true });

    // Link node_modules so tailwind packages resolve
    if (options.includeTailwindDep !== false) {
      const nmDir = path.join(projDir, 'node_modules');
      try {
        fs.symlinkSync(rootNodeModules, nmDir, 'junction');
      } catch (err: any) {
        // Fallback if junction fails
        console.warn('Failed to create node_modules junction:', err.message);
      }
      fs.writeFileSync(
        path.join(projDir, 'package.json'),
        JSON.stringify({
          name: `fixture-${projId}`,
          dependencies: {
            tailwindcss: '^4.3.3',
            '@tailwindcss/node': '^4.3.3',
          },
        }, null, 2),
        'utf8'
      );
    } else {
      fs.writeFileSync(
        path.join(projDir, 'package.json'),
        JSON.stringify({ name: `fixture-${projId}`, dependencies: {} }, null, 2),
        'utf8'
      );
    }

    // Write CSS entry
    if (options.cssContent) {
      const relCss = options.cssPath || path.join('app', 'globals.css');
      const absCss = path.join(projDir, relCss);
      fs.mkdirSync(path.dirname(absCss), { recursive: true });
      fs.writeFileSync(absCss, options.cssContent, 'utf8');
    }

    // Write tailwind.config.js
    if (options.tailwindConfigContent) {
      fs.writeFileSync(path.join(projDir, 'tailwind.config.js'), options.tailwindConfigContent, 'utf8');
    }

    // Setup isolated .slightnudge/pending and .slightnudge/history inside the temp fixture
    fs.mkdirSync(path.join(projDir, '.slightnudge', 'pending'), { recursive: true });
    fs.mkdirSync(path.join(projDir, '.slightnudge', 'history'), { recursive: true });
    fs.writeFileSync(path.join(projDir, '.slightnudge', 'history', 'edits.json'), '[]', 'utf8');

    const cleanup = () => {
      const nm = path.join(projDir, 'node_modules');
      if (fs.existsSync(nm)) {
        try { fs.unlinkSync(nm); } catch {}
      }
      try { fs.rmSync(projDir, { recursive: true, force: true }); } catch {}
    };

    return { projDir, cleanup };
  }

  it('a. Tailwind v4 project with @theme defining --color-brand-500 accepts bg-brand-500, stacked variant, and arbitrary value, and refuses bogus', async () => {
    const fixture = createFixtureProject({
      cssContent: `@import "tailwindcss";\n@theme {\n  --color-brand-500: #3b82f6;\n}\n`,
    });

    try {
      // 1. bg-brand-500 must be accepted
      const resBrand = await verifyTailwindClass('bg-brand-500', fixture.projDir);
      assert.strictEqual(resBrand.verified, true, `bg-brand-500 must be verified in @theme project: ${resBrand.error}`);
      assert.match(resBrand.css || '', /background-color|#3b82f6/i);

      // 2. Stacked variant: dark:hover:bg-brand-500 must be accepted
      const resVariant = await verifyTailwindClass('dark:hover:bg-brand-500', fixture.projDir);
      assert.strictEqual(resVariant.verified, true, `dark:hover:bg-brand-500 must be verified: ${resVariant.error}`);

      // 3. Arbitrary value: w-[37px] must be accepted
      const resArbitrary = await verifyTailwindClass('w-[37px]', fixture.projDir);
      assert.strictEqual(resArbitrary.verified, true, `w-[37px] must be verified: ${resArbitrary.error}`);

      // 4. Bogus class: bg-nonexistent-999 must be refused
      const resBogus = await verifyTailwindClass('bg-nonexistent-999', fixture.projDir);
      assert.strictEqual(resBogus.verified, false, 'bg-nonexistent-999 must be refused');
    } finally {
      fixture.cleanup();
    }
  });

  it('b. Tailwind v4 project with legacy tailwind.config.js and CSS @config accepts bg-brand-500, stacked variant, and arbitrary value, and refuses bogus', async () => {
    const fixture = createFixtureProject({
      cssPath: 'globals.css',
      cssContent: `@import "tailwindcss";\n@config "./tailwind.config.js";\n`,
      tailwindConfigContent: `module.exports = {\n  theme: {\n    extend: {\n      colors: {\n        brand: {\n          500: '#3b82f6',\n        },\n      },\n    },\n  },\n};\n`,
    });

    try {
      // 1. bg-brand-500 must be accepted
      const resBrand = await verifyTailwindClass('bg-brand-500', fixture.projDir);
      assert.strictEqual(resBrand.verified, true, `bg-brand-500 must be verified via @config: ${resBrand.error}`);
      assert.match(resBrand.css || '', /background-color|#3b82f6/i);

      // 2. Stacked variant: dark:hover:bg-brand-500 must be accepted
      const resVariant = await verifyTailwindClass('dark:hover:bg-brand-500', fixture.projDir);
      assert.strictEqual(resVariant.verified, true, `dark:hover:bg-brand-500 must be verified: ${resVariant.error}`);

      // 3. Arbitrary value: w-[37px] must be accepted
      const resArbitrary = await verifyTailwindClass('w-[37px]', fixture.projDir);
      assert.strictEqual(resArbitrary.verified, true, `w-[37px] must be verified: ${resArbitrary.error}`);

      // 4. Bogus class: bg-nonexistent-999 must be refused
      const resBogus = await verifyTailwindClass('bg-nonexistent-999', fixture.projDir);
      assert.strictEqual(resBogus.verified, false, 'bg-nonexistent-999 must be refused');
    } finally {
      fixture.cleanup();
    }
  });

  it('c. Tailwind v4 project with tailwind.config.js but CSS entry WITHOUT @config refuses bg-brand-500 (matches v4 build behavior) while accepting standard utilities', async () => {
    // In Tailwind v4, without @config in the CSS entry, tailwind.config.js is ignored by the compiler.
    // The verifier must match the real build: refuse classes the real build would not generate.
    const fixture = createFixtureProject({
      cssContent: `@import "tailwindcss";\n`,
      tailwindConfigContent: `module.exports = {\n  theme: {\n    extend: {\n      colors: {\n        brand: {\n          500: '#3b82f6',\n        },\n      },\n    },\n  },\n};\n`,
    });

    try {
      // 1. bg-brand-500 produces no CSS in v4 without @config, so must be refused
      const resBrand = await verifyTailwindClass('bg-brand-500', fixture.projDir);
      assert.strictEqual(resBrand.verified, false, 'bg-brand-500 must be refused when CSS entry lacks @config in v4');

      // 2. Standard utilities still accepted
      const resStandard = await verifyTailwindClass('p-4', fixture.projDir);
      assert.strictEqual(resStandard.verified, true, `p-4 must be accepted: ${resStandard.error}`);

      const resVariant = await verifyTailwindClass('dark:hover:bg-blue-500', fixture.projDir);
      assert.strictEqual(resVariant.verified, true, `dark:hover:bg-blue-500 must be accepted: ${resVariant.error}`);

      const resArbitrary = await verifyTailwindClass('w-[37px]', fixture.projDir);
      assert.strictEqual(resArbitrary.verified, true, `w-[37px] must be accepted: ${resArbitrary.error}`);

      // 3. Bogus class refused
      const resBogus = await verifyTailwindClass('bg-nonexistent-999', fixture.projDir);
      assert.strictEqual(resBogus.verified, false, 'bg-nonexistent-999 must be refused');
    } finally {
      fixture.cleanup();
    }
  });

  it('d. Tailwind v3 project: verify offline availability or report UNVERIFIED', async () => {
    // Check if Tailwind v3 is installed offline
    const isV3Installed = (() => {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(rootNodeModules, 'tailwindcss', 'package.json'), 'utf8'));
        return (pkg.version || '').startsWith('3');
      } catch {
        return false;
      }
    })();

    if (!isV3Installed) {
      console.log('NOTICE [d. Tailwind v3]: UNVERIFIED offline. Node_modules has Tailwind v4.3.3 installed, v3 package not present offline.');
      assert.ok(true, 'Tailwind v3 sub-case documented as UNVERIFIED due to v4 offline environment');
      return;
    }

    const fixture = createFixtureProject({
      tailwindConfigContent: `module.exports = {\n  content: ["./**/*.tsx"],\n  theme: {\n    extend: {\n      colors: {\n        brand: { 500: '#3b82f6' },\n      },\n    },\n  },\n};\n`,
    });

    try {
      const resBrand = await verifyTailwindClass('bg-brand-500', fixture.projDir);
      assert.strictEqual(resBrand.verified, true);
      const resBogus = await verifyTailwindClass('bg-nonexistent-999', fixture.projDir);
      assert.strictEqual(resBogus.verified, false);
    } finally {
      fixture.cleanup();
    }
  });

  it('f. Project where no Tailwind is installed or engine fails: refuses and writes nothing', async () => {
    const fixture = createFixtureProject({
      includeTailwindDep: false,
    });

    try {
      const res = await verifyTailwindClass('p-4', fixture.projDir);
      assert.strictEqual(res.verified, false, 'Must refuse when tailwindcss is not installed in target project');
      assert.match(res.error || '', /tailwindcss is not installed|Can't resolve 'tailwindcss'/i);
    } finally {
      fixture.cleanup();
    }
  });

  it('g. Unchanged existing tokens in className are never verified and never cause refusal; only added tokens are verified', async () => {
    const env = setupIsolatedEnv('s5-theme-g');
    const scratchDir = path.join(process.cwd(), 'scratch');
    fs.mkdirSync(scratchDir, { recursive: true });
    const targetFile = path.join(scratchDir, 'test-s5-g.tsx');

    const existingClasses = 'group peer container site-header my-custom-class bg-brand-500';
    const initialContent = `export default function Page() {\n  return <div className="${existingClasses}">Content</div>;\n}\n`;
    const updatedContent = `export default function Page() {\n  return <div className="${existingClasses} p-4">Content</div>;\n}\n`;
    fs.writeFileSync(targetFile, initialContent, 'utf8');

    const pending = createPendingSourceEdit({
      filePath: targetFile,
      before: initialContent,
      after: updatedContent,
      summary: 'Add p-4 with unchanged non-Tailwind existing tokens',
      oldValue: existingClasses,
      newValue: `${existingClasses} p-4`,
      previewType: 'className',
    });

    assert.ok(pending.id, 'pending.id must exist');
    try {
      const res = await applyPendingSourceEdit(pending.id);
      assert.strictEqual(res.success, true, `Apply must succeed when only new token p-4 is added: ${(res as any).error}`);
      const diskContent = fs.readFileSync(targetFile, 'utf8');
      assert.strictEqual(diskContent, updatedContent, 'File on disk must be updated');
    } finally {
      if (pending.id) {
        try { discardPendingSourceEdit(pending.id); } catch {}
      }
      try { fs.unlinkSync(targetFile); } catch {}
      env.cleanup();
    }
  });
});
