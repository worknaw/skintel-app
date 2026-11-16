-- Enable the admin console's live refresh channel for operational tables.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['store_orders', 'store_payment_proofs', 'skin_scans', 'support_requests'] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;
