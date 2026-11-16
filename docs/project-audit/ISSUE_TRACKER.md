# SkinCycle Issue Tracker

วันที่ตรวจ: 2026-11-04 (Asia/Bangkok) • Audit เท่านั้น • รายการเปิดทั้งหมด 49 รายการ

| Severity | จำนวน |
|---|---:|
| CRITICAL | 0 |
| HIGH | 11 |
| MEDIUM | 30 |
| LOW | 7 |
| INFO | 1 |

Severity เป็นลำดับความสำคัญต่อความพร้อมของผลิตภัณฑ์ ไม่ได้แปลว่าทุกรายการเป็นช่องโหว่ที่โจมตีได้ ฟีเจอร์ที่ขาดและความเสี่ยงถูกระบุแยกจากบั๊ก ไม่พบหลักฐานเพียงพอสำหรับจัด CRITICAL ในขอบเขตที่ตรวจ

สถานะ: CONFIRMED = พฤติกรรมจาก code/ข้อมูลจริง; CONFIRMED-GAP = implementation ยังไม่ครบ; CONFIRMED-SCAN/CONFIG = ผลเครื่องมือหรือ configuration; RISK = มี code path รองรับแต่ยังไม่ได้ reproduce บนอุปกรณ์; RISK-BEFORE-ENABLE/AT-SCALE = เงื่อนไขในอนาคต; MEASURED-SIZE = วัดขนาดจริงแต่ยังไม่ได้วัด latency; NOT-IMPLEMENTED-OUTSIDE-MVP = ข้อมูลขอบเขต ไม่ใช่บั๊ก

รายการทั้งหมดเป็นข้อเสนอ ยังไม่ได้แก้ในรอบนี้ และไม่รวม Telegram

## Index

| ID | Severity | Category | สถานะ | เรื่อง |
|---|---|---|---|---|
| SC-01 | HIGH | Database / Deployment | CONFIRMED | ฐานข้อมูลที่แอปใช้ยังขาดระบบหลัก |
| SC-02 | HIGH | Database / Release | CONFIRMED | เลขเวอร์ชัน migration local และ remote ไม่ตรงกัน |
| SC-03 | HIGH | Testing / CI | CONFIRMED | Jest ผ่าน assertions แต่ process exit 1 |
| SC-04 | HIGH | Security / Dependencies | CONFIRMED-SCAN | Dependency audit มี advisory ที่ต้องประเมินและแก้ |
| SC-05 | HIGH | Authentication | CONFIRMED-GAP | ลืมรหัสผ่านยังไม่ส่งอีเมลหรือเปิด recovery flow |
| SC-06 | MEDIUM | Authentication / UI | CONFIRMED-GAP | ปุ่ม Apple ไม่มี handler |
| SC-07 | MEDIUM | Authentication / Navigation | RISK | Callback เมื่อเปิดแอปใหม่และเปลี่ยนอีเมลบนเว็บยังไม่ครบ |
| SC-08 | MEDIUM | Authentication / Validation | CONFIRMED | กฎ validation สมัครสมาชิกกับแก้ไขบัญชีไม่ตรงกัน |
| SC-09 | MEDIUM | Consent / Authentication | CONFIRMED-GAP | Terms checkbox ไม่มีหลักฐานเวอร์ชันและ Google signup ข้ามเงื่อนไข |
| SC-10 | MEDIUM | Skin Profile | CONFIRMED-GAP | ไม่มี flow ดู/แก้ไขโปรไฟล์ผิวและถอน consent |
| SC-11 | MEDIUM | Consent / Data Integrity | RISK | Consent profile อาจเปลี่ยนข้อความหลังยอมรับหรือคง accepted ข้ามเวอร์ชัน |
| SC-12 | MEDIUM | Skin Profile / Concurrency | RISK | ผล onboarding กลับมาหลังเปลี่ยนบัญชีไม่มี owner guard |
| SC-13 | HIGH | Settings / Concurrency | RISK | Settings response เก่าเปลี่ยน ref และแจ้งเตือนของบัญชีใหม่ได้ |
| SC-14 | MEDIUM | Favorites / Concurrency | RISK | Rollback รายการโปรดทั้งชุดอาจลบ optimistic update ของสินค้าอื่น |
| SC-15 | MEDIUM | Favorites / Loading | CONFIRMED | กดหัวใจได้ก่อนโหลดสถานะเดิมสำเร็จ |
| SC-16 | MEDIUM | Session / Notifications | CONFIRMED-GAP | ล้าง reminders/cache เฉพาะ manual sign-out บางทาง |
| SC-17 | MEDIUM | Notifications / Android | RISK | ขอสิทธิ์ Android ก่อนสร้าง notification channel |
| SC-18 | MEDIUM | Notifications / Scheduling | CONFIRMED | เตือนวิเคราะห์ซ้ำ 30 วันถูกเริ่มนับใหม่เมื่อเข้า settings |
| SC-19 | LOW | Notifications / Navigation | RISK | อาจนำทางซ้ำจาก last notification response เดิม |
| SC-20 | MEDIUM | Notifications / Feature Integration | CONFIRMED-GAP | ข้อความเตือนสัญญารูทีน/ผลวิเคราะห์ที่ยังไม่มี |
| SC-21 | MEDIUM | Settings / UI | CONFIRMED-GAP | มีเมนูตั้งค่าที่กดแล้วไม่ทำงาน |
| SC-22 | HIGH | Privacy / Product Readiness | CONFIRMED-GAP | ข้อมูล privacy/export description ไม่ทันระบบที่มีอยู่ |
| SC-23 | HIGH | Routine / Recommendation / Calendar | CONFIRMED-GAP | Core loop รูทีนและคำแนะนำเฉพาะบุคคลยังไม่ถูก implement |
| SC-24 | HIGH | Skin Analysis / Backend | CONFIRMED-GAP | Production scan pipeline ยังเป็น foundation และ research pilot |
| SC-25 | HIGH | AI / Data Quality | CONFIRMED-GAP | ยังไม่มีหลักฐานความแม่นยำหรือ face-quality gate สำหรับใช้ผลจริง |
| SC-26 | MEDIUM | Privacy / Image Lifecycle | RISK | ลบภาพใน finally ยังไม่ครอบคลุม process kill และ crash |
| SC-27 | MEDIUM | Catalog / Correctness | CONFIRMED | เรียงราคาก่อนหลังไม่ครอบคลุมทั้ง catalog และไม่มี pagination |
| SC-28 | MEDIUM | Catalog / Data Provenance | CONFIRMED-GAP | ข้อมูลสินค้า ราคา รีวิว และลิงก์ยังเป็นตัวอย่าง |
| SC-29 | MEDIUM | Product Detail / Data Integrity | CONFIRMED | รายละเอียดเติมข้อมูลที่ไม่มีและผูกประโยชน์ส่วนผสมผิดระดับ |
| SC-30 | MEDIUM | Assets / Product UI | CONFIRMED | ภาพสินค้า mapping ไม่ตรงตัวรายการและบาง detail ไม่มีภาพสำรอง |
| SC-31 | LOW | Product Detail / UX | CONFIRMED-GAP | Gallery และคำอธิบายดูเหมือนกดได้แต่เป็นภาพนิ่ง |
| SC-32 | MEDIUM | API / Runtime Validation | RISK | Type assertions ยอมรับ payload ที่ไม่ตรง domain |
| SC-33 | MEDIUM | Startup / Error Handling | RISK | โหลดฟอนต์ล้มเหลวแล้ว root อาจว่างถาวร |
| SC-34 | LOW | UI / Error Navigation | CONFIRMED | Loading/error/back บางหน้าไม่ครบและcounterกลบข้อผิดพลาด |
| SC-35 | MEDIUM | Catalog / Money | RISK | Money model ยอมหลายสกุล แต่หาร100และเทียบจำนวนดิบเสมอ |
| SC-36 | MEDIUM | Database / Validation | RISK | ข้อจำกัดข้อมูลและupdated_atยังไม่ครอบคลุม |
| SC-37 | MEDIUM | Security / Auth Configuration | CONFIRMED-CONFIG | Supabase leaked-password protection ยังปิด |
| SC-38 | MEDIUM | Backend / Abuse Controls | RISK-BEFORE-ENABLE | RPCสร้างscanและsupport insertยังไม่มีquotaต่อผู้ใช้ |
| SC-39 | MEDIUM | Architecture / Maintainability | CONFIRMED | UI ยังถือbusiness side effectsและSupabase callsหลายจุด |
| SC-40 | LOW | Dead Code / Cleanup | CONFIRMED-STATIC | มีstarterและprototypeที่ไม่reachableจากroutes |
| SC-41 | LOW | Documentation / Repository | CONFIRMED | เอกสารหลายช่วงเวลาและGitยังไม่มีtracked baseline |
| SC-42 | HIGH | QA / Release Gates | CONFIRMED-GAP | เทสต์ปัจจุบันยังไม่พิสูจน์critical flowsและRLSจริง |
| SC-43 | MEDIUM | Performance / Assets | MEASURED-SIZE | Assetหลักใหญ่กว่าขนาดแสดงผลและwebentry2.1MB |
| SC-44 | MEDIUM | Performance / AI Backend | RISK | Inferenceสองรอบต่อภาพและglobal lockรวมช่วงupload |
| SC-45 | LOW | Performance / Database | RISK-AT-SCALE | Searchไม่มีindexเฉพาะและมีFKadvisoryที่ต้องตรวจquery plan |
| SC-46 | LOW | Performance / Favorites | RISK-AT-SCALE | FavoritesโหลดIDทั้งหมดและส่งINขนาดไม่จำกัด |
| SC-47 | INFO | Scope / Doctor / Video Call | NOT-IMPLEMENTED-OUTSIDE-MVP | ไม่พบระบบแพทย์ ผู้เชี่ยวชาญ หรือวิดีโอคอล |
| SC-48 | MEDIUM | Release / Platform Configuration | CONFIRMED-GAP | Release configuration และplatform verificationยังไม่ครบ |
| SC-49 | MEDIUM | Onboarding / Cross-feature Flow | CONFIRMED-GAP | Onboarding requirement ถูกตรวจเฉพาะท้ายlogin |

## SC-01 — ฐานข้อมูลที่แอปใช้ยังขาดระบบหลัก

- **Category / Severity:** Database / Deployment / HIGH
- **สถานะหลักฐาน:** CONFIRMED
- **ตำแหน่ง:** [src/features/auth/ui/auth-screen.tsx:138](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:138>), [src/features/skin-profile/data/supabase-skin-profile-repository.ts:24](<C:/Users/balln/my-app/src/features/skin-profile/data/supabase-skin-profile-repository.ts:24>), [src/features/favorites/data/supabase-favorites-repository.ts:6](<C:/Users/balln/my-app/src/features/favorites/data/supabase-favorites-repository.ts:6>), [src/features/settings/data/account-repository.ts:38](<C:/Users/balln/my-app/src/features/settings/data/account-repository.ts:38>)
- **รายละเอียดและหลักฐาน:** ตรวจ remote วันที่ 2026-11-04: skin_profiles, user_favorites, support_requests, export_my_account(), delete_my_account(text) ไม่มี; มี migration 8 รายการ ขณะที่ local มี 12 รายการ
- **ผลกระทบ:** เข้าสู่ระบบสำเร็จแต่ finishAuth โหลดโปรไฟล์ผิวไม่ได้; onboarding/favorites/support/export/delete ทำงานไม่ครบ
- **สาเหตุ:** Schema ที่ deploy ไม่ตรงกับ repository ที่ client เรียก
- **แนวทางแก้ไข:** ทำ schema reconciliation ในฐานข้อมูลทดสอบก่อน; ตรวจ dependency ของ migration ที่ขาดและ migration export v2/revoke grants ที่มีอยู่แล้ว; deploy เป็นชุดหลังผ่านการทดสอบ
- **Dependencies / ส่วนที่กระทบ:** SC-02; Supabase staging; ห้าม apply migration ในรอบ audit
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ทดสอบ fresh install และ upgrade บน disposable database แล้วทำ login→onboarding→favorite→export→delete ด้วยบัญชีทดสอบ
- **Acceptance criteria:** ทุก table/RPC ที่ client ต้องใช้มีอยู่และ owner isolation ผ่าน; login ไม่รายงาน auth ล้มเหลวเพราะ schema หาย
- **แผนดำเนินการ:** Phase 1, Task SC-01

## SC-02 — เลขเวอร์ชัน migration local และ remote ไม่ตรงกัน

- **Category / Severity:** Database / Release / HIGH
- **สถานะหลักฐาน:** CONFIRMED
- **ตำแหน่ง:** [supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:1](<C:/Users/balln/my-app/supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:1>), [supabase/migrations/20260821123326_add_products_brand_index.sql:1](<C:/Users/balln/my-app/supabase/migrations/20260821123326_add_products_brand_index.sql:1>), [supabase/migrations/20260821124014_add_product_search_text.sql:1](<C:/Users/balln/my-app/supabase/migrations/20260821124014_add_product_search_text.sql:1>)
- **รายละเอียดและหลักฐาน:** Remote ใช้ 20260821120748, 20260821123413, 20260821124120 สำหรับงานชื่อเดียวกัน; local ใช้เลขอื่น และยังไม่มี supabase/config.toml ใน inventory
- **ผลกระทบ:** การ push ตรง ๆ อาจพยายามสร้าง table/index/column เดิมซ้ำหรือจัดลำดับผิด
- **สาเหตุ:** ประวัติ schema ฝั่ง remote และไฟล์ local แยกจากกัน
- **แนวทางแก้ไข:** เทียบ SQL definitions กับ remote ทีละ object แล้วกำหนด migration baseline/repair history ที่ตรวจสอบได้; ห้ามเดาว่าชื่อเหมือนกันแปลว่า SQL เหมือนกัน
- **Dependencies / ส่วนที่กระทบ:** ฐานข้อมูลสำรองและ staging; SC-01
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** Replay จากฐานเปล่าและ upgrade จากสำเนา schema ปัจจุบัน; เปรียบเทียบ grants/policies/functions
- **Acceptance criteria:** ไม่เกิด duplicate object; migration history ตรงกัน และผล schema สองเส้นทางเท่ากัน
- **แผนดำเนินการ:** Phase 1, Task SC-02

## SC-03 — Jest ผ่าน assertions แต่ process exit 1

- **Category / Severity:** Testing / CI / HIGH
- **สถานะหลักฐาน:** CONFIRMED
- **ตำแหน่ง:** [package.json:62](<C:/Users/balln/my-app/package.json:62>)
- **รายละเอียดและหลักฐาน:** npm test -- --ci --runInBand: 21 suites / 56 tests passed แต่ Cannot log after tests are done จาก ExpoModulesCoreJSLogger → expo winter fetch lazy getter; exit 1
- **ผลกระทบ:** Pipeline ยังถือว่าล้มเหลวและอาจกลบ async teardown regression อื่น
- **สาเหตุ:** มีการโหลด Expo native module หลัง test environment ถูก teardown; stack ชี้จุดนี้ แต่ยังไม่ยืนยัน root cause ทั้งหมด
- **แนวทางแก้ไข:** แยก suite/import ที่กระตุ้น lazy fetch; แก้ test setup/mocks หรือ Expo/Jest patch ที่ตรง SDK57; อย่าปิด console warning หรือ forceExit เพื่อทำให้ผ่าน
- **Dependencies / ส่วนที่กระทบ:** SC-04; Jest/Expo test environment
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** รัน full suite ใน process ใหม่ พร้อมตรวจ late log/open handles
- **Acceptance criteria:** 56 เทสต์เดิมและ regression ที่เกี่ยวข้องผ่าน โดย exit 0 และไม่มี late native-module log
- **แผนดำเนินการ:** Phase 1, Task SC-03

## SC-04 — Dependency audit มี advisory ที่ต้องประเมินและแก้

- **Category / Severity:** Security / Dependencies / HIGH
- **สถานะหลักฐาน:** CONFIRMED-SCAN
- **ตำแหน่ง:** [package.json:6](<C:/Users/balln/my-app/package.json:6>), [package-lock.json:1](<C:/Users/balln/my-app/package-lock.json:1>)
- **รายละเอียดและหลักฐาน:** npm audit รายงาน 122 affected package entries: high69/moderate48/low5/critical0; deduplicate ได้ 39 advisory URLs ไม่ใช่ช่องโหว่แอป 122 จุด; lock มี decode-uri-component0.2.2, node-forge1.4.0, image-size1.2.1
- **ผลกระทบ:** มีความเสี่ยงตามเส้นทางใช้งานจริง เช่น parser/CLI/deep-link; ยังไม่พิสูจน์ exploit ใน SkinCycle
- **สาเหตุ:** Transitive dependencies มีเวอร์ชันเข้าเงื่อนไข advisory และ npm รวมผลกระทบย้อนขึ้น parent packages
- **แนวทางแก้ไข:** ทำ dependency reachability triage แยก mobile/web/build/test; อัปเดตแบบรองรับ SDK57 และบันทึกเหตุผลสำหรับรายการที่ยังแก้ไม่ได้; ไม่ใช้ audit fix --force อัตโนมัติ
- **Dependencies / ส่วนที่กระทบ:** SC-03; Expo compatibility; ดู advisory appendix ใน AUDIT_REPORT
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** รัน npm audit ใหม่, typecheck/lint/tests, web export และ native regression หลังอัปเดตทีละชุด
- **Acceptance criteria:** ไม่มี advisory ที่เข้าถึงได้จากเส้นทางสำคัญค้างโดยไม่มี mitigation/เจ้าของ/เหตุผล; ไม่มี SDK regression
- **แผนดำเนินการ:** Phase 1, Task SC-04

## SC-05 — ลืมรหัสผ่านยังไม่ส่งอีเมลหรือเปิด recovery flow

- **Category / Severity:** Authentication / HIGH
- **สถานะหลักฐาน:** CONFIRMED-GAP
- **ตำแหน่ง:** [src/features/auth/ui/auth-screen.tsx:397](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:397>)
- **รายละเอียดและหลักฐาน:** ปุ่มลืมรหัสผ่านเรียก setFeedback เท่านั้น; ไม่พบ resetPasswordForEmail หรือ recovery route ใน src
- **ผลกระทบ:** ผู้ใช้ที่ลืมรหัสผ่านกลับเข้าบัญชีผ่านแอปไม่ได้
- **สาเหตุ:** มีข้อความ UI แต่ยังไม่มี application flow
- **แนวทางแก้ไข:** เพิ่ม request-reset และรับ recovery callback พร้อม validation, expired link และ rate-limit feedback โดยคงรูปแบบหน้าจอเดิม
- **Dependencies / ส่วนที่กระทบ:** SC-01, SC-07; Supabase redirect allowlist/email config
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** บัญชีทดสอบ: ส่งอีเมล→เปิดลิงก์ cold/warm→เปลี่ยนรหัส→เข้าสู่ระบบ; ทดสอบ expired/reused link
- **Acceptance criteria:** ผู้ใช้กู้บัญชีได้จริง; ไม่แสดง success ก่อน server ยอมรับคำขอ
- **แผนดำเนินการ:** Phase 2, Task SC-05

## SC-06 — ปุ่ม Apple ไม่มี handler

- **Category / Severity:** Authentication / UI / MEDIUM
- **สถานะหลักฐาน:** CONFIRMED-GAP
- **ตำแหน่ง:** [src/features/auth/ui/auth-screen.tsx:449](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:449>)
- **รายละเอียดและหลักฐาน:** Pressable มี label เข้าสู่ระบบด้วย Apple แต่ไม่มี onPress และไม่มี provider implementation
- **ผลกระทบ:** ผู้ใช้แตะแล้วไม่มีการตอบสนอง
- **สาเหตุ:** ฟีเจอร์ยังอยู่ในระดับหน้าตา
- **แนวทางแก้ไข:** ตัดสินใจรองรับ Apple ใน release นี้หรือแสดงสถานะ unavailable อย่างชัดเจน; ถ้ารองรับให้เพิ่ม flow/config/native capability
- **Dependencies / ส่วนที่กระทบ:** SC-07, SC-48; provider credentials
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ทดสอบ success/cancel/provider unavailable บนแพลตฟอร์มที่รองรับ
- **Acceptance criteria:** ปุ่มทุกสถานะมีผลลัพธ์ชัดเจน และไม่ทำให้เข้าใจว่ารองรับทั้งที่ยังไม่ได้เชื่อม
- **แผนดำเนินการ:** Phase 2, Task SC-06

## SC-07 — Callback เมื่อเปิดแอปใหม่และเปลี่ยนอีเมลบนเว็บยังไม่ครบ

- **Category / Severity:** Authentication / Navigation / MEDIUM
- **สถานะหลักฐาน:** RISK
- **ตำแหน่ง:** [src/features/auth/ui/auth-screen.tsx:177](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:177>), [src/core/supabase/client.ts:28](<C:/Users/balln/my-app/src/core/supabase/client.ts:28>), [src/features/settings/data/account-repository.ts:23](<C:/Users/balln/my-app/src/features/settings/data/account-repository.ts:23>)
- **รายละเอียดและหลักฐาน:** OAuth token/code ถูก consume ในผล openAuthSessionAsync เท่านั้น; detectSessionInUrl=false; changeEmail hardcode skincycle://auth ทั้ง native/web; ไม่พบ cold callback handler กลาง
- **ผลกระทบ:** กรณี browser เปิดแอปใหม่หรือ email change บนเว็บอาจไม่จบที่ session/หน้าเป้าหมาย
- **สาเหตุ:** Callback lifecycle ผูกกับหน้าที่เริ่ม operation และใช้ URL คนละแนวทาง
- **แนวทางแก้ไข:** รวม callback handling แบบ idempotent พร้อม platform-aware redirect และเก็บ return intent ที่ปลอดภัย; ตรวจ error/query/hash ตาม flow
- **Dependencies / ส่วนที่กระทบ:** SC-05; Supabase redirect settings
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ทดสอบ Google/email-confirm/email-change/recovery ทั้ง cold/warm, cancel และ callback ซ้ำ; ห้ามใส่ token ลง log
- **Acceptance criteria:** แต่ละ callback ถูก consume ครั้งเดียวและกลับ destination ถูกต้องบนแพลตฟอร์มเป้าหมาย
- **แผนดำเนินการ:** Phase 2, Task SC-07

## SC-08 — กฎ validation สมัครสมาชิกกับแก้ไขบัญชีไม่ตรงกัน

- **Category / Severity:** Authentication / Validation / MEDIUM
- **สถานะหลักฐาน:** CONFIRMED
- **ตำแหน่ง:** [src/features/auth/ui/auth-screen.tsx:213](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:213>), [src/features/auth/ui/auth-screen.tsx:221](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:221>), [src/features/settings/application/account-validation.ts:1](<C:/Users/balln/my-app/src/features/settings/application/account-validation.ts:1>), [supabase/migrations/20260821075706_create_user_profiles.sql:3](<C:/Users/balln/my-app/supabase/migrations/20260821075706_create_user_profiles.sql:3>)
- **รายละเอียดและหลักฐาน:** สมัครรับรหัสผ่านขั้นต่ำ6 ขณะที่ settings ใช้8–128; signup name ไม่มี max80 และไม่รับ apostrophe/hyphen ที่ settings รับ; DB name จำกัด80
- **ผลกระทบ:** ผู้ใช้เจอข้อผิดพลาดหลัง submit หรือชื่อที่แก้ไขได้กลับสมัครไม่ได้
- **สาเหตุ:** Validation ซ้ำใน UI และ helper คนละชุด
- **แนวทางแก้ไข:** กำหนด policy เดียวและ reuse validators โดยคงการรองรับบัญชีเดิมตอน login; ให้ signup maxlength สอดคล้อง DB
- **Dependencies / ส่วนที่กระทบ:** SC-05; Auth password policy
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ทดสอบชื่อ 80/81 ตัว O'Neil และรหัส6/7/8/128/129 ตัว แยก login กับ register
- **Acceptance criteria:** Validation สอดคล้อง server และไม่ล็อกผู้ใช้เดิมด้วยกฎ signup ใหม่
- **แผนดำเนินการ:** Phase 2, Task SC-08

## SC-09 — Terms checkbox ไม่มีหลักฐานเวอร์ชันและ Google signup ข้ามเงื่อนไข

- **Category / Severity:** Consent / Authentication / MEDIUM
- **สถานะหลักฐาน:** CONFIRMED-GAP
- **ตำแหน่ง:** [src/features/auth/ui/auth-screen.tsx:128](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:128>), [src/features/auth/ui/auth-screen.tsx:229](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:229>), [src/features/auth/ui/auth-screen.tsx:403](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:403>), [src/features/auth/ui/auth-screen.tsx:459](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:459>)
- **รายละเอียดและหลักฐาน:** acceptedTerms เป็น state ชั่วคราว; signup ส่งเฉพาะ display_name; Google เรียกอีก handler และไม่มี check acceptedTerms; ข้อความ terms ไม่เป็นลิงก์ในฟอร์ม
- **ผลกระทบ:** ไม่สามารถย้อนพิสูจน์ข้อความที่ยอมรับ และ flow ผู้ให้บริการต่างกัน
- **สาเหตุ:** Terms acknowledgement ไม่ได้ออกแบบร่วมกับ consent/data model
- **แนวทางแก้ไข:** กำหนด terms version และช่องทางอ่านก่อนยอมรับ; เก็บ acknowledgement ตามนโยบายที่เจ้าของผลิตภัณฑ์กำหนด แยกจาก consent รูป/ผิว
- **Dependencies / ส่วนที่กระทบ:** SC-22; ไม่สรุปข้อกฎหมายจาก code audit
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ทดสอบ email/Google signup และ version เปลี่ยน; ตรวจ receipt โดยไม่ใช้ user_metadata เป็นสิทธิ์
- **Acceptance criteria:** ทุกช่องทางใช้เงื่อนไขเดียวกันและตรวจย้อนกลับได้ว่าผู้ใช้เห็นเวอร์ชันใด
- **แผนดำเนินการ:** Phase 2, Task SC-09

## SC-10 — ไม่มี flow ดู/แก้ไขโปรไฟล์ผิวและถอน consent

- **Category / Severity:** Skin Profile / MEDIUM
- **สถานะหลักฐาน:** CONFIRMED-GAP
- **ตำแหน่ง:** [src/features/skin-profile/ui/skin-onboarding-screen.tsx:40](<C:/Users/balln/my-app/src/features/skin-profile/ui/skin-onboarding-screen.tsx:40>), [src/features/profile/ui/profile-screen.tsx:19](<C:/Users/balln/my-app/src/features/profile/ui/profile-screen.tsx:19>), [src/features/settings/application/settings-content.ts:1](<C:/Users/balln/my-app/src/features/settings/application/settings-content.ts:1>)
- **รายละเอียดและหลักฐาน:** มี onboarding form และ complete_skin_onboarding RPC แต่เมนู profile/settings ไม่มี skin profile editor หรือ revoke; เปิด onboarding ใหม่เป็นค่าเริ่มต้น ไม่โหลดค่าที่เคยบันทึก
- **ผลกระทบ:** ผู้ใช้ดูแล avoid list/budget/consent ของตนไม่ได้ตาม lifecycle
- **สาเหตุ:** มีเฉพาะ initial onboarding
- **แนวทางแก้ไข:** เพิ่ม read/edit flow ที่ prefill ค่าจริงและกำหนดผลของการถอน consent; การแก้ไขต้องคง owner/version constraints
- **Dependencies / ส่วนที่กระทบ:** SC-01, SC-11, SC-22
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** บันทึก→เปิดใหม่→แก้บาง field→ถอน consent→ตรวจผลต่อคำแนะนำและ export
- **Acceptance criteria:** ค่าที่ไม่แก้ไม่หาย; ผู้ใช้ตรวจและจัดการข้อมูลผิวได้ตาม policy
- **แผนดำเนินการ:** Phase 2, Task SC-10

## SC-11 — Consent profile อาจเปลี่ยนข้อความหลังยอมรับหรือคง accepted ข้ามเวอร์ชัน

- **Category / Severity:** Consent / Data Integrity / MEDIUM
- **สถานะหลักฐาน:** RISK
- **ตำแหน่ง:** [supabase/migrations/20261029110000_create_skin_profiles.sql:13](<C:/Users/balln/my-app/supabase/migrations/20261029110000_create_skin_profiles.sql:13>), [src/features/skin-profile/ui/skin-onboarding-screen.tsx:51](<C:/Users/balln/my-app/src/features/skin-profile/ui/skin-onboarding-screen.tsx:51>)
- **รายละเอียดและหลักฐาน:** consent_versions สำหรับ profile ไม่มี immutable-content trigger แบบ scan; accepted ไม่ reset เมื่อ consent.data.id เปลี่ยน; receipt เก็บอ้างอิง version อย่างเดียว
- **ผลกระทบ:** Receipt อาจไม่สะท้อนข้อความเดิมหรือส่ง version ใหม่จากการยอมรับ state เก่า
- **สาเหตุ:** Lifecycle/version invariants ยังไม่ครบ
- **แนวทางแก้ไข:** ทำ published consent immutable หรือเก็บ content hash/snapshot; reset acknowledgement ตาม version และบังคับ current version ใน RPC
- **Dependencies / ส่วนที่กระทบ:** SC-01, SC-09; scan consent design ที่มีอยู่
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ทดสอบ refresh version ระหว่างกรอก; แก้ข้อความเวอร์ชันที่ publish แล้ว; retry receipt
- **Acceptance criteria:** ส่งได้เฉพาะเวอร์ชันที่ผู้ใช้ยอมรับจริงและข้อความย้อนหลังไม่เปลี่ยน
- **แผนดำเนินการ:** Phase 1, Task SC-11

## SC-12 — ผล onboarding กลับมาหลังเปลี่ยนบัญชีไม่มี owner guard

- **Category / Severity:** Skin Profile / Concurrency / MEDIUM
- **สถานะหลักฐาน:** RISK
- **ตำแหน่ง:** [src/features/skin-profile/ui/skin-onboarding-screen.tsx:58](<C:/Users/balln/my-app/src/features/skin-profile/ui/skin-onboarding-screen.tsx:58>)
- **รายละเอียดและหลักฐาน:** onSuccess ใช้ userId ของ component ใน setQueryData และ dismissTo โดยไม่ตรวจ nextProfile.userId/current identity; draft/accepted ไม่ reset ตาม user
- **ผลกระทบ:** ผลเก่าอาจเขียน cache หรือพา navigation ใน session ใหม่; ไม่ใช่หลักฐานว่า RLS ถูกข้าม
- **สาเหตุ:** Mutation lifecycle ไม่ผูกกับ identity ที่เริ่มคำขอ
- **แนวทางแก้ไข:** Capture owner ตอน mutate, ตรวจ owner จากผล/current session ก่อน cache/navigation, reset draft ตาม identity
- **Dependencies / ส่วนที่กระทบ:** SC-10; Auth session boundary
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ใช้ deferred mutation: A submit→เปลี่ยนเป็น B→response A; รวม unmount และ retry
- **Acceptance criteria:** ไม่มี profile/draft ของ A ปรากฏใน B และไม่ navigate จากคำขอเก่า
- **แผนดำเนินการ:** Phase 2, Task SC-12

## SC-13 — Settings response เก่าเปลี่ยน ref และแจ้งเตือนของบัญชีใหม่ได้

- **Category / Severity:** Settings / Concurrency / HIGH
- **สถานะหลักฐาน:** RISK
- **ตำแหน่ง:** [src/app/settings.tsx:88](<C:/Users/balln/my-app/src/app/settings.tsx:88>), [src/app/settings.tsx:93](<C:/Users/balln/my-app/src/app/settings.tsx:93>), [src/app/settings.tsx:99](<C:/Users/balln/my-app/src/app/settings.tsx:99>)
- **รายละเอียดและหลักฐาน:** หลัง await saveUserSetting มีการแก้ settingsRef และ schedule ก่อน identity guard; catch ก็ rollback/save/schedule ก่อน guard; pending ที่เคลียร์ตอนสลับบัญชีไม่ยกเลิก request เก่า
- **ผลกระทบ:** การแจ้งเตือนและ state ของผู้ใช้ใหม่อาจถูกแทนที่ด้วยผลของผู้ใช้เดิม
- **สาเหตุ:** Guard ป้องกันเฉพาะ setEnabled/Alert แต่ไม่ครอบคลุม side effects
- **แนวทางแก้ไข:** ผูก operation กับ owner/generation และตรวจหลังทุก await ก่อน ref/cache/schedule/rollback; แยก compensating save ให้ไม่แตะ session ใหม่
- **Dependencies / ส่วนที่กระทบ:** SC-16; local notification queue
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** A save ค้าง→switch B→A success/failure; ทดสอบ permission dialog ค้างด้วย
- **Acceptance criteria:** ผลเก่าไม่เปลี่ยน UI/ref/schedule ของ B; rollback ไม่กลบ operation ใหม่
- **แผนดำเนินการ:** Phase 1, Task SC-13

## SC-14 — Rollback รายการโปรดทั้งชุดอาจลบ optimistic update ของสินค้าอื่น

- **Category / Severity:** Favorites / Concurrency / MEDIUM
- **สถานะหลักฐาน:** RISK
- **ตำแหน่ง:** [src/features/favorites/application/use-product-favorite.ts:23](<C:/Users/balln/my-app/src/features/favorites/application/use-product-favorite.ts:23>)
- **รายละเอียดและหลักฐาน:** แต่ละ mutation snapshot ทั้ง array และ onError restore previous ทั้งชุด; onSettled invalidate โดยไม่รอ mutation อื่นของ user
- **ผลกระทบ:** แตะ A/B ติดกันแล้ว A fail อาจทำให้ B หายชั่วคราวหรือถูก refetch กลบ
- **สาเหตุ:** Optimistic updates ไม่ reconcile ต่อ product/operation
- **แนวทางแก้ไข:** Rollback เฉพาะ product ที่ operation นี้เปลี่ยน หรือใช้ mutation serialization/reconciliation ราย user; invalidation เมื่อไม่มี conflicting writes
- **Dependencies / ส่วนที่กระทบ:** SC-01; query key owner isolation
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** จำลอง A fail หลัง B optimistic/success ทั้งลำดับ response; เปิดสินค้าซ้ำสอง component
- **Acceptance criteria:** สถานะ B ไม่หายเพราะ A fail และ cache สุดท้ายตรง server
- **แผนดำเนินการ:** Phase 2, Task SC-14

## SC-15 — กดหัวใจได้ก่อนโหลดสถานะเดิมสำเร็จ

- **Category / Severity:** Favorites / Loading / MEDIUM
- **สถานะหลักฐาน:** CONFIRMED
- **ตำแหน่ง:** [src/features/favorites/application/use-product-favorite.ts:19](<C:/Users/balln/my-app/src/features/favorites/application/use-product-favorite.ts:19>), [src/features/favorites/application/use-product-favorite.ts:44](<C:/Users/balln/my-app/src/features/favorites/application/use-product-favorite.ts:44>), [src/features/products/ui/product-card.tsx:25](<C:/Users/balln/my-app/src/features/products/ui/product-card.tsx:25>)
- **รายละเอียดและหลักฐาน:** isFavorite=false เมื่อ data ยังไม่มี; toggle ใช้ !isFavorite และ hook ไม่ expose loading/error readiness
- **ผลกระทบ:** สินค้าที่ชอบอยู่แล้วอาจถูกสั่งเพิ่มซ้ำแทนลบ; โหลด favorites ล้มเหลวแต่ UI แสดงเหมือนไม่เคยบันทึก
- **สาเหตุ:** เอา unknown state ไปเท่ากับ false
- **แนวทางแก้ไข:** แยก unknown/loading/error จาก not-favorite; ปิด mutation หรือโหลดค่าปัจจุบันก่อน toggle และมี retry
- **Dependencies / ส่วนที่กระทบ:** SC-01, SC-14
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** หน่วง initial query แล้วแตะสินค้าที่ server มีอยู่; จำลอง query error
- **Acceptance criteria:** ไม่มี write จากสถานะที่ยังไม่ทราบและผู้ใช้เห็นความผิดพลาดที่แก้ไขได้
- **แผนดำเนินการ:** Phase 2, Task SC-15

## SC-16 — ล้าง reminders/cache เฉพาะ manual sign-out บางทาง

- **Category / Severity:** Session / Notifications / MEDIUM
- **สถานะหลักฐาน:** CONFIRMED-GAP
- **ตำแหน่ง:** [src/features/auth/ui/auth-session-provider.tsx:33](<C:/Users/balln/my-app/src/features/auth/ui/auth-session-provider.tsx:33>), [src/app/settings.tsx:119](<C:/Users/balln/my-app/src/app/settings.tsx:119>), [src/features/settings/ui/settings-detail-screen.tsx:165](<C:/Users/balln/my-app/src/features/settings/ui/settings-detail-screen.tsx:165>)
- **รายละเอียดและหลักฐาน:** settings signOut ล้าง reminders แต่ deleteAccount flow ไม่ล้าง; auth provider รับ SIGNED_OUT โดยไม่ cleanup; settings signOut ยังหยุดทั้งหมดหาก cancel notifications throw
- **ผลกระทบ:** แจ้งเตือนของบัญชีเก่าอาจค้างหลังลบบัญชี/sessionหมด และ notification error ขัดขวาง logout
- **สาเหตุ:** Side effects ของ session กระจายตามหน้าจอ
- **แนวทางแก้ไข:** ทำ session transition cleanup กลาง; invalidate generation/cancel queries/ล้าง private cache และ reminders สำหรับทุกเส้นทาง โดย logout ไม่ผูกความสำเร็จกับ notification API
- **Dependencies / ส่วนที่กระทบ:** SC-13; account deletion staging
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** manual signout, expired/revoked session, delete success, cancel API reject และ switch account
- **Acceptance criteria:** ทุกเส้นทางหมด session ล้าง state ที่เป็นของ user และไม่เหลือ reminder เก่า
- **แผนดำเนินการ:** Phase 1, Task SC-16

## SC-17 — ขอสิทธิ์ Android ก่อนสร้าง notification channel

- **Category / Severity:** Notifications / Android / MEDIUM
- **สถานะหลักฐาน:** RISK
- **ตำแหน่ง:** [src/features/settings/application/local-notifications.ts:91](<C:/Users/balln/my-app/src/features/settings/application/local-notifications.ts:91>), [src/features/settings/application/local-notifications.ts:129](<C:/Users/balln/my-app/src/features/settings/application/local-notifications.ts:129>)
- **รายละเอียดและหลักฐาน:** requestLocalNotificationPermission เรียก requestPermissionsAsync ก่อน configureAndroidChannel ซึ่งถูกเรียกเมื่อ permission ผ่านแล้ว; Expo57 ระบุ Android13 prompt ต้องมี channel ก่อน
- **ผลกระทบ:** Fresh install อาจเปิดการแจ้งเตือนไม่ได้หรือพาไป settings โดยไม่มี prompt ตามคาด
- **สาเหตุ:** ลำดับ permission/channel กลับกัน; เทสต์ mock granted ตลอด
- **แนวทางแก้ไข:** สร้าง channel ก่อน permission request บน Android แล้วตรวจ denied/canAskAgain; คง iOS provisional handling
- **Dependencies / ส่วนที่กระทบ:** Expo57 notifications docs; ยังไม่ได้ยืนยันบนเครื่องจริง
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** Fresh install Android13+ ไม่มี channel→เปิด toggle; deny/retry/system grant; iOS regression
- **Acceptance criteria:** Prompt/ผล permission ถูกต้องและไม่เกิดวงจร denied เพราะยังไม่มี channel
- **แผนดำเนินการ:** Phase 2, Task SC-17

## SC-18 — เตือนวิเคราะห์ซ้ำ 30 วันถูกเริ่มนับใหม่เมื่อเข้า settings

- **Category / Severity:** Notifications / Scheduling / MEDIUM
- **สถานะหลักฐาน:** CONFIRMED
- **ตำแหน่ง:** [src/app/settings.tsx:52](<C:/Users/balln/my-app/src/app/settings.tsx:52>), [src/features/settings/application/local-notifications.ts:73](<C:/Users/balln/my-app/src/features/settings/application/local-notifications.ts:73>), [src/features/settings/application/local-notifications.ts:135](<C:/Users/balln/my-app/src/features/settings/application/local-notifications.ts:135>)
- **รายละเอียดและหลักฐาน:** ทุก load/settings toggle เรียก synchronize ซึ่ง cancel reminders ทั้งหมดแล้ว schedule TIME_INTERVAL30days ใหม่
- **ผลกระทบ:** เปิด settings ภายใน30วันซ้ำ ๆ ทำให้วันเตือนถูกเลื่อนออกไปเรื่อย ๆ
- **สาเหตุ:** ไม่ได้เก็บ due date/last analysis date หรือ reconcile เฉพาะค่าที่เปลี่ยน
- **แนวทางแก้ไข:** ใช้วันที่ครบกำหนดคงที่จากข้อมูลจริง และ reconcile schedule identifiers โดยไม่ reset เมื่อค่าเดิม
- **Dependencies / ส่วนที่กระทบ:** SC-20, SC-24; clock/timezone policy
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** fake clock: ตั้งวัน0→เปิดsettingsวัน10/20→ตรวจ due date; เปลี่ยน toggle ที่ไม่เกี่ยวข้อง
- **Acceptance criteria:** การเปิดหน้าและบันทึก preference อื่นไม่เลื่อนวันเตือนเดิม
- **แผนดำเนินการ:** Phase 2, Task SC-18

## SC-19 — อาจนำทางซ้ำจาก last notification response เดิม

- **Category / Severity:** Notifications / Navigation / LOW
- **สถานะหลักฐาน:** RISK
- **ตำแหน่ง:** [src/features/settings/application/notification-navigation-observer.tsx:24](<C:/Users/balln/my-app/src/features/settings/application/notification-navigation-observer.tsx:24>)
- **รายละเอียดและหลักฐาน:** อ่าน getLastNotificationResponse ทุก mount แต่ไม่บันทึก consumed request id หรือ clear response
- **ผลกระทบ:** re-mount/relaunch อาจพากลับ /analysis หรือ /routine โดยผู้ใช้ไม่ได้แตะใหม่
- **สาเหตุ:** ไม่มี deduplication ระหว่าง last response กับ listener
- **แนวทางแก้ไข:** ตรวจ request identifier/action และ consume หลัง navigation พร้อม ready/auth guard ที่เหมาะสม
- **Dependencies / ส่วนที่กระทบ:** SC-16; Expo notifications lifecycle
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** เปิดจาก notification แล้วเปิดแอปปกติอีกครั้ง; ส่ง last response และ listener id เดียวกัน
- **Acceptance criteria:** หนึ่ง response นำทางครั้งเดียวและ launch ปกติคงหน้าที่ควรเปิด
- **แผนดำเนินการ:** Phase 2, Task SC-19

## SC-20 — ข้อความเตือนสัญญารูทีน/ผลวิเคราะห์ที่ยังไม่มี

- **Category / Severity:** Notifications / Feature Integration / MEDIUM
- **สถานะหลักฐาน:** CONFIRMED-GAP
- **ตำแหน่ง:** [src/features/settings/application/local-notifications.ts:43](<C:/Users/balln/my-app/src/features/settings/application/local-notifications.ts:43>), [src/features/routines/ui/routine-screen.tsx:12](<C:/Users/balln/my-app/src/features/routines/ui/routine-screen.tsx:12>)
- **รายละเอียดและหลักฐาน:** AM/PM/skin cycling เป็น daily fixed times และปลายทาง routine เป็น unavailable; reanalysis ไม่ผูกวันที่ scan; promotions เป็น preference ไม่มี delivery service
- **ผลกระทบ:** ผู้ใช้ได้รับข้อความให้ทำรูทีนเฉพาะตนทั้งที่ไม่มีรูทีนหรือรอบจริง
- **สาเหตุ:** Notification settings ถูกเชื่อมก่อน domain flow
- **แนวทางแก้ไข:** ผูก reminders กับ capability/ข้อมูล routine จริงและ cycle date; ระบุ generic reminder เฉพาะเมื่อผลิตภัณฑ์อนุญาต ไม่อ้างว่าคำนวณเฉพาะบุคคลแล้ว
- **Dependencies / ส่วนที่กระทบ:** SC-18, SC-23, SC-24
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ไม่มีroutine/มีroutine/แก้cycle/หยุดroutine; release build ปิด scan
- **Acceptance criteria:** ไม่เตือนฟีเจอร์ที่ยังไม่มี และ schedule สอดคล้องข้อมูลที่หน้า destination แสดง
- **แผนดำเนินการ:** Phase 2, Task SC-20

## SC-21 — มีเมนูตั้งค่าที่กดแล้วไม่ทำงาน

- **Category / Severity:** Settings / UI / MEDIUM
- **สถานะหลักฐาน:** CONFIRMED-GAP
- **ตำแหน่ง:** [src/features/settings/application/settings-sections.ts:4](<C:/Users/balln/my-app/src/features/settings/application/settings-sections.ts:4>), [src/features/settings/application/settings-content.ts:1](<C:/Users/balln/my-app/src/features/settings/application/settings-content.ts:1>), [src/app/settings.tsx:137](<C:/Users/balln/my-app/src/app/settings.tsx:137>)
- **รายละเอียดและหลักฐาน:** ลบประวัติการวิเคราะห์, ภาษา, ธีม, หน่วย/รูปแบบวันที่ ไม่มี destination/handler; Colors.dark เท่ากับ light และ root ใช้ DefaultTheme
- **ผลกระทบ:** ผู้ใช้ตีความว่าเปลี่ยนหรือลบข้อมูลได้ แต่ไม่มี operation
- **สาเหตุ:** รายการเมนูไม่ถูกตรวจว่ามี capability รองรับ
- **แนวทางแก้ไข:** กำหนด capability registry ให้ทุก row มี action หรือสถานะ unavailable; ทำจริงตาม release scope โดยแยก destructive history action
- **Dependencies / ส่วนที่กระทบ:** SC-22, SC-24, SC-48
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ไล่กดทุก settings row; ตรวจ switch/action/unavailable และ deep link
- **Acceptance criteria:** ไม่มี interactive row ที่เงียบ และไม่แสดง success สำหรับ operation ที่ไม่มี
- **แผนดำเนินการ:** Phase 2, Task SC-21

## SC-22 — ข้อมูล privacy/export description ไม่ทันระบบที่มีอยู่

- **Category / Severity:** Privacy / Product Readiness / HIGH
- **สถานะหลักฐาน:** CONFIRMED-GAP
- **ตำแหน่ง:** [src/features/settings/application/settings-content.ts:23](<C:/Users/balln/my-app/src/features/settings/application/settings-content.ts:23>), [src/features/settings/ui/settings-detail-screen.tsx:158](<C:/Users/balln/my-app/src/features/settings/ui/settings-detail-screen.tsx:158>), [src/features/settings/ui/settings-detail-screen.tsx:175](<C:/Users/balln/my-app/src/features/settings/ui/settings-detail-screen.tsx:175>)
- **รายละเอียดและหลักฐาน:** Privacy ระบุ account/name/settings/support แต่ยังไม่ครอบคลุม favorites/skin profile/HTTPS pilot; contact ไม่มีอีเมล; descriptions export/delete ยังเป็นชุดข้อมูลเก่า
- **ผลกระทบ:** ผู้ใช้ไม่เห็นภาพข้อมูลที่ประมวลผลครบ; consent/preferences ถูกเข้าใจผิด และช่องทางจัดการข้อมูลไม่ครบ
- **สาเหตุ:** เนื้อหาจากรุ่นทดสอบเก่าคงอยู่หลังเพิ่ม features
- **แนวทางแก้ไข:** จัด data inventory ให้ตรงระบบจริงและ release mode; ระบุผู้รับภาพ retention/withdrawal/contact และ fields export v2; ให้เจ้าของ policy ตรวจเนื้อหาก่อนเผยแพร่
- **Dependencies / ส่วนที่กระทบ:** SC-01, SC-09–SC-11, SC-24; ไม่ใช่ความเห็นทางกฎหมาย
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** เทียบแต่ละ table/endpoint/field กับ privacy notice/export/delete behavior ด้วยข้อมูลทดสอบ
- **Acceptance criteria:** ข้อความและการทำงานตรงกันทุกข้อมูลที่เก็บหรือส่ง; contact/withdrawal มีขั้นตอนที่ทำได้
- **แผนดำเนินการ:** Phase 1, Task SC-22

## SC-23 — Core loop รูทีนและคำแนะนำเฉพาะบุคคลยังไม่ถูก implement

- **Category / Severity:** Routine / Recommendation / Calendar / HIGH
- **สถานะหลักฐาน:** CONFIRMED-GAP
- **ตำแหน่ง:** [src/features/routines/ui/routine-screen.tsx:7](<C:/Users/balln/my-app/src/features/routines/ui/routine-screen.tsx:7>), [src/features/routines/domain/routine.ts:1](<C:/Users/balln/my-app/src/features/routines/domain/routine.ts:1>), [docs/requirements.md:51](<C:/Users/balln/my-app/docs/requirements.md:51>), [src/features/products/ui/home-screen.tsx:145](<C:/Users/balln/my-app/src/features/products/ui/home-screen.tsx:145>)
- **รายละเอียดและหลักฐาน:** routine route เป็น unavailable; มีเฉพาะ type; ไม่มี persistence/engine/owned products/completion/calendar/skin check/budget substitution; Home แสดงตัวอย่าง Recovery
- **ผลกระทบ:** ยังทำ primary flow วิเคราะห์→แนะนำ→รูทีนรายวันไม่ได้
- **สาเหตุ:** Domain ที่วางแผนไว้ยังไม่เชื่อม implementation
- **แนวทางแก้ไข:** แบ่ง vertical slices: owned products/profile→deterministic rules→persisted routine revision→calendar/completion→substitution; ให้ผู้รับผิดชอบยืนยันกฎก่อนใช้
- **Dependencies / ส่วนที่กระทบ:** SC-01, SC-10, SC-24, SC-28; safety-rule owner และขอบเขต MVP
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ทดสอบ input เปลี่ยน/avoid ingredient/budget/timezone/duplicate completion/rule version; ห้ามใช้คะแนนดิบเป็นกฎอัตโนมัติ
- **Acceptance criteria:** ผล reproducible มีเหตุผล/version; history/completionไม่ซ้ำ; ไม่มีคำแนะนำที่ข้าม exclusion rules
- **แผนดำเนินการ:** Phase 2, Task SC-23

## SC-24 — Production scan pipeline ยังเป็น foundation และ research pilot

- **Category / Severity:** Skin Analysis / Backend / HIGH
- **สถานะหลักฐาน:** CONFIRMED-GAP
- **ตำแหน่ง:** [src/features/skin-analysis/ui/scan-flow-screen.tsx:17](<C:/Users/balln/my-app/src/features/skin-analysis/ui/scan-flow-screen.tsx:17>), [src/features/skin-analysis/services/local-scan.ts:65](<C:/Users/balln/my-app/src/features/skin-analysis/services/local-scan.ts:65>), [supabase/migrations/20261103181856_scan_consent_sessions.sql:56](<C:/Users/balln/my-app/supabase/migrations/20261103181856_scan_consent_sessions.sql:56>)
- **รายละเอียดและหลักฐาน:** pilot เปิดเฉพาะ __DEV__ Android; remote active scan consent=0, edge functions=[]; client ไม่เรียก create_consented_skin_scan ไม่บันทึกผล/ประวัติ; bucket private ไม่มี client policyโดยตั้งใจ
- **ผลกระทบ:** Release/iOS/web สแกนไม่ได้; ไม่มี consent receipt/result lifecycle/history ใน primary flow
- **สาเหตุ:** Pilot กับ Supabase foundation ยังไม่เชื่อม และ production decisions ยังไม่ครบ
- **แนวทางแก้ไข:** เลือก processing boundary/retention แล้วเชื่อม consent→job→validated input→trusted inference→result→cleanup แบบ idempotent; server-side writes เท่านั้น; ทำ storage เฉพาะเมื่อ flow ต้องใช้จริง
- **Dependencies / ส่วนที่กระทบ:** SC-22, SC-25, SC-26, SC-38; provider/retention/budget decisions
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ทดสอบ unauthorized/cross-owner/expired consent/retry/cancel/network loss/duplicate job/cleanup failures ใน staging
- **Acceptance criteria:** Release path ผ่าน end-to-end; ไม่มีการเปิด active consent ล่วงหน้าโดย endpoint/cleanup ยังไม่พร้อม
- **แผนดำเนินการ:** Phase 2, Task SC-24

## SC-25 — ยังไม่มีหลักฐานความแม่นยำหรือ face-quality gate สำหรับใช้ผลจริง

- **Category / Severity:** AI / Data Quality / HIGH
- **สถานะหลักฐาน:** CONFIRMED-GAP
- **ตำแหน่ง:** [scripts/skin_ai/serve_local_scan.py:18](<C:/Users/balln/my-app/scripts/skin_ai/serve_local_scan.py:18>), [scripts/skin_ai/serve_local_scan.py:31](<C:/Users/balln/my-app/scripts/skin_ai/serve_local_scan.py:31>), [scripts/skin_ai/run_experiment.py:14](<C:/Users/balln/my-app/scripts/skin_ai/run_experiment.py:14>), [docs/skin-ai-evaluation-protocol.md:1](<C:/Users/balln/my-app/docs/skin-ai-evaluation-protocol.md:1>)
- **รายละเอียดและหลักฐาน:** decode_photo ตรวจ format/dimensions/brightness เท่านั้น; score_image ส่ง image/text prompts และคืน raw margin; มี synthetic smoke fixtures/benchmark code แต่ไม่ใช่ independent validation
- **ผลกระทบ:** ภาพไม่ใช่ใบหน้าก็อาจได้คะแนน; ไม่ควรใช้ margin เป็น probability/diagnosis/คำแนะนำที่ต้องเชื่อถือ
- **สาเหตุ:** Research model ยังไม่มี validated task contract/calibration/abstention ใน production
- **แนวทางแก้ไข:** ทำ quality gate ที่ทดสอบได้, unassessable path, dataset split ตามบุคคล, frozen validation/test และ metrics พร้อม uncertainty/subgroups; รักษาป้าย research จนผ่านเกณฑ์ที่ตกลง
- **Dependencies / ส่วนที่กระทบ:** SC-24; ผู้ประเมิน/สิทธิ์ dataset/เกณฑ์ผ่าน
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ภาพไม่มีหน้า/หลายหน้า/มืด/เบลอ; independent labels; leakage check; benchmark เดียวกันก่อนและหลังเปลี่ยน model
- **Acceptance criteria:** ไม่รับภาพนอกขอบเขตแบบมั่นใจ; มีผล evaluation ที่ reproducible; ไม่แปลงคะแนนเป็นคำวินิจฉัย
- **แผนดำเนินการ:** Phase 2, Task SC-25

## SC-26 — ลบภาพใน finally ยังไม่ครอบคลุม process kill และ crash

- **Category / Severity:** Privacy / Image Lifecycle / MEDIUM
- **สถานะหลักฐาน:** RISK
- **ตำแหน่ง:** [src/features/skin-analysis/ui/scan-flow-screen.tsx:126](<C:/Users/balln/my-app/src/features/skin-analysis/ui/scan-flow-screen.tsx:126>), [src/features/skin-analysis/ui/scan-flow-screen.tsx:143](<C:/Users/balln/my-app/src/features/skin-analysis/ui/scan-flow-screen.tsx:143>), [src/features/settings/application/share-account-export.ts:6](<C:/Users/balln/my-app/src/features/settings/application/share-account-export.ts:6>)
- **รายละเอียดและหลักฐาน:** camera เขียนรูป cache และ finally ลบ; ไม่มี startup orphan cleanup/ทะเบียนไฟล์ที่เป็นของ scan; export JSON ใช้แนว finally เช่นกัน
- **ผลกระทบ:** ภาพ/ไฟล์ข้อมูลอาจค้าง cache หลัง process ถูก OS kill หรือ delete fail; ไม่ยืนยันว่าเกิดขึ้นบนเครื่องในรอบนี้
- **สาเหตุ:** Cleanup อาศัย control flow ปกติและไม่มีการกู้คืนหลัง restart
- **แนวทางแก้ไข:** ใช้ directory/file ownership ที่จำกัด scope พร้อม startup/TTL cleanup และกำหนด retention; ห้ามล้าง cache ทั้งแอปแบบกว้าง
- **Dependencies / ส่วนที่กระทบ:** SC-22, SC-24; Expo filesystem/camera behavior
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** kill หลังถ่าย/ระหว่าง upload/export; เปิดแอปใหม่; inject delete failure แล้วตรวจเฉพาะไฟล์ของฟีเจอร์
- **Acceptance criteria:** ไม่มี orphan เกิน retention ที่กำหนดและ cleanup ไม่ลบไฟล์อื่น
- **แผนดำเนินการ:** Phase 1, Task SC-26

## SC-27 — เรียงราคาก่อนหลังไม่ครอบคลุมทั้ง catalog และไม่มี pagination

- **Category / Severity:** Catalog / Correctness / MEDIUM
- **สถานะหลักฐาน:** CONFIRMED
- **ตำแหน่ง:** [src/features/products/data/supabase-product-repository.ts:19](<C:/Users/balln/my-app/src/features/products/data/supabase-product-repository.ts:19>), [src/features/products/data/supabase-product-repository.ts:27](<C:/Users/balln/my-app/src/features/products/data/supabase-product-repository.ts:27>), [src/features/products/data/supabase-product-repository.ts:32](<C:/Users/balln/my-app/src/features/products/data/supabase-product-repository.ts:32>), [src/features/products/ui/discover-screen.tsx:49](<C:/Users/balln/my-app/src/features/products/ui/discover-screen.tsx:49>)
- **รายละเอียดและหลักฐาน:** DB limit30 และ sort review_count ก่อน client sortราคา; cursorไม่ถูกใช้และ nextCursor=null; totalยังเป็น countทั้งหมด; ปัจจุบัน remoteมี8 active products จึงยังไม่เกินเพดาน
- **ผลกระทบ:** เมื่อมี31+สินค้า สินค้าที่ถูกสุด/แพงสุดอาจไม่อยู่ในผลและรายการที่เหลือเข้าถึงไม่ได้
- **สาเหตุ:** Query contract ประกาศ pagination แต่ implementation เป็น page เดียว
- **แนวทางแก้ไข:** คำนวณ min available price/orderบน server ที่คงRLS; stable cursorตามsortและid; infinite query/next page พร้อม total contract
- **Dependencies / ส่วนที่กระทบ:** SC-35, SC-45; schema migration/test fixtures
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ใช้31+สินค้าที่ cheapest มีreviewต่ำ, ราคาซ้ำ, ไม่มีราคา, เปลี่ยนfilterระหว่างโหลดpage
- **Acceptance criteria:** ลำดับทั้งdatasetถูกต้อง ไม่มีข้าม/ซ้ำ และผู้ใช้โหลดได้ครบ
- **แผนดำเนินการ:** Phase 2, Task SC-27

## SC-28 — ข้อมูลสินค้า ราคา รีวิว และลิงก์ยังเป็นตัวอย่าง

- **Category / Severity:** Catalog / Data Provenance / MEDIUM
- **สถานะหลักฐาน:** CONFIRMED-GAP
- **ตำแหน่ง:** [supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:42](<C:/Users/balln/my-app/supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:42>), [src/features/products/ui/home-screen.tsx:49](<C:/Users/balln/my-app/src/features/products/ui/home-screen.tsx:49>), [src/features/products/ui/product-detail-screen.tsx:119](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:119>)
- **รายละเอียดและหลักฐาน:** migration seed มี8สินค้าและ example.com/homepage offers; UIมี disclaimerแล้ว แต่ rating/reviews/ingredient list ยังไม่มี provenance; lastUpdatedAtถูก mapแต่ไม่แสดง
- **ผลกระทบ:** ใช้เปรียบเทียบราคา/เลือกส่วนผสมจริงไม่ได้อย่างเชื่อถือได้ แม้ UI ใช้งานได้
- **สาเหตุ:** Catalog production ingestion/verification ยังไม่มี
- **แนวทางแก้ไข:** แยก sample vs verified source พร้อมเวลาตรวจสอบราคา/สิทธิ์รูป/INCI; ไม่ใช้ seed claims เป็น recommendation inputจริง; ตรวจ deep product links
- **Dependencies / ส่วนที่กระทบ:** SC-23, SC-27, SC-30; เจ้าของข้อมูลสินค้า
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ตรวจแหล่งข้อมูลทีละSKU, ราคา stale/offer unavailable และลิงก์ที่ปลายทางไม่ใช่สินค้า
- **Acceptance criteria:** ข้อมูลที่จะเปิดจริง traceแหล่งที่มาได้ และผู้ใช้เห็นราคา/ความสด/สถานะตัวอย่างตรงกัน
- **แผนดำเนินการ:** Phase 2, Task SC-28

## SC-29 — รายละเอียดเติมข้อมูลที่ไม่มีและผูกประโยชน์ส่วนผสมผิดระดับ

- **Category / Severity:** Product Detail / Data Integrity / MEDIUM
- **สถานะหลักฐาน:** CONFIRMED
- **ตำแหน่ง:** [src/features/products/ui/product-detail-screen.tsx:152](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:152>), [src/features/products/ui/product-detail-screen.tsx:175](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:175>), [src/features/products/ui/product-detail-screen.tsx:182](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:182>)
- **รายละเอียดและหลักฐาน:** sizeว่างถูกแทนด้วย250ml; ทุกkeyIngredientแสดง item.concerns[0]; popular badgeแสดงทุกสินค้า
- **ผลกระทบ:** ผู้ใช้เห็นขนาด/ประโยชน์/ความนิยมที่ไม่ได้มาจากข้อมูลของfieldนั้น
- **สาเหตุ:** ใช้fallbackและdecorative labelsแทน data semantics
- **แนวทางแก้ไข:** แสดงunknownเมื่อไม่มีsize; ใช้ingredient-specific evidenceหรือไม่กล่าวอ้าง; คำนวณbadgeจากเงื่อนไขที่ชัดเจน
- **Dependencies / ส่วนที่กระทบ:** SC-28; product domain/schema
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** fixture sizeว่าง, ingredientหลายตัว/concernsต่างกัน, unpopular product
- **Acceptance criteria:** ไม่มีข้อมูลที่แต่งขึ้นจากfallback และทุกclaimสัมพันธ์กับข้อมูลที่รองรับ
- **แผนดำเนินการ:** Phase 2, Task SC-29

## SC-30 — ภาพสินค้า mapping ไม่ตรงตัวรายการและบาง detail ไม่มีภาพสำรอง

- **Category / Severity:** Assets / Product UI / MEDIUM
- **สถานะหลักฐาน:** CONFIRMED
- **ตำแหน่ง:** [src/features/products/ui/product-image-sources.ts:2](<C:/Users/balln/my-app/src/features/products/ui/product-image-sources.ts:2>), [src/features/products/ui/product-artwork.tsx:44](<C:/Users/balln/my-app/src/features/products/ui/product-artwork.tsx:44>), [src/features/products/ui/product-detail-screen.tsx:156](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:156>)
- **รายละเอียดและหลักฐาน:** anua-heartleaf-toner ผูกกับภาพ generated ขวดdropper 77+ ที่เปิดดูจริงแล้ว ขณะที่ catalogระบุ toner250ml; mappingมี3รายการ; detailอีก5รายการแสดงnull ไม่มีProductArtwork fallback; labelเรียกภาพทั้งหมดว่าภาพผลิตภัณฑ์จริง
- **ผลกระทบ:** ภาพอาจทำให้จำสินค้าผิดและรายละเอียดบางสินค้ามีพื้นที่ภาพว่าง
- **สาเหตุ:** Static mappingและfallbackของcard/detailไม่ร่วมกัน
- **แนวทางแก้ไข:** ยืนยันassetกับSKU/สิทธิ์ใช้งาน; ระบุภาพจำลองอย่างถูกต้อง; reuse artwork fallbackและเลือกimage metadataจากcatalog
- **Dependencies / ส่วนที่กระทบ:** SC-28; อย่าเปลี่ยนassetจริงในรอบaudit
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** เปิดทั้ง8SKU เทียบcatalogกับasset; testmissing source/imageerror/accessibilitylabel
- **Acceptance criteria:** ทุกSKUแสดงภาพที่ตรงหรือfallbackชัดเจน และภาพจำลองไม่ถูกประกาศว่าภาพจริง
- **แผนดำเนินการ:** Phase 2, Task SC-30

## SC-31 — Gallery และคำอธิบายดูเหมือนกดได้แต่เป็นภาพนิ่ง

- **Category / Severity:** Product Detail / UX / LOW
- **สถานะหลักฐาน:** CONFIRMED-GAP
- **ตำแหน่ง:** [src/features/products/ui/product-detail-screen.tsx:133](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:133>), [src/features/products/ui/product-detail-screen.tsx:157](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:157>), [src/features/products/ui/product-detail-screen.tsx:198](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:198>), [src/features/products/ui/product-detail-screen.tsx:95](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:95>)
- **รายละเอียดและหลักฐาน:** thumbnail/+2/pagination เป็นView; descriptionตัด2บรรทัดพร้อมchevronแต่ไม่มีexpand; shareส่งเฉพาะชื่อไม่มีproduct link
- **ผลกระทบ:** อ่านรายละเอียดทั้งหมดหรือเลื่อนgalleryไม่ได้; ผู้รับshareเปิดสินค้าโดยตรงไม่ได้
- **สาเหตุ:** UI mockยังไม่ได้เชื่อม interaction/data
- **แนวทางแก้ไข:** กำหนดmedia arrayจริงหรือแสดงภาพเดียว; เพิ่มexpandตามdesignเดิมและdeep linkที่เปิดได้จริง
- **Dependencies / ส่วนที่กระทบ:** SC-28, SC-48; product URL scheme/hosting
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** แตะทุกthumbnail/expand, longdescription, shareแล้วเปิดcold app/web
- **Acceptance criteria:** ไม่มีตัวควบคุมที่สื่อว่ากดได้แต่ไร้ผล และแชร์นำผู้รับกลับSKUถูกต้อง
- **แผนดำเนินการ:** Phase 2, Task SC-31

## SC-32 — Type assertions ยอมรับ payload ที่ไม่ตรง domain

- **Category / Severity:** API / Runtime Validation / MEDIUM
- **สถานะหลักฐาน:** RISK
- **ตำแหน่ง:** [src/features/products/data/supabase-product-repository.ts:5](<C:/Users/balln/my-app/src/features/products/data/supabase-product-repository.ts:5>), [src/features/products/data/supabase-product-repository.ts:26](<C:/Users/balln/my-app/src/features/products/data/supabase-product-repository.ts:26>), [src/features/products/ui/product-artwork.tsx:26](<C:/Users/balln/my-app/src/features/products/ui/product-artwork.tsx:26>), [src/features/skin-profile/data/supabase-skin-profile-repository.ts:65](<C:/Users/balln/my-app/src/features/skin-profile/data/supabase-skin-profile-repository.ts:65>)
- **รายละเอียดและหลักฐาน:** Supabase rowsถูกcast unknown→SummaryRow/DetailRow/SkinProfileRow โดยไม่validate; categoriesเป็นtableขยายได้แต่UIใช้union6ค่าและpalette.labelไม่guard
- **ผลกระทบ:** schema/data driftอาจทำให้หน้าล่ม เช่น categoryใหม่หรือarrayผิดรูป; TS compileไม่ตรวจnetworkpayload
- **สาเหตุ:** ยังไม่ได้เชื่อมschema validation/generated DB types
- **แนวทางแก้ไข:** สร้างgenerated Database typesและboundary parserที่จำเป็น; validate enums/money/arrays/RPCshapeก่อนmap พร้อมunknown fallback
- **Dependencies / ส่วนที่กระทบ:** SC-27, SC-29, SC-36
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** mock categoryใหม่, nulljoin, invalidcurrency, malformedRPC และschema versionไม่รองรับ
- **Acceptance criteria:** payloadผิดรูปถูกปฏิเสธ/แสดงfallbackควบคุมได้ ไม่เกิดundefined crash
- **แผนดำเนินการ:** Phase 3, Task SC-32

## SC-33 — โหลดฟอนต์ล้มเหลวแล้ว root อาจว่างถาวร

- **Category / Severity:** Startup / Error Handling / MEDIUM
- **สถานะหลักฐาน:** RISK
- **ตำแหน่ง:** [src/app/_layout.tsx:25](<C:/Users/balln/my-app/src/app/_layout.tsx:25>), [src/app/_layout.tsx:32](<C:/Users/balln/my-app/src/app/_layout.tsx:32>)
- **รายละเอียดและหลักฐาน:** useFonts destructureเฉพาะfontsLoaded และreturn nullจนtrue โดยไม่รับerrorหรือfallback
- **ผลกระทบ:** หากassetโหลดเสีย/networkwebล้มเหลว แอปอาจไม่มีหน้าerrorหรือทางกลับ
- **สาเหตุ:** Startup gateไม่มีfailure state
- **แนวทางแก้ไข:** รับfont errorและใช้fallback font/error stateตามdesign; จัดsplash lifecycleให้ชัดเจน
- **Dependencies / ส่วนที่กระทบ:** Root providers/navigation; Expo57 font API
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** mock useFonts=[false,error] และช้า/สำเร็จ; ทดสอบcold web/native
- **Acceptance criteria:** แอปไม่ค้างหน้าว่างเมื่อfonterrorและโหลดปกติไม่กระพริบผิดพลาด
- **แผนดำเนินการ:** Phase 1, Task SC-33

## SC-34 — Loading/error/back บางหน้าไม่ครบและcounterกลบข้อผิดพลาด

- **Category / Severity:** UI / Error Navigation / LOW
- **สถานะหลักฐาน:** CONFIRMED
- **ตำแหน่ง:** [src/features/products/ui/home-screen.tsx:110](<C:/Users/balln/my-app/src/features/products/ui/home-screen.tsx:110>), [src/features/products/ui/product-detail-screen.tsx:66](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:66>), [src/features/products/ui/product-detail-screen.tsx:77](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:77>), [src/features/profile/ui/profile-screen.tsx:98](<C:/Users/balln/my-app/src/features/profile/ui/profile-screen.tsx:98>), [src/app/settings.tsx:137](<C:/Users/balln/my-app/src/app/settings.tsx:137>)
- **รายละเอียดและหลักฐาน:** Home query pending/emptyเป็นแถวว่าง; detail errorไม่มีbackและnotfoundใช้router.backโดยไม่fallback; profilefavorites countใช้0เมื่อqueryerror; settingsbackใช้backอย่างเดียว
- **ผลกระทบ:** ผู้ใช้แยกข้อมูลว่าง/โหลดผิดพลาดไม่ได้และdeep linkอาจติดหน้าที่ไม่มีทางกลับ
- **สาเหตุ:** Status renderingและnavigation fallbackไม่สม่ำเสมอ
- **แนวทางแก้ไข:** ทำexplicit pending/error/empty โดยไม่ตีความerrorเป็น0; ใช้safe-backไปdestinationที่เหมาะสมและaccessible retry
- **Dependencies / ส่วนที่กระทบ:** SC-01, SC-15; UI lockต้องรักษาlayoutหลัก
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** offline, emptycatalog, favoriteserror, directdeep link404 บนweb/native
- **Acceptance criteria:** ทุกสถานะบอกความจริงและมีทางretry/กลับหน้าใช้งานได้
- **แผนดำเนินการ:** Phase 2, Task SC-34

## SC-35 — Money model ยอมหลายสกุล แต่หาร100และเทียบจำนวนดิบเสมอ

- **Category / Severity:** Catalog / Money / MEDIUM
- **สถานะหลักฐาน:** RISK
- **ตำแหน่ง:** [src/features/products/application/format-money.ts:6](<C:/Users/balln/my-app/src/features/products/application/format-money.ts:6>), [src/features/products/data/supabase-product-repository.ts:11](<C:/Users/balln/my-app/src/features/products/data/supabase-product-repository.ts:11>), [src/features/products/ui/product-detail-screen.tsx:40](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:40>), [supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:17](<C:/Users/balln/my-app/supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:17>)
- **รายละเอียดและหลักฐาน:** currencyเป็นchar3 uppercaseไม่บังคับTHB; formatหาร100และปัดทศนิยม0; min/max/sortเทียบamountMinorข้ามcurrencyได้; seedปัจจุบันเป็นTHB
- **ผลกระทบ:** ราคา .50ถูกปัดและข้อมูลหลายสกุลในอนาคตทำให้range/sortผิด
- **สาเหตุ:** หน่วยเงินและcurrency policyไม่ถูกenforce
- **แนวทางแก้ไข:** ถ้าMVP THBให้constraint/validationชัดเจนและรักษาสตางค์ตามการแสดงผล; หากmulticurrencyต้องแยกหรือconvertด้วยrateที่มีsource/time
- **Dependencies / ส่วนที่กระทบ:** SC-27, SC-32; product currency decision
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** THB39050, invalidcode, currencyผสม และzero-decimalcurrencyหากอยู่ในscope
- **Acceptance criteria:** ราคา/การเรียงไม่เปรียบเทียบหน่วยที่ต่างกันโดยเงียบ และการปัดเป็นpolicyที่ระบุ
- **แผนดำเนินการ:** Phase 2, Task SC-35

## SC-36 — ข้อจำกัดข้อมูลและupdated_atยังไม่ครอบคลุม

- **Category / Severity:** Database / Validation / MEDIUM
- **สถานะหลักฐาน:** RISK
- **ตำแหน่ง:** [supabase/migrations/20261029110000_create_skin_profiles.sql:71](<C:/Users/balln/my-app/supabase/migrations/20261029110000_create_skin_profiles.sql:71>), [supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:9](<C:/Users/balln/my-app/supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:9>), [supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:26](<C:/Users/balln/my-app/supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:26>)
- **รายละเอียดและหลักฐาน:** onboardingRPCไม่จำกัดจำนวน/ความยาวconcern/avoid arrays; catalogratingไม่มี0–5check; user_settings/productsupdated_atมีdefaultแต่ไม่มีtriggerupdate (profileมีtrigger)
- **ผลกระทบ:** clientดัดแปลงส่งpayloadใหญ่หรือdomainผิดได้; เวลาแก้ไขไม่น่าเชื่อถือ; ยังไม่ได้โจมตีremote
- **สาเหตุ:** Validationบางส่วนอยู่เฉพาะUIและtimestampdefaultไม่ใช่updatehook
- **แนวทางแก้ไข:** เพิ่มserverconstraintsตามdomainจริง, allowlistconcern/normalizedingredient IDsและlengthlimits; triggerหรือexplicitupdated_atในทุกwritepath
- **Dependencies / ส่วนที่กระทบ:** SC-01, SC-10, SC-32; taxonomy/limit decisions
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** SQL negative tests arraysใหญ่/ค่าที่ไม่รองรับ/ratingนอกช่วง; updateค่าจริงแล้วตรวจtimestamp
- **Acceptance criteria:** serverปฏิเสธข้อมูลนอกcontractและupdated_atสะท้อนwriteทุกช่องทาง
- **แผนดำเนินการ:** Phase 3, Task SC-36

## SC-37 — Supabase leaked-password protection ยังปิด

- **Category / Severity:** Security / Auth Configuration / MEDIUM
- **สถานะหลักฐาน:** CONFIRMED-CONFIG
- **ตำแหน่ง:** [src/core/supabase/client.ts:23](<C:/Users/balln/my-app/src/core/supabase/client.ts:23>)
- **รายละเอียดและหลักฐาน:** Supabase security advisorวันที่2026-11-04รายงาน auth_leaked_password_protection disabled; ไม่ได้อ่านหรือทดสอบรหัสผู้ใช้
- **ผลกระทบ:** ไม่มีการปฏิเสธรหัสผ่านรั่วตามcapabilityนี้ในAuth
- **สาเหตุ:** Auth configurationยังไม่เปิดprotection
- **แนวทางแก้ไข:** ตรวจสิทธิ์แพ็กเกจ/configแล้วเปิดในสภาพแวดล้อมทดสอบ พร้อมจัดการweak_password errorให้ผู้ใช้เข้าใจ
- **Dependencies / ส่วนที่กระทบ:** SC-08; https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ใช้รหัสทดสอบตามprovider policyสำหรับsignup/update; ทดสอบerror mappingและบัญชีเดิม
- **Acceptance criteria:** Protectionเปิดและclientรับerrorได้ หรือมีข้อจำกัด/มาตรการทดแทนที่บันทึกชัดเจน
- **แผนดำเนินการ:** Phase 1, Task SC-37

## SC-38 — RPCสร้างscanและsupport insertยังไม่มีquotaต่อผู้ใช้

- **Category / Severity:** Backend / Abuse Controls / MEDIUM
- **สถานะหลักฐาน:** RISK-BEFORE-ENABLE
- **ตำแหน่ง:** [supabase/migrations/20261103181856_scan_consent_sessions.sql:71](<C:/Users/balln/my-app/supabase/migrations/20261103181856_scan_consent_sessions.sql:71>), [supabase/migrations/20260922090000_settings_account_flows.sql:18](<C:/Users/balln/my-app/supabase/migrations/20260922090000_settings_account_flows.sql:18>)
- **รายละเอียดและหลักฐาน:** scanRPCมีownerlockและidempotencyแต่requestUUIDใหม่สร้างได้เรื่อย ๆ เมื่อconsentactive; supportpolicyตรวจownerแต่ไม่มีrate/storagequota; ปัจจุบันscanconsentไม่activeและsupporttableยังไม่deploy
- **ผลกระทบ:** หลังเปิดฟีเจอร์ authenticateduserอาจสร้างrecordจำนวนมาก ทำให้cost/availabilityเสีย
- **สาเหตุ:** Idempotencyป้องกันrequestซ้ำแต่ไม่จำกัดnewrequests; RLSไม่ใช่rate limit
- **แนวทางแก้ไข:** เพิ่มper-userwindow/quotaและglobalbudgetในtrustedserver/transaction; ป้องกันRPCbypassถ้าenforceเฉพาะHTTPgateway
- **Dependencies / ส่วนที่กระทบ:** SC-01, SC-24; advisor SECURITY DEFINER ต้องreviewแต่ไม่ใช่ช่องโหว่โดยตัวมันเอง
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** stagingparallelnewUUID/reusedUUID, ownerA/B และlimitboundary; ไม่loadtestproduction
- **Acceptance criteria:** retryยังidempotentและการสร้างงานใหม่เกินquotaถูกปฏิเสธอย่างสม่ำเสมอ
- **แผนดำเนินการ:** Phase 1, Task SC-38

## SC-39 — UI ยังถือbusiness side effectsและSupabase callsหลายจุด

- **Category / Severity:** Architecture / Maintainability / MEDIUM
- **สถานะหลักฐาน:** CONFIRMED
- **ตำแหน่ง:** [src/app/settings.tsx:18](<C:/Users/balln/my-app/src/app/settings.tsx:18>), [src/features/auth/ui/auth-screen.tsx:138](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:138>), [src/features/profile/ui/profile-screen.tsx:40](<C:/Users/balln/my-app/src/features/profile/ui/profile-screen.tsx:40>), [src/features/settings/ui/settings-detail-screen.tsx:85](<C:/Users/balln/my-app/src/features/settings/ui/settings-detail-screen.tsx:85>)
- **รายละเอียดและหลักฐาน:** settingsrouteเป็นscreen+effects143lines; auth716linesรวมform/auth/navigation/styles; profilequeryเรียกSupabaseในUI; asyncidentitylogicซ้ำหลายscreen
- **ผลกระทบ:** ยากต่อการทดสอบcross-flowและแก้raceให้สอดคล้อง; ขัดกับroute-onlyแนวทางในarchitecture doc
- **สาเหตุ:** Feature-firstมีอยู่แต่boundaryใช้ไม่สม่ำเสมอ
- **แนวทางแก้ไข:** คงfeature-firstและReactQuery; ย้ายsettingsscreenออกจากroute, แยกusecases/repositories/querykeys/sessioncleanup; ไม่เพิ่มframeworkหรือglobalstoreใหม่โดยไม่มีเหตุผล
- **Dependencies / ส่วนที่กระทบ:** SC-12–SC-16; ต้องมีbehaviorregressionก่อนrefactor
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ทดสอบflowเดิมเทียบก่อนหลัง; importsไม่ย้อนdomain→UI; typecheckและrouteexport
- **Acceptance criteria:** routeเป็นcomposition, UIไม่ถือDBschema และside effectsหลักทดสอบได้โดยไม่renderทั้งหน้า
- **แผนดำเนินการ:** Phase 3, Task SC-39

## SC-40 — มีstarterและprototypeที่ไม่reachableจากroutes

- **Category / Severity:** Dead Code / Cleanup / LOW
- **สถานะหลักฐาน:** CONFIRMED-STATIC
- **ตำแหน่ง:** [src/components/app-tabs.tsx:1](<C:/Users/balln/my-app/src/components/app-tabs.tsx:1>), [src/features/skin-analysis/ui/analysis-screen.tsx:1](<C:/Users/balln/my-app/src/features/skin-analysis/ui/analysis-screen.tsx:1>), [src/features/skin-analysis/application/scan-session-reducer.ts:21](<C:/Users/balln/my-app/src/features/skin-analysis/application/scan-session-reducer.ts:21>), [src/features/skin-profile/application/skin-profile-queries.ts:7](<C:/Users/balln/my-app/src/features/skin-profile/application/skin-profile-queries.ts:7>)
- **รายละเอียดและหลักฐาน:** AST import/export/literalrequire/dynamicimportและplatformvariantsพบ25ไฟล์ไม่reachableจากrouteรวมfixture/css; benchmark2ไฟล์+fixtureถูกใช้โดยCLI/testsจึงไม่ใช่dead; reducerใช้เฉพาะtest ไม่ใช่scanจริง; skinProfileQueryไม่ถูกเรียกแต่keyถูกใช้
- **ผลกระทบ:** ทำให้เข้าใจผิดว่าmockscoreหรือreducerเป็นproduction path; มีmaintenance/testที่ไม่คุ้ม
- **สาเหตุ:** Starter/prototypeและnewflowคงอยู่พร้อมกัน
- **แนวทางแก้ไข:** แยกconfirmedunusedstarter/oldanalysisออก; เก็บbenchmarktools; domainfuturetypesจะเก็บต้องระบุowner; ลบreducerหรือเชื่อมจริงตามdesign ไม่เพียงเพื่อลดไฟล์
- **Dependencies / ส่วนที่กระทบ:** SC-39, SC-42; FILE_DEPENDENCY_MAP มีรายการครบ
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ค้นreferenceรวมscripts/docs/dynamic/platform/configก่อนลบ; buildalltargetsและtest
- **Acceptance criteria:** ไม่มีunusedprototypeที่ถูกเข้าใจว่าเป็นruntime และไม่ลบtoolที่มีentrypointนอกapp
- **แผนดำเนินการ:** Phase 5, Task SC-40

## SC-41 — เอกสารหลายช่วงเวลาและGitยังไม่มีtracked baseline

- **Category / Severity:** Documentation / Repository / LOW
- **สถานะหลักฐาน:** CONFIRMED
- **ตำแหน่ง:** [README.md:1](<C:/Users/balln/my-app/README.md:1>), [docs/testing.md:1](<C:/Users/balln/my-app/docs/testing.md:1>), [docs/audit-2026-10-14.md:1](<C:/Users/balln/my-app/docs/audit-2026-10-14.md:1>), [scripts/reset-project.js:1](<C:/Users/balln/my-app/scripts/reset-project.js:1>), [.gitignore:1](<C:/Users/balln/my-app/.gitignore:1>)
- **รายละเอียดและหลักฐาน:** READMEยังExpo templateและมีreset-projectที่ย้าย/ลบsrc/scripts; auditเก่ากล่าวmockและผลทดสอบของเวลานั้น; git ls-files=0 และstatusไฟล์หลักuntracked; .gradle-build/.ideaไม่ถูกignore
- **ผลกระทบ:** เสี่ยงทำตามคำสั่งเก่าหรือcommitcache; ไม่มีdiffbaselineสำหรับตรวจการเปลี่ยนแปลง
- **สาเหตุ:** เอกสารhistoricalไม่ได้แยกcurrentstatusและยังไม่ตั้งrepositorybaseline
- **แนวทางแก้ไข:** ทำREADME/setup/runbookปัจจุบัน, labelhistoricaldocs, เอาคำสั่งresetออกจากdeveloperhappy path, ตรวจignoreแล้วสร้างbaselineด้วยการreviewไฟล์
- **Dependencies / ส่วนที่กระทบ:** SC-02, SC-39; ห้ามgitaddallโดยไม่ตรวจsecret/buildassets
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ทำfreshcheckoutตามREADME; ตรวจtrackedinventoryและsecret scan; ไม่รันreset-project
- **Acceptance criteria:** คนใหม่เริ่มงานได้และรู้ฟีเจอร์จริง/แผน; baselineไม่รวมcache/secrets/ภาพผู้เข้าร่วม
- **แผนดำเนินการ:** Phase 5, Task SC-41

## SC-42 — เทสต์ปัจจุบันยังไม่พิสูจน์critical flowsและRLSจริง

- **Category / Severity:** QA / Release Gates / HIGH
- **สถานะหลักฐาน:** CONFIRMED-GAP
- **ตำแหน่ง:** [src/features/settings/data/supabase-settings-repository.test.ts:1](<C:/Users/balln/my-app/src/features/settings/data/supabase-settings-repository.test.ts:1>), [src/features/skin-analysis/application/scan-session-reducer.test.ts:1](<C:/Users/balln/my-app/src/features/skin-analysis/application/scan-session-reducer.test.ts:1>), [src/features/settings/ui/settings-screen.test.tsx:21](<C:/Users/balln/my-app/src/features/settings/ui/settings-screen.test.tsx:21>), [docs/requirements.md:71](<C:/Users/balln/my-app/docs/requirements.md:71>)
- **รายละเอียดและหลักฐาน:** settingsrepository.testทดสอบdomainmappingเท่านั้น; reducerที่testไม่ใช้ในscanจริง; repositoriesส่วนใหญ่mockSupabase; ไม่มีtwo-accountRLS tests/จริงauth-onboarding/deviceE2Eในsuiteที่รัน
- **ผลกระทบ:** 56passingtestsไม่ตรวจschemaขาดหรือproductionflowหลัก; ยังรับรองreleaseไม่ได้
- **สาเหตุ:** Test coverageเน้นhelpers/mocksและlegacyimplementation
- **แนวทางแก้ไข:** เพิ่มstagingintegrationสำหรับschema/RLS/consent/deletionและscreenflowsที่เสี่ยง; ทำAndroid/iOSrealdeviceและwebdeep-linkchecks พร้อมnegativecases
- **Dependencies / ส่วนที่กระทบ:** SC-01–SC-03 และcriticalfixes; fixtureaccounts/isolatedDB
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** guest→detail→auth→onboarding→favorites→settings→export/delete; A/B/anon RLS; deniedcamera/notifications; slow/offline/sessionchange
- **Acceptance criteria:** criticaljourneysและaccessmatrixผ่านด้วยหลักฐานวันที่/build/อุปกรณ์; CIexit0
- **แผนดำเนินการ:** Phase 6, Task SC-42

## SC-43 — Assetหลักใหญ่กว่าขนาดแสดงผลและwebentry2.1MB

- **Category / Severity:** Performance / Assets / MEDIUM
- **สถานะหลักฐาน:** MEASURED-SIZE
- **ตำแหน่ง:** [src/features/products/ui/product-image-sources.ts:2](<C:/Users/balln/my-app/src/features/products/ui/product-image-sources.ts:2>), [src/features/products/ui/home-screen.tsx:96](<C:/Users/balln/my-app/src/features/products/ui/home-screen.tsx:96>), [assets/products/anua-heartleaf-serum-generated.png](<C:/Users/balln/my-app/assets/products/anua-heartleaf-serum-generated.png>)
- **รายละเอียดและหลักฐาน:** assetAnua1,212,310bytes ที่แสดงcardประมาณ54–92px; wordmark878,966bytes; webexportentry2.1MB(uncompressed toolreport); ยังไม่ได้วัดstartup/FPS/memory
- **ผลกระทบ:** เป็นcostด้านdownload/decode/bundleที่ควรbenchmark โดยเฉพาะwebและมือถือจำกัดทรัพยากร
- **สาเหตุ:** ใช้ภาพความละเอียดสูงร่วมทุกขนาดและยังไม่มีasset/bundlebudget
- **แนวทางแก้ไข:** หลังยืนยันSKUทำresponsive/resizedassetsและformatที่รองรับพร้อมvisualcomparison; วัดcoldstart/network/decodeก่อนหลัง; เก็บunusedassetsตามการอ้างอิงจริง
- **Dependencies / ส่วนที่กระทบ:** SC-30, SC-40; ห้ามอ้างเปอร์เซ็นต์เร็วขึ้นโดยไม่มีbenchmark
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** วัดขนาดbundle/transferและเวลาโหลดบนเครื่อง/เครือข่ายเดิม; visualQAรายละเอียด/โปร่งใส
- **Acceptance criteria:** assetเหมาะresolutionจริง ภาพไม่เสีย และมีbaseline/budgetที่ตรวจซ้ำได้
- **แผนดำเนินการ:** Phase 4, Task SC-43

## SC-44 — Inferenceสองรอบต่อภาพและglobal lockรวมช่วงupload

- **Category / Severity:** Performance / AI Backend / MEDIUM
- **สถานะหลักฐาน:** RISK
- **ตำแหน่ง:** [scripts/skin_ai/serve_local_scan.py:31](<C:/Users/balln/my-app/scripts/skin_ai/serve_local_scan.py:31>), [scripts/skin_ai/run_experiment.py:74](<C:/Users/balln/my-app/scripts/skin_ai/run_experiment.py:74>), [scripts/skin_ai/serve_https_scan.py:132](<C:/Users/balln/my-app/scripts/skin_ai/serve_https_scan.py:132>)
- **รายละเอียดและหลักฐาน:** research_resultวน2findings→score_image→model(**inputs)สองครั้ง; HTTPSglobal lockครอบstreambodyและinference; limitconcurrency8 และcooldown5secเป็นprocesslocal
- **ผลกระทบ:** งานช้า/ค้างหนึ่งงานบล็อกtesterอื่น; clientabortไม่รับรองหยุดworker; ไม่มีbenchmarkยืนยันlatencyขณะนี้
- **สาเหตุ:** Pilotออกแบบsingleworkerและไม่ได้cachetextfeatures/batchpromptsหรือdeadlineinference
- **แนวทางแก้ไข:** วัดinference/queue/uploadแยกก่อน; พิจารณาbatchprompts/cachefeaturesด้วยnumericalequivalence; boundedworkerqueue/deadlineสำหรับproduction; อย่าเพิ่มworkersโดยไม่วัดRAM
- **Dependencies / ส่วนที่กระทบ:** SC-24, SC-25; compute budget
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** synthetic/nonpersonalimagesวัดp50/p95/RAMและconcurrent2–8requestในlocal; slowupload/hungworker/cancel
- **Acceptance criteria:** ระบบreject/loadsheddingได้และไม่มีqueueค้างไม่จำกัด; ผลmodelไม่เปลี่ยนโดยไม่มีevaluation
- **แผนดำเนินการ:** Phase 4, Task SC-44

## SC-45 — Searchไม่มีindexเฉพาะและมีFKadvisoryที่ต้องตรวจquery plan

- **Category / Severity:** Performance / Database / LOW
- **สถานะหลักฐาน:** RISK-AT-SCALE
- **ตำแหน่ง:** [src/features/products/data/supabase-product-repository.ts:21](<C:/Users/balln/my-app/src/features/products/data/supabase-product-repository.ts:21>), [supabase/migrations/20260821124014_add_product_search_text.sql:1](<C:/Users/balln/my-app/supabase/migrations/20260821124014_add_product_search_text.sql:1>), [supabase/migrations/20261103181044_create_skin_scan_foundation.sql:24](<C:/Users/balln/my-app/supabase/migrations/20261103181044_create_skin_scan_foundation.sql:24>), [supabase/migrations/20261103181856_scan_consent_sessions.sql:24](<C:/Users/balln/my-app/supabase/migrations/20261103181856_scan_consent_sessions.sql:24>)
- **รายละเอียดและหลักฐาน:** ilike %term%+count exact; ไม่มีtrigramindexในmigrations; advisorระบุcompositeFKสองชุดไม่มีcoveringindex และunusedindex5รายการ; scan_idมีuniqueindexอยู่แล้ว
- **ผลกระทบ:** เมื่อข้อมูลมาก search/countหรือFKdeleteอาจแพง; ตอน8สินค้าไม่มีหลักฐานเป็นbottleneck
- **สาเหตุ:** ยังไม่มีrepresentativedata/queryplan; advisorไม่พิจารณาความเหมาะสมทั้งหมดแทนเรา
- **แนวทางแก้ไข:** ทำEXPLAINในstagingที่มีrepresentativedataก่อนเลือกtrigram/FTS/index; ตรวจuniqueindexเดิมก่อนเพิ่มcomposite; ไม่ลบunusedindexเพราะtrafficน้อย
- **Dependencies / ส่วนที่กระทบ:** SC-27; https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** วัดplans/rows/latencyของsearch/count/ownerhistory/deleteก่อนหลังและstoragecost
- **Acceptance criteria:** เพิ่มเฉพาะindexที่แก้queryจริงพร้อมหลักฐาน และไม่ทำwritecostโตโดยไร้ประโยชน์
- **แผนดำเนินการ:** Phase 4, Task SC-45

## SC-46 — FavoritesโหลดIDทั้งหมดและส่งINขนาดไม่จำกัด

- **Category / Severity:** Performance / Favorites / LOW
- **สถานะหลักฐาน:** RISK-AT-SCALE
- **ตำแหน่ง:** [src/features/favorites/data/supabase-favorites-repository.ts:7](<C:/Users/balln/my-app/src/features/favorites/data/supabase-favorites-repository.ts:7>), [src/features/products/data/supabase-product-repository.ts:41](<C:/Users/balln/my-app/src/features/products/data/supabase-product-repository.ts:41>), [src/features/favorites/ui/favorites-screen.tsx:26](<C:/Users/balln/my-app/src/features/favorites/ui/favorites-screen.tsx:26>)
- **รายละเอียดและหลักฐาน:** ไม่มีpaginationในfavoriteIDs และgetSummariesByIdsส่งIDทั้งหมดในquery; แต่ละcardobservefavoritesarrayร่วมกัน ไม่ใช่N+1requestโดยอัตโนมัติเพราะReactQuerydedup
- **ผลกระทบ:** เมื่อfavoriteมากอาจชนrow/URLlimitsหรือใช้payload/cacheมาก; countกับสินค้าที่activeอาจไม่ตรง
- **สาเหตุ:** ใช้two-stepfetchสำหรับcatalogขนาดเล็ก
- **แนวทางแก้ไข:** ใช้owner-scopedjoin/pagedfavoritequeryหรือchunkที่มีlimitและstableorder; กำหนดกรณีinactiveproduct; วัดก่อนoptimizeper-cardselectors
- **Dependencies / ส่วนที่กระทบ:** SC-14, SC-27; Supabase project row limits
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** fixtureมากกว่าหนึ่งpage, inactiveSKU, ลบระหว่างloadpageและaccountswitch
- **Acceptance criteria:** โหลดครบโดยไม่เกิดURL/rowtruncationและcountนิยามชัดเจน
- **แผนดำเนินการ:** Phase 4, Task SC-46

## SC-47 — ไม่พบระบบแพทย์ ผู้เชี่ยวชาญ หรือวิดีโอคอล

- **Category / Severity:** Scope / Doctor / Video Call / INFO
- **สถานะหลักฐาน:** NOT-IMPLEMENTED-OUTSIDE-MVP
- **ตำแหน่ง:** [docs/requirements.md:61](<C:/Users/balln/my-app/docs/requirements.md:61>), [src/app/(tabs)/_layout.tsx:13](<C:/Users/balln/my-app/src/app/(tabs)/_layout.tsx:13>)
- **รายละเอียดและหลักฐาน:** ตรวจroutes/importgraph/source/schemaแล้วไม่มีclinician/booking/call/signalingimplementation; requirementsจัดclinicianportalนอกMVP
- **ผลกระทบ:** ไม่ควรนับว่าauditผ่านระบบเหล่านี้หรือถือเป็นบั๊กในscopeที่ตกลง
- **สาเหตุ:** เป็นfeatureที่ยังไม่มีและไม่อยู่MVPปัจจุบัน
- **แนวทางแก้ไข:** บันทึกสถานะในscope matrix; หากจะเพิ่มต้องทำrequirements/authorization/provider/privacydesignเป็นงานใหม่ก่อน
- **Dependencies / ส่วนที่กระทบ:** เจ้าของผลิตภัณฑ์ต้องกำหนดscope; ไม่เพิ่มSDK/หน้าจอในรอบนี้
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** ตรวจscopeapprovalและroute/schemainventoryเมื่อตัดสินใจเพิ่ม
- **Acceptance criteria:** รายงานและreleaseclaimsไม่กล่าวว่ารองรับdoctor/video callจนมีimplementationและtest
- **แผนดำเนินการ:** Phase 3, Task SC-47

## SC-48 — Release configuration และplatform verificationยังไม่ครบ

- **Category / Severity:** Release / Platform Configuration / MEDIUM
- **สถานะหลักฐาน:** CONFIRMED-GAP
- **ตำแหน่ง:** [app.json:11](<C:/Users/balln/my-app/app.json:11>), [app.json:15](<C:/Users/balln/my-app/app.json:15>), [app.json:29](<C:/Users/balln/my-app/app.json:29>), [src/app/(tabs)/_layout.tsx:19](<C:/Users/balln/my-app/src/app/(tabs)/_layout.tsx:19>)
- **รายละเอียดและหลักฐาน:** ไม่มีiOSbundleIdentifierในapp.json; iOSiconชี้assets/expo.iconที่เป็นExpo symbol; Androidpackageยังcom.justtttlll.myapp; ไม่มีEAS/releaseCIconfigในinventory; tabdetachInactiveScreens=falseเป็นworkaroundที่เพิ่มretainedviews
- **ผลกระทบ:** ยังยืนยันinstall/storeidentity/nativebehaviorไม่ได้; settings/insets/keyboard/Fabricต้องทดสอบจริง
- **สาเหตุ:** โปรเจกต์ยังเป็นdevelopmentและมีplatform-specific behavior
- **แนวทางแก้ไข:** กำหนดreleaseidentity/signing/environments/hostingfallback/deeplinksและnative smoke matrix; ตรวจworkaroundจากnativeevidenceก่อนเปลี่ยน; SDKcheckofflineผ่านไม่เท่ากับreleaseapproval
- **Dependencies / ส่วนที่กระทบ:** SC-02, SC-04, SC-07, SC-42; releaseowner
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** releaseAndroid/iOSบนdevice: keyboard/insets/fontscale/tabtransition/camera/notification/link; webreloaddynamicroutes
- **Acceptance criteria:** buildที่ระบุversionทำcriticalflowsได้จริงและใช้identity/assets/configที่เจ้าของยืนยัน
- **แผนดำเนินการ:** Phase 6, Task SC-48

## SC-49 — Onboarding requirement ถูกตรวจเฉพาะท้ายlogin

- **Category / Severity:** Onboarding / Cross-feature Flow / MEDIUM
- **สถานะหลักฐาน:** CONFIRMED-GAP
- **ตำแหน่ง:** [src/features/auth/ui/auth-screen.tsx:138](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:138>), [src/features/auth/ui/auth-session-provider.tsx:22](<C:/Users/balln/my-app/src/features/auth/ui/auth-session-provider.tsx:22>), [src/features/profile/ui/profile-screen.tsx:61](<C:/Users/balln/my-app/src/features/profile/ui/profile-screen.tsx:61>), [src/features/skin-analysis/ui/scan-flow-screen.tsx:66](<C:/Users/balln/my-app/src/features/skin-analysis/ui/scan-flow-screen.tsx:66>)
- **รายละเอียดและหลักฐาน:** finishAuthตรวจonboardingCompletedAt แต่ restoredsession/protectedroutesตรวจเพียงsession; HTTPSpilotstartไม่ตรวจskinprofile; skinProfileQueryไม่มีconsumer
- **ผลกระทบ:** sessionเดิมที่ยังไม่ผ่านonboardingอาจไปprotectedfeatureโดยไม่ผ่านข้อมูลเริ่มต้น; ไม่ใช่RLSbypassและpilotอาจตั้งใจแยก
- **สาเหตุ:** ไม่มีpolicyกลางว่าfeatureใดต้องมีsession/profile/consentระดับใด
- **แนวทางแก้ไข:** กำหนดfeatureaccessrequirementsและcentralgateที่คงreturnintent; แยกpilotข้อยกเว้นที่ตั้งใจออกจากproductionjourneyอย่างชัดเจน
- **Dependencies / ส่วนที่กระทบ:** SC-01, SC-07, SC-10, SC-24
- **วิธีตรวจซ้ำ/ทดสอบหลังแก้:** restore/incompleteprofile/deeplink/notification→protectedfeature; verifiedcompletedprofileไม่ถูกถามซ้ำ
- **Acceptance criteria:** ทุกentrypointบังคับเงื่อนไขเดียวกันตามpolicyและไม่ทำให้guestcatalogต้องlogin
- **แผนดำเนินการ:** Phase 2, Task SC-49

