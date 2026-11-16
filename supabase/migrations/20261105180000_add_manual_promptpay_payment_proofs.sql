-- PromptPay identifiers are customer-facing and intentionally snapshot onto
-- each order. Payment proofs themselves stay in a private Storage bucket.
alter table public.store_checkout_config
  add column if not exists promptpay_target text,
  add column if not exists promptpay_display_name text;

update public.store_checkout_config
  set promptpay_target = coalesce(nullif(btrim(promptpay_target), ''), '0926631047'),
      promptpay_display_name = coalesce(nullif(btrim(promptpay_display_name), ''), 'SkinCycle')
  where singleton;

alter table public.store_checkout_config
  alter column promptpay_target set not null,
  alter column promptpay_display_name set not null;

alter table public.store_checkout_config
  drop constraint if exists store_checkout_config_promptpay_target_check,
  add constraint store_checkout_config_promptpay_target_check
    check (promptpay_target ~ '^[0-9]{10}$|^[0-9]{13}$|^[0-9]{15}$'),
  drop constraint if exists store_checkout_config_promptpay_display_name_check,
  add constraint store_checkout_config_promptpay_display_name_check
    check (char_length(btrim(promptpay_display_name)) between 1 and 120);

alter table public.store_checkout_config
  drop constraint if exists store_checkout_config_ready_check,
  add constraint store_checkout_config_ready_check check (
    not checkout_enabled or (
      shipping_fee_minor is not null
      and char_length(btrim(coalesce(payment_instructions, ''))) between 5 and 2000
      and char_length(btrim(coalesce(default_shipping_carrier, ''))) between 1 and 120
      and promptpay_target ~ '^[0-9]{10}$|^[0-9]{13}$|^[0-9]{15}$'
      and char_length(btrim(promptpay_display_name)) between 1 and 120
    )
  );

alter table public.store_orders
  add column if not exists promptpay_target text,
  add column if not exists promptpay_display_name text;

alter table public.store_orders
  drop constraint if exists store_orders_promptpay_target_check,
  add constraint store_orders_promptpay_target_check
    check (promptpay_target is null or promptpay_target ~ '^[0-9]{10}$|^[0-9]{13}$|^[0-9]{15}$'),
  drop constraint if exists store_orders_promptpay_display_name_check,
  add constraint store_orders_promptpay_display_name_check
    check (promptpay_display_name is null or char_length(btrim(promptpay_display_name)) between 1 and 120);

alter table public.store_orders
  drop constraint if exists store_orders_status_check,
  add constraint store_orders_status_check check (status in (
    'awaiting_payment', 'payment_submitted', 'cancelled', 'paid', 'shipped', 'completed'
  ));

create or replace function public.snapshot_store_order_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  instructions text;
  carrier text;
  target text;
  recipient_name text;
begin
  if new.payment_instructions is null
    or new.shipping_carrier is null
    or new.promptpay_target is null
    or new.promptpay_display_name is null then
    select
      btrim(config.payment_instructions),
      btrim(config.default_shipping_carrier),
      btrim(config.promptpay_target),
      btrim(config.promptpay_display_name)
    into instructions, carrier, target, recipient_name
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

  if new.promptpay_target is null then
    if target is null or target !~ '^[0-9]{10}$|^[0-9]{13}$|^[0-9]{15}$' then
      raise exception 'PromptPay target is unavailable' using errcode = '55000';
    end if;
    new.promptpay_target := target;
  end if;

  if new.promptpay_display_name is null then
    if recipient_name is null or char_length(recipient_name) < 1 then
      raise exception 'PromptPay recipient is unavailable' using errcode = '55000';
    end if;
    new.promptpay_display_name := recipient_name;
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

create or replace function public.get_store_checkout_config_v4()
returns table(
  checkout_enabled boolean,
  shipping_fee_minor integer,
  payment_instructions text,
  shipping_carrier text,
  promptpay_target text,
  promptpay_display_name text
)
language sql stable security definer set search_path = '' as $$
  select
    config.checkout_enabled,
    config.shipping_fee_minor,
    config.payment_instructions,
    config.default_shipping_carrier,
    config.promptpay_target,
    config.promptpay_display_name
  from public.store_checkout_config config
  where config.singleton;
$$;
revoke all on function public.get_store_checkout_config_v4() from public, anon;
grant execute on function public.get_store_checkout_config_v4() to authenticated;

create table public.store_payment_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) between 1 and 500),
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_note text check (reviewer_note is null or char_length(btrim(reviewer_note)) between 1 and 1000),
  foreign key (order_id, user_id) references public.store_orders(id, user_id) on delete cascade
);
create index store_payment_proofs_owner_idx on public.store_payment_proofs(user_id, submitted_at desc);

alter table public.store_payment_proofs enable row level security;
revoke all on public.store_payment_proofs from public, anon, authenticated;
grant select on public.store_payment_proofs to authenticated;
create policy store_payment_proofs_select_own on public.store_payment_proofs
  for select to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'payment-proofs',
    'payment-proofs',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
  )
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy payment_proofs_upload_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy payment_proofs_read_own
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and owner_id = (select auth.uid()::text)
);

create policy payment_proofs_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'payment-proofs'
  and owner_id = (select auth.uid()::text)
);

create function public.submit_store_payment_proof(p_order_id uuid, p_storage_path text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  current_order_status text;
  current_proof_status text;
  proof_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_storage_path is null
    or left(p_storage_path, char_length(actor_id::text || '/' || p_order_id::text || '/')) <> actor_id::text || '/' || p_order_id::text || '/'
    or lower(regexp_replace(p_storage_path, '^.*\.', '')) not in ('jpg', 'jpeg', 'png', 'webp') then
    raise exception 'Invalid payment proof path' using errcode = '22023';
  end if;

  select status into current_order_status
  from public.store_orders
  where id = p_order_id and user_id = actor_id
  for update;

  if not found then
    raise exception 'Order not found' using errcode = '22023';
  end if;
  if current_order_status <> 'awaiting_payment' then
    raise exception 'Order is not accepting a payment proof' using errcode = '22023';
  end if;

  if not exists (
    select 1 from storage.objects as proof_object
    where proof_object.bucket_id = 'payment-proofs'
      and proof_object.name = p_storage_path
      and proof_object.owner_id = actor_id::text
  ) then
    raise exception 'Payment proof upload was not found' using errcode = '22023';
  end if;

  select id, status into proof_id, current_proof_status
  from public.store_payment_proofs
  where order_id = p_order_id
  for update;

  if found then
    if current_proof_status <> 'rejected' then
      raise exception 'A payment proof is already under review' using errcode = '22023';
    end if;

    update public.store_payment_proofs
      set storage_path = p_storage_path,
          status = 'submitted',
          submitted_at = now(),
          reviewed_at = null,
          reviewer_note = null
      where id = proof_id;
  else
    insert into public.store_payment_proofs(order_id, user_id, storage_path)
      values (p_order_id, actor_id, p_storage_path)
      returning id into proof_id;
  end if;

  update public.store_orders set status = 'payment_submitted' where id = p_order_id;
  return proof_id;
end;
$$;
revoke all on function public.submit_store_payment_proof(uuid, text) from public, anon;
grant execute on function public.submit_store_payment_proof(uuid, text) to authenticated;
