import { NextResponse } from 'next/server';
import { importPublicRepository, listLocalRepositories } from '@/lib/slightnudge/repository-store';

export async function GET() {
  try {
    const repositories = (await listLocalRepositories()).map(({ localPath: _localPath, ...repository }) => repository);
    return NextResponse.json({ repositories });
  } catch {
    return NextResponse.json({ error: 'Could not read the workspace repository list.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.url !== 'string' || body.url.length > 500) {
      return NextResponse.json({ error: 'A repository URL is required.' }, { status: 400 });
    }
    const repository = await importPublicRepository(body.url);
    const { localPath: _localPath, ...publicRepository } = repository;
    return NextResponse.json({ repository: publicRepository }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Repository import failed.' }, { status: 400 });
  }
}
