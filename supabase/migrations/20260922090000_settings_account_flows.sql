-- Account operations take their owner from the verified JWT, never a client user ID.
create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(btrim(subject)) between 3 and 120),
  message text not null check (char_length(btrim(message)) between 10 and 4000),
  app_version text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);
create index support_requests_user_created_idx on public.support_requests(user_id, created_at desc);
alter table public.support_requests enable row level security;
revoke all on public.support_requests from anon, authenticated;
grant select on public.support_requests to authenticated;
grant insert (id, user_id, subject, message, app_version) on public.support_requests to authenticated;
create policy support_requests_read_own on public.support_requests for select to authenticated
  using ((select auth.uid()) = user_id);
create policy support_requests_insert_own on public.support_requests for insert to authenticated
  with check ((select auth.uid()) = user_id);

create function public.export_my_account()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); result jsonb;
begin
  if owner_id is null or not exists (select 1 from auth.users where id = owner_id) then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  select jsonb_build_object(
    'format_version', 1, 'exported_at', now(),
    'account', (select jsonb_build_object('id', id, 'email', email, 'created_at', created_at) from auth.users where id = owner_id),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = owner_id),
    'settings', (select to_jsonb(s) from public.user_settings s where s.user_id = owner_id),
    'support_requests', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.support_requests r where r.user_id = owner_id), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.export_my_account() from public, anon;
grant execute on function public.export_my_account() to authenticated;

create function public.delete_my_account(confirmation text)
returns void language plpgsql security definer set search_path = '' as $$
declare account_id uuid := auth.uid();
begin
  if account_id is null or not exists (select 1 from auth.users where id = account_id) then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if confirmation is distinct from 'DELETE' then
    raise exception 'Confirmation required' using errcode = '22023';
  end if;
  -- Do not orphan physical Storage objects if image uploads are introduced later.
  if exists (select 1 from storage.objects o where o.owner_id = account_id::text) then
    raise exception 'Storage cleanup required before account deletion';
  end if;
  delete from auth.users where id = account_id;
end;
$$;
revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
