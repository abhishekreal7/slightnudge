-- Browser clients authenticate with Supabase; application data is served by
-- authenticated server routes. Direct table writes must not bypass payment,
-- ownership verification, or report-redaction checks.
revoke all on public.sites, public.runs, public.scenarios, public.findings,
  public.artifacts, public.orders, public.jobs, public.report_links from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.profiles, public.sites, public.runs,
  public.scenarios, public.findings, public.artifacts, public.orders, public.jobs,
  public.report_links to service_role;
drop policy if exists "Public can view valid shared report links" on public.report_links;
