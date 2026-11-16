# Deploy YOLO prototype บน Vercel

เอกสารนี้ทำให้ APK เรียก YOLO ผ่าน HTTPS ได้โดยไม่ต้องเปิด Python, Metro, USB หรือ `adb reverse` บนคอมพิวเตอร์ ใช้สำหรับโครงงานเท่านั้น: โมเดลตรวจเฉพาะตำแหน่งที่อาจเป็นสิว ไม่วินิจฉัยโรค และ license ของ checkpoint ต้องตรวจสอบก่อนใช้เชิงพาณิชย์

## สิ่งที่เตรียมไว้แล้ว

- `api/skin_scan.py`: Vercel Python/FastAPI function
- `scripts/skin_ai/models/skin-problem-yolo26.onnx`: โมเดล ONNX ที่ deployment ต้องมี
- `requirements.txt`: dependencies ฝั่ง Python
- `vercel.json`: รวมโมเดลเข้ากับ function และตั้ง timeout 30 วินาที โดยรักษา config build ของ admin เดิม
- แอปเลือก endpoint จาก `EXPO_PUBLIC_SKIN_SCAN_API_URL` และส่ง Supabase access token ทุกครั้ง

Endpoint ไม่เปิดให้ anonymous ใช้: server เรียก Supabase `/auth/v1/user` เพื่อตรวจ Bearer token ก่อนประมวลผล และจำกัดประมาณ 8 requests ต่อผู้ใช้ต่อ 60 วินาทีต่อ function instance ภาพไม่ถูกบันทึกลงดิสก์หรือ Supabase

## Deploy

1. Commit และ push ไฟล์ทั้งหมด รวมถึง `scripts/skin_ai/models/skin-problem-yolo26.onnx` ขนาดประมาณ 10 MB ไป GitHub (ไฟล์นี้ถูกตั้งให้ไม่ถูก ignore แล้ว)
2. Import repository เข้า Vercel เป็น project เดียวกับโปรเจกต์นี้
3. ที่ **Project → Settings → Environment Variables** เพิ่ม:

   ```text
   SUPABASE_URL=https://igoyevjhwqitomlyyedy.supabase.co
   SUPABASE_PUBLISHABLE_KEY=<ค่า EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ของคุณ>
   ```

   ห้ามใส่ `service_role` key
4. Deploy แล้วเปิด URL นี้เพื่อตรวจโมเดล (ต้องได้ `ready: true`):

   ```text
   https://YOUR-PROJECT.vercel.app/api/skin_scan
   ```

## ทำ APK ที่ไม่ต้องต่อคอม

1. ใน `.env` ของแอป ตั้ง URL ที่ deploy สำเร็จแล้ว:

   ```text
   EXPO_PUBLIC_SKIN_SCAN_ENGINE=prototype-yolo
   EXPO_PUBLIC_SKIN_SCAN_API_URL=https://YOUR-PROJECT.vercel.app
   ```

2. สร้าง APK ใหม่หลังแก้ `.env` เพราะค่า `EXPO_PUBLIC_*` ถูกฝังลง bundle ตอน build
3. ติดตั้ง APK, login ด้วย Supabase และสแกนได้ทันทีโดยไม่ต้องเปิด service ในเครื่อง

## ข้อจำกัด Vercel

- ภาพถูกย่อและบีบอัดในแอปให้ต่ำกว่า 4 MB เพื่อไม่ชนข้อจำกัด request body ของ Vercel
- cold start อาจทำให้การสแกนครั้งแรกช้ากว่าปกติ เพราะต้องโหลด ONNX Runtime และโมเดล
- rate limit ใน prototype เป็น in-memory ต่อ instance; ก่อนเปิดใช้งานจริงให้ย้ายไปใช้ shared rate limiting และเปลี่ยน checkpoint/licensing ที่เหมาะสม
