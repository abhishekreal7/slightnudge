import dotenv from 'dotenv';
dotenv.config();

import { createBenchmarkServer } from '../demo-app/server';
import { PipelineRunner } from '../lib/pipeline/runner';
import { getDatabaseRepository } from '../lib/db/client';

async function runPipelineIntegrationBenchmark() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 2 PIPELINE INTEGRATION BENCHMARK');
  console.log('====================================================\n');

  const PORT = 3100;
  const server = await createBenchmarkServer(PORT);
  const targetUrl = `http://localhost:${PORT}`;
  console.log(`[1] Benchmark test app running at ${targetUrl}`);

  const repo = getDatabaseRepository();
  const runner = new PipelineRunner(repo);

  try {
    const result = await runner.runPipeline({
      targetUrl,
      notes: 'Focus on signup form validation, checkout flow, runtime console exceptions, and mobile responsiveness.',
      config: {
        allowLocalhost: true,
        skipOwnershipCheck: true, // Local benchmark test bypass
        limits: {
          maxScenarios: 4,
          maxSteps: 25,
          maxMinutes: 2,
        },
      },
    });

    console.log('\n====================================================');
    console.log('📊 PIPELINE BENCHMARK EXECUTION RESULTS');
    console.log('====================================================');
    console.log(`Run ID: ${result.run.id}`);
    console.log(`Status: ${result.run.status}`);
    console.log(`Stage: ${result.run.stage}`);
    console.log(`Health Score: ${result.summary.healthScore}/100`);
    console.log(`Health Score Rationale: ${result.summary.healthScoreExplanation}`);
    console.log(`Total Findings Reported: ${result.summary.findingsCount}`);
    console.log(`Severity Breakdown: Critical=${result.summary.severityCounts.critical}, High=${result.summary.severityCounts.high}, Medium=${result.summary.severityCounts.medium}, Low=${result.summary.severityCounts.low}`);

    const storedFindings = await repo.getFindings(result.run.id);

    // Verify the 4 known seeded bugs in benchmark app
    console.log('\n--- VERIFYING KNOWN BENCHMARK DEFECTS ---');

    const knownBugs = [
      {
        key: 'validation',
        name: 'Signup Form Validation Bypass',
        matcher: (f: any) => f.category === 'validation' || f.title.toLowerCase().includes('validation'),
      },
      {
        key: '500_checkout',
        name: 'Checkout HTTP 500 Endpoint Failure',
        matcher: (f: any) =>
          f.title.includes('500') ||
          f.body_json.evidence?.networkEntries?.some((n: any) => n.status === 500) ||
          f.body_json.actual.includes('500'),
      },
      {
        key: 'console_typeerror',
        name: 'Uncaught TypeError in Console',
        matcher: (f: any) =>
          f.title.toLowerCase().includes('typeerror') ||
          f.body_json.evidence?.consoleLines?.some((c: string) => c.includes('telemetry_config')) ||
          f.body_json.actual.includes('TypeError'),
      },
      {
        key: 'mobile_overflow',
        name: 'Mobile Viewport Horizontal Overflow',
        matcher: (f: any) => f.category === 'mobile' || f.title.toLowerCase().includes('overflow'),
      },
    ];

    let knownBugsDetected = 0;
    for (const kb of knownBugs) {
      const match = storedFindings.find(kb.matcher);
      if (match) {
        knownBugsDetected++;
        console.log(`  ✅ [FOUND] ${kb.name} (ID: ${match.id})`);
        console.log(`     Severity: ${match.severity} | Category: ${match.category} | Confidence: ${match.confidence}`);
        console.log(`     Fix Prompt snippet: "${match.fix_prompt.slice(0, 100)}..."\n`);
      } else {
        console.error(`  ❌ [MISSING] ${kb.name} was not identified!`);
      }
    }

    // Check Precision & Hallucinations
    const totalFindings = storedFindings.length;
    let validRealFindings = 0;
    for (const f of storedFindings) {
      // Must match at least one verified defect category with evidence
      const isKnown = knownBugs.some((kb) => kb.matcher(f));
      if (isKnown) {
        validRealFindings++;
      } else {
        console.warn(`  ⚠️ Unverified finding (possible false positive): ${f.title}`);
      }

      // Assert fix_prompt exists and is actionable
      if (!f.fix_prompt || f.fix_prompt.length < 50) {
        throw new Error(`Finding ${f.id} does not have a complete fix prompt!`);
      }
    }

    const precisionPercent = totalFindings > 0 ? (validRealFindings / totalFindings) * 100 : 0;
    console.log('----------------------------------------------------');
    console.log(`🎯 Precision Score: ${precisionPercent.toFixed(1)}% (${validRealFindings}/${totalFindings} real bugs)`);
    console.log(`🎯 Known Defects Detection: ${knownBugsDetected}/${knownBugs.length} detected`);
    console.log('----------------------------------------------------\n');

    if (knownBugsDetected < 4) {
      throw new Error(`Benchmark failed: Expected all 4 known bugs to be detected, found ${knownBugsDetected}`);
    }

    if (precisionPercent < 90) {
      throw new Error(`Benchmark failed: Precision ${precisionPercent}% is below 90% threshold`);
    }

    console.log('🎉 PHASE 2 INTEGRATION BENCHMARK PASSED WITH 100% SUCCESS!');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    console.log('Benchmark server stopped.');
  }
}

if (process.argv[1] && process.argv[1].includes('pipeline-integration')) {
  runPipelineIntegrationBenchmark()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Benchmark test failed:', err);
      process.exit(1);
    });
}
