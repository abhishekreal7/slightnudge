import { NextResponse } from 'next/server';
import { inspectElement } from '@/lib/slightnudge/ast-nudger';
import { resolveRepositorySourcePath } from '@/lib/slightnudge/repository-store';
import { canUndoSourceEdit } from '@/lib/slightnudge/edit-history';
import { corsHeaders, handleCorsPreflight, isAllowedOrigin } from '@/lib/slightnudge/cors';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (Number(request.headers.get('content-length') || 0) > 4096) {
      return NextResponse.json({ error: 'The source selection is too large.' }, { status: 413, headers: corsHeaders(request) });
    }
    const origin = request.headers.get('origin');
    if (origin && !isAllowedOrigin(origin, request.url)) {
      return NextResponse.json({ error: 'Source inspection must come from this SlightNudge workspace.' }, { status: 403, headers: corsHeaders(request) });
    }

    const { id } = await context.params;
    const body = await request.json();
    if (typeof body.path !== 'string' || body.path.length > 1000) {
      return NextResponse.json({ error: 'Choose a source file from the imported repository.' }, { status: 400, headers: corsHeaders(request) });
    }
    const line = Number(body.line);
    const column = Number(body.column);
    if (!Number.isSafeInteger(line) || line < 1 || !Number.isSafeInteger(column) || column < 1) {
      return NextResponse.json({ error: 'The preview did not provide a valid source location.' }, { status: 400, headers: corsHeaders(request) });
    }

    const source = await resolveRepositorySourcePath(id, body.path);
    const result = inspectElement({
      filePath: source.filePath,
      line,
      column,
      elementId: typeof body.elementId === 'string' ? body.elementId.slice(0, 200) : undefined,
      tagName: typeof body.tagName === 'string' ? body.tagName : undefined,
      className: typeof body.className === 'string' ? body.className : undefined,
      rect: body.rect,
      clickedRect: body.clickedRect,
    });
    return NextResponse.json({ ...result, canUndo: canUndoSourceEdit(source.filePath), path: source.path, line, column }, { headers: corsHeaders(request) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not inspect that source location.';
    const status = /could not be found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status, headers: corsHeaders(request) });
  }
}

