-- Grants required for the role-aware admin policies created by the operations migration.
grant select, insert, update, delete on public.products, public.brands, public.categories, public.store_variants, public.store_offers to authenticated;
grant update on public.store_orders, public.store_payment_proofs, public.support_requests to authenticated;
