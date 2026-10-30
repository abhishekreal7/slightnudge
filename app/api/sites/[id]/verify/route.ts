import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySiteOwnership } from '@/lib/security/ownership';
import { requireAccount, ownsResource } from '@/lib/auth/account';
import { getDatabaseRepository } from '@/lib/db/client';
import { validateTargetUrl } from '@/lib/security/ssrf';

const VerifySiteSchema = z.object({
  url: z.string().url(),
  token: z.string().min(1),
  method: z.enum(['meta_tag', 'file_upload', 'dns_txt']).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAccount(req); if (auth.response) return auth.response;
  try {
    const { id } = await params;
    const repo = getDatabaseRepository(); const site = await repo.getSite(id);
    if (!site || !ownsResource(auth.account, site)) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    const body = await req.json();
    const parsed = VerifySiteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { url, token, method } = parsed.data;
    if (new URL(url).origin !== new URL(site.url).origin || token !== site.verification_token) return NextResponse.json({ error: 'Use the registered site URL and verification token.' }, { status: 400 });
    const target = await validateTargetUrl(url); if (!target.isValid) return NextResponse.json({ error: target.error || 'Invalid site URL' }, { status: 400 });

    // Execute real ownership verification check
    const result = await verifySiteOwnership(url, token, method);

    if (!result.verified) {
      return NextResponse.json(
        { verified: false, error: result.error || 'Verification check failed' },
        { status: 422 }
      );
    }

    await repo.updateSite(id, { ownership_verified_at: new Date().toISOString(), ownership_method: result.method || method || site.ownership_method });
    return NextResponse.json({
      verified: true,
      siteId: id,
      method: result.method,
      verifiedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
