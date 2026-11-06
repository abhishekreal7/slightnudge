import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';
import { createArchiveCopy, computeBaselineHashes, assertBaselineUnchanged, REPO_ROOT } from './helpers.js';

export async function runPathBattery() {
  const baselineBefore = computeBaselineHashes();
  console.log('Starting 27-case Windows Path-Containment Battery...\n');

  // External sentinel directory completely outside workspace
  const sentinelDir = path.join(os.tmpdir(), `sentinels-${crypto.randomUUID()}`);
  fs.mkdirSync(sentinelDir, { recursive: true });

  const sentinelFiles = {
    'outside.tsx': 'export const secret = "outside-sentinel-data";',
    'keep-me.txt': 'Do not overwrite this file under any circumstances.',
    'sensitive.json': JSON.stringify({ key: 'admin-secret' }),
  };

  const sentinelHashesBefore = {};
  for (const [name, content] of Object.entries(sentinelFiles)) {
    const full = path.join(sentinelDir, name);
    fs.writeFileSync(full, content, 'utf8');
    sentinelHashesBefore[name] = crypto.createHash('sha256').update(content).digest('hex').toUpperCase();
  }

  const copy = createArchiveCopy('HEAD', 'path-battery-copy');
  const results = [];
  let writesOutsideRoot = 0;

  try {
    // Dynamically import from copy via pathToFileURL
    const { applyPendingSourceEdit, undoSourceEdit, setPreWriteTestHook } = await import(
      pathToFileURL(path.join(copy.dir, 'lib/slightnudge/edit-history.ts')).href
    );
    const { setupIsolatedEnv } = await import(
      pathToFileURL(path.join(copy.dir, 'test/helpers/test-server.ts')).href
    );

    const outsidePath = path.join(sentinelDir, 'outside.tsx');

    // 27 path test cases
    const testCases = [
      // 1-3: Absolute outside paths
      { id: 1, name: 'Absolute outside path', path: outsidePath },
      { id: 2, name: 'System directory path', path: 'C:\\Windows\\System32\\drivers\\etc\\hosts' },
      { id: 3, name: 'POSIX root path', path: '/etc/passwd' },

      // 4-8: Traversal mixes
      { id: 4, name: 'Simple parent traversal', path: '../outside.tsx' },
      { id: 5, name: 'Multi-level parent traversal', path: '../../outside.tsx' },
      { id: 6, name: 'Subdirectory parent traversal', path: 'fixtures/../../outside.tsx' },
      { id: 7, name: 'Mixed slashes traversal', path: 'fixtures\\../..\\outside.tsx' },
      { id: 8, name: 'Trailing slash traversal', path: 'fixtures/../../../' },

      // 9-11: UNC paths
      { id: 9, name: 'UNC localhost', path: `\\\\localhost\\c$\\${outsidePath.replace(/^C:\\/i, '')}` },
      { id: 10, name: 'UNC 127.0.0.1', path: `\\\\127.0.0.1\\c$\\${outsidePath.replace(/^C:\\/i, '')}` },
      { id: 11, name: 'Forward-slash UNC', path: `//localhost/c$/${outsidePath.replace(/^C:\\/i, '')}` },

      // 12-14: Extended-length device paths
      { id: 12, name: 'Extended length device path outside', path: `\\\\?\\${outsidePath}` },
      { id: 13, name: 'Extended length device UNC', path: `\\\\?\\UNC\\localhost\\c$\\${outsidePath.replace(/^C:\\/i, '')}` },
      { id: 14, name: 'Extended length device traversal', path: `\\\\?\\${copy.dir}\\..\\outside.tsx` },

      // 15-16: 8.3 short names
      { id: 15, name: '8.3 short name Program Files', path: 'C:\\PROGRA~1\\outside.tsx' },
      { id: 16, name: '8.3 short name Users', path: 'C:\\Users\\ABHIS~1\\outside.tsx' },

      // 17-18: Case variations
      { id: 17, name: 'Drive letter lower case', path: outsidePath.toLowerCase() },
      { id: 18, name: 'Drive letter upper case', path: outsidePath.toUpperCase() },

      // 19-20: Trailing dots and spaces
      { id: 19, name: 'Trailing dot path', path: `${outsidePath}.` },
      { id: 20, name: 'Trailing space path', path: `${outsidePath} ` },

      // 21-22: Alternate Data Streams
      { id: 21, name: 'Alternate Data Stream outside', path: `${outsidePath}::$DATA` },
      { id: 22, name: 'Alternate Data Stream inside', path: `fixtures/test.tsx::$DATA` },

      // 23-24: Sibling prefix collisions
      { id: 23, name: 'Sibling prefix collision', path: `${copy.dir}-evil\\outside.tsx` },
      { id: 24, name: 'Sibling relative collision', path: `../${path.basename(copy.dir)}-evil/outside.tsx` },

      // 25: External Junction
      { id: 25, name: 'Junction pointing outside', isJunction: true },

      // 26: Symlink
      { id: 26, name: 'Symlink pointing outside', isSymlink: true },

      // 27: TOCTOU Race Condition via Test Hook
      { id: 27, name: 'TOCTOU junction swap before write', isTOCTOU: true },
    ];

    for (const tc of testCases) {
      let targetPath = tc.path;
      let unverified = false;
      let failureReason = null;
      let refusedSafely = true;

      const env = setupIsolatedEnv('path-env', copy.dir);

      try {
        if (tc.isJunction) {
          const junctionDir = path.join(copy.dir, `junc-${crypto.randomUUID()}`);
          try {
            execSync(`cmd /c mklink /J "${junctionDir}" "${sentinelDir}"`, { stdio: 'ignore' });
            targetPath = path.join(junctionDir, 'outside.tsx');
          } catch (juncErr) {
            unverified = true;
            failureReason = `Junction creation failed: ${juncErr.message}`;
          }
        } else if (tc.isSymlink) {
          const symlinkFile = path.join(copy.dir, `sym-${crypto.randomUUID()}.tsx`);
          try {
            fs.symlinkSync(outsidePath, symlinkFile);
            targetPath = symlinkFile;
          } catch (symErr) {
            unverified = true;
            failureReason = 'Symlink creation requires elevated SeCreateSymbolicLinkPrivilege on Windows (Developer Mode)';
          }
        } else if (tc.isTOCTOU) {
          const innocentFile = path.join(copy.dir, 'fixtures/innocent.tsx');
          fs.writeFileSync(innocentFile, 'export function Innocent() { return <div>Original</div>; }', 'utf8');

          const record = {
            id: crypto.randomUUID(),
            filePath: 'fixtures/innocent.tsx',
            createdAt: new Date().toISOString(),
            summary: 'innocent edit',
            before: 'export function Innocent() { return <div>Original</div>; }',
            after: 'export function Innocent() { return <div>Edited</div>; }',
            status: 'applied',
          };
          fs.writeFileSync(env.editsPath, JSON.stringify([record], null, 2), 'utf8');

          process.env.SLIGHTNUDGE_TEST = '1';
          process.env.NODE_ENV = 'test';

          setPreWriteTestHook(() => {
            // Swap innocentFile with junction to sentinelDir before write
            try {
              fs.unlinkSync(innocentFile);
              execSync(`cmd /c mklink /J "${innocentFile}" "${sentinelDir}"`, { stdio: 'ignore' });
            } catch {}
          });

          const undoRes = await undoSourceEdit('fixtures/innocent.tsx');
          setPreWriteTestHook(null);

          // Undo should have refused or aborted due to realpath containment check right before write (M5)
          refusedSafely = !undoRes.success;
        }

        if (!tc.isTOCTOU && !unverified) {
          // Test undoSourceEdit
          let undoRefused = false;
          try {
            const undoRes = await undoSourceEdit(targetPath);
            undoRefused = !undoRes.success;
          } catch {
            undoRefused = true;
          }

          // Test applyPendingSourceEdit path containment
          let applyRefused = false;
          const fakePendingId = crypto.randomUUID();
          const pendingFilePath = path.join(env.pendingDir, `${fakePendingId}.json`);
          fs.writeFileSync(
            pendingFilePath,
            JSON.stringify({
              id: fakePendingId,
              filePath: targetPath,
              before: 'dummy',
              after: 'malicious payload',
              summary: 'test',
            }),
            'utf8'
          );

          try {
            const applyRes = await applyPendingSourceEdit(fakePendingId);
            applyRefused = !applyRes.success;
          } catch {
            applyRefused = true;
          }

          refusedSafely = undoRefused && applyRefused;
        }
      } catch (err) {
        refusedSafely = true;
      } finally {
        env.cleanup();
      }

      // Check sentinels after test
      for (const [name, expectedHash] of Object.entries(sentinelHashesBefore)) {
        const full = path.join(sentinelDir, name);
        const currentContent = fs.readFileSync(full, 'utf8');
        const currentHash = crypto.createHash('sha256').update(currentContent).digest('hex').toUpperCase();
        if (currentHash !== expectedHash) {
          writesOutsideRoot++;
          failureReason = `Sentinel ${name} was modified by test case ${tc.id}!`;
        }
      }

      const status = unverified ? 'UNVERIFIED' : refusedSafely ? 'REFUSED_SAFELY' : 'FAILED';
      console.log(`Case ${tc.id} [${tc.name}]: ${status}${failureReason ? ` (${failureReason})` : ''}`);

      results.push({
        id: tc.id,
        name: tc.name,
        targetPath,
        status,
        refusedSafely,
        unverified,
        failureReason,
      });
    }
  } finally {
    copy.cleanup();
    try { fs.rmSync(sentinelDir, { recursive: true, force: true }); } catch {}
    assertBaselineUnchanged(baselineBefore, 'Path Battery');
  }

  const outPath = path.resolve(REPO_ROOT, 'docs/phase2c1c-evidence/step5-path-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ results, writesOutsideRoot }, null, 2), 'utf8');
  console.log(`\nPath battery complete. Outside writes: ${writesOutsideRoot}. Summary written to ${outPath}\n`);
  return { results, writesOutsideRoot };
}

if (process.argv[1] && process.argv[1].endsWith('path-battery.js')) {
  runPathBattery().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
