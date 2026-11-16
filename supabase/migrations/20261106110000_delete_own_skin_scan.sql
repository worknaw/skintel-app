create function public.delete_own_skin_scan(p_scan_id uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  receipt_id uuid;
begin
  if owner_id is null or p_scan_id is null then
    raise exception 'Authentication and scan ID required' using errcode = '28000';
  end if;
  select consent_id into receipt_id from public.skin_scans
    where id = p_scan_id and user_id = owner_id for update;
  if not found then return false; end if;
  delete from public.skin_scans where id = p_scan_id and user_id = owner_id;
  if receipt_id is not null then
    delete from public.skin_scan_consents where id = receipt_id and user_id = owner_id;
  end if;
  return true;
end;
$$;
revoke all on function public.delete_own_skin_scan(uuid) from public, anon;
grant execute on function public.delete_own_skin_scan(uuid) to authenticated;
