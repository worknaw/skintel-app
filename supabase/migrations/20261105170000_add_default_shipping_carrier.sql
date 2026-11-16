alter table public.store_checkout_config
  add column default_shipping_carrier text;

update public.store_checkout_config
  set default_shipping_carrier = 'Thailand Post'
  where singleton and default_shipping_carrier is null;

alter table public.store_checkout_config
  drop constraint store_checkout_config_ready_check,
  add constraint store_checkout_config_ready_check check (
    not checkout_enabled or (
      shipping_fee_minor is not null
      and char_length(btrim(coalesce(payment_instructions, ''))) between 5 and 2000
      and char_length(btrim(coalesce(default_shipping_carrier, ''))) between 1 and 120
    )
  );

create or replace function public.snapshot_store_order_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare instructions text; carrier text;
begin
  if new.payment_instructions is null or new.shipping_carrier is null then
    select btrim(config.payment_instructions), btrim(config.default_shipping_carrier)
      into instructions, carrier
      from public.store_checkout_config config
      where config.singleton and config.checkout_enabled;
  end if;
  if new.payment_instructions is null then
    if instructions is null or char_length(instructions) < 5 then
      raise exception 'Payment instructions are unavailable' using errcode = '55000';
    end if;
    new.payment_instructions := instructions;
  end if;
  if new.shipping_carrier is null then
    if carrier is null or char_length(carrier) < 1 then
      raise exception 'Shipping carrier is unavailable' using errcode = '55000';
    end if;
    new.shipping_carrier := carrier;
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

create function public.get_store_checkout_config_v3()
returns table(checkout_enabled boolean, shipping_fee_minor integer, payment_instructions text, shipping_carrier text)
language sql stable security definer set search_path = '' as $$
  select config.checkout_enabled, config.shipping_fee_minor, config.payment_instructions, config.default_shipping_carrier
  from public.store_checkout_config config
  where config.singleton;
$$;
revoke all on function public.get_store_checkout_config_v3() from public, anon;
grant execute on function public.get_store_checkout_config_v3() to authenticated;
