import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { resolveRepositoryRoot } from './repository-store';

const execFileAsync = promisify(execFile);
const image = 'node:22-bookworm-slim';

function dockerCandidates() {
  const candidates = [
    process.env.DOCKER_CLI,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'DockerDesktop', 'resources', 'bin', 'docker.exe'),
    'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
    'docker',
  ].filter((item): item is string => Boolean(item));
  return [...new Set(candidates)];
}

async function docker(args: string[], timeout = 15_000) {
  let lastError: unknown;
  for (const binary of dockerCandidates()) {
    try {
      return await execFileAsync(binary, args, { timeout, windowsHide: true, maxBuffer: 256 * 1024 });
    } catch (error) {
      lastError = error;
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT' || code === 'EACCES') continue;
      throw error;
    }
  }
  throw lastError || new Error('Docker Desktop CLI was not found.');
}

function getNames(repositoryId: string) {
  const suffix = createHash('sha256').update(repositoryId).digest('hex').slice(0, 12);
  return { container: `slightnudge-preview-${suffix}`, dependencies: `slightnudge-deps-${suffix}`, build: `slightnudge-build-${suffix}` };
}

function asDockerPath(value: string) {
  return path.resolve(value).replace(/\\/g, '/');
}

async function exists(filePath: string) {
  try { return (await lstat(filePath)).isFile(); } catch { return false; }
}

async function getRepoConfig(repositoryId: string) {
  const root = await resolveRepositoryRoot(repositoryId);
  const packagePath = path.join(root, 'package.json');
  const manifest = JSON.parse(await readFile(packagePath, 'utf8')) as {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    packageManager?: string;
  };
  if (!manifest.scripts?.dev) throw new Error('This repository does not define a “dev” script in package.json.');
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
  let manager = manifest.packageManager?.split('@')[0];
  if (!manager) {
    if (await exists(path.join(root, 'pnpm-lock.yaml'))) manager = 'pnpm';
    else if (await exists(path.join(root, 'yarn.lock'))) manager = 'yarn';
    else if (await exists(path.join(root, 'package-lock.json'))) manager = 'npm';
  }
  if (!['npm', 'pnpm', 'yarn'].includes(manager || '')) throw new Error('Add a package lockfile (npm, pnpm, or Yarn) before starting this preview.');
  const lockfile = manager === 'pnpm' ? 'pnpm-lock.yaml' : manager === 'yarn' ? 'yarn.lock' : 'package-lock.json';
  if (!(await exists(path.join(root, lockfile)))) throw new Error(`The package manager declares ${manager}, but ${lockfile} is missing. Add its lockfile before starting this preview.`);

  let install: string;
  if (manager === 'npm') install = await exists(path.join(root, 'package-lock.json')) ? 'npm ci' : 'npm install --package-lock=false';
  else if (manager === 'pnpm') install = 'corepack pnpm install --frozen-lockfile --store-dir=/tmp/pnpm-store';
  else {
    const yarnLock = await readFile(path.join(root, 'yarn.lock'), 'utf8').catch(() => '');
    install = yarnLock.includes('__metadata:') ? 'corepack yarn install --immutable' : 'corepack yarn install --frozen-lockfile';
  }

  const framework = dependencies.next ? 'next' : dependencies.vite ? 'vite' : 'generic';
  if (framework === 'generic') throw new Error('Automatic Docker previews currently support Next.js and Vite projects. Connect another framework with its own local preview command.');
  const start = framework === 'next'
    ? 'npm run dev -- --hostname 0.0.0.0 --port 3000'
    : framework === 'vite'
      ? 'npm run dev -- --host 0.0.0.0 --port 3000'
      : 'HOST=0.0.0.0 HOSTNAME=0.0.0.0 PORT=3000 npm run dev';
  const run = `${install} && ${start}`;
  return { root, run, names: getNames(repositoryId) };
}

async function getContainerState(name: string) {
  try {
    const { stdout } = await docker(['inspect', '--format', '{{.State.Status}}', name]);
    return stdout.trim() || 'unknown';
  } catch {
    return 'missing';
  }
}

async function previewLogs(name: string) {
  try {
    const { stdout, stderr } = await docker(['logs', '--tail', '30', name]);
    return `${stdout}${stderr}`.slice(-6000);
  } catch (error) {
    return error instanceof Error ? error.message.slice(0, 500) : 'Container logs are unavailable.';
  }
}

export async function getDockerPreviewStatus(repositoryId: string) {
  await resolveRepositoryRoot(repositoryId);
  const names = getNames(repositoryId);
  try {
    await docker(['info', '--format', '{{.ServerVersion}}']);
  } catch {
    return { available: false, state: 'docker-unavailable', url: null, logs: '', message: 'Start Docker Desktop and wait for “Engine running”.' };
  }
  const state = await getContainerState(names.container);
  const logs = state === 'running' || state === 'exited' ? await previewLogs(names.container) : '';
  return {
    available: true,
    state,
    url: state === 'running' ? 'http://127.0.0.1:3001' : null,
    logs,
    message: state === 'running' ? 'Preview container is running.' : state === 'exited' ? 'The dev server stopped. Review its logs before trying again.' : 'No preview container is running.',
  };
}

export async function startDockerPreview(repositoryId: string) {
  const { root, run, names } = await getRepoConfig(repositoryId);
  try {
    await docker(['info', '--format', '{{.ServerVersion}}']);
  } catch {
    throw new Error('Docker Desktop is not ready. Start it and wait for “Engine running”.');
  }
  const previousState = await getContainerState(names.container);
  if (previousState === 'running') return { started: true, url: 'http://127.0.0.1:3001', message: 'The preview container is already running.' };
  if (previousState !== 'missing') await docker(['rm', '--force', names.container]);

  const args = [
    'run', '--detach', '--name', names.container,
    '--label', 'slightnudge.managed=true',
    '--publish', '127.0.0.1:3001:3000',
    '--memory', '2g', '--memory-swap', '2g', '--cpus', '2', '--pids-limit', '256',
    '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only',
    '--tmpfs', '/tmp:rw,noexec,nosuid,size=768m', '--tmpfs', '/root/.npm:rw,nosuid,size=512m', '--tmpfs', '/root/.cache:rw,nosuid,size=256m',
    '--mount', `type=bind,source=${asDockerPath(root)},target=/workspace,readonly`,
    '--mount', `type=volume,source=${names.dependencies},target=/workspace/node_modules`,
    '--mount', `type=volume,source=${names.build},target=/workspace/.next`,
    '--workdir', '/workspace', '--env', 'CI=1',
    '--env', 'HOST=0.0.0.0', '--env', 'HOSTNAME=0.0.0.0', '--env', 'PORT=3000', '--env', 'COREPACK_HOME=/tmp/corepack',
    '--restart', 'no', '--pull', 'missing', image,
    'sh', '-lc', run,
  ];
  try {
    await docker(args, 180_000);
    return { started: true, url: 'http://127.0.0.1:3001', message: 'The isolated preview is starting. Dependency installation may take a few minutes on first launch.' };
  } catch (error) {
    const details = (error as { stderr?: string; message?: string }).stderr || (error as Error).message || '';
    const lower = details.toLowerCase();
    if (lower.includes('port is already allocated') || lower.includes('address already in use')) {
      throw new Error('Port 3001 is already in use. Stop the existing preview and try again.');
    }
    if (lower.includes('no such image') || lower.includes('pull access denied') || lower.includes('failed to resolve source metadata')) {
      throw new Error('Docker could not download the Node.js runtime image. Check the network connection and try again.');
    }
    if (lower.includes('cannot connect') || lower.includes('pipe/docker_engine')) {
      throw new Error('Docker Desktop is not ready. Start it and wait for “Engine running”.');
    }
    throw new Error(`Could not start the isolated preview: ${details.slice(0, 600)}`);
  }
}

export async function stopDockerPreview(repositoryId: string) {
  await resolveRepositoryRoot(repositoryId);
  const names = getNames(repositoryId);
  const state = await getContainerState(names.container);
  if (state !== 'missing') await docker(['rm', '--force', '--volumes', names.container]);
  for (const volume of [names.dependencies, names.build]) {
    await docker(['volume', 'rm', volume]).catch(() => undefined);
  }
  return { stopped: true, message: 'The preview container and its temporary dependency/build volumes were removed.' };
}
