const mutableTestEnvironment: Record<string, string | undefined> = process.env;
import assert from 'node:assert/strict';
import { requireAccount, ownsResource } from '../lib/auth/account';
import { proxy } from '../proxy';
import { GET as getReport } from '../app/api/runs/[id]/report.pdf/route';
import { POST as checkout } from '../app/api/checkout/route';
import { getDatabaseRepository } from '../lib/db/client';
import { accountReturnPath, accountFetch } from '../lib/auth/browser';

const names = ['NODE_ENV', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
const previous = new Map(names.map(name => [name, process.env[name]]));
try {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; mutableTestEnvironment.NODE_ENV = 'production';
  assert.equal((await requireAccount(new Request('https://app.example/api/runs/private'))).response?.status, 401);
  assert.equal((await checkout(new Request('https://app.example/api/checkout', { method: 'POST', body: JSON.stringify({ runId: 'private' }) }))).status, 401);
  assert.equal((await getReport(new Request('https://app.example/api/runs/private/report.pdf'), { params: Promise.resolve({ id: 'private' }) })).status, 401);
  assert.equal(proxy().status, 501);
  assert.equal((await requireAccount(new Request('https://app.example/api/runs/private', { headers: { authorization: 'Bearer invalid' } }))).response?.status, 503);
  assert.equal(ownsResource({ userId: 'one', localDemo: false }, { user_id: 'two' }), false);
  assert.equal(ownsResource({ userId: 'one', localDemo: false }, { user_id: 'one' }), true);
  for (const path of ['https://outside.example', '//outside.example', '/\t/outside.example', '/\\outside.example', '/\n/outside.example']) { assert.equal(accountReturnPath(path), '/workspace'); await assert.rejects(accountFetch(path), /local application path/); }
  assert.equal(accountReturnPath('/runs/owned?view=report'), '/runs/owned?view=report');
  mutableTestEnvironment.NODE_ENV = 'development';
  assert.equal((await requireAccount(new Request('https://foreign.example/api/runs/private'))).response?.status, 401);
  const repo = getDatabaseRepository();
  const preview = await repo.createRun({ kind: 'preview', status: 'completed' });
  assert.equal((await getReport(new Request(`http://localhost:3000/api/runs/${preview.id}/report.pdf`), { params: Promise.resolve({ id: preview.id }) })).status, 403);
  const full = await repo.createRun({ kind: 'full', status: 'completed', health_score: null });
  await repo.saveFindings([{ id: 'untrusted', run_id: full.id, severity: 'high', category: 'UX', title: '<script>alert(1)</script>', body_json: { stepsToReproduce: [], expected: '<img src=x onerror=alert(1)>', actual: 'Untrusted text', evidence: {} }, fix_prompt: '</div><script>attack</script>', confidence: 'high' }]);
  const response = await getReport(new Request(`http://localhost:3000/api/runs/${full.id}/report.pdf`), { params: Promise.resolve({ id: full.id }) }); assert.equal(response.status, 200);
  const html = await response.text(); assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;')); assert.ok(!html.includes('<script>')); assert.ok(html.includes('Not available')); assert.ok(!html.includes('100/100')); assert.ok(response.headers.get('content-security-policy')?.includes("default-src 'none'"));
  console.log('PASS account boundaries: production auth required before payment/report access, local filesystem endpoints disabled in production, owner checks, local demo confinement, paid export gate, report escaping and truthful missing-score display');
} finally { for (const name of names) { const value = previous.get(name); if (value === undefined) delete process.env[name]; else mutableTestEnvironment[name] = value; } }
