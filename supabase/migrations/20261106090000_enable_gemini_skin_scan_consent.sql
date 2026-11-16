insert into public.skin_scan_consent_versions
  (version, body, provider, image_retention_description, active)
values (
  'gemini-vision-v1',
  'ฉันยินยอมส่งภาพใบหน้าและคำตอบแบบสอบถามไปยัง Google Gemini ผ่าน SkinCycle เพื่อรับคำแนะนำดูแลผิวเบื้องต้น ภาพอาจถูกประมวลผลตามนโยบายของผู้ให้บริการ ผลนี้ไม่ใช่การวินิจฉัยทางการแพทย์ ฉันสามารถเลือกไม่สแกนได้',
  'Google Gemini API',
  'SkinCycle ไม่บันทึกภาพใบหน้าลงฐานข้อมูลหรือ Storage เก็บเฉพาะผลวิเคราะห์และแบบสอบถาม ภาพถูกส่งเพื่อประมวลผลตามนโยบาย Google Gemini API ของบัญชีที่ตั้งค่า',
  true
)
on conflict (version) do nothing;
