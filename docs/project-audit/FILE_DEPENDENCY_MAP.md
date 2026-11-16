# SkinCycle File Dependency Map

สถานะ inventory ณ วันที่ 2026-11-04: 206 ไฟล์ ไม่รวม generated/dependencies/ข้อมูลส่วนตัวและรายงานนี้ ดูขอบเขตและวิธีตรวจใน AUDIT_REPORT

## แผนผังระบบ

```text
Expo Router src/app → screens → application hooks/query → repositories → Supabase client → Auth / PostgREST / RLS
root layout → QueryClientProvider → AuthSessionProvider → notification observer → tabs
auth → getSkinProfile → onboarding → active consent + complete_skin_onboarding RPC
home/discover → product queries → products/brands/store_offers; product cards → favorite hook → user_favorites
profile → profiles + favorites; settings → user_settings + local notifications
settings detail → account repository → profiles / Auth / support_requests / export/delete RPC
analysis route → scan-flow → local-scan → USB research server หรือ HTTPS pilot → model
scripts/skin-ai-benchmark.mjs → benchmark-input.ts → benchmark.ts (CLI, ไม่ใช่ app route)
routine route → placeholder; routine domain types ยังไม่ถูกเรียกจาก route
```

## ผลกระทบเมื่อแก้ไฟล์หลัก

| จุดเปลี่ยน | ผลกระทบ |
|---|---|
| core/supabase/client.ts | auth ทุก repository, session storage และ static web |
| auth-session-provider | protected pages, account switch, query ownership, reminders |
| migrations | repository, RPC, grants/RLS, deployment history และ export/delete |
| product repository/domain | Home, Discover, detail, favorites และ sorting |
| favorite hook | ProductCard ทุกหน้าและ cache ตาม user |
| local-notifications | settings, logout, notification observer และ Android/iOS permissions |
| scan services / Python | camera, HTTPS bearer/consent, file cleanup, research inference |
| theme / shared components | ทุกหน้าจอและ platform styling |

## Static reachability candidates

การวิเคราะห์เริ่มที่ src/app ทุก route และติดตาม import/export/literal require/import รวม platform variants; ไม่ครอบคลุม reference ที่ประกอบ string, config plugins หรือ external scripts จึงเป็น candidate เท่านั้น benchmark files ใช้โดย CLI และ fixture ใช้โดย test

- `src/hooks/use-theme.ts`
- `src/hooks/use-color-scheme.web.ts`
- `src/hooks/use-color-scheme.ts`
- `src/core/result.ts`
- `src/features/auth/domain/auth-user.ts`
- `src/features/skin-analysis/ui/analysis-screen.tsx`
- `src/features/skin-analysis/services/scan-services.ts`
- `src/features/skin-analysis/domain/skin-analysis.ts`
- `src/features/skin-analysis/evaluation/benchmark-input.ts`
- `src/features/skin-analysis/evaluation/benchmark.ts`
- `src/features/routines/domain/routine.ts`
- `src/features/skin-analysis/evaluation/fixtures/synthetic-input.json`
- `src/features/skin-analysis/application/scan-session-reducer.ts`
- `src/components/web-badge.tsx`
- `src/components/ui/collapsible.tsx`
- `src/components/themed-view.tsx`
- `src/components/themed-text.tsx`
- `src/components/hint-row.tsx`
- `src/components/feature-preview-screen.tsx`
- `src/components/external-link.tsx`
- `src/components/app-tabs.web.tsx`
- `src/components/app-tabs.tsx`
- `src/components/animated-icon.web.tsx`
- `src/components/animated-icon.tsx`
- `src/components/animated-icon.module.css`

## Inventory รายไฟล์

ทุกไฟล์ระบุขนาดและ SHA-256 prefix เพื่อใช้ระบุ baseline; สำหรับ src แสดง literal dependency ที่ resolve ได้ ภาพ/ฟอนต์ตรวจ metadata และการอ้างอิง ไม่ได้ตรวจคุณภาพทุกไฟล์ รายการในวงเล็บคือการอ้างอิงภายในที่พบ ไม่ใช่รายการผู้เรียกทั้งหมด

- `.env.example` — 236 bytes; SHA-256 `cba2d79f2b25`
- `.gitignore` — 673 bytes; SHA-256 `399be0be2c18`
- `.vscode/extensions.json` — 50 bytes; SHA-256 `f54cd822dce0`
- `.vscode/settings.json` — 152 bytes; SHA-256 `c9d2a3300e54`
- `AGENTS.md` — 118 bytes; SHA-256 `5986df214fcb`
- `CLAUDE.md` — 11 bytes; SHA-256 `336cc4fbf19b`
- `LICENSE` — 1106 bytes; SHA-256 `fb3ca4a837f5`
- `README.md` — 2183 bytes; SHA-256 `81a68c7166fe`
- `app.json` — 1521 bytes; SHA-256 `0d342df293f5`
- `assets/brand/skincycle-logo-original.png` — 845826 bytes; SHA-256 `53763488b9b2`
- `assets/brand/skincycle-wordmark-transparent.png` — 878966 bytes; SHA-256 `6b45510fe469`
- `assets/expo.icon/Assets/expo-symbol 2.svg` — 608 bytes; SHA-256 `ad117d20fd81`
- `assets/expo.icon/Assets/grid.png` — 53681 bytes; SHA-256 `8247d79a2b31`
- `assets/expo.icon/icon.json` — 780 bytes; SHA-256 `747c56e17822`
- `assets/fonts/NotoSansThai-Bold.ttf` — 47480 bytes; SHA-256 `0be544f347b3`
- `assets/fonts/NotoSansThai-Medium.ttf` — 47544 bytes; SHA-256 `f9855a702e98`
- `assets/fonts/NotoSansThai-Regular.ttf` — 47484 bytes; SHA-256 `9acb585d8662`
- `assets/fonts/NotoSansThai-SemiBold.ttf` — 47552 bytes; SHA-256 `2e0c06600ac0`
- `assets/images/android-icon-background.png` — 17549 bytes; SHA-256 `fb139c2dee36`
- `assets/images/android-icon-foreground.png` — 78796 bytes; SHA-256 `9e3d0315a33c`
- `assets/images/android-icon-monochrome.png` — 4140 bytes; SHA-256 `6371fc2c12e3`
- `assets/images/expo-badge-white.png` — 4129 bytes; SHA-256 `d9ba28c5e93a`
- `assets/images/expo-badge.png` — 4137 bytes; SHA-256 `ff353c7efadb`
- `assets/images/expo-logo.png` — 3317 bytes; SHA-256 `27b060a757a2`
- `assets/images/favicon.png` — 1129 bytes; SHA-256 `a4e030697a75`
- `assets/images/icon.png` — 845826 bytes; SHA-256 `53763488b9b2`
- `assets/images/logo-glow.png` — 331624 bytes; SHA-256 `bbd98a3f3c12`
- `assets/images/react-logo.png` — 6341 bytes; SHA-256 `224b7636b15e`
- `assets/images/react-logo@2x.png` — 14225 bytes; SHA-256 `fa600be9ad2f`
- `assets/images/react-logo@3x.png` — 21252 bytes; SHA-256 `cd84e02a5d54`
- `assets/images/splash-icon.png` — 3317 bytes; SHA-256 `27b060a757a2`
- `assets/images/tabIcons/explore.png` — 215 bytes; SHA-256 `e2dea1c2d209`
- `assets/images/tabIcons/explore@2x.png` — 347 bytes; SHA-256 `1b54913b3a0a`
- `assets/images/tabIcons/explore@3x.png` — 468 bytes; SHA-256 `2f3e43801df7`
- `assets/images/tabIcons/home.png` — 253 bytes; SHA-256 `3829632ec7d4`
- `assets/images/tabIcons/home@2x.png` — 343 bytes; SHA-256 `21c5a07df901`
- `assets/images/tabIcons/home@3x.png` — 479 bytes; SHA-256 `fe5b397975e7`
- `assets/images/tutorial-web.png` — 58959 bytes; SHA-256 `e372ec23ad62`
- `assets/products/anua-heartleaf-serum-generated.png` — 1212310 bytes; SHA-256 `01a64a85b9fb`
- `assets/products/anua-heartleaf-toner.jpg` — 68947 bytes; SHA-256 `0f03ab3de882`
- `assets/products/beauty-of-joseon-relief-sun.png` — 124992 bytes; SHA-256 `cb84646f5a11`
- `assets/products/the-ordinary-niacinamide.png` — 106271 bytes; SHA-256 `72763dca0067`
- `docs/README.md` — 991 bytes; SHA-256 `6875b56b617c`
- `docs/architecture.md` — 7735 bytes; SHA-256 `77f2bf107642`
- `docs/audit-2026-10-14.md` — 25481 bytes; SHA-256 `89f1cc32406e`
- `docs/database.md` — 7577 bytes; SHA-256 `956ea68afafa`
- `docs/design.md` — 30225 bytes; SHA-256 `e62af6569bde`
- `docs/requirements.md` — 6286 bytes; SHA-256 `a92cfa788543`
- `docs/skin-ai-dataset-shortlist.md` — 12353 bytes; SHA-256 `42c00cda0562`
- `docs/skin-ai-evaluation-protocol.md` — 7604 bytes; SHA-256 `b322b78a31d8`
- `docs/skin-ai-local-experiment.md` — 16891 bytes; SHA-256 `1186d6c254ab`
- `docs/skin-ai-plan.md` — 16045 bytes; SHA-256 `33b4cff7e64c`
- `docs/superpowers/plans/2026-08-21-catalog-and-preferences.md` — 11192 bytes; SHA-256 `3ae5e2a35c3e`
- `docs/superpowers/plans/2026-08-21-production-remediation.md` — 20629 bytes; SHA-256 `4006bd07425d`
- `docs/superpowers/plans/2026-08-21-skin-scan-flow.md` — 2042 bytes; SHA-256 `bad874552e03`
- `docs/superpowers/specs/2026-08-21-catalog-and-preferences-design.md` — 4493 bytes; SHA-256 `2b30b693e319`
- `docs/superpowers/specs/2026-08-21-skin-scan-flow-design.md` — 1544 bytes; SHA-256 `ba8ab1d617fd`
- `docs/testing.md` — 1132 bytes; SHA-256 `18f590174088`
- `eslint.config.js` — 262 bytes; SHA-256 `b04f8086b52a`
- `overlay-dismissed.png` — 433354 bytes; SHA-256 `a3c58dc1accd`
- `package-lock.json` — 595777 bytes; SHA-256 `358087871c25`
- `package.json` — 2188 bytes; SHA-256 `c7f03a680c96`
- `product-detail-balanced.png` — 335167 bytes; SHA-256 `7276d410498c`
- `product-detail-current.png` — 283539 bytes; SHA-256 `92257efd0989`
- `scripts/audit-project.cjs` — 2515 bytes; SHA-256 `1e13f84ad35f`
- `scripts/reset-project.js` — 3710 bytes; SHA-256 `549922a40b98`
- `scripts/skin-ai-benchmark.mjs` — 1033 bytes; SHA-256 `6df4c432b005`
- `scripts/skin_ai/explore_acne04.py` — 4122 bytes; SHA-256 `1ce0268d2ee4`
- `scripts/skin_ai/prepare_benchmark.py` — 3420 bytes; SHA-256 `6f8a0cfe1fbb`
- `scripts/skin_ai/requirements-https.txt` — 68 bytes; SHA-256 `acacff0eb294`
- `scripts/skin_ai/requirements.txt` — 70 bytes; SHA-256 `52693a4b57d6`
- `scripts/skin_ai/run_experiment.py` — 6618 bytes; SHA-256 `487abc991d38`
- `scripts/skin_ai/serve_https_scan.py` — 6899 bytes; SHA-256 `75320e7f7aa1`
- `scripts/skin_ai/serve_local_scan.py` — 4932 bytes; SHA-256 `5d52b9cdaaac`
- `scripts/skin_ai/synthetic-smoke-calibration.json` — 337 bytes; SHA-256 `dd2451d55211`
- `scripts/skin_ai/synthetic-smoke-manifest.json` — 258 bytes; SHA-256 `084f2096d4d2`
- `scripts/skin_ai/test_acne04.py` — 2677 bytes; SHA-256 `4a7d67f49c28`
- `scripts/skin_ai/test_experiment.py` — 2213 bytes; SHA-256 `fab2e2614c1d`
- `scripts/skin_ai/test_serve_https_scan.py` — 4961 bytes; SHA-256 `2346be07e59c`
- `src/app/(tabs)/_layout.tsx` — 4110 bytes; SHA-256 `aaa700854f1f` → `src/features/auth/ui/auth-session-provider.tsx`, `src/features/auth/application/auth-session.ts`, `src/constants/theme.ts`
- `src/app/(tabs)/analysis.tsx` — 149 bytes; SHA-256 `40a309e62509` → `src/features/skin-analysis/ui/scan-flow-screen.tsx`
- `src/app/(tabs)/discover.tsx` — 66 bytes; SHA-256 `0ac4352848b5` → `src/features/products/ui/discover-screen.tsx`
- `src/app/(tabs)/index.tsx` — 62 bytes; SHA-256 `35e74e65dba6` → `src/features/products/ui/home-screen.tsx`
- `src/app/(tabs)/profile.tsx` — 64 bytes; SHA-256 `fb011eab9600` → `src/features/profile/ui/profile-screen.tsx`
- `src/app/(tabs)/routine.tsx` — 139 bytes; SHA-256 `30b86fb8b9b9` → `src/features/routines/ui/routine-screen.tsx`
- `src/app/+not-found.tsx` — 1031 bytes; SHA-256 `114fd5a603f4` → `src/components/ui/app-text.tsx`, `src/components/ui/feedback-state.tsx`, `src/constants/theme.ts`
- `src/app/_layout.tsx` — 2731 bytes; SHA-256 `4dbd3693f2cb` → `src/constants/theme.ts`, `src/core/query/query-client.ts`, `src/features/auth/ui/auth-session-provider.tsx`, `src/features/settings/application/notification-navigation-observer.tsx`, `assets/fonts/NotoSansThai-Regular.ttf`, `assets/fonts/NotoSansThai-Medium.ttf`, `assets/fonts/NotoSansThai-SemiBold.ttf`, `assets/fonts/NotoSansThai-Bold.ttf`
- `src/app/auth.tsx` — 58 bytes; SHA-256 `8fee55bfc7e2` → `src/features/auth/ui/auth-screen.tsx`
- `src/app/favorites.tsx` — 68 bytes; SHA-256 `51de3f36332a` → `src/features/favorites/ui/favorites-screen.tsx`
- `src/app/onboarding.tsx` — 77 bytes; SHA-256 `c732cea5f67e` → `src/features/skin-profile/ui/skin-onboarding-screen.tsx`
- `src/app/product/[id].tsx` — 72 bytes; SHA-256 `15c85a3b0434` → `src/features/products/ui/product-detail-screen.tsx`
- `src/app/settings-detail/[section].tsx` — 73 bytes; SHA-256 `37cbec85992a` → `src/features/settings/ui/settings-detail-screen.tsx`
- `src/app/settings.tsx` — 9701 bytes; SHA-256 `90d9776d207e` → `src/components/ui/app-text.tsx`, `src/constants/theme.ts`, `src/features/settings/application/settings-sections.ts`, `src/features/settings/application/settings-content.ts`, `src/core/supabase/client.ts`, `src/features/auth/application/auth-session.ts`, `src/features/auth/ui/auth-session-provider.tsx`, `src/features/settings/data/supabase-settings-repository.ts`, `src/features/settings/domain/user-settings.ts`, `src/features/settings/application/local-notifications.ts`
- `src/components/animated-icon.module.css` — 143 bytes; SHA-256 `a70d5b1b0561`
- `src/components/animated-icon.tsx` — 3426 bytes; SHA-256 `53772b1cfee8` → `assets/images/expo-logo.png`, `assets/images/logo-glow.png`
- `src/components/animated-icon.web.tsx` — 2366 bytes; SHA-256 `d99b902d487b` → `src/components/animated-icon.module.css`, `assets/images/logo-glow.png`, `assets/images/expo-logo.png`
- `src/components/app-tabs.tsx` — 1054 bytes; SHA-256 `7d9910bce680` → `src/constants/theme.ts`, `assets/images/tabIcons/home.png`, `assets/images/tabIcons/explore.png`
- `src/components/app-tabs.web.tsx` — 3078 bytes; SHA-256 `a927ab6ff61c` → `src/components/external-link.tsx`, `src/components/themed-text.tsx`, `src/components/themed-view.tsx`, `src/constants/theme.ts`
- `src/components/external-link.tsx` — 794 bytes; SHA-256 `2838582e2dc2`
- `src/components/feature-preview-screen.tsx` — 2357 bytes; SHA-256 `9fe629c23c63` → `src/components/ui/app-text.tsx`, `src/constants/theme.ts`
- `src/components/hint-row.tsx` — 900 bytes; SHA-256 `2b5b1bbd4da6` → `src/components/themed-text.tsx`, `src/components/themed-view.tsx`, `src/constants/theme.ts`
- `src/components/themed-text.tsx` — 1657 bytes; SHA-256 `a8ff3da42cfc` → `src/constants/theme.ts`, `src/hooks/use-theme.ts`
- `src/components/themed-view.tsx` — 496 bytes; SHA-256 `e13930b2f4df` → `src/constants/theme.ts`, `src/hooks/use-theme.ts`
- `src/components/ui/app-button.tsx` — 1989 bytes; SHA-256 `77c34356c7ff` → `src/components/ui/app-text.tsx`, `src/constants/theme.ts`
- `src/components/ui/app-text.tsx` — 1504 bytes; SHA-256 `963cc49957ac` → `src/constants/theme.ts`
- `src/components/ui/chip.tsx` — 1473 bytes; SHA-256 `fdd25fbdf45a` → `src/components/ui/app-text.tsx`, `src/constants/theme.ts`
- `src/components/ui/collapsible.tsx` — 1924 bytes; SHA-256 `73613fbb9c2d` → `src/components/themed-text.tsx`, `src/components/themed-view.tsx`, `src/constants/theme.ts`, `src/hooks/use-theme.ts`
- `src/components/ui/feedback-state.tsx` — 1342 bytes; SHA-256 `af7b63549f84` → `src/components/ui/app-button.tsx`, `src/components/ui/app-text.tsx`, `src/constants/theme.ts`
- `src/components/ui/search-field.tsx` — 1660 bytes; SHA-256 `ac061ca9b431` → `src/constants/theme.ts`
- `src/components/ui/section-header.tsx` — 988 bytes; SHA-256 `df8228c6d4ea` → `src/components/ui/app-text.tsx`
- `src/components/web-badge.tsx` — 1018 bytes; SHA-256 `0af7715337e0` → `src/components/themed-text.tsx`, `src/components/themed-view.tsx`, `src/constants/theme.ts`, `assets/images/expo-badge-white.png`, `assets/images/expo-badge.png`
- `src/constants/theme.ts` — 2423 bytes; SHA-256 `548f7fcdfe54` → `src/global.css`
- `src/core/query/query-client.ts` — 263 bytes; SHA-256 `fd5fff7e16a5`
- `src/core/result.test.ts` — 591 bytes; SHA-256 `078dd6908d7b` → `src/core/result.ts`
- `src/core/result.ts` — 562 bytes; SHA-256 `67e05f5eaf7b`
- `src/core/supabase/client.ts` — 1210 bytes; SHA-256 `ee04c5cd0072`
- `src/features/auth/application/auth-redirect.test.ts` — 254 bytes; SHA-256 `3a29c906f57b` → `src/features/auth/application/auth-redirect.ts`
- `src/features/auth/application/auth-redirect.ts` — 112 bytes; SHA-256 `4c9cdc20c9de`
- `src/features/auth/application/auth-session.test.ts` — 798 bytes; SHA-256 `1acdb82ced4a` → `src/features/auth/application/auth-session.ts`
- `src/features/auth/application/auth-session.ts` — 595 bytes; SHA-256 `11e7cba7daa1`
- `src/features/auth/application/keyboard-layout.test.ts` — 379 bytes; SHA-256 `1cbd44cdfa76` → `src/features/auth/application/keyboard-layout.ts`
- `src/features/auth/application/keyboard-layout.ts` — 140 bytes; SHA-256 `49c715572597`
- `src/features/auth/application/oauth-callback.test.ts` — 667 bytes; SHA-256 `5fa65d1b2675` → `src/features/auth/application/oauth-callback.ts`
- `src/features/auth/application/oauth-callback.ts` — 650 bytes; SHA-256 `5807c8df7a52`
- `src/features/auth/domain/auth-user.ts` — 188 bytes; SHA-256 `16e5d2131eee`
- `src/features/auth/ui/auth-screen.tsx` — 25556 bytes; SHA-256 `8e3cee607920` → `src/components/ui/app-text.tsx`, `src/constants/theme.ts`, `src/core/supabase/client.ts`, `src/features/auth/application/keyboard-layout.ts`, `src/features/auth/application/oauth-callback.ts`, `src/features/auth/application/auth-redirect.ts`, `src/features/auth/application/auth-session.ts`, `src/features/skin-profile/data/supabase-skin-profile-repository.ts`, `assets/brand/skincycle-logo-original.png`
- `src/features/auth/ui/auth-session-provider.test.tsx` — 1880 bytes; SHA-256 `8c9bf777c0be` → `src/core/supabase/client.ts`, `src/features/auth/ui/auth-session-provider.tsx`
- `src/features/auth/ui/auth-session-provider.tsx` — 2202 bytes; SHA-256 `44765ec689fe` → `src/core/supabase/client.ts`
- `src/features/favorites/application/favorite-queries.ts` — 491 bytes; SHA-256 `d1731fb56f25` → `src/features/favorites/data/supabase-favorites-repository.ts`
- `src/features/favorites/application/use-product-favorite.ts` — 2257 bytes; SHA-256 `c189594c4ed1` → `src/features/favorites/application/favorite-queries.ts`, `src/features/favorites/data/supabase-favorites-repository.ts`, `src/features/auth/ui/auth-session-provider.tsx`, `src/features/products/domain/product.ts`
- `src/features/favorites/data/supabase-favorites-repository.test.ts` — 2332 bytes; SHA-256 `2b04d0ebd889` → `src/core/supabase/client.ts`, `src/features/favorites/data/supabase-favorites-repository.ts`
- `src/features/favorites/data/supabase-favorites-repository.ts` — 1149 bytes; SHA-256 `05cade31949c` → `src/core/supabase/client.ts`, `src/features/products/domain/product.ts`
- `src/features/favorites/ui/favorites-screen.tsx` — 5041 bytes; SHA-256 `66273fa5a624` → `src/components/ui/app-text.tsx`, `src/components/ui/feedback-state.tsx`, `src/constants/theme.ts`, `src/features/auth/application/auth-session.ts`, `src/features/auth/ui/auth-session-provider.tsx`, `src/features/favorites/application/favorite-queries.ts`, `src/features/products/application/product-queries.ts`, `src/features/products/ui/product-card.tsx`
- `src/features/products/application/format-money.test.ts` — 445 bytes; SHA-256 `b0b26be7fbfd` → `src/features/products/application/format-money.ts`
- `src/features/products/application/format-money.ts` — 344 bytes; SHA-256 `c7488ecc0226` → `src/features/products/domain/product.ts`
- `src/features/products/application/product-queries.ts` — 1214 bytes; SHA-256 `e0be823733c8` → `src/features/products/data/supabase-product-repository.ts`, `src/features/products/domain/product.ts`
- `src/features/products/data/supabase-product-repository.test.ts` — 1400 bytes; SHA-256 `e636fc50240c` → `src/features/products/data/supabase-product-repository.ts`
- `src/features/products/data/supabase-product-repository.ts` — 4973 bytes; SHA-256 `bcb56a368a89` → `src/core/supabase/client.ts`, `src/features/products/domain/product.ts`, `src/features/products/domain/product-repository.ts`
- `src/features/products/domain/product-repository.ts` — 388 bytes; SHA-256 `461df0be55d5` → `src/features/products/domain/product.ts`
- `src/features/products/domain/product.ts` — 1450 bytes; SHA-256 `dc0dcd93746f`
- `src/features/products/ui/discover-screen.tsx` — 5832 bytes; SHA-256 `cf04214cae9f` → `src/features/products/ui/product-card.tsx`, `src/features/products/ui/screen-shell.tsx`, `src/components/ui/app-text.tsx`, `src/components/ui/chip.tsx`, `src/components/ui/feedback-state.tsx`, `src/components/ui/search-field.tsx`, `src/constants/theme.ts`, `src/features/products/application/product-queries.ts`, `src/hooks/use-debounced-value.ts`, `src/features/products/domain/product.ts`
- `src/features/products/ui/home-screen.tsx` — 9779 bytes; SHA-256 `f80784b97865` → `src/features/products/ui/product-card.tsx`, `src/features/products/ui/product-image-sources.ts`, `src/features/products/ui/screen-shell.tsx`, `src/components/ui/app-button.tsx`, `src/components/ui/app-text.tsx`, `src/components/ui/chip.tsx`, `src/components/ui/feedback-state.tsx`, `src/components/ui/search-field.tsx`, `src/components/ui/section-header.tsx`, `src/constants/theme.ts`, `src/features/products/application/product-queries.ts`, `src/features/auth/application/auth-session.ts`, `src/features/auth/ui/auth-session-provider.tsx`, `src/features/products/domain/product.ts`
- `src/features/products/ui/product-artwork.tsx` — 3498 bytes; SHA-256 `d7f4904ae532` → `src/features/products/ui/product-image-sources.ts`, `src/components/ui/app-text.tsx`, `src/constants/theme.ts`, `src/features/products/domain/product.ts`
- `src/features/products/ui/product-card.tsx` — 3931 bytes; SHA-256 `f381b36d9eee` → `src/features/products/ui/product-artwork.tsx`, `src/components/ui/app-text.tsx`, `src/constants/theme.ts`, `src/features/products/application/format-money.ts`, `src/features/products/domain/product.ts`, `src/features/auth/application/auth-session.ts`, `src/features/favorites/application/use-product-favorite.ts`
- `src/features/products/ui/product-detail-screen.tsx` — 15943 bytes; SHA-256 `0c1b3bced0de` → `src/components/ui/app-text.tsx`, `src/components/ui/feedback-state.tsx`, `src/constants/theme.ts`, `src/features/products/application/product-queries.ts`, `src/features/products/application/format-money.ts`, `src/features/products/domain/product.ts`, `src/features/products/ui/product-image-sources.ts`, `src/features/auth/application/auth-session.ts`, `src/features/favorites/application/use-product-favorite.ts`
- `src/features/products/ui/product-image-sources.ts` — 379 bytes; SHA-256 `51702ec8dd40` → `assets/products/anua-heartleaf-serum-generated.png`, `assets/products/the-ordinary-niacinamide.png`, `assets/products/beauty-of-joseon-relief-sun.png`
- `src/features/products/ui/screen-shell.tsx` — 1424 bytes; SHA-256 `5481a4261ff3` → `src/components/ui/app-text.tsx`, `src/constants/theme.ts`
- `src/features/profile/application/profile-presenter.test.ts` — 360 bytes; SHA-256 `a6d19c5be155` → `src/features/profile/application/profile-presenter.ts`
- `src/features/profile/application/profile-presenter.ts` — 271 bytes; SHA-256 `c2936f919c18`
- `src/features/profile/ui/profile-screen.tsx` — 10544 bytes; SHA-256 `7a0c517295eb` → `src/components/ui/app-text.tsx`, `src/constants/theme.ts`, `src/features/profile/application/profile-presenter.ts`, `src/features/auth/application/auth-session.ts`, `src/features/auth/ui/auth-session-provider.tsx`, `src/core/supabase/client.ts`, `src/features/favorites/application/favorite-queries.ts`
- `src/features/routines/domain/routine.ts` — 711 bytes; SHA-256 `bfa6fd58c71c` → `src/features/products/domain/product.ts`
- `src/features/routines/ui/routine-screen.tsx` — 839 bytes; SHA-256 `b79d4a5e33e5` → `src/components/ui/feedback-state.tsx`, `src/constants/theme.ts`, `src/features/products/ui/screen-shell.tsx`
- `src/features/settings/application/account-validation.test.ts` — 1362 bytes; SHA-256 `b63ad93f4c79` → `src/features/settings/application/account-validation.ts`
- `src/features/settings/application/account-validation.ts` — 1249 bytes; SHA-256 `cb802b2ca8a6`
- `src/features/settings/application/local-notifications.test.ts` — 3304 bytes; SHA-256 `fe8205e872d2` → `src/features/settings/application/local-notifications.ts`, `src/features/settings/domain/user-settings.ts`
- `src/features/settings/application/local-notifications.ts` — 6361 bytes; SHA-256 `a29b4757c531` → `src/features/settings/domain/user-settings.ts`
- `src/features/settings/application/notification-navigation-observer.tsx` — 1242 bytes; SHA-256 `5cc23834236a`
- `src/features/settings/application/settings-content.ts` — 10642 bytes; SHA-256 `622b9974e915`
- `src/features/settings/application/settings-sections.test.ts` — 675 bytes; SHA-256 `8f3261988c06` → `src/features/settings/application/settings-sections.ts`
- `src/features/settings/application/settings-sections.ts` — 1759 bytes; SHA-256 `96dcc0f7ef96`
- `src/features/settings/application/share-account-export.ts` — 573 bytes; SHA-256 `3be20003c680`
- `src/features/settings/application/share-account-export.web.ts` — 388 bytes; SHA-256 `a657668ab35d`
- `src/features/settings/data/account-repository.test.ts` — 2797 bytes; SHA-256 `ee428cc5e9fc` → `src/features/settings/data/account-repository.ts`, `src/core/supabase/client.ts`
- `src/features/settings/data/account-repository.ts` — 5021 bytes; SHA-256 `003ef55ec95d` → `src/core/supabase/client.ts`
- `src/features/settings/data/supabase-settings-repository.test.ts` — 831 bytes; SHA-256 `549cdcdccb94` → `src/features/settings/domain/user-settings.ts`
- `src/features/settings/data/supabase-settings-repository.ts` — 1827 bytes; SHA-256 `bf4ade5ba397` → `src/core/supabase/client.ts`, `src/features/settings/domain/user-settings.ts`
- `src/features/settings/domain/user-settings.ts` — 1303 bytes; SHA-256 `5119c315312b`
- `src/features/settings/ui/settings-detail-screen.tsx` — 19800 bytes; SHA-256 `193bc12808f0` → `src/components/ui/app-text.tsx`, `src/constants/theme.ts`, `src/features/auth/ui/auth-session-provider.tsx`, `src/features/settings/application/account-validation.ts`, `src/features/settings/application/settings-content.ts`, `src/features/settings/data/account-repository.ts`, `src/features/settings/application/share-account-export.ts`, `src/features/settings/application/share-account-export.web.ts`
- `src/features/settings/ui/settings-screen.test.tsx` — 2677 bytes; SHA-256 `73abb9a0895d` → `src/app/settings.tsx`, `src/features/settings/domain/user-settings.ts`, `src/features/settings/data/supabase-settings-repository.ts`
- `src/features/skin-analysis/application/scan-session-reducer.test.ts` — 1989 bytes; SHA-256 `0ef2a5eb7dd2` → `src/features/skin-analysis/application/scan-session-reducer.ts`
- `src/features/skin-analysis/application/scan-session-reducer.ts` — 1552 bytes; SHA-256 `fd61c6438942`
- `src/features/skin-analysis/domain/skin-analysis.ts` — 534 bytes; SHA-256 `fea3efa88b3f`
- `src/features/skin-analysis/evaluation/benchmark-input.test.ts` — 896 bytes; SHA-256 `352a19615118` → `src/features/skin-analysis/evaluation/benchmark-input.ts`
- `src/features/skin-analysis/evaluation/benchmark-input.ts` — 2325 bytes; SHA-256 `9fc09c6f04ae` → `src/features/skin-analysis/evaluation/benchmark.ts`
- `src/features/skin-analysis/evaluation/benchmark.test.ts` — 1333 bytes; SHA-256 `01cbb3682624` → `src/features/skin-analysis/evaluation/benchmark.ts`
- `src/features/skin-analysis/evaluation/benchmark.ts` — 2686 bytes; SHA-256 `a79532012317`
- `src/features/skin-analysis/evaluation/fixtures/synthetic-input.json` — 278 bytes; SHA-256 `5f3037293c7d`
- `src/features/skin-analysis/services/local-scan.test.ts` — 3429 bytes; SHA-256 `adc7ba06e6b8` → `src/features/skin-analysis/services/local-scan.ts`
- `src/features/skin-analysis/services/local-scan.ts` — 5673 bytes; SHA-256 `7c50c24b70f0`
- `src/features/skin-analysis/services/scan-services.ts` — 554 bytes; SHA-256 `145b7c1c6c05`
- `src/features/skin-analysis/ui/analysis-screen.tsx` — 5819 bytes; SHA-256 `10abcd4664e0` → `src/components/ui/app-button.tsx`, `src/components/ui/app-text.tsx`, `src/constants/theme.ts`, `src/features/products/ui/screen-shell.tsx`
- `src/features/skin-analysis/ui/scan-flow-screen.tsx` — 14615 bytes; SHA-256 `8f3876a87716` → `src/components/ui/app-button.tsx`, `src/components/ui/app-text.tsx`, `src/components/ui/feedback-state.tsx`, `src/constants/theme.ts`, `src/features/auth/ui/auth-session-provider.tsx`, `src/features/skin-analysis/services/local-scan.ts`
- `src/features/skin-profile/application/skin-profile-queries.ts` — 453 bytes; SHA-256 `5bd6006134a2` → `src/features/skin-profile/data/supabase-skin-profile-repository.ts`
- `src/features/skin-profile/data/supabase-skin-profile-repository.ts` — 2525 bytes; SHA-256 `29e84ccfe5d7` → `src/core/supabase/client.ts`, `src/features/skin-profile/domain/skin-profile.ts`
- `src/features/skin-profile/domain/skin-profile.ts` — 380 bytes; SHA-256 `21b194877518`
- `src/features/skin-profile/ui/skin-onboarding-screen.tsx` — 11597 bytes; SHA-256 `6bf35c6f1be9` → `src/components/ui/app-button.tsx`, `src/components/ui/app-text.tsx`, `src/constants/theme.ts`, `src/core/query/query-client.ts`, `src/features/auth/application/auth-session.ts`, `src/features/auth/ui/auth-session-provider.tsx`, `src/features/skin-profile/data/supabase-skin-profile-repository.ts`, `src/features/skin-profile/application/skin-profile-queries.ts`, `src/features/skin-profile/domain/skin-profile.ts`
- `src/global.css` — 429 bytes; SHA-256 `3d65b4b82fe8`
- `src/hooks/use-color-scheme.ts` — 47 bytes; SHA-256 `33beb965500a`
- `src/hooks/use-color-scheme.web.ts` — 578 bytes; SHA-256 `356b9590d9c8`
- `src/hooks/use-debounced-value.test.tsx` — 1100 bytes; SHA-256 `2a6d3c0b50ff` → `src/hooks/use-debounced-value.ts`
- `src/hooks/use-debounced-value.ts` — 322 bytes; SHA-256 `c2cec6ae4a3e`
- `src/hooks/use-theme.ts` — 354 bytes; SHA-256 `743840d9284f` → `src/constants/theme.ts`, `src/hooks/use-color-scheme.ts`, `src/hooks/use-color-scheme.web.ts`
- `supabase/.temp/cli-latest` — 8 bytes; SHA-256 `103e9d7a97f9`
- `supabase/migrations/20260821075706_create_user_profiles.sql` — 1579 bytes; SHA-256 `321f6ebb2c09`
- `supabase/migrations/20260821080133_harden_profile_trigger_function.sql` — 86 bytes; SHA-256 `c1962d810d58`
- `supabase/migrations/20260821120359_create_catalog_and_user_settings.sql` — 11549 bytes; SHA-256 `cadbc6008db4`
- `supabase/migrations/20260821123326_add_products_brand_index.sql` — 66 bytes; SHA-256 `34c669fcf399`
- `supabase/migrations/20260821124014_add_product_search_text.sql` — 1498 bytes; SHA-256 `b1f2ec8acfe5`
- `supabase/migrations/20260922090000_settings_account_flows.sql` — 3252 bytes; SHA-256 `71ee01929852`
- `supabase/migrations/20261029090000_create_user_favorites.sql` — 1149 bytes; SHA-256 `2db2a8c51aa6`
- `supabase/migrations/20261029110000_create_skin_profiles.sql` — 5435 bytes; SHA-256 `3fd61640348a`
- `supabase/migrations/20261103181044_create_skin_scan_foundation.sql` — 2403 bytes; SHA-256 `7a3d0054f5d9`
- `supabase/migrations/20261103181243_create_private_skin_scan_bucket.sql` — 285 bytes; SHA-256 `d95785813185`
- `supabase/migrations/20261103181856_scan_consent_sessions.sql` — 5195 bytes; SHA-256 `9093b590d6a3`
- `supabase/migrations/20261104160000_account_export_and_profile_consent.sql` — 2232 bytes; SHA-256 `20bc97352c63`
- `tsconfig.json` — 373 bytes; SHA-256 `43e0cef38a55`
