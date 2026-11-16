-- Reconcile app features that exist in the client with the production schema.
-- Every owner-sensitive value is derived from auth.uid(), never from a client id.
create table if not exists public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index if not exists user_favorites_user_created_idx
  on public.user_favorites (user_id, created_at desc);
alter table public.user_favorites enable row level security;
revoke all on public.user_favorites from public, anon, authenticated;
grant select, insert, delete on public.user_favorites to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_favorites' and policyname = 'user_favorites_select_own') then
    create policy user_favorites_select_own on public.user_favorites for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_favorites' and policyname = 'user_favorites_insert_own') then
    create policy user_favorites_insert_own on public.user_favorites for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_favorites' and policyname = 'user_favorites_delete_own') then
    create policy user_favorites_delete_own on public.user_favorites for delete to authenticated using ((select auth.uid()) = user_id);
  end if;
end;
$$;

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(btrim(subject)) between 3 and 120),
  message text not null check (char_length(btrim(message)) between 10 and 4000),
  app_version text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);
create index if not exists support_requests_user_created_idx on public.support_requests(user_id, created_at desc);
alter table public.support_requests enable row level security;
revoke all on public.support_requests from public, anon, authenticated;
grant select on public.support_requests to authenticated;
grant insert (id, user_id, subject, message, app_version) on public.support_requests to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'support_requests' and policyname = 'support_requests_read_own') then
    create policy support_requests_read_own on public.support_requests for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'support_requests' and policyname = 'support_requests_insert_own') then
    create policy support_requests_insert_own on public.support_requests for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
end;
$$;

-- Export every user-owned record currently stored by SkinCycle, including the
-- shop records that were introduced after the original account export.
create or replace function public.export_my_account()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null or not exists (select 1 from auth.users where id = owner_id) then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  return jsonb_build_object(
    'format_version', 3,
    'exported_at', now(),
    'account', (select jsonb_build_object('id', id, 'email', email, 'created_at', created_at) from auth.users where id = owner_id),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = owner_id),
    'settings', (select to_jsonb(s) from public.user_settings s where s.user_id = owner_id),
    'skin_profile', (select to_jsonb(p) from public.skin_profiles p where p.user_id = owner_id),
    'favorites', coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at) from public.user_favorites f where f.user_id = owner_id), '[]'::jsonb),
    'skin_profile_consents', coalesce((select jsonb_agg(to_jsonb(c) order by c.accepted_at) from public.user_consents c where c.user_id = owner_id), '[]'::jsonb),
    'skin_scan_consents', coalesce((select jsonb_agg(to_jsonb(c) order by c.accepted_at) from public.skin_scan_consents c where c.user_id = owner_id), '[]'::jsonb),
    'skin_scans', coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at) from public.skin_scans s where s.user_id = owner_id), '[]'::jsonb),
    'skin_analysis_results', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.skin_analysis_results r where r.user_id = owner_id), '[]'::jsonb),
    'support_requests', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.support_requests r where r.user_id = owner_id), '[]'::jsonb),
    'shopping_cart_items', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from public.shopping_cart_items c where c.user_id = owner_id), '[]'::jsonb),
    'shipping_addresses', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at) from public.shipping_addresses a where a.user_id = owner_id), '[]'::jsonb),
    'store_orders', coalesce((
      select jsonb_agg(
        jsonb_build_object('order', to_jsonb(o), 'items', coalesce((
          select jsonb_agg(to_jsonb(i) order by i.variant_id) from public.store_order_items i where i.order_id = o.id and i.user_id = owner_id
        ), '[]'::jsonb)) order by o.created_at
      ) from public.store_orders o where o.user_id = owner_id
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.export_my_account() from public, anon;
grant execute on function public.export_my_account() to authenticated;

-- Orders may contain records that the shop must retain for fulfilment and
-- accounting. Do not delete an account until that retention case is handled.
create or replace function public.delete_my_account(confirmation text)
returns void language plpgsql security definer set search_path = '' as $$
declare account_id uuid := auth.uid();
begin
  if account_id is null or not exists (select 1 from auth.users where id = account_id) then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if confirmation is distinct from 'DELETE' then
    raise exception 'Confirmation required' using errcode = '22023';
  end if;
  if exists (select 1 from public.store_orders where user_id = account_id) then
    raise exception 'Order history requires store support before account deletion' using errcode = '55000';
  end if;
  if exists (select 1 from storage.objects o where o.owner_id = account_id::text) then
    raise exception 'Storage cleanup required before account deletion' using errcode = '55000';
  end if;
  delete from auth.users where id = account_id;
end;
$$;
revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
