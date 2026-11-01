import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { isAllowedOrigin, corsHeaders } from './cors';

const GLOBAL_TOKEN_KEY = Symbol.for('slightnudge.sessionToken');
const GLOBAL_PORT_KEY = Symbol.for('slightnudge.serverPort');

export function getSessionToken(): string {
  const g = globalThis as any;
  if (!g[GLOBAL_TOKEN_KEY]) {
    g[GLOBAL_TOKEN_KEY] = crypto.randomBytes(32).toString('hex');
  }
  return g[GLOBAL_TOKEN_KEY];
}

export function getServerPort(): string {
  const g = globalThis as any;
  return g[GLOBAL_PORT_KEY] || process.env.PORT || '3000';
}

export function setServerPort(port: string): void {
  const g = globalThis as any;
  g[GLOBAL_PORT_KEY] = port;
}

export function isValidHost(host: string | null): boolean {
  if (!host) return false;
  const port = getServerPort();
  const allowed = [
    `localhost:${port}`,
    `127.0.0.1:${port}`,
  ];
  if (port === '80' || port === '443') {
    allowed.push('localhost', '127.0.0.1');
  }
  return allowed.includes(host.trim().toLowerCase());
}

export function isRequestHostAllowed(headers: Headers | { get(name: string): string | null }): boolean {
  const host = headers.get('host');
  if (!isValidHost(host)) {
    return false;
  }

  const xForwardedHost = headers.get('x-forwarded-host');
  if (xForwardedHost) {
    const parts = xForwardedHost.split(',').map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (!isValidHost(part)) {
        return false;
      }
    }
  }

  const forwarded = headers.get('forwarded');
  if (forwarded) {
    const matches = forwarded.matchAll(/(?:^|[;,])\s*host=([^;,\s]+)/gi);
    for (const match of matches) {
      let forwardedHost = match[1];
      if (forwardedHost.startsWith('"') && forwardedHost.endsWith('"')) {
        forwardedHost = forwardedHost.slice(1, -1);
      }
      if (!isValidHost(forwardedHost)) {
        return false;
      }
    }
  }

  return true;
}

export function timingSafeEqualStrings(a: string | null | undefined, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validates mutating requests to SlightNudge endpoints:
 * 1. Host must be exactly localhost:PORT or 127.0.0.1:PORT for the server's actual port,
 *    and no forwarded host header may contradict it.
 * 2. An Origin header is required and must be an allowed local origin.
 * 3. The token must be present and match using crypto.timingSafeEqual.
 * Any failure returns 403 with a short generic message and does nothing else.
 * A missing Origin is rejected even when the token is valid.
 */
export function validateMutatingRequest(request: Request): { valid: true } | { valid: false; response: NextResponse } {
  // 1. Host check: Host must be exactly localhost:PORT or 127.0.0.1:PORT for the server's actual port,
  // and no forwarded host header may contradict it
  if (!isRequestHostAllowed(request.headers)) {
    return {
      valid: false,
      response: NextResponse.json({ error: 'Access denied.' }, { status: 403, headers: corsHeaders(request) }),
    };
  }

  // 2. Tokens do not replace origin validation, including in test processes.
  const origin = request.headers.get('origin');
  if (!origin || !isAllowedOrigin(origin, request.url)) {
    return {
      valid: false,
      response: NextResponse.json({ error: 'Access denied.' }, { status: 403, headers: corsHeaders(request) }),
    };
  }

  // 3. Token check: The token must be present and match using crypto.timingSafeEqual
  const token = request.headers.get('x-slightnudge-token');
  const expectedToken = getSessionToken();
  if (!timingSafeEqualStrings(token, expectedToken)) {
    return {
      valid: false,
      response: NextResponse.json({ error: 'Access denied.' }, { status: 403, headers: corsHeaders(request) }),
    };
  }

  return { valid: true };
}
