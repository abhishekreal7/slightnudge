import { FindingRecord } from '../db/types';
import { analyzeTestResults } from '../llm/generator';
import { AnalysisReportOutput } from '../llm/schemas';
import { PipelineContext } from './types';

export async function executeStageEAnalysis(
  ctx: PipelineContext
): Promise<{ analysis: AnalysisReportOutput; findings: FindingRecord[] }> {
  if (!ctx.scenarioResults || ctx.scenarioResults.length === 0) {
    throw new Error('Stage E requires Scenario Results from Stage D');
  }

  // Aggregate evidence
  const evidenceList = ctx.scenarioResults.map((s) => ({
    scenarioId: s.id,
    verdict: s.verdict,
    consoleErrors: s.evidence_json?.consoleErrors || [],
    networkFailures: s.evidence_json?.networkFailures || [],
    screenshotIds: s.evidence_json?.screenshotIds || [],
    overflowDetected: (s.evidence_json as any)?.overflowDetected,
    scrollWidth: (s.evidence_json as any)?.scrollWidth,
    viewportWidth: (s.evidence_json as any)?.viewportWidth,
  }));

  const analysis = await analyzeTestResults(ctx.scenarioResults, evidenceList);
  ctx.analysis = analysis;

  const findings: FindingRecord[] = analysis.findings.map((f) => ({
    id: f.id,
    run_id: ctx.run.id,
    severity: f.severity,
    category: f.category,
    title: f.title,
    body_json: {
      stepsToReproduce: f.stepsToReproduce,
      expected: f.expected,
      actual: f.actual,
      likelyCause: f.likelyCause,
      evidence: f.evidence,
    },
    fix_prompt: f.fixPrompt,
    confidence: f.confidence,
  }));

  ctx.findings = findings;
  return { analysis, findings };
}
