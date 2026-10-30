-- Apply with the existing schema before enabling hosted account signup.
-- Account identity comes from auth.users, never from a browser-supplied user_id.
create or replace function public.sync_account_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email) values (new.id, coalesce(new.email, ''))
    on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
revoke all on function public.sync_account_profile() from public;
drop trigger if exists sync_account_profile on auth.users;
create trigger sync_account_profile after insert or update of email on auth.users
  for each row execute function public.sync_account_profile();
insert into public.profiles(id, email) select id, coalesce(email, '') from auth.users
  on conflict (id) do nothing;
