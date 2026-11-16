-- Store only the compact prototype result. Face images and bounding boxes are
-- never written to Supabase by this flow.
insert into public.skin_scan_consent_versions (version, body, provider, image_retention_description, active)
values (
  'prototype-yolo-v1',
  'SkinCycle จะส่งภาพใบหน้าไปยังระบบตรวจจับสิวทดลองเพื่อสร้างคะแนนและจำนวนสิวโดยประมาณ ภาพจะไม่ถูกเก็บในฐานข้อมูล',
  'SkinCycle hosted prototype YOLO',
  'ไม่เก็บภาพใบหน้า เก็บเฉพาะคะแนน จำนวนสิวโดยประมาณ เวลาสแกน และเวอร์ชันโมเดล',
  true
)
on conflict (version) do update set active = true;

create or replace function public.complete_own_prototype_skin_scan(
  p_scan_id uuid,
  p_model_version text,
  p_score integer,
  p_acne_count integer
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
  if p_scan_id is null or char_length(coalesce(p_model_version, '')) not between 1 and 120
    or p_score not between 0 and 100 or p_acne_count not between 0 and 100 then
    raise exception 'Invalid prototype result' using errcode = '22023';
  end if;

  select c.consent_version into scan_consent
    from public.skin_scans s
    join public.skin_scan_consents c on c.id = s.consent_id and c.user_id = s.user_id
    where s.id = p_scan_id and s.user_id = owner_id and s.status = 'created'
    for update of s;
  if scan_consent is distinct from 'prototype-yolo-v1' then
    raise exception 'Scan is not authorized' using errcode = '42501';
  end if;

  insert into public.skin_analysis_results (scan_id, user_id, schema_version, model_name, model_version, observations)
    values (p_scan_id, owner_id, 'prototype-yolo-v1', 'prototype-yolo', p_model_version,
      jsonb_build_array(jsonb_build_object('kind', 'prototype_yolo', 'score', p_score, 'acne_count', p_acne_count)));
  update public.skin_scans set status = 'completed', completed_at = now(), updated_at = now()
    where id = p_scan_id and user_id = owner_id;
  return true;
end;
$$;

revoke all on function public.complete_own_prototype_skin_scan(uuid, text, integer, integer) from public, anon;
grant execute on function public.complete_own_prototype_skin_scan(uuid, text, integer, integer) to authenticated;
