import { generateTestPlan } from '../llm/generator';
import { TestPlanOutput } from '../llm/schemas';
import { PipelineContext } from './types';

export async function executeStageCPlanning(
  ctx: PipelineContext,
  maxScenarios: number = 12
): Promise<TestPlanOutput> {
  if (!ctx.appMap) {
    throw new Error('Stage C requires App Map from Stage B');
  }

  const effectiveMaxScenarios = ctx.config.limits?.maxScenarios || maxScenarios;
  const testPlan = await generateTestPlan(ctx.appMap, ctx.run.notes, effectiveMaxScenarios);

  ctx.testPlan = testPlan;
  return testPlan;
}
