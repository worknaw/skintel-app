# YOLO Acne Prototype สำหรับส่งโครงงาน

เอกสารนี้ใช้กับการสาธิตเท่านั้น ไม่ใช่ระบบวินิจฉัยโรค และผลการตรวจสิวต้องแสดงเป็นผลทดลองเสมอ

## สิ่งที่ใช้ตอนนี้

- checkpoint: `zikabyte/skin-problem-detection-demo` (`model.onnx`) จาก Hugging Face
- runtime: ONNX Runtime บน CPU ในเครื่อง
- API: `POST /scan` รับ JPEG แล้วคืนจำนวนและ bounding box ที่ normalize เป็น 0–1

โมเดลมีหลายคลาส แต่ SkinCycle รับกลับเฉพาะ `acne` เท่านั้น ไม่สามารถบอกผิวมัน ผิวแห้ง หรือผิวผสมได้ ความมัน/ความแห้งต้องใช้ classifier แยกที่มี weights และชุดข้อมูลที่ตรวจสอบได้

## ติดตั้งและรันในเครื่อง

หลังเตรียม Python 3.12 และ virtual environment แล้ว ให้ติดตั้ง dependencies:

```powershell
.\.venv-skin-ai\Scripts\python.exe -m pip install onnxruntime==1.24.2 opencv-python-headless==4.13.0.92 fastapi==0.128.8 uvicorn==0.40.0 Pillow==13.0.0 numpy==2.5.4
```

เก็บ `model.onnx` ไว้ที่ `scripts/skin_ai/models/skin-problem-yolo26.onnx` (โฟลเดอร์นี้ถูก Git ignore) แล้วเปิด service:

```powershell
.\.venv-skin-ai\Scripts\python.exe -m uvicorn scripts.skin_ai.serve_prototype_onnx:app --host 127.0.0.1 --port 8766
```

สำหรับ Android development build ให้เชื่อมพอร์ตด้วย:

```powershell
adb reverse tcp:8766 tcp:8766
```

API นี้รับเฉพาะ localhost พร้อม header `X-SkinCycle-Pilot: 1` และไม่บันทึกภาพลงดิสก์

## เปิดใช้ในแอป Android

เพิ่มบรรทัดนี้ในไฟล์ `.env` ของแอป แล้ว restart Metro:

```text
EXPO_PUBLIC_SKIN_SCAN_ENGINE=prototype-yolo
```

โหมดนี้ใช้ได้เฉพาะเครื่องพัฒนา เพราะแอปเรียก `127.0.0.1:8766` ผ่าน `adb reverse` เท่านั้น เมื่อเอาตัวแปรนี้ออก แอปจะกลับไปใช้ Gemini ตามเดิม

## ข้อจำกัด

- ใช้ได้เฉพาะ prototype ในรายวิชา จนกว่าจะทดสอบกับข้อมูลที่ได้รับอนุญาตและกลุ่มภาพจริง
- ห้ามนำจำนวนสิวไปตีความเป็น diagnosis หรือ acne severity ทางการแพทย์
- checkpoint ระบุ license แบบ AGPL-3.0 ใน metadata จึงเหมาะกับ prototype ส่งรายวิชาเท่านั้น ต้องเปลี่ยนเป็นโมเดล/ใบอนุญาตที่เหมาะสมก่อนใช้เชิงพาณิชย์
