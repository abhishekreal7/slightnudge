import { withPerfRequest } from '@/lib/slightnudge/perf-stages';
import { NextResponse } from 'next/server';
import { undoReviewedSourceEdit } from '@/lib/slightnudge/edit-history';
import { resolveRepositorySourcePath, resolveWorkspaceSourcePath } from '@/lib/slightnudge/repository-store';
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
    if (typeof body.previewId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.previewId)) return NextResponse.json({ success: false, code: 'UNDO_TARGET_REQUIRED', error: 'Choose the accepted edit to undo. Unbound Undo requests are not supported.' }, { status: 400, headers: corsHeaders(request) });
    if (body.repositoryId !== undefined && (typeof body.repositoryId !== 'string' || typeof body.sourcePath !== 'string')) return NextResponse.json({ success: false, code: 'UNDO_TARGET_REQUIRED', error: 'Choose the project and source file for this Undo.' }, { status: 400, headers: corsHeaders(request) });
    const filePath = typeof body.repositoryId === 'string' && typeof body.sourcePath === 'string'
      ? (await resolveRepositorySourcePath(body.repositoryId, body.sourcePath)).filePath
      : typeof body.filePath === 'string' && body.filePath.trim() ? resolveWorkspaceSourcePath(body.filePath) : undefined;
    const result = undoReviewedSourceEdit(body.previewId, { filePath, repositoryId: body.repositoryId, sourcePath: body.sourcePath, editId: typeof body.editId === 'string' ? body.editId : undefined });

    if (!result.success) {
      return NextResponse.json(
        result,
        { status: 400, headers: corsHeaders(request) }
      );
    }

    return NextResponse.json(result, { headers: { ...corsHeaders(request), 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Undo request failed' },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}


export const POST = withPerfRequest(measuredPost);
