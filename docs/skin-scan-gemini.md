# AI Skin Scan (Gemini)

ระบบนี้ใช้ Gemini Vision ประเมินลักษณะที่เห็นในภาพเบื้องต้น ยังไม่มีโมเดล YOLO ตรวจจำนวนหรือตำแหน่งสิว จึงไม่แสดงจุดบนภาพหรืออ้างจำนวนสิว ภาพใบหน้าไม่ถูกบันทึกใน Supabase; ประวัติเก็บเฉพาะผลและคำตอบแบบสอบถาม

## เปิดใช้งานแอป

1. ใช้ Node.js และติดตั้ง dependency ด้วย `npm install`
2. ตั้ง `EXPO_PUBLIC_SUPABASE_URL` และ `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ใน `.env` ตาม `.env.example`
3. รัน `npx expo start` หรือ development build ที่ตรงกับ Expo SDK 57
4. เข้าสู่ระบบ แล้วเปิดแท็บ **สแกนผิว** บน Android: ถ่ายหรือเลือกภาพ ตรวจภาพ ตอบแบบสอบถาม และกดยินยอมส่งภาพไป Gemini
5. ดูผลและประวัติจากหน้าเดียวกัน ประวัติสามารถลบผลสแกนรายครั้งได้

การทดสอบบนเครื่องจริงยังจำเป็นสำหรับสิทธิ์กล้อง ภาพหมุน/มิเรอร์ แสงจริง และการส่งภาพผ่านเครือข่ายมือถือ

## Supabase

โปรเจกต์ที่ใช้งานได้ deploy migrations `enable_gemini_skin_scan_consent`, `skin_chat_rate_limit` และ `delete_own_skin_scan` แล้ว พร้อม Edge Functions `skin-scan-gemini` และ `skin-chat-gemini` ที่บังคับ JWT

สำหรับโปรเจกต์ Supabase ใหม่ ให้ apply migrations ใน `supabase/migrations` ตามลำดับ แล้ว deploy Functions ทั้งสองด้วย `verify_jwt=true` ตั้ง Secret `GEMINI_API_KEY` ใน Supabase (ไม่ตั้งเป็น `EXPO_PUBLIC_...`) และตรวจว่า Secret มาตรฐาน `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` มีอยู่ใน Edge runtime การใช้ `supabase secrets set GEMINI_API_KEY=...` ควรทำจากเครื่องที่เชื่อถือได้และไม่บันทึกคีย์ใน Git

แอปส่งภาพหลังผู้ใช้กดยินยอมเท่านั้น Function ตรวจผู้ใช้, consent receipt, ขนาดและชนิดไฟล์ภาพ แล้วเรียก Gemini 3.8 Flash และตรวจรูปแบบ JSON ก่อนบันทึกผล ข้อมูลประวัติมี RLS ให้เจ้าของอ่านได้เท่านั้น การลบใช้ `delete_own_skin_scan` ที่ตรวจ `auth.uid()`

## ตรวจสอบ

รัน `npm run typecheck`, `npm run lint`, `npm test -- --runInBand` การทดสอบหน่วยยังไม่ยืนยันว่า Gemini ตอบจริงหรือภาพบนมือถือผ่าน flow ครบ ต้องทดสอบด้วยบัญชีผู้ใช้จริงบน Android ก่อนส่งใช้งานวงกว้าง

## YOLO ภายหลัง

หากได้ dataset ที่มีสิทธิ์ใช้งานและ bounding boxes ของสิวพร้อมเครื่องรันโมเดล จึงค่อยฝึก custom weights และเชื่อม Python API ตาม `scripts/skin_ai` ผล Gemini ปัจจุบันไม่มีพิกัดสำหรับวาด marker และห้ามนำข้อความ Gemini ไปสร้างพิกัดจำลอง
