import { NextResponse } from 'next/server';
import { validateMutatingRequest } from '@/lib/slightnudge/auth';
import { resolveWorkspaceSourcePath, resolveRepositorySourcePath } from '@/lib/slightnudge/repository-store';
import { findProjectRoot, getProjectResponsiveScopes } from '@/lib/slightnudge/tailwind-verifier';

export async function POST(request: Request) {
  const auth = validateMutatingRequest(request); if (!auth.valid) return auth.response;
  try {
    const body = await request.json();
    if (typeof body.filePath !== 'string') return NextResponse.json({ error: 'Choose a project source file.' }, { status: 400 });
    const target = typeof body.repositoryId === 'string' ? (await resolveRepositorySourcePath(body.repositoryId, body.filePath)).filePath : resolveWorkspaceSourcePath(body.filePath);
    return NextResponse.json({ breakpoints: await getProjectResponsiveScopes(findProjectRoot(target)) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not read project breakpoints.' }, { status: 422 }); }
}
