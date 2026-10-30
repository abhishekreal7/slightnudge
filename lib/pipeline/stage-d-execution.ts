import path from 'path';
import fs from 'fs';
import { getBrowserProvider, BrowserSession } from '../browser';
import { ScenarioRecord } from '../db/types';
import { PipelineContext } from './types';
import { TestScenarioPlan } from '../llm/schemas';

export async function executeStageDExecution(
  ctx: PipelineContext
): Promise<{ scenarioResults: ScenarioRecord[]; isPartial: boolean; partialReason?: string }> {
  if (!ctx.testPlan) {
    throw new Error('Stage D requires Test Plan from Stage C');
  }

  const provider = getBrowserProvider();
  const startTime = Date.now();
  const scenarioResults: ScenarioRecord[] = [];

  const maxMinutes = ctx.config.limits?.maxMinutes || 10;
  const maxStepsTotal = ctx.config.limits?.maxSteps || 50;
  const maxCreditsTotal = ctx.config.limits?.maxCostCredits || 15.0;

  let totalStepsExecuted = 0;
  let isPartial = false;
  let partialReason: string | undefined;

  const screenshotsDir = path.resolve(process.cwd(), 'recordings', 'screenshots', ctx.run.id);
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const scenariosToRun = ctx.testPlan.scenarios;

  for (const scenario of scenariosToRun) {
    // Check timeout limit
    const elapsedMinutes = (Date.now() - startTime) / 60000;
    if (elapsedMinutes >= maxMinutes) {
      isPartial = true;
      partialReason = `Execution exceeded maximum allowed time limit (${maxMinutes} minutes)`;
      break;
    }

    // Check step limit
    if (totalStepsExecuted >= maxStepsTotal) {
      isPartial = true;
      partialReason = `Execution exceeded maximum step cap (${maxStepsTotal} steps)`;
      break;
    }

    // Check credits limit
    if (ctx.totalCreditsUsed >= maxCreditsTotal) {
      isPartial = true;
      partialReason = `Execution reached maximum credit spend cap (${maxCreditsTotal} credits)`;
      break;
    }

    const scenarioResult = await runSingleScenario(
      ctx,
      provider,
      scenario,
      screenshotsDir,
      startTime
    );

    scenarioResults.push(scenarioResult);
    totalStepsExecuted += scenarioResult.steps_json.length;

    // Track credits
    try {
      const lastSessionId = ctx.hyperbrowserSessionIds[ctx.hyperbrowserSessionIds.length - 1];
      if (lastSessionId) {
        const costReport = await provider.getSessionCost(lastSessionId);
        ctx.totalCreditsUsed += costReport.creditsUsed;
      }
    } catch (e) {}
  }

  ctx.scenarioResults = scenarioResults;
  return { scenarioResults, isPartial, partialReason };
}

async function runSingleScenario(
  ctx: PipelineContext,
  provider: any,
  plan: TestScenarioPlan,
  screenshotsDir: string,
  runStartTime: number
): Promise<ScenarioRecord> {
  const isMobile = plan.viewport === 'mobile';
  let session: BrowserSession | null = null;
  const scenarioStartSec = (Date.now() - runStartTime) / 1000;

  const consoleErrors: Array<{ type: string; text: string }> = [];
  const networkFailures: Array<{ url: string; status?: number; error?: string }> = [];
  const screenshotIds: string[] = [];
  const steps: Array<{
    stepNumber: number;
    action: string;
    goal?: string;
    screenshotId?: string;
    error?: string;
  }> = [];

  let verdict: 'passed' | 'failed' | 'error' = 'passed';
  let overflowInfo: { overflow: boolean; scrollWidth?: number; viewportWidth?: number } | null = null;

  try {
    session = await provider.createSession({
      viewport: isMobile ? 'mobile' : 'desktop',
      enableVideo: true,
    });
    ctx.hyperbrowserSessionIds.push(session!.id);

    const { page } = await provider.connectPlaywright(session);

    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ type: 'error', text: msg.text() });
      }
    });

    page.on('response', (resp: any) => {
      if (resp.status() >= 400) {
        networkFailures.push({ url: resp.url(), status: resp.status() });
      }
    });

    page.on('requestfailed', (req: any) => {
      networkFailures.push({
        url: req.url(),
        error: req.failure()?.errorText || 'Failed request',
      });
    });

    // Navigate to initial route
    const initialUrl = new URL(plan.initialRoute || '/', ctx.targetUrl).toString();
    await page.goto(initialUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(500);

    const initialShot = path.join(screenshotsDir, `shot_${plan.id}_init_${Date.now()}.png`);
    await page.screenshot({ path: initialShot });
    screenshotIds.push(initialShot);
    ctx.artifacts.push({ type: 'screenshot', path: initialShot, meta: { scenarioId: plan.id } });

    // Execute planned actions
    let stepNum = 1;
    for (const action of plan.actions) {
      steps.push({
        stepNumber: stepNum,
        action: `${action.action} on ${action.targetDescription}`,
        goal: action.targetDescription,
      });

      try {
        if (action.action === 'click' && action.targetSelector) {
          await page.click(action.targetSelector, { timeout: 3000 });
          await page.waitForTimeout(500);
        } else if (action.action === 'fill' && action.targetSelector && action.value) {
          await page.fill(action.targetSelector, action.value, { timeout: 3000 });
        } else if (action.action === 'scroll') {
          await page.evaluate(() => window.scrollBy(0, 500));
          await page.waitForTimeout(300);
        } else if (action.action === 'wait') {
          await page.waitForTimeout(1000);
        }
      } catch (stepErr: any) {
        steps[steps.length - 1].error = stepErr.message;
      }
      stepNum++;
    }

    // Check assertions / verdicts
    if (plan.category === 'mobile_layout' || isMobile) {
      const vpSize = page.viewportSize() || { width: 390, height: 844 };
      const overflow = await page.evaluate((expectedWidth: number) => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: expectedWidth,
          overflow: document.documentElement.scrollWidth > expectedWidth,
        };
      }, vpSize.width);

      overflowInfo = overflow;
      if (overflow.overflow) {
        verdict = 'failed';
      }
    }

    if (plan.category === 'validation') {
      // Check if validation bypassed without error feedback
      const validationFailed = await page.evaluate(() => {
        const resultText = document.body.innerText;
        return resultText.includes('Account created with email: invalid') || resultText.includes('not-an-email');
      });
      if (validationFailed) {
        verdict = 'failed';
      }
    }

    if (networkFailures.some((n) => (n.status && n.status >= 500) || n.error)) {
      verdict = 'failed';
    }

    if (consoleErrors.length > 0 && plan.category === 'error_handling') {
      verdict = 'failed';
    }

    const finalShot = path.join(screenshotsDir, `shot_${plan.id}_final_${Date.now()}.png`);
    await page.screenshot({ path: finalShot });
    screenshotIds.push(finalShot);
    ctx.artifacts.push({ type: 'screenshot', path: finalShot, meta: { scenarioId: plan.id } });
  } catch (err: any) {
    verdict = 'error';
    steps.push({
      stepNumber: steps.length + 1,
      action: 'Execution crashed',
      error: err.message,
    });
  } finally {
    if (session) {
      await provider.stopSession(session.id);
    }
  }

  const scenarioEndSec = (Date.now() - runStartTime) / 1000;

  return {
    id: plan.id,
    run_id: ctx.run.id,
    title: plan.title,
    viewport: plan.viewport,
    verdict,
    steps_json: steps,
    evidence_json: {
      planKey: ctx.scenarioKeys?.[plan.id],
      consoleErrors,
      networkFailures,
      screenshotIds,
      overflowDetected: overflowInfo?.overflow || false,
      scrollWidth: overflowInfo?.scrollWidth,
      viewportWidth: overflowInfo?.viewportWidth,
      videoTimestampRange: { startSec: scenarioStartSec, endSec: scenarioEndSec },
    },
  };
}
