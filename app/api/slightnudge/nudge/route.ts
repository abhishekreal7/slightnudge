import { NextResponse } from 'next/server';
import path from 'path';
import { nudgeElement } from '@/lib/slightnudge/ast-nudger';
import { commitNudgeChange } from '@/lib/slightnudge/git-helper';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filePath, line, elementId, direction, stepSize = 'normal', breakpoint = '' } = body;

    if (!filePath || !direction) {
      return NextResponse.json(
        { error: 'filePath and direction are required' },
        { status: 400 }
      );
    }

    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    // 1. Perform precision AST edit
    const result = nudgeElement({
      filePath: resolvedPath,
      line: line ? Number(line) : undefined,
      elementId,
      direction,
      stepSize,
      breakpoint,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        refusedSafely: true,
        reason: result.reason,
      });
    }

    // 2. Each edit is one git commit
    const commit = commitNudgeChange(resolvedPath, result.oldClass, result.newClass);

    return NextResponse.json({
      success: true,
      refusedSafely: false,
      oldClass: result.oldClass,
      newClass: result.newClass,
      oldClassNameValue: result.oldClassNameValue,
      newClassNameValue: result.newClassNameValue,
      filePath: result.filePath,
      line: result.line,
      commitHash: commit.commitHash,
      commitMessage: commit.message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Nudge request failed' },
      { status: 500 }
    );
  }
}
