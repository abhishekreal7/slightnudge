import { NextResponse } from 'next/server';
import { undoLastNudge } from '@/lib/slightnudge/git-helper';

export async function POST() {
  try {
    const result = undoLastNudge();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      commitHash: result.commitHash,
      message: result.message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Undo request failed' },
      { status: 500 }
    );
  }
}
