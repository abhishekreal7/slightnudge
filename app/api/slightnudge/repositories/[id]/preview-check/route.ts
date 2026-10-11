import { NextResponse } from 'next/server';
import { listLocalRepositories, validateLocalPreviewUrl } from '@/lib/slightnudge/repository-store';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Local preview connections require the desktop development app.' }, { status: 501 });
    }
    const origin = request.headers.get('origin');
    if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: 'Preview checks must come from this SlightNudge workspace.' }, { status: 403 });
    }
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 4096) return NextResponse.json({ error: 'The preview request is too large.' }, { status: 413 });

    const { id } = await context.params;
    const repository = (await listLocalRepositories()).find((item) => item.id === id);
    if (!repository) return NextResponse.json({ error: 'Repository not found.' }, { status: 404 });

    const body = await request.json();
    if (typeof body.url !== 'string' || body.url.length > 2048) {
      return NextResponse.json({ error: 'Enter your local preview URL.' }, { status: 400 });
    }
    const url = validateLocalPreviewUrl(body.url);
    const parentOrigin = new URL(request.url).origin;
    if (url.origin === parentOrigin) {
      return NextResponse.json({ error: 'Use a port different from SlightNudge, such as http://127.0.0.1:3001.' }, { status: 422 });
    }
    const response = await fetch(url, {
      cache: 'no-store',
      redirect: 'manual',
      headers: { accept: 'text/html' },
      signal: AbortSignal.timeout(4_000),
    });
    const contentType = response.headers.get('content-type') || '';
    const frameOptions = response.headers.get('x-frame-options')?.trim().toLowerCase();
    const csp = response.headers.get('content-security-policy') || '';
    const frameAncestors = csp.match(/(?:^|;)\s*frame-ancestors\s+([^;]+)/i)?.[1]?.trim().split(/\s+/) || [];
    await response.body?.cancel().catch(() => undefined);

    if (response.status >= 300 && response.status < 400) {
      return NextResponse.json({ error: 'The preview server redirected. Enter its final local URL.' }, { status: 422 });
    }
    if (!response.ok || !contentType.toLowerCase().includes('text/html')) {
      return NextResponse.json({ error: `The local server responded with ${response.status}. Open the app page in your browser first.` }, { status: 422 });
    }
    if (frameOptions === 'deny' || (frameOptions === 'sameorigin' && parentOrigin !== url.origin)) {
      return NextResponse.json({ error: 'This app blocks embedded previews. Allow the SlightNudge local origin in its frame policy, then reconnect.' }, { status: 422 });
    }
    const frameAllowed = frameAncestors.length === 0 || frameAncestors.includes('*') || frameAncestors.some((source) =>
      (source === "'self'" && parentOrigin === url.origin) || source.replace(/^'|'$/g, '') === parentOrigin,
    );
    if (!frameAllowed) {
      return NextResponse.json({ error: 'This app’s Content Security Policy blocks embedded previews. Allow the SlightNudge local origin, then reconnect.' }, { status: 422 });
    }
    return NextResponse.json({ success: true, url: url.toString(), status: response.status });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({ error: 'The preview server did not respond within four seconds.' }, { status: 504 });
    }
    if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
      return NextResponse.json({ error: 'Could not reach the preview server. Start it on 127.0.0.1:3001 and try again.' }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : 'Could not connect to that preview server.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
