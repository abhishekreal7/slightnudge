import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDatabaseRepository } from '@/lib/db/client';
import { encryptCredentials } from '@/lib/security/encryption';
import { PipelineRunner } from '@/lib/pipeline/runner';
import { requireAccount, ownsResource } from '@/lib/auth/account';
import { randomUUID } from 'node:crypto';
import { validateTargetUrl } from '@/lib/security/ssrf';
import { generateVerificationToken } from '@/lib/security/ownership';
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
  const auth = await requireAccount(req); if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const parsed = CreateRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { url, siteId, kind, notes, credentials, skipOwnershipCheck } = parsed.data;
    if (kind === 'full' && !auth.account.localDemo) return NextResponse.json({ error: 'Create a preview, then use checkout to unlock the full scan.' }, { status: 403 });
    const targetCheck = await validateTargetUrl(url, { allowLocalhost: auth.account.localDemo });
    if (!targetCheck.isValid) return NextResponse.json({ error: targetCheck.error || 'Invalid target URL' }, { status: 400 });

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

    const activeRunCheck = checkUserActiveRunLimit(auth.account.userId);
    if (!activeRunCheck.allowed && !url.includes('localhost')) {
      return NextResponse.json({ error: activeRunCheck.message }, { status: 429 });
    }

    let encryptedCreds: string | null = null;
    if (credentials && (credentials.username || credentials.password)) {
      encryptedCreds = encryptCredentials(JSON.stringify(credentials));
    }

    const repo = getDatabaseRepository();
    let site = siteId ? await repo.getSite(siteId) : null;
    if (siteId && (!site || !ownsResource(auth.account, site))) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    if (site && new URL(site.url).origin !== new URL(url).origin) return NextResponse.json({ error: 'Choose a URL on the registered site.' }, { status: 400 });
    if (!auth.account.localDemo && !site?.ownership_verified_at) return NextResponse.json({ error: 'Verify ownership of your site before starting a scan.' }, { status: 422 });
    if (!site) site = await repo.createSite({ user_id: auth.account.userId, url, hostname: new URL(url).hostname, verification_token: generateVerificationToken(new URL(url).hostname), ownership_method: 'meta_tag', ownership_verified_at: null });
    const runId = randomUUID();
    const runSite = site;

    const run = await repo.createRun({
      id: runId,
      user_id: auth.account.userId,
      site_id: site.id,
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
    if (process.env.NODE_ENV !== 'production' && process.env.AUTO_RUN_WORKER !== 'false') {
      setTimeout(async () => {
        try {
          const runner = new PipelineRunner(repo);
          await runner.runPipeline({
            runId: run.id,
            targetUrl: url,
            userId: auth.account.userId,
            siteId: runSite.id,
            verificationToken: runSite.verification_token,
            kind,
            notes,
            config: {
              allowLocalhost: auth.account.localDemo,
              skipOwnershipCheck: auth.account.localDemo && (skipOwnershipCheck ?? true),
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
