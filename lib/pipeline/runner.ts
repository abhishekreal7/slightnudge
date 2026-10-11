import { getDatabaseRepository, IDatabaseRepository } from '../db/client';
import { RunRecord } from '../db/types';
import { executeStageAPreflight } from './stage-a-preflight';
import { executeStageBDiscovery } from './stage-b-discovery';
import { executeStageCPlanning } from './stage-c-planning';
import { executeStageDExecution } from './stage-d-execution';
import { executeStageEAnalysis } from './stage-e-analysis';
import { executeStageFReport, FinalReportSummary } from './stage-f-report';
import { PipelineConfig, PipelineContext } from './types';

export interface PipelineRunResult {
  run: RunRecord;
  summary: FinalReportSummary;
  success: boolean;
  error?: string;
}

export class PipelineRunner {
  private repo: IDatabaseRepository;

  constructor(repo?: IDatabaseRepository) {
    this.repo = repo || getDatabaseRepository();
  }

  async runPipeline(options: {
    runId?: string;
    targetUrl: string;
    userId?: string;
    siteId?: string;
    kind?: 'preview' | 'full';
    notes?: string;
    verificationToken?: string;
    config?: PipelineConfig;
  }): Promise<PipelineRunResult> {
    const parsed = new URL(options.targetUrl);
    const hostname = parsed.hostname;

    // Create or retrieve run record
    const run = await this.repo.createRun({
      id: options.runId,
      user_id: options.userId || 'system_user',
      site_id: options.siteId || 'system_site',
      kind: options.kind || 'full',
      status: 'running',
      stage: 'preflight',
      progress: 5,
      notes: options.notes || null,
      started_at: new Date().toISOString(),
      limits_json: options.config?.limits || {},
    });

    const ctx: PipelineContext = {
      run,
      targetUrl: options.targetUrl,
      hostname,
      config: options.config || {},
      scenarioResults: [],
      findings: [],
      artifacts: [],
      hyperbrowserSessionIds: [],
      totalCreditsUsed: 0,
    };

    try {
      // =====================================================================
      // STAGE A: PREFLIGHT
      // =====================================================================
      await this.repo.updateRun(run.id, { stage: 'preflight', progress: 10 });
      console.log(`[Pipeline] Stage A: Preflight for ${options.targetUrl}`);

      const preflight = await executeStageAPreflight(ctx, options.verificationToken);
      if (!preflight.success) {
        throw new Error(preflight.error || 'Preflight checks failed');
      }

      // =====================================================================
      // STAGE B: DISCOVERY
      // =====================================================================
      await this.repo.updateRun(run.id, { stage: 'discovery', progress: 25 });
      console.log(`[Pipeline] Stage B: Discovery`);

      const maxPages = ctx.config.limits?.maxPages || 25;
      await executeStageBDiscovery(ctx, maxPages);

      // =====================================================================
      // STAGE C: PLANNING
      // =====================================================================
      await this.repo.updateRun(run.id, { stage: 'planning', progress: 45 });
      console.log(`[Pipeline] Stage C: Test Plan Generation`);

      const maxScenarios = ctx.config.limits?.maxScenarios || (options.kind === 'preview' ? 3 : 12);
      await executeStageCPlanning(ctx, maxScenarios);

      // =====================================================================
      // STAGE D: EXECUTION
      // =====================================================================
      await this.repo.updateRun(run.id, { stage: 'execution', progress: 70 });
      console.log(`[Pipeline] Stage D: Execution`);

      const execution = await executeStageDExecution(ctx);
      await this.repo.saveScenarios(ctx.scenarioResults);

      // Save artifacts
      for (const art of ctx.artifacts) {
        await this.repo.saveArtifact({
          id: `art_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          run_id: run.id,
          type: art.type,
          storage_path: art.path,
          meta_json: art.meta || {},
        });
      }

      // =====================================================================
      // STAGE E: ANALYSIS
      // =====================================================================
      await this.repo.updateRun(run.id, { stage: 'analysis', progress: 88 });
      console.log(`[Pipeline] Stage E: Analysis`);

      await executeStageEAnalysis(ctx);
      await this.repo.saveFindings(ctx.findings);

      // =====================================================================
      // STAGE F: REPORT
      // =====================================================================
      await this.repo.updateRun(run.id, { stage: 'report', progress: 95 });
      console.log(`[Pipeline] Stage F: Report`);

      const summary = executeStageFReport(ctx);

      const finalStatus = execution.isPartial ? 'partial' : 'completed';
      const updatedRun = await this.repo.updateRun(run.id, {
        status: finalStatus,
        progress: 100,
        finished_at: new Date().toISOString(),
        health_score: summary.healthScore,
        cost_credits: ctx.totalCreditsUsed,
        hyperbrowser_session_ids: ctx.hyperbrowserSessionIds,
        error: execution.partialReason || null,
        // Delete encrypted credentials on finish
        credentials_encrypted: null,
      });

      return {
        run: updatedRun,
        summary,
        success: true,
      };
    } catch (err: any) {
      console.error(`[Pipeline Error] Run ${run.id} failed:`, err.message);

      const failedRun = await this.repo.updateRun(run.id, {
        status: 'failed',
        finished_at: new Date().toISOString(),
        error: err.message,
        credentials_encrypted: null,
      });

      const fallbackSummary: FinalReportSummary = {
        runId: run.id,
        targetUrl: options.targetUrl,
        kind: run.kind,
        status: 'failed',
        healthScore: 0,
        healthScoreExplanation: `Run failed during pipeline execution: ${err.message}`,
        severityCounts: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
        testedSummary: [],
        notTestedSummary: ['Testing aborted due to preflight or execution error'],
        findingsCount: 0,
        durationSeconds: 0,
        costCredits: ctx.totalCreditsUsed,
        generatedAt: new Date().toISOString(),
      };

      return {
        run: failedRun,
        summary: fallbackSummary,
        success: false,
        error: err.message,
      };
    }
  }
}
