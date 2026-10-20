import { NextResponse } from 'next/server';
import { getSessionToken, isValidHost } from '@/lib/slightnudge/auth';
import { isAllowedOrigin } from '@/lib/slightnudge/cors';

export async function GET(request: Request) {
  const host = request.headers.get('host');
  if (!isValidHost(host)) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }

  const origin = request.headers.get('origin');
  if (origin && !isAllowedOrigin(origin, request.url)) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }

  // Same-origin / local studio endpoint only; strictly without CORS headers
  return NextResponse.json({ token: getSessionToken() });
}
