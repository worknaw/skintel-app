import { supabase } from '@/core/supabase/client';
import { failure, success, type Result } from '@/core/result';
import type { ChatMessage } from '../domain/chat-types';

export function formatGeminiContents(messages: readonly ChatMessage[]): readonly { role: 'user' | 'model'; parts: readonly { text: string }[] }[] {
  const valid = messages.filter((message) => !message.isError && message.text.trim());
  const firstUser = valid.findIndex((message) => message.role === 'user');
  if (firstUser < 0) return [];
  const result: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  for (const message of valid.slice(firstUser)) {
    const last = result[result.length - 1];
    if (last?.role === message.role) last.parts.push({ text: message.text.trim() });
    else result.push({ role: message.role, parts: [{ text: message.text.trim() }] });
  }
  return result;
}

export async function sendSkinChatMessage(messages: readonly ChatMessage[], signal?: AbortSignal): Promise<Result<string>> {
  const contents = formatGeminiContents(messages);
  if (!contents.length) return failure({ code: 'VALIDATION_ERROR', message: 'ไม่มีข้อความสำหรับส่งให้ AI', retryable: false });
  if (signal?.aborted) return failure({ code: 'UNKNOWN', message: 'ยกเลิกคำขอแล้ว', retryable: true });
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return failure({ code: 'FORBIDDEN', message: 'กรุณาเข้าสู่ระบบก่อนใช้ผู้ช่วย AI', retryable: false });
    const { data, error } = await supabase.functions.invoke('skin-chat-gemini', { body: { contents } });
    if (signal?.aborted) return failure({ code: 'UNKNOWN', message: 'ยกเลิกคำขอแล้ว', retryable: true });
    if (error || typeof data?.answer !== 'string' || !data.answer.trim()) {
      return failure({ code: data?.error === 'rate_limited' ? 'RATE_LIMITED' : 'AI_UNAVAILABLE', message: data?.error === 'rate_limited' ? 'คำขอเกินโควตาชั่วคราว กรุณารอสักครู่' : 'ผู้ช่วย AI ยังตอบไม่ได้ กรุณาลองใหม่', retryable: true });
    }
    return success(data.answer.trim());
  } catch {
    return failure({ code: 'NETWORK_ERROR', message: 'เชื่อมต่อผู้ช่วย AI ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต', retryable: true });
  }
}
