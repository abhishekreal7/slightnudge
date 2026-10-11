import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createScanCheckoutSession } from '@/lib/payments/dodo';
import { getDatabaseRepository } from '@/lib/db/client';

const CheckoutSchema = z.object({
  runId: z.string().min(1),
  email: z.string().email().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { runId, email } = parsed.data;
    const repo = getDatabaseRepository();
    const run = await repo.getRun(runId);

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    const session = await createScanCheckoutSession({
      runId,
      customerEmail: email,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      isMock: session.isMock,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
