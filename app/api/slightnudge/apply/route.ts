import { withPerfRequest } from '@/lib/slightnudge/perf-stages';
import { NextResponse } from 'next/server';
import { applyPendingSourceEdit } from '@/lib/slightnudge/edit-history';
import { resolveRepositorySourcePath } from '@/lib/slightnudge/repository-store';
import { corsHeaders, handleCorsPreflight } from '@/lib/slightnudge/cors';
import { validateMutatingRequest } from '@/lib/slightnudge/auth';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 });
}

async function measuredPost(request: Request) {
  const auth = validateMutatingRequest(request);
  if (!auth.valid) return auth.response;

  try {
    const body = await request.json();
    if (typeof body.previewId !== 'string') return NextResponse.json({ error: 'Review a change before applying it.' }, { status: 400, headers: corsHeaders(request) });
    const repositoryId = typeof body.repositoryId === 'string' ? body.repositoryId : undefined;
    const sourcePath = typeof body.sourcePath === 'string' ? body.sourcePath : undefined;
    const validatedFilePath = repositoryId && sourcePath ? (await resolveRepositorySourcePath(repositoryId, sourcePath)).filePath : undefined;
    const result = await applyPendingSourceEdit(body.previewId, typeof body.groupId === 'string' ? body.groupId : undefined, repositoryId, sourcePath, validatedFilePath);
    return NextResponse.json(result, { status: result.success ? 200 : 409, headers: corsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not apply this change.' }, { status: 400, headers: corsHeaders(request) });
  }
}


export const POST = withPerfRequest(measuredPost);
