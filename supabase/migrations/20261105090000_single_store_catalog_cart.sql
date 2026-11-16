-- Store inventory is distinct from the example external offers in the catalogue.
-- Do not populate this table with sample prices or inventory.
create table public.store_variants (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id),
  sku text not null unique check (char_length(btrim(sku)) between 1 and 80),
  label text not null check (char_length(btrim(label)) between 1 and 120),
  price_minor integer not null check (price_minor >= 0),
  currency text not null default 'THB' check (currency = 'THB'),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index store_variants_product_idx on public.store_variants(product_id) where active;
alter table public.store_variants enable row level security;
revoke all on public.store_variants from public, anon, authenticated;
grant select on public.store_variants to anon, authenticated;
create policy store_variants_public_read on public.store_variants for select to anon, authenticated
  using (active and exists (select 1 from public.products p where p.id = product_id and p.active));

create table public.shopping_cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  variant_id uuid not null references public.store_variants(id),
  quantity integer not null check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, variant_id)
);
alter table public.shopping_cart_items enable row level security;
revoke all on public.shopping_cart_items from public, anon, authenticated;
grant select, insert, update, delete on public.shopping_cart_items to authenticated;
create policy shopping_cart_select_own on public.shopping_cart_items for select to authenticated using ((select auth.uid()) = user_id);
create policy shopping_cart_insert_own on public.shopping_cart_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy shopping_cart_update_own on public.shopping_cart_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy shopping_cart_delete_own on public.shopping_cart_items for delete to authenticated using ((select auth.uid()) = user_id);

create table public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient text not null check (char_length(btrim(recipient)) between 1 and 120),
  phone text not null check (char_length(btrim(phone)) between 6 and 30),
  address_line text not null check (char_length(btrim(address_line)) between 1 and 500),
  subdistrict text not null check (char_length(btrim(subdistrict)) between 1 and 120),
  district text not null check (char_length(btrim(district)) between 1 and 120),
  province text not null check (char_length(btrim(province)) between 1 and 120),
  postal_code text not null check (postal_code ~ '^[0-9]{5}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shipping_addresses_user_idx on public.shipping_addresses(user_id, created_at desc);
alter table public.shipping_addresses enable row level security;
revoke all on public.shipping_addresses from public, anon, authenticated;
grant select, insert, update, delete on public.shipping_addresses to authenticated;
create policy shipping_addresses_select_own on public.shipping_addresses for select to authenticated using ((select auth.uid()) = user_id);
create policy shipping_addresses_insert_own on public.shipping_addresses for insert to authenticated with check ((select auth.uid()) = user_id);
create policy shipping_addresses_update_own on public.shipping_addresses for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy shipping_addresses_delete_own on public.shipping_addresses for delete to authenticated using ((select auth.uid()) = user_id);
