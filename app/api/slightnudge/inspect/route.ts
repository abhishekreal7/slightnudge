import { withPerfRequest } from '@/lib/slightnudge/perf-stages';
import { NextResponse } from 'next/server';
import { inspectElement } from '@/lib/slightnudge/ast-nudger';
import { getLatestUndoTarget } from '@/lib/slightnudge/edit-history';
import { resolveWorkspaceSourcePath } from '@/lib/slightnudge/repository-store';
import { corsHeaders, handleCorsPreflight, isAllowedOrigin } from '@/lib/slightnudge/cors';

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 });
}

async function measuredPost(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && !isAllowedOrigin(origin, request.url)) {
      return NextResponse.json({ error: 'Inspection must come from an authorized workspace.' }, { status: 403, headers: corsHeaders(request) });
    }
    const body = await request.json();
    const { filePath, line, column, elementId, tagName, className, rect, clickedRect } = body;

    if (!filePath) {
      return NextResponse.json({ error: 'filePath is required' }, { status: 400, headers: corsHeaders(request) });
    }

    const resolvedPath = resolveWorkspaceSourcePath(filePath);

    const result = inspectElement({
      filePath: resolvedPath,
      line: line ? Number(line) : undefined,
      column: column ? Number(column) : undefined,
      elementId,
      tagName,
      className,
      rect,
      clickedRect,
    });

    return NextResponse.json({ ...result, undoTarget: getLatestUndoTarget(resolvedPath) }, { headers: corsHeaders(request) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Inspection failed' },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}


export const POST = withPerfRequest(measuredPost);
