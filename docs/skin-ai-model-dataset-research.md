# ตัวเลือกโมเดลและข้อมูลสำหรับ SkinCycle

สำรวจ 7 พฤศจิกายน 2026 เพื่อโครงการทดลอง ยังไม่ได้ดาวน์โหลด ฝึก หรือทดสอบโมเดลเหล่านี้กับภาพผู้ใช้ และยังไม่ยืนยันการใช้เพื่อร้านค้า

| งาน | ตัวเลือก | สิ่งที่มี | ข้อจำกัดและสิทธิ์ |
| --- | --- | --- | --- |
| ตรวจตำแหน่งสิว | [ACNE04 จัดรูปแบบโดย Layered Labs](https://huggingface.co/datasets/Layered-Labs/ACNE04) และ [ผู้สร้างต้นฉบับ](https://github.com/xpwu95/LDL) | 1,457 ภาพ พร้อมกรอบรอยสิวและระดับความรุนแรงของภาพ | ใช้เพื่อการศึกษา/วิจัยเท่านั้น การใช้เชิงพาณิชย์ต้องติดต่อเจ้าของ; กรอบสิวเป็นคลาสเดียว ไม่ใช่ชนิดสิวแยก ไม่พบ patient ID ที่ยืนยันการแบ่งตามบุคคลใน dataset card และไม่มีภาพไร้สิวที่ยืนยันแล้ว |
| ตรวจสิวหลายชนิด | [AcneSCU งานและ repository ผู้สร้าง](https://github.com/pingguokiller/acnedetection) | งานวิจัยระบุภาพความละเอียดสูงและรอยสิวหลายชนิด | ต้องตรวจว่าดาวน์โหลดได้จริง สิทธิ์ภาพ/annotation และเงื่อนไขโมเดลก่อนใช้; ยังไม่ได้ตรวจชุดจริงและห้ามสมมติว่าอนุญาตใช้งานเชิงพาณิชย์ |
| แนวโน้มผิว | [dima806 skin types image detection](https://huggingface.co/dima806/skin_types_image_detection) | ViT ที่ model card ระบุ dry/normal/oily และ Apache-2.0 | ไม่มี class ผิวผสม; ผู้สร้างรายงาน accuracy 65.34% บนชุดทดสอบของเขา ไม่ใช่ผลตรวจ SkinCycle; ต้องตรวจต้นกำเนิดและสิทธิ์ชุดฝึก แบ่งตามบุคคล และทดสอบด้วย reference อิสระก่อนนำไปใช้จริง |
| Segmentation สิว | [Acnes U-Net/ResNet34](https://github.com/rihem-bs02/Acnes) | ตัวอย่างโครงสร้างระบบ segmentation รอยลักษณะคล้ายสิว | ไม่ใช่โมเดล segmentation รอยแดง/รอยดำ แหล่งและสิทธิ์ mask ต้องตรวจ และ repository ระบุว่าไม่ได้รับการตรวจสอบทางคลินิก |
| ข้อมูลเชิงพาณิชย์ | [Nexdata facial skin defects](https://github.com/Nexdata-AI/26090-Images-Human-Facial-Skin-Defects-Data) | ผู้ให้บริการระบุ 26,090 ภาพและ labels รวม acne marks | เป็น commercial license ต้องสอบถามราคา ขอบเขตสิทธิ์ และตรวจว่ามี mask/patient IDs หรือไม่; จำนวนและคุณภาพเป็นคำกล่าวของผู้จำหน่าย ยังไม่ได้ตรวจอิสระ |
| ความหลากหลายของสีผิว | [Google SCIN](https://github.com/google-research-datasets/scin) | ภาพสภาพผิวและข้อมูลสีผิวสำหรับงานวิจัย | มีข้อตกลงเฉพาะ ไม่ใช่ dataset ผิวมัน/แห้ง และไม่ควรสมมติว่ามี mask รอยแดง/รอยดำหรือใช้แทนภาพเซลฟีของผู้ใช้ได้ |

## ข้อเสนอสำหรับโครงงาน

เริ่มทดลอง detection ด้วย ACNE04 เฉพาะการศึกษาในสภาพแวดล้อมส่วนตัว โดยตรวจสิทธิ์ รูปแบบ label และความเสี่ยงภาพซ้ำหรือคนเดียวกันข้ามชุดก่อนฝึก แยก test ภาพอาสาสมัครที่ได้รับความยินยอมเพื่อดูผลกับมือถือจริง ไม่ใช้โมเดลหรือข้อมูลวิจัยที่จำกัดสิทธิ์กับร้านค้าจนตรวจสิทธิ์อนุญาตแล้ว

ใช้โมเดล ViT เป็น baseline ทดลองในเครื่องเท่านั้น โดยเปรียบเทียบกับข้อมูลอ้างอิงอิสระและ onboarding ไม่ตีความคะแนน softmax เป็นความแม่นยำหรือบอกผิวผสมจากโมเดลนี้ ส่วนรอยแดงและรอยดำยังไม่พบ dataset แบบ mask สาธารณะที่ยืนยันสิทธิ์และตรงโจทย์ จึงต้องหาเพิ่มหรือเตรียมภาพและ mask ที่ได้รับสิทธิ์เอง

ผล YOLO prototype และสูตรคะแนนจากจำนวนจุดในแอปเดิมยังไม่มีหลักฐานการตรวจสอบว่าเป็นคะแนนสุขภาพผิวหรือเกณฑ์ปรับ routine และควรปรับก่อนใช้งานกับผู้ใช้จริง รูปภาพและข้อมูลส่วนบุคคลไม่ควรถูกนำเข้า Git

## ทดลอง baseline ประเภทผิวในเครื่อง

สคริปต์ `scripts/skin_ai/skin_type_baseline.py` อ่านภาพที่มีสิทธิ์จากเครื่องเท่านั้น ไม่อัปโหลดภาพ และเก็บผลรายภาพโดยไม่เก็บรูป ต้องมี Python พร้อม dependencies จาก `scripts/skin_ai/requirements.txt` และไฟล์ manifest ที่ได้รับความยินยอมแยกสำหรับงานวิจัย reference ต้องมาจากข้อมูลอิสระที่กำหนดไว้ก่อนดูผล ไม่ใช่จากโมเดล

```json
[
  {"participant_id":"p1","image_id":"i1","consent_reference":"record1","split":"validation","reference":"dry","path":"i1.jpg"},
  {"participant_id":"p2","image_id":"i2","consent_reference":"record2","split":"test","reference":"combination","path":"i2.jpg"}
]
```

บันทึก manifest ไว้ใน `skin-ai-data/` แล้วใช้ revision แบบ commit ที่ตรวจสอบจากหน้า Files ของโมเดล (`5aace4f` ณ วันที่สำรวจ) การรันครั้งแรกที่ต้องดาวน์โหลดไฟล์โมเดลขนาดประมาณ 343 MB ใช้คำสั่ง:

```powershell
python scripts/skin_ai/skin_type_baseline.py --manifest skin-ai-data/skin-type-manifest.json --image-root skin-ai-data/images --output skin-ai-data/skin-type-results.json --revision 5aace4f --allow-model-download
```

เมื่อ cache แล้ว สามารถรันแบบออฟไลน์โดยตัด `--allow-model-download` ออกและใช้ชื่อ output ใหม่ สคริปต์ปฏิเสธผู้เข้าร่วมเดียวกันที่อยู่ทั้ง validation และ test และนับ `combination` กับ `unassessable` แยก ไม่จัดเป็นความถูกต้องของโมเดล 3 คลาส ผลสรุปเป็นเพียงจำนวน ต้องทำ subgroup และ uncertainty analysis ก่อนสรุปผลจริง

สำหรับ YOLO ตรวจสิว ใช้ขั้นตอนเตรียม YOLO ที่มีอยู่ใน [skin-ai-yolo-setup.md](skin-ai-yolo-setup.md) เฉพาะเมื่อได้ label และการแยกตามบุคคลที่พิสูจน์ได้ ACNE04 ฉบับที่สำรวจยังไม่มี patient ID ที่ยืนยันได้ จึงยังไม่อ้างผล generalization จากการสุ่มแบ่งภาพ

## ทดสอบการทำงาน YOLO กับภาพวิจัย 7 พฤศจิกายน 2026

รัน `smoke_acne04_models.py --acne-only` กับภาพ train 3 ภาพแรกจาก ACNE04 revision `e375d8dac98b8562c5ab462d5f00ac011e8a47db` ภาพถูกประมวลผลในหน่วยความจำ ผลจำนวนกรอบอ้างอิงเทียบกับจำนวนที่ YOLO prototype คืนมาคือ 3/3, 3/1 และ 20/0 ตามลำดับ ไม่ได้จับคู่ตำแหน่งกรอบจึงไม่ใช่ precision, recall หรือ accuracy และภาพเป็น convenience sample ขนาดเล็กที่ไม่ใช่ชุดทดสอบอิสระ การนับตรงกันไม่ได้ยืนยันว่าตรวจตำแหน่งเดียวกัน ข้อสังเกตคือควรประเมินคุณภาพและเกณฑ์แปลงภาพก่อนใช้ต่อ

โมเดล skin-type ทดสอบการรันในเครื่องแล้ว โดยตรวจ SHA-256 ของ weights ตรงกับ Hugging Face และรันกับภาพเดียวกัน 3 ภาพ ผลออก dry, dry, oily ตามลำดับ ทั้งนี้ ACNE04 ไม่มี reference ผิวมัน/แห้ง จึงยืนยันได้เพียงว่าโมเดลประมวลผลจบ ไม่ใช่ตรวจความถูกต้องหรือความแม่นยำของประเภทผิว

```powershell
.\.venv-skin-research\Scripts\python.exe scripts\skin_ai\smoke_acne04_models.py --output skin-ai-data\new-smoke.json --limit 3 --local-skin-model skin-ai-data\skin-type-model
```

ใช้ชื่อ output ใหม่ทุกครั้ง และใช้ `--acne-only` เมื่อต้องการทดลองเฉพาะ detector สคริปต์เป็นงานวิชาการในเครื่อง ไม่ deploy และไม่ฝึก weights

## ทดลอง skin-type บน Figshare

รัน 7 พฤศจิกายน 2026 กับชุด [Skin Type Identification](https://figshare.com/articles/dataset/Skin_Type_Identification/29634428) ไฟล์ zip MD5 `2663ac432ed50175ba63ee8d18e49717` ในเครื่อง จำนวนภาพ Test 225 ภาพ แยก 5 กลุ่ม กลุ่มละ 45 ภาพ โมเดล `dima806/skin_types_image_detection@5aace4f` ตอบตรง label กลุ่ม Dry 43/45, Normal 7/45 และ Oily 32/45 ส่วนกลุ่ม Combination และ Sensitive ไม่มีคลาสรองรับ จึงไม่คำนวณความถูกต้อง โมเดลตอบ Dry/Oily แทน

การสำรวจชื่อไฟล์โดยตัด suffix `_resized` พบ 180 กลุ่มชื่อที่อาจมาจากต้นฉบับเดียวกันปรากฏข้าม Train/Validation/Test ของ dataset และมีภาพหมุนหรือกลับด้าน นี่เป็นเพียง heuristic จากชื่อไฟล์ ไม่ยืนยันตัวบุคคลหรือภาพซ้ำ และยังไม่ทราบว่าข้อมูลฝึกของโมเดลซ้ำกับชุดนี้หรือไม่ label ยังไม่ได้ตรวจโดยผู้เชี่ยวชาญอิสระ ดังนั้นตัวเลขนี้ไม่ใช่ผลประเมินความแม่นยำบนผู้ใช้ SkinCycle หรือ test set อิสระ

Figshare metadata ระบุ CC BY 4.0 แต่คำบรรยายระบุใช้เพื่อการศึกษาและวิจัยเท่านั้น ให้ตรวจเงื่อนไขและสิทธิ์ภาพกับผู้สร้างก่อนนำไปใช้เชิงพาณิชย์ ผลและรูปอยู่ใน `skin-ai-data/` ซึ่ง Git ข้ามไฟล์

```powershell
.\.venv-skin-research\Scripts\python.exe scripts\skin_ai\evaluate_figshare_skin_type.py --archive skin-ai-data\figshare-skin-types-29634428.zip --model skin-ai-data\skin-type-model --output skin-ai-data\new-figshare-result.json --per-class 45
```
