import { NextResponse } from 'next/server';
import { handleDodoWebhookEvent } from '@/lib/payments/dodo';

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId');
  const sessionId = searchParams.get('session_id') || `mock_sess_${Date.now()}`;
  if (!runId || !/^[a-zA-Z0-9_-]{1,128}$/.test(runId) || !/^[a-zA-Z0-9_-]{1,160}$/.test(sessionId)) return NextResponse.json({ error: 'Invalid checkout session' }, { status: 400 });
  const action = searchParams.get('action');

  if (action === 'confirm' && runId) {
    // Simulate webhook event execution
    await handleDodoWebhookEvent({
      type: 'checkout.session.completed',
      data: {
        payment_id: `dodo_pay_${Date.now()}`,
        session_id: sessionId,
        metadata: { runId },
        amount_usd: 9.99,
      },
    });

    return NextResponse.redirect(new URL(`/runs/${runId}?payment_status=success`, req.url));
  }

  // Render a simulated Dodo Payments checkout page
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dodo Payments (Test Checkout)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 420px; width: 100%; border: 1px solid #e2e8f0; }
    .badge { background: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; }
    h1 { font-size: 20px; margin: 12px 0 6px; color: #0f172a; }
    p { font-size: 14px; color: #64748b; margin-bottom: 24px; }
    .item { display: flex; justify-content: space-between; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; padding: 12px 0; margin-bottom: 24px; font-size: 14px; }
    .btn { display: block; width: 100%; background: #2563eb; color: white; text-align: center; padding: 12px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 14px; box-sizing: border-box; }
    .btn-secondary { display: block; width: 100%; text-align: center; padding: 10px; margin-top: 8px; color: #64748b; font-size: 13px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Dodo Payments • Test Mode</span>
    <h1>ShipCheck Full Scan</h1>
    <p>Unlock complete test results, mobile viewport testing, and ready-to-paste AI fix prompts.</p>
    
    <div class="item">
      <span>1x Full Deep Scan (Run: ${runId})</span>
      <strong>$9.99 USD</strong>
    </div>

    <a href="/api/checkout/simulate?runId=${runId}&action=confirm" class="btn">
      Pay $9.99 (Simulate Test Card)
    </a>
    <a href="/runs/${runId}" class="btn-secondary">Cancel and return</a>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
