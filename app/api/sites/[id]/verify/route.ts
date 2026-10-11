import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySiteOwnership } from '@/lib/security/ownership';

const VerifySiteSchema = z.object({
  url: z.string().url(),
  token: z.string().min(1),
  method: z.enum(['meta_tag', 'file_upload', 'dns_txt']).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = VerifySiteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { url, token, method } = parsed.data;

    // Execute real ownership verification check
    const result = await verifySiteOwnership(url, token, method);

    if (!result.verified) {
      return NextResponse.json(
        { verified: false, error: result.error || 'Verification check failed' },
        { status: 422 }
      );
    }

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
