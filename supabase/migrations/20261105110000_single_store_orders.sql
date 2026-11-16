-- Checkout stays unavailable until the store owner sets a shipping fee and enables it.
-- Clients never provide prices, totals, stock changes, or order status.
create table public.store_checkout_config (
  singleton boolean primary key default true check (singleton),
  checkout_enabled boolean not null default false,
  shipping_fee_minor integer check (shipping_fee_minor is null or shipping_fee_minor >= 0)
);
insert into public.store_checkout_config (singleton) values (true);
alter table public.store_checkout_config enable row level security;
revoke all on public.store_checkout_config from public, anon, authenticated;

-- This exposes only store-wide availability and delivery fee. Store payment
-- credentials and administrative controls stay private.
create function public.get_store_checkout_config()
returns table(checkout_enabled boolean, shipping_fee_minor integer)
language sql stable security definer set search_path = '' as $$
  select config.checkout_enabled, config.shipping_fee_minor
  from public.store_checkout_config config
  where config.singleton;
$$;
revoke all on function public.get_store_checkout_config() from public, anon;
grant execute on function public.get_store_checkout_config() to authenticated;

create table public.store_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  request_id uuid not null,
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment', 'cancelled', 'paid', 'shipped', 'completed')),
  address_snapshot jsonb not null,
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  shipping_fee_minor integer not null check (shipping_fee_minor >= 0),
  total_minor bigint not null check (total_minor = subtotal_minor + shipping_fee_minor),
  currency text not null default 'THB' check (currency = 'THB'),
  created_at timestamptz not null default now(),
  unique (user_id, request_id),
  unique (id, user_id)
);
create index store_orders_owner_created_idx on public.store_orders(user_id, created_at desc);

create table public.store_order_items (
  order_id uuid not null,
  user_id uuid not null,
  variant_id uuid not null references public.store_variants(id),
  product_name text not null,
  variant_label text not null,
  unit_price_minor integer not null check (unit_price_minor >= 0),
  quantity integer not null check (quantity between 1 and 99),
  primary key (order_id, variant_id),
  foreign key (order_id, user_id) references public.store_orders(id, user_id) on delete cascade
);
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;
revoke all on public.store_orders, public.store_order_items from public, anon, authenticated;
grant select on public.store_orders, public.store_order_items to authenticated;
create policy store_orders_select_own on public.store_orders for select to authenticated using ((select auth.uid()) = user_id);
create policy store_order_items_select_own on public.store_order_items for select to authenticated using ((select auth.uid()) = user_id);

-- p_direct_items is null for a cart checkout. It is a JSON array of
-- { variant_id: UUID, quantity: 1..99 } for a Buy now checkout.
-- Values are accepted only as a selection. Price, stock, name and totals are
-- read and snapshotted inside this transaction.
create function public.create_store_order(
  p_address_id uuid,
  p_request_id uuid,
  p_direct_items jsonb default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  order_id uuid;
  address_snapshot jsonb;
  shipping_fee integer;
  order_subtotal bigint := 0;
  item record;
  direct_item jsonb;
  selected_items jsonb := '[]'::jsonb;
  selected_variant_ids uuid[] := array[]::uuid[];
  selected_quantities integer[] := array[]::integer[];
  requested_variant_id uuid;
  requested_quantity integer;
  item_count integer := 0;
begin
  if owner_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_address_id is null or p_request_id is null then
    raise exception 'Address and request ID required' using errcode = '22023';
  end if;

  -- Serialise order creation per customer. A repeat request returns its original
  -- order instead of creating a second stock deduction.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 31));
  select id into order_id from public.store_orders where user_id = owner_id and request_id = p_request_id;
  if found then return order_id; end if;

  select shipping_fee_minor into shipping_fee
    from public.store_checkout_config where singleton and checkout_enabled for share;
  if not found or shipping_fee is null then
    raise exception 'Checkout is unavailable' using errcode = '55000';
  end if;

  select jsonb_build_object(
    'recipient', recipient, 'phone', phone, 'address_line', address_line,
    'subdistrict', subdistrict, 'district', district, 'province', province, 'postal_code', postal_code
  ) into address_snapshot
  from public.shipping_addresses
  where id = p_address_id and user_id = owner_id
  for share;
  if not found then
    raise exception 'Address not found' using errcode = '22023';
  end if;

  if p_direct_items is not null then
    if jsonb_typeof(p_direct_items) <> 'array' or jsonb_array_length(p_direct_items) = 0 then
      raise exception 'Buy now items are invalid' using errcode = '22023';
    end if;
    for direct_item in select value from jsonb_array_elements(p_direct_items)
    loop
      if jsonb_typeof(direct_item) <> 'object'
        or not (direct_item ? 'variant_id')
        or not (direct_item ? 'quantity')
        or (direct_item->>'variant_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or (direct_item->>'quantity') !~ '^[0-9]+$'
      then
        raise exception 'Buy now items are invalid' using errcode = '22023';
      end if;
      requested_variant_id := (direct_item->>'variant_id')::uuid;
      requested_quantity := (direct_item->>'quantity')::integer;
      if requested_quantity not between 1 and 99 or requested_variant_id = any(selected_variant_ids) then
        raise exception 'Buy now items are invalid' using errcode = '22023';
      end if;
      selected_variant_ids := array_append(selected_variant_ids, requested_variant_id);
      selected_quantities := array_append(selected_quantities, requested_quantity);
    end loop;

    -- Stable variant order avoids deadlocks when buyers compete for stock.
    for item in
      select requested.variant_id, requested.quantity, v.stock, v.active, v.price_minor, v.label, p.name, p.active as product_active
      from unnest(selected_variant_ids, selected_quantities) as requested(variant_id, quantity)
      join public.store_variants v on v.id = requested.variant_id
      join public.products p on p.id = v.product_id
      order by v.id for update of v
    loop
      if not item.active or not item.product_active or item.stock < item.quantity then
        raise exception 'Item unavailable or insufficient stock' using errcode = '22023';
      end if;
      selected_items := selected_items || jsonb_build_array(jsonb_build_object(
        'variant_id', item.variant_id, 'quantity', item.quantity, 'price_minor', item.price_minor,
        'variant_label', item.label, 'product_name', item.name
      ));
      order_subtotal := order_subtotal + item.price_minor::bigint * item.quantity;
      item_count := item_count + 1;
    end loop;
    if item_count <> cardinality(selected_variant_ids) then
      raise exception 'Item unavailable or insufficient stock' using errcode = '22023';
    end if;
  else
    -- Capture a locked cart snapshot once. New cart rows inserted concurrently
    -- remain in the cart and cannot leak into this order after validation.
    for item in
      select c.variant_id, c.quantity, v.stock, v.active, v.price_minor, v.label, p.name, p.active as product_active
      from public.shopping_cart_items c
      join public.store_variants v on v.id = c.variant_id
      join public.products p on p.id = v.product_id
      where c.user_id = owner_id
      order by v.id for update of c, v
    loop
      if not item.active or not item.product_active or item.stock < item.quantity then
        raise exception 'Item unavailable or insufficient stock' using errcode = '22023';
      end if;
      selected_variant_ids := array_append(selected_variant_ids, item.variant_id);
      selected_items := selected_items || jsonb_build_array(jsonb_build_object(
        'variant_id', item.variant_id, 'quantity', item.quantity, 'price_minor', item.price_minor,
        'variant_label', item.label, 'product_name', item.name
      ));
      order_subtotal := order_subtotal + item.price_minor::bigint * item.quantity;
      item_count := item_count + 1;
    end loop;
    if item_count = 0 then
      raise exception 'Cart is empty' using errcode = '22023';
    end if;
  end if;

  insert into public.store_orders(user_id, request_id, address_snapshot, subtotal_minor, shipping_fee_minor, total_minor)
    values (owner_id, p_request_id, address_snapshot, order_subtotal, shipping_fee, order_subtotal + shipping_fee)
    returning id into order_id;

  for item in
    select snapshot.variant_id, snapshot.quantity, snapshot.price_minor, snapshot.variant_label, snapshot.product_name
    from jsonb_to_recordset(selected_items) as snapshot(
      variant_id uuid, quantity integer, price_minor integer, variant_label text, product_name text
    )
    order by snapshot.variant_id
  loop
    insert into public.store_order_items(order_id, user_id, variant_id, product_name, variant_label, unit_price_minor, quantity)
      values (order_id, owner_id, item.variant_id, item.product_name, item.variant_label, item.price_minor, item.quantity);
    update public.store_variants set stock = stock - item.quantity, updated_at = now() where id = item.variant_id;
  end loop;

  if p_direct_items is null then
    delete from public.shopping_cart_items where user_id = owner_id and variant_id = any(selected_variant_ids);
  end if;
  return order_id;
end;
$$;
revoke all on function public.create_store_order(uuid, uuid, jsonb) from public, anon;
grant execute on function public.create_store_order(uuid, uuid, jsonb) to authenticated;

create function public.cancel_store_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); current_status text; item record;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select status into current_status from public.store_orders where id = p_order_id and user_id = owner_id for update;
  if not found then raise exception 'Order not found' using errcode = '22023'; end if;
  if current_status = 'cancelled' then return; end if;
  if current_status <> 'awaiting_payment' then raise exception 'Order cannot be cancelled' using errcode = '22023'; end if;
  for item in select variant_id, quantity from public.store_order_items where order_id = p_order_id order by variant_id loop
    update public.store_variants set stock = stock + item.quantity, updated_at = now() where id = item.variant_id;
  end loop;
  update public.store_orders set status = 'cancelled' where id = p_order_id;
end;
$$;
revoke all on function public.cancel_store_order(uuid) from public, anon;
grant execute on function public.cancel_store_order(uuid) to authenticated;
