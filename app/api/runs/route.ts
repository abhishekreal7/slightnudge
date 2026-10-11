import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDatabaseRepository } from '@/lib/db/client';
import { encryptCredentials } from '@/lib/security/encryption';
import { PipelineRunner } from '@/lib/pipeline/runner';
import {
  checkIpRateLimit,
  checkGlobalDailySpendCap,
  checkUserActiveRunLimit,
} from '@/lib/security/rate-limit';

const CreateRunSchema = z.object({
  url: z.string().url(),
  siteId: z.string().optional(),
  kind: z.enum(['preview', 'full']).default('preview'),
  notes: z.string().max(500).optional(),
  credentials: z
    .object({
      username: z.string().optional(),
      password: z.string().optional(),
    })
    .optional(),
  skipOwnershipCheck: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = CreateRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { url, siteId, kind, notes, credentials, skipOwnershipCheck } = parsed.data;

    // Rate Limiting & Spend Cap Guards
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkIpRateLimit(ip, 30);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    const spendCap = checkGlobalDailySpendCap();
    if (!spendCap.allowed) {
      return NextResponse.json({ error: spendCap.message }, { status: 503 });
    }

    const activeRunCheck = checkUserActiveRunLimit('default_user');
    if (!activeRunCheck.allowed && !url.includes('localhost')) {
      return NextResponse.json({ error: activeRunCheck.message }, { status: 429 });
    }

    let encryptedCreds: string | null = null;
    if (credentials && (credentials.username || credentials.password)) {
      encryptedCreds = encryptCredentials(JSON.stringify(credentials));
    }

    const repo = getDatabaseRepository();
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const run = await repo.createRun({
      id: runId,
      user_id: 'default_user',
      site_id: siteId || 'site_default',
      kind,
      status: 'queued',
      stage: 'preflight',
      progress: 0,
      notes: notes || null,
      credentials_encrypted: encryptedCreds,
      limits_json: {
        maxScenarios: kind === 'preview' ? 2 : 12,
        maxMinutes: kind === 'preview' ? 3 : 10,
        maxSteps: kind === 'preview' ? 15 : 50,
      },
    });

    // Create queue job for background worker
    await repo.createJob({
      run_id: runId,
      type: 'test_run',
      status: 'queued',
    });

    // In local dev/demo environment, we can also trigger execution in background
    if (process.env.NODE_ENV !== 'production' || process.env.AUTO_RUN_WORKER === 'true') {
      setTimeout(async () => {
        try {
          const runner = new PipelineRunner(repo);
          await runner.runPipeline({
            runId: run.id,
            targetUrl: url,
            kind,
            notes,
            config: {
              allowLocalhost: true,
              skipOwnershipCheck: skipOwnershipCheck ?? true,
              limits: run.limits_json,
            },
          });
        } catch (e: any) {
          console.error('[Async Run Trigger Error]:', e.message);
        }
      }, 100);
    }

    return NextResponse.json({
      success: true,
      runId: run.id,
      kind: run.kind,
      status: run.status,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create run' }, { status: 500 });
  }
}
