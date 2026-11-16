create table if not exists public.skin_chat_rate_limits (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists skin_chat_rate_limits_user_time_idx on public.skin_chat_rate_limits (user_id, created_at desc);
alter table public.skin_chat_rate_limits enable row level security;
revoke all on public.skin_chat_rate_limits from anon, authenticated;
