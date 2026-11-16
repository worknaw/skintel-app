-- Foundation only: clients can read their own records; trusted backend writes are added later.
create table public.skin_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'created'
    check (status in ('created', 'uploading', 'uploaded', 'processing', 'completed', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  error_code text check (error_code is null or char_length(error_code) <= 80),
  unique (id, user_id),
  check ((status = 'completed') = (completed_at is not null))
);

create table public.skin_analysis_results (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  schema_version text not null check (char_length(schema_version) between 1 and 40),
  model_name text not null check (char_length(model_name) between 1 and 120),
  model_version text not null check (char_length(model_version) between 1 and 120),
  observations jsonb not null check (jsonb_typeof(observations) = 'array'),
  created_at timestamptz not null default now(),
  foreign key (scan_id, user_id) references public.skin_scans(id, user_id) on delete cascade
);

create index skin_scans_owner_created_idx on public.skin_scans (user_id, created_at desc);
create index skin_analysis_results_owner_created_idx on public.skin_analysis_results (user_id, created_at desc);

alter table public.skin_scans enable row level security;
alter table public.skin_analysis_results enable row level security;

revoke all on public.skin_scans, public.skin_analysis_results from public, anon, authenticated;
grant select on public.skin_scans, public.skin_analysis_results to authenticated;

create policy skin_scans_select_own on public.skin_scans
  for select to authenticated using ((select auth.uid()) = user_id);
create policy skin_analysis_results_select_own on public.skin_analysis_results
  for select to authenticated using ((select auth.uid()) = user_id);

comment on table public.skin_scans is 'Scan metadata only. Creation and status transitions require a trusted backend.';
comment on table public.skin_analysis_results is 'AI results are inserted only by a trusted backend after validation; no diagnostic claims.';
