-- Commit the payment receipt, run unlock and queue job as one transaction.
-- This RPC is exclusively for the trusted server handling verified webhooks.
create or replace function public.fulfill_scan_payment(p_payment_id text, p_run_id uuid, p_amount_usd numeric)
returns text language plpgsql security definer set search_path = public as $$
declare target public.runs%rowtype; receipt public.orders%rowtype;
begin
  if p_payment_id is null or length(p_payment_id) = 0 or length(p_payment_id) > 200 or p_amount_usd is null or p_amount_usd <= 0 then raise exception 'Invalid payment'; end if;
  -- Serialize retries and different payment events for the same run.
  select * into target from public.runs where id = p_run_id for update;
  if not found then raise exception 'Payment run not found'; end if;
  select * into receipt from public.orders where dodo_payment_id = p_payment_id;
  if found then
    if receipt.run_id <> p_run_id then raise exception 'Payment belongs to another run'; end if;
    return 'duplicate_skipped';
  end if;
  insert into public.orders(user_id, run_id, dodo_payment_id, amount_usd, status)
    values(target.user_id, target.id, p_payment_id, p_amount_usd, 'succeeded');
  if target.kind = 'full' then return 'already_unlocked'; end if;
  update public.runs set kind = 'full', status = 'queued', stage = 'preflight', progress = 0,
    limits_json = '{"maxScenarios":12,"maxMinutes":10,"maxSteps":50}'::jsonb where id = target.id;
  insert into public.jobs(run_id, type, status) values(target.id, 'test_run', 'queued');
  return 'fulfilled';
end;
$$;
revoke all on function public.fulfill_scan_payment(text, uuid, numeric) from public, anon, authenticated;
grant execute on function public.fulfill_scan_payment(text, uuid, numeric) to service_role;
