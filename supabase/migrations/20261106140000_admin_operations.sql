-- Full admin operations: role-aware writes, payment review, support replies,
-- store configuration, audit logging, and admin user management.

create or replace function public.has_admin_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and active = true
      and role = any (allowed_roles)
  );
$$;

revoke all on function public.has_admin_role(text[]) from public;
grant execute on function public.has_admin_role(text[]) to authenticated;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete restrict default auth.uid(),
  action text not null check (char_length(btrim(action)) between 1 and 120),
  entity_type text not null check (char_length(btrim(entity_type)) between 1 and 80),
  entity_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);
create index if not exists admin_audit_logs_entity_idx on public.admin_audit_logs(entity_type, entity_id, created_at desc);

alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from public, anon, authenticated;
grant select on public.admin_audit_logs to authenticated;

drop policy if exists admin_audit_logs_admin_read on public.admin_audit_logs;
create policy admin_audit_logs_admin_read on public.admin_audit_logs
for select to authenticated using (public.is_admin());

create or replace function public.record_admin_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare audit_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  insert into public.admin_audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), btrim(p_action), btrim(p_entity_type), nullif(btrim(p_entity_id), ''), coalesce(p_metadata, '{}'::jsonb))
  returning id into audit_id;
  return audit_id;
end;
$$;

revoke all on function public.record_admin_audit(text, text, text, jsonb) from public;
grant execute on function public.record_admin_audit(text, text, text, jsonb) to authenticated;

-- Support replies are kept separate from the user's original request.
create table if not exists public.support_replies (
  id uuid primary key default gen_random_uuid(),
  support_request_id uuid not null references public.support_requests(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id) on delete restrict default auth.uid(),
  message text not null check (char_length(btrim(message)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists support_replies_request_idx on public.support_replies(support_request_id, created_at);
alter table public.support_replies enable row level security;
revoke all on public.support_replies from public, anon, authenticated;
grant select, insert on public.support_replies to authenticated;

drop policy if exists support_replies_admin_read on public.support_replies;
create policy support_replies_admin_read on public.support_replies
for select to authenticated using (public.is_admin());

drop policy if exists support_replies_admin_insert on public.support_replies;
create policy support_replies_admin_insert on public.support_replies
for insert to authenticated
with check (public.has_admin_role(array['owner', 'admin', 'support']) and admin_user_id = auth.uid());

drop policy if exists support_requests_admin_update on public.support_requests;
create policy support_requests_admin_update on public.support_requests
for update to authenticated
using (public.has_admin_role(array['owner', 'admin', 'support']))
with check (public.has_admin_role(array['owner', 'admin', 'support']));

create or replace function public.admin_update_support_request(p_request_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_admin_role(array['owner', 'admin', 'support']) then
    raise exception 'Support permission required' using errcode = '42501';
  end if;
  if p_status not in ('open', 'in_progress', 'resolved') then
    raise exception 'Invalid support status' using errcode = '22023';
  end if;
  update public.support_requests set status = p_status where id = p_request_id;
  if not found then raise exception 'Support request not found' using errcode = '22023'; end if;
  perform public.record_admin_audit('support.status_updated', 'support_request', p_request_id::text, jsonb_build_object('status', p_status));
end;
$$;

revoke all on function public.admin_update_support_request(uuid, text) from public;
grant execute on function public.admin_update_support_request(uuid, text) to authenticated;

create or replace function public.admin_add_support_reply(p_request_id uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare reply_id uuid;
begin
  if not public.has_admin_role(array['owner', 'admin', 'support']) then
    raise exception 'Support permission required' using errcode = '42501';
  end if;
  if p_message is null or char_length(btrim(p_message)) < 1 then
    raise exception 'Reply message is required' using errcode = '22023';
  end if;
  insert into public.support_replies(support_request_id, admin_user_id, message)
  values (p_request_id, auth.uid(), btrim(p_message))
  returning id into reply_id;
  update public.support_requests set status = 'in_progress' where id = p_request_id and status = 'open';
  perform public.record_admin_audit('support.reply_added', 'support_request', p_request_id::text, jsonb_build_object('reply_id', reply_id));
  return reply_id;
end;
$$;

revoke all on function public.admin_add_support_reply(uuid, text) from public;
grant execute on function public.admin_add_support_reply(uuid, text) to authenticated;

-- Payment review and order workflow happen in one transaction.
create or replace function public.admin_review_payment_proof(
  p_proof_id uuid,
  p_approved boolean,
  p_reviewer_note text default null
)
returns public.store_payment_proofs
language plpgsql
security definer
set search_path = public
as $$
declare
  proof_row public.store_payment_proofs;
begin
  if not public.has_admin_role(array['owner', 'admin', 'support']) then
    raise exception 'Payment review permission required' using errcode = '42501';
  end if;
  select * into proof_row from public.store_payment_proofs where id = p_proof_id for update;
  if not found then raise exception 'Payment proof not found' using errcode = '22023'; end if;
  if proof_row.status <> 'submitted' then raise exception 'Payment proof is already reviewed' using errcode = '22023'; end if;
  if p_reviewer_note is not null and char_length(btrim(p_reviewer_note)) > 1000 then
    raise exception 'Reviewer note is too long' using errcode = '22023';
  end if;
  update public.store_payment_proofs
  set status = case when p_approved then 'approved' else 'rejected' end,
      reviewed_at = now(),
      reviewer_note = nullif(btrim(p_reviewer_note), '')
  where id = p_proof_id
  returning * into proof_row;
  update public.store_orders
  set status = case when p_approved then 'paid' else 'awaiting_payment' end
  where id = proof_row.order_id;
  perform public.record_admin_audit(
    case when p_approved then 'payment.approved' else 'payment.rejected' end,
    'store_payment_proof',
    p_proof_id::text,
    jsonb_build_object('order_id', proof_row.order_id, 'reviewer_note', p_reviewer_note)
  );
  return proof_row;
end;
$$;

revoke all on function public.admin_review_payment_proof(uuid, boolean, text) from public;
grant execute on function public.admin_review_payment_proof(uuid, boolean, text) to authenticated;

create or replace function public.admin_update_store_order(
  p_order_id uuid,
  p_status text,
  p_shipping_carrier text default null,
  p_tracking_number text default null
)
returns public.store_orders
language plpgsql
security definer
set search_path = public
as $$
declare order_row public.store_orders;
begin
  if not public.has_admin_role(array['owner', 'admin', 'fulfillment']) then
    raise exception 'Fulfillment permission required' using errcode = '42501';
  end if;
  if p_status not in ('awaiting_payment', 'payment_submitted', 'cancelled', 'paid', 'shipped', 'completed') then
    raise exception 'Invalid order status' using errcode = '22023';
  end if;
  update public.store_orders
  set status = p_status,
      shipping_carrier = coalesce(nullif(btrim(p_shipping_carrier), ''), shipping_carrier),
      tracking_number = coalesce(nullif(btrim(p_tracking_number), ''), tracking_number),
      shipped_at = case when p_status = 'shipped' then coalesce(shipped_at, now()) else shipped_at end
  where id = p_order_id
  returning * into order_row;
  if not found then raise exception 'Order not found' using errcode = '22023'; end if;
  perform public.record_admin_audit('order.status_updated', 'store_order', p_order_id::text, jsonb_build_object('status', p_status, 'tracking_number', p_tracking_number));
  return order_row;
end;
$$;

revoke all on function public.admin_update_store_order(uuid, text, text, text) from public;
grant execute on function public.admin_update_store_order(uuid, text, text, text) to authenticated;

-- Private checkout config is exposed to the browser only through the RPC.
create or replace function public.admin_update_store_checkout_config(
  p_checkout_enabled boolean,
  p_shipping_fee_minor integer,
  p_payment_instructions text,
  p_default_shipping_carrier text,
  p_promptpay_target text,
  p_promptpay_display_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_admin_role(array['owner', 'admin']) then
    raise exception 'Store settings permission required' using errcode = '42501';
  end if;
  update public.store_checkout_config
  set checkout_enabled = p_checkout_enabled,
      shipping_fee_minor = p_shipping_fee_minor,
      payment_instructions = nullif(btrim(p_payment_instructions), ''),
      default_shipping_carrier = nullif(btrim(p_default_shipping_carrier), ''),
      promptpay_target = nullif(btrim(p_promptpay_target), ''),
      promptpay_display_name = nullif(btrim(p_promptpay_display_name), '')
  where singleton;
  if not found then raise exception 'Checkout config not found' using errcode = '22023'; end if;
  perform public.record_admin_audit('store_config.updated', 'store_checkout_config', 'singleton');
end;
$$;

revoke all on function public.admin_update_store_checkout_config(boolean, integer, text, text, text, text) from public;
grant execute on function public.admin_update_store_checkout_config(boolean, integer, text, text, text, text) to authenticated;

-- Owner-only admin user management.
create or replace function public.list_admin_users()
returns table(user_id uuid, role text, active boolean, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select a.user_id, a.role, a.active, a.created_at
  from public.admin_users a
  where public.has_admin_role(array['owner'])
  order by a.created_at;
$$;

revoke all on function public.list_admin_users() from public;
grant execute on function public.list_admin_users() to authenticated;

create or replace function public.update_admin_user_access(p_user_id uuid, p_role text, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_admin_role(array['owner']) then
    raise exception 'Owner permission required' using errcode = '42501';
  end if;
  if p_role not in ('owner', 'admin', 'support', 'content', 'fulfillment') then
    raise exception 'Invalid admin role' using errcode = '22023';
  end if;
  if p_user_id = auth.uid() and p_active = false then
    raise exception 'You cannot deactivate your own account' using errcode = '22023';
  end if;
  update public.admin_users set role = p_role, active = p_active where user_id = p_user_id;
  if not found then raise exception 'Admin user not found' using errcode = '22023'; end if;
  perform public.record_admin_audit('admin_user.updated', 'admin_user', p_user_id::text, jsonb_build_object('role', p_role, 'active', p_active));
end;
$$;

revoke all on function public.update_admin_user_access(uuid, text, boolean) from public;
grant execute on function public.update_admin_user_access(uuid, text, boolean) to authenticated;

-- Replace broad write policies with role-aware policies while preserving read access.
drop policy if exists store_orders_admin_update on public.store_orders;
create policy store_orders_admin_update on public.store_orders
for update to authenticated
using (public.has_admin_role(array['owner', 'admin', 'fulfillment']))
with check (public.has_admin_role(array['owner', 'admin', 'fulfillment']));

drop policy if exists store_payment_proofs_admin_update on public.store_payment_proofs;
create policy store_payment_proofs_admin_update on public.store_payment_proofs
for update to authenticated
using (public.has_admin_role(array['owner', 'admin', 'support']))
with check (public.has_admin_role(array['owner', 'admin', 'support']));

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
for all to authenticated
using (public.has_admin_role(array['owner', 'admin', 'content']))
with check (public.has_admin_role(array['owner', 'admin', 'content']));

drop policy if exists brands_admin_write on public.brands;
create policy brands_admin_write on public.brands
for all to authenticated
using (public.has_admin_role(array['owner', 'admin', 'content']))
with check (public.has_admin_role(array['owner', 'admin', 'content']));

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
for all to authenticated
using (public.has_admin_role(array['owner', 'admin', 'content']))
with check (public.has_admin_role(array['owner', 'admin', 'content']));

drop policy if exists store_variants_admin_write on public.store_variants;
create policy store_variants_admin_write on public.store_variants
for all to authenticated
using (public.has_admin_role(array['owner', 'admin', 'content']))
with check (public.has_admin_role(array['owner', 'admin', 'content']));

drop policy if exists store_offers_admin_write on public.store_offers;
create policy store_offers_admin_write on public.store_offers
for all to authenticated
using (public.has_admin_role(array['owner', 'admin', 'content']))
with check (public.has_admin_role(array['owner', 'admin', 'content']));
