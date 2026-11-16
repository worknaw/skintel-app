-- Admin access for the web console. Add an auth user to public.admin_users after signup.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin', 'support', 'content', 'fulfillment')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and active = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists admin_users_read_self on public.admin_users;
create policy admin_users_read_self on public.admin_users
for select to authenticated using (user_id = auth.uid() or public.is_admin());

do $$
declare
  item record;
begin
  for item in select * from (values
    ('store_orders'), ('store_order_items'), ('store_payment_proofs'),
    ('skin_scans'), ('skin_analysis_results'), ('profiles'), ('skin_profiles'),
    ('products'), ('brands'), ('categories'), ('store_offers'), ('store_variants'),
    ('support_requests'), ('shipping_addresses'), ('user_settings'), ('user_favorites')
  ) as tables(name)
  loop
    execute format('drop policy if exists %I_admin_read on public.%I', item.name, item.name);
    execute format('create policy %I_admin_read on public.%I for select to authenticated using (public.is_admin())', item.name, item.name);
  end loop;
end $$;

drop policy if exists store_orders_admin_update on public.store_orders;
create policy store_orders_admin_update on public.store_orders
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists store_payment_proofs_admin_update on public.store_payment_proofs;
create policy store_payment_proofs_admin_update on public.store_payment_proofs
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists store_variants_admin_write on public.store_variants;
create policy store_variants_admin_write on public.store_variants
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists brands_admin_write on public.brands;
create policy brands_admin_write on public.brands
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists store_offers_admin_write on public.store_offers;
create policy store_offers_admin_write on public.store_offers
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists payment_proofs_admin_read on storage.objects;
create policy payment_proofs_admin_read on storage.objects
for select to authenticated using (bucket_id = 'payment-proofs' and public.is_admin());
