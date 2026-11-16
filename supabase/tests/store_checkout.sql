-- Run against a disposable PostgreSQL database with the catalog, store
-- foundation, and checkout migrations. Every change is rolled back.
begin;

insert into auth.users (id, email) values
  ('11000000-0000-4000-8000-000000000001', 'checkout-owner@example.com'),
  ('11000000-0000-4000-8000-000000000002', 'checkout-other@example.com');
insert into public.brands (id, name) values ('checkout-test-brand', 'Checkout Test Brand');
insert into public.categories (id, label) values ('checkout-test-category', 'Checkout Test Category');
insert into public.products (id, brand_id, category_id, name, size, review_count, description, active) values
  ('checkout-test-product', 'checkout-test-brand', 'checkout-test-category', 'Checkout product', '50 ml', 0, '', true),
  ('checkout-hidden-product', 'checkout-test-brand', 'checkout-test-category', 'Hidden product', '50 ml', 0, '', false);
insert into public.store_variants (id, product_id, sku, label, price_minor, stock, active) values
  ('21000000-0000-4000-8000-000000000001', 'checkout-test-product', 'CHECKOUT-CART', 'Cart size', 1000, 5, true),
  ('21000000-0000-4000-8000-000000000002', 'checkout-test-product', 'CHECKOUT-DIRECT', 'Direct size', 1500, 3, true),
  ('21000000-0000-4000-8000-000000000003', 'checkout-hidden-product', 'CHECKOUT-HIDDEN', 'Hidden size', 500, 3, true);
update public.store_checkout_config set checkout_enabled = true, shipping_fee_minor = 700,
  payment_instructions = 'โอนเงินตามรายละเอียดที่ร้านแจ้ง พร้อมระบุเลขอ้างอิงคำสั่งซื้อ',
  default_shipping_carrier = 'Thailand Post';

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000001', true);
insert into public.shipping_addresses (id, user_id, recipient, phone, address_line, subdistrict, district, province, postal_code)
  values ('31000000-0000-4000-8000-000000000001', auth.uid(), 'Checkout Recipient', '0800000000', 'Checkout Address', 'Test', 'Test', 'Test', '10100');
insert into public.shopping_cart_items (user_id, variant_id, quantity)
  values (auth.uid(), '21000000-0000-4000-8000-000000000001', 2);

do $$
begin
  if (select checkout_enabled from public.get_store_checkout_config_v3()) is not true
    or (select shipping_fee_minor from public.get_store_checkout_config_v3()) <> 700
    or (select payment_instructions from public.get_store_checkout_config_v3()) is null
    or (select shipping_carrier from public.get_store_checkout_config_v3()) <> 'Thailand Post' then
    raise exception 'Authenticated shoppers cannot read the checkout availability';
  end if;
end;
$$;

do $$
declare cart_order uuid; repeat_order uuid; direct_order uuid;
begin
  cart_order := public.create_store_order(
    '31000000-0000-4000-8000-000000000001',
    '41000000-0000-4000-8000-000000000001',
    null
  );
  repeat_order := public.create_store_order(
    '31000000-0000-4000-8000-000000000001',
    '41000000-0000-4000-8000-000000000001',
    null
  );
  if cart_order <> repeat_order then raise exception 'Checkout retry created a second order'; end if;
  if (select stock from public.store_variants where id = '21000000-0000-4000-8000-000000000001') <> 3 then
    raise exception 'Cart checkout deducted stock incorrectly or twice';
  end if;
  if exists (select 1 from public.shopping_cart_items) then raise exception 'Cart checkout did not clear its captured cart rows'; end if;
  if (select subtotal_minor from public.store_orders where id = cart_order) <> 2000
    or (select shipping_fee_minor from public.store_orders where id = cart_order) <> 700
    or (select total_minor from public.store_orders where id = cart_order) <> 2700
    or (select payment_reference from public.store_orders where id = cart_order) is null
    or (select payment_instructions from public.store_orders where id = cart_order) is null
    or (select shipping_carrier from public.store_orders where id = cart_order) <> 'Thailand Post'
    or (select address_snapshot->>'postal_code' from public.store_orders where id = cart_order) <> '10100' then
    raise exception 'Cart order did not snapshot a server-derived total and address';
  end if;

  insert into public.shopping_cart_items (user_id, variant_id, quantity)
    values (auth.uid(), '21000000-0000-4000-8000-000000000001', 1);
  direct_order := public.create_store_order(
    '31000000-0000-4000-8000-000000000001',
    '41000000-0000-4000-8000-000000000002',
    '[{"variant_id":"21000000-0000-4000-8000-000000000002","quantity":2}]'::jsonb
  );
  if (select stock from public.store_variants where id = '21000000-0000-4000-8000-000000000002') <> 1 then
    raise exception 'Buy now did not deduct its selected stock';
  end if;
  if not exists (select 1 from public.shopping_cart_items where variant_id = '21000000-0000-4000-8000-000000000001' and quantity = 1) then
    raise exception 'Buy now changed an unrelated cart item';
  end if;
  if (select count(*) from public.store_order_items where order_id = direct_order) <> 1 then
    raise exception 'Buy now created the wrong order items';
  end if;
  perform public.cancel_store_order(direct_order);
  if (select stock from public.store_variants where id = '21000000-0000-4000-8000-000000000002') <> 3
    or (select status from public.store_orders where id = direct_order) <> 'cancelled' then
    raise exception 'Cancelling an unpaid order did not restore stock exactly once';
  end if;

  begin
    perform public.create_store_order(
      '31000000-0000-4000-8000-000000000001',
      '41000000-0000-4000-8000-000000000003',
      '[{"variant_id":"21000000-0000-4000-8000-000000000002","quantity":100}]'::jsonb
    );
    raise exception 'Checkout accepted an invalid direct quantity';
  exception when sqlstate '22023' then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000002', true);
do $$
begin
  if exists (select 1 from public.store_orders) or exists (select 1 from public.store_order_items) then
    raise exception 'A different account can read another account order';
  end if;
  begin
    perform public.create_store_order(
      '31000000-0000-4000-8000-000000000001',
      '41000000-0000-4000-8000-000000000004',
      '[{"variant_id":"21000000-0000-4000-8000-000000000002","quantity":1}]'::jsonb
    );
    raise exception 'A different account can use another account address';
  exception when sqlstate '22023' then null;
  end;
end;
$$;

set local role anon;
do $$
begin
  begin
    perform 1 from public.store_orders;
    raise exception 'Guest can read orders';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.create_store_order(
      '31000000-0000-4000-8000-000000000001',
      '41000000-0000-4000-8000-000000000005',
      null
    );
    raise exception 'Guest can create an order';
  exception when insufficient_privilege then null;
  end;
end;
$$;
rollback;
