import { NextResponse } from 'next/server';
import { handleDodoWebhookEvent, verifyDodoWebhook } from '@/lib/payments/dodo';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    const headers: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
    });

    let event: any;
    try {
      event = verifyDodoWebhook(rawBody, headers);
    } catch (verifyErr: any) {
      console.warn('[Dodo Webhook Signature Error]:', verifyErr.message);
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const result = await handleDodoWebhookEvent(event);

    return NextResponse.json({
      received: true,
      action: result.action,
      paymentId: result.paymentId,
      runId: result.runId,
    });
  } catch (err: any) {
    console.error('[Dodo Webhook Internal Error]:', err.message);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
