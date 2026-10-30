import { NextResponse } from 'next/server';
import { getSourceUndoOutcome } from '@/lib/slightnudge/edit-history';
import { resolveRepositorySourcePath, resolveWorkspaceSourcePath } from '@/lib/slightnudge/repository-store';
import { corsHeaders, handleCorsPreflight } from '@/lib/slightnudge/cors';
import { validateMutatingRequest } from '@/lib/slightnudge/auth';

export async function OPTIONS(request: Request) { return handleCorsPreflight(request) || new NextResponse(null, { status: 204 }); }

export async function POST(request: Request) {
  const auth = validateMutatingRequest(request);
  if (!auth.valid) return auth.response;
  const headers = { ...corsHeaders(request), 'Cache-Control': 'no-store' };
  try {
    const body = await request.json();
    if (typeof body.previewId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.previewId)) return NextResponse.json({ success: false, code: 'UNDO_TARGET_REQUIRED', error: 'An accepted edit reference is required.' }, { status: 400, headers });
    if (body.repositoryId !== undefined && (typeof body.repositoryId !== 'string' || typeof body.sourcePath !== 'string')) return NextResponse.json({ success: false, code: 'UNDO_TARGET_REQUIRED', error: 'Choose the project and source file for this Undo.' }, { status: 400, headers });
    const filePath = typeof body.repositoryId === 'string'
      ? (await resolveRepositorySourcePath(body.repositoryId, body.sourcePath)).filePath
      : typeof body.filePath === 'string' && body.filePath.trim() ? resolveWorkspaceSourcePath(body.filePath) : undefined;
    const result = getSourceUndoOutcome(body.previewId, { filePath, repositoryId: body.repositoryId, sourcePath: body.sourcePath, editId: typeof body.editId === 'string' ? body.editId : undefined });
    return NextResponse.json(result, { status: result.success ? 200 : 409, headers });
  } catch {
    return NextResponse.json({ success: false, code: 'UNDO_UNCERTAIN', error: 'Undo status could not be confirmed. Check its status again before continuing.' }, { status: 409, headers });
  }
}
