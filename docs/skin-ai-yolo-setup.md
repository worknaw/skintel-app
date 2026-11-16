# เตรียม YOLO ตรวจสิว

สถานะ: ยังไม่มีชุดภาพสิวที่ได้รับสิทธิ์และยังไม่มี custom weights จึงยังไม่ใช่ระบบตรวจสิวที่ใช้งานได้จริง ห้ามใช้ YOLO pretrained ทั่วไปเป็นผลตรวจสิว

## ชุดข้อมูล

เตรียมภาพและ YOLO bounding boxes โดยให้ `images/` และ `labels/` อยู่โฟลเดอร์ระดับเดียวกัน ชื่อไฟล์ตรงกัน คลาสสิวเป็น `0` เท่านั้น ภาพที่ไม่มีสิวใช้ไฟล์ label ว่างได้ ต้องมีสิทธิ์ใช้ภาพใบหน้าและป้ายกำกับเพื่อฝึกและประเมินโมเดล บันทึกแหล่งที่มา ขอบเขตการใช้ ระยะเวลาเก็บ และหลักฐาน consent แยกจาก manifest

ตัวอย่าง manifest ส่วนตัว (อย่า commit ภาพหรือ manifest จริง):

```json
[
  {"participant_id":"person-001","consent_reference":"record-id","image":"a.jpg"}
]
```

รันด้วย Python 3.12:

```powershell
python scripts/skin_ai/prepare_yolo_split.py --manifest skin-ai-data/manifest.json --image-root skin-ai-data/images --output skin-ai-data/yolo-split
python -m unittest discover -s scripts/skin_ai -p test_prepare_yolo_split.py
```

สคริปต์ตรวจ label และแยกภาพตาม `participant_id` โดย seed คงที่ สร้าง `train.txt`, `val.txt`, `test.txt`, `data.yaml`, `summary.json` และไม่เขียนทับ output เดิม ตรวจจำนวนภาพ/บุคคล/คลาสแต่ละชุดก่อนฝึกจริง หาก Dataset มาจากหลายอุปกรณ์หรือแหล่งภาพ ควรตรวจ distribution เพิ่มด้วย

หลังตรวจสิทธิ์ใช้งาน Ultralytics และเลือก pretrained weights ที่อนุญาตสำหรับการขายสินค้าแล้ว จึงติดตั้ง Ultralytics ใน Python environment แยกและฝึก custom model:

```powershell
yolo detect train data=skin-ai-data/yolo-split/data.yaml model=YOUR_LICENSED_PRETRAINED_WEIGHTS.pt epochs=100 imgsz=640
yolo detect val data=skin-ai-data/yolo-split/data.yaml model=YOUR_CUSTOM_BEST.pt split=test
```

ห้าม deploy หรือแสดงตำแหน่งสิวในแอปจนกว่าจะตรวจผลบน test set ที่ไม่ใช้เลือกโมเดล รวมทั้งภาพไม่มีสิว ภาพแสงไม่ดี และผลตามสีผิว/อุปกรณ์ที่มีข้อมูลเพียงพอ
