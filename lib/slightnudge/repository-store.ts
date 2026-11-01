import { execFile } from 'node:child_process';
import { lstat, mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { assertSourceScope, canonicalFile, registeredProjectRoot } from './source-paths';

const execFileAsync = promisify(execFile);
const storageRoot = path.join(process.cwd(), '.slightnudge');
const workspaceRoot = path.join(storageRoot, 'repositories');
const indexPath = path.join(storageRoot, 'repositories.json');

export interface LocalRepository {
  id: string;
  name: string;
  owner: string;
  url: string;
  defaultBranch: string;
  localPath: string;
  importedAt: string;
}

async function readIndex(): Promise<LocalRepository[]> {
  try {
    const value = JSON.parse(await readFile(canonicalFile(process.cwd(), indexPath), 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export async function listLocalRepositories() {
  return readIndex();
}

function parsePublicGitHubUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error('Enter a valid GitHub repository URL.');
  }

  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password || url.search || url.hash) {
    throw new Error('For now, import a public repository using its https://github.com/owner/repo URL.');
  }

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length !== 2) throw new Error('Use the repository home URL, such as https://github.com/vercel/next.js.');
  const [owner, rawName] = parts;
  const name = rawName.replace(/\.git$/i, '');
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(owner) || !/^[A-Za-z0-9_.-]{1,100}$/.test(name) || owner === '.' || owner === '..' || name === '.' || name === '..') {
    throw new Error('That repository address contains an invalid owner or name.');
  }

  return { owner, name, url: `https://github.com/${owner}/${name}.git` };
}

export async function importPublicRepository(input: string): Promise<LocalRepository> {
  const { owner, name, url } = parsePublicGitHubUrl(input);
  const id = `${owner}-${name}`.toLowerCase();
  const repositories = await readIndex();
  const existing = repositories.find((repository) => repository.id === id);
  if (existing) return existing;

  await mkdir(workspaceRoot, { recursive: true });
  const localPath = path.join(workspaceRoot, id);
  try {
    await execFileAsync('git', ['clone', '--depth', '1', url, localPath], {
      cwd: process.cwd(),
      timeout: 120_000,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
    });
  } catch (error) {
    const detail = (error as Error).message;
    throw new Error(detail.includes('timed out') ? 'The clone took too long. Try again with a smaller repository.' : 'Could not clone that public repository. Check the URL and try again.');
  }

  let defaultBranch = 'main';
  try {
    const { stdout } = await execFileAsync('git', ['branch', '--show-current'], { cwd: localPath, windowsHide: true });
    defaultBranch = stdout.trim() || defaultBranch;
  } catch {
    // The repository remains usable if branch metadata is unavailable.
  }

  const repository: LocalRepository = {
    id,
    name,
    owner,
    url: `https://github.com/${owner}/${name}`,
    defaultBranch,
    localPath,
    importedAt: new Date().toISOString(),
  };
  const nextIndex = [...repositories, repository];
  const tempPath = `${indexPath}.tmp`;
  await writeFile(tempPath, JSON.stringify(nextIndex, null, 2), 'utf8');
  await rename(tempPath, indexPath);
  return repository;
}

export function resolveWorkspaceSourcePath(input: string) {
  const resolved = path.resolve(process.cwd(), input);
  const relative = path.relative(process.cwd(), resolved);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('The selected file must be inside the SlightNudge workspace.');
  }
  if (!/\.(tsx?|jsx?)$/i.test(resolved)) {
    throw new Error('Only JavaScript and TypeScript source files can be edited.');
  }
  return assertSourceScope(process.cwd(), resolved);
}

export async function resolveRepositoryRoot(repositoryId: string) {
  return registeredProjectRoot(process.cwd(), repositoryId);
}

export async function resolveRepositorySourcePath(repositoryId: string, sourcePath: string) {
  if (!/^[a-z0-9_.-]{1,205}$/i.test(repositoryId) || repositoryId === '.' || repositoryId === '..') {
    throw new Error('That repository could not be found.');
  }
  if (typeof sourcePath !== 'string' || sourcePath.length > 1000 || path.isAbsolute(sourcePath)) {
    throw new Error('Choose a source file from this repository.');
  }
  const normalized = sourcePath.replace(/\\/g, '/');
  if (!normalized || normalized.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error('That source path is not valid.');
  }
  if (!/\.(tsx?|jsx?|css|scss|mdx?)$/i.test(normalized) || /(^|\/)(node_modules|\.next|dist)\//.test(normalized)) {
    throw new Error('Only supported application source files can be inspected.');
  }

  const repositoryRoot = await resolveRepositoryRoot(repositoryId);

  const filePath = path.join(repositoryRoot, ...normalized.split('/'));
  const info = await lstat(filePath);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Only regular source files can be inspected.');
  if (info.size > 512 * 1024) throw new Error('This source file is larger than the 512 KB inspection limit.');
  const resolvedFile = await realpath(filePath);
  const fileRelative = path.relative(repositoryRoot, resolvedFile);
  if (!fileRelative || fileRelative.startsWith(`..${path.sep}`) || path.isAbsolute(fileRelative)) {
    throw new Error('The source file is outside this repository.');
  }
  return { filePath: resolvedFile, path: normalized, size: info.size, repositoryRoot };
}

export async function readRepositorySource(repositoryId: string, sourcePath: string) {
  const resolved = await resolveRepositorySourcePath(repositoryId, sourcePath);
  const content = await readFile(resolved.filePath, 'utf8');
  return { content, path: resolved.path, size: resolved.size };
}

export function validateLocalPreviewUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error('Enter a valid local preview URL.');
  }
  const hostname = url.hostname.toLowerCase();
  const port = Number(url.port);
  if (url.protocol !== 'http:' || (hostname !== 'localhost' && hostname !== '127.0.0.1') || url.username || url.password || !url.port || !Number.isInteger(port) || port < 1024 || port > 65535 || url.search || url.hash) {
    throw new Error('Use an HTTP loopback URL such as http://127.0.0.1:3001, with a port from 1024 to 65535.');
  }
  return url;
}
