import { z } from 'zod';

// =========================================================================
// STAGE C: TEST PLAN SCHEMAS
// =========================================================================

export const PlannedActionSchema = z.object({
  action: z.enum(['navigate', 'click', 'fill', 'submit', 'scroll', 'assert', 'wait']),
  targetSelector: z.string().optional(),
  targetDescription: z.string(),
  value: z.string().optional(),
});

export const TestScenarioPlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum([
    'happy_path',
    'validation',
    'boundary',
    'error_handling',
    'mobile_layout',
    'security_hygiene',
    'navigation',
  ]),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  viewport: z.enum(['desktop', 'mobile']),
  initialRoute: z.string(),
  goal: z.string(),
  actions: z.array(PlannedActionSchema),
});

export const TestPlanOutputSchema = z.object({
  summary: z.string(),
  scenarios: z.array(TestScenarioPlanSchema),
});

export type TestScenarioPlan = z.infer<typeof TestScenarioPlanSchema>;
export type TestPlanOutput = z.infer<typeof TestPlanOutputSchema>;

// =========================================================================
// STAGE E: ANALYSIS & FINDINGS SCHEMAS
// =========================================================================

export const FindingEvidenceSchema = z.object({
  screenshotIds: z.array(z.string()).default([]),
  consoleLines: z.array(z.string()).default([]),
  networkEntries: z
    .array(
      z.object({
        url: z.string(),
        status: z.number().optional(),
        error: z.string().optional(),
      })
    )
    .default([]),
  videoTimestamp: z.number().optional(),
});

export const FindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  category: z.enum([
    'functional',
    'validation',
    'UX',
    'mobile',
    'accessibility',
    'performance',
    'security-hygiene',
  ]),
  stepsToReproduce: z.array(z.string()).min(1),
  expected: z.string(),
  actual: z.string(),
  likelyCause: z.string(), // Clearly noted as a hypothesis
  fixPrompt: z.string(), // Ready-to-paste prompt for Cursor / Claude Code / Lovable
  confidence: z.enum(['high', 'medium', 'low']),
  evidence: FindingEvidenceSchema,
});

export const AnalysisReportOutputSchema = z.object({
  healthScore: z.number().min(0).max(100),
  healthScoreExplanation: z.string(),
  testedSummary: z.array(z.string()),
  notTestedSummary: z.array(z.string()),
  findings: z.array(FindingSchema),
});

export type Finding = z.infer<typeof FindingSchema>;
export type AnalysisReportOutput = z.infer<typeof AnalysisReportOutputSchema>;
