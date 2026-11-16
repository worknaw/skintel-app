# ทดลอง SigLIP 2 ในเครื่อง

เป็นเครื่องมือวิจัยเท่านั้น ไม่มีการส่งภาพให้บริการภายนอก ไม่มีการฝึกโมเดล และยังไม่เชื่อมกับแอป ผลดิบไม่ใช่การวินิจฉัยหรือคะแนนสุขภาพผิว รุ่นที่ใช้ระบุ commit คงที่ใน `scripts/skin_ai/run_experiment.py` เพื่อให้ตรวจสอบซ้ำได้ โมเดลใช้ CPU และอาจใช้เวลาและหน่วยความจำมาก

## ติดตั้งบน Windows

ต้องมี Python 3.12 และพื้นที่สำหรับโมเดลประมาณ 1.5 GB พร้อม dependencies เพิ่มเติม ตัวอย่างคำสั่งใน PowerShell:

```powershell
py -3.12 -m venv .venv-skin-ai
.\.venv-skin-ai\Scripts\python.exe -m pip install torch==2.7.1 --index-url https://download.pytorch.org/whl/cpu
.\.venv-skin-ai\Scripts\python.exe -m pip install transformers==4.57.3 Pillow==11.3.0 sentencepiece==0.2.1
```

บนเครื่องที่ไม่มี `py` อาจใช้ Python 3.12 ที่ติดตั้งไว้โดยระบุพาธเต็ม การติดตั้งและดาวน์โหลดโมเดลต้องใช้อินเทอร์เน็ต แต่รูปภาพไม่ถูกอัปโหลด เครื่องมือตั้ง cache ภายใน `.venv-skin-ai/hf-cache`; หากต้องการเปลี่ยนให้ระบุ `--cache-dir`

## ทดสอบการติดตั้งด้วยภาพที่ไม่ใช่ใบหน้า

สร้างโฟลเดอร์ `skin-ai-data` ภายในโปรเจกต์ แล้วใช้:

```powershell
.\.venv-skin-ai\Scripts\python.exe scripts/skin_ai/run_experiment.py --manifest scripts/skin_ai/synthetic-smoke-manifest.json --image-root assets/images --output skin-ai-data/synthetic-new-scores.json --allow-model-download
```

ต้องใช้ `--allow-model-download` เฉพาะตอนดาวน์โหลดโมเดล/processor เข้าสู่ cache ครั้งแรก การรันหลังจากนั้นควรตัด flag นี้ออกเพื่อทำงานแบบ offline; เลือกชื่อไฟล์ output ใหม่ทุกครั้ง เครื่องมือไม่เขียนทับไฟล์ที่มีอยู่ ผลจากโลโก้นี้ใช้ตรวจเฉพาะการทำงานของโปรแกรม ไม่มีความหมายทางผิวหนัง

หมายเหตุ: ตัวรันใช้ `max_length=64` ตามรูปแบบที่ผู้พัฒนาโมเดลแนะนำ และระบุ prompt version `skin-observation-experiment-v2` ผลที่รันก่อนหน้านี้ด้วย v1 ไม่ควรนำมารวมกับผล v2 หรือใช้ calibration ร่วมกัน

ทดสอบสายงาน benchmark ต่อจากผลโลโก้ได้ด้วย calibration สมมติที่ใช้ตรวจโค้ดเท่านั้น ห้ามนำค่าจากไฟล์ตัวอย่างนี้ไปใช้กับภาพจริง:

```powershell
.\.venv-skin-ai\Scripts\python.exe scripts/skin_ai/prepare_benchmark.py --scores skin-ai-data/synthetic-new-scores.json --calibration scripts/skin_ai/synthetic-smoke-calibration.json --output skin-ai-data/synthetic-smoke-benchmark.json
node scripts/skin-ai-benchmark.mjs skin-ai-data/synthetic-smoke-benchmark.json
```

## ทดลองข้อมูลที่มีสิทธิ์ใช้งาน

สร้าง manifest JSON ในพื้นที่ส่วนตัว โดยใช้รหัสสุ่มแทนชื่อ/อีเมลและ path เป็นไฟล์ใต้ image root เท่านั้น ตัวอย่างโครงสร้าง (ค่าเป็นตัวอย่าง ไม่ใช่ข้อมูลจริง):

```json
{
  "datasetVersion": "study-v1",
  "split": "validation",
  "images": [{
    "participantId": "p001",
    "imageId": "i001",
    "path": "i001.jpg",
    "reference": {"visible_acne": "observed", "visible_redness": "unassessable"}
  }]
}
```

อ้างอิงจากผู้ประเมินอิสระตาม `skin-ai-evaluation-protocol.md` แยกคนใน validation และ test ตั้งแต่ต้น ห้ามแสดงผลให้ผู้ใช้จริง โฟลเดอร์ `skin-ai-data/` ถูก Git ข้าม แต่ไม่ใช่การเข้ารหัสและไม่แทนมาตรการควบคุมข้อมูล

```powershell
.\.venv-skin-ai\Scripts\python.exe scripts/skin_ai/run_experiment.py --manifest skin-ai-data/manifest.json --image-root skin-ai-data/images --output skin-ai-data/scores.json
```

ผลคือ raw logit และ margin ระหว่างสองข้อความ ไม่ใช่ความน่าจะเป็น เครื่องมือไม่ได้ตรวจใบหน้า แสง หรือคุณภาพภาพจริง ต้องตรวจแยกก่อนนำเข้า และผลอาจผิดโดยไม่มีสัญญาณเตือน

## เชื่อม benchmark หลังได้เกณฑ์จาก validation

เลือกค่า `notObservedAtOrBelow` และ `observedAtOrAbove` แยกแต่ละ finding จาก validation เท่านั้น โดย low ต้องน้อยกว่า high ช่วงระหว่างสองค่าถือว่า `unassessable` บันทึกไฟล์ calibration ที่มี `calibrationSplit: "validation"`, `calibrationDatasetVersion`, `modelVersion`, `promptVersion` และ `thresholds` (ไม่มี threshold สำเร็จรูปเพราะยังไม่มีข้อมูลทดสอบจริง)

```powershell
.\.venv-skin-ai\Scripts\python.exe scripts/skin_ai/prepare_benchmark.py --scores skin-ai-data/scores.json --calibration skin-ai-data/calibration.json --output skin-ai-data/benchmark.json
node scripts/skin-ai-benchmark.mjs skin-ai-data/benchmark.json
```

ผู้ทดลองต้องตรวจว่าบุคคลในชุด test ไม่ซ้ำ validation เอง เครื่องมือยังไม่ตรวจ data leakage หรือคำนวณช่วงความไม่แน่นอน และไม่ได้ยืนยันว่าข้อมูล/consent ถูกต้องโดยอัตโนมัติ

## สำรวจ ACNE04 สำหรับงานวิชาการ

ชุด [ACNE04](https://github.com/xpwu95/LDL) ระบุการใช้เพื่อการศึกษา; ต้องตรวจสิทธิ์เพิ่มเติมสำหรับการใช้นอกการศึกษา ชุดที่จัดรูปแบบใหม่โดย [Layered Labs](https://huggingface.co/datasets/Layered-Labs/ACNE04) ใช้ตัวอย่างจากฝั่ง train ของชุดดังกล่าวเท่านั้น คำสั่งต่อไปนี้อ่านภาพผ่านเครือข่ายเข้าหน่วยความจำ ประมวลผลด้วยโมเดลในเครื่อง แล้วเก็บเฉพาะคะแนนดิบและ metadata ในไฟล์ output ที่ Git ข้าม ไม่บันทึกภาพหรือ URL แบบ signed ลงไฟล์:

```powershell
.\.venv-skin-ai\Scripts\python.exe scripts/skin_ai/explore_acne04.py --limit 10 --output skin-ai-data/acne04-exploratory-v1.json
```

ผลจาก 10 แถวแรกเป็น convenience sample ไม่ใช่การสุ่ม ไม่ยืนยันว่าผู้เข้าร่วมแต่ละแถวเป็นคนละคน และไม่เหมาะใช้ตั้ง threshold หรือวัดความแม่นยำต่อผู้ใช้จริง ชุดนี้ไม่มี label ของโครงการสำหรับรอยแดงหรือกลุ่มไม่มีสิวที่ยืนยันแล้ว ห้ามนำคะแนนมาอ้างประสิทธิภาพหรือใช้กับผู้ใช้จริง

## สแกนผ่านกล้อง Android รุ่นทดสอบ

หน้าสแกนใน Android development build ใช้กล้องหน้าและ SigLIP 2 บนคอมพิวเตอร์ผ่าน USB แอปแสดงข้อความขอความยินยอมก่อนเปิดกล้องและให้ผู้ทดสอบกดถ่ายเอง ตัวประมวลผลตรวจชนิดไฟล์ ขนาดภาพ และแสงในภาพตามเกณฑ์เบื้องต้น แล้วคืนคะแนนดิบสองรายการ การตรวจตำแหน่งใบหน้าพึ่งกรอบและผู้ถ่าย แอปลบไฟล์ชั่วคราวหลังประมวลผลหรือยกเลิก ตัวประมวลผลอ่านภาพในหน่วยความจำ

1. เปิดตัวประมวลผลจากโฟลเดอร์โปรเจกต์ใน PowerShell แล้วรอข้อความ `SkinCycle research scanner ready`

   ```powershell
   .\.venv-skin-ai\Scripts\python.exe scripts/skin_ai/serve_local_scan.py
   ```

2. ต่อมือถือที่เปิด USB debugging แล้วเชื่อมพอร์ตสำหรับเครื่องประมวลผลและ Metro

   ```powershell
   adb devices
   adb reverse tcp:8765 tcp:8765
   adb reverse tcp:8081 tcp:8081
   npx expo run:android
   ```

   ถ้า `adb` ไม่อยู่ใน PATH ให้ใช้ `adb.exe` ใน Android SDK โฟลเดอร์ `platform-tools` ต้องบิลด์ใหม่เพราะเพิ่ม native module `expo-camera` เปิดแอปในโหมดพัฒนา ไปที่แท็บสแกนผิว แล้วทดสอบอนุญาตกล้อง ถ่ายภาพ ยกเลิก สแกนใหม่ และถอด USB

3. ปิดตัวประมวลผลด้วย Ctrl+C เมื่อจบการทดลอง เซิร์ฟเวอร์ฟังที่ `127.0.0.1:8765` และใช้เฉพาะ Android development build สภาพแวดล้อมนี้เป็นการทดลองบนอุปกรณ์ของผู้พัฒนา

## สแกนผ่าน HTTPS ใน Android รุ่นทดสอบ

ใช้ตัวประมวลผล Python บนโฮสต์ที่มือถือเข้าถึงได้ และกำหนดใบรับรอง TLS ที่ Android เชื่อถือ เครื่องประมวลผลโหลด SigLIP 2 รุ่นเดียวกับ USB จากแคชที่เตรียมไว้ ตรวจ access token กับ Supabase Auth และอนุญาตเฉพาะ UUID ผู้ทดสอบที่กำหนด ประมวลผล JPEG ในหน่วยความจำ รับงานทีละภาพ และเว้นอย่างน้อย 5 วินาทีต่อบัญชีระหว่างคำขอ ผลดิบกลับไปที่แอปโดยไม่มีการบันทึกรูปหรือผลใน Supabase

1. ติดตั้ง dependencies ของตัวรัน HTTPS และเตรียมแคชโมเดลตามขั้นตอนด้านบน

   ```powershell
   .\.venv-skin-ai\Scripts\python.exe -m pip install -r scripts/skin_ai/requirements-https.txt
   ```

2. ตั้งค่าที่เครื่องประมวลผลด้วย URL และ publishable key ของโครงการ Supabase เดียวกับแอป ใช้ UUID จากหน้า Authentication → Users สำหรับบัญชีทดสอบ

   ```powershell
   $env:SUPABASE_URL = "https://your-project-ref.supabase.co"
   $env:SUPABASE_PUBLISHABLE_KEY = "sb_publishable_your_publishable_key"
   $env:SKIN_SCAN_PILOT_USER_IDS = "your-test-user-uuid"
   .\.venv-skin-ai\Scripts\python.exe scripts/skin_ai/serve_https_scan.py --host 0.0.0.0 --port 8443 --cert path/to/fullchain.pem --key path/to/privkey.pem
   ```

   การ bind ทุกอินเทอร์เฟซใช้เมื่อโฮสต์พร้อมรับการเชื่อมต่อ ค่าเริ่มต้นของคำสั่งคือ loopback สำหรับตรวจในเครื่อง

3. เพิ่ม `EXPO_PUBLIC_SKIN_SCAN_URL=https://scan.example.com:8443` ใน `.env` โดยใช้ชื่อโฮสต์ตามใบรับรอง แล้วเริ่ม Expo ใหม่ ให้มือถือเปิด dev client จาก Metro ผ่าน Wi-Fi หรือโหลด bundle ผ่านเครือข่ายที่ตั้งไว้ การประมวลผลจะส่งรูปไปยัง URL ที่แสดงในหน้าขอความยินยอม โดยไม่ต้องใช้ USB หรือ `adb reverse` สำหรับ scanner หากเว้นตัวแปรไว้จะใช้โหมด USB เดิม

การยินยอมในรุ่นทดสอบเป็นการกดยืนยันก่อนเปิดกล้องในแต่ละรอบและส่งเวอร์ชันคำยินยอมไปกับคำขอ ระบบยังไม่ได้ออก consent receipt หรือเก็บประวัติบน Supabase ให้ทดสอบด้วยภาพสังเคราะห์ก่อน และใช้ภาพผู้ทดสอบที่ยินยอมเมื่อยืนยันเงื่อนไขการประมวลผลแล้ว

## เงื่อนไขก่อนเปิดใช้กับผู้ใช้จริง

1. ทดสอบกับภาพที่ได้รับอนุญาต มี label อิสระ และแยกชุดตามบุคคล วัด false positives, recall, อัตรางดประเมิน และผลแยกตามอุปกรณ์ แสง และสีผิวก่อนเลือกเกณฑ์
2. ยืนยันการตรวจใบหน้าและคุณภาพภาพจากอุปกรณ์จริง พร้อมทดสอบการอนุญาต การปฏิเสธ การออกจากหน้า และการลบไฟล์หลังทุกเส้นทาง
3. เมื่อผลการประเมินผ่านเกณฑ์ ให้กำหนดผู้ประมวลผล ระยะเวลาเก็บ และกระบวนการถอน consent จากนั้นเชื่อม backend ที่ตรวจสิทธิ์และจำกัดคำขอกับตาราง Supabase ที่เตรียมไว้ พร้อมทดสอบ RLS การลบ และการหมดอายุไฟล์ก่อนเปิดอัปโหลด
