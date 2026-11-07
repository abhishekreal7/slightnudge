import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawn, execSync, ChildProcess } from 'node:child_process';

/**
 * Finds an available TCP port on 127.0.0.1, starting from startPort (default 3110)
 * and strictly avoiding ports 3000, 3001, 3002.
 */
export async function findFreePort(startPort = 3110): Promise<number> {
  for (let port = startPort; port < startPort + 500; port++) {
    if (port >= 3000 && port <= 3002) continue;
    const isFree = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.unref();
      server.on('error', () => resolve(false));
      server.listen(port, '127.0.0.1', () => {
        server.close(() => resolve(true));
      });
    });
    if (isFree) return port;
  }
  throw new Error('Could not find an available TCP port');
}

export interface IsolatedEnv {
  wsDir: string;
  dataDir: string;
  editsPath: string;
  pendingDir: string;
  cleanup: () => void;
}

/**
 * For library-level tests that run without a Next.js server.
 * Creates an isolated temp data directory and points SLIGHTNUDGE environment
 * variables at it, leaving the real project's .slightnudge/ untouched.
 */
export function setupIsolatedEnv(prefix = 'sn-test', workspaceRoot?: string): IsolatedEnv {
  const id = randomUUID();
  const baseDir = path.join(os.tmpdir(), `${prefix}-${id}`);
  const dataDir = path.join(baseDir, '.slightnudge');
  const historyDir = path.join(dataDir, 'history');
  const pendingDir = path.join(dataDir, 'pending');
  const editsPath = path.join(historyDir, 'edits.json');

  fs.mkdirSync(historyDir, { recursive: true });
  fs.mkdirSync(pendingDir, { recursive: true });
  fs.writeFileSync(editsPath, '[]', 'utf8');

  const prevEnv = {
    SLIGHTNUDGE_TEST: process.env.SLIGHTNUDGE_TEST,
    SLIGHTNUDGE_WORKSPACE_ROOT: process.env.SLIGHTNUDGE_WORKSPACE_ROOT,
    SLIGHTNUDGE_DATA_DIR: process.env.SLIGHTNUDGE_DATA_DIR,
    SLIGHTNUDGE_HISTORY_PATH: process.env.SLIGHTNUDGE_HISTORY_PATH,
    SLIGHTNUDGE_PENDING_DIR: process.env.SLIGHTNUDGE_PENDING_DIR,
  };

  const effectiveWorkspace = workspaceRoot || process.cwd();
  process.env.SLIGHTNUDGE_TEST = '1';
  process.env.SLIGHTNUDGE_WORKSPACE_ROOT = effectiveWorkspace;
  process.env.SLIGHTNUDGE_DATA_DIR = dataDir;
  process.env.SLIGHTNUDGE_HISTORY_PATH = editsPath;
  process.env.SLIGHTNUDGE_PENDING_DIR = pendingDir;

  const cleanup = () => {
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v !== undefined) process.env[k] = v;
      else delete process.env[k];
    }
    try {
      fs.rmSync(baseDir, { recursive: true, force: true });
    } catch {}
  };

  return {
    wsDir: process.cwd(),
    dataDir,
    editsPath,
    pendingDir,
    cleanup,
  };
}

export interface TempWorkspace {
  wsDir: string;
  dataDir: string;
  editsPath: string;
  pendingDir: string;
  cleanup: () => Promise<void>;
}

export interface TempWorkspaceOptions {
  useFixture1Baseline?: boolean;
}

/**
 * Creates a temporary workspace copy outside the project root,
 * junctions node_modules from the project root, and initializes
 * an isolated .slightnudge directory.
 */
export function createTempWorkspace(prefix = 'sn-ws', options?: TempWorkspaceOptions): TempWorkspace {
  const id = randomUUID();
  const wsDir = path.join(os.tmpdir(), `${prefix}-${id}`);
  fs.mkdirSync(wsDir, { recursive: true });

  const projectRoot = process.cwd();

  // Copy tracked files
  const trackedFiles = execSync('git ls-files', { cwd: projectRoot, encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) => !file.split(/[\\/]/).some((segment) => segment.startsWith('.env')));

  for (const file of trackedFiles) {
    const src = path.join(projectRoot, file);
    const dest = path.join(wsDir, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }

  // If baseline requested, overwrite fixtures/1-plain-static.tsx in the temp copy
  if (options?.useFixture1Baseline) {
    const baselinePath = path.join(projectRoot, 'test', 'baselines', '1-plain-static.tsx');
    if (fs.existsSync(baselinePath)) {
      const destBaseline = path.join(wsDir, 'fixtures', '1-plain-static.tsx');
      fs.mkdirSync(path.dirname(destBaseline), { recursive: true });
      fs.copyFileSync(baselinePath, destBaseline);
    }
  }

  // Junction node_modules
  const srcModules = path.join(projectRoot, 'node_modules');
  const destModules = path.join(wsDir, 'node_modules');
  if (fs.existsSync(srcModules)) {
    fs.symlinkSync(srcModules, destModules, 'junction');
  }

  // Isolated data dir
  const dataDir = path.join(wsDir, '.slightnudge');
  const historyDir = path.join(dataDir, 'history');
  const pendingDir = path.join(dataDir, 'pending');
  const editsPath = path.join(historyDir, 'edits.json');

  fs.mkdirSync(historyDir, { recursive: true });
  fs.mkdirSync(pendingDir, { recursive: true });
  fs.writeFileSync(editsPath, '[]', 'utf8');

  const cleanup = async () => {
    try {
      if (fs.existsSync(destModules)) fs.unlinkSync(destModules);
    } catch {}
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        fs.rmSync(wsDir, { recursive: true, force: true });
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  };

  return { wsDir, dataDir, editsPath, pendingDir, cleanup };
}

export interface TestServer {
  port: number;
  baseUrl: string;
  token: string;
  wsDir: string;
  dataDir: string;
  stop: () => Promise<void>;
}

/**
 * Starts a Next.js dev server on an isolated free port with its own workspace copy.
 * Exposes baseUrl, token, and a stop() teardown function.
 */
export async function startTestServer(options?: { port?: number; useFixture1Baseline?: boolean }): Promise<TestServer> {
  const port = options?.port || (await findFreePort());
  const baseUrl = `http://127.0.0.1:${port}`;
  const workspace = createTempWorkspace('sn-srv', { useFixture1Baseline: options?.useFixture1Baseline });

  const env = {
    ...process.env,
    PORT: String(port),
    SLIGHTNUDGE_TEST: '1',
    SLIGHTNUDGE_WORKSPACE_ROOT: workspace.wsDir,
    SLIGHTNUDGE_DATA_DIR: workspace.dataDir,
    SLIGHTNUDGE_HISTORY_PATH: workspace.editsPath,
    SLIGHTNUDGE_PENDING_DIR: workspace.pendingDir,
  };

  const serverProc: ChildProcess = spawn(
    'npx.cmd',
    ['next', 'dev', '--webpack', '-H', '127.0.0.1', '-p', String(port)],
    {
      cwd: workspace.wsDir,
      env,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    try {
      if (serverProc.pid) {
        execSync(`taskkill /pid ${serverProc.pid} /T /F`, { stdio: 'ignore' });
      }
    } catch {}
    try {
      serverProc.kill('SIGTERM');
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
    await workspace.cleanup();
  };

  // Wait for server to become responsive
  const start = Date.now();
  const timeoutMs = 60000;
  let ready = false;

  while (Date.now() - start < timeoutMs) {
    if (serverProc.exitCode !== null) {
      await stop();
      throw new Error(`Test server exited prematurely with code ${serverProc.exitCode}`);
    }
    try {
      const res = await new Promise<{ status: number }>((resolve, reject) => {
        const req = http.request(
          {
            host: '127.0.0.1',
            port,
            path: '/api/slightnudge/token',
            method: 'GET',
            headers: {
              Host: `127.0.0.1:${port}`,
              Origin: baseUrl,
            },
            timeout: 2000,
          },
          (r) => resolve({ status: r.statusCode || 0 })
        );
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('timeout'));
        });
        req.end();
      });
      if (res.status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!ready) {
    await stop();
    throw new Error(`Test server at ${baseUrl} failed to start within ${timeoutMs}ms`);
  }

  // Fetch token
  const tokenRes = await new Promise<{ token: string }>((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: '/api/slightnudge/token',
        method: 'GET',
        headers: {
          Host: `127.0.0.1:${port}`,
          Origin: baseUrl,
        },
      },
      (r) => {
        let body = '';
        r.on('data', (c) => (body += c));
        r.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });

  return {
    port,
    baseUrl,
    token: tokenRes.token,
    wsDir: workspace.wsDir,
    dataDir: workspace.dataDir,
    stop,
  };
}

export interface LabServer {
  baseUrl: string;
  repoDir: string;
  port: number;
  stop: () => Promise<void>;
}

export interface LabServerOptions {
  labName: 'm0-control-lab' | 'm0-overfit-lab';
  port?: number;
}

export interface TempLabWorkspace {
  labDir: string;
  cleanup: () => Promise<void>;
}

function copyDirRecursive(src: string, dest: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (
      entry.name === '.git' ||
      entry.name === '.next' ||
      entry.name === 'node_modules' ||
      entry.name === 'tsconfig.tsbuildinfo' ||
      entry.name.startsWith('.env')
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      continue;
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Creates a temporary workspace copy for an m0/overfit lab,
 * junctions node_modules from the project root, and provides cleanup.
 */
export function createTempLabWorkspace(labName: 'm0-control-lab' | 'm0-overfit-lab'): TempLabWorkspace {
  const projectRoot = process.cwd();
  const id = randomUUID();
  const labDir = path.join(os.tmpdir(), `sn-lab-${labName}-${id}`);
  fs.mkdirSync(labDir, { recursive: true });

  let srcLab = path.join(projectRoot, 'test', 'labs', labName);
  if (!fs.existsSync(srcLab)) {
    srcLab = path.join(projectRoot, '.slightnudge', 'repositories', labName);
  }

  copyDirRecursive(srcLab, labDir);

  const srcModules = path.join(projectRoot, 'node_modules');
  const destModules = path.join(labDir, 'node_modules');
  if (fs.existsSync(srcModules)) {
    if (process.platform === 'win32') {
      execSync(`cmd.exe /c mklink /J "${destModules}" "${srcModules}"`, { stdio: 'ignore' });
    } else {
      fs.symlinkSync(srcModules, destModules, 'junction');
    }
  }

  const cleanup = async () => {
    try {
      if (fs.existsSync(destModules)) {
        if (process.platform === 'win32') {
          fs.rmdirSync(destModules);
        } else {
          fs.unlinkSync(destModules);
        }
      }
    } catch {}
    try {
      fs.rmSync(labDir, { recursive: true, force: true });
    } catch {}
  };

  return { labDir, cleanup };
}

/**
 * Starts a Next.js dev server for a lab application on a free port bound to 127.0.0.1.
 */
export async function startLabServer(options: LabServerOptions): Promise<LabServer> {
  const port = options.port || (await findFreePort());
  const baseUrl = `http://127.0.0.1:${port}`;
  const workspace = createTempLabWorkspace(options.labName);

  const env = {
    ...process.env,
    PORT: String(port),
    SLIGHTNUDGE_TEST: '1',
  };

  const serverProc: ChildProcess = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['next', 'dev', '--webpack', '-H', '127.0.0.1', '-p', String(port)],
    {
      cwd: workspace.labDir,
      env,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    try {
      if (serverProc.pid) {
        if (process.platform === 'win32') {
          execSync(`taskkill /pid ${serverProc.pid} /T /F`, { stdio: 'ignore' });
        } else {
          serverProc.kill('SIGKILL');
        }
      }
    } catch {}
    try {
      serverProc.kill('SIGTERM');
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
    await workspace.cleanup();
  };

  const start = Date.now();
  const timeoutMs = 60000;
  let ready = false;

  while (Date.now() - start < timeoutMs) {
    if (serverProc.exitCode !== null) {
      await stop();
      throw new Error(`Lab server exited prematurely with code ${serverProc.exitCode}`);
    }
    try {
      const res = await new Promise<{ status: number }>((resolve, reject) => {
        const req = http.request(
          {
            host: '127.0.0.1',
            port,
            path: '/',
            method: 'GET',
            timeout: 2000,
          },
          (r) => resolve({ status: r.statusCode || 0 })
        );
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('timeout'));
        });
        req.end();
      });
      if (res.status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!ready) {
    await stop();
    throw new Error(`Lab server at ${baseUrl} failed to become ready within ${timeoutMs}ms`);
  }

  return {
    port,
    baseUrl,
    repoDir: workspace.labDir,
    stop,
  };
}

/**
 * Runs a test file against a freshly started lab dev server, then stops the server.
 */
export async function runLabSuite(
  labName: 'm0-control-lab' | 'm0-overfit-lab',
  testFile: string
): Promise<{ exitCode: number; output: string; durationMs: number }> {
  const projectRoot = process.cwd();
  const lab = await startLabServer({ labName });
  const start = performance.now();
  let exitCode = 0;
  let output = '';

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SLIGHTNUDGE_TEST: '1',
  };

  if (labName === 'm0-control-lab') {
    env.M0_BASE_URL = lab.baseUrl;
    env.M0_REPO_PATH = lab.repoDir;
  } else {
    env.M0_OVERFIT_BASE_URL = lab.baseUrl;
    env.M0_OVERFIT_REPO_PATH = lab.repoDir;
  }

  try {
    output = execSync(`npx tsx ${testFile}`, {
      cwd: projectRoot,
      env,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
    });
  } catch (err: any) {
    exitCode = err.status || 1;
    output = (err.stdout || '') + '\n' + (err.stderr || '') + '\n' + (err.message || '');
  } finally {
    const durationMs = Math.round(performance.now() - start);
    await lab.stop();
    return { exitCode, output, durationMs };
  }
}

