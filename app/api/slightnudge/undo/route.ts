import { NextResponse } from 'next/server';
import { undoSourceEdit } from '@/lib/slightnudge/edit-history';
import { resolveRepositorySourcePath, resolveWorkspaceSourcePath } from '@/lib/slightnudge/repository-store';
import { corsHeaders, handleCorsPreflight, isAllowedOrigin } from '@/lib/slightnudge/cors';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && !isAllowedOrigin(origin, request.url)) {
      return NextResponse.json({ error: 'Undo requests must come from this SlightNudge workspace.' }, { status: 403, headers: corsHeaders(request) });
    }
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

