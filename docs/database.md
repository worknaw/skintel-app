# SkinCycle Database and Access Model

สถานะ: Logical design draft v1  
Database: Supabase Postgres

เอกสารนี้เป็น logical model ยังไม่ใช่ migration พร้อม deploy การสร้าง migration จะเริ่มหลังยืนยัน open decisions ใน `requirements.md`

## Schema strategy

- `public`: API surface ที่ mobile client ต้องเข้าถึงโดยตรง
- `private`: internal tables, rate limits, provider diagnostics และ helper functions ที่ไม่ expose
- `storage`: Supabase-managed; เพิ่มเฉพาะ policies ที่จำเป็น

ตารางใน `public` ทุกตารางต้องเปิด RLS และกำหนด `GRANT` แบบ explicit เพราะ grants และ RLS เป็นคนละชั้นของการควบคุมสิทธิ์

## Core tables

### Identity and consent

| Table | Purpose | Access |
|---|---|---|
| `profiles` | app profile ที่อ้าง `auth.users.id` | owner read/update |
| `skin_profiles` | skin type, concerns, budget, onboarding state | owner CRUD |
| `user_avoid_ingredients` | allergy/avoid relationships | owner CRUD |
| `consent_versions` | published consent text/version | public read active rows |
| `user_consents` | consent event พร้อม version/time | owner read, server insert/revoke |

### Product catalog

| Table | Purpose | Access |
|---|---|---|
| `brands` | normalized brand records | public read |
| `categories` | product taxonomy | public read |
| `products` | catalog and routine role | public read active rows |
| `ingredients` | ingredient reference | public read |
| `product_ingredients` | ordered product composition/key flags | public read |
| `skin_concerns` | normalized concern vocabulary | public read |
| `product_concerns` | product-to-concern suitability | public read |
| `store_offers` | external URL, price, availability, last updated | public read active rows |
| `ingredient_interactions` | versioned safety compatibility rules | authenticated read active version |

### Analysis

| Table | Purpose | Access |
|---|---|---|
| `skin_analyses` | lifecycle, summary, versions, retention metadata | owner read; server write |
| `skin_analysis_metrics` | normalized concern/score/value/confidence | owner read; server write |
| `analysis_events` | state transition audit without raw provider payload | owner read limited; server write |

`skin_analyses` ควรมีอย่างน้อย `id`, `user_id`, `status`, `source_object_path`, `consent_version`, `model_provider`, `model_version`, `normalizer_version`, `error_code`, `retain_source`, `started_at`, `completed_at`, `created_at` โดย path ไม่ถูกส่งใน public list responses หากไม่จำเป็น

### Routine and adherence

| Table | Purpose | Access |
|---|---|---|
| `user_products` | products owned by user | owner CRUD |
| `routines` | routine revision and ruleset version | owner read; server create/update status |
| `routine_days` | ordered cycle days and type | owner read |
| `routine_steps` | AM/PM ordered product/action steps with reason | owner read |
| `routine_step_completions` | daily completion event | owner CRUD |
| `daily_skin_checks` | dryness/redness/irritation report | owner CRUD |

## Important constraints

- Primary keys: UUID generated server-side
- Every user-owned row has non-null `user_id` referencing `auth.users(id)` with deliberate delete behavior
- Price stored as integer minor units plus ISO currency, not floating point
- Scores constrained to normalized range, e.g. `0..100`
- Status/type values use check constraints or enums with migration discipline
- Timestamps use `timestamptz` and server defaults
- One completion per `(user_id, routine_step_id, routine_date)`
- One current profile per user; routine revisions remain immutable after activation
- `source_object_path` unique per analysis to prevent accidental reuse
- External store URLs validated server-side against allowed protocols

## Index plan

- `products(status, category_id)` and search index appropriate to Thai/product names
- `store_offers(product_id, price_minor)` with partial index on available rows
- All user-owned history tables start with `user_id` in common query indexes
- `skin_analyses(user_id, created_at desc)`
- `routines(user_id, status, created_at desc)`
- `routine_step_completions(user_id, routine_date)`
- `daily_skin_checks(user_id, check_date desc)`

Index ต้องยืนยันด้วย query plans และข้อมูลจริง ไม่สร้าง index สำหรับทุก foreign key โดยอัตโนมัติ

## RLS policy matrix

| Data class | anon | authenticated | server |
|---|---|---|---|
| Active catalog | `SELECT` | `SELECT` | manage |
| Own profile/avoid list | none | own rows only | support workflows only |
| Own analysis/results | none | own rows `SELECT` | lifecycle writes |
| Own routine/completions | none | own rows; limited writes | generation writes |
| Consent versions | active `SELECT` | active `SELECT` | manage |
| Internal diagnostics | none | none | private schema only |

Policy pattern สำหรับ user-owned rows:

```sql
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id)
```

`TO authenticated` เพียงอย่างเดียวไม่ถือเป็น authorization และห้ามใช้ `user_metadata` ตัดสินสิทธิ์

## Storage design

| Bucket | Visibility | Content |
|---|---|---|
| `product-assets` | public/read-only | curated catalog images |
| `skin-analysis-source` | private | short-lived user face images |

Object path ของภาพวิเคราะห์:

```text
{user_id}/{analysis_id}/source.{ext}
```

Authenticated client insert/select/delete ได้เฉพาะ path ที่ segment แรกตรงกับ `auth.uid()` การ upsert ถ้าเปิดใช้ต้องมี INSERT, SELECT และ UPDATE policies ครบ แต่ MVP ควรใช้ immutable object path และปิด overwrite

## Deletion and retention

- Default: ลบ source image เมื่อ analysis completed/failed และหมด retry window
- ถ้าผู้ใช้ opt in: บันทึก expiry และมี scheduled deletion
- Account deletion: revoke sessions, cancel processing jobs, delete storage objects แล้วลบ/cascade user-owned rowsตามลำดับที่ทดสอบได้
- Audit logs เก็บเฉพาะ event metadata ที่จำเป็นและไม่เก็บ raw image/provider payload
- Product/catalog history ไม่ cascade ตามผู้ใช้

## Migration checklist

1. ตรวจ Supabase changelog และ CLI `--help`
2. สร้าง migration ผ่าน `supabase migration new <name>` เท่านั้น
3. สร้าง schemas/tables/constraints/indexes
4. Revoke defaults ตาม deployment model และ grant เท่าที่จำเป็น
5. Enable RLS และสร้าง policies ทุก exposed table
6. สร้าง private buckets และ storage policies
7. ทดสอบ anon, user A, user B และ server paths
8. รัน database/security advisors และแก้ findings
9. ตรวจ migration list และทดสอบ fresh reset

