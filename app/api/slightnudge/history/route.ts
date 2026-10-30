import { NextResponse } from 'next/server';
import { validateMutatingRequest } from '@/lib/slightnudge/auth';
import { resolveRepositoryRoot } from '@/lib/slightnudge/repository-store';
import { getHistorySummary } from '@/lib/slightnudge/history-summary';

/** POST carries the local session token. This endpoint never writes source or receipts. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Local history requires the development app.' }, { status: 501 });
  const auth = validateMutatingRequest(request);
  if (!auth.valid) return auth.response;
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body) || body.repositoryId !== undefined && (typeof body.repositoryId !== 'string' || !body.repositoryId)) return NextResponse.json({ error: 'Choose a valid project.' }, { status: 400, headers });
    const root = body.repositoryId ? await resolveRepositoryRoot(body.repositoryId) : process.cwd();
    return NextResponse.json({ entries: getHistorySummary(root, body.repositoryId) }, { headers });
  } catch {
    return NextResponse.json({ error: 'History could not be read. Your files have not been changed.' }, { status: 409, headers });
  }
}
