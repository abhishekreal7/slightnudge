import { NextResponse } from 'next/server';

/** Direct edits are disabled; source mutations must pass through preview and apply. */
export async function POST() {
  return NextResponse.json(
    { error: 'Direct edits are disabled. Preview the source change and apply it after review.' },
    { status: 410 }
  );
}
