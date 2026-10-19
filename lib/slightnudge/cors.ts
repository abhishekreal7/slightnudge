import { NextResponse } from 'next/server';

/**
 * Checks if the request comes from an authorized origin:
 * 1. Same origin as SlightNudge
 * 2. Local loopback origin (localhost / 127.0.0.1 / [::1] on ports 1024-65535)
 */
export function isAllowedOrigin(origin: string | null, requestUrl: string): boolean {
  if (!origin) return true; // Direct server-to-server or same-origin without Origin header
  try {
    const originUrl = new URL(origin);
    const targetUrl = new URL(requestUrl);
    if (originUrl.origin === targetUrl.origin) return true;

    // Allow local development preview servers
    const host = originUrl.hostname.toLowerCase();
    const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '[::1]' || host === '::1';
    const port = Number(originUrl.port);
    if (isLocalhost && originUrl.protocol === 'http:' && ((Number.isInteger(port) && port >= 1024 && port <= 65535) || originUrl.port === '')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  if (!origin || !isAllowedOrigin(origin, request.url)) {
    return {};
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCorsPreflight(request: Request): NextResponse | null {
  if (request.method !== 'OPTIONS') return null;
  const origin = request.headers.get('origin');
  if (origin && !isAllowedOrigin(origin, request.url)) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}
