import { NextResponse } from 'next/server';
import { getDatabaseRepository, MemoryDatabaseRepository } from '@/lib/db/client';
import { verifyUnitEconomicsMargin } from '@/lib/security/rate-limit';
import { timingSafeEqualStrings } from '@/lib/slightnudge/auth';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const adminKey =
    (process.env.NODE_ENV !== 'production' ? searchParams.get('admin_key') : null) ||
    req.headers.get('x-admin-key') ||
    req.headers.get('authorization')?.replace('Bearer ', '');

  const expectedKey = process.env.ADMIN_SECRET_KEY || (process.env.NODE_ENV !== 'production' ? 'shipcheck_admin_secret_dev' : '');
  if (!expectedKey) return NextResponse.json({ error: 'Admin access is not configured.' }, { status: 503 });

  if (!timingSafeEqualStrings(adminKey, expectedKey)) {
    return NextResponse.json({ error: 'Unauthorized. Invalid admin credentials.' }, { status: 401 });
  }

  const repo = getDatabaseRepository();
  let runsList: any[] = [];

  if (repo instanceof MemoryDatabaseRepository) {
    runsList = Array.from(repo.runs.values());
  } else {
    // Supabase query fallback
    try {
      const client = (repo as any).client;
      if (client) {
        const { data } = await client.from('runs').select('*').order('created_at', { ascending: false }).limit(50);
        runsList = data || [];
      }
    } catch (e) {}
  }

  const totalRuns = runsList.length;
  const completedRuns = runsList.filter((r) => r.status === 'completed').length;
  const failedRuns = runsList.filter((r) => r.status === 'failed').length;
  const refundedRuns = runsList.filter((r) => r.status === 'refunded').length;

  const failureRatePercent = totalRuns > 0 ? parseFloat(((failedRuns / totalRuns) * 100).toFixed(1)) : 0;
  const refundRatePercent = totalRuns > 0 ? parseFloat(((refundedRuns / totalRuns) * 100).toFixed(1)) : 0;

  // Revenue & Costs
  const totalRevenueUsd = completedRuns * 9.99;
  const totalCreditsUsed = runsList.reduce((acc, r) => acc + (r.cost_credits || 0), 0);
  const totalComputeCostUsd = parseFloat((totalCreditsUsed * 0.02).toFixed(2));
  const estimatedDodoFees = parseFloat((completedRuns * (9.99 * 0.04 + 0.40)).toFixed(2));
  const netProfitUsd = parseFloat((totalRevenueUsd - totalComputeCostUsd - estimatedDodoFees).toFixed(2));
  const avgMarginPerRun = completedRuns > 0 ? parseFloat((netProfitUsd / completedRuns).toFixed(2)) : 0;

  const unitEconomics = verifyUnitEconomicsMargin();

  return NextResponse.json({
    success: true,
    summary: {
      totalRuns,
      completedRuns,
      failedRuns,
      refundedRuns,
      failureRatePercent,
      refundRatePercent,
      totalRevenueUsd,
      totalComputeCostUsd,
      estimatedDodoFees,
      netProfitUsd,
      avgMarginPerRun,
      totalCreditsUsed,
      unitEconomics,
    },
    runs: runsList.slice(0, 25).map((r) => {
      const costUsd = parseFloat(((r.cost_credits || 0) * 0.02).toFixed(2));
      const feeUsd = r.kind === 'full' ? 9.99 * 0.04 + 0.40 : 0;
      const priceUsd = r.kind === 'full' ? 9.99 : 0;
      const marginUsd = parseFloat((priceUsd - feeUsd - costUsd).toFixed(2));

      return {
        id: r.id,
        kind: r.kind,
        status: r.status,
        stage: r.stage,
        healthScore: r.health_score,
        costCredits: r.cost_credits,
        costUsd,
        marginUsd,
        sessionIds: r.hyperbrowser_session_ids || [],
        createdAt: r.created_at,
        error: r.error,
      };
    }),
  });
}
