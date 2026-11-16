-- Confirms the initial sample catalogue is visible only through the public
-- active-product/active-variant policies.
begin;

set local role anon;
do $$
begin
  if (select count(*) from public.store_variants where sku like 'SKIN-%' and active) <> 8 then
    raise exception 'Initial store catalogue did not create eight sellable variants';
  end if;
  if exists (
    select 1 from public.store_variants
    where sku like 'SKIN-%' and (price_minor < 0 or stock < 0)
  ) then
    raise exception 'Initial store catalogue contains invalid commercial values';
  end if;
end;
$$;

rollback;
