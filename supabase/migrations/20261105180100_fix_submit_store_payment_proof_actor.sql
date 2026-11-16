-- Qualify storage fields and avoid any PL/pgSQL variable/column ambiguity.
create or replace function public.submit_store_payment_proof(p_order_id uuid, p_storage_path text)
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
