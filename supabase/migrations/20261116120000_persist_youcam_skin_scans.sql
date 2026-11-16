-- Persist compact YouCam results without storing face images.
insert into public.skin_scan_consent_versions (version, body, provider, image_retention_description, active)
values (
  'youcam-skin-v1',
  'SkinCycle จะส่งภาพใบหน้าไปยัง YouCam AI Skin Analysis เพื่อประเมินสภาพผิว สิว ความมัน ความชื้น รอยแดง และรอยดำ ภาพจะไม่ถูกเก็บในฐานข้อมูลของ SkinCycle',
  'Perfect Corp YouCam AI Skin Analysis',
  'ไม่เก็บภาพใบหน้า เก็บเฉพาะผลสรุปและเวอร์ชันการวิเคราะห์',
  true
)
on conflict (version) do update set active = true;

create or replace function public.complete_own_youcam_skin_scan(
  p_scan_id uuid,
  p_observations jsonb,
  p_model_version text default 'youcam-ai-skin-v2.1-sd'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  scan_consent text;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_scan_id is null
    or jsonb_typeof(p_observations) <> 'array'
    or jsonb_array_length(p_observations) > 32
    or char_length(coalesce(p_model_version, '')) not between 1 and 120 then
    raise exception 'Invalid YouCam result' using errcode = '22023';
  end if;

  select c.consent_version into scan_consent
    from public.skin_scans s
    join public.skin_scan_consents c on c.id = s.consent_id and c.user_id = s.user_id
    where s.id = p_scan_id and s.user_id = owner_id and s.status = 'created'
    for update of s;
  if scan_consent is distinct from 'youcam-skin-v1' then
    raise exception 'Scan is not authorized' using errcode = '42501';
  end if;

  insert into public.skin_analysis_results (scan_id, user_id, schema_version, model_name, model_version, observations)
    values (p_scan_id, owner_id, 'youcam-skin-v1', 'youcam-ai-skin-analysis', p_model_version, p_observations);
  update public.skin_scans set status = 'completed', completed_at = now(), updated_at = now()
    where id = p_scan_id and user_id = owner_id;
  return true;
end;
$$;

revoke all on function public.complete_own_youcam_skin_scan(uuid, jsonb, text) from public, anon;
grant execute on function public.complete_own_youcam_skin_scan(uuid, jsonb, text) to authenticated;
