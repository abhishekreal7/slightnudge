import { NextResponse } from 'next/server';
import { readRepositorySource } from '@/lib/slightnudge/repository-store';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const sourcePath = new URL(request.url).searchParams.get('path');
    if (!sourcePath) return NextResponse.json({ error: 'Choose a source file to inspect.' }, { status: 400 });
    return NextResponse.json(await readRepositorySource(id, sourcePath));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not read this source file.';
    const status = /could not be found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
