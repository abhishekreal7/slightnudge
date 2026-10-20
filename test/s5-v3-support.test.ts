import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import { verifyTailwindClass } from '../lib/slightnudge/tailwind-verifier';
import { createPendingSourceEdit, applyPendingSourceEdit, discardPendingSourceEdit } from '../lib/slightnudge/edit-history';
import { setupIsolatedEnv } from './helpers/test-server';

describe('S5: Tailwind v3 Verification and Project Isolation', () => {
  let projDir: string;
  let targetFile: string;

  function setupV3Project() {
    const id = randomUUID();
    projDir = path.join(os.tmpdir(), `s5-v3-project-${id}`);
    fs.mkdirSync(projDir, { recursive: true });

    fs.writeFileSync(
      path.join(projDir, 'package.json'),
      JSON.stringify(
        {
          name: `v3-test-${id}`,
          dependencies: {
            tailwindcss: '^3.4.17',
            postcss: '^8.4.38',
            autoprefixer: '^10.4.19',
          },
        },
        null,
        2
      ),
      'utf8'
    );

    execSync('npm install --no-audit --no-fund', { cwd: projDir, stdio: 'ignore' });

    // tailwind.config.js with darkMode class, theme brand.500, plugin utility
    const configContent = `const plugin = require('tailwindcss/plugin');

module.exports = {
  darkMode: 'class',
  content: ['./**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#ff5500',
        },
      },
    },
  },
  plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.plugin-glow': {
          'box-shadow': '0 0 10px #ff5500',
        },
      });
    }),
  ],
};
`;
    fs.writeFileSync(path.join(projDir, 'tailwind.config.js'), configContent, 'utf8');

    // globals.css
    fs.mkdirSync(path.join(projDir, 'app'), { recursive: true });
    fs.writeFileSync(
      path.join(projDir, 'app', 'globals.css'),
      '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n',
      'utf8'
    );

    // app/page.tsx
    targetFile = path.join(projDir, 'app', 'page.tsx');
    fs.writeFileSync(
      targetFile,
      'export default function Page() {\n  return <div className="p-2">Content</div>;\n}\n',
      'utf8'
    );
  }

  function teardownV3Project() {
    if (projDir) {
      try {
        fs.rmSync(projDir, { recursive: true, force: true });
      } catch {}
    }
  }

  it('verifies Tailwind v3 project tokens: standard, theme brand.500, stacked variants, arbitrary values, plugins, and refuses bogus', async () => {
    setupV3Project();
    try {
      // 1. p-4 (accepted)
      const resP4 = await verifyTailwindClass('p-4', targetFile);
      assert.strictEqual(resP4.verified, true, `p-4 must be accepted: ${resP4.error}`);

      // 2. bg-brand-500 (accepted via theme.extend.colors)
      const resBrand = await verifyTailwindClass('bg-brand-500', targetFile);
      assert.strictEqual(resBrand.verified, true, `bg-brand-500 must be accepted: ${resBrand.error}`);

      // 3. dark:hover:bg-brand-500 (accepted via darkMode class and stacked variant)
      const resVariant = await verifyTailwindClass('dark:hover:bg-brand-500', targetFile);
      assert.strictEqual(resVariant.verified, true, `dark:hover:bg-brand-500 must be accepted: ${resVariant.error}`);

      // 4. w-[37px] (accepted via arbitrary value)
      const resArbitrary = await verifyTailwindClass('w-[37px]', targetFile);
      assert.strictEqual(resArbitrary.verified, true, `w-[37px] must be accepted: ${resArbitrary.error}`);

      // 5. plugin-glow (accepted via plugin-added utility)
      const resPlugin = await verifyTailwindClass('plugin-glow', targetFile);
      assert.strictEqual(resPlugin.verified, true, `plugin-glow must be accepted: ${resPlugin.error}`);

      // 6. bg-nonexistent-999 (refused)
      const resBogus = await verifyTailwindClass('bg-nonexistent-999', targetFile);
      assert.strictEqual(resBogus.verified, false, 'bg-nonexistent-999 must be refused');
    } finally {
      teardownV3Project();
    }
  });

  it('confirms unchanged existing tokens are never verified in a v3 project during apply', async () => {
    setupV3Project();
    const env = setupIsolatedEnv('v3-apply-test', projDir);
    try {
      const existingClasses = 'custom-legacy-token non-standard-class bg-brand-500';
      const initialContent = `export default function Page() {\n  return <div className="${existingClasses}">Content</div>;\n}\n`;
      const updatedContent = `export default function Page() {\n  return <div className="${existingClasses} p-4">Content</div>;\n}\n`;
      fs.writeFileSync(targetFile, initialContent, 'utf8');

      const pending = createPendingSourceEdit({
        filePath: targetFile,
        before: initialContent,
        after: updatedContent,
        summary: 'Add p-4 in v3 project',
        oldValue: existingClasses,
        newValue: `${existingClasses} p-4`,
        previewType: 'className',
      });

      assert.ok(pending.id, 'preview id must exist');
      const applyRes = await applyPendingSourceEdit(pending.id);
      assert.strictEqual(applyRes.success, true, `Apply must succeed despite non-standard existing classes: ${(applyRes as any).error}`);
      const disk = fs.readFileSync(targetFile, 'utf8');
      assert.strictEqual(disk, updatedContent, 'Target file on disk must be updated');
    } finally {
      env.cleanup();
      teardownV3Project();
    }
  });
});
