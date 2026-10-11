import { NextResponse } from 'next/server';
import { inspectElement } from '@/lib/slightnudge/ast-nudger';
import { resolveWorkspaceSourcePath } from '@/lib/slightnudge/repository-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filePath, line, column, elementId, tagName, className, rect, clickedRect } = body;

    if (!filePath) {
      return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
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

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Inspection failed' },
      { status: 500 }
    );
  }
}
