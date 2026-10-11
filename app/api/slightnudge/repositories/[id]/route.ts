import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { NextResponse } from 'next/server';
import { listLocalRepositories } from '@/lib/slightnudge/repository-store';
import { getNextSourceAdapterStatus } from '@/lib/slightnudge/next-source-adapter';

const execFileAsync = promisify(execFile);

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const repository = (await listLocalRepositories()).find((item) => item.id === id);
    if (!repository) return NextResponse.json({ error: 'Repository not found.' }, { status: 404 });

    const { stdout } = await execFileAsync('git', ['ls-files'], { cwd: repository.localPath, timeout: 10_000, maxBuffer: 1024 * 1024, windowsHide: true });
    const files = stdout.split(/\r?\n/).filter((file) => /\.(tsx?|jsx?|css|scss|mdx?)$/i.test(file) && !/(^|\/)(node_modules|\.next|dist)\//.test(file)).slice(0, 1200);
    let framework = 'Web application';
    try {
      const { stdout: packageJson } = await execFileAsync('git', ['show', 'HEAD:package.json'], { cwd: repository.localPath, timeout: 5_000, maxBuffer: 128 * 1024, windowsHide: true });
      const packageData = JSON.parse(packageJson);
      const dependencies = { ...packageData.dependencies, ...packageData.devDependencies };
      if (dependencies.next) framework = 'Next.js';
      else if (dependencies.vite) framework = 'Vite';
      else if (dependencies.react) framework = 'React';
    } catch {
      // Some repositories are not JavaScript projects.
    }

    return NextResponse.json({
      repository: { id: repository.id, name: repository.name, owner: repository.owner, url: repository.url, defaultBranch: repository.defaultBranch, importedAt: repository.importedAt },
      files,
      framework,
      sourceAdapterEnabled: framework === 'Next.js' ? (await getNextSourceAdapterStatus(id)).enabled : false,
    });
  } catch {
    return NextResponse.json({ error: 'Could not read the imported repository.' }, { status: 500 });
  }
}
