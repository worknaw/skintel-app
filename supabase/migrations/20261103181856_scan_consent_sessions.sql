-- Consent versions are intentionally not seeded until provider and retention are decided.
create table public.skin_scan_consent_versions (
  version text primary key check (char_length(version) between 1 and 80),
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  provider text not null check (char_length(btrim(provider)) between 1 and 120),
  image_retention_description text not null check (char_length(btrim(image_retention_description)) between 1 and 2000),
  active boolean not null default false,
  published_at timestamptz not null default now()
);

create table public.skin_scan_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_version text not null references public.skin_scan_consent_versions(version),
  accepted_at timestamptz not null default now(),
  unique (id, user_id)
);

create index skin_scan_consents_user_accepted_idx on public.skin_scan_consents(user_id, accepted_at desc);
create index skin_scan_consents_version_idx on public.skin_scan_consents(consent_version);

alter table public.skin_scans add column consent_id uuid;
alter table public.skin_scans add column request_id uuid;
alter table public.skin_scans add constraint skin_scans_consent_owner_fk
  foreign key (consent_id, user_id) references public.skin_scan_consents(id, user_id);
alter table public.skin_scans add constraint skin_scans_owner_request_unique unique (user_id, request_id);

alter table public.skin_scan_consent_versions enable row level security;
alter table public.skin_scan_consents enable row level security;
revoke all on public.skin_scan_consent_versions, public.skin_scan_consents from public, anon, authenticated;
grant select on public.skin_scan_consent_versions, public.skin_scan_consents to authenticated;
create policy skin_scan_consent_versions_active on public.skin_scan_consent_versions
  for select to authenticated using (active);
create policy skin_scan_consents_select_own on public.skin_scan_consents
  for select to authenticated using ((select auth.uid()) = user_id);

-- Published content remains stable for receipts; active can be disabled separately.
create function public.prevent_skin_scan_consent_version_rewrite()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.version is distinct from old.version
     or new.body is distinct from old.body
     or new.provider is distinct from old.provider
     or new.image_retention_description is distinct from old.image_retention_description
     or new.published_at is distinct from old.published_at then
    raise exception 'Consent version content is immutable' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger skin_scan_consent_version_immutable
before update on public.skin_scan_consent_versions
for each row execute function public.prevent_skin_scan_consent_version_rewrite();

-- Receipt and scan are created atomically; request id is scoped to the verified user.
create function public.create_consented_skin_scan(p_consent_version text, p_accepted boolean, p_request_id uuid)
returns table(scan_id uuid, status text)
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  receipt_id uuid;
  existing_scan public.skin_scans%rowtype;
  existing_version text;
begin
  if owner_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_accepted is distinct from true or p_request_id is null or p_consent_version is null then
    raise exception 'Consent and request ID required' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 0));
  select * into existing_scan from public.skin_scans s
    where s.user_id = owner_id and s.request_id = p_request_id;
  if found then
    select c.consent_version into existing_version from public.skin_scan_consents c
      where c.id = existing_scan.consent_id and c.user_id = owner_id;
    if existing_version is distinct from p_consent_version then
      raise exception 'Request ID already used for another consent version' using errcode = '22023';
    end if;
    return query select existing_scan.id, existing_scan.status;
    return;
  end if;
  perform 1 from public.skin_scan_consent_versions v
    where v.version = p_consent_version and v.active for share;
  if not found then
    raise exception 'Consent version unavailable' using errcode = '22023';
  end if;
  insert into public.skin_scan_consents (user_id, consent_version)
    values (owner_id, p_consent_version) returning id into receipt_id;
  insert into public.skin_scans (user_id, status, consent_id, request_id)
    values (owner_id, 'created', receipt_id, p_request_id)
    returning * into existing_scan;
  return query select existing_scan.id, existing_scan.status;
end;
$$;
revoke all on function public.create_consented_skin_scan(text, boolean, uuid) from public, anon;
grant execute on function public.create_consented_skin_scan(text, boolean, uuid) to authenticated;
revoke all on function public.prevent_skin_scan_consent_version_rewrite() from public, anon, authenticated;
