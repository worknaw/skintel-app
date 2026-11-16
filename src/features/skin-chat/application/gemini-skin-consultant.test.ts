import { formatGeminiContents, sendSkinChatMessage } from './gemini-skin-consultant';
import { supabase } from '@/core/supabase/client';
import type { ChatMessage } from '../domain/chat-types';

jest.mock('@/core/supabase/client', () => ({ supabase: {
  auth: { getUser: jest.fn() }, functions: { invoke: jest.fn() },
} }));

const message = (role: 'user' | 'model', text: string): ChatMessage => ({ id: `${role}-${text}`, role, text, createdAt: 100 });

describe('gemini-skin-consultant', () => {
  beforeEach(() => jest.clearAllMocks());

  it('formats user history and omits errors', () => {
    const contents = formatGeminiContents([
      message('model', 'ยินดีต้อนรับ'), message('user', 'สิว'),
      { ...message('model', 'error'), isError: true }, message('user', 'ช่วยแนะนำ'),
    ]);
    expect(contents).toEqual([{ role: 'user', parts: [{ text: 'สิว' }, { text: 'ช่วยแนะนำ' }] }]);
  });

  it('rejects empty conversations before network access', async () => {
    const result = await sendSkinChatMessage([message('model', 'สวัสดี')]);
    expect(result.ok).toBe(false);
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it('requires a signed-in user', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });
    const result = await sendSkinChatMessage([message('user', 'สิว')]);
    expect(result.ok).toBe(false);
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('calls authenticated Edge Function and returns answer', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: { answer: 'ใช้คลีนเซอร์อ่อนโยน' }, error: null });
    const result = await sendSkinChatMessage([message('user', 'สิว')]);
    expect(result).toEqual({ ok: true, value: 'ใช้คลีนเซอร์อ่อนโยน' });
    expect(supabase.functions.invoke).toHaveBeenCalledWith('skin-chat-gemini', {
      body: { contents: [{ role: 'user', parts: [{ text: 'สิว' }] }] },
    });
  });
});
