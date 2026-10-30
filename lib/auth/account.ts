import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../db/client';

export interface RequestAccount { userId: string; email?: string; localDemo: boolean }
export async function requireAccount(request: Request): Promise<{ account: RequestAccount; response?: never } | { account?: never; response: NextResponse }> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const hostname = new URL(request.url).hostname;
  const admin = getSupabaseAdmin();
  if (!token && !admin && process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(hostname)) return { account: { userId: 'default_user', localDemo: true } };
  if (!token) return { response: NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 }) };
  if (!admin) return { response: NextResponse.json({ error: 'Account sign-in is not configured.' }, { status: 503 }) };
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return { response: NextResponse.json({ error: 'Your session has expired. Sign in again.' }, { status: 401 }) };
    return { account: { userId: data.user.id, email: data.user.email, localDemo: false } };
  } catch { return { response: NextResponse.json({ error: 'Could not verify your session. Try again.' }, { status: 503 }) }; }
}
export function ownsResource(account: RequestAccount, resource: { user_id: string }) { return account.localDemo || account.userId === resource.user_id; }
