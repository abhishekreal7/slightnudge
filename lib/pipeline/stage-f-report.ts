import { PipelineContext } from './types';

export interface FinalReportSummary {
  runId: string;
  targetUrl: string;
  kind: 'preview' | 'full';
  status: string;
  healthScore: number;
  healthScoreExplanation: string;
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  testedSummary: string[];
  notTestedSummary: string[];
  findingsCount: number;
  durationSeconds: number;
  costCredits: number;
  generatedAt: string;
}

export function executeStageFReport(ctx: PipelineContext): FinalReportSummary {
  const analysis = ctx.analysis;
  const findings = ctx.findings || [];

  const counts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
    total: findings.length,
  };

  // Health score calculation formula:
  // Starts at 100.
  // Critical bug: -25 pts
  // High bug: -15 pts
  // Medium bug: -8 pts
  // Low bug: -3 pts
  // Bounded between 0 and 100.
  const penalty = counts.critical * 25 + counts.high * 15 + counts.medium * 8 + counts.low * 3;
  const computedHealthScore = Math.max(0, 100 - penalty);

  const durationSeconds = ctx.run.started_at
    ? Math.round((Date.now() - new Date(ctx.run.started_at).getTime()) / 1000)
    : 0;

  return {
    runId: ctx.run.id,
    targetUrl: ctx.targetUrl,
    kind: ctx.run.kind,
    status: ctx.run.status,
    healthScore: analysis?.healthScore ?? computedHealthScore,
    healthScoreExplanation:
      analysis?.healthScoreExplanation ??
      `Calculated by deducting penalty points from 100 for confirmed defects: ${counts.critical} critical (-25 ea), ${counts.high} high (-15 ea), ${counts.medium} medium (-8 ea), ${counts.low} low (-3 ea).`,
    severityCounts: counts,
    testedSummary: analysis?.testedSummary || [
      'Page routing & discovery',
      'Form validation & submissions',
      'Runtime console errors',
      'Network HTTP error responses',
    ],
    notTestedSummary: analysis?.notTestedSummary || [
      'Live external payment charges (destructive action guardrail)',
      'Cross-domain third-party OAuth flows (scope lock)',
    ],
    findingsCount: findings.length,
    durationSeconds,
    costCredits: ctx.totalCreditsUsed,
    generatedAt: new Date().toISOString(),
  };
}
