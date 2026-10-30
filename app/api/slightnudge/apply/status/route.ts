import { NextResponse } from 'next/server';
import { getSourceApplyOutcome } from '@/lib/slightnudge/edit-history';
import { resolveRepositorySourcePath } from '@/lib/slightnudge/repository-store';
import { corsHeaders, handleCorsPreflight } from '@/lib/slightnudge/cors';
import { validateMutatingRequest } from '@/lib/slightnudge/auth';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 });
}

// A protected read: recovery must use the same host, origin, token and project
// checks as Apply, and must never create/retry a source operation.
export async function POST(request: Request) {
  const auth = validateMutatingRequest(request);
  if (!auth.valid) return auth.response;
  const headers = { ...corsHeaders(request), 'Cache-Control': 'no-store' };
  try {
    const body = await request.json();
    if (typeof body.previewId !== 'string') return NextResponse.json({ success: false, error: 'A reviewed change is required.' }, { status: 400, headers });
    const repositoryId = typeof body.repositoryId === 'string' ? body.repositoryId : undefined;
    const sourcePath = typeof body.sourcePath === 'string' ? body.sourcePath : undefined;
    const filePath = repositoryId && sourcePath ? (await resolveRepositorySourcePath(repositoryId, sourcePath)).filePath : undefined;
    const result = getSourceApplyOutcome(body.previewId, repositoryId, sourcePath, filePath);
    if (!result) return NextResponse.json({ success: false, code: 'APPLY_UNCERTAIN', error: 'The save outcome is not confirmed yet. Check its status again before continuing.' }, { status: 409, headers });
    return NextResponse.json(result, { status: result.success ? 200 : 409, headers });
  } catch {
    return NextResponse.json({ success: false, code: 'APPLY_UNCERTAIN', error: 'The save outcome could not be checked. Check its status again before continuing.' }, { status: 400, headers });
  }
}
