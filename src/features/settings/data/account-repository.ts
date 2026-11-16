import { supabase } from '@/core/supabase/client';

export async function requireAccount() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('กรุณาเข้าสู่ระบบอีกครั้ง');
  return data.user;
}

export async function loadAccountProfile() {
  const user = await requireAccount();
  const { data, error } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
  if (error) throw error;
  return { displayName: data?.display_name ?? '', email: user.email ?? '', providers: user.identities?.map((identity) => identity.provider) ?? [] };
}

export async function saveDisplayName(displayName: string) {
  const user = await requireAccount();
  const { error } = await supabase.from('profiles').upsert({ id: user.id, display_name: displayName.trim() }).select('id').single();
  if (error) throw error;
}

export async function changeEmail(email: string) {
  const { error } = await supabase.auth.updateUser({ email: email.trim().toLowerCase() }, { emailRedirectTo: 'skincycle://auth' });
  if (error) throw error;
}

export async function changePassword(password: string, nonce?: string) {
  const { error } = await supabase.auth.updateUser({ password, ...(nonce?.trim() ? { nonce: nonce.trim() } : {}) });
  if (error) throw error;
}

export async function requestSecurityCode() {
  const { error } = await supabase.auth.reauthenticate();
  if (error) throw error;
}

export async function deleteAccount(confirmation: string) {
  const { error } = await supabase.rpc('delete_my_account', { confirmation });
  if (error) throw error;
  // Deletion already succeeded. Local sign out must not depend on the now-deleted remote user.
  const result = await supabase.auth.signOut({ scope: 'local' });
  if (result.error) throw new Error('ลบบัญชีแล้ว แต่ล้างเซสชันไม่สำเร็จ กรุณาปิดและเปิดแอปอีกครั้ง');
}

export async function exportAccount(): Promise<string> {
  const { data, error } = await supabase.rpc('export_my_account');
  if (error) throw error;
  if (!data || typeof data !== 'object') throw new Error('ไม่พบข้อมูลสำหรับดาวน์โหลด');
  return JSON.stringify(data, null, 2);
}

export async function sendSupportRequest(subject: string, message: string, appVersion: string) {
  const user = await requireAccount();
  const { data, error } = await supabase.from('support_requests')
    .insert({ user_id: user.id, subject: subject.trim(), message: message.trim(), app_version: appVersion })
    .select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function loadSupportRequests() {
  const user = await requireAccount();
  const { data, error } = await supabase.from('support_requests')
    .select('id,subject,status,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
  if (error) throw error;
  return data;
}

export function accountErrorMessage(error: unknown): string {
  const failure = error as { code?: string; message?: string } | null;
  if (failure?.code === 'PGRST202' || failure?.code === 'PGRST205' || failure?.code === '42P01') {
    return 'ระบบส่วนนี้ยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง';
  }
  if (failure?.code === 'same_password') return 'กรุณาใช้รหัสผ่านใหม่ที่ต่างจากรหัสผ่านเดิม';
  if (failure?.code === 'weak_password') return 'รหัสผ่านยังไม่ผ่านเงื่อนไขความปลอดภัย กรุณาใช้รหัสผ่านที่ยาวและคาดเดายากขึ้น';
  if (failure?.code === 'reauthentication_needed' || failure?.code === 'reauthentication_not_valid') return 'กรุณาขอรหัสยืนยันและกรอกรหัสจากอีเมลอีกครั้ง';
  if (failure?.code === 'email_exists' || failure?.code === 'user_already_exists') return 'อีเมลนี้ถูกใช้งานแล้ว';
  if (failure?.code === 'over_email_send_rate_limit' || failure?.code === 'over_request_rate_limit') return 'ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';
  if (failure?.message?.includes('Storage cleanup required')) return 'ยังมีไฟล์ที่ต้องลบก่อนลบบัญชี กรุณาติดต่อผ่านเมนูรายงานปัญหา';
  if (failure?.message?.includes('Order history requires store support')) return 'บัญชีนี้มีประวัติคำสั่งซื้อ กรุณาติดต่อร้านค้าเพื่อดำเนินการลบข้อมูลตามระยะเวลาที่ต้องเก็บรักษา';
  return 'ดำเนินการไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่';
}
