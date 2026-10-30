import { NextResponse } from 'next/server';

export function proxy() {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Source editing requires the local development companion.' }, { status: 501 });
  return NextResponse.next();
}
export const config = { matcher: '/api/slightnudge/:path*' };
