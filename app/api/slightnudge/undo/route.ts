import { NextResponse } from 'next/server';
import { undoSourceEdit } from '@/lib/slightnudge/edit-history';
import { resolveRepositorySourcePath, resolveWorkspaceSourcePath } from '@/lib/slightnudge/repository-store';

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: 'Undo requests must come from this SlightNudge workspace.' }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    const filePath = typeof body.repositoryId === 'string' && typeof body.sourcePath === 'string'
      ? (await resolveRepositorySourcePath(body.repositoryId, body.sourcePath)).filePath
      : typeof body.filePath === 'string' && body.filePath.trim() ? resolveWorkspaceSourcePath(body.filePath) : undefined;
    const result = undoSourceEdit(filePath);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      editId: result.editId,
      message: result.message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Undo request failed' },
      { status: 500 }
    );
  }
}
