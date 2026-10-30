'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let client: SupabaseClient | null = null;
export function getAccountClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('your-project')) return null;
  try { return client ||= createClient(url, key); } catch { return null; }
}
export async function accountFetch(input: string, options: RequestInit = {}) {
  if (!input.startsWith('/') || input.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(input)) throw new Error('Account requests must use a local application path.');
  const headers = new Headers(options.headers), auth = getAccountClient();
  if (auth) { const { data, error } = await auth.auth.getSession(); if (error) throw new Error('Could not read your session. Sign in again.'); if (data.session) headers.set('authorization', `Bearer ${data.session.access_token}`); }
  return fetch(input, { ...options, headers });
}
export function accountReturnPath(value: string | null) { return value?.startsWith('/') && !value.startsWith('//') && !/[\\\u0000-\u0020\u007f]/.test(value) ? value : '/workspace'; }
