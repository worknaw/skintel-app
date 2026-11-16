-- A storefront cannot open until buyers have a durable payment instruction.
-- Credentials stay outside this table; this is customer-facing text only.
alter table public.store_checkout_config
  add column payment_instructions text;

alter table public.store_checkout_config
  add constraint store_checkout_config_ready_check check (
    not checkout_enabled or (
      shipping_fee_minor is not null
      and char_length(btrim(coalesce(payment_instructions, ''))) between 5 and 2000
    )
  );

alter table public.store_orders
  add column payment_reference text unique,
  add column payment_instructions text,
  add column shipping_carrier text check (shipping_carrier is null or char_length(btrim(shipping_carrier)) between 1 and 120),
  add column tracking_number text check (tracking_number is null or char_length(btrim(tracking_number)) between 1 and 120),
  add column shipped_at timestamptz;

create function public.snapshot_store_order_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare instructions text;
begin
  if new.payment_instructions is null then
    select btrim(config.payment_instructions)
      into instructions
      from public.store_checkout_config config
      where config.singleton and config.checkout_enabled;

    if instructions is null or char_length(instructions) < 5 then
      raise exception 'Payment instructions are unavailable' using errcode = '55000';
    end if;
    new.payment_instructions := instructions;
  end if;
  if new.id is null then
    raise exception 'Order ID is required' using errcode = '22023';
  end if;

  new.payment_reference := coalesce(
    new.payment_reference,
    'SC-' || upper(replace(substring(new.id::text from 1 for 8), '-', ''))
  );
  return new;
end;
$$;

create trigger store_orders_snapshot_payment
before insert on public.store_orders
for each row execute function public.snapshot_store_order_payment();

-- The client receives only the payment directions and delivery fee required to
-- decide whether to order. Write access remains server/owner controlled.
create function public.get_store_checkout_config_v2()
returns table(checkout_enabled boolean, shipping_fee_minor integer, payment_instructions text)
language sql stable security definer set search_path = '' as $$
  select config.checkout_enabled, config.shipping_fee_minor, config.payment_instructions
  from public.store_checkout_config config
  where config.singleton;
$$;
revoke all on function public.get_store_checkout_config_v2() from public, anon;
grant execute on function public.get_store_checkout_config_v2() to authenticated;
revoke all on function public.snapshot_store_order_payment() from public, anon, authenticated;
