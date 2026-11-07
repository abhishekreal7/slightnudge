import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface RealStateSnapshot {
  files: Record<string, { sha256: string; size: number; mtimeMs: number } | 'absent'>;
  status: string[];
}

function allowedGeneratedImports(root: string): boolean {
  try {
    const head = execFileSync('git', ['show', 'HEAD:next-env.d.ts'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const current = fs.readFileSync(path.join(root, 'next-env.d.ts'), 'utf8');
    const before = head.replace(/\r\n/g, '\n').split('\n');
    const after = current.replace(/\r\n/g, '\n').split('\n');
    const generatedImport = /^([ \t]*import[ \t]+["']\.\/\.next\/)(?:dev\/)?(types\/[^"']+["'];?[ \t]*)$/;
    return before.length === after.length && before.every((line, index) => {
      if (line === after[index]) return true;
      const oldImport = generatedImport.exec(line);
      const newImport = generatedImport.exec(after[index]);
      return Boolean(oldImport && newImport && oldImport[1] === newImport[1] && oldImport[2] === newImport[2]);
    });
  } catch {
    return false;
  }
}

/** Captures protected data without depending on any historical history-file hash. */
export function snapshot(root = process.cwd()): RealStateSnapshot {
  const files: RealStateSnapshot['files'] = {};
  const fixtures = path.join(root, 'fixtures');
  const paths = ['.slightnudge/history/edits.json'];
  if (fs.existsSync(fixtures)) {
    const entries = fs.readdirSync(fixtures, { recursive: true, withFileTypes: true });
    paths.push(...entries.filter((entry) => !entry.isDirectory()).map((entry) =>
      path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join('/')
    ));
  }
  for (const relative of paths.sort()) {
    const absolute = path.join(root, relative);
    try {
      const stats = fs.lstatSync(absolute);
      // Hash the link itself so a fixture link cannot cause reads outside the workspace.
      const bytes = stats.isSymbolicLink() ? fs.readlinkSync(absolute) : fs.readFileSync(absolute);
      files[relative] = { sha256: createHash('sha256').update(bytes).digest('hex'), size: stats.size, mtimeMs: stats.mtimeMs };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      files[relative] = 'absent';
    }
  }
  const status = fs.existsSync(path.join(root, '.git'))
    ? execFileSync('git', ['status', '--porcelain=v1'], { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
    : [];
  const permitted = status.some((line) => line.slice(3) === 'next-env.d.ts') && allowedGeneratedImports(root);
  return { files, status: status.filter((line) => !(permitted && line.slice(3) === 'next-env.d.ts')) };
}

export function assertUnchanged(before: RealStateSnapshot, after: RealStateSnapshot): void {
  const paths = [...new Set([...Object.keys(before.files), ...Object.keys(after.files)])].sort();
  for (const file of paths) {
    assert.deepEqual(after.files[file], before.files[file], `Protected file changed: ${file}`);
  }
  assert.deepEqual(after.status, before.status, 'Git status changed during the test group');
}
