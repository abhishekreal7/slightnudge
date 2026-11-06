import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import crypto from 'node:crypto';
import { execSync, spawn } from 'node:child_process';

export const REPO_ROOT = 'C:\\dev\\vibecheck';

export function computeBaselineHashes() {
  const files = [
    '.slightnudge/history/edits.json',
    'fixtures/1-plain-static.tsx',
    'fixtures/2-several-utilities.tsx',
    'fixtures/3-conditional-classes.tsx',
    'fixtures/4-shared-component.tsx',
    'fixtures/5-responsive-classes.tsx',
  ];
  const hashes = {};
  for (const f of files) {
    const full = path.resolve(REPO_ROOT, f);
    if (fs.existsSync(full)) {
      hashes[f] = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex').toUpperCase();
    } else {
      hashes[f] = 'MISSING';
    }
  }
  return hashes;
}

export function assertBaselineUnchanged(before, stage = '') {
  const after = computeBaselineHashes();
  for (const [k, v] of Object.entries(before)) {
    if (after[k] !== v) {
      throw new Error(`[P0 CRITICAL] Baseline hash changed for ${k} during ${stage}: ${v} -> ${after[k]}`);
    }
  }
}

export async function findFreePort(startPort = 3400) {
  for (let port = startPort; port < startPort + 500; port++) {
    if (port >= 3000 && port <= 3002) continue;
    const isFree = await new Promise((resolve) => {
      const server = net.createServer();
      server.unref();
      server.on('error', () => resolve(false));
      server.listen(port, '127.0.0.1', () => {
        server.close(() => resolve(true));
      });
    });
    if (isFree) return port;
  }
  throw new Error('No available port found');
}

export function createArchiveCopy(ref = 'HEAD', prefix = 'p2c1c-copy') {
  const tmpBase = path.join(os.tmpdir(), `${prefix}-${crypto.randomUUID()}`);
  fs.mkdirSync(tmpBase, { recursive: true });
  const tarPath = path.join(tmpBase, 'src.tar');

  execSync(`git archive -o "${tarPath}" ${ref}`, { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  execSync(`tar -xf "${tarPath}"`, { cwd: tmpBase, stdio: ['ignore', 'pipe', 'pipe'] });
  try { fs.unlinkSync(tarPath); } catch {}

  // Initialize git repo in copy so git diff and git commands work seamlessly
  execSync('git init && git config user.name "review" && git config user.email "review@vibecheck" && git add . && git commit -m "clean tip" --quiet', { cwd: tmpBase, stdio: ['ignore', 'pipe', 'pipe'] });

  const realNodeModules = path.join(REPO_ROOT, 'node_modules');
  const targetNodeModules = path.join(tmpBase, 'node_modules');
  execSync(`cmd /c mklink /J "${targetNodeModules}" "${realNodeModules}"`, { stdio: ['ignore', 'pipe', 'pipe'] });

  const cleanup = () => {
    try {
      if (fs.existsSync(targetNodeModules)) {
        execSync(`cmd /c rmdir "${targetNodeModules}"`, { stdio: ['ignore', 'pipe', 'pipe'] });
      }
    } catch {}
    try {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    } catch {}
  };

  return { dir: tmpBase, cleanup };
}
