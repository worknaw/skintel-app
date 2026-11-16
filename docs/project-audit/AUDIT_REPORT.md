# SkinCycle Production Code Audit

วันที่ตรวจ 4 พฤศจิกายน 2026 (Asia/Bangkok) • ขอบเขตเฉพาะ SkinCycle • สถานะ ณ เวลาตรวจ ไม่ใช่การรับรอง production

## Project Overview

SkinCycle เป็น Expo SDK 57 / React Native 0.86 / TypeScript 6 ใช้ Expo Router, TanStack Query และ Supabase Auth/Postgres โดยมี Python server สำหรับทดลองสแกนบน Android เท่านั้น เอกสาร requirements ระบุ primary flow จากค้นหาสินค้า → บัญชี → โปรไฟล์ผิว → วิเคราะห์ → รูทีน แต่ flow นี้ยังไม่ครบ ระบบแพทย์และวิดีโอคอลไม่มี implementation และ clinician portal อยู่นอก MVP

## ขอบเขตและความครอบคลุม

สำรวจ inventory **206/206 ไฟล์** ภายใต้ขอบเขตที่กำหนด: src 113, scripts 15, migrations 12, เอกสารเดิม 16, assets 33 และไฟล์ root/config/metadata อื่น 17 ไฟล์ ในจำนวนนี้เป็นไฟล์ข้อความ 172 และ binary 34 ไฟล์ การตรวจมีทั้งอ่าน logic และ schema, วิเคราะห์ import graph, ตรวจ metadata และการอ้างอิง assets; ภาพสินค้าที่สงสัยเปิดดูจริงหนึ่งภาพ **ไม่ใช่การตรวจทุกบรรทัดเชิงลึกหรือทดสอบ runtime ทุกไฟล์** lockfile ตรวจในฐานะ dependency graph ส่วนเอกสาร design/history ตรวจตามบริบทและสถานะ ไม่ถือเป็น specification ที่ยืนยัน implementation

ไม่รวม Telegram, node_modules, native generated/build caches, virtual environments, .git, ข้อมูลภาพส่วนตัวที่ถูก ignore และ secrets ใน .env; ไฟล์รายงาน 4 ไฟล์สร้างหลัง inventory จึงไม่นับรวม 206 รายการ ข้อมูลไฟล์และการอ้างอิงดูใน FILE_DEPENDENCY_MAP.md ไม่แสดงค่าลับ

## Architecture Overview

Expo Router ประกอบหน้าจอผ่าน root QueryClientProvider และ AuthSessionProvider; repositories ติดต่อ Supabase ด้วย publishable key ส่วน mobile session เก็บใน SecureStore และ web ใช้ AsyncStorage ภายใต้ RLS Catalog แยก query/repository/domain ค่อนข้างชัด แต่ settings route, profile และ auth ยังผสม UI, network, navigation และ side effects ผู้ใช้ควรเก็บ feature-first architecture และปรับ boundary เฉพาะจุด ไม่จำเป็นต้องเขียนใหม่ทั้งหมด

## File Structure Analysis

src/app เป็น route entry ยกเว้น settings ที่มี logic เต็มหน้าจอ; src/features แยก auth/products/favorites/profile/settings/skin-profile/skin-analysis/routines; core เก็บ client/query; scripts/skin_ai เป็นระบบวิจัยแยกจาก production; migrations เป็นแหล่ง schema แต่ประวัติ remote ไม่ตรง local มี prototype/starter ที่ไม่ reachable จาก app แต่ benchmark modules มี CLI ใช้งานจริง จึงห้ามลบทิ้งเพียงเพราะไม่อยู่ใน route graph

## Feature & Logic Analysis

| ระบบ | Flow และสถานะที่ตรวจ |
|---|---|
| Auth | email/password หรือ Google → getUser → getSkinProfile → onboarding หรือ return intent; ลืมรหัสผ่านและ Apple ยังไม่ทำงานจริง; cold callback ต้องทดสอบ |
| Profile / onboarding | profile อ่าน profiles และ favorites; onboarding โหลด consent active แล้วส่ง RPC; DB remote ไม่มี skin_profiles และยังไม่มี editor/revocation |
| Catalog / favorites | Home/Discover → product query → Supabase products/offers; detail และ favorites เชื่อม repository; ข้อมูลเป็น sample และ remote ไม่มี favorites table |
| Settings / account | preferences เก็บ user_settings, local reminders; account export/delete/support เรียก RPC/table ที่ remote ยังไม่มี; การสลับบัญชีระหว่าง request มีความเสี่ยง |
| Skin scan / image | __DEV__ Android → ตรวจ server → camera → JPEG → local USB หรือ HTTPS research server → raw margins → ลบไฟล์ชั่วคราวใน finally; release ไม่มี production scan |
| Recommendation / routine / calendar | หน้ารูทีนเป็น unavailable; ยังไม่มี rules engine, calendar/completion หรือ personalized recommendations ที่ใช้งานจริง |
| Doctor / video call | ไม่พบ route/service/schema; ไม่ได้ทดสอบว่าใช้งานได้ |

## Bug Findings

รายการทั้งหมด 49 รายการ: **CRITICAL 0, HIGH 11, MEDIUM 30, LOW 7, INFO 1** โดย severity จัดตามความสำคัญต่อผลิตภัณฑ์ ไม่ใช่จำนวนช่องโหว่ที่โจมตีได้ สถานะแต่ละรายการแยก CONFIRMED, GAP, RISK และข้อเท็จจริงจากเครื่องมือไว้ใน ISSUE_TRACKER

ลำดับแรกคือ SC-02/SC-01 reconcile migration และ schema; SC-03 แก้ Jest exit; SC-04 triage dependency advisories; SC-13/SC-16 ป้องกันผลข้ามบัญชีและ cleanup; SC-22 ทบทวน privacy; SC-42 เพิ่ม integration/RLS tests ก่อนเปิด production

## Dead Code Findings

Static graph จาก route roots, imports/exports, literal require/dynamic import และ platform variants พบ 25 รายการที่ไม่ reachable รวม CSS/fixture ไม่ได้แปลว่าเป็น dead ทั้งหมด: benchmark modules และ fixture ใช้โดย scripts/tests; scan reducer ใช้ใน tests แต่หน้าจอจริงใช้ state ของตนเอง; analysis-screen เก่าเป็น mock และไม่ได้ถูก route ปัจจุบันเรียก รายการครบและข้อจำกัดอยู่ในแผนผัง ห้ามลบโดยไม่ตรวจ CLI/config/platform เพิ่มเติม

## Performance Findings

Catalog จำกัด 30 ก่อน sort ราคาและไม่มี pagination เป็นปัญหาความถูกต้องเมื่อข้อมูลโต ไม่ใช่ bottleneck ที่วัดแล้ว Search ใช้ ilike แบบ wildcard และ exact count; database advisor แจ้ง foreign key ที่ไม่มี covering index 2 จุด ควรวัด query plan ก่อนเพิ่ม index

Python research inference เรียก model สองครั้งต่อภาพ และ HTTPS ใช้ global lock ครอบช่วงรับภาพและ inference จึงมีความเสี่ยงเมื่อ concurrent แต่ยังไม่มี benchmark latency เครื่องมือ web export รายงาน entry 2.1 MB และ asset ตัวอย่างใหญ่สุด 1,212,310 bytes; ตัวเลขขนาดนี้ไม่ใช่ผลการวัดความเร็วหรือการใช้งานหน่วยความจำ

## Database & Backend Findings

ตรวจ metadata remote แบบอ่านอย่างเดียว: public tables 10 ตารางเปิด RLS ทั้งหมด; catalog policies จำกัด active/available; user tables ที่มีอยู่ใช้ owner policies; scan bucket private จำกัด 10 MiB และ JPEG/PNG ไม่มี client object policies; active scan consent 0 และไม่มี Edge Functions

Remote ไม่มี skin_profiles, user_favorites, support_requests, export_my_account(), delete_my_account(text) ขณะที่ client เรียกใช้ Local migrations ของ account, favorites, skin profile และ migration export v2/revoke grants ยังไม่ถูก deploy อีกทั้ง migration catalog บางรายการมีเลข local/remote ต่างกัน ต้องเทียบ definition และทดสอบ staging ก่อน reconcile ไม่ควร replay สุ่มบน remote

## Security Findings

Supabase advisor แจ้ง leaked-password protection ปิด และแจ้ง authenticated สามารถเรียก SECURITY DEFINER create_consented_skin_scan ซึ่งตรวจ auth.uid และเป็นการออกแบบที่ตั้งใจ ไม่ใช่หลักฐานช่องโหว่โดยตัวมันเอง ต้องทบทวน quota ก่อนเปิด active consent. [แนวทาง password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [คำอธิบาย SECURITY DEFINER advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)

npm audit รายงาน 122 affected package entries (high 69, moderate 48, low 5), รวม parent/transitive chains และ deduplicate เป็น 39 advisory URLs ผลไม่ได้พิสูจน์ว่าแอปโจมตีได้ 122 ช่องทาง ตัวอย่าง lockfile decode-uri-component 0.2.2 เข้าเงื่อนไข [GHSA-qr28-fpjm-wq7f](https://github.com/advisories/GHSA-qr28-fpjm-wq7f); node-forge 1.4.0 เข้าเงื่อนไข [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) ซึ่ง advisory ระบุยังไม่มี patched version ณ เวลาที่ตรวจ ต้องแยก build/runtime และตรวจ reachability ก่อนเลือก mitigation

ภาพ scan อาจค้างหลัง process ถูก kill เพราะ cleanup อยู่ใน finally; HTTPS pilot ตรวจ bearer token และ allowlist แต่ยังไม่มี durable consent receipt/production retention flow ไม่พบหลักฐานเพียงพอจะสรุปว่ามีข้อมูลรั่วหรือข้าม RLS สำเร็จ

## Architecture Improvement Suggestions

คง React Query และ feature-first; ย้าย data access และ async orchestration จากหน้าจอไป use cases/repositories, รวม session cleanup และ identity guard, สร้าง runtime validation ตรงขอบเขต API ข้อดีคือทดสอบ race และเปลี่ยน backend ได้ง่ายขึ้น ข้อเสียคือมี abstraction เพิ่ม จึงควรทำเฉพาะ flow ซับซ้อน

Catalog ควร server-sort + cursor pagination แทน sort page ใน client: ถูกต้องเมื่อข้อมูลโต แต่ต้องออกแบบ index/contract และทดสอบ migration. Scanner ควรแยก research pilot จาก production job/consent boundary: ปลอดภัยและตรวจสอบย้อนหลังได้ แต่ต้องมี provider, retention, งบและผลประเมินก่อนเปิดใช้งาน

[Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) ระบุ SDK57 ใช้ RN0.86 และ React19.2.3 ซึ่งสอดคล้องกับ package.json; [Expo notifications SDK57](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/) ระบุ Android13 prompt ต้องมี notification channel ก่อน ขณะที่โค้ดขอ permission ก่อนสร้าง channel จึงต้องทดสอบบนเครื่องจริง

## การตรวจที่รันจริงและข้อจำกัด

| การตรวจ | ผล |
|---|---|
| npm run typecheck | ผ่าน |
| npm run lint | ผ่าน |
| npm test -- --ci --runInBand | 21 suites / 56 tests ผ่าน แต่ process exit 1 จาก late ExpoModulesCoreJSLogger warning; CI ยังไม่ผ่าน |
| Python unittest scripts/skin_ai | 9 tests ผ่าน; ใช้ mocks/synthetic fixtures ไม่ใช่ model validation |
| Expo web export | สำเร็จ, 18 static routes; Metro แจ้ง cache deserialize แล้ว fallback full crawl; exit 0 |
| expo install --check | offline รายงาน dependencies up to date แต่เตือนว่า offline validation ไม่น่าเชื่อถือ; ครั้ง online ก่อนหน้าติด EPERM cache จึงยังไม่ยืนยัน online |
| npm audit | exit 1 และพบ affected dependency entries ตามข้างต้น |
| Supabase | ตรวจ schema/migration/advisor แบบ read-only; ไม่ได้ทดสอบ authenticated สองบัญชี |

ไม่ได้รัน production mutations, account deletion, migrations, load tests, native Android/iOS E2E, real OAuth/email flows หรือ independent AI accuracy benchmark จึงไม่อ้างผลเหล่านั้น การเปลี่ยนแปลงที่มีมาก่อนคำสั่ง audit นี้เป็น baseline ของการตรวจ

## Overall Assessment

ยังไม่พร้อม production: database ไม่ตรง client, core scan/routine ยังไม่ครบ และไม่มีหลักฐาน E2E/RLS/device เพียงพอ โครงสร้างพื้นฐานเหมาะสำหรับพัฒนาต่อหลังแก้ boundary และ reliability โดยให้เริ่มจาก schema reconciliation, CI/security triage และ race/consent ตามแผน 6 Phase ใน IMPROVEMENT_PLAN.md

