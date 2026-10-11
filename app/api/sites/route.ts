import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validateTargetUrl } from '@/lib/security/ssrf';
import { generateVerificationToken } from '@/lib/security/ownership';
import { getDatabaseRepository } from '@/lib/db/client';

const CreateSiteSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  ownershipMethod: z.enum(['meta_tag', 'file_upload', 'dns_txt']).default('meta_tag'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = CreateSiteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { url, ownershipMethod } = parsed.data;

    // Security SSRF check
    const ssrfCheck = await validateTargetUrl(url);
    if (!ssrfCheck.isValid) {
      return NextResponse.json({ error: ssrfCheck.error || 'Disallowed target URL' }, { status: 400 });
    }

    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const token = generateVerificationToken(hostname);

    const repo = getDatabaseRepository();
    // Register site record
    const site = {
      id: `site_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      user_id: 'default_user',
      url,
      hostname,
      verification_token: token,
      ownership_method: ownershipMethod,
      ownership_verified_at: null,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      site,
      verificationInstructions: {
        token,
        meta_tag: `<meta name="shipcheck-verification" content="${token}">`,
        file_upload: {
          path: '/.well-known/shipcheck-verify.txt',
          content: token,
        },
        dns_txt: `shipcheck-site-verification=${token}`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to register site' }, { status: 500 });
  }
}
