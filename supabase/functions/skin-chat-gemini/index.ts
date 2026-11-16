import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const MAX_BODY_BYTES = 16_384;
const instruction = `คุณคือ SkinCycle AI Consultant ตอบคำถามเรื่องผิวและสกินแคร์เป็นภาษาไทยอย่างสุภาพ กระชับและอิงหลักฐาน ให้คำแนะนำรูทีนเช้าเย็น การเลือกส่วนผสมและ Skin Cycling ที่ปลอดภัย เน้นคลีนเซอร์อ่อนโยน มอยส์เจอไรเซอร์และกันแดด หลีกเลี่ยงการใช้สารออกฤทธิ์เข้มข้นหลายชนิดพร้อมกัน แนะนำ patch test ก่อนใช้ผลิตภัณฑ์ใหม่ คุณไม่ใช่แพทย์ ห้ามวินิจฉัยโรคหรือสั่งยา หากอาการรุนแรง บวมแดง ติดเชื้อ หรือผิดปกติให้พบแพทย์ผิวหนัง`;

async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid_body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new Error('body_too_large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return reply(401, { error: 'unauthorized' });
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!url || !serviceKey || !geminiKey) return reply(503, { error: 'not_configured' });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user || auth.user.is_anonymous) return reply(401, { error: 'unauthorized' });
  let body: unknown;
  try { body = await readBody(request); } catch { return reply(400, { error: 'invalid_body' }); }
  const contents = (body as { contents?: unknown })?.contents;
  if (!Array.isArray(contents) || contents.length < 1 || contents.length > 20) return reply(400, { error: 'invalid_contents' });
  if (!contents.every((entry) => entry && typeof entry === 'object'
    && ['user', 'model'].includes(entry.role)
    && Array.isArray(entry.parts) && entry.parts.length > 0 && entry.parts.length <= 3
    && entry.parts.every((part: unknown) => part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string'
      && (part as { text: string }).text.length <= 1000))) return reply(400, { error: 'invalid_contents' });
  if (contents[0].role !== 'user' || contents[contents.length - 1].role !== 'user') return reply(400, { error: 'invalid_contents' });
  const { count } = await admin.from('skin_chat_rate_limits').select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id).gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if ((count ?? 0) >= 20) return reply(429, { error: 'rate_limited' });
  const { error: rateError } = await admin.from('skin_chat_rate_limits').insert({ user_id: auth.user.id });
  if (rateError) return reply(503, { error: 'rate_limit_unavailable' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: instruction }] }, contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 } }),
    });
    if (!upstream.ok) return reply(upstream.status === 429 ? 429 : 502, { error: upstream.status === 429 ? 'rate_limited' : 'gemini_unavailable' });
    const payload = await upstream.json();
    const answer = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('').trim();
    if (typeof answer !== 'string' || !answer || answer.length > 8000) return reply(502, { error: 'invalid_ai_response' });
    return reply(200, { answer });
  } catch { return reply(502, { error: 'gemini_unavailable' }); }
  finally { clearTimeout(timer); }
});
