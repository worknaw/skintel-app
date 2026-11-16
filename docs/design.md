# Design System & UI/UX Concept — Skin Analysis / Skin Cycling App

> เอกสารนี้สรุปแนวทางการออกแบบ UI/UX ของแอปตามคอนเซปต์ที่ตกลงกันไว้  
> สถานะ: **Design Direction v1**  
> ชื่อ `SkinCycle` ใช้เป็น **Working Name** ชั่วคราว และสามารถเปลี่ยนภายหลังได้

---

## 1. Product Concept

แอปเป็นแพลตฟอร์มดูแลผิวที่รวม 3 แนวคิดหลักไว้ในระบบเดียว

1. **Skincare Discovery**  
   ผู้ใช้สามารถเปิดแอปแล้วดู ค้นหา เปรียบเทียบ และเปิดรายละเอียดผลิตภัณฑ์สกินแคร์ได้ทันที โดยไม่ต้องเข้าสู่ระบบ

2. **AI Skin Analysis**  
   ผู้ใช้สามารถถ่ายภาพใบหน้าเพื่อให้ AI วิเคราะห์สภาพผิวและปัญหาผิวในระดับเบื้องต้น

3. **Personalized Skin Cycling Routine**  
   ระบบนำผลวิเคราะห์ผิว ข้อมูล Skin Profile ผลิตภัณฑ์ที่ผู้ใช้มี และงบประมาณ มาจัด Routine แบบ Skin Cycling พร้อมปฏิทินรายวัน

แนวคิดของประสบการณ์ใช้งานคือ

**ค้นพบสินค้า → เข้าใจผิว → วิเคราะห์ → รับคำแนะนำ → สร้าง Routine → ทำตามทุกวัน → ติดตามผล → ปรับ Routine**

---

## 2. Design Direction

### Mood & Tone

ภาพรวมต้องให้ความรู้สึก

- สะอาด
- น่าเชื่อถือ
- Premium แต่เข้าถึงง่าย
- เป็นมิตร
- ทันสมัย
- มีความเป็น Wellness / Skincare
- ไม่ดูเป็นแอปโรงพยาบาล
- ไม่ดูเป็น E-commerce จ๋าจน AI และ Routine ถูกลดความสำคัญ
- คล้ายงานออกแบบแอปบน iOS ที่เรียบและมีพื้นที่หายใจเยอะ

### Key Visual Style

- พื้นหลังสว่างแบบ Warm White
- Card ขอบมน
- ใช้เงาอ่อนมาก
- ใช้ Border บางเพื่อแบ่ง Section
- ใช้ Glass / Blur เฉพาะบางองค์ประกอบ เช่น Floating Action หรือ Navigation
- เน้นภาพผลิตภัณฑ์ขนาดใหญ่และสะอาด
- ใช้สีเขียวเป็น Brand Color
- ใช้สีส้ม/Peach เป็น Accent
- หลีกเลี่ยง Gradient จัด
- หลีกเลี่ยงสี Neon
- หลีกเลี่ยง UI ที่แน่นเกินไป

---

## 3. Color Palette

### Main Colors

| Token | Hex | การใช้งาน |
|---|---|---|
| `background` | `#FAFAF7` | พื้นหลังหลักของแอป |
| `primary` | `#7FAF96` | สีเขียว Sage สำหรับองค์ประกอบรอง |
| `primaryDark` | `#315C49` | ปุ่มหลัก, Active State, Heading สำคัญ |
| `accent` | `#F3A66A` | ราคา, Active Day, Highlight |
| `softPeach` | `#FBE4D2` | Promotion, Budget, Info Card |
| `softGreen` | `#E6F1EA` | Recovery, Result, Success State |
| `textPrimary` | `#252725` | ข้อความหลัก |
| `textSecondary` | `#737773` | ข้อความรอง |
| `border` | `#E7E8E4` | เส้นขอบและ Divider |

### Semantic Colors

ควรสร้าง Semantic Token แทนการใช้สีตรง ๆ ใน Component

```text
success / recovery     = soft green
active / treatment     = orange / peach
warning                = orange เข้มขึ้นเล็กน้อย
danger / irritation    = muted red
neutral / rest         = warm beige
```

สีของปัญหาผิวควรเป็นโทนอ่อนและไม่สร้างความรู้สึกว่าเป็น “โรค” เช่น

- ความมัน → Green
- สิว → Soft Orange
- รอยแดง → Muted Rose
- ความแห้ง → Soft Blue
- รูขุมขน → Warm Beige

---

## 4. Typography

เน้น Font ที่อ่านภาษาไทยง่ายและเข้ากับ iOS

### แนวทาง

- Heading ใหญ่ ชัด และไม่หนาเกินไป
- Body ใช้ขนาดอ่านง่าย
- ราคาหรือ Score ใช้น้ำหนักมากขึ้น
- หลีกเลี่ยงการใช้ Font หลายตระกูล

### Suggested Scale

```text
Display        30–34 px
H1             24–28 px
H2             20–22 px
H3             17–18 px
Body           15–16 px
Caption        12–13 px
Button         15–16 px
Price Large    20–24 px
```

### Font Weight

```text
Regular     400
Medium      500
Semibold    600
Bold        700
```

---

## 5. Spacing System

ใช้ระบบ 4/8 Point Grid

```text
4 px    Micro spacing
8 px    Small spacing
12 px   Card inner gap
16 px   Standard spacing
20 px   Section spacing
24 px   Large spacing
32 px   Major section separation
```

### Page Padding

แนะนำ

```text
Horizontal: 16–20 px
Top/Bottom: ตาม Safe Area
```

---

## 6. Corner Radius

UI ควรมีความนุ่มและทันสมัย

```text
Small chip        10–12 px
Input             14–16 px
Product Card      16–18 px
Large Card        20–24 px
Modal / Sheet     24–28 px
Round Button      999 px
```

---

## 7. Shadow & Border

### Shadow

ใช้เฉพาะกรณีที่ต้องการแยก Layer

- opacity ต่ำ
- blur ค่อนข้างมาก
- หลีกเลี่ยงเงาดำหนัก

### Border

ใช้ `#E7E8E4` เป็นหลัก

```text
1 px border
```

ใช้กับ

- Product Card
- Input
- Chips
- Calendar Cell
- Store Price Card
- Comparison Card

---

# 8. App Navigation

## Bottom Navigation

แนะนำ 5 เมนูหลัก

1. **หน้าหลัก**
2. **ค้นพบ**
3. **วิเคราะห์ผิว**
4. **รูทีน**
5. **โปรไฟล์**

### Center Scan Button

ปุ่ม “วิเคราะห์ผิว” สามารถยกขึ้นจาก Navigation เล็กน้อย เพื่อสร้าง Visual Priority

Guest กดได้ แต่ก่อนเริ่มวิเคราะห์ระบบจะตรวจ Authentication

---

# 9. Guest Mode

ผู้ใช้เปิดแอปแล้วเข้าหน้า Home ทันที

**ไม่บังคับ Login ตอนเปิดแอป**

Guest สามารถ

- ดู Home
- ค้นหาผลิตภัณฑ์
- ดูหมวดหมู่
- ดูรายละเอียดผลิตภัณฑ์
- ดูราคา
- เปิดลิงก์ร้านค้า
- Filter
- Compare Product

เมื่อผู้ใช้กดฟีเจอร์ที่ต้องใช้ข้อมูลส่วนตัว เช่น

- วิเคราะห์ผิว
- Routine
- Analysis History
- Personalized Recommendation
- Profile ส่วนตัว

จึงแสดง Login / Register

หลัง Login สำเร็จต้องกลับไปยังฟีเจอร์ที่ผู้ใช้กำลังจะเปิด ไม่ควรบังคับกลับ Home

---

# 10. First-Time Onboarding

เกิดขึ้นหลังจากสมัครสมาชิกครั้งแรก

Flow:

**Register → Skin Onboarding → Destination เดิม / Home**

ข้อมูลที่เก็บ เช่น

- ช่วงอายุ
- ปัญหาผิวที่กังวล
- ประเภทผิวที่ผู้ใช้คิดว่ามี (Optional)
- ประวัติการแพ้/ระคายเคือง
- Ingredient ที่ต้องการหลีกเลี่ยง
- งบประมาณโดยประมาณ
- ข้อมูลอื่นที่จำเป็นต่อ Recommendation

UX ควรเป็น Multi-step Form ไม่ควรยัดทุกคำถามไว้หน้าเดียว

---

# 11. Home / Skincare Storefront

หน้าแรกมีลักษณะคล้ายร้านสกินแคร์ แต่เน้น Discovery มากกว่า Checkout

ฐานข้อมูลเป้าหมายประมาณ **1,000 ผลิตภัณฑ์**

### Layout

1. Header / Logo
2. Notification
3. Search Bar
4. Category Chips
5. Hero Banner
6. AI Skin Analysis CTA
7. Popular / Trending
8. Product Sections
9. Budget Discovery
10. Bottom Navigation

### Search Placeholder

```text
ค้นหาสกินแคร์ แบรนด์ หรือส่วนผสม
```

### Category Chips

ตัวอย่าง

- ทั้งหมด
- คลีนเซอร์
- โทนเนอร์
- เอสเซนส์
- เซรั่ม
- มอยส์เจอไรเซอร์
- กันแดด
- ผลัดเซลล์ผิว
- มาสก์
- Eye Care

### Product Sections

ตัวอย่าง

- ยอดนิยมวันนี้
- สกินแคร์สำหรับผิวมัน
- สำหรับผิวเป็นสิวง่าย
- งบไม่เกิน 500 บาท
- Skincare Essentials
- Recovery Products

ใช้ Horizontal Carousel ใน Home และ Full Grid ในหน้า View All

---

# 12. Product Card

ข้อมูลขั้นต่ำที่แสดง

- รูปผลิตภัณฑ์
- Brand
- Product Name
- ราคาเริ่มต้น
- Tag 1–2 รายการ
- Favorite Icon (ถ้ามีระบบ Favorite)

ตัวอย่าง Tag

```text
ปลอบประโลม
ลดความมัน
สำหรับผิวแห้ง
กันแดด
BHA
Barrier Repair
```

Product Card ไม่ควรใส่ข้อมูลมากเกินไป

---

# 13. Product Detail

หน้า Product Detail ใช้ภาพสินค้าเป็น Hero

### Information Structure

1. Product Gallery
2. Brand
3. Product Name
4. Rating / Popularity (ถ้ามี)
5. Price Range
6. Size
7. Key Ingredients
8. Skin Type
9. Skin Concerns
10. Product Description
11. Ingredient List
12. Where to Buy
13. Similar Products

---

# 14. Store Price Comparison

ผลิตภัณฑ์หนึ่งรายการสามารถมีร้านค้าภายนอกได้ประมาณ 4 ร้าน

ตัวอย่าง Layout

```text
ซื้อได้ที่

ร้าน A       ฿590
ร้าน B       ฿620
ร้าน C       ฿650
ร้าน D       ฿690
```

### Store Listing Data

```text
store_name
product_url
price
currency
last_updated
availability
```

### UX Rules

- แสดงราคาถูกสุดเด่น
- แสดง Last Updated หากข้อมูลไม่ได้ Real-time
- กดร้านแล้วเปิด Web / App ภายนอก
- ไม่มี Checkout ภายในแอป
- ไม่มีระบบ Payment
- ไม่มีระบบ Shipping

---

# 15. Search & Filter

## Search by

- Product Name
- Brand
- Ingredient

## Filter by

- Category
- Skin Type
- Skin Concern
- Key Ingredient
- Price Range
- Routine Role

## Sort

- Popular
- Price Low → High
- Price High → Low
- Relevance
- Recently Added

---

# 16. Skin Scan

### Screen Structure

1. Camera View
2. Face Guide Overlay
3. Lighting Guidance
4. Capture Button
5. Gallery Button
6. Privacy Note

ก่อนส่งภาพ

- ตรวจพบใบหน้า
- ตรวจแสง
- ตรวจ Blur
- ตรวจมุมหน้าเบื้องต้น

หากภาพไม่ผ่าน ให้บอกเหตุผลแบบสั้นและแก้ไขได้ทันที

---

# 17. AI Analysis Loading

อย่าใช้ Spinner เปล่า ๆ

ควรแสดง Step Progress เช่น

```text
กำลังตรวจสอบภาพ
กำลังวิเคราะห์สภาพผิว
กำลังประเมินปัญหาผิว
กำลังเตรียมคำแนะนำ
```

สามารถใช้ Face Mesh Animation แบบเบา ๆ เพื่อให้รู้สึกว่า AI กำลังทำงาน

---

# 18. Skin Analysis Result

ผลลัพธ์ควรอ่านง่ายและไม่ดูเหมือนการวินิจฉัยโรค

### Header Result

- ภาพใบหน้า
- Face Map Overlay
- Skin Type
- Short Summary

### Skin Concerns

แสดงเป็น Card เช่น

```text
ความมัน       ระดับกลาง
สิว           ปานกลาง
รอยแดง        น้อย
รูขุมขน       ปานกลาง
```

### Skin Score

ใช้ Progress Bar หรือ Score Ring แบบเรียบง่าย

ตัวอย่าง

```text
สุขภาพผิวโดยรวม 76 / 100
```

ย่อยเป็น

- ความชุ่มชื้น
- ความเรียบเนียน
- ความกระจ่างใส
- Skin Barrier

### CTA

```text
สร้างรูทีนที่เหมาะกับผิวฉัน
```

---

# 19. Ingredient Recommendation

หลัง Analysis ระบบแสดง Ingredient ที่เหมาะสม

ตัวอย่าง

```text
สิว
- Salicylic Acid
- Niacinamide

ผิวแห้ง
- Hyaluronic Acid
- Ceramide
```

ควรแสดง

- Ingredient
- ช่วยเรื่องอะไร
- เหมาะกับช่วงไหนของ Routine
- ข้อควรระวัง
- Ingredient ที่ไม่ควรใช้ร่วมกันตามกฎของระบบ

---

# 20. AI Skin Cycling Routine

ฟีเจอร์หลักของแอป

ระบบสร้าง Routine จาก

```text
AI Skin Result
+
Skin Profile
+
Skin Concerns
+
Allergy / Avoid List
+
Products Owned
+
Product Database
+
Budget
+
Skin Cycling Rules
```

ระบบไม่ควรปล่อยให้ Generative AI จัดสารแบบอิสระทั้งหมด

ใช้

**AI Analysis + Safety Rules + Routine Algorithm + AI Explanation**

---

# 21. Skin Cycling Calendar

หน้า Routine มี Calendar เป็นแกนหลัก

### Calendar State

แต่ละวันสามารถมีประเภท เช่น

- Active
- Recovery
- Rest
- Hydration

### Color

```text
Active      → Soft Orange / Peach
Recovery    → Soft Green
Rest        → Warm Beige
Hydration   → Soft Blue
```

### Calendar UX

- Highlight Today
- กดวันที่เพื่อดู Routine
- แสดงสถานะว่าทำครบหรือยัง
- ดูย้อนหลังได้
- ดูล่วงหน้าได้

---

# 22. Daily Routine

เมื่อเลือกวัน แสดง

## Morning — AM

ตัวอย่าง

1. Cleanser
2. Serum
3. Moisturizer
4. Sunscreen

## Night — PM

ขึ้นกับ Skin Cycling Day เช่น

### Active Day

1. Cleanser
2. Exfoliant / Treatment
3. Moisturizer

### Recovery Day

1. Cleanser
2. Hydrating Serum
3. Barrier Repair
4. Moisturizer

ผู้ใช้สามารถกด Check แต่ละ Step ได้

---

# 23. Routine Product Card

Card ใน Routine ต้องไม่เหมือน Product Card หน้า Store ทั้งหมด

ต้องเน้น “หน้าที่ใน Routine”

ตัวอย่าง

```text
STEP 2

BHA Treatment
Paula's Choice 2% BHA

คืนนี้: Exfoliation
ราคาเริ่มต้น ฿1,190

[เปลี่ยนสินค้า]
```

---

# 24. Budget-Based Product Substitution

เป็น Core Feature ของ Routine

ผู้ใช้สามารถกำหนด

```text
งบสกินแคร์ต่อเดือน
หรือ
งบสูงสุดสำหรับผลิตภัณฑ์แต่ละประเภท
```

เมื่อกด

**เปลี่ยนสินค้า**

ระบบหาสินค้าทดแทนโดยพิจารณา

1. Routine Role เดียวกัน
2. Function เดียวกัน
3. Skin Type ที่เหมาะสม
4. Skin Concern ที่ตรงกัน
5. Ingredient Compatibility
6. Avoid / Allergy
7. Skin Cycling Compatibility
8. Budget
9. Price
10. Product Ranking

### ตัวอย่าง

```text
Moisturizer เดิม
฿590

ทางเลือก
฿490
฿350
฿290
```

ห้ามใช้เพียง Category เดียวกันในการตัดสินว่าแทนกันได้

เช่น BHA Serum และ Niacinamide Serum แม้จะเป็น Serum เหมือนกัน แต่ทำหน้าที่ต่างกัน

---

# 25. Adjust Routine to Budget

มี Action ระดับ Routine

```text
ปรับรูทีนให้เข้ากับงบ
```

ผู้ใช้ระบุ เช่น

```text
งบไม่เกิน 1,500 บาท
```

ระบบพยายามปรับผลิตภัณฑ์หลาย Step พร้อมกัน โดยไม่ทำลายโครง Routine

แสดงผลก่อนยืนยัน

```text
งบเดิม        ฿2,150
งบใหม่        ฿1,480
ประหยัด        ฿670
```

---

# 26. My Skincare

ผู้ใช้สามารถเพิ่มผลิตภัณฑ์ที่มีอยู่แล้ว

### Add Product

- Search จากฐานข้อมูล
- Scan Barcode ภายหลังได้
- Add Custom Product ภายหลังได้

Routine Algorithm ควรพยายามใช้ของที่ผู้ใช้มีอยู่ก่อนเสนอให้ซื้อใหม่

---

# 27. Daily Skin Check

ก่อน Routine ตอนกลางคืน ระบบสามารถถามสั้น ๆ

```text
วันนี้ผิวเป็นอย่างไร?

🙂 ปกติ
💧 แห้ง / ตึง
🔴 แดง / แสบ
```

หากผู้ใช้รายงาน Irritation สูง

ระบบสามารถเปลี่ยน Active Day เป็น Recovery Day ตาม Safety Rule

---

# 28. Analysis History

เก็บข้อมูล

- วันที่
- รูป / Reference
- Skin Type
- Skin Concerns
- Scores
- Routine ในช่วงนั้น

แสดง Timeline หรือ Before / After Comparison ภายหลัง

---

# 29. Repeat Scan & Routine Adjustment

หลังใช้ Routine ระยะหนึ่ง ผู้ใช้สามารถ Scan ใหม่

Flow:

```text
Scan ครั้งก่อน
↓
Routine
↓
ใช้งานหลายสัปดาห์
↓
Scan ใหม่
↓
Compare
↓
ปรับ Routine
```

การเปลี่ยนแปลงควรแสดงแบบเข้าใจง่าย เช่น

```text
ความมัน     ↓ 12%
รอยแดง      ↓ 8%
ความชุ่มชื้น ↑ 10%
```

ไม่ควรใช้ข้อความที่สื่อเป็นการวินิจฉัยทางการแพทย์

---

# 30. Login / Register Design

หน้า Authentication ต้องไม่ทำลาย Flow

เมื่อ Guest กดฟีเจอร์ที่ล็อกอยู่ ใช้ Bottom Sheet หรือ Full Screen Auth ที่มี Context เช่น

```text
เข้าสู่ระบบเพื่อวิเคราะห์ผิว

บันทึกผลวิเคราะห์
รับรูทีนเฉพาะบุคคล
ติดตามการเปลี่ยนแปลงของผิว
```

หลังสำเร็จกลับไปยังจุดเดิม

---

# 31. Profile

Sections

- Account
- Skin Profile
- My Skincare
- Budget
- Avoid Ingredients
- Analysis History
- Routine Settings
- Notifications
- Privacy
- Logout

---

# 32. Component Library

ควรสร้าง Reusable Components ตั้งแต่ต้น

```text
Button
IconButton
TextInput
SearchBar
Chip
Badge
ProductCard
ProductHorizontalCard
IngredientChip
PriceCard
StoreCard
SkinConcernCard
SkinScoreBar
RoutineStepCard
CalendarDay
SectionHeader
BottomSheet
Modal
EmptyState
LoadingState
ErrorState
```

---

# 33. Button Styles

## Primary

- Background: `#315C49`
- Text: White
- Radius: 14–18 px

ใช้กับ

```text
วิเคราะห์ผิว
สร้างรูทีน
บันทึก
ยืนยัน
```

## Secondary

- Background: `#E6F1EA`
- Text: `#315C49`

## Accent

- Background: `#FBE4D2`
- Text: Dark / Orange

ใช้กับ

- Budget
- Active Day
- Promotion
- Price-related Actions

## Ghost

- Transparent
- Border `#E7E8E4`

---

# 34. Icons

ใช้ Icon Style เดียวกันทั้งแอป

แนะนำ

- Outline icon เป็น Default
- Filled icon สำหรับ Active Navigation
- Stroke ไม่หนาเกินไป
- Rounded shapes

Icon ที่ใช้บ่อย

```text
Home
Search
Scan
Calendar
Profile
Heart
Camera
Gallery
Chevron
Cart/Store
Wallet
Sparkles
Droplet
Sun
Moon
Shield
Refresh
```

---

# 35. Image Style

## Product Images

- พื้นหลังขาว/Neutral
- Crop แบบ Center
- ไม่ให้ Card ดูแน่น
- ใช้ Aspect Ratio คงที่

## Face Analysis

- แสงธรรมชาติ
- Background เรียบ
- ไม่ใช้ภาพที่ดูเป็น Medical Procedure
- Face Mesh ใช้เส้นบางและโปร่ง

---

# 36. Empty States

ทุกหน้าที่มีข้อมูลควรออกแบบ Empty State

ตัวอย่าง

### No Routine

```text
ยังไม่มีรูทีนของคุณ
วิเคราะห์ผิวเพื่อสร้างแผนดูแลผิวเฉพาะบุคคล

[วิเคราะห์ผิว]
```

### No History

```text
ยังไม่มีประวัติการวิเคราะห์
```

### No Product Result

```text
ไม่พบผลิตภัณฑ์ที่ตรงกับตัวกรอง
ลองปรับช่วงราคาหรือหมวดหมู่
```

---

# 37. Loading States

ใช้ Skeleton มากกว่า Spinner ใน

- Product List
- Product Detail
- Search
- Store Price
- History

AI Analysis ใช้ Dedicated Analysis Animation

---

# 38. Error States

ต้องรองรับ

- Internet Error
- AI API Error
- Image Upload Error
- Price Data Error
- Authentication Expired
- Product Not Found

ข้อความ Error ต้องบอกสิ่งที่ผู้ใช้ทำต่อได้

---

# 39. Accessibility

ขั้นต่ำควรมี

- Text Contrast เพียงพอ
- Touch Target อย่างน้อยประมาณ 44×44
- ไม่ใช้สีเพียงอย่างเดียวในการบอกสถานะ
- รองรับ Font Scaling ในระดับหนึ่ง
- Label ให้ Icon สำคัญ
- Error มีทั้ง Icon + Text

---

# 40. Motion & Animation

ใช้ Animation แบบเบา

### เหมาะกับ

- Page Transition
- Product Card Press
- Calendar Selection
- Bottom Sheet
- Scan Progress
- Result Score Animation
- Check Routine Step

### หลีกเลี่ยง

- Animation เยอะทุกจุด
- Bounce รุนแรง
- Gradient Motion
- Loading ที่นานและไม่มี Progress

---

# 41. Main Screen Set

ชุดหน้าจอหลักที่ควรออกแบบก่อน

## Public

1. Home
2. Product Search
3. Product Filter
4. Product Detail
5. Product Comparison

## Authentication

6. Login
7. Register
8. First-Time Skin Onboarding

## AI

9. Scan Intro
10. Camera
11. Image Preview
12. AI Loading
13. Analysis Result

## Routine

14. Routine Calendar
15. Daily Routine
16. Change Product
17. Budget Adjustment
18. My Skincare

## User

19. Analysis History
20. Analysis History Detail
21. Profile
22. Skin Profile Settings

---

# 42. Main User Flow

```text
OPEN APP
   │
   ▼
HOME
   │
   ├── Search / Product / Price / Store ──► External Store
   │
   └── Analyze Skin
             │
             ▼
        Auth Required?
          │       │
         Yes      No
          │       │
       Login      │
          └───┬───┘
              ▼
        Skin Scan
              │
              ▼
        AI Analysis
              │
              ▼
           Result
              │
              ▼
      Recommendation
              │
              ▼
      Create Skin Cycle
              │
              ▼
      Routine Calendar
              │
       ┌──────┴──────┐
       ▼             ▼
 Daily Routine   Change Product
                     │
                     ▼
               Budget Filter
                     │
                     ▼
                Alternative
```

---

# 43. UX Principle

ทุกการตัดสินใจด้าน UI ควรยึดหลักเหล่านี้

### 1. Browse First

ผู้ใช้ต้องเห็นประโยชน์ของแอปก่อนสมัครสมาชิก

### 2. AI With Explanation

อย่าแสดงแค่คะแนน ต้องอธิบายให้เข้าใจว่าหมายถึงอะไร

### 3. Recommendation With Reason

ทุกผลิตภัณฑ์ที่ระบบแนะนำควรมีเหตุผล เช่น

```text
แนะนำเพราะ:
เหมาะกับผิวมัน
ช่วยเรื่องสิว
ไม่มี Ingredient ที่คุณหลีกเลี่ยง
อยู่ในงบของคุณ
```

### 4. Budget Matters

ราคาเป็นส่วนหนึ่งของ Recommendation ไม่ใช่แค่ข้อมูลบนหน้าร้าน

### 5. Routine Over One-Time Scan

เป้าหมายคือทำให้ผู้ใช้กลับมาใช้ Calendar และ Routine ทุกวัน

### 6. Safety First

Skin Cycling ต้องถูกควบคุมด้วย Compatibility / Safety Rules ไม่ใช่ให้ Generative AI ตัดสินใจอย่างอิสระทั้งหมด

### 7. Calm Interface

แม้ระบบจะมีข้อมูลเยอะ แต่หน้าจอไม่ควรให้ความรู้สึกซับซ้อน

---

# 44. Design Reference Summary

Concept Mockup ที่อนุมัติใช้เป็นทิศทางหลักประกอบด้วย 4 หน้าหลัก

1. **Home / Skincare Storefront**  
   พื้นขาวครีม + Product Cards + AI Banner + Green Primary

2. **Product Detail**  
   Product Hero + Ingredient Tags + Skin Type + ราคา 4 ร้าน

3. **AI Skin Result**  
   Face Analysis + Skin Concern Cards + Score Bars + CTA สร้าง Routine

4. **Skin Cycling Calendar**  
   Calendar + AM/PM Routine + Active/Recovery State + Budget Replacement

ภาพรวมให้รักษาแนวทาง

**Warm White + Sage Green + Dark Green + Peach/Orange + Rounded iOS-like UI**

---

# 45. Current Design Lock

สำหรับ Version แรก ให้ถือว่าสิ่งต่อไปนี้เป็น Design Direction ที่ล็อกแล้ว

- Warm White Background
- Sage Green Brand
- Dark Green Primary CTA
- Orange / Peach Accent
- Rounded Cards
- Clean iOS-inspired Layout
- Product-first Home
- Guest-first Experience
- AI Skin Analysis
- Skin Cycling Calendar
- AM / PM Routine
- Budget-aware Recommendation
- External Store Price Comparison
- Minimal / Premium / Wellness Mood

สามารถปรับรายละเอียด Component, Typography และ Layout ได้ในขั้น Prototype แต่ไม่ควรเปลี่ยน Design Language หลักโดยไม่มีเหตุผล
