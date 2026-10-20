import { NextResponse } from 'next/server';
import { getNextSourceAdapterStatus, installNextSourceAdapter, removeNextSourceAdapter } from '@/lib/slightnudge/next-source-adapter';
import { validateMutatingRequest } from '@/lib/slightnudge/auth';

function authorizeLocalRequest(request: Request) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Local source adapters require the desktop development app.' }, { status: 501 });
  const auth = validateMutatingRequest(request);
  if (!auth.valid) return auth.response;
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
