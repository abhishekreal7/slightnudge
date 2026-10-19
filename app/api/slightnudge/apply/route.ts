import { NextResponse } from 'next/server';
import { applyPendingSourceEdit } from '@/lib/slightnudge/edit-history';
import { resolveRepositorySourcePath } from '@/lib/slightnudge/repository-store';
import { corsHeaders, handleCorsPreflight, isAllowedOrigin } from '@/lib/slightnudge/cors';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && !isAllowedOrigin(origin, request.url)) {
      return NextResponse.json({ error: 'Source changes must be applied from this SlightNudge workspace.' }, { status: 403, headers: corsHeaders(request) });
    }
    const body = await request.json();
    if (typeof body.previewId !== 'string') return NextResponse.json({ error: 'Review a change before applying it.' }, { status: 400, headers: corsHeaders(request) });
    const repositoryId = typeof body.repositoryId === 'string' ? body.repositoryId : undefined;
    const sourcePath = typeof body.sourcePath === 'string' ? body.sourcePath : undefined;
    const validatedFilePath = repositoryId && sourcePath ? (await resolveRepositorySourcePath(repositoryId, sourcePath)).filePath : undefined;
    const result = applyPendingSourceEdit(body.previewId, typeof body.groupId === 'string' ? body.groupId : undefined, repositoryId, sourcePath, validatedFilePath);
    return NextResponse.json(result, { status: result.success ? 200 : 409, headers: corsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not apply this change.' }, { status: 400, headers: corsHeaders(request) });
  }
}

