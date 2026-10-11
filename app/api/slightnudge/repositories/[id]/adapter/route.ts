import { NextResponse } from 'next/server';
import { getNextSourceAdapterStatus, installNextSourceAdapter, removeNextSourceAdapter } from '@/lib/slightnudge/next-source-adapter';

function authorizeLocalRequest(request: Request) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Local source adapters require the desktop development app.' }, { status: 501 });
  const origin = request.headers.get('origin');
  let sameOrigin = false;
  try { sameOrigin = Boolean(origin) && new URL(origin!).origin === new URL(request.url).origin; } catch { sameOrigin = false; }
  if (!sameOrigin) {
    return NextResponse.json({ error: 'Source adapter changes must come from this SlightNudge workspace.' }, { status: 403 });
  }
  return null;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await getNextSourceAdapterStatus(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not read adapter status.' }, { status: 404 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = authorizeLocalRequest(request);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    return NextResponse.json(await installNextSourceAdapter(id));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not enable the Next.js source adapter.';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = authorizeLocalRequest(request);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    return NextResponse.json(await removeNextSourceAdapter(id));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not remove the Next.js source adapter.';
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
