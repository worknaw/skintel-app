# SkinCycle

แอป Android React Native + Expo สำหรับแนะนำ Skin Cycling, เช็กอินรูทีน, ร้านสกินแคร์ และวิเคราะห์ผิวเบื้องต้นด้วย Gemini ผ่าน Supabase Edge Function

> ระบบสแกนใช้ Gemini ผ่าน Supabase Edge Function เพื่อประเมินเบื้องต้น ไม่ใช่การวินิจฉัยโรค

## ความต้องการ

- Node.js 20 ขึ้นไป (แนะนำ npm 11 ตาม `packageManager` ใน `package.json`)
- Expo Go หรือ Android development build สำหรับรันระหว่างพัฒนา
- บัญชี Supabase ของโปรเจกต์ (สำหรับ Auth และข้อมูลแอป)
- Google Maps API key เฉพาะกรณีต้องเปิดฟังก์ชันแผนที่/ปักหมุดที่อยู่ใน Android

## รันบนเครื่องใหม่

```powershell
git clone https://github.com/067Nawapat/skincycle.git
cd skincycle
Copy-Item .env.example .env
npm ci
npx expo start
```

จากหน้าจอ Expo ให้สแกน QR, กด `a` สำหรับ Android emulator/อุปกรณ์ที่ต่อไว้ หรือใช้ development build ที่มีอยู่

### ตั้งค่า `.env`

ห้ามนำ `.env` จริงขึ้น GitHub ให้คัดลอกจาก `.env.example` แล้วใส่ค่าจริงของ Supabase:

```text
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Skin Scan ใช้ Gemini ผ่าน Supabase Edge Function โดยตรง จึงไม่ต้องเปิด Python, USB หรือ `adb reverse`.
ตั้ง secret `GEMINI_API_KEY` ใน Supabase และ deploy function `skin-scan-gemini` โดยห้ามใส่คีย์ในแอป

สำหรับแผนที่ Android ให้สร้าง key ของตนเองใน Google Cloud แล้วจำกัด key ด้วย package name `com.justtttlll.myapp` และ signing SHA-1:

```text
GOOGLE_MAPS_ANDROID_API_KEY=YOUR_ANDROID_RESTRICTED_KEY
```

หลังเปลี่ยนค่า `.env` ให้ restart Metro เสมอ

## Skin Scan ผ่าน Gemini Vision

ผู้ใช้ต้อง login และกดยินยอมก่อนสแกน แอปจะส่งภาพและข้อมูล onboarding ไปยัง Supabase Edge Function `skin-scan-gemini`
เพื่อให้ Gemini คืนผลแบบ JSON ตาม schema ที่ตรวจสอบแล้ว

- Edge Function ตรวจ JWT ของ Supabase และเก็บคีย์ Gemini ไว้บน server เท่านั้น
- ภาพไม่ถูกเก็บใน Supabase; เก็บเฉพาะผลสรุปและประวัติการสแกนที่ผู้ใช้ยินยอม
- ผลลัพธ์เป็นตัวชี้วัดจากภาพเพื่อช่วยแนะนำสกินแคร์ ไม่ใช่ผลทางการแพทย์
- ผลและ Skin Cycling จะถูกบันทึกพร้อมกันด้วย database transaction; ภาพใบหน้าไม่ได้ถูกเก็บใน Supabase

## ติดตามพัสดุไปรษณีย์ไทย

หน้า **คำสั่งซื้อของฉัน** แสดงปุ่มตรวจสอบสถานะเมื่อคำสั่งซื้อมีเลขพัสดุ ไปรษณีย์ไทย และสถานะจัดส่งแล้ว แอปเรียก Supabase Edge Function `track-shipment`; function ตรวจผู้ใช้และเจ้าของคำสั่งซื้อก่อนเรียก Thailand Post API แล้วส่ง timeline ล่าสุดกลับมา โดยไม่เก็บ timeline หรือ API key ในแอป

ก่อนเปิดใช้ ให้เพิ่ม secret `THAILAND_POST_API_KEY` ใน Supabase Dashboard → Edge Functions → Secrets แล้ว deploy function:

```powershell
npx supabase functions deploy track-shipment --project-ref <PROJECT_REF>
```

ห้ามใส่ Thailand Post API key ใน `.env` ของแอป, `EXPO_PUBLIC_*` หรือ GitHub

## สร้าง Android APK

สำหรับ APK ทดสอบติดตั้งเอง ใช้ EAS profile `preview`:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

หาก fork โปรเจกต์ไปใช้ Expo account ของตนเอง ให้เชื่อม EAS project ก่อน:

```powershell
npx eas-cli@latest init --non-interactive
```

EAS จะแสดงลิงก์ดาวน์โหลด APK เมื่อ build สำเร็จ APK ที่สร้างแล้วใช้ Skin Scan ผ่าน Gemini Edge Function ได้โดยไม่ต้องต่อคอมพิวเตอร์

## ตรวจคุณภาพโค้ด

```powershell
npm run typecheck
npm run lint
npm test
```

## คำสั่งที่ใช้บ่อย

```powershell
# เริ่ม Expo พร้อมล้าง cache
npx expo start -c

# รัน Android แบบ development build
npx expo run:android

# ดูสถานะ EAS builds
npx eas-cli@latest build:list --platform android --limit 5
```

## ความปลอดภัย

- ห้ามใส่ `SUPABASE_SERVICE_ROLE_KEY`, Gemini API key หรือ key ลับใด ๆ ในแอปมือถือหรือ GitHub
- `EXPO_PUBLIC_*` อ่านได้จาก client bundle จึงใช้ได้เฉพาะค่า public เช่น Supabase publishable key และ URL
- Google Maps key ต้องจำกัด Android package/SHA-1 ก่อนใช้จริง
