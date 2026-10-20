import { NextResponse } from 'next/server';
import { undoSourceEdit } from '@/lib/slightnudge/edit-history';
import { resolveRepositorySourcePath, resolveWorkspaceSourcePath } from '@/lib/slightnudge/repository-store';
import { corsHeaders, handleCorsPreflight } from '@/lib/slightnudge/cors';
import { validateMutatingRequest } from '@/lib/slightnudge/auth';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  const auth = validateMutatingRequest(request);
  if (!auth.valid) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const filePath = typeof body.repositoryId === 'string' && typeof body.sourcePath === 'string'
      ? (await resolveRepositorySourcePath(body.repositoryId, body.sourcePath)).filePath
      : typeof body.filePath === 'string' && body.filePath.trim() ? resolveWorkspaceSourcePath(body.filePath) : undefined;
    const result = undoSourceEdit(filePath);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400, headers: corsHeaders(request) }
      );
    }

    return NextResponse.json({
      success: true,
      editId: result.editId,
      message: result.message,
    }, { headers: corsHeaders(request) });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Undo request failed' },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}

