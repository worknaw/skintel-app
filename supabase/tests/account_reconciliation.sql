-- Run after every local migration in a disposable PostgreSQL database.
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('12000000-0000-4000-8000-000000000001', 'owner-a@example.com', '{"display_name":"Owner A"}'),
  ('12000000-0000-4000-8000-000000000002', 'owner-b@example.com', '{"display_name":"Owner B"}'),
  ('12000000-0000-4000-8000-000000000003', 'owner-c@example.com', '{"display_name":"Owner C"}');

set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000001', true);
insert into public.user_favorites(user_id, product_id) values (auth.uid(), 'anua-heartleaf-toner');
insert into public.support_requests(user_id, subject, message, app_version)
  values (auth.uid(), 'Test support request', 'This support request is long enough to be valid.', '1.0.0');
insert into public.shipping_addresses(id, user_id, recipient, phone, address_line, subdistrict, district, province, postal_code)
  values ('32000000-0000-4000-8000-000000000001', auth.uid(), 'Owner A', '0800000000', 'Test Address', 'Test', 'Test', 'Test', '10100');

do $$
declare exported jsonb;
begin
  exported := public.export_my_account();
  if exported->>'format_version' <> '3'
    or jsonb_array_length(exported->'favorites') <> 1
    or jsonb_array_length(exported->'support_requests') <> 1
    or jsonb_array_length(exported->'shipping_addresses') <> 1 then
    raise exception 'Account export omitted user-owned account data';
  end if;
  begin
    perform public.delete_my_account('NO');
    raise exception 'Deletion accepted the wrong confirmation';
  exception when sqlstate '22023' then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000002', true);
do $$
begin
  if exists (select 1 from public.user_favorites) or exists (select 1 from public.support_requests) then
    raise exception 'A different account can read private favorites or support requests';
  end if;
  begin
    insert into public.user_favorites(user_id, product_id) values ('12000000-0000-4000-8000-000000000001', 'anua-heartleaf-toner');
    raise exception 'A different account can create another account favorite';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
insert into public.store_orders(
  id, user_id, request_id, address_snapshot, subtotal_minor, shipping_fee_minor, total_minor,
  payment_reference, payment_instructions, shipping_carrier
) values (
  '42000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000001',
  '43000000-0000-4000-8000-000000000001',
  '{"recipient":"Owner A"}'::jsonb, 0, 0, 0,
  'SC-ACCOUNT', 'Manual test payment instruction', 'Manual Test Carrier'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000001', true);
do $$
begin
  begin
    perform public.delete_my_account('DELETE');
    raise exception 'Deletion removed an account with retained order history';
  exception when sqlstate '55000' then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '12000000-0000-4000-8000-000000000003', true);
select public.delete_my_account('DELETE');
reset role;
do $$
begin
  if exists (select 1 from auth.users where id = '12000000-0000-4000-8000-000000000003') then
    raise exception 'Deletion did not remove an account with no retained records';
  end if;
end;
$$;
rollback;
