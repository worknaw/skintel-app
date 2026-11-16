# SkinCycle Architecture

สถานะ: Draft v1  
Target client: Expo SDK 57 / React Native 0.86 / TypeScript 6

## Architectural principles

- Feature-first: โค้ดของแต่ละ capability อยู่ร่วมกันแทนการรวมทุก service หรือ type ไว้ในไฟล์ใหญ่
- Domain rules ไม่ผูกกับ React, Supabase หรือ AI provider
- Mobile client เป็น untrusted client และใช้ได้เฉพาะ publishable key
- AI analysis และ routine generation ที่มี secret/privileged access ต้องผ่าน server boundary
- Safety rules เป็น deterministic และ versioned; AI ใช้สรุปหรืออธิบายผล
- ทุก external payload ผ่าน runtime validation ก่อนเข้า domain
- Schema, API contract และ model version ต้อง trace กลับจากผลวิเคราะห์ได้

## System context

```text
Expo mobile app
  ├─ Supabase Auth
  ├─ Data API (publishable key + explicit grants + RLS)
  ├─ Private Storage (short-lived signed access)
  └─ Edge/API endpoint
       ├─ validates JWT, consent, rate limit and idempotency
       ├─ reads private image with server credentials
       ├─ calls AI provider through an adapter
       ├─ validates and normalizes AI output
       ├─ applies versioned safety/routine rules
       └─ persists sanitized result
```

## Mobile boundaries

```text
src/
  app/                    Expo Router route entry points only
  features/
    auth/
    products/
    skin-profile/
    skin-analysis/
    routines/
  core/
    result.ts             shared success/failure contract
  components/             reusable design-system components
  constants/              design tokens and application constants
```

แต่ละ feature จะขยายเป็น `domain/`, `data/`, `application/` และ `ui/` เมื่อมี implementation จริง ไม่สร้าง layer เปล่าล่วงหน้าเกินความจำเป็น Route files ทำหน้าที่ประกอบ screen เท่านั้นและไม่เรียก Supabase โดยตรง

## Data access rules

- Public catalog ใช้ read-only repository ที่รองรับ pagination/filtering
- User data repository รับ user context จาก authenticated session และยังพึ่ง RLS เป็น enforcement หลัก
- UI ห้ามเรียก Supabase client โดยตรง
- Query keys/cache keys ต้องรวม filter และ user scope
- Mutations สำคัญใช้ idempotency key และ optimistic UI เฉพาะกรณีที่ rollback ได้

## Authentication flow

1. Guest เก็บ destination ที่ต้องการไปต่อใน memory/navigation state
2. Protected action เปิด auth route พร้อม return intent
3. หลัง login ตรวจ onboarding status จาก server-owned profile state
4. ถ้ายังไม่ครบให้ทำ onboarding ก่อน
5. เมื่อครบแล้ว replace กลับ destination เดิม

Authorization ห้ามอาศัย `user_metadata`; ถ้ามี role ในอนาคตให้ใช้ server-controlled `app_metadata` หรือ dedicated role table และคำนึงว่า JWT อาจยังไม่ refresh

## Skin-analysis sequence

1. Client ขอ `analysis_id` และ upload path ที่ผูกกับ `auth.uid()`
2. Client ลดขนาดภาพและอัปโหลดเข้า private bucket
3. Client เรียก start-analysis พร้อม idempotency key
4. Server ตรวจ ownership, consent version, MIME/size และ current status
5. Server สร้าง short-lived access ไปยัง object แล้วเรียก provider adapter
6. Provider output ผ่าน schema validation และ normalization
7. Server บันทึก sanitized metrics, confidence, warnings และ model version
8. Server ลบ source object ตาม retention policy
9. Client poll/realtime เฉพาะ status และโหลดผลผ่าน RLS

สถานะที่อนุญาต:

```text
created → uploaded → processing → completed
                         └──────→ failed
```

การเปลี่ยนสถานะต้องเป็น monotonic และ retry-safe

## Routine engine

```text
Validated inputs
  → exclusion rules (allergy/avoid/irritation)
  → ingredient interaction rules
  → cycle template selection
  → owned-product matching
  → budget-aware substitution
  → deterministic routine plan
  → AI/plain-language explanation
```

ทุก routine เก็บ `ruleset_version`, `source_analysis_id` และเหตุผลของแต่ละ step เพื่อ reproducibility การแก้ safety rule ใหม่ไม่ควรเปลี่ยนประวัติโดยเงียบ แต่สร้าง routine revision ใหม่

## Failure handling

- Network: retry เฉพาะ operation ที่ idempotent พร้อม exponential backoff
- Upload: resume/retry ได้ แต่ต้องไม่สร้าง analysis ใหม่
- AI timeout: mark failed ด้วย safe error code; ไม่ส่ง raw provider error ให้ client
- Invalid AI output: reject และเก็บ redacted diagnostic ฝั่ง server
- Price stale: แสดง `last_updated` และไม่อ้างว่า real-time
- Session expired: refresh หนึ่งครั้ง แล้วกลับ auth พร้อม return intent

## Security and privacy baseline

- Publishable key เท่านั้นใน `EXPO_PUBLIC_*`; secrets อยู่ใน server environment
- Explicit `GRANT` และ RLS สำหรับทุก object ที่ expose ผ่าน Data API
- User-owned policies ใช้ `(select auth.uid()) = user_id`; update มีทั้ง `USING` และ `WITH CHECK`
- Views ที่ expose ใช้ `security_invoker = true`
- Private bucket แยกภาพวิเคราะห์ออกจาก public product assets
- Storage path เริ่มด้วย user id และ policy ตรวจ folder ownership
- Signed URL อายุสั้นและไม่บันทึกใน logs/analytics
- Consent, deletion และ retention เป็น domain behavior ไม่ใช่ข้อความ UI อย่างเดียว
- Analytics ใช้ pseudonymous event IDs และไม่ส่ง skin metrics/raw images โดย default

## Testing strategy

- Unit: safety rules, budget substitution, score normalization และ state transitions
- Contract: provider adapters, database row mapping และ runtime schemas
- Integration: RLS ด้วย user A/user B/anon, storage policies และ Edge/API idempotency
- UI: auth return intent, onboarding และ daily routine completion
- Device: camera/upload, low-memory Android, iOS permission states และ poor network

## Architecture decision records ที่ต้องสร้างถัดไป

- ADR-001: Edge Functions เทียบกับ separate backend
- ADR-002: AI provider และ data-processing region
- ADR-003: image retention policy
- ADR-004: server-state/query library
- ADR-005: local/offline routine completion strategy

