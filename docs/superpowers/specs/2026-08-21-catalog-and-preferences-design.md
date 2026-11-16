# Catalog and User Preferences Design

## Goal

Replace client-side product mocks with a Supabase-backed seed catalogue, and persist the existing privacy and notification toggle values for each authenticated user without changing any existing UI.

## Scope

- Seed the current mock product, ingredient, offer, and price content into Supabase.
- Serve Home, Discover, and Product Detail through a typed Supabase repository.
- Persist the seven existing settings toggles in an owner-scoped `user_settings` row.
- Keep privacy choices as future-facing preferences only. No image, skin profile, or telemetry is sent to an AI provider in this scope.

## Excluded Scope

- AI analysis, image upload, camera permissions, model/provider integration, image retention, and analysis history.
- Product administration UI, price scraping, checkout, and external-data ingestion.
- New visual controls, layout, copy, colors, or interaction appearance.

## Catalogue Schema

`brands` contains unique display names. `categories` contains the six existing category IDs and labels. `products` stores the current product identity, category, size, rating, review count, description, active flag, and timestamps.

For this small seeded development catalogue, `products` stores the existing multi-value display fields as Postgres `text[]` columns: tags, key ingredients, ingredient list, skin types, concerns, and routine roles. `search_text` is maintained by database triggers from the brand, product name, tags, key ingredients, and concerns. `store_offers` stores each offer URL, integer minor-unit price, ISO currency, availability, and last-updated timestamp.

The catalogue is visible to `anon` and `authenticated` readers. Client roles receive `SELECT` only. Every table has RLS enabled and uses an active-product/active-offer policy where applicable; no client write policy exists.

## Preferences Schema

`user_settings` has `user_id uuid primary key references auth.users(id) on delete cascade`, boolean columns for the five notification preferences and two privacy preferences, plus timestamps. Values default to `false` to retain the present first-open state.

Only `authenticated` users can select, insert, or update the row where `user_id = auth.uid()`. Update has both `USING` and `WITH CHECK` ownership predicates. The client returns local defaults until a row exists, then creates the row lazily on the first toggle upsert; no user can read or overwrite another user’s row.

## Data Flow

1. Home and Discover call `supabaseProductRepository.list(query)` through existing React Query options.
2. The repository fetches only active catalogue rows, applies a bounded limit, category/search/sort filters, and maps database rows into existing `ProductSummary` / `Product` types.
3. Product Detail reads ingredients, labels, and offers from the selected product instead of module-level constants.
4. Settings loads a user row after the app session is restored. Toggle updates persist one value at a time and roll back in memory if Supabase rejects the mutation.
5. AI remains absent from this flow; saved privacy preferences produce no outbound processing effect yet.

## Validation and Failure Behaviour

- `limit` is clamped to 1–30, product IDs are opaque strings, and sort accepts only the current `ProductSort` union.
- Price is always an integer >= 0 with a three-letter uppercase currency.
- Existing product list/detail feedback components retain their loading, error, empty, and retry rendering.
- Settings only mutates for a restored authenticated session. Failure retains the last server-confirmed preference value; no error is discarded.

## Security

- The Expo client continues to use only `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- No service role, provider secret, raw skin image, or consent decision is added to the mobile bundle.
- All public tables explicitly grant only required table privileges and enable RLS.
- `user_settings` ownership is enforced in Postgres and is not inferred from user metadata.

## Verification

- Unit tests cover database-row mapping, bounded query input, search escaping, and preference defaults.
- Supabase checks verify RLS is enabled and privileges/policies match the access model.
- Integration checks verify anonymous catalogue read succeeds, anonymous writes fail, user A cannot read/update user B settings, and product filters/sorts return expected seeded data.
- Regression runs: Jest, TypeScript, ESLint, Expo Doctor, and Android debug build.
