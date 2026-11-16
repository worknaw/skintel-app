create table public.skin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  skin_type text check (skin_type in ('dry', 'oily', 'combination', 'normal', 'unsure') or skin_type is null),
  concern_ids text[] not null default '{}',
  avoid_ingredient_ids text[] not null default '{}',
  monthly_budget_minor integer check (monthly_budget_minor is null or monthly_budget_minor >= 0),
  budget_currency char(3) not null default 'THB' check (budget_currency = upper(budget_currency)),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consent_versions (
  id text primary key,
  scope text not null check (scope in ('skin_profile')),
  title text not null,
  body text not null,
  active boolean not null default false,
  published_at timestamptz not null default now()
);

create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_version_id text not null references public.consent_versions(id),
  scope text not null check (scope in ('skin_profile')),
  accepted_at timestamptz not null default now(),
  unique (user_id, consent_version_id, scope)
);

create index user_consents_owner_accepted_idx on public.user_consents (user_id, accepted_at desc);

alter table public.skin_profiles enable row level security;
alter table public.consent_versions enable row level security;
alter table public.user_consents enable row level security;

grant select, insert, update on public.skin_profiles to authenticated;
grant select on public.consent_versions to authenticated;
grant select on public.user_consents to authenticated;

create policy skin_profiles_select_own on public.skin_profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy skin_profiles_insert_own on public.skin_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy skin_profiles_update_own on public.skin_profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy consent_versions_read_active on public.consent_versions for select to authenticated using (active);
create policy user_consents_read_own on public.user_consents for select to authenticated
  using ((select auth.uid()) = user_id);

insert into public.consent_versions (id, scope, title, body, active, published_at) values
  ('skin-profile-v1', 'skin_profile', 'การใช้ข้อมูล Skin Profile',
   'SkinCycle จะใช้ข้อมูลสภาพผิว ความกังวล ส่วนผสมที่ต้องการหลีกเลี่ยง และงบประมาณ เพื่อปรับคำแนะนำภายในแอป ข้อมูลนี้ไม่ใช่การวินิจฉัยทางการแพทย์ และยังไม่มีการส่งรูปภาพไปวิเคราะห์ด้วย AI ในขั้นตอนนี้',
   true, '2026-10-29T00:00:00Z');

create function public.complete_skin_onboarding(
  p_skin_type text,
  p_concern_ids text[],
  p_avoid_ingredient_ids text[],
  p_monthly_budget_minor integer,
  p_consent_version_id text
) returns public.skin_profiles
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  completed_profile public.skin_profiles;
begin
  if owner_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_skin_type is not null and p_skin_type not in ('dry', 'oily', 'combination', 'normal', 'unsure') then
    raise exception 'Invalid skin type' using errcode = '22023';
  end if;
  if p_monthly_budget_minor is not null and p_monthly_budget_minor < 0 then
    raise exception 'Invalid monthly budget' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.consent_versions
    where id = p_consent_version_id and scope = 'skin_profile' and active
  ) then
    raise exception 'Current consent version is required' using errcode = '22023';
  end if;

  insert into public.skin_profiles (
    user_id, skin_type, concern_ids, avoid_ingredient_ids, monthly_budget_minor, onboarding_completed_at
  ) values (
    owner_id, p_skin_type, coalesce(p_concern_ids, '{}'), coalesce(p_avoid_ingredient_ids, '{}'),
    p_monthly_budget_minor, now()
  ) on conflict (user_id) do update set
    skin_type = excluded.skin_type,
    concern_ids = excluded.concern_ids,
    avoid_ingredient_ids = excluded.avoid_ingredient_ids,
    monthly_budget_minor = excluded.monthly_budget_minor,
    onboarding_completed_at = coalesce(public.skin_profiles.onboarding_completed_at, excluded.onboarding_completed_at),
    updated_at = now()
  returning * into completed_profile;

  insert into public.user_consents (user_id, consent_version_id, scope)
  values (owner_id, p_consent_version_id, 'skin_profile')
  on conflict (user_id, consent_version_id, scope) do nothing;

  return completed_profile;
end;
$$;

revoke all on function public.complete_skin_onboarding(text, text[], text[], integer, text) from public, anon;
grant execute on function public.complete_skin_onboarding(text, text[], text[], integer, text) to authenticated;
