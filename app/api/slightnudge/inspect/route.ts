import { NextResponse } from 'next/server';
import path from 'path';
import { inspectElement } from '@/lib/slightnudge/ast-nudger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filePath, line, elementId } = body;

    if (!filePath) {
      return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
    }

    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    const result = inspectElement({
      filePath: resolvedPath,
      line: line ? Number(line) : undefined,
      elementId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Inspection failed' },
      { status: 500 }
    );
  }
}
