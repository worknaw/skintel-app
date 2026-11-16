-- A completion log is intentionally separate from the generated routine. The
-- plan can improve over time without rewriting a customer's past check-ins.
create table public.user_routine_checkins (
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_date date not null,
  period text not null check (period in ('am', 'pm')),
  completed_step_ids text[] not null default '{}' check (cardinality(completed_step_ids) <= 12),
  updated_at timestamptz not null default now(),
  primary key (user_id, routine_date, period)
);
create index user_routine_checkins_owner_date_idx on public.user_routine_checkins(user_id, routine_date desc);
alter table public.user_routine_checkins enable row level security;
revoke all on public.user_routine_checkins from public, anon, authenticated;
grant select, insert, update, delete on public.user_routine_checkins to authenticated;
create policy user_routine_checkins_select_own on public.user_routine_checkins for select to authenticated
  using ((select auth.uid()) = user_id);
create policy user_routine_checkins_insert_own on public.user_routine_checkins for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy user_routine_checkins_update_own on public.user_routine_checkins for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy user_routine_checkins_delete_own on public.user_routine_checkins for delete to authenticated
  using ((select auth.uid()) = user_id);
