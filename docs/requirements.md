# SkinCycle MVP Requirements

สถานะ: Draft v1  
อ้างอิง UX/UI: [`design.md`](design.md)

## เป้าหมาย

พิสูจน์ว่าแอปสามารถพาผู้ใช้จากการค้นพบผลิตภัณฑ์ ไปสู่การเข้าใจสภาพผิวและทำตามกิจวัตรที่ปลอดภัยได้อย่างต่อเนื่อง โดยไม่อ้างว่าเป็นการวินิจฉัยทางการแพทย์

## Primary flow

```text
Guest เปิดแอป
  → ดู/ค้นหาผลิตภัณฑ์
  → เปิดรายละเอียดและเปรียบเทียบราคา
  → เลือกวิเคราะห์ผิว
  → สมัครหรือเข้าสู่ระบบ
  → ให้ความยินยอมและกรอก Skin Profile
  → อัปโหลดภาพเพื่อวิเคราะห์
  → ดูผลพร้อมคำอธิบายและข้อจำกัด
  → สร้าง Skin Cycling Routine
  → เช็กขั้นตอน AM/PM รายวัน
```

## In scope

### Public product discovery

- Home และหมวดหมู่ผลิตภัณฑ์
- ค้นหาจากชื่อ แบรนด์ และส่วนผสม
- ตัวกรองพื้นฐาน: หมวดหมู่, skin concern และช่วงราคา
- Product detail, ingredient highlights และราคาอ้างอิงจากร้านภายนอก
- เปิดร้านภายนอกโดยไม่มี checkout ภายในแอป

### Account and profile

- Email/password authentication
- Guest-first navigation และ return-to-intent หลัง login
- First-time skin onboarding
- Skin concerns, allergy/avoid list และงบประมาณ
- Consent ที่แยกจาก Terms และบันทึก version/time

### Skin analysis

- ถ่ายหรือเลือกรูปหนึ่งภาพ
- ตรวจชนิดไฟล์, ขนาด และคุณภาพภาพขั้นต้น
- ประมวลผลผ่าน server-side AI adapter
- แสดง status progress, summary, skin type, concerns และ normalized scores
- ระบุ model/version และ disclaimer ในผลลัพธ์
- ลบรูปหลังวิเคราะห์สำเร็จเป็นค่าเริ่มต้น เว้นแต่ผู้ใช้ยินยอมเก็บรูปอย่างชัดเจน

### Routine

- สร้าง routine จาก profile, analysis, avoid list, budget และ products owned
- ใช้ deterministic safety rules ก่อน AI explanation
- Calendar แบบ Active, Recovery, Rest และ Hydration
- รายการ AM/PM และการเช็ก completion
- แทนสินค้าตาม routine role, compatibility และ budget
- Daily skin check และ fallback เป็น Recovery เมื่อมี irritation

## Out of scope สำหรับ MVP

- การวินิจฉัยโรคหรือคำแนะนำแทนแพทย์
- Checkout, payment, shipping และ inventory ร้านค้า
- Price scraping แบบ real-time
- Barcode scanner และ custom product
- Social feed, chat และ clinician portal
- Before/after image comparison อัตโนมัติ
- Push notification automation ขั้นสูง
- Generative AI ที่แก้ routine โดยข้าม safety rules

## Success criteria

- Guest เปิด Product Detail ได้โดยไม่ login
- Protected intent กลับมาทำต่อหลัง authentication สำเร็จ
- ผู้ใช้เข้าถึงได้เฉพาะ profile, รูป, analysis และ routine ของตนเอง
- AI request เดิมที่ retry ไม่สร้าง analysis ซ้ำ
- Routine ไม่จัดคู่ ingredient ที่ safety rules ระบุว่าขัดกัน
- ผู้ใช้เห็นเหตุผลของ recommendation และราคาที่ใช้คำนวณ
- ผู้ใช้ลบบัญชีและข้อมูลส่วนบุคคลตาม retention policy ได้
- Critical flow ผ่าน integration tests และทดสอบบน Android/iOS จริงอย่างน้อยอย่างละหนึ่งเครื่อง

## Non-functional targets

- TypeScript strict mode และไม่มี type error
- หน้า public แสดง cached/mock fallback ได้เมื่อ API ล้มเหลว
- รายการผลิตภัณฑ์รองรับ pagination; ห้ามโหลดฐานข้อมูลทั้งหมดเข้าหน่วยความจำ
- API response ที่รับจากภายนอกต้องผ่าน runtime validation
- ไม่มี secret key, service role key หรือ AI provider key ใน mobile bundle
- Log ห้ามบันทึกรูปใบหน้า, signed URL, access token หรือข้อมูลสุขภาพแบบละเอียด

## Open decisions ก่อนเริ่ม AI จริง

1. AI provider/model และรูปแบบผลลัพธ์ที่ได้รับอนุมัติจากอาจารย์
2. Retention ของภาพกรณีผู้ใช้เลือกเก็บ และขั้นตอนลบบัญชี
3. กลุ่มอายุขั้นต่ำและข้อความ consent ภาษาไทย
4. แหล่งข้อมูลผลิตภัณฑ์ ราคา และเงื่อนไขการใช้ข้อมูล
5. Safety rule owner และแหล่งอ้างอิงทางวิชาการ
