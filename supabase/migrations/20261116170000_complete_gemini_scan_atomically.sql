-- Commits the result, replacement plan, plan days, and completed status as one
-- transaction. It is intentionally callable only by the service role used by
-- the authenticated Gemini Edge Function.
create function public.complete_gemini_scan_with_plan(
  p_scan_id uuid,
  p_user_id uuid,
  p_model_version text,
  p_observations jsonb,
  p_plan_intensity text,
  p_primary_focus text,
  p_plan_days jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  plan_id uuid;
  day_count integer;
begin
  if p_scan_id is null or p_user_id is null
    or p_model_version is null or char_length(p_model_version) not between 1 and 120
    or jsonb_typeof(p_observations) <> 'array' or jsonb_array_length(p_observations) <> 1
    or p_plan_intensity not in ('gentle', 'balanced', 'active')
    or p_primary_focus not in ('hydration', 'acne', 'redness', 'marks', 'balance')
    or jsonb_typeof(p_plan_days) <> 'array' or jsonb_array_length(p_plan_days) <> 30 then
    raise exception 'Invalid Gemini completion payload' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));

  update public.skin_scans
    set status = 'processing', updated_at = pg_catalog.now()
    where id = p_scan_id and user_id = p_user_id and status = 'processing';
  if not found then
    raise exception 'Scan is not processing for this user' using errcode = '22023';
  end if;

  select count(*) into day_count
  from jsonb_to_recordset(p_plan_days) as d(
    routine_date date, day_type text, rationale text, morning_roles text[], evening_roles text[]
  )
  where d.routine_date is not null
    and d.day_type in ('exfoliate', 'hydrate', 'recovery', 'rest')
    and char_length(d.rationale) between 1 and 240
    and cardinality(d.morning_roles) between 1 and 6
    and cardinality(d.evening_roles) between 1 and 6;
  if day_count <> 30 then
    raise exception 'Invalid routine days' using errcode = '22023';
  end if;

  insert into public.skin_analysis_results (
    scan_id, user_id, schema_version, model_name, model_version, observations
  ) values (
    p_scan_id, p_user_id, 'gemini-v1', 'Google Gemini', p_model_version, p_observations
  );

  update public.skin_cycling_plans
    set status = 'replaced'
    where user_id = p_user_id and status = 'active';

  insert into public.skin_cycling_plans (
    user_id, source_scan_id, start_date, end_date, plan_intensity, primary_focus
  ) values (
    p_user_id, p_scan_id, (p_plan_days->0->>'routine_date')::date,
    (p_plan_days->29->>'routine_date')::date, p_plan_intensity, p_primary_focus
  ) returning id into plan_id;

  insert into public.skin_cycling_plan_days (
    plan_id, user_id, routine_date, day_type, rationale, morning_roles, evening_roles
  )
  select plan_id, p_user_id, d.routine_date, d.day_type, d.rationale, d.morning_roles, d.evening_roles
  from jsonb_to_recordset(p_plan_days) as d(
    routine_date date, day_type text, rationale text, morning_roles text[], evening_roles text[]
  );

  update public.skin_scans
    set status = 'completed', completed_at = pg_catalog.now(), error_code = null, updated_at = pg_catalog.now()
    where id = p_scan_id and user_id = p_user_id;
end;
$$;

revoke all on function public.complete_gemini_scan_with_plan(uuid, uuid, text, jsonb, text, text, jsonb)
  from public, anon, authenticated;
