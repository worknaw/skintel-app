import * as Crypto from 'expo-crypto';

import { supabase } from '@/core/supabase/client';
import { getSkinProfile } from '@/features/skin-profile/data/supabase-skin-profile-repository';

export type GeminiScanResult = Readonly<{
  visible_acne: string;
  visible_redness: string;
  visible_marks: string;
  skin_tendency: string;
  limitation: string;
  morning: string[];
  evening: string[];
}>;

async function readFunctionErrorCode(data: unknown, error: unknown): Promise<string | undefined> {
  if (data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string') {
    return (data as { error: string }).error;
  }
  const context = (error as { context?: unknown } | null)?.context;
  if (!context || typeof context !== 'object' || typeof (context as { clone?: unknown }).clone !== 'function') return undefined;
  try {
    const payload = await (context as Response).clone().json() as { error?: unknown };
    return typeof payload.error === 'string' ? payload.error : undefined;
  } catch { return undefined; }
}

export async function runGeminiScan(uri: string): Promise<GeminiScanResult> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('กรุณาเข้าสู่ระบบก่อนสแกน');
  const skinProfile = await getSkinProfile(userData.user.id);
  if (!skinProfile?.onboardingCompletedAt) {
    throw new Error('ยังไม่พบข้อมูลสภาพผิวจาก onboarding กรุณาตั้งค่าข้อมูลผิวก่อนสแกน');
  }
  // Keep a stale development build from crashing at startup if it was built
  // before the native image module was added. A current build still gets the
  // same JPEG normalization path below.
  let ImageManipulator: typeof import('expo-image-manipulator').ImageManipulator;
  let SaveFormat: typeof import('expo-image-manipulator').SaveFormat;
  let File: typeof import('expo-file-system').File;
  try {
    ({ ImageManipulator, SaveFormat } = await import('expo-image-manipulator'));
    ({ File } = await import('expo-file-system'));
  } catch {
    throw new Error('แอปเวอร์ชันนี้ยังไม่รองรับการสแกน กรุณาอัปเดตแอปแล้วลองใหม่');
  }
  // Normalize any camera/gallery format (PNG, HEIC, WebP, etc.) to JPEG.
  // The Edge Function validates JPEG bytes before sending the image to Gemini.
  const source = ImageManipulator.manipulate(uri);
  const rendered = await source.renderAsync();
  let normalized = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  let file = new File(normalized.uri);
  if (file.exists && file.size > 4 * 1024 * 1024) {
    const compressed = ImageManipulator.manipulate(rendered);
    normalized = await (await compressed.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
    file = new File(normalized.uri);
  }
  if (!file.exists || file.size > 4 * 1024 * 1024 || file.size < 100) throw new Error('ภาพใหญ่เกินไปหรืออ่านไม่ได้ กรุณาเลือกภาพขนาดไม่เกิน 4 MB');
  const imageBase64 = await file.base64();
  const { data: created, error: createError } = await supabase.rpc('create_consented_skin_scan', {
    p_consent_version: 'gemini-vision-v1', p_accepted: true, p_request_id: Crypto.randomUUID(),
  });
  if (createError) throw new Error('บันทึกความยินยอมไม่สำเร็จ กรุณาลองใหม่');
  const scanId = created?.[0]?.scan_id;
  if (!scanId) throw new Error('เริ่มการสแกนไม่สำเร็จ');
  const { data, error } = await supabase.functions.invoke('skin-scan-gemini', {
    body: { scanId, imageBase64 },
  });
  if (error || !data?.result) {
    const code = await readFunctionErrorCode(data, error);
    const messages: Record<string, string> = {
      rate_limited: 'สแกนบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
      gemini_not_authorized: 'การตั้งค่าระบบวิเคราะห์ยังไม่พร้อม กรุณาลองใหม่ภายหลัง',
      gemini_model_unavailable: 'โมเดลวิเคราะห์ยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง',
      gemini_capacity: 'ระบบ AI มีผู้ใช้งานมากชั่วคราว ระบบได้ลองโมเดลสำรองแล้ว กรุณาลองใหม่อีกครั้งในภายหลัง',
      gemini_unavailable: 'เชื่อมต่อระบบ AI ไม่สำเร็จชั่วคราว กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่',
      gemini_invalid_request: 'ระบบวิเคราะห์ยังรับภาพนี้ไม่ได้ กรุณาถ่ายหรือเลือกภาพ JPEG ใหม่',
      not_configured: 'การตั้งค่าระบบวิเคราะห์ยังไม่พร้อม กรุณาลองใหม่ภายหลัง',
      invalid_onboarding: 'ข้อมูล onboarding ไม่สมบูรณ์ กรุณาตั้งค่าข้อมูลผิวใหม่',
      invalid_image: 'ภาพอ่านไม่ได้ กรุณาถ่ายหรือเลือกภาพ JPEG ใหม่',
      image_too_large: 'ภาพใหญ่เกินไป กรุณาเลือกภาพ JPEG ขนาดไม่เกิน 4 MB',
    };
    throw new Error(messages[code ?? ''] ?? 'วิเคราะห์ภาพไม่สำเร็จ กรุณาลองใหม่');
  }
  return data.result as GeminiScanResult;
}
