# SkinCycle Admin

The admin console is deployed as a static site. Vercel runs `node admin/build-config.mjs` and writes `admin/config.js` from these Environment Variables:

- `SKINCYCLE_SUPABASE_URL`
- `SKINCYCLE_SUPABASE_PUBLISHABLE_KEY`

The build also has a browser-safe fallback in `admin/config.public.mjs` so the console can boot when the Vercel variables have not been added yet. Vercel variables take precedence when present; never put a service-role key in either location.

If the variables are missing, the page stops at a configuration error and does not render demo data. The publishable key is safe for browser use; never add a Supabase service-role key here.

## Enable admin access

1. Apply the migrations in `supabase/migrations/20261106120000_create_admin_access.sql`, `supabase/migrations/20261106140000_admin_operations.sql`, `supabase/migrations/20261106140100_admin_operation_grants.sql`, `supabase/migrations/20261106140200_admin_realtime.sql`, and `supabase/migrations/20261106140300_admin_function_security.sql`.
2. Create the operator account in Supabase Auth.
3. Add that Auth user to `public.admin_users`, for example:

```sql
insert into public.admin_users (user_id, role)
values ('AUTH_USER_UUID', 'owner');
```

The console then checks both Supabase Auth and `admin_users` before loading operational data. Owner/admin/support/content/fulfillment roles control which write actions are available, and write actions are recorded in `admin_audit_logs`.
