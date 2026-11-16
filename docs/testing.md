# Testing and current data status

## Catalog

The development catalog is seeded in Supabase from the prior in-app mock records. Product names, descriptions, ingredient labels, store names, and prices are demonstration content only. They are not live merchant inventory or verified prices.

The Expo client has read-only access to active catalog records. Mobile clients cannot write products, offers, brands, or categories.

## User settings

The notification and privacy switches persist in the owner-only `user_settings` row. The privacy switches record a preference only; the app does not yet upload skin images or send data to an AI provider.

## Required verification before release

- Run `npm test -- --runInBand`, `npm run typecheck`, `npm run lint`, and `npx expo-doctor`.
- Build Android with the configured JDK and Android SDK.
- Verify anonymous catalog browse, catalog error retry, signed-in setting toggles, logout/login, and an app restart on a physical Android device.
- Before displaying production prices, replace the development catalog with an approved licensed or first-party product and merchant-price source.
