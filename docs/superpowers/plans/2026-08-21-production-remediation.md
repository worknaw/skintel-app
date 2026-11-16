# SkinCycle Production Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the currently simulated application flows with secure, persistent, user-scoped functionality while retaining every existing visual property of the UI.

**Architecture:** Keep Expo Router screens as route entries and move session, repository, and mutation logic into feature-local application/data modules. The Expo client uses the Supabase publishable key only; authenticated user data is protected by RLS, and face-image/AI work stays behind authenticated Edge Functions.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript 6, Expo Router, React Query, Supabase Auth/Postgres/Storage/Edge Functions, Jest.

**Spec:** `docs/requirements.md`, `docs/architecture.md`, `docs/database.md`

## Global Constraints

- Do not alter layout, spacing, size, fonts, font weight, color, border, radius, shadow, icons, images, animation, visible wording, element placement, or tab/navigation-bar appearance.
- Keep Expo dependencies compatible with the exact SDK 57 documentation at `https://docs.expo.dev/versions/v57.0.0/`.
- Use `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` only in the client; never ship a service-role or AI-provider secret.
- Use an RLS policy for every client-exposed table and storage object; user-owned policies enforce `(select auth.uid()) = user_id`.
- Preserve guest access to product browsing; protect user-specific actions and return users to their intended destination after authentication.
- Do not deploy an AI provider until its provider/model, data-processing region, retention policy, and approved output contract are explicitly selected.

---

## Audit Findings and Dependency Order

1. Authentication is configured and email/password plus Google code exchange exist, but no app-level session provider, auth-event subscription, protected-intent return, or mobile deep-link handler exists.
2. The production database exposes only `public.profiles`; every product, favorite, routine, analysis, settings, consent, storage, and notification feature has no backing table or policy.
3. Product catalogue, offers, routine, analysis results, profile metrics, and scan capture/analysis are hardcoded or simulated.
4. Several visible controls are no-ops or route to nonexistent/wrong destinations: notification bell, password reset, Apple sign-in, profile edit, saved products, ingredient avoidance, score details, points, routine calendar/action cards, result save/details, and settings rows.
5. Settings switches are process-local state and logout ignores failures.
6. Existing tests are utility-only (16 assertions) and do not exercise screen/auth/database integrations.
7. Local migration history (`20260821080430`, `20260821080433`) does not match deployed history (`20260821075706`, `20260821080133`), so migration lineage must be reconciled before new production DDL.
8. Supabase security advisor reports that leaked-password protection is disabled; this is a dashboard configuration action.

### Task 1: Reconcile deployment baseline and migration lineage

**Files:**
- Modify: `supabase/migrations/20260821080430_create_user_profiles.sql`
- Modify: `supabase/migrations/20260821080433_harden_profile_trigger_function.sql`
- Modify: `.gitignore`
- Create: `docs/testing.md`

**Interfaces:**
- Consumes: deployed migrations `20260821075706_create_user_profiles` and `20260821080133_harden_profile_trigger_function`.
- Produces: local migration sequence that exactly identifies deployed schema and a reproducible verification record.

- [ ] **Step 1: Record the deployed version set before changing any DDL**

Run:

```powershell
npx supabase migration list --linked
```

Expected: the two remote versions are `20260821075706` and `20260821080133`.

- [ ] **Step 2: Rename or re-baseline the two local migration files so their versions match the deployed versions without changing their SQL bodies**

```text
20260821075706_create_user_profiles.sql
20260821080133_harden_profile_trigger_function.sql
```

- [ ] **Step 3: Prevent local Android SDK configuration from entering source control**

Add this exact ignore rule:

```gitignore
/android/local.properties
```

- [ ] **Step 4: Verify the database baseline and RLS**

Run:

```sql
select c.relname, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';
```

Expected: `profiles` is the only public table and has RLS enabled.

### Task 2: Establish an app-wide authenticated session boundary

**Files:**
- Create: `src/features/auth/application/auth-session.ts`
- Create: `src/features/auth/application/auth-session.test.ts`
- Create: `src/features/auth/ui/auth-session-provider.tsx`
- Modify: `src/app/_layout.tsx`
- Modify: `src/features/auth/ui/auth-screen.tsx`
- Modify: `src/features/profile/ui/profile-screen.tsx`

**Interfaces:**
- Consumes: `supabase.auth.getSession()`, `supabase.auth.onAuthStateChange()`.
- Produces: `useAuthSession(): { session: Session | null; isLoading: boolean; requireAuth(intent: string): boolean }`.

- [ ] **Step 1: Write failing session transition tests**

```ts
it('returns the intended route after a signed-in event', () => {
  expect(resolvePostAuthRoute('/(tabs)/analysis', true)).toBe('/analysis');
});

it('sends a protected intent to auth when no session exists', () => {
  expect(resolveProtectedRoute('/analysis', false)).toEqual({ pathname: '/auth', params: { returnTo: '/analysis' } });
});
```

- [ ] **Step 2: Implement pure route helpers and make the tests pass**

```ts
export function resolvePostAuthRoute(returnTo: string | undefined, hasSession: boolean): string {
  return hasSession && returnTo?.startsWith('/') ? returnTo : '/';
}
```

- [ ] **Step 3: Implement `AuthSessionProvider` with initial `getSession`, `onAuthStateChange`, and subscription cleanup**

```tsx
const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
  setSession(nextSession);
  setIsLoading(false);
});
return () => subscription.unsubscribe();
```

- [ ] **Step 4: Replace per-screen profile session probing with the provider and gate protected actions via `requireAuth`**

Only change navigation logic; retain current rendered elements and copy.

- [ ] **Step 5: Run focused and project checks**

Run:

```powershell
npm test -- --runInBand src/features/auth/application/auth-session.test.ts
npm run typecheck
npm run lint
```

Expected: all commands exit with code 0.

### Task 3: Complete and harden credential and OAuth flows

**Files:**
- Create: `src/features/auth/application/password-reset.ts`
- Create: `src/features/auth/application/password-reset.test.ts`
- Modify: `src/features/auth/ui/auth-screen.tsx`
- Modify: `src/features/auth/application/oauth-callback.ts`
- Create: `src/app/auth-callback.tsx`
- Modify: `src/app/_layout.tsx`

**Interfaces:**
- Consumes: `supabase.auth.resetPasswordForEmail`, `exchangeCodeForSession`, `setSession`, and `Linking` callback URLs.
- Produces: `getPasswordResetRedirectUrl`, `completeAuthCallback`, and reliable return-intent routing.

- [ ] **Step 1: Write failing parsing tests for code and token callbacks and reset redirect generation**

```ts
expect(getPasswordResetRedirectUrl((path) => `skincycle://${path}`)).toBe('skincycle://auth-callback');
expect(extractOAuthSession('skincycle://auth-callback?code=abc')).toEqual({ code: 'abc' });
```

- [ ] **Step 2: Implement password reset submission using the existing feedback area and disable concurrent submission**

```ts
await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: getPasswordResetRedirectUrl(Linking.createURL) });
```

- [ ] **Step 3: Implement deep-link callback session exchange and route replacement**

```ts
const payload = extractOAuthSession(url);
if ('code' in payload) return supabase.auth.exchangeCodeForSession(payload.code);
return supabase.auth.setSession({ access_token: payload.accessToken, refresh_token: payload.refreshToken });
```

- [ ] **Step 4: Do not make the Apple control appear functional until Apple OAuth is configured**

Keep its appearance unchanged and route its press to the existing feedback mechanism with a configuration-specific failure; do not claim sign-in completed.

- [ ] **Step 5: Test auth paths on Android**

Run email login, register, incorrect credential, duplicate submit, Google cancellation, Google success, cold start session restore, logout, and password reset on the physical device.

### Task 4: Build the catalog data layer and replace mock product reads

**Files:**
- Create: `supabase/migrations/<new-version>_create_catalog.sql`
- Create: `src/features/products/data/supabase-product-repository.ts`
- Create: `src/features/products/data/supabase-product-repository.test.ts`
- Modify: `src/features/products/application/product-queries.ts`
- Modify: `src/features/products/ui/product-detail-screen.tsx`
- Remove: `src/features/products/data/mock-product-repository.ts`
- Remove: `src/features/products/data/mock-products.ts`

**Interfaces:**
- Consumes: `ProductRepository.list(query)` and `ProductRepository.getById(id)`.
- Produces: public RLS-protected catalog reads, server-derived prices/offers/ingredients, and pagination/filtering.

- [ ] **Step 1: Confirm the approved product data source before inserting catalogue records**

Required decision: approve a curated first-party catalogue import with documented source URLs and price update ownership, or provide the licensed source/API. The current source is a hand-written mock and cannot be represented as verified product data.

- [ ] **Step 2: Write repository mapping tests against concrete database row fixtures**

```ts
expect(mapCatalogProduct(row).startingPrice).toEqual({ amountMinor: 59000, currency: 'THB' });
expect(mapCatalogPage([], 0)).toEqual({ items: [], nextCursor: null, total: 0 });
```

- [ ] **Step 3: Apply catalog migration with `brands`, `categories`, `products`, `ingredients`, `product_ingredients`, `store_offers`, explicit grants, RLS, and indexes**

The migration must store price as `integer` minor units and `currency char(3)`, expose only active catalogue rows, and grant read access without user write access.

- [ ] **Step 4: Implement server-side query mapping with bounded `limit`, stable cursor order, case-insensitive name/brand search, category filter, and supported sort keys**

```ts
export const supabaseProductRepository: ProductRepository = {
  async list(query) { /* one bounded Supabase query plus mapping */ },
  async getById(id) { /* one active-product query plus related rows */ },
};
```

- [ ] **Step 5: Replace hardcoded product detail ingredients, skin labels, ratings, offers, and favorite display state with repository data**

Retain all existing visual components; only supply the current component tree with actual fields.

- [ ] **Step 6: Verify anon/catalog reads and authenticated user isolation**

Run integration SQL for anon read, authenticated read, and failed write; then run `npm test`, typecheck, lint, and Android build.

### Task 5: Persist user settings and complete account actions safely

**Files:**
- Create: `supabase/migrations/<new-version>_create_user_settings.sql`
- Create: `src/features/settings/data/supabase-settings-repository.ts`
- Create: `src/features/settings/data/supabase-settings-repository.test.ts`
- Modify: `src/app/settings.tsx`
- Modify: `src/features/profile/ui/profile-screen.tsx`

**Interfaces:**
- Consumes: authenticated user ID and the visible setting labels from `settings-sections.ts`.
- Produces: `loadSettings(userId)` and `setSetting(userId, key, value)` with owner-only RLS.

- [ ] **Step 1: Write failing setting persistence tests**

```ts
await repository.setSetting('user-a', 'routine_morning', true);
await expect(repository.loadSettings('user-a')).resolves.toMatchObject({ routine_morning: true });
```

- [ ] **Step 2: Create a normalized `user_settings` row keyed by `user_id` with defaults matching the current off state and RLS policies**

Every setting write must include both `using ((select auth.uid()) = user_id)` and `with check ((select auth.uid()) = user_id)`.

- [ ] **Step 3: Load persisted values and serialize switch mutations with disabled-in-flight state**

Do not change Switch presentation or row layout. Roll back a failed mutation to its previous value.

- [ ] **Step 4: Implement safe sign-out error handling and query-cache clearing**

```ts
const { error } = await supabase.auth.signOut();
if (error) throw error;
queryClient.clear();
router.replace('/auth');
```

- [ ] **Step 5: Wire profile edit, saved products, avoid ingredients, score details, and points only after their backing routes/data contracts exist**

The current `/profile/edit` route does not exist and `/profile` self-links. Do not redirect these controls to unrelated screens.

### Task 6: Implement ownership-backed products, skin profile, routine, and history

**Files:**
- Create: migrations for `skin_profiles`, `user_avoid_ingredients`, `user_products`, `favorite_products`, `routines`, `routine_days`, `routine_steps`, `routine_step_completions`, and `daily_skin_checks`.
- Create: feature-local repositories and mapping tests under `src/features/skin-profile`, `src/features/routines`, and `src/features/products`.
- Modify: `profile-screen.tsx`, `routine-screen.tsx`, `product-card.tsx`, and `product-detail-screen.tsx` only to provide existing views with persisted values/actions.

**Interfaces:**
- Consumes: authenticated session, catalog records, and latest completed analysis.
- Produces: owner-scoped profile/favorite/routine/history reads and idempotent daily completion mutations.

- [ ] **Step 1: Write cross-user RLS integration cases for every user-owned table**

```sql
-- user A insert succeeds; user B select/update/delete by A's UUID returns no rows.
```

- [ ] **Step 2: Add table constraints, foreign keys, user-first indexes, explicit grants, RLS policies, and immutable routine revision fields**

Use the names and constraints from `docs/database.md`; each ownership predicate uses `auth.uid()` against the row `user_id`.

- [ ] **Step 3: Implement repositories before changing UI call sites**

Each repository returns typed empty data where the current UI can display zero values; it never substitutes fabricated analysis/routine/product values.

- [ ] **Step 4: Replace profile and routine hardcoded values with persisted data**

Use zero/empty data only when the database has no user records. Preserve all current components and text.

- [ ] **Step 5: Verify save/unsave product, create/update profile, routine completion, app restart, logout/login, and user A/user B isolation**

Run repository tests plus physical-device test cases.

### Task 7: Implement real camera, private storage, and analysis lifecycle

**Files:**
- Modify: `package.json`
- Modify: `app.json`
- Create: `supabase/migrations/<new-version>_create_analysis_lifecycle.sql`
- Create: `supabase/functions/start-skin-analysis/index.ts`
- Create: `src/features/skin-analysis/data/expo-camera-capture-service.ts`
- Create: `src/features/skin-analysis/data/supabase-skin-analysis-gateway.ts`
- Create: `src/features/skin-analysis/application/analysis-polling.ts`
- Create: tests for transition, upload validation, and gateway failure states.
- Modify: `scan-flow-screen.tsx` and `analysis-screen.tsx` only to connect existing UI to these services.

**Interfaces:**
- Consumes: `CameraCaptureService`, `SkinAnalysisGateway`, authenticated session, private Storage bucket.
- Produces: a real `analysis_id`, immutable user-owned image path, persisted status/result, and safe failure/error codes.

- [ ] **Step 1: Select the AI provider/model, region, approved result schema, image-retention rule, and consent version**

These are explicit open decisions in `docs/requirements.md`; an AI call cannot be production-safe without them.

- [ ] **Step 2: Write state-machine tests for `created → uploaded → processing → completed|failed` and idempotency**

```ts
expect(canTransition('uploaded', 'processing')).toBe(true);
expect(canTransition('completed', 'processing')).toBe(false);
```

- [ ] **Step 3: Install the SDK-57-compatible camera module and declare camera permission text without altering visible screen design**

Use `npx expo install expo-camera`, then update `app.json` camera plugin configuration and rebuild the dev client.

- [ ] **Step 4: Apply private storage and analysis tables with owner-only RLS, path ownership policies, content validation, idempotency key uniqueness, and source deletion policy**

The source object path is exactly `{user_id}/{analysis_id}/source.{ext}`.

- [ ] **Step 5: Implement an authenticated Edge Function that validates JWT, ownership, consent, MIME/size, status, and idempotency before it reads Storage or calls the provider**

It must persist normalized result fields and model/version metadata, never provider raw output or client secrets.

- [ ] **Step 6: Replace the remote `MOCK_FACE`, timers that fabricate capture/completion, and hardcoded results with camera/service status**

Keep existing progress animation only as a visual reflection of actual server status; do not simulate completion.

- [ ] **Step 7: Test permission allow/deny/permanent deny, upload failure/retry, canceled scan, AI timeout, duplicate start, owner isolation, source deletion, and Android physical camera capture**

### Task 8: Finish reliability, cleanup, and release evidence

**Files:**
- Modify: `README.md`
- Modify: `docs/testing.md`
- Remove: unreferenced Expo-template components and `scripts/reset-project.js` only after import search confirms zero production references.
- Modify: CI/build scripts only if they are added without changing app UI.

**Interfaces:**
- Consumes: completed tasks 1–7.
- Produces: documented setup, reproducible checks, no stale mock implementation, and release evidence.

- [ ] **Step 1: Replace the Expo starter README with setup, environment, deep-link, Supabase migration, Android SDK, and test instructions**

- [ ] **Step 2: Add integration coverage for auth redirects, RLS owner separation, settings persistence, catalog pagination, and scan lifecycle**

- [ ] **Step 3: Remove only confirmed-unreferenced template utilities**

Use:

```powershell
Get-ChildItem src -Recurse -File -Include *.ts,*.tsx | Select-String -Pattern 'FeaturePreviewScreen|AppTabs|ThemedText|ThemedView|HintRow|WebBadge'
```

- [ ] **Step 4: Run release verification**

```powershell
npm test -- --runInBand
npm run typecheck
npm run lint
npx expo-doctor
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'; $env:ANDROID_HOME='C:\Users\balln\AppData\Local\Android\Sdk'; Push-Location android; .\gradlew.bat app:assembleDebug -x lint -x test; Pop-Location
```

- [ ] **Step 5: Run manual Android physical-device matrix**

Validate cold start, restored session, signed-out protected action, registration, login, Google OAuth, cancel OAuth, logout/login twice, bad network retry, empty account, camera permissions, scan retry, and account deletion.

## Scope Gates

- Catalog replacement cannot truthfully proceed until the product/price data source is approved.
- Real AI analysis cannot truthfully proceed until the five AI/privacy decisions in Task 7 are selected.
- Account deletion, privacy-policy display, terms display, help/contact/report, Apple sign-in, and push-notification delivery require business content, an external support destination, Apple OAuth credentials, and notification delivery policy respectively; the existing UI has no implementation contract for these controls.
- The UI lock prevents introducing new loading, retry, validation, consent, or confirmation surfaces where no existing surface exists. Any such visual change requires explicit approval before implementation.

## Self-Review

- Spec coverage: Tasks 1–3 cover auth and redirects; Tasks 4–6 cover catalog, profile, favorites, routines, and RLS; Task 7 covers camera/storage/AI; Task 8 covers cleanup and verification.
- Deferred scope is explicit only where the required source, policy, credential, or UX surface is absent.
- Type consistency: repository interfaces extend existing `ProductRepository`, `CameraCaptureService`, and `SkinAnalysisGateway` boundaries; new user-owned repositories accept the authenticated user ID only as an input for client cache scope, with database ownership enforced by RLS.

