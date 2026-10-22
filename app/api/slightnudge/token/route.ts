import { NextResponse } from 'next/server';
import { getSessionToken, isRequestHostAllowed } from '@/lib/slightnudge/auth';
import { isAllowedOrigin } from '@/lib/slightnudge/cors';

export async function GET(request: Request) {
  if (!isRequestHostAllowed(request.headers)) {
    return NextResponse.json({ error: 'Access denied.' }, {
      status: 403,
      headers: { 'Cache-Control': 'no-store' }
    });
  }

  const origin = request.headers.get('origin');
  if (origin && !isAllowedOrigin(origin, request.url)) {
    return NextResponse.json({ error: 'Access denied.' }, {
      status: 403,
      headers: { 'Cache-Control': 'no-store' }
    });
  }

  // Same-origin / local studio endpoint only; strictly without CORS headers
  return NextResponse.json(
    { token: getSessionToken() },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
