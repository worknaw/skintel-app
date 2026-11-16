alter table public.shipping_addresses
  add column if not exists is_default boolean not null default false,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.shipping_addresses
  drop constraint if exists shipping_addresses_latitude_check,
  add constraint shipping_addresses_latitude_check check (latitude is null or latitude between -90 and 90),
  drop constraint if exists shipping_addresses_longitude_check,
  add constraint shipping_addresses_longitude_check check (longitude is null or longitude between -180 and 180);

with ranked_addresses as (
  select id, row_number() over (partition by user_id order by created_at, id) as address_rank
  from public.shipping_addresses
)
update public.shipping_addresses as address
  set is_default = ranked_addresses.address_rank = 1
  from ranked_addresses
  where address.id = ranked_addresses.id;

create unique index if not exists shipping_addresses_one_default_per_user
  on public.shipping_addresses(user_id) where is_default;

create or replace function public.set_default_shipping_address(p_address_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not exists (select 1 from public.shipping_addresses where id = p_address_id and user_id = owner_id) then
    raise exception 'Address not found' using errcode = '22023';
  end if;
  update public.shipping_addresses set is_default = false where user_id = owner_id and is_default;
  update public.shipping_addresses set is_default = true where id = p_address_id and user_id = owner_id;
end;
$$;
revoke all on function public.set_default_shipping_address(uuid) from public, anon;
grant execute on function public.set_default_shipping_address(uuid) to authenticated;
