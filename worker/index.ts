import dotenv from 'dotenv';
dotenv.config();

import { getDatabaseRepository } from '../lib/db/client';
import { PipelineRunner } from '../lib/pipeline/runner';

const WORKER_ID = `worker_${process.pid}_${Math.random().toString(36).slice(2, 7)}`;
let isRunning = true;

async function runWorkerLoop() {
  const repo = getDatabaseRepository();
  const runner = new PipelineRunner(repo);

  console.log(`[Worker] Started background worker: ${WORKER_ID}`);
  console.log('[Worker] Polling for jobs from database queue...');

  while (isRunning) {
    try {
      const job = await repo.claimNextJob(WORKER_ID);

      if (job) {
        console.log(`[Worker] Claimed job ${job.id} for run ${job.run_id}`);

        const runRecord = await repo.getRun(job.run_id);
        if (!runRecord) {
          console.error(`[Worker] Run ${job.run_id} not found for job ${job.id}`);
          await repo.failJob(job.id, 'Associated run record not found');
          continue;
        }

        // Fetch site details for targetUrl
        const targetUrl = (runRecord as any).target_url || 'http://localhost:3100';

        const result = await runner.runPipeline({
          runId: runRecord.id,
          targetUrl,
          userId: runRecord.user_id,
          siteId: runRecord.site_id,
          kind: runRecord.kind,
          notes: runRecord.notes || undefined,
          config: {
            allowLocalhost: true,
            skipOwnershipCheck: true,
            limits: runRecord.limits_json,
          },
        });

        if (result.success) {
          await repo.completeJob(job.id);
          console.log(`[Worker] Successfully completed job ${job.id}`);
        } else {
          await repo.failJob(job.id, result.error || 'Pipeline execution failed');
          console.warn(`[Worker] Job ${job.id} failed: ${result.error}`);
        }
      } else {
        // No jobs in queue, idle wait
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (loopErr: any) {
      console.error('[Worker Loop Error]:', loopErr.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log('[Worker] Gracefully shut down.');
}

process.on('SIGINT', () => {
  console.log('\n[Worker] Received SIGINT, stopping...');
  isRunning = false;
});

process.on('SIGTERM', () => {
  console.log('\n[Worker] Received SIGTERM, stopping...');
  isRunning = false;
});

if (process.argv[1] && (process.argv[1].endsWith('worker/index.ts') || process.argv[1].endsWith('worker\\index.ts'))) {
  runWorkerLoop().catch((err) => {
    console.error('[Worker Fatal Error]:', err);
    process.exit(1);
  });
}
