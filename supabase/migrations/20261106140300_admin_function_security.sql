-- Supabase projects may have default EXECUTE grants for anon. Admin RPCs must
-- be callable only with an authenticated JWT; each function still checks role.
revoke all on function public.has_admin_role(text[]) from anon;
revoke all on function public.record_admin_audit(text, text, text, jsonb) from anon;
revoke all on function public.admin_add_support_reply(uuid, text) from anon;
revoke all on function public.admin_review_payment_proof(uuid, boolean, text) from anon;
revoke all on function public.admin_update_store_order(uuid, text, text, text) from anon;
revoke all on function public.admin_update_store_checkout_config(boolean, integer, text, text, text, text) from anon;
revoke all on function public.admin_update_support_request(uuid, text) from anon;
revoke all on function public.list_admin_users() from anon;
revoke all on function public.update_admin_user_access(uuid, text, boolean) from anon;
revoke all on function public.is_admin() from anon;
