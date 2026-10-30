import { NextResponse } from 'next/server';
import { validateMutatingRequest } from '@/lib/slightnudge/auth';
import { resolveWorkspaceSourcePath, resolveRepositorySourcePath, resolveRepositoryRoot } from '@/lib/slightnudge/repository-store';
import { readRenderableDraft } from '@/lib/slightnudge/source-draft';

/** Read/compile a persisted local proposal without writing its project file. */
export async function POST(request: Request) {
  const auth = validateMutatingRequest(request); if (!auth.valid) return auth.response;
  try {
    const body = await request.json();
    if (typeof body.previewId !== 'string' || typeof body.filePath !== 'string') return NextResponse.json({ error: 'Choose a saved local draft.' }, { status: 400 });
    const repositoryId = typeof body.repositoryId === 'string' ? body.repositoryId : undefined;
    const file = repositoryId ? (await resolveRepositorySourcePath(repositoryId, body.sourcePath)).filePath : resolveWorkspaceSourcePath(body.filePath);
    return NextResponse.json({ success: true, ...await readRenderableDraft(body.previewId, file, { repositoryId, root: repositoryId ? await resolveRepositoryRoot(repositoryId) : process.cwd() }) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'The saved draft could not be rendered.' }, { status: 409 }); }
}
