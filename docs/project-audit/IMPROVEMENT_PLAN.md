# SkinCycle Improvement Plan

วันที่ 2026-11-04 • แผนสำหรับขั้นตอนถัดไป ไม่มีการแก้ Source Code, UI หรือฐานข้อมูลใน audit นี้

เริ่มจาก SC-02 → SC-01 และทำ SC-03/SC-04 ควบคู่เมื่อเริ่ม implementation ได้ จากนั้นแก้ identity/cleanup/consent ก่อนเชื่อมฟีเจอร์ใหม่ งาน UI ให้รักษารูปแบบหลักเดิมและทบทวนเฉพาะพฤติกรรมที่ต้องเปลี่ยน ไม่ควร rewrite แอปทั้งหมด

## กติกาการนำแผนไปทำ

1. เก็บ baseline ของโค้ดปัจจุบันและหลักฐานผลทดสอบก่อนแก้ ใช้ staging/disposable database สำหรับ migration และข้อมูลจำลองสำหรับ scan
2. งาน backend ต้องทดสอบ fresh install และ upgrade รวม grants/RLS/RPC ไม่ใช้จำนวน migration เป็นหลักฐานเดียว
3. ทุก Task ด้านล่างผูกกับ Issue ID เดียวกัน อ่านสถานะหลักฐานใน ISSUE_TRACKER ก่อนแก้ ความเสี่ยงให้สร้าง reproduction ก่อนเลือกวิธีแก้
4. งาน schema/consent/retention/provider/release ต้องมีข้อมูลการตัดสินใจที่ตรวจได้ก่อนเปิดใช้ ไม่เปิด active consent หรือ upload policy เพียงเพื่อให้หน้าจอผ่าน
5. ไม่ใช้ mock success, fake score หรือข้าม error เพื่อทำให้ acceptance ผ่าน; ห้ามเปลี่ยน UI/UX ในขั้น audit นี้
6. ลำดับ Phase เป็นลำดับส่งมอบหลัก แต่เขียน regression test พร้อม bug fix และทำ security review ทุก Phase ไม่รอ Phase 6

## Decisions ที่ต้องมีเมื่อเริ่มงานที่เกี่ยวข้อง

| Decision | งานที่ใช้ | ผลต่อทางเลือก |
|---|---|---|
| Release platforms / Apple login | SC-06, SC-07, SC-48 | กำหนด provider, callback และอุปกรณ์ที่ต้องทดสอบ |
| Skin profile/terms/consent lifecycle | SC-09–SC-11, SC-22, SC-49 | กำหนด version, withdrawal และ feature gating |
| AI research-only หรือ production; provider/retention | SC-24–SC-26, SC-38, SC-44 | กำหนด API boundary, durable jobs และการลบภาพ |
| ผู้รับผิดชอบ safety rules และ verified catalog | SC-23, SC-28, SC-29 | ป้องกันสร้าง recommendation จากข้อมูลตัวอย่าง |
| THB-only หรือหลายสกุลเงิน | SC-27, SC-35 | กำหนด schema, sort และรูปแบบราคา |
| Doctor/video call | SC-47 | ปัจจุบันนอก MVP; ต้องแยกขอบเขตงานใหม่ |

ไม่ต้องรอ decision เหล่านี้เพื่อแก้ Jest, migration history, race conditions หรือเพิ่มการทดสอบที่ไม่ขึ้นกับผลิตภัณฑ์

## Phase 1: Critical Bugs & Security

ไม่พบ CRITICAL ที่ยืนยันได้ ชื่อ Phase ใช้ตามรูปแบบที่ร้องขอ; งาน HIGH และ security/privacy risk ที่ต้องแก้ก่อนเปิดใช้จัดอยู่ในช่วงนี้

### Task SC-01 — ฐานข้อมูลที่แอปใช้ยังขาดระบบหลัก

- **สิ่งที่ต้องแก้ไข:** ฐานข้อมูลที่แอปใช้ยังขาดระบบหลัก (HIGH; CONFIRMED)
- **เหตุผล:** เข้าสู่ระบบสำเร็จแต่ finishAuth โหลดโปรไฟล์ผิวไม่ได้; onboarding/favorites/support/export/delete ทำงานไม่ครบ
- **วิธีดำเนินการ:** ทำ schema reconciliation ในฐานข้อมูลทดสอบก่อน; ตรวจ dependency ของ migration ที่ขาดและ migration export v2/revoke grants ที่มีอยู่แล้ว; deploy เป็นชุดหลังผ่านการทดสอบ
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/auth/ui/auth-screen.tsx:138](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:138>), [src/features/skin-profile/data/supabase-skin-profile-repository.ts:24](<C:/Users/balln/my-app/src/features/skin-profile/data/supabase-skin-profile-repository.ts:24>), [src/features/favorites/data/supabase-favorites-repository.ts:6](<C:/Users/balln/my-app/src/features/favorites/data/supabase-favorites-repository.ts:6>), [src/features/settings/data/account-repository.ts:38](<C:/Users/balln/my-app/src/features/settings/data/account-repository.ts:38>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบ auth/session, permissions หรือ pipeline ที่หลายฟีเจอร์ใช้ร่วมกัน; ทำเป็นชุดเล็กพร้อม rollback artifact และห้ามลด validation เพื่อให้ผ่าน
- **Dependencies:** SC-02; Supabase staging; ห้าม apply migration ในรอบ audit
- **วิธีทดสอบหลังแก้:** ทดสอบ fresh install และ upgrade บน disposable database แล้วทำ login→onboarding→favorite→export→delete ด้วยบัญชีทดสอบ
- **Acceptance criteria:** ทุก table/RPC ที่ client ต้องใช้มีอยู่และ owner isolation ผ่าน; login ไม่รายงาน auth ล้มเหลวเพราะ schema หาย
### Task SC-02 — เลขเวอร์ชัน migration local และ remote ไม่ตรงกัน

- **สิ่งที่ต้องแก้ไข:** เลขเวอร์ชัน migration local และ remote ไม่ตรงกัน (HIGH; CONFIRMED)
- **เหตุผล:** การ push ตรง ๆ อาจพยายามสร้าง table/index/column เดิมซ้ำหรือจัดลำดับผิด
- **วิธีดำเนินการ:** เทียบ SQL definitions กับ remote ทีละ object แล้วกำหนด migration baseline/repair history ที่ตรวจสอบได้; ห้ามเดาว่าชื่อเหมือนกันแปลว่า SQL เหมือนกัน
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:1](<C:/Users/balln/my-app/supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:1>), [supabase/migrations/20260821123326_add_products_brand_index.sql:1](<C:/Users/balln/my-app/supabase/migrations/20260821123326_add_products_brand_index.sql:1>), [supabase/migrations/20260821124014_add_product_search_text.sql:1](<C:/Users/balln/my-app/supabase/migrations/20260821124014_add_product_search_text.sql:1>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบ auth/session, permissions หรือ pipeline ที่หลายฟีเจอร์ใช้ร่วมกัน; ทำเป็นชุดเล็กพร้อม rollback artifact และห้ามลด validation เพื่อให้ผ่าน
- **Dependencies:** ฐานข้อมูลสำรองและ staging; SC-01
- **วิธีทดสอบหลังแก้:** Replay จากฐานเปล่าและ upgrade จากสำเนา schema ปัจจุบัน; เปรียบเทียบ grants/policies/functions
- **Acceptance criteria:** ไม่เกิด duplicate object; migration history ตรงกัน และผล schema สองเส้นทางเท่ากัน
### Task SC-03 — Jest ผ่าน assertions แต่ process exit 1

- **สิ่งที่ต้องแก้ไข:** Jest ผ่าน assertions แต่ process exit 1 (HIGH; CONFIRMED)
- **เหตุผล:** Pipeline ยังถือว่าล้มเหลวและอาจกลบ async teardown regression อื่น
- **วิธีดำเนินการ:** แยก suite/import ที่กระตุ้น lazy fetch; แก้ test setup/mocks หรือ Expo/Jest patch ที่ตรง SDK57; อย่าปิด console warning หรือ forceExit เพื่อทำให้ผ่าน
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [package.json:62](<C:/Users/balln/my-app/package.json:62>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบ auth/session, permissions หรือ pipeline ที่หลายฟีเจอร์ใช้ร่วมกัน; ทำเป็นชุดเล็กพร้อม rollback artifact และห้ามลด validation เพื่อให้ผ่าน
- **Dependencies:** SC-04; Jest/Expo test environment
- **วิธีทดสอบหลังแก้:** รัน full suite ใน process ใหม่ พร้อมตรวจ late log/open handles
- **Acceptance criteria:** 56 เทสต์เดิมและ regression ที่เกี่ยวข้องผ่าน โดย exit 0 และไม่มี late native-module log
### Task SC-04 — Dependency audit มี advisory ที่ต้องประเมินและแก้

- **สิ่งที่ต้องแก้ไข:** Dependency audit มี advisory ที่ต้องประเมินและแก้ (HIGH; CONFIRMED-SCAN)
- **เหตุผล:** มีความเสี่ยงตามเส้นทางใช้งานจริง เช่น parser/CLI/deep-link; ยังไม่พิสูจน์ exploit ใน SkinCycle
- **วิธีดำเนินการ:** ทำ dependency reachability triage แยก mobile/web/build/test; อัปเดตแบบรองรับ SDK57 และบันทึกเหตุผลสำหรับรายการที่ยังแก้ไม่ได้; ไม่ใช้ audit fix --force อัตโนมัติ
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [package.json:6](<C:/Users/balln/my-app/package.json:6>), [package-lock.json:1](<C:/Users/balln/my-app/package-lock.json:1>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบ auth/session, permissions หรือ pipeline ที่หลายฟีเจอร์ใช้ร่วมกัน; ทำเป็นชุดเล็กพร้อม rollback artifact และห้ามลด validation เพื่อให้ผ่าน
- **Dependencies:** SC-03; Expo compatibility; ดู advisory appendix ใน AUDIT_REPORT
- **วิธีทดสอบหลังแก้:** รัน npm audit ใหม่, typecheck/lint/tests, web export และ native regression หลังอัปเดตทีละชุด
- **Acceptance criteria:** ไม่มี advisory ที่เข้าถึงได้จากเส้นทางสำคัญค้างโดยไม่มี mitigation/เจ้าของ/เหตุผล; ไม่มี SDK regression
### Task SC-11 — Consent profile อาจเปลี่ยนข้อความหลังยอมรับหรือคง accepted ข้ามเวอร์ชัน

- **สิ่งที่ต้องแก้ไข:** Consent profile อาจเปลี่ยนข้อความหลังยอมรับหรือคง accepted ข้ามเวอร์ชัน (MEDIUM; RISK)
- **เหตุผล:** Receipt อาจไม่สะท้อนข้อความเดิมหรือส่ง version ใหม่จากการยอมรับ state เก่า
- **วิธีดำเนินการ:** ทำ published consent immutable หรือเก็บ content hash/snapshot; reset acknowledgement ตาม version และบังคับ current version ใน RPC
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [supabase/migrations/20261029110000_create_skin_profiles.sql:13](<C:/Users/balln/my-app/supabase/migrations/20261029110000_create_skin_profiles.sql:13>), [src/features/skin-profile/ui/skin-onboarding-screen.tsx:51](<C:/Users/balln/my-app/src/features/skin-profile/ui/skin-onboarding-screen.tsx:51>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบ auth/session, permissions หรือ pipeline ที่หลายฟีเจอร์ใช้ร่วมกัน; ทำเป็นชุดเล็กพร้อม rollback artifact และห้ามลด validation เพื่อให้ผ่าน
- **Dependencies:** SC-01, SC-09; scan consent design ที่มีอยู่
- **วิธีทดสอบหลังแก้:** ทดสอบ refresh version ระหว่างกรอก; แก้ข้อความเวอร์ชันที่ publish แล้ว; retry receipt
- **Acceptance criteria:** ส่งได้เฉพาะเวอร์ชันที่ผู้ใช้ยอมรับจริงและข้อความย้อนหลังไม่เปลี่ยน
### Task SC-13 — Settings response เก่าเปลี่ยน ref และแจ้งเตือนของบัญชีใหม่ได้

- **สิ่งที่ต้องแก้ไข:** Settings response เก่าเปลี่ยน ref และแจ้งเตือนของบัญชีใหม่ได้ (HIGH; RISK)
- **เหตุผล:** การแจ้งเตือนและ state ของผู้ใช้ใหม่อาจถูกแทนที่ด้วยผลของผู้ใช้เดิม
- **วิธีดำเนินการ:** ผูก operation กับ owner/generation และตรวจหลังทุก await ก่อน ref/cache/schedule/rollback; แยก compensating save ให้ไม่แตะ session ใหม่
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/app/settings.tsx:88](<C:/Users/balln/my-app/src/app/settings.tsx:88>), [src/app/settings.tsx:93](<C:/Users/balln/my-app/src/app/settings.tsx:93>), [src/app/settings.tsx:99](<C:/Users/balln/my-app/src/app/settings.tsx:99>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบ auth/session, permissions หรือ pipeline ที่หลายฟีเจอร์ใช้ร่วมกัน; ทำเป็นชุดเล็กพร้อม rollback artifact และห้ามลด validation เพื่อให้ผ่าน
- **Dependencies:** SC-16; local notification queue
- **วิธีทดสอบหลังแก้:** A save ค้าง→switch B→A success/failure; ทดสอบ permission dialog ค้างด้วย
- **Acceptance criteria:** ผลเก่าไม่เปลี่ยน UI/ref/schedule ของ B; rollback ไม่กลบ operation ใหม่
### Task SC-16 — ล้าง reminders/cache เฉพาะ manual sign-out บางทาง

- **สิ่งที่ต้องแก้ไข:** ล้าง reminders/cache เฉพาะ manual sign-out บางทาง (MEDIUM; CONFIRMED-GAP)
- **เหตุผล:** แจ้งเตือนของบัญชีเก่าอาจค้างหลังลบบัญชี/sessionหมด และ notification error ขัดขวาง logout
- **วิธีดำเนินการ:** ทำ session transition cleanup กลาง; invalidate generation/cancel queries/ล้าง private cache และ reminders สำหรับทุกเส้นทาง โดย logout ไม่ผูกความสำเร็จกับ notification API
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/auth/ui/auth-session-provider.tsx:33](<C:/Users/balln/my-app/src/features/auth/ui/auth-session-provider.tsx:33>), [src/app/settings.tsx:119](<C:/Users/balln/my-app/src/app/settings.tsx:119>), [src/features/settings/ui/settings-detail-screen.tsx:165](<C:/Users/balln/my-app/src/features/settings/ui/settings-detail-screen.tsx:165>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบ auth/session, permissions หรือ pipeline ที่หลายฟีเจอร์ใช้ร่วมกัน; ทำเป็นชุดเล็กพร้อม rollback artifact และห้ามลด validation เพื่อให้ผ่าน
- **Dependencies:** SC-13; account deletion staging
- **วิธีทดสอบหลังแก้:** manual signout, expired/revoked session, delete success, cancel API reject และ switch account
- **Acceptance criteria:** ทุกเส้นทางหมด session ล้าง state ที่เป็นของ user และไม่เหลือ reminder เก่า
### Task SC-22 — ข้อมูล privacy/export description ไม่ทันระบบที่มีอยู่

- **สิ่งที่ต้องแก้ไข:** ข้อมูล privacy/export description ไม่ทันระบบที่มีอยู่ (HIGH; CONFIRMED-GAP)
- **เหตุผล:** ผู้ใช้ไม่เห็นภาพข้อมูลที่ประมวลผลครบ; consent/preferences ถูกเข้าใจผิด และช่องทางจัดการข้อมูลไม่ครบ
- **วิธีดำเนินการ:** จัด data inventory ให้ตรงระบบจริงและ release mode; ระบุผู้รับภาพ retention/withdrawal/contact และ fields export v2; ให้เจ้าของ policy ตรวจเนื้อหาก่อนเผยแพร่
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/settings/application/settings-content.ts:23](<C:/Users/balln/my-app/src/features/settings/application/settings-content.ts:23>), [src/features/settings/ui/settings-detail-screen.tsx:158](<C:/Users/balln/my-app/src/features/settings/ui/settings-detail-screen.tsx:158>), [src/features/settings/ui/settings-detail-screen.tsx:175](<C:/Users/balln/my-app/src/features/settings/ui/settings-detail-screen.tsx:175>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบ auth/session, permissions หรือ pipeline ที่หลายฟีเจอร์ใช้ร่วมกัน; ทำเป็นชุดเล็กพร้อม rollback artifact และห้ามลด validation เพื่อให้ผ่าน
- **Dependencies:** SC-01, SC-09–SC-11, SC-24; ไม่ใช่ความเห็นทางกฎหมาย
- **วิธีทดสอบหลังแก้:** เทียบแต่ละ table/endpoint/field กับ privacy notice/export/delete behavior ด้วยข้อมูลทดสอบ
- **Acceptance criteria:** ข้อความและการทำงานตรงกันทุกข้อมูลที่เก็บหรือส่ง; contact/withdrawal มีขั้นตอนที่ทำได้
### Task SC-26 — ลบภาพใน finally ยังไม่ครอบคลุม process kill และ crash

- **สิ่งที่ต้องแก้ไข:** ลบภาพใน finally ยังไม่ครอบคลุม process kill และ crash (MEDIUM; RISK)
- **เหตุผล:** ภาพ/ไฟล์ข้อมูลอาจค้าง cache หลัง process ถูก OS kill หรือ delete fail; ไม่ยืนยันว่าเกิดขึ้นบนเครื่องในรอบนี้
- **วิธีดำเนินการ:** ใช้ directory/file ownership ที่จำกัด scope พร้อม startup/TTL cleanup และกำหนด retention; ห้ามล้าง cache ทั้งแอปแบบกว้าง
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/skin-analysis/ui/scan-flow-screen.tsx:126](<C:/Users/balln/my-app/src/features/skin-analysis/ui/scan-flow-screen.tsx:126>), [src/features/skin-analysis/ui/scan-flow-screen.tsx:143](<C:/Users/balln/my-app/src/features/skin-analysis/ui/scan-flow-screen.tsx:143>), [src/features/settings/application/share-account-export.ts:6](<C:/Users/balln/my-app/src/features/settings/application/share-account-export.ts:6>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบ auth/session, permissions หรือ pipeline ที่หลายฟีเจอร์ใช้ร่วมกัน; ทำเป็นชุดเล็กพร้อม rollback artifact และห้ามลด validation เพื่อให้ผ่าน
- **Dependencies:** SC-22, SC-24; Expo filesystem/camera behavior
- **วิธีทดสอบหลังแก้:** kill หลังถ่าย/ระหว่าง upload/export; เปิดแอปใหม่; inject delete failure แล้วตรวจเฉพาะไฟล์ของฟีเจอร์
- **Acceptance criteria:** ไม่มี orphan เกิน retention ที่กำหนดและ cleanup ไม่ลบไฟล์อื่น
### Task SC-33 — โหลดฟอนต์ล้มเหลวแล้ว root อาจว่างถาวร

- **สิ่งที่ต้องแก้ไข:** โหลดฟอนต์ล้มเหลวแล้ว root อาจว่างถาวร (MEDIUM; RISK)
- **เหตุผล:** หากassetโหลดเสีย/networkwebล้มเหลว แอปอาจไม่มีหน้าerrorหรือทางกลับ
- **วิธีดำเนินการ:** รับfont errorและใช้fallback font/error stateตามdesign; จัดsplash lifecycleให้ชัดเจน
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/app/_layout.tsx:25](<C:/Users/balln/my-app/src/app/_layout.tsx:25>), [src/app/_layout.tsx:32](<C:/Users/balln/my-app/src/app/_layout.tsx:32>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบ auth/session, permissions หรือ pipeline ที่หลายฟีเจอร์ใช้ร่วมกัน; ทำเป็นชุดเล็กพร้อม rollback artifact และห้ามลด validation เพื่อให้ผ่าน
- **Dependencies:** Root providers/navigation; Expo57 font API
- **วิธีทดสอบหลังแก้:** mock useFonts=[false,error] และช้า/สำเร็จ; ทดสอบcold web/native
- **Acceptance criteria:** แอปไม่ค้างหน้าว่างเมื่อfonterrorและโหลดปกติไม่กระพริบผิดพลาด
### Task SC-37 — Supabase leaked-password protection ยังปิด

- **สิ่งที่ต้องแก้ไข:** Supabase leaked-password protection ยังปิด (MEDIUM; CONFIRMED-CONFIG)
- **เหตุผล:** ไม่มีการปฏิเสธรหัสผ่านรั่วตามcapabilityนี้ในAuth
- **วิธีดำเนินการ:** ตรวจสิทธิ์แพ็กเกจ/configแล้วเปิดในสภาพแวดล้อมทดสอบ พร้อมจัดการweak_password errorให้ผู้ใช้เข้าใจ
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/core/supabase/client.ts:23](<C:/Users/balln/my-app/src/core/supabase/client.ts:23>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบ auth/session, permissions หรือ pipeline ที่หลายฟีเจอร์ใช้ร่วมกัน; ทำเป็นชุดเล็กพร้อม rollback artifact และห้ามลด validation เพื่อให้ผ่าน
- **Dependencies:** SC-08; https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- **วิธีทดสอบหลังแก้:** ใช้รหัสทดสอบตามprovider policyสำหรับsignup/update; ทดสอบerror mappingและบัญชีเดิม
- **Acceptance criteria:** Protectionเปิดและclientรับerrorได้ หรือมีข้อจำกัด/มาตรการทดแทนที่บันทึกชัดเจน
### Task SC-38 — RPCสร้างscanและsupport insertยังไม่มีquotaต่อผู้ใช้

- **สิ่งที่ต้องแก้ไข:** RPCสร้างscanและsupport insertยังไม่มีquotaต่อผู้ใช้ (MEDIUM; RISK-BEFORE-ENABLE)
- **เหตุผล:** หลังเปิดฟีเจอร์ authenticateduserอาจสร้างrecordจำนวนมาก ทำให้cost/availabilityเสีย
- **วิธีดำเนินการ:** เพิ่มper-userwindow/quotaและglobalbudgetในtrustedserver/transaction; ป้องกันRPCbypassถ้าenforceเฉพาะHTTPgateway
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [supabase/migrations/20261103181856_scan_consent_sessions.sql:71](<C:/Users/balln/my-app/supabase/migrations/20261103181856_scan_consent_sessions.sql:71>), [supabase/migrations/20260922090000_settings_account_flows.sql:18](<C:/Users/balln/my-app/supabase/migrations/20260922090000_settings_account_flows.sql:18>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบ auth/session, permissions หรือ pipeline ที่หลายฟีเจอร์ใช้ร่วมกัน; ทำเป็นชุดเล็กพร้อม rollback artifact และห้ามลด validation เพื่อให้ผ่าน
- **Dependencies:** SC-01, SC-24; advisor SECURITY DEFINER ต้องreviewแต่ไม่ใช่ช่องโหว่โดยตัวมันเอง
- **วิธีทดสอบหลังแก้:** stagingparallelnewUUID/reusedUUID, ownerA/B และlimitboundary; ไม่loadtestproduction
- **Acceptance criteria:** retryยังidempotentและการสร้างงานใหม่เกินquotaถูกปฏิเสธอย่างสม่ำเสมอ

## Phase 2: Core Logic & Data Flow

### Task SC-05 — ลืมรหัสผ่านยังไม่ส่งอีเมลหรือเปิด recovery flow

- **สิ่งที่ต้องแก้ไข:** ลืมรหัสผ่านยังไม่ส่งอีเมลหรือเปิด recovery flow (HIGH; CONFIRMED-GAP)
- **เหตุผล:** ผู้ใช้ที่ลืมรหัสผ่านกลับเข้าบัญชีผ่านแอปไม่ได้
- **วิธีดำเนินการ:** เพิ่ม request-reset และรับ recovery callback พร้อม validation, expired link และ rate-limit feedback โดยคงรูปแบบหน้าจอเดิม
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/auth/ui/auth-screen.tsx:397](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:397>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-01, SC-07; Supabase redirect allowlist/email config
- **วิธีทดสอบหลังแก้:** บัญชีทดสอบ: ส่งอีเมล→เปิดลิงก์ cold/warm→เปลี่ยนรหัส→เข้าสู่ระบบ; ทดสอบ expired/reused link
- **Acceptance criteria:** ผู้ใช้กู้บัญชีได้จริง; ไม่แสดง success ก่อน server ยอมรับคำขอ
### Task SC-06 — ปุ่ม Apple ไม่มี handler

- **สิ่งที่ต้องแก้ไข:** ปุ่ม Apple ไม่มี handler (MEDIUM; CONFIRMED-GAP)
- **เหตุผล:** ผู้ใช้แตะแล้วไม่มีการตอบสนอง
- **วิธีดำเนินการ:** ตัดสินใจรองรับ Apple ใน release นี้หรือแสดงสถานะ unavailable อย่างชัดเจน; ถ้ารองรับให้เพิ่ม flow/config/native capability
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/auth/ui/auth-screen.tsx:449](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:449>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-07, SC-48; provider credentials
- **วิธีทดสอบหลังแก้:** ทดสอบ success/cancel/provider unavailable บนแพลตฟอร์มที่รองรับ
- **Acceptance criteria:** ปุ่มทุกสถานะมีผลลัพธ์ชัดเจน และไม่ทำให้เข้าใจว่ารองรับทั้งที่ยังไม่ได้เชื่อม
### Task SC-07 — Callback เมื่อเปิดแอปใหม่และเปลี่ยนอีเมลบนเว็บยังไม่ครบ

- **สิ่งที่ต้องแก้ไข:** Callback เมื่อเปิดแอปใหม่และเปลี่ยนอีเมลบนเว็บยังไม่ครบ (MEDIUM; RISK)
- **เหตุผล:** กรณี browser เปิดแอปใหม่หรือ email change บนเว็บอาจไม่จบที่ session/หน้าเป้าหมาย
- **วิธีดำเนินการ:** รวม callback handling แบบ idempotent พร้อม platform-aware redirect และเก็บ return intent ที่ปลอดภัย; ตรวจ error/query/hash ตาม flow
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/auth/ui/auth-screen.tsx:177](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:177>), [src/core/supabase/client.ts:28](<C:/Users/balln/my-app/src/core/supabase/client.ts:28>), [src/features/settings/data/account-repository.ts:23](<C:/Users/balln/my-app/src/features/settings/data/account-repository.ts:23>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-05; Supabase redirect settings
- **วิธีทดสอบหลังแก้:** ทดสอบ Google/email-confirm/email-change/recovery ทั้ง cold/warm, cancel และ callback ซ้ำ; ห้ามใส่ token ลง log
- **Acceptance criteria:** แต่ละ callback ถูก consume ครั้งเดียวและกลับ destination ถูกต้องบนแพลตฟอร์มเป้าหมาย
### Task SC-08 — กฎ validation สมัครสมาชิกกับแก้ไขบัญชีไม่ตรงกัน

- **สิ่งที่ต้องแก้ไข:** กฎ validation สมัครสมาชิกกับแก้ไขบัญชีไม่ตรงกัน (MEDIUM; CONFIRMED)
- **เหตุผล:** ผู้ใช้เจอข้อผิดพลาดหลัง submit หรือชื่อที่แก้ไขได้กลับสมัครไม่ได้
- **วิธีดำเนินการ:** กำหนด policy เดียวและ reuse validators โดยคงการรองรับบัญชีเดิมตอน login; ให้ signup maxlength สอดคล้อง DB
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/auth/ui/auth-screen.tsx:213](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:213>), [src/features/auth/ui/auth-screen.tsx:221](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:221>), [src/features/settings/application/account-validation.ts:1](<C:/Users/balln/my-app/src/features/settings/application/account-validation.ts:1>), [supabase/migrations/20260821075706_create_user_profiles.sql:3](<C:/Users/balln/my-app/supabase/migrations/20260821075706_create_user_profiles.sql:3>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-05; Auth password policy
- **วิธีทดสอบหลังแก้:** ทดสอบชื่อ 80/81 ตัว O'Neil และรหัส6/7/8/128/129 ตัว แยก login กับ register
- **Acceptance criteria:** Validation สอดคล้อง server และไม่ล็อกผู้ใช้เดิมด้วยกฎ signup ใหม่
### Task SC-09 — Terms checkbox ไม่มีหลักฐานเวอร์ชันและ Google signup ข้ามเงื่อนไข

- **สิ่งที่ต้องแก้ไข:** Terms checkbox ไม่มีหลักฐานเวอร์ชันและ Google signup ข้ามเงื่อนไข (MEDIUM; CONFIRMED-GAP)
- **เหตุผล:** ไม่สามารถย้อนพิสูจน์ข้อความที่ยอมรับ และ flow ผู้ให้บริการต่างกัน
- **วิธีดำเนินการ:** กำหนด terms version และช่องทางอ่านก่อนยอมรับ; เก็บ acknowledgement ตามนโยบายที่เจ้าของผลิตภัณฑ์กำหนด แยกจาก consent รูป/ผิว
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/auth/ui/auth-screen.tsx:128](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:128>), [src/features/auth/ui/auth-screen.tsx:229](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:229>), [src/features/auth/ui/auth-screen.tsx:403](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:403>), [src/features/auth/ui/auth-screen.tsx:459](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:459>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-22; ไม่สรุปข้อกฎหมายจาก code audit
- **วิธีทดสอบหลังแก้:** ทดสอบ email/Google signup และ version เปลี่ยน; ตรวจ receipt โดยไม่ใช้ user_metadata เป็นสิทธิ์
- **Acceptance criteria:** ทุกช่องทางใช้เงื่อนไขเดียวกันและตรวจย้อนกลับได้ว่าผู้ใช้เห็นเวอร์ชันใด
### Task SC-10 — ไม่มี flow ดู/แก้ไขโปรไฟล์ผิวและถอน consent

- **สิ่งที่ต้องแก้ไข:** ไม่มี flow ดู/แก้ไขโปรไฟล์ผิวและถอน consent (MEDIUM; CONFIRMED-GAP)
- **เหตุผล:** ผู้ใช้ดูแล avoid list/budget/consent ของตนไม่ได้ตาม lifecycle
- **วิธีดำเนินการ:** เพิ่ม read/edit flow ที่ prefill ค่าจริงและกำหนดผลของการถอน consent; การแก้ไขต้องคง owner/version constraints
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/skin-profile/ui/skin-onboarding-screen.tsx:40](<C:/Users/balln/my-app/src/features/skin-profile/ui/skin-onboarding-screen.tsx:40>), [src/features/profile/ui/profile-screen.tsx:19](<C:/Users/balln/my-app/src/features/profile/ui/profile-screen.tsx:19>), [src/features/settings/application/settings-content.ts:1](<C:/Users/balln/my-app/src/features/settings/application/settings-content.ts:1>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-01, SC-11, SC-22
- **วิธีทดสอบหลังแก้:** บันทึก→เปิดใหม่→แก้บาง field→ถอน consent→ตรวจผลต่อคำแนะนำและ export
- **Acceptance criteria:** ค่าที่ไม่แก้ไม่หาย; ผู้ใช้ตรวจและจัดการข้อมูลผิวได้ตาม policy
### Task SC-12 — ผล onboarding กลับมาหลังเปลี่ยนบัญชีไม่มี owner guard

- **สิ่งที่ต้องแก้ไข:** ผล onboarding กลับมาหลังเปลี่ยนบัญชีไม่มี owner guard (MEDIUM; RISK)
- **เหตุผล:** ผลเก่าอาจเขียน cache หรือพา navigation ใน session ใหม่; ไม่ใช่หลักฐานว่า RLS ถูกข้าม
- **วิธีดำเนินการ:** Capture owner ตอน mutate, ตรวจ owner จากผล/current session ก่อน cache/navigation, reset draft ตาม identity
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/skin-profile/ui/skin-onboarding-screen.tsx:58](<C:/Users/balln/my-app/src/features/skin-profile/ui/skin-onboarding-screen.tsx:58>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-10; Auth session boundary
- **วิธีทดสอบหลังแก้:** ใช้ deferred mutation: A submit→เปลี่ยนเป็น B→response A; รวม unmount และ retry
- **Acceptance criteria:** ไม่มี profile/draft ของ A ปรากฏใน B และไม่ navigate จากคำขอเก่า
### Task SC-14 — Rollback รายการโปรดทั้งชุดอาจลบ optimistic update ของสินค้าอื่น

- **สิ่งที่ต้องแก้ไข:** Rollback รายการโปรดทั้งชุดอาจลบ optimistic update ของสินค้าอื่น (MEDIUM; RISK)
- **เหตุผล:** แตะ A/B ติดกันแล้ว A fail อาจทำให้ B หายชั่วคราวหรือถูก refetch กลบ
- **วิธีดำเนินการ:** Rollback เฉพาะ product ที่ operation นี้เปลี่ยน หรือใช้ mutation serialization/reconciliation ราย user; invalidation เมื่อไม่มี conflicting writes
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/favorites/application/use-product-favorite.ts:23](<C:/Users/balln/my-app/src/features/favorites/application/use-product-favorite.ts:23>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-01; query key owner isolation
- **วิธีทดสอบหลังแก้:** จำลอง A fail หลัง B optimistic/success ทั้งลำดับ response; เปิดสินค้าซ้ำสอง component
- **Acceptance criteria:** สถานะ B ไม่หายเพราะ A fail และ cache สุดท้ายตรง server
### Task SC-15 — กดหัวใจได้ก่อนโหลดสถานะเดิมสำเร็จ

- **สิ่งที่ต้องแก้ไข:** กดหัวใจได้ก่อนโหลดสถานะเดิมสำเร็จ (MEDIUM; CONFIRMED)
- **เหตุผล:** สินค้าที่ชอบอยู่แล้วอาจถูกสั่งเพิ่มซ้ำแทนลบ; โหลด favorites ล้มเหลวแต่ UI แสดงเหมือนไม่เคยบันทึก
- **วิธีดำเนินการ:** แยก unknown/loading/error จาก not-favorite; ปิด mutation หรือโหลดค่าปัจจุบันก่อน toggle และมี retry
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/favorites/application/use-product-favorite.ts:19](<C:/Users/balln/my-app/src/features/favorites/application/use-product-favorite.ts:19>), [src/features/favorites/application/use-product-favorite.ts:44](<C:/Users/balln/my-app/src/features/favorites/application/use-product-favorite.ts:44>), [src/features/products/ui/product-card.tsx:25](<C:/Users/balln/my-app/src/features/products/ui/product-card.tsx:25>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-01, SC-14
- **วิธีทดสอบหลังแก้:** หน่วง initial query แล้วแตะสินค้าที่ server มีอยู่; จำลอง query error
- **Acceptance criteria:** ไม่มี write จากสถานะที่ยังไม่ทราบและผู้ใช้เห็นความผิดพลาดที่แก้ไขได้
### Task SC-17 — ขอสิทธิ์ Android ก่อนสร้าง notification channel

- **สิ่งที่ต้องแก้ไข:** ขอสิทธิ์ Android ก่อนสร้าง notification channel (MEDIUM; RISK)
- **เหตุผล:** Fresh install อาจเปิดการแจ้งเตือนไม่ได้หรือพาไป settings โดยไม่มี prompt ตามคาด
- **วิธีดำเนินการ:** สร้าง channel ก่อน permission request บน Android แล้วตรวจ denied/canAskAgain; คง iOS provisional handling
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/settings/application/local-notifications.ts:91](<C:/Users/balln/my-app/src/features/settings/application/local-notifications.ts:91>), [src/features/settings/application/local-notifications.ts:129](<C:/Users/balln/my-app/src/features/settings/application/local-notifications.ts:129>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** Expo57 notifications docs; ยังไม่ได้ยืนยันบนเครื่องจริง
- **วิธีทดสอบหลังแก้:** Fresh install Android13+ ไม่มี channel→เปิด toggle; deny/retry/system grant; iOS regression
- **Acceptance criteria:** Prompt/ผล permission ถูกต้องและไม่เกิดวงจร denied เพราะยังไม่มี channel
### Task SC-18 — เตือนวิเคราะห์ซ้ำ 30 วันถูกเริ่มนับใหม่เมื่อเข้า settings

- **สิ่งที่ต้องแก้ไข:** เตือนวิเคราะห์ซ้ำ 30 วันถูกเริ่มนับใหม่เมื่อเข้า settings (MEDIUM; CONFIRMED)
- **เหตุผล:** เปิด settings ภายใน30วันซ้ำ ๆ ทำให้วันเตือนถูกเลื่อนออกไปเรื่อย ๆ
- **วิธีดำเนินการ:** ใช้วันที่ครบกำหนดคงที่จากข้อมูลจริง และ reconcile schedule identifiers โดยไม่ reset เมื่อค่าเดิม
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/app/settings.tsx:52](<C:/Users/balln/my-app/src/app/settings.tsx:52>), [src/features/settings/application/local-notifications.ts:73](<C:/Users/balln/my-app/src/features/settings/application/local-notifications.ts:73>), [src/features/settings/application/local-notifications.ts:135](<C:/Users/balln/my-app/src/features/settings/application/local-notifications.ts:135>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-20, SC-24; clock/timezone policy
- **วิธีทดสอบหลังแก้:** fake clock: ตั้งวัน0→เปิดsettingsวัน10/20→ตรวจ due date; เปลี่ยน toggle ที่ไม่เกี่ยวข้อง
- **Acceptance criteria:** การเปิดหน้าและบันทึก preference อื่นไม่เลื่อนวันเตือนเดิม
### Task SC-19 — อาจนำทางซ้ำจาก last notification response เดิม

- **สิ่งที่ต้องแก้ไข:** อาจนำทางซ้ำจาก last notification response เดิม (LOW; RISK)
- **เหตุผล:** re-mount/relaunch อาจพากลับ /analysis หรือ /routine โดยผู้ใช้ไม่ได้แตะใหม่
- **วิธีดำเนินการ:** ตรวจ request identifier/action และ consume หลัง navigation พร้อม ready/auth guard ที่เหมาะสม
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/settings/application/notification-navigation-observer.tsx:24](<C:/Users/balln/my-app/src/features/settings/application/notification-navigation-observer.tsx:24>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-16; Expo notifications lifecycle
- **วิธีทดสอบหลังแก้:** เปิดจาก notification แล้วเปิดแอปปกติอีกครั้ง; ส่ง last response และ listener id เดียวกัน
- **Acceptance criteria:** หนึ่ง response นำทางครั้งเดียวและ launch ปกติคงหน้าที่ควรเปิด
### Task SC-20 — ข้อความเตือนสัญญารูทีน/ผลวิเคราะห์ที่ยังไม่มี

- **สิ่งที่ต้องแก้ไข:** ข้อความเตือนสัญญารูทีน/ผลวิเคราะห์ที่ยังไม่มี (MEDIUM; CONFIRMED-GAP)
- **เหตุผล:** ผู้ใช้ได้รับข้อความให้ทำรูทีนเฉพาะตนทั้งที่ไม่มีรูทีนหรือรอบจริง
- **วิธีดำเนินการ:** ผูก reminders กับ capability/ข้อมูล routine จริงและ cycle date; ระบุ generic reminder เฉพาะเมื่อผลิตภัณฑ์อนุญาต ไม่อ้างว่าคำนวณเฉพาะบุคคลแล้ว
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/settings/application/local-notifications.ts:43](<C:/Users/balln/my-app/src/features/settings/application/local-notifications.ts:43>), [src/features/routines/ui/routine-screen.tsx:12](<C:/Users/balln/my-app/src/features/routines/ui/routine-screen.tsx:12>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-18, SC-23, SC-24
- **วิธีทดสอบหลังแก้:** ไม่มีroutine/มีroutine/แก้cycle/หยุดroutine; release build ปิด scan
- **Acceptance criteria:** ไม่เตือนฟีเจอร์ที่ยังไม่มี และ schedule สอดคล้องข้อมูลที่หน้า destination แสดง
### Task SC-21 — มีเมนูตั้งค่าที่กดแล้วไม่ทำงาน

- **สิ่งที่ต้องแก้ไข:** มีเมนูตั้งค่าที่กดแล้วไม่ทำงาน (MEDIUM; CONFIRMED-GAP)
- **เหตุผล:** ผู้ใช้ตีความว่าเปลี่ยนหรือลบข้อมูลได้ แต่ไม่มี operation
- **วิธีดำเนินการ:** กำหนด capability registry ให้ทุก row มี action หรือสถานะ unavailable; ทำจริงตาม release scope โดยแยก destructive history action
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/settings/application/settings-sections.ts:4](<C:/Users/balln/my-app/src/features/settings/application/settings-sections.ts:4>), [src/features/settings/application/settings-content.ts:1](<C:/Users/balln/my-app/src/features/settings/application/settings-content.ts:1>), [src/app/settings.tsx:137](<C:/Users/balln/my-app/src/app/settings.tsx:137>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-22, SC-24, SC-48
- **วิธีทดสอบหลังแก้:** ไล่กดทุก settings row; ตรวจ switch/action/unavailable และ deep link
- **Acceptance criteria:** ไม่มี interactive row ที่เงียบ และไม่แสดง success สำหรับ operation ที่ไม่มี
### Task SC-23 — Core loop รูทีนและคำแนะนำเฉพาะบุคคลยังไม่ถูก implement

- **สิ่งที่ต้องแก้ไข:** Core loop รูทีนและคำแนะนำเฉพาะบุคคลยังไม่ถูก implement (HIGH; CONFIRMED-GAP)
- **เหตุผล:** ยังทำ primary flow วิเคราะห์→แนะนำ→รูทีนรายวันไม่ได้
- **วิธีดำเนินการ:** แบ่ง vertical slices: owned products/profile→deterministic rules→persisted routine revision→calendar/completion→substitution; ให้ผู้รับผิดชอบยืนยันกฎก่อนใช้
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/routines/ui/routine-screen.tsx:7](<C:/Users/balln/my-app/src/features/routines/ui/routine-screen.tsx:7>), [src/features/routines/domain/routine.ts:1](<C:/Users/balln/my-app/src/features/routines/domain/routine.ts:1>), [docs/requirements.md:51](<C:/Users/balln/my-app/docs/requirements.md:51>), [src/features/products/ui/home-screen.tsx:145](<C:/Users/balln/my-app/src/features/products/ui/home-screen.tsx:145>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-01, SC-10, SC-24, SC-28; safety-rule owner และขอบเขต MVP
- **วิธีทดสอบหลังแก้:** ทดสอบ input เปลี่ยน/avoid ingredient/budget/timezone/duplicate completion/rule version; ห้ามใช้คะแนนดิบเป็นกฎอัตโนมัติ
- **Acceptance criteria:** ผล reproducible มีเหตุผล/version; history/completionไม่ซ้ำ; ไม่มีคำแนะนำที่ข้าม exclusion rules
### Task SC-24 — Production scan pipeline ยังเป็น foundation และ research pilot

- **สิ่งที่ต้องแก้ไข:** Production scan pipeline ยังเป็น foundation และ research pilot (HIGH; CONFIRMED-GAP)
- **เหตุผล:** Release/iOS/web สแกนไม่ได้; ไม่มี consent receipt/result lifecycle/history ใน primary flow
- **วิธีดำเนินการ:** เลือก processing boundary/retention แล้วเชื่อม consent→job→validated input→trusted inference→result→cleanup แบบ idempotent; server-side writes เท่านั้น; ทำ storage เฉพาะเมื่อ flow ต้องใช้จริง
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/skin-analysis/ui/scan-flow-screen.tsx:17](<C:/Users/balln/my-app/src/features/skin-analysis/ui/scan-flow-screen.tsx:17>), [src/features/skin-analysis/services/local-scan.ts:65](<C:/Users/balln/my-app/src/features/skin-analysis/services/local-scan.ts:65>), [supabase/migrations/20261103181856_scan_consent_sessions.sql:56](<C:/Users/balln/my-app/supabase/migrations/20261103181856_scan_consent_sessions.sql:56>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-22, SC-25, SC-26, SC-38; provider/retention/budget decisions
- **วิธีทดสอบหลังแก้:** ทดสอบ unauthorized/cross-owner/expired consent/retry/cancel/network loss/duplicate job/cleanup failures ใน staging
- **Acceptance criteria:** Release path ผ่าน end-to-end; ไม่มีการเปิด active consent ล่วงหน้าโดย endpoint/cleanup ยังไม่พร้อม
### Task SC-25 — ยังไม่มีหลักฐานความแม่นยำหรือ face-quality gate สำหรับใช้ผลจริง

- **สิ่งที่ต้องแก้ไข:** ยังไม่มีหลักฐานความแม่นยำหรือ face-quality gate สำหรับใช้ผลจริง (HIGH; CONFIRMED-GAP)
- **เหตุผล:** ภาพไม่ใช่ใบหน้าก็อาจได้คะแนน; ไม่ควรใช้ margin เป็น probability/diagnosis/คำแนะนำที่ต้องเชื่อถือ
- **วิธีดำเนินการ:** ทำ quality gate ที่ทดสอบได้, unassessable path, dataset split ตามบุคคล, frozen validation/test และ metrics พร้อม uncertainty/subgroups; รักษาป้าย research จนผ่านเกณฑ์ที่ตกลง
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [scripts/skin_ai/serve_local_scan.py:18](<C:/Users/balln/my-app/scripts/skin_ai/serve_local_scan.py:18>), [scripts/skin_ai/serve_local_scan.py:31](<C:/Users/balln/my-app/scripts/skin_ai/serve_local_scan.py:31>), [scripts/skin_ai/run_experiment.py:14](<C:/Users/balln/my-app/scripts/skin_ai/run_experiment.py:14>), [docs/skin-ai-evaluation-protocol.md:1](<C:/Users/balln/my-app/docs/skin-ai-evaluation-protocol.md:1>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-24; ผู้ประเมิน/สิทธิ์ dataset/เกณฑ์ผ่าน
- **วิธีทดสอบหลังแก้:** ภาพไม่มีหน้า/หลายหน้า/มืด/เบลอ; independent labels; leakage check; benchmark เดียวกันก่อนและหลังเปลี่ยน model
- **Acceptance criteria:** ไม่รับภาพนอกขอบเขตแบบมั่นใจ; มีผล evaluation ที่ reproducible; ไม่แปลงคะแนนเป็นคำวินิจฉัย
### Task SC-27 — เรียงราคาก่อนหลังไม่ครอบคลุมทั้ง catalog และไม่มี pagination

- **สิ่งที่ต้องแก้ไข:** เรียงราคาก่อนหลังไม่ครอบคลุมทั้ง catalog และไม่มี pagination (MEDIUM; CONFIRMED)
- **เหตุผล:** เมื่อมี31+สินค้า สินค้าที่ถูกสุด/แพงสุดอาจไม่อยู่ในผลและรายการที่เหลือเข้าถึงไม่ได้
- **วิธีดำเนินการ:** คำนวณ min available price/orderบน server ที่คงRLS; stable cursorตามsortและid; infinite query/next page พร้อม total contract
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/products/data/supabase-product-repository.ts:19](<C:/Users/balln/my-app/src/features/products/data/supabase-product-repository.ts:19>), [src/features/products/data/supabase-product-repository.ts:27](<C:/Users/balln/my-app/src/features/products/data/supabase-product-repository.ts:27>), [src/features/products/data/supabase-product-repository.ts:32](<C:/Users/balln/my-app/src/features/products/data/supabase-product-repository.ts:32>), [src/features/products/ui/discover-screen.tsx:49](<C:/Users/balln/my-app/src/features/products/ui/discover-screen.tsx:49>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-35, SC-45; schema migration/test fixtures
- **วิธีทดสอบหลังแก้:** ใช้31+สินค้าที่ cheapest มีreviewต่ำ, ราคาซ้ำ, ไม่มีราคา, เปลี่ยนfilterระหว่างโหลดpage
- **Acceptance criteria:** ลำดับทั้งdatasetถูกต้อง ไม่มีข้าม/ซ้ำ และผู้ใช้โหลดได้ครบ
### Task SC-28 — ข้อมูลสินค้า ราคา รีวิว และลิงก์ยังเป็นตัวอย่าง

- **สิ่งที่ต้องแก้ไข:** ข้อมูลสินค้า ราคา รีวิว และลิงก์ยังเป็นตัวอย่าง (MEDIUM; CONFIRMED-GAP)
- **เหตุผล:** ใช้เปรียบเทียบราคา/เลือกส่วนผสมจริงไม่ได้อย่างเชื่อถือได้ แม้ UI ใช้งานได้
- **วิธีดำเนินการ:** แยก sample vs verified source พร้อมเวลาตรวจสอบราคา/สิทธิ์รูป/INCI; ไม่ใช้ seed claims เป็น recommendation inputจริง; ตรวจ deep product links
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:42](<C:/Users/balln/my-app/supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:42>), [src/features/products/ui/home-screen.tsx:49](<C:/Users/balln/my-app/src/features/products/ui/home-screen.tsx:49>), [src/features/products/ui/product-detail-screen.tsx:119](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:119>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-23, SC-27, SC-30; เจ้าของข้อมูลสินค้า
- **วิธีทดสอบหลังแก้:** ตรวจแหล่งข้อมูลทีละSKU, ราคา stale/offer unavailable และลิงก์ที่ปลายทางไม่ใช่สินค้า
- **Acceptance criteria:** ข้อมูลที่จะเปิดจริง traceแหล่งที่มาได้ และผู้ใช้เห็นราคา/ความสด/สถานะตัวอย่างตรงกัน
### Task SC-29 — รายละเอียดเติมข้อมูลที่ไม่มีและผูกประโยชน์ส่วนผสมผิดระดับ

- **สิ่งที่ต้องแก้ไข:** รายละเอียดเติมข้อมูลที่ไม่มีและผูกประโยชน์ส่วนผสมผิดระดับ (MEDIUM; CONFIRMED)
- **เหตุผล:** ผู้ใช้เห็นขนาด/ประโยชน์/ความนิยมที่ไม่ได้มาจากข้อมูลของfieldนั้น
- **วิธีดำเนินการ:** แสดงunknownเมื่อไม่มีsize; ใช้ingredient-specific evidenceหรือไม่กล่าวอ้าง; คำนวณbadgeจากเงื่อนไขที่ชัดเจน
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/products/ui/product-detail-screen.tsx:152](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:152>), [src/features/products/ui/product-detail-screen.tsx:175](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:175>), [src/features/products/ui/product-detail-screen.tsx:182](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:182>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-28; product domain/schema
- **วิธีทดสอบหลังแก้:** fixture sizeว่าง, ingredientหลายตัว/concernsต่างกัน, unpopular product
- **Acceptance criteria:** ไม่มีข้อมูลที่แต่งขึ้นจากfallback และทุกclaimสัมพันธ์กับข้อมูลที่รองรับ
### Task SC-30 — ภาพสินค้า mapping ไม่ตรงตัวรายการและบาง detail ไม่มีภาพสำรอง

- **สิ่งที่ต้องแก้ไข:** ภาพสินค้า mapping ไม่ตรงตัวรายการและบาง detail ไม่มีภาพสำรอง (MEDIUM; CONFIRMED)
- **เหตุผล:** ภาพอาจทำให้จำสินค้าผิดและรายละเอียดบางสินค้ามีพื้นที่ภาพว่าง
- **วิธีดำเนินการ:** ยืนยันassetกับSKU/สิทธิ์ใช้งาน; ระบุภาพจำลองอย่างถูกต้อง; reuse artwork fallbackและเลือกimage metadataจากcatalog
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/products/ui/product-image-sources.ts:2](<C:/Users/balln/my-app/src/features/products/ui/product-image-sources.ts:2>), [src/features/products/ui/product-artwork.tsx:44](<C:/Users/balln/my-app/src/features/products/ui/product-artwork.tsx:44>), [src/features/products/ui/product-detail-screen.tsx:156](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:156>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-28; อย่าเปลี่ยนassetจริงในรอบaudit
- **วิธีทดสอบหลังแก้:** เปิดทั้ง8SKU เทียบcatalogกับasset; testmissing source/imageerror/accessibilitylabel
- **Acceptance criteria:** ทุกSKUแสดงภาพที่ตรงหรือfallbackชัดเจน และภาพจำลองไม่ถูกประกาศว่าภาพจริง
### Task SC-31 — Gallery และคำอธิบายดูเหมือนกดได้แต่เป็นภาพนิ่ง

- **สิ่งที่ต้องแก้ไข:** Gallery และคำอธิบายดูเหมือนกดได้แต่เป็นภาพนิ่ง (LOW; CONFIRMED-GAP)
- **เหตุผล:** อ่านรายละเอียดทั้งหมดหรือเลื่อนgalleryไม่ได้; ผู้รับshareเปิดสินค้าโดยตรงไม่ได้
- **วิธีดำเนินการ:** กำหนดmedia arrayจริงหรือแสดงภาพเดียว; เพิ่มexpandตามdesignเดิมและdeep linkที่เปิดได้จริง
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/products/ui/product-detail-screen.tsx:133](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:133>), [src/features/products/ui/product-detail-screen.tsx:157](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:157>), [src/features/products/ui/product-detail-screen.tsx:198](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:198>), [src/features/products/ui/product-detail-screen.tsx:95](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:95>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-28, SC-48; product URL scheme/hosting
- **วิธีทดสอบหลังแก้:** แตะทุกthumbnail/expand, longdescription, shareแล้วเปิดcold app/web
- **Acceptance criteria:** ไม่มีตัวควบคุมที่สื่อว่ากดได้แต่ไร้ผล และแชร์นำผู้รับกลับSKUถูกต้อง
### Task SC-34 — Loading/error/back บางหน้าไม่ครบและcounterกลบข้อผิดพลาด

- **สิ่งที่ต้องแก้ไข:** Loading/error/back บางหน้าไม่ครบและcounterกลบข้อผิดพลาด (LOW; CONFIRMED)
- **เหตุผล:** ผู้ใช้แยกข้อมูลว่าง/โหลดผิดพลาดไม่ได้และdeep linkอาจติดหน้าที่ไม่มีทางกลับ
- **วิธีดำเนินการ:** ทำexplicit pending/error/empty โดยไม่ตีความerrorเป็น0; ใช้safe-backไปdestinationที่เหมาะสมและaccessible retry
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/products/ui/home-screen.tsx:110](<C:/Users/balln/my-app/src/features/products/ui/home-screen.tsx:110>), [src/features/products/ui/product-detail-screen.tsx:66](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:66>), [src/features/products/ui/product-detail-screen.tsx:77](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:77>), [src/features/profile/ui/profile-screen.tsx:98](<C:/Users/balln/my-app/src/features/profile/ui/profile-screen.tsx:98>), [src/app/settings.tsx:137](<C:/Users/balln/my-app/src/app/settings.tsx:137>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-01, SC-15; UI lockต้องรักษาlayoutหลัก
- **วิธีทดสอบหลังแก้:** offline, emptycatalog, favoriteserror, directdeep link404 บนweb/native
- **Acceptance criteria:** ทุกสถานะบอกความจริงและมีทางretry/กลับหน้าใช้งานได้
### Task SC-35 — Money model ยอมหลายสกุล แต่หาร100และเทียบจำนวนดิบเสมอ

- **สิ่งที่ต้องแก้ไข:** Money model ยอมหลายสกุล แต่หาร100และเทียบจำนวนดิบเสมอ (MEDIUM; RISK)
- **เหตุผล:** ราคา .50ถูกปัดและข้อมูลหลายสกุลในอนาคตทำให้range/sortผิด
- **วิธีดำเนินการ:** ถ้าMVP THBให้constraint/validationชัดเจนและรักษาสตางค์ตามการแสดงผล; หากmulticurrencyต้องแยกหรือconvertด้วยrateที่มีsource/time
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/products/application/format-money.ts:6](<C:/Users/balln/my-app/src/features/products/application/format-money.ts:6>), [src/features/products/data/supabase-product-repository.ts:11](<C:/Users/balln/my-app/src/features/products/data/supabase-product-repository.ts:11>), [src/features/products/ui/product-detail-screen.tsx:40](<C:/Users/balln/my-app/src/features/products/ui/product-detail-screen.tsx:40>), [supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:17](<C:/Users/balln/my-app/supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:17>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-27, SC-32; product currency decision
- **วิธีทดสอบหลังแก้:** THB39050, invalidcode, currencyผสม และzero-decimalcurrencyหากอยู่ในscope
- **Acceptance criteria:** ราคา/การเรียงไม่เปรียบเทียบหน่วยที่ต่างกันโดยเงียบ และการปัดเป็นpolicyที่ระบุ
### Task SC-49 — Onboarding requirement ถูกตรวจเฉพาะท้ายlogin

- **สิ่งที่ต้องแก้ไข:** Onboarding requirement ถูกตรวจเฉพาะท้ายlogin (MEDIUM; CONFIRMED-GAP)
- **เหตุผล:** sessionเดิมที่ยังไม่ผ่านonboardingอาจไปprotectedfeatureโดยไม่ผ่านข้อมูลเริ่มต้น; ไม่ใช่RLSbypassและpilotอาจตั้งใจแยก
- **วิธีดำเนินการ:** กำหนดfeatureaccessrequirementsและcentralgateที่คงreturnintent; แยกpilotข้อยกเว้นที่ตั้งใจออกจากproductionjourneyอย่างชัดเจน
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/auth/ui/auth-screen.tsx:138](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:138>), [src/features/auth/ui/auth-session-provider.tsx:22](<C:/Users/balln/my-app/src/features/auth/ui/auth-session-provider.tsx:22>), [src/features/profile/ui/profile-screen.tsx:61](<C:/Users/balln/my-app/src/features/profile/ui/profile-screen.tsx:61>), [src/features/skin-analysis/ui/scan-flow-screen.tsx:66](<C:/Users/balln/my-app/src/features/skin-analysis/ui/scan-flow-screen.tsx:66>)
- **ผลกระทบที่อาจเกิดจากการแก้:** กระทบพฤติกรรมผู้ใช้และข้อมูลที่บันทึก; รักษา return intent, owner scope และความเข้ากันได้ของข้อมูลเดิม
- **Dependencies:** SC-01, SC-07, SC-10, SC-24
- **วิธีทดสอบหลังแก้:** restore/incompleteprofile/deeplink/notification→protectedfeature; verifiedcompletedprofileไม่ถูกถามซ้ำ
- **Acceptance criteria:** ทุกentrypointบังคับเงื่อนไขเดียวกันตามpolicyและไม่ทำให้guestcatalogต้องlogin

## Phase 3: Architecture & Code Quality

### Task SC-32 — Type assertions ยอมรับ payload ที่ไม่ตรง domain

- **สิ่งที่ต้องแก้ไข:** Type assertions ยอมรับ payload ที่ไม่ตรง domain (MEDIUM; RISK)
- **เหตุผล:** schema/data driftอาจทำให้หน้าล่ม เช่น categoryใหม่หรือarrayผิดรูป; TS compileไม่ตรวจnetworkpayload
- **วิธีดำเนินการ:** สร้างgenerated Database typesและboundary parserที่จำเป็น; validate enums/money/arrays/RPCshapeก่อนmap พร้อมunknown fallback
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/products/data/supabase-product-repository.ts:5](<C:/Users/balln/my-app/src/features/products/data/supabase-product-repository.ts:5>), [src/features/products/data/supabase-product-repository.ts:26](<C:/Users/balln/my-app/src/features/products/data/supabase-product-repository.ts:26>), [src/features/products/ui/product-artwork.tsx:26](<C:/Users/balln/my-app/src/features/products/ui/product-artwork.tsx:26>), [src/features/skin-profile/data/supabase-skin-profile-repository.ts:65](<C:/Users/balln/my-app/src/features/skin-profile/data/supabase-skin-profile-repository.ts:65>)
- **ผลกระทบที่อาจเกิดจากการแก้:** การย้าย boundary/type อาจเปลี่ยน call order และ error behavior; ใช้ characterization tests และไม่เปลี่ยน dependency framework พร้อมกัน
- **Dependencies:** SC-27, SC-29, SC-36
- **วิธีทดสอบหลังแก้:** mock categoryใหม่, nulljoin, invalidcurrency, malformedRPC และschema versionไม่รองรับ
- **Acceptance criteria:** payloadผิดรูปถูกปฏิเสธ/แสดงfallbackควบคุมได้ ไม่เกิดundefined crash
### Task SC-36 — ข้อจำกัดข้อมูลและupdated_atยังไม่ครอบคลุม

- **สิ่งที่ต้องแก้ไข:** ข้อจำกัดข้อมูลและupdated_atยังไม่ครอบคลุม (MEDIUM; RISK)
- **เหตุผล:** clientดัดแปลงส่งpayloadใหญ่หรือdomainผิดได้; เวลาแก้ไขไม่น่าเชื่อถือ; ยังไม่ได้โจมตีremote
- **วิธีดำเนินการ:** เพิ่มserverconstraintsตามdomainจริง, allowlistconcern/normalizedingredient IDsและlengthlimits; triggerหรือexplicitupdated_atในทุกwritepath
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [supabase/migrations/20261029110000_create_skin_profiles.sql:71](<C:/Users/balln/my-app/supabase/migrations/20261029110000_create_skin_profiles.sql:71>), [supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:9](<C:/Users/balln/my-app/supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:9>), [supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:26](<C:/Users/balln/my-app/supabase/migrations/20260821120359_create_catalog_and_user_settings.sql:26>)
- **ผลกระทบที่อาจเกิดจากการแก้:** การย้าย boundary/type อาจเปลี่ยน call order และ error behavior; ใช้ characterization tests และไม่เปลี่ยน dependency framework พร้อมกัน
- **Dependencies:** SC-01, SC-10, SC-32; taxonomy/limit decisions
- **วิธีทดสอบหลังแก้:** SQL negative tests arraysใหญ่/ค่าที่ไม่รองรับ/ratingนอกช่วง; updateค่าจริงแล้วตรวจtimestamp
- **Acceptance criteria:** serverปฏิเสธข้อมูลนอกcontractและupdated_atสะท้อนwriteทุกช่องทาง
### Task SC-39 — UI ยังถือbusiness side effectsและSupabase callsหลายจุด

- **สิ่งที่ต้องแก้ไข:** UI ยังถือbusiness side effectsและSupabase callsหลายจุด (MEDIUM; CONFIRMED)
- **เหตุผล:** ยากต่อการทดสอบcross-flowและแก้raceให้สอดคล้อง; ขัดกับroute-onlyแนวทางในarchitecture doc
- **วิธีดำเนินการ:** คงfeature-firstและReactQuery; ย้ายsettingsscreenออกจากroute, แยกusecases/repositories/querykeys/sessioncleanup; ไม่เพิ่มframeworkหรือglobalstoreใหม่โดยไม่มีเหตุผล
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/app/settings.tsx:18](<C:/Users/balln/my-app/src/app/settings.tsx:18>), [src/features/auth/ui/auth-screen.tsx:138](<C:/Users/balln/my-app/src/features/auth/ui/auth-screen.tsx:138>), [src/features/profile/ui/profile-screen.tsx:40](<C:/Users/balln/my-app/src/features/profile/ui/profile-screen.tsx:40>), [src/features/settings/ui/settings-detail-screen.tsx:85](<C:/Users/balln/my-app/src/features/settings/ui/settings-detail-screen.tsx:85>)
- **ผลกระทบที่อาจเกิดจากการแก้:** การย้าย boundary/type อาจเปลี่ยน call order และ error behavior; ใช้ characterization tests และไม่เปลี่ยน dependency framework พร้อมกัน
- **Dependencies:** SC-12–SC-16; ต้องมีbehaviorregressionก่อนrefactor
- **วิธีทดสอบหลังแก้:** ทดสอบflowเดิมเทียบก่อนหลัง; importsไม่ย้อนdomain→UI; typecheckและrouteexport
- **Acceptance criteria:** routeเป็นcomposition, UIไม่ถือDBschema และside effectsหลักทดสอบได้โดยไม่renderทั้งหน้า
### Task SC-47 — ไม่พบระบบแพทย์ ผู้เชี่ยวชาญ หรือวิดีโอคอล

- **สิ่งที่ต้องแก้ไข:** ไม่พบระบบแพทย์ ผู้เชี่ยวชาญ หรือวิดีโอคอล (INFO; NOT-IMPLEMENTED-OUTSIDE-MVP)
- **เหตุผล:** ไม่ควรนับว่าauditผ่านระบบเหล่านี้หรือถือเป็นบั๊กในscopeที่ตกลง
- **วิธีดำเนินการ:** บันทึกสถานะในscope matrix; หากจะเพิ่มต้องทำrequirements/authorization/provider/privacydesignเป็นงานใหม่ก่อน
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [docs/requirements.md:61](<C:/Users/balln/my-app/docs/requirements.md:61>), [src/app/(tabs)/_layout.tsx:13](<C:/Users/balln/my-app/src/app/(tabs)/_layout.tsx:13>)
- **ผลกระทบที่อาจเกิดจากการแก้:** การย้าย boundary/type อาจเปลี่ยน call order และ error behavior; ใช้ characterization tests และไม่เปลี่ยน dependency framework พร้อมกัน
- **Dependencies:** เจ้าของผลิตภัณฑ์ต้องกำหนดscope; ไม่เพิ่มSDK/หน้าจอในรอบนี้
- **วิธีทดสอบหลังแก้:** ตรวจscopeapprovalและroute/schemainventoryเมื่อตัดสินใจเพิ่ม
- **Acceptance criteria:** รายงานและreleaseclaimsไม่กล่าวว่ารองรับdoctor/video callจนมีimplementationและtest

## Phase 4: Performance Optimization

### Task SC-43 — Assetหลักใหญ่กว่าขนาดแสดงผลและwebentry2.1MB

- **สิ่งที่ต้องแก้ไข:** Assetหลักใหญ่กว่าขนาดแสดงผลและwebentry2.1MB (MEDIUM; MEASURED-SIZE)
- **เหตุผล:** เป็นcostด้านdownload/decode/bundleที่ควรbenchmark โดยเฉพาะwebและมือถือจำกัดทรัพยากร
- **วิธีดำเนินการ:** หลังยืนยันSKUทำresponsive/resizedassetsและformatที่รองรับพร้อมvisualcomparison; วัดcoldstart/network/decodeก่อนหลัง; เก็บunusedassetsตามการอ้างอิงจริง
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/products/ui/product-image-sources.ts:2](<C:/Users/balln/my-app/src/features/products/ui/product-image-sources.ts:2>), [src/features/products/ui/home-screen.tsx:96](<C:/Users/balln/my-app/src/features/products/ui/home-screen.tsx:96>), [assets/products/anua-heartleaf-serum-generated.png](<C:/Users/balln/my-app/assets/products/anua-heartleaf-serum-generated.png>)
- **ผลกระทบที่อาจเกิดจากการแก้:** การปรับ performance อาจเปลี่ยนลำดับข้อมูล ผล model หรือคุณภาพภาพ; ต้องวัดและตรวจ equivalence พร้อมกัน
- **Dependencies:** SC-30, SC-40; ห้ามอ้างเปอร์เซ็นต์เร็วขึ้นโดยไม่มีbenchmark
- **วิธีทดสอบหลังแก้:** วัดขนาดbundle/transferและเวลาโหลดบนเครื่อง/เครือข่ายเดิม; visualQAรายละเอียด/โปร่งใส
- **Acceptance criteria:** assetเหมาะresolutionจริง ภาพไม่เสีย และมีbaseline/budgetที่ตรวจซ้ำได้
### Task SC-44 — Inferenceสองรอบต่อภาพและglobal lockรวมช่วงupload

- **สิ่งที่ต้องแก้ไข:** Inferenceสองรอบต่อภาพและglobal lockรวมช่วงupload (MEDIUM; RISK)
- **เหตุผล:** งานช้า/ค้างหนึ่งงานบล็อกtesterอื่น; clientabortไม่รับรองหยุดworker; ไม่มีbenchmarkยืนยันlatencyขณะนี้
- **วิธีดำเนินการ:** วัดinference/queue/uploadแยกก่อน; พิจารณาbatchprompts/cachefeaturesด้วยnumericalequivalence; boundedworkerqueue/deadlineสำหรับproduction; อย่าเพิ่มworkersโดยไม่วัดRAM
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [scripts/skin_ai/serve_local_scan.py:31](<C:/Users/balln/my-app/scripts/skin_ai/serve_local_scan.py:31>), [scripts/skin_ai/run_experiment.py:74](<C:/Users/balln/my-app/scripts/skin_ai/run_experiment.py:74>), [scripts/skin_ai/serve_https_scan.py:132](<C:/Users/balln/my-app/scripts/skin_ai/serve_https_scan.py:132>)
- **ผลกระทบที่อาจเกิดจากการแก้:** การปรับ performance อาจเปลี่ยนลำดับข้อมูล ผล model หรือคุณภาพภาพ; ต้องวัดและตรวจ equivalence พร้อมกัน
- **Dependencies:** SC-24, SC-25; compute budget
- **วิธีทดสอบหลังแก้:** synthetic/nonpersonalimagesวัดp50/p95/RAMและconcurrent2–8requestในlocal; slowupload/hungworker/cancel
- **Acceptance criteria:** ระบบreject/loadsheddingได้และไม่มีqueueค้างไม่จำกัด; ผลmodelไม่เปลี่ยนโดยไม่มีevaluation
### Task SC-45 — Searchไม่มีindexเฉพาะและมีFKadvisoryที่ต้องตรวจquery plan

- **สิ่งที่ต้องแก้ไข:** Searchไม่มีindexเฉพาะและมีFKadvisoryที่ต้องตรวจquery plan (LOW; RISK-AT-SCALE)
- **เหตุผล:** เมื่อข้อมูลมาก search/countหรือFKdeleteอาจแพง; ตอน8สินค้าไม่มีหลักฐานเป็นbottleneck
- **วิธีดำเนินการ:** ทำEXPLAINในstagingที่มีrepresentativedataก่อนเลือกtrigram/FTS/index; ตรวจuniqueindexเดิมก่อนเพิ่มcomposite; ไม่ลบunusedindexเพราะtrafficน้อย
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/products/data/supabase-product-repository.ts:21](<C:/Users/balln/my-app/src/features/products/data/supabase-product-repository.ts:21>), [supabase/migrations/20260821124014_add_product_search_text.sql:1](<C:/Users/balln/my-app/supabase/migrations/20260821124014_add_product_search_text.sql:1>), [supabase/migrations/20261103181044_create_skin_scan_foundation.sql:24](<C:/Users/balln/my-app/supabase/migrations/20261103181044_create_skin_scan_foundation.sql:24>), [supabase/migrations/20261103181856_scan_consent_sessions.sql:24](<C:/Users/balln/my-app/supabase/migrations/20261103181856_scan_consent_sessions.sql:24>)
- **ผลกระทบที่อาจเกิดจากการแก้:** การปรับ performance อาจเปลี่ยนลำดับข้อมูล ผล model หรือคุณภาพภาพ; ต้องวัดและตรวจ equivalence พร้อมกัน
- **Dependencies:** SC-27; https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
- **วิธีทดสอบหลังแก้:** วัดplans/rows/latencyของsearch/count/ownerhistory/deleteก่อนหลังและstoragecost
- **Acceptance criteria:** เพิ่มเฉพาะindexที่แก้queryจริงพร้อมหลักฐาน และไม่ทำwritecostโตโดยไร้ประโยชน์
### Task SC-46 — FavoritesโหลดIDทั้งหมดและส่งINขนาดไม่จำกัด

- **สิ่งที่ต้องแก้ไข:** FavoritesโหลดIDทั้งหมดและส่งINขนาดไม่จำกัด (LOW; RISK-AT-SCALE)
- **เหตุผล:** เมื่อfavoriteมากอาจชนrow/URLlimitsหรือใช้payload/cacheมาก; countกับสินค้าที่activeอาจไม่ตรง
- **วิธีดำเนินการ:** ใช้owner-scopedjoin/pagedfavoritequeryหรือchunkที่มีlimitและstableorder; กำหนดกรณีinactiveproduct; วัดก่อนoptimizeper-cardselectors
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/favorites/data/supabase-favorites-repository.ts:7](<C:/Users/balln/my-app/src/features/favorites/data/supabase-favorites-repository.ts:7>), [src/features/products/data/supabase-product-repository.ts:41](<C:/Users/balln/my-app/src/features/products/data/supabase-product-repository.ts:41>), [src/features/favorites/ui/favorites-screen.tsx:26](<C:/Users/balln/my-app/src/features/favorites/ui/favorites-screen.tsx:26>)
- **ผลกระทบที่อาจเกิดจากการแก้:** การปรับ performance อาจเปลี่ยนลำดับข้อมูล ผล model หรือคุณภาพภาพ; ต้องวัดและตรวจ equivalence พร้อมกัน
- **Dependencies:** SC-14, SC-27; Supabase project row limits
- **วิธีทดสอบหลังแก้:** fixtureมากกว่าหนึ่งpage, inactiveSKU, ลบระหว่างloadpageและaccountswitch
- **Acceptance criteria:** โหลดครบโดยไม่เกิดURL/rowtruncationและcountนิยามชัดเจน

## Phase 5: Dead Code & Cleanup

### Task SC-40 — มีstarterและprototypeที่ไม่reachableจากroutes

- **สิ่งที่ต้องแก้ไข:** มีstarterและprototypeที่ไม่reachableจากroutes (LOW; CONFIRMED-STATIC)
- **เหตุผล:** ทำให้เข้าใจผิดว่าmockscoreหรือreducerเป็นproduction path; มีmaintenance/testที่ไม่คุ้ม
- **วิธีดำเนินการ:** แยกconfirmedunusedstarter/oldanalysisออก; เก็บbenchmarktools; domainfuturetypesจะเก็บต้องระบุowner; ลบreducerหรือเชื่อมจริงตามdesign ไม่เพียงเพื่อลดไฟล์
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/components/app-tabs.tsx:1](<C:/Users/balln/my-app/src/components/app-tabs.tsx:1>), [src/features/skin-analysis/ui/analysis-screen.tsx:1](<C:/Users/balln/my-app/src/features/skin-analysis/ui/analysis-screen.tsx:1>), [src/features/skin-analysis/application/scan-session-reducer.ts:21](<C:/Users/balln/my-app/src/features/skin-analysis/application/scan-session-reducer.ts:21>), [src/features/skin-profile/application/skin-profile-queries.ts:7](<C:/Users/balln/my-app/src/features/skin-profile/application/skin-profile-queries.ts:7>)
- **ผลกระทบที่อาจเกิดจากการแก้:** เสี่ยงลบ platform/CLI/config reference ที่ static graph มองไม่ครบ; ตรวจข้าม entrypoints ก่อนลบและทำ build regression
- **Dependencies:** SC-39, SC-42; FILE_DEPENDENCY_MAP มีรายการครบ
- **วิธีทดสอบหลังแก้:** ค้นreferenceรวมscripts/docs/dynamic/platform/configก่อนลบ; buildalltargetsและtest
- **Acceptance criteria:** ไม่มีunusedprototypeที่ถูกเข้าใจว่าเป็นruntime และไม่ลบtoolที่มีentrypointนอกapp
### Task SC-41 — เอกสารหลายช่วงเวลาและGitยังไม่มีtracked baseline

- **สิ่งที่ต้องแก้ไข:** เอกสารหลายช่วงเวลาและGitยังไม่มีtracked baseline (LOW; CONFIRMED)
- **เหตุผล:** เสี่ยงทำตามคำสั่งเก่าหรือcommitcache; ไม่มีdiffbaselineสำหรับตรวจการเปลี่ยนแปลง
- **วิธีดำเนินการ:** ทำREADME/setup/runbookปัจจุบัน, labelhistoricaldocs, เอาคำสั่งresetออกจากdeveloperhappy path, ตรวจignoreแล้วสร้างbaselineด้วยการreviewไฟล์
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [README.md:1](<C:/Users/balln/my-app/README.md:1>), [docs/testing.md:1](<C:/Users/balln/my-app/docs/testing.md:1>), [docs/audit-2026-10-14.md:1](<C:/Users/balln/my-app/docs/audit-2026-10-14.md:1>), [scripts/reset-project.js:1](<C:/Users/balln/my-app/scripts/reset-project.js:1>), [.gitignore:1](<C:/Users/balln/my-app/.gitignore:1>)
- **ผลกระทบที่อาจเกิดจากการแก้:** เสี่ยงลบ platform/CLI/config reference ที่ static graph มองไม่ครบ; ตรวจข้าม entrypoints ก่อนลบและทำ build regression
- **Dependencies:** SC-02, SC-39; ห้ามgitaddallโดยไม่ตรวจsecret/buildassets
- **วิธีทดสอบหลังแก้:** ทำfreshcheckoutตามREADME; ตรวจtrackedinventoryและsecret scan; ไม่รันreset-project
- **Acceptance criteria:** คนใหม่เริ่มงานได้และรู้ฟีเจอร์จริง/แผน; baselineไม่รวมcache/secrets/ภาพผู้เข้าร่วม

## Phase 6: Testing & Final Verification

### Task SC-42 — เทสต์ปัจจุบันยังไม่พิสูจน์critical flowsและRLSจริง

- **สิ่งที่ต้องแก้ไข:** เทสต์ปัจจุบันยังไม่พิสูจน์critical flowsและRLSจริง (HIGH; CONFIRMED-GAP)
- **เหตุผล:** 56passingtestsไม่ตรวจschemaขาดหรือproductionflowหลัก; ยังรับรองreleaseไม่ได้
- **วิธีดำเนินการ:** เพิ่มstagingintegrationสำหรับschema/RLS/consent/deletionและscreenflowsที่เสี่ยง; ทำAndroid/iOSrealdeviceและwebdeep-linkchecks พร้อมnegativecases
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [src/features/settings/data/supabase-settings-repository.test.ts:1](<C:/Users/balln/my-app/src/features/settings/data/supabase-settings-repository.test.ts:1>), [src/features/skin-analysis/application/scan-session-reducer.test.ts:1](<C:/Users/balln/my-app/src/features/skin-analysis/application/scan-session-reducer.test.ts:1>), [src/features/settings/ui/settings-screen.test.tsx:21](<C:/Users/balln/my-app/src/features/settings/ui/settings-screen.test.tsx:21>), [docs/requirements.md:71](<C:/Users/balln/my-app/docs/requirements.md:71>)
- **ผลกระทบที่อาจเกิดจากการแก้:** อาจพบ regression เฉพาะ platform/config; ใช้ build ที่ระบุ version และข้อมูลทดสอบที่แยกจาก production
- **Dependencies:** SC-01–SC-03 และcriticalfixes; fixtureaccounts/isolatedDB
- **วิธีทดสอบหลังแก้:** guest→detail→auth→onboarding→favorites→settings→export/delete; A/B/anon RLS; deniedcamera/notifications; slow/offline/sessionchange
- **Acceptance criteria:** criticaljourneysและaccessmatrixผ่านด้วยหลักฐานวันที่/build/อุปกรณ์; CIexit0
### Task SC-48 — Release configuration และplatform verificationยังไม่ครบ

- **สิ่งที่ต้องแก้ไข:** Release configuration และplatform verificationยังไม่ครบ (MEDIUM; CONFIRMED-GAP)
- **เหตุผล:** ยังยืนยันinstall/storeidentity/nativebehaviorไม่ได้; settings/insets/keyboard/Fabricต้องทดสอบจริง
- **วิธีดำเนินการ:** กำหนดreleaseidentity/signing/environments/hostingfallback/deeplinksและnative smoke matrix; ตรวจworkaroundจากnativeevidenceก่อนเปลี่ยน; SDKcheckofflineผ่านไม่เท่ากับreleaseapproval
- **ไฟล์/ระบบที่เกี่ยวข้อง:** [app.json:11](<C:/Users/balln/my-app/app.json:11>), [app.json:15](<C:/Users/balln/my-app/app.json:15>), [app.json:29](<C:/Users/balln/my-app/app.json:29>), [src/app/(tabs)/_layout.tsx:19](<C:/Users/balln/my-app/src/app/(tabs)/_layout.tsx:19>)
- **ผลกระทบที่อาจเกิดจากการแก้:** อาจพบ regression เฉพาะ platform/config; ใช้ build ที่ระบุ version และข้อมูลทดสอบที่แยกจาก production
- **Dependencies:** SC-02, SC-04, SC-07, SC-42; releaseowner
- **วิธีทดสอบหลังแก้:** releaseAndroid/iOSบนdevice: keyboard/insets/fontscale/tabtransition/camera/notification/link; webreloaddynamicroutes
- **Acceptance criteria:** buildที่ระบุversionทำcriticalflowsได้จริงและใช้identity/assets/configที่เจ้าของยืนยัน

## Milestones และ release gates

| Milestone | สิ่งที่ต้องส่งมอบ | เกณฑ์ผ่าน |
|---|---|---|
| M1: Baseline เชื่อถือได้ | SC-01–SC-04 + identity/consent/cleanup fixes | DB ตรง client, CI exit0, security triage มีเจ้าของ |
| M2: บัญชีและ catalog ใช้ได้จริง | Auth/recovery/profile/favorites/settings/catalog tasks | ไม่มีปุ่มเงียบ, A/B isolation ผ่าน, ราคา/sort/page ถูกต้อง |
| M3: Core product loop | SC-23–SC-25 และ data policy | routine/scan ที่เปิดจริงมีผลบันทึกได้; research mode ระบุข้อจำกัด |
| M4: Refactor และปรับ cost | Phase3–5 | behavior เดิมผ่าน; performance มี baseline; dead code แยกจาก tooling |
| M5: Release candidate | Phase6 | Android/iOS/web ตาม scope, migration replay, RLS, destructive flows ใน staging และ rollback rehearsal ผ่าน |

## Verification matrix ขั้นสุดท้าย

| มิติ | กรณีขั้นต่ำ |
|---|---|
| Identity | guest, user A, user B, revoked session, expired token, account switch ระหว่าง request |
| Network | offline startup, slow request, retry, timeout, response ผิด schema, duplicate callback |
| Data | empty/null, 31+ catalog, many favorites, inactive SKU, consent version เปลี่ยน |
| Privacy | export coverage, delete cascades, storage cleanup, process kill ระหว่างถ่าย/แชร์ |
| Device | Android fresh notification permission, iOS provisional/denied, camera denied, app background, dynamic font size, keyboard/insets |
| Release | dev vs release feature flags, static web deep-link reload, no secret/provider key ใน bundle |

ไม่กำหนดเวลาหรือเปอร์เซ็นต์ประสิทธิภาพที่ไม่มีข้อมูลทีม/benchmark รองรับ ปิด Issue ได้เมื่อมีหลักฐานตรง acceptance ไม่ใช่เพียงแก้ไฟล์แล้ว

