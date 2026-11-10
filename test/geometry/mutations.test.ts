import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

interface SeededMutant {
  readonly id: string;
  readonly description: string;
  readonly targetFile: string;
  readonly targetTestFile: string;
  readonly expectedKillingTestPattern: RegExp;
  readonly mutate: (source: string) => string;
}

const MUTANTS: readonly SeededMutant[] = [
  {
    id: 'M1-sign-flip-resize',
    description: 'Sign flip on east handle delta in solveResize',
    targetFile: 'lib/editor/geometry/resize.ts',
    targetTestFile: 'test/geometry/resize.test.ts',
    expectedKillingTestPattern: /8 handles|under the cursor|reverse resize/i,
    mutate: (src) => {
      const pattern = /right = startRight \+ deltaX;/;
      if (!pattern.test(src)) throw new Error('Mutant anchor M1 not found');
      return src.replace(pattern, 'right = startRight - deltaX; /* MUTANT M1 */');
    },
  },
  {
    id: 'M2-ignore-scroll-offset',
    description: 'Ignore parent scrollLeft/scrollTop in buildElementToScreenMatrix',
    targetFile: 'lib/editor/geometry/spaces.ts',
    targetTestFile: 'test/geometry/matrix-spaces.test.ts',
    expectedKillingTestPattern: /scroll offsets|nested/i,
    mutate: (src) => {
      const pattern = /const scrollX = frame\.scrollLeft \?\? 0;/;
      if (!pattern.test(src)) throw new Error('Mutant anchor M2 not found');
      return src.replace(pattern, 'const scrollX = 0; /* MUTANT M2 */');
    },
  },
  {
    id: 'M3-wrong-matrix-order',
    description: 'Reverse multiplication order in matMultiply',
    targetFile: 'lib/editor/geometry/matrix.ts',
    targetTestFile: 'test/geometry/matrix-spaces.test.ts',
    expectedKillingTestPattern: /respects matrix order|transform composition/i,
    mutate: (src) => {
      const pattern = /return matMultiplyRaw\(m1, m2\);/;
      if (!pattern.test(src)) throw new Error('Mutant anchor M3 not found');
      return src.replace(pattern, 'return matMultiplyRaw(m2, m1); /* MUTANT M3 */');
    },
  },
  {
    id: 'M4-threshold-canvas-instead-of-screen',
    description: 'Treat snapping threshold in canvas pixels instead of dividing by zoom',
    targetFile: 'lib/editor/geometry/snapping.ts',
    targetTestFile: 'test/geometry/snapping-align.test.ts',
    expectedKillingTestPattern: /screen-pixel threshold scaled by zoom/i,
    mutate: (src) => {
      const pattern = /const threshold = safeThresholdScreenPx \/ safeZoom;/;
      if (!pattern.test(src)) throw new Error('Mutant anchor M4 not found');
      return src.replace(pattern, 'const threshold = safeThresholdScreenPx; /* MUTANT M4 */');
    },
  },
  {
    id: 'M5-drop-aspect-lock',
    description: 'Drop aspect ratio enforcement in solveResize',
    targetFile: 'lib/editor/geometry/resize.ts',
    targetTestFile: 'test/geometry/resize.test.ts',
    expectedKillingTestPattern: /preserves aspect ratio/i,
    mutate: (src) => {
      const pattern = /const targetRatio = resolveAspectRatio\(start, constraints\?\.aspectRatio\);/;
      if (!pattern.test(src)) throw new Error('Mutant anchor M5 not found');
      return src.replace(pattern, 'const targetRatio: number | null = null; /* MUTANT M5 */');
    },
  },
  {
    id: 'M6-off-by-one-spatial-index',
    description: 'Off-by-one upper bound in sorted spatial binary search omitting last line',
    targetFile: 'lib/editor/geometry/snapping.ts',
    targetTestFile: 'test/geometry/snapping-align.test.ts',
    expectedKillingTestPattern: /snaps edges and centers|property: snapping/i,
    mutate: (src) => {
      const pattern = /let hi = count;/;
      if (!pattern.test(src)) throw new Error('Mutant anchor M6 not found');
      return src.replace(pattern, 'let hi = Math.max(0, count - 1); /* MUTANT M6 */');
    },
  },
  {
    id: 'M7-ignore-rtl-classifier',
    description: 'Ignore direction === rtl in layout intent classifier',
    targetFile: 'lib/editor/geometry/intent.ts',
    targetTestFile: 'test/geometry/intent.test.ts',
    expectedKillingTestPattern: /RTL/i,
    mutate: (src) => {
      const pattern = /const isRtl = parent\.direction === 'rtl';/;
      if (!pattern.test(src)) throw new Error('Mutant anchor M7 not found');
      return src.replace(pattern, 'const isRtl = false; /* MUTANT M7 */');
    },
  },
  {
    id: 'M8-treat-sticky-as-flow',
    description: 'Treat position: sticky as normal flow reorder instead of sticky pinning/ambiguous',
    targetFile: 'lib/editor/geometry/intent.ts',
    targetTestFile: 'test/geometry/intent.test.ts',
    expectedKillingTestPattern: /sticky/i,
    mutate: (src) => {
      const pattern = /if \(child\.position === 'sticky'\) \{/;
      if (!pattern.test(src)) throw new Error('Mutant anchor M8 not found');
      return src.replace(pattern, 'if (false && child.position === \'sticky\') { /* MUTANT M8 */');
    },
  },
];

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const sPath = path.join(src, entry.name);
    const dPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(sPath, dPath);
    } else {
      fs.copyFileSync(sPath, dPath);
    }
  }
}

describe('mutation checks: all 8 seeded mutants must be killed by named failing tests', () => {
  it('kills every seeded mutant in an isolated scratch sandbox', () => {
    const repoRoot = process.cwd();
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-geom-mut-'));
    const killedReport: Array<{ id: string; testFile: string; killedBy: string }> = [];

    try {
      copyDirRecursive(path.join(repoRoot, 'lib', 'editor', 'geometry'), path.join(sandbox, 'lib', 'editor', 'geometry'));
      copyDirRecursive(path.join(repoRoot, 'test', 'geometry'), path.join(sandbox, 'test', 'geometry'));
      fs.copyFileSync(path.join(repoRoot, 'package.json'), path.join(sandbox, 'package.json'));
      fs.symlinkSync(path.join(repoRoot, 'node_modules'), path.join(sandbox, 'node_modules'), 'junction');

      for (const mutant of MUTANTS) {
        const absTarget = path.join(sandbox, mutant.targetFile);
        const original = fs.readFileSync(absTarget, 'utf8');
        const mutated = mutant.mutate(original);
        assert.notEqual(mutated, original, `Mutant ${mutant.id} produced no change`);

        fs.writeFileSync(absTarget, mutated, 'utf8');
        try {
          const childEnv: NodeJS.ProcessEnv = { ...process.env };
          delete childEnv.NODE_TEST_CONTEXT;
          const run = spawnSync(
            process.execPath,
            ['--import', 'tsx', '--test', mutant.targetTestFile],
            { cwd: sandbox, env: childEnv, encoding: 'utf8', timeout: 30000 }
          );
          assert.notEqual(
            run.status,
            0,
            `Mutant ${mutant.id} (${mutant.description}) SURVIVED! Output:\n${run.stdout}\n${run.stderr}`
          );
          const combinedOutput = `${run.stdout}\n${run.stderr}`;
          const failedLines = combinedOutput
            .split(/\r?\n/)
            .filter((line) => line.includes('✖') || mutant.expectedKillingTestPattern.test(line));
          assert.ok(
            mutant.expectedKillingTestPattern.test(combinedOutput),
            `Mutant ${mutant.id} failed unexpectedly without hitting expected test pattern ${mutant.expectedKillingTestPattern}. Output:\n${combinedOutput}`
          );
          killedReport.push({
            id: mutant.id,
            testFile: mutant.targetTestFile,
            killedBy: failedLines.slice(0, 3).join(' | ').trim() || mutant.expectedKillingTestPattern.source,
          });
        } finally {
          fs.writeFileSync(absTarget, original, 'utf8');
        }
      }

      console.log('MUTATION SCORE: 8/8 killed');
      for (const item of killedReport) {
        console.log(`  KILLED ${item.id} via ${item.testFile} -> ${item.killedBy}`);
      }
      assert.equal(killedReport.length, 8);
    } finally {
      const nmLink = path.join(sandbox, 'node_modules');
      if (fs.existsSync(nmLink)) fs.unlinkSync(nmLink);
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
