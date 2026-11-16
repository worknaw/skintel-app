export function validateDisplayName(value: string): string | null {
  return /^[A-Za-z][A-Za-z .'-]{0,79}$/.test(value.trim())
    ? null : 'กรุณาใช้ชื่อภาษาอังกฤษ 1–80 ตัวอักษร';
}

export function validateEmail(value: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.trim().length <= 254
    ? null : 'กรุณากรอกอีเมลให้ถูกต้อง';
}

export function validatePassword(value: string, confirmation: string): string | null {
  if (value.length < 8 || value.length > 128) return 'รหัสผ่านต้องมี 8–128 ตัวอักษร';
  return value === confirmation ? null : 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
}

export function validateSupportRequest(subject: string, message: string): string | null {
  if (subject.trim().length < 3 || subject.trim().length > 120) return 'หัวข้อต้องมี 3–120 ตัวอักษร';
  if (message.trim().length < 10 || message.trim().length > 4000) return 'รายละเอียดต้องมี 10–4,000 ตัวอักษร';
  return null;
}
