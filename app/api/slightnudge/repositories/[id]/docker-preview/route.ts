import { NextResponse } from 'next/server';
import { getDockerPreviewStatus, startDockerPreview, stopDockerPreview } from '@/lib/slightnudge/docker-preview';

function isAllowed(request: Request) {
  if (process.env.NODE_ENV === 'production') return false;
  const origin = request.headers.get('origin');
  try { return Boolean(origin) && new URL(origin!).origin === new URL(request.url).origin; } catch { return false; }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Docker preview is available only in the local development app.' }, { status: 501 });
  const origin = request.headers.get('origin');
  if (origin && !isAllowed(request)) return NextResponse.json({ error: 'Docker preview status is available only from this local SlightNudge workspace.' }, { status: 403 });
  try {
    const { id } = await context.params;
    return NextResponse.json(await getDockerPreviewStatus(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not read the Docker preview status.' }, { status: 404 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAllowed(request)) return NextResponse.json({ error: 'Docker preview must be started from this local SlightNudge workspace.' }, { status: 403 });
  try {
    const { id } = await context.params;
    return NextResponse.json(await startDockerPreview(id), { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not start the Docker preview.' }, { status: 422 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAllowed(request)) return NextResponse.json({ error: 'Docker preview must be stopped from this local SlightNudge workspace.' }, { status: 403 });
  try {
    const { id } = await context.params;
    return NextResponse.json(await stopDockerPreview(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not stop the Docker preview.' }, { status: 409 });
  }
}
