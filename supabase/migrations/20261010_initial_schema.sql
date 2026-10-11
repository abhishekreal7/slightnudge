-- Supabase Migration: 20261010_initial_schema.sql
-- ShipCheck Database Schema with strict RLS

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  created_at timestamptz not null default now()
);

-- 2. SITES
create table if not exists public.sites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  url text not null,
  hostname text not null,
  verification_token text not null,
  ownership_method text check (ownership_method in ('meta_tag', 'file_upload', 'dns_txt')),
  ownership_verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_sites_user_id on public.sites(user_id);
create index if not exists idx_sites_hostname on public.sites(hostname);

-- 3. RUNS
create type run_kind as enum ('preview', 'full');
create type run_status as enum ('queued', 'running', 'partial', 'completed', 'failed', 'refunded');

create table if not exists public.runs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  site_id uuid references public.sites(id) on delete cascade not null,
  kind run_kind not null default 'full',
  status run_status not null default 'queued',
  stage text not null default 'preflight', -- preflight, discovery, planning, execution, analysis, report
  progress integer not null default 0, -- 0 to 100
  notes text,
  credentials_encrypted text, -- AES-256-GCM ciphertext
  limits_json jsonb not null default '{}'::jsonb,
  hyperbrowser_session_ids text[] not null default '{}',
  cost_credits numeric(10, 4) not null default 0.0000,
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  health_score integer,
  created_at timestamptz not null default now()
);
create index if not exists idx_runs_user_id on public.runs(user_id);
create index if not exists idx_runs_site_id on public.runs(site_id);
create index if not exists idx_runs_status on public.runs(status);

-- 4. SCENARIOS
create table if not exists public.scenarios (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid references public.runs(id) on delete cascade not null,
  title text not null,
  viewport text not null check (viewport in ('desktop', 'mobile')),
  verdict text not null check (verdict in ('passed', 'failed', 'skipped', 'error')),
  steps_json jsonb not null default '[]'::jsonb,
  evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_scenarios_run_id on public.scenarios(run_id);

-- 5. FINDINGS
create type finding_severity as enum ('critical', 'high', 'medium', 'low');
create type finding_category as enum ('functional', 'validation', 'UX', 'mobile', 'accessibility', 'performance', 'security-hygiene');

create table if not exists public.findings (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid references public.runs(id) on delete cascade not null,
  severity finding_severity not null,
  category finding_category not null,
  title text not null,
  body_json jsonb not null default '{}'::jsonb, -- stepsToReproduce, expected, actual, likelyCause
  fix_prompt text not null,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  created_at timestamptz not null default now()
);
create index if not exists idx_findings_run_id on public.findings(run_id);

-- 6. ARTIFACTS
create type artifact_type as enum ('screenshot', 'video', 'pdf');

create table if not exists public.artifacts (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid references public.runs(id) on delete cascade not null,
  type artifact_type not null,
  storage_path text not null,
  meta_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_artifacts_run_id on public.artifacts(run_id);

-- 7. ORDERS
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  run_id uuid references public.runs(id) on delete cascade not null,
  dodo_payment_id text not null unique, -- Idempotency guarantee
  amount_usd numeric(10, 2) not null,
  status text not null, -- succeeded, failed, refunded
  created_at timestamptz not null default now()
);
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_dodo_id on public.orders(dodo_payment_id);

-- 8. JOBS (Worker Queue)
create table if not exists public.jobs (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid references public.runs(id) on delete cascade not null,
  type text not null default 'test_run',
  status text not null check (status in ('queued', 'running', 'completed', 'failed')),
  attempts integer not null default 0,
  run_after timestamptz not null default now(),
  locked_by text,
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_jobs_status_run_after on public.jobs(status, run_after);

-- 9. REPORT_LINKS (Unguessable Share Links)
create table if not exists public.report_links (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid references public.runs(id) on delete cascade not null,
  token text not null unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_report_links_token on public.report_links(token);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.runs enable row level security;
alter table public.scenarios enable row level security;
alter table public.findings enable row level security;
alter table public.artifacts enable row level security;
alter table public.orders enable row level security;
alter table public.jobs enable row level security;
alter table public.report_links enable row level security;

-- PROFILES RLS
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- SITES RLS
create policy "Users can CRUD own sites" on public.sites
  for all using (auth.uid() = user_id);

-- RUNS RLS
create policy "Users can read own runs" on public.runs
  for select using (auth.uid() = user_id);

create policy "Users can insert own runs" on public.runs
  for insert with check (auth.uid() = user_id);

-- SCENARIOS RLS
create policy "Users can read scenarios for own runs" on public.scenarios
  for select using (
    exists (select 1 from public.runs where runs.id = scenarios.run_id and runs.user_id = auth.uid())
  );

-- FINDINGS RLS
create policy "Users can read findings for own runs" on public.findings
  for select using (
    exists (select 1 from public.runs where runs.id = findings.run_id and runs.user_id = auth.uid())
  );

-- ARTIFACTS RLS
create policy "Users can read artifacts for own runs" on public.artifacts
  for select using (
    exists (select 1 from public.runs where runs.id = artifacts.run_id and runs.user_id = auth.uid())
  );

-- ORDERS RLS
create policy "Users can read own orders" on public.orders
  for select using (auth.uid() = user_id);

-- JOBS RLS: Worker uses service role key. Normal users cannot access queue.
create policy "Deny all user access to jobs" on public.jobs
  for all using (false);

-- REPORT_LINKS RLS: Public can view unexpired token links
create policy "Public can view valid shared report links" on public.report_links
  for select using (expires_at is null or expires_at > now());

create policy "Users can manage report links for own runs" on public.report_links
  for all using (
    exists (select 1 from public.runs where runs.id = report_links.run_id and runs.user_id = auth.uid())
  );
