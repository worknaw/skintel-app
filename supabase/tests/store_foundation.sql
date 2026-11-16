-- Run against a disposable PostgreSQL database with the catalog and store foundation.
begin;

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'store-owner@example.com'),
  ('10000000-0000-4000-8000-000000000002', 'store-other@example.com');
insert into public.brands (id, name) values ('test-store-brand', 'Store Test Brand');
insert into public.categories (id, label) values ('test-store-category', 'Store Test Category');
insert into public.products (id, brand_id, category_id, name, size, review_count, description, active) values
  ('test-store-active', 'test-store-brand', 'test-store-category', 'Active', '50 ml', 0, '', true),
  ('test-store-inactive', 'test-store-brand', 'test-store-category', 'Inactive', '50 ml', 0, '', false);
insert into public.store_variants (id, product_id, sku, label, price_minor, stock, active) values
  ('20000000-0000-4000-8000-000000000001', 'test-store-active', 'TEST-SELLABLE', '50 ml', 12500, 3, true),
  ('20000000-0000-4000-8000-000000000002', 'test-store-active', 'TEST-HIDDEN', '50 ml', 12500, 3, false),
  ('20000000-0000-4000-8000-000000000003', 'test-store-inactive', 'TEST-PARENT-HIDDEN', '50 ml', 12500, 3, true);

set local role anon;
do $$
begin
  if (select array_agg(sku) from public.store_variants where sku like 'TEST-%')
    is distinct from array['TEST-SELLABLE']::text[] then
    raise exception 'The public catalog exposed the wrong variants';
  end if;
  begin
    perform 1 from public.shipping_addresses;
    raise exception 'Guests can read shipping addresses';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.shopping_cart_items;
    raise exception 'Guests can read carts';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
insert into public.shopping_cart_items (user_id, variant_id, quantity)
  values (auth.uid(), '20000000-0000-4000-8000-000000000001', 1)
  on conflict (user_id, variant_id) do nothing;
update public.shopping_cart_items set quantity = 2
  where user_id = auth.uid() and variant_id = '20000000-0000-4000-8000-000000000001';
insert into public.shipping_addresses (id, user_id, recipient, phone, address_line, subdistrict, district, province, postal_code)
  values ('30000000-0000-4000-8000-000000000001', auth.uid(), 'Test Recipient', '0800000000', 'Test Address', 'Test', 'Test', 'Test', '10100');
update public.shipping_addresses set postal_code = '10200' where id = '30000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
do $$
begin
  if exists (select 1 from public.shopping_cart_items) or exists (select 1 from public.shipping_addresses) then
    raise exception 'A different account can read private store data';
  end if;
  update public.shopping_cart_items set quantity = 99 where variant_id = '20000000-0000-4000-8000-000000000001';
  if found then raise exception 'A different account can edit the cart'; end if;
  delete from public.shipping_addresses where id = '30000000-0000-4000-8000-000000000001';
  if found then raise exception 'A different account can delete the address'; end if;
  begin
    insert into public.shopping_cart_items (user_id, variant_id, quantity)
      values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 1);
    raise exception 'A different account can write into another cart';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
do $$
begin
  if (select quantity from public.shopping_cart_items where variant_id = '20000000-0000-4000-8000-000000000001') is distinct from 2
    or (select postal_code from public.shipping_addresses where id = '30000000-0000-4000-8000-000000000001') is distinct from '10200' then
    raise exception 'Owner updates did not persist or another account modified them';
  end if;
  delete from public.shopping_cart_items where variant_id = '20000000-0000-4000-8000-000000000001';
  if not found then raise exception 'The owner could not delete their cart item'; end if;
  delete from public.shipping_addresses where id = '30000000-0000-4000-8000-000000000001';
  if not found then raise exception 'The owner could not delete their address'; end if;
end;
$$;
rollback;
