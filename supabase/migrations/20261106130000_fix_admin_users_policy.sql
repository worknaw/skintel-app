-- Avoid evaluating is_admin() from the admin_users policy itself.
-- The self-row check is enough for the login gate and prevents recursive RLS evaluation.
drop policy if exists admin_users_read_self on public.admin_users;
create policy admin_users_read_self on public.admin_users
for select to authenticated
using (user_id = auth.uid());
