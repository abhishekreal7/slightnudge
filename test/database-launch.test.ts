import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { executeStageCPlanning } from '../lib/pipeline/stage-c-planning';
import { executeStageEAnalysis } from '../lib/pipeline/stage-e-analysis';
import type { PipelineContext } from '../lib/pipeline/types';
import type { RunRecord } from '../lib/db/types';

const db = new PGlite({ extensions: { uuid_ossp } });
const previousAnalysisKey = process.env.ANTHROPIC_API_KEY;
delete process.env.ANTHROPIC_API_KEY;
try {
  // Supabase supplies these identities/roles; the application migrations are
  // executed unchanged against an isolated PostgreSQL engine.
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated;`);
  for (const name of ['20261010_initial_schema.sql', '20261026_account_profiles.sql', '20261026_payment_fulfillment.sql', '20261026_server_owned_data.sql']) await db.exec(fs.readFileSync(`supabase/migrations/${name}`, 'utf8'));
  const alice = '11111111-1111-4111-8111-111111111111', bob = '22222222-2222-4222-8222-222222222222';
  await db.query('insert into auth.users(id,email) values ($1,$2),($3,$4)', [alice, 'alice@example.test', bob, 'bob@example.test']);
  assert.equal((await db.query('select * from public.profiles')).rows.length, 2);
  await db.query('update auth.users set email=$1 where id=$2', ['alice-new@example.test', alice]); assert.equal((await db.query<{ email: string }>('select email from public.profiles where id=$1', [alice])).rows[0].email, 'alice-new@example.test');
  const site = (await db.query<{ id: string }>('insert into public.sites(user_id,url,hostname,verification_token) values($1,$2,$3,$4) returning id', [alice, 'https://example.test', 'example.test', 'test-token'])).rows[0].id;
  const run = (await db.query<{ id: string }>("insert into public.runs(user_id,site_id,kind,status) values($1,$2,'preview','completed') returning id", [alice, site])).rows[0].id;
  const fulfill = (payment: string, runId = run) => db.query<{ action: string }>('select public.fulfill_scan_payment($1,$2,$3) action', [payment, runId, 9.99]);
  assert.equal((await fulfill('paid-once')).rows[0].action, 'fulfilled'); assert.equal((await fulfill('paid-once')).rows[0].action, 'duplicate_skipped');
  assert.equal((await db.query<{ count: number }>('select count(*)::int count from public.orders')).rows[0].count, 1); assert.equal((await db.query<{ count: number }>('select count(*)::int count from public.jobs')).rows[0].count, 1);
  assert.equal((await db.query<{ user_id: string }>('select user_id from public.orders')).rows[0].user_id, alice);
  const second = (await db.query<{ id: string }>("insert into public.runs(user_id,site_id,kind,status) values($1,$2,'preview','completed') returning id", [alice, site])).rows[0].id;
  await assert.rejects(fulfill('paid-once', second), /another run/);
  await db.exec(`create function public.test_reject_job() returns trigger language plpgsql as $$begin if current_setting('app.fail_jobs',true)='true' then raise exception 'injected queue failure'; end if; return new; end$$;
    create trigger test_reject_job before insert on public.jobs for each row execute function public.test_reject_job();
    set app.fail_jobs='true';`);
  await assert.rejects(fulfill('must-rollback', second), /injected queue failure/);
  assert.equal((await db.query<{ count: number }>("select count(*)::int count from public.orders where dodo_payment_id='must-rollback'")).rows[0].count, 0);
  assert.equal((await db.query<{ kind: string }>('select kind from public.runs where id=$1', [second])).rows[0].kind, 'preview');
  const ctx: PipelineContext = {
    run: { id: run, notes: null } as RunRecord, targetUrl: 'https://example.test', hostname: 'example.test', config: {},
    appMap: { targetUrl: 'https://example.test', hostname: 'example.test', frameworkHints: [], pagesFound: 1, routes: [], authRoutes: [], checkoutRoutes: [] },
    scenarioResults: [], findings: [], artifacts: [], hyperbrowserSessionIds: [], totalCreditsUsed: 0,
  };
  const plan = await executeStageCPlanning(ctx);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.ok(plan.scenarios.length > 0);
  for (const scenario of plan.scenarios) {
    assert.match(scenario.id, uuid);
    const evidence = { planKey: ctx.scenarioKeys?.[scenario.id] };
    const verdict = evidence.planKey === 'sc_signup_validation' ? 'failed' : 'passed';
    ctx.scenarioResults.push({ id: scenario.id, run_id: run, title: scenario.title, viewport: scenario.viewport, verdict, steps_json: [], evidence_json: evidence });
    await db.query('insert into public.scenarios(id,run_id,title,viewport,verdict,evidence_json) values($1,$2,$3,$4,$5,$6)', [scenario.id, run, scenario.title, scenario.viewport, verdict, JSON.stringify(evidence)]);
  }
  const { findings, analysis } = await executeStageEAnalysis(ctx);
  assert.ok(findings.some(finding => /validation/i.test(finding.title)), 'Benchmark semantics must survive ID normalization');
  for (const finding of findings) {
    assert.match(finding.id, uuid); assert.ok(analysis.findings.some(item => item.id === finding.id));
    await db.query('insert into public.findings(id,run_id,severity,category,title,body_json,fix_prompt,confidence) values($1,$2,$3,$4,$5,$6,$7,$8)', [finding.id, run, finding.severity, finding.category, finding.title, JSON.stringify(finding.body_json), finding.fix_prompt, finding.confidence]);
  }
  await db.exec("set app.fail_jobs='false'; set role authenticated;");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [alice]);
  assert.deepEqual((await db.query<{ id: string }>('select id from public.profiles')).rows.map(row => row.id), [alice]);
  await assert.rejects(db.query('select * from public.findings'), /permission denied/);
  await assert.rejects(db.query("update public.sites set ownership_verified_at=now()"), /permission denied/);
  await assert.rejects(fulfill('browser-must-not-unlock'), /permission denied/);
  await db.exec('reset role; set role anon;'); await assert.rejects(db.query('select * from public.report_links'), /permission denied/); await db.exec('reset role;');
  console.log('PASS PostgreSQL launch migrations: unchanged schema/profile trigger, real planning/analysis output persists with UUIDs, correct owner, paid unlock+job transaction, idempotency, injected queue failure rolls everything back, own-profile RLS, browser cannot unlock scans/change verification/read raw paid findings/enumerate share tokens');
} finally { await db.close(); if (previousAnalysisKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = previousAnalysisKey; }
