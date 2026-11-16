# SkinCycle AI หลายโมเดล: ขั้นเตรียมข้อมูล

สถานะ: อยู่ระหว่างเตรียมงาน ยังไม่มี custom weights หรือหลักฐานความแม่นยำสำหรับสิวแต่ละชนิด รอยแดง รอยดำ หรือประเภทผิว รุ่นปัจจุบันยังเป็น YOLO prototype ตรวจเฉพาะจุดที่อาจเป็นสิว การบันทึกประวัติ prototype ยังต้อง deploy migration แยก

1. เก็บภาพหน้าตรง ด้านซ้าย และด้านขวา ภายใต้แสงและระยะใกล้เคียงกัน ไม่มีฟิลเตอร์ พร้อมสิทธิ์ใช้ภาพและแยกความยินยอมในการฝึกโมเดลออกจากการสแกนทั่วไป
2. สร้าง label สิวแบบ bounding box โดยผู้ประเมินที่ผ่านการปรับเกณฑ์ร่วมกัน กำหนดคลาสตามข้อมูลที่แยกได้จริง ไม่สมมติว่ารอยสิวทุกชนิดเป็นสิว
3. ระบุรอยแดงและรอยดำด้วย mask หากแยกไม่ได้ให้กำหนดว่าไม่สามารถประเมินได้ ไม่ใช้ mask จากโมเดลที่ยังไม่ตรวจสอบเป็นความจริง
4. เก็บ reference สำหรับแนวโน้มผิวมัน/แห้ง/ผสมโดยใช้แบบสอบถามและวิธีวัดที่กำหนดร่วมกับผู้เชี่ยวชาญ ไม่อนุมาน label จากรูปเดียว กรณีไม่ชัดเจนใช้ `unassessable`
5. แบ่งตามบุคคลก่อนฝึก โดยทุกภาพ ทุกมุม และทุกครั้งที่ถ่ายของคนเดียวกันอยู่ชุดเดียว จากนั้นตรวจคุณภาพ label และจำนวนแต่ละกลุ่มก่อนฝึก YOLO detection, segmentation และ classifier แยก
6. ประเมินบนชุด test ที่ไม่ใช้เลือกโมเดล: precision/recall ของสิวแต่ละชนิด, IoU/Dice ของ mask และ confusion matrix ของ classifier แยกอุปกรณ์ แสง และสีผิวเมื่อข้อมูลเพียงพอ เทียบกับผู้ประเมินอิสระ
7. ค่อยเชื่อมโมเดลที่ผ่านเกณฑ์เข้าระบบและระบุ `model_version` แยกแต่ละงาน โดยต้องประเมิน deployment, latency และ license ก่อนใช้งานจริง

## ตรวจ manifest แบบไม่เปิดเผยภาพ

สร้าง manifest JSON ใน `skin-ai-data/` ซึ่ง Git ข้ามไฟล์ และไม่ใส่ชื่อจริง ตัวอย่างข้อมูลจำลอง:

```json
[
  {"participant_id":"p1","session_id":"s1","image_id":"i1","consent_reference":"consent-id","split":"train","view":"front","tasks":["acne_detection","mark_segmentation","skin_type"],"skin_type_reference":"unassessable"},
  {"participant_id":"p2","session_id":"s2","image_id":"i2","consent_reference":"consent-id","split":"validation","view":"front","tasks":["acne_detection"]},
  {"participant_id":"p3","session_id":"s3","image_id":"i3","consent_reference":"consent-id","split":"test","view":"front","tasks":["mark_segmentation"]}
]
```

```powershell
python scripts/skin_ai/audit_multitask_dataset.py skin-ai-data/multitask-manifest.json
python -m unittest discover -s scripts/skin_ai -p test_audit_multitask_dataset.py
```

เครื่องมือแสดงเฉพาะจำนวนภาพ/ผู้เข้าร่วม/มุมในแต่ละ split และปฏิเสธการแบ่งคนเดียวกันข้าม split แต่ไม่ได้ตรวจสิทธิ์จริง เนื้อหาภาพ คุณภาพ label ความถูกต้องของ mask หรือความแม่นยำ ต้องตรวจแยกก่อนใช้
