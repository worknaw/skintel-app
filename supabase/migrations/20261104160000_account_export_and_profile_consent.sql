-- Keep profile writes and the consent receipt in the same server-side operation.
revoke insert, update on public.skin_profiles from authenticated;

-- Export all currently implemented user-owned data. Objects in Storage are not
-- included; the scan bucket has no client upload policy at this stage.
create or replace function public.export_my_account()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null or not exists (select 1 from auth.users where id = owner_id) then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  return jsonb_build_object(
    'format_version', 2, 'exported_at', now(),
    'account', (select jsonb_build_object('id', id, 'email', email, 'created_at', created_at) from auth.users where id = owner_id),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = owner_id),
    'settings', (select to_jsonb(s) from public.user_settings s where s.user_id = owner_id),
    'skin_profile', (select to_jsonb(p) from public.skin_profiles p where p.user_id = owner_id),
    'favorites', coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at) from public.user_favorites f where f.user_id = owner_id), '[]'::jsonb),
    'skin_profile_consents', coalesce((select jsonb_agg(to_jsonb(c) order by c.accepted_at) from public.user_consents c where c.user_id = owner_id), '[]'::jsonb),
    'skin_scan_consents', coalesce((select jsonb_agg(to_jsonb(c) order by c.accepted_at) from public.skin_scan_consents c where c.user_id = owner_id), '[]'::jsonb),
    'skin_scans', coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at) from public.skin_scans s where s.user_id = owner_id), '[]'::jsonb),
    'skin_analysis_results', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.skin_analysis_results r where r.user_id = owner_id), '[]'::jsonb),
    'support_requests', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.support_requests r where r.user_id = owner_id), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.export_my_account() from public, anon;
grant execute on function public.export_my_account() to authenticated;
