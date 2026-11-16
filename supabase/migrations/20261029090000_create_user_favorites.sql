-- A saved product belongs to exactly one authenticated account.  The table is
-- deliberately separate from products: a favourite is an interest signal, not
-- proof that the user owns or uses the product in a routine.
create table public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index user_favorites_user_created_idx
  on public.user_favorites (user_id, created_at desc);

grant select, insert, delete on public.user_favorites to authenticated;

alter table public.user_favorites enable row level security;

create policy "user_favorites_select_own"
  on public.user_favorites for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_favorites_insert_own"
  on public.user_favorites for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_favorites_delete_own"
  on public.user_favorites for delete to authenticated
  using ((select auth.uid()) = user_id);
