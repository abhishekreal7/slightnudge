import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { NextResponse } from 'next/server';
import { listLocalRepositories, resolveRepositoryRoot } from '@/lib/slightnudge/repository-store';
import { getNextSourceAdapterStatus } from '@/lib/slightnudge/next-source-adapter';
import { inspectProjectCompatibility } from '@/lib/slightnudge/project-compatibility';

const execFileAsync = promisify(execFile);

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const repository = (await listLocalRepositories()).find((item) => item.id === id);
    if (!repository) return NextResponse.json({ error: 'Repository not found.' }, { status: 404 });

    const root = await resolveRepositoryRoot(id);
    const { stdout } = await execFileAsync('git', ['ls-files'], { cwd: root, timeout: 10_000, maxBuffer: 1024 * 1024, windowsHide: true });
    const files = stdout.split(/\r?\n/).filter((file) => /\.(tsx?|jsx?|css|scss|mdx?)$/i.test(file) && !/(^|\/)(node_modules|\.next|dist)\//.test(file)).slice(0, 1200);
    const compatibility = await inspectProjectCompatibility(root, stdout.split(/\r?\n/));
    const { framework } = compatibility;

    const adapter = framework === 'Next.js' ? await getNextSourceAdapterStatus(id) : { enabled: false, needsUpdate: false };
    return NextResponse.json({
      repository: { id: repository.id, name: repository.name, owner: repository.owner, url: repository.url, defaultBranch: repository.defaultBranch, importedAt: repository.importedAt },
      files,
      framework,
      compatibility,
      sourceAdapterEnabled: adapter.enabled,
      sourceAdapterNeedsUpdate: adapter.needsUpdate,
    });
  } catch {
    return NextResponse.json({ error: 'Could not read the imported repository.' }, { status: 500 });
  }
}
