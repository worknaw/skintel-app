import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash'] as const;
const CONSENT = 'gemini-vision-v1';
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_BODY_BYTES = 6 * 1024 * 1024;
const response = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function readBoundedJson(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid_body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new Error('image_too_large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid_body');
  return parsed;
}

function validResult(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return ['visible_acne', 'visible_redness', 'visible_marks'].every((key) =>
    ['ไม่พบชัดเจน', 'พบเล็กน้อย', 'พบปานกลาง', 'พบชัดเจน', 'ประเมินไม่ได้'].includes(String(item[key])))
    && ['dry', 'oily', 'normal', 'combination', 'unassessable'].includes(String(item.visual_skin_tendency))
    && ['gentle', 'balanced', 'active'].includes(String(item.plan_intensity))
    && ['hydration', 'acne', 'redness', 'marks', 'balance'].includes(String(item.primary_focus))
    && typeof item.skin_tendency_reason === 'string' && item.skin_tendency_reason.length <= 240
    && typeof item.limitation === 'string' && item.limitation.length <= 500
    && Array.isArray(item.morning) && item.morning.length <= 5 && item.morning.every((text) => typeof text === 'string' && text.length <= 180)
    && Array.isArray(item.evening) && item.evening.length <= 5 && item.evening.every((text) => typeof text === 'string' && text.length <= 180);
}

type Onboarding = Readonly<{
  skinType: 'dry' | 'oily' | 'combination' | 'normal' | 'unsure' | null;
  concernIds: string[];
  avoidIngredientIds: string[];
}>;

function parseOnboarding(value: unknown): Onboarding | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const profile = value as Record<string, unknown>;
  const skinType = profile.skinType;
  const concernIds = profile.concernIds;
  const avoidIngredientIds = profile.avoidIngredientIds;
  const validList = (items: unknown): items is string[] => Array.isArray(items)
    && items.length <= 20 && items.every((item) => typeof item === 'string' && item.length > 0 && item.length <= 80);
  if (skinType !== null && !['dry', 'oily', 'combination', 'normal', 'unsure'].includes(String(skinType))) return null;
  if (!validList(concernIds) || !validList(avoidIngredientIds)) return null;
  return { skinType: skinType as Onboarding['skinType'], concernIds, avoidIngredientIds };
}

function describeSkinType(skinType: Onboarding['skinType']): string {
  const labels: Record<NonNullable<Onboarding['skinType']>, string> = {
    dry: 'ผิวแห้ง', oily: 'ผิวมัน', combination: 'ผิวผสม', normal: 'ผิวปกติ', unsure: 'ยังไม่แน่ใจประเภทผิว',
  };
  return skinType ? labels[skinType] : 'ยังไม่ได้ระบุประเภทผิว';
}

const resultSchema = {
  type: 'object',
  properties: {
    visible_acne: { type: 'string', enum: ['ไม่พบชัดเจน', 'พบเล็กน้อย', 'พบปานกลาง', 'พบชัดเจน', 'ประเมินไม่ได้'] },
    visible_redness: { type: 'string', enum: ['ไม่พบชัดเจน', 'พบเล็กน้อย', 'พบปานกลาง', 'พบชัดเจน', 'ประเมินไม่ได้'] },
    visible_marks: { type: 'string', enum: ['ไม่พบชัดเจน', 'พบเล็กน้อย', 'พบปานกลาง', 'พบชัดเจน', 'ประเมินไม่ได้'] },
    visual_skin_tendency: { type: 'string', enum: ['dry', 'oily', 'normal', 'combination', 'unassessable'] },
    plan_intensity: { type: 'string', enum: ['gentle', 'balanced', 'active'] },
    primary_focus: { type: 'string', enum: ['hydration', 'acne', 'redness', 'marks', 'balance'] },
    skin_tendency_reason: { type: 'string' },
    limitation: { type: 'string' },
    morning: { type: 'array', items: { type: 'string' } },
    evening: { type: 'array', items: { type: 'string' } },
  },
  required: ['visible_acne', 'visible_redness', 'visible_marks', 'visual_skin_tendency', 'plan_intensity', 'primary_focus', 'skin_tendency_reason', 'limitation', 'morning', 'evening'],
};

function interactionText(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const steps = (payload as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) return null;
  for (const step of steps) {
    if (!step || typeof step !== 'object' || (step as { type?: unknown }).type !== 'model_output') continue;
    const content = (step as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    const text = content.find((item) => item && typeof item === 'object' && (item as { type?: unknown }).type === 'text' && typeof (item as { text?: unknown }).text === 'string') as { text: string } | undefined;
    if (text) return text.text;
  }
  return null;
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

type PlanIntensity = 'gentle' | 'balanced' | 'active';
type PlanFocus = 'hydration' | 'acne' | 'redness' | 'marks' | 'balance';
type PlanDayType = 'exfoliate' | 'hydrate' | 'recovery' | 'rest';

function resolveSkinTendency(visual: unknown, onboarding: Onboarding): string {
  const visualLabel = typeof visual === 'string' ? visual : 'unassessable';
  const profileLabel = onboarding.skinType;
  if (visualLabel === 'unassessable') return profileLabel && profileLabel !== 'unsure'
    ? `${describeSkinType(profileLabel)} (จาก onboarding; ภาพยังประเมินไม่ได้)` : 'ยังประเมินไม่ได้';
  // The image is the primary signal. Onboarding is supporting context only and
  // must not overwrite a clear visual estimate.
  return `มีแนวโน้ม${describeSkinType(visualLabel as NonNullable<Onboarding['skinType']>)}จากภาพ`;
}

function dateKey(offset: number) {
  const value = new Date();
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

/** Gemini selects intent; fixed spacing rules decide when an active may occur.
 * This prevents the model from scheduling consecutive/over-aggressive nights. */
function createPlanDays(rawIntensity: PlanIntensity, focus: PlanFocus, redness: string): Array<Record<string, unknown>> {
  const intensity: PlanIntensity = ['พบปานกลาง', 'พบชัดเจน'].includes(redness) ? 'gentle' : rawIntensity;
  const activeEvery = intensity === 'active' ? 6 : intensity === 'balanced' ? 8 : 99;
  return Array.from({ length: 30 }, (_, index) => {
    const dayNo = index + 1;
    const exfoliate = intensity !== 'gentle' && dayNo > 7 && (dayNo - 8) % activeEvery === 0;
    const previousWasActive = index > 0 && intensity !== 'gentle' && index > 7 && ((index - 8) % activeEvery === 0);
    const type: PlanDayType = exfoliate ? 'exfoliate'
      : previousWasActive ? 'recovery'
        : dayNo % 4 === 0 ? 'rest'
          : dayNo % 3 === 0 ? 'recovery' : 'hydrate';
    const rationale = type === 'exfoliate' ? 'คืนผลัดเซลล์ตามแผน ใช้สารบำรุงเพียงหนึ่งชนิดและตามด้วยมอยส์เจอไรเซอร์'
      : type === 'recovery' ? 'พักฟื้นผิวหลังการดูแล เน้นปลอบประโลมและความชุ่มชื้น'
        : type === 'hydrate' ? 'เน้นเติมน้ำและเสริมเกราะผิวให้สมดุล'
          : 'พักผิวด้วยรูทีนพื้นฐานที่อ่อนโยน';
    return { routine_date: dateKey(index), day_type: type, rationale, morning_roles: ['cleanser', 'hydrator', 'moisturizer', 'sunscreen'], evening_roles: type === 'exfoliate' ? ['cleanser', 'hydrator', 'treatment', 'moisturizer'] : ['cleanser', 'hydrator', 'moisturizer'] };
  });
}

async function analyzeWithGemini(imageBase64: string, onboarding: Onboarding, geminiKey: string): Promise<Readonly<{ model: string; text: string }>> {
  const prompt = `วิเคราะห์ภาพใบหน้าสำหรับแนะนำสกินแคร์เบื้องต้นเป็นภาษาไทย โดยยึดสิ่งที่มองเห็นในภาพเป็นหลัก ภาพนี้ให้ตรวจสิว รอยแดง รอยดำ/รอยสิว และแนวโน้มประเภทผิวอย่างเจาะจง ไม่ตอบกว้าง ๆ ว่า "พบลักษณะที่อาจเกี่ยวข้อง" ให้เลือกระดับ ไม่พบชัดเจน/พบเล็กน้อย/พบปานกลาง/พบชัดเจน/ประเมินไม่ได้ ตามสิ่งที่เห็นจริง หากภาพหน้าตรง แสงดี และใบหน้าชัด ต้องประเมินประเภทผิวจากภาพ: ผิวมันเมื่อเห็นความเงาหรือความมันเด่น, ผิวแห้งเมื่อเห็นความแห้งด้านหรือลอก, ผิวผสมเมื่อ T-zone มันแต่แก้มแห้ง/ปกติ, ผิวปกติเมื่อไม่เด่นด้านใด หากภาพไม่พอจริงเท่านั้นจึงตอบ unassessable ข้อมูล onboarding ใช้เป็นข้อมูลประกอบและห้ามบังคับให้ตอบตาม onboarding: ${JSON.stringify(onboarding)} ห้ามแต่งจำนวนหรือพิกัด ห้ามวินิจฉัยโรคหรือสรุปโรค ให้คำแนะนำเช้าและเย็นแบบสั้น ๆ และถ้าพบรุนแรง/ผิดปกติให้แนะนำพบแพทย์ เพิ่ม plan_intensity: gentle เมื่อผิวระคายเคือง/รอยแดงปานกลางขึ้นไป, balanced สำหรับทั่วไป, active เฉพาะเมื่อภาพสงบและเหมาะกับการผลัดเซลล์; เพิ่ม primary_focus เป็น hydration/acne/redness/marks/balance เท่านั้น นี่เป็นเพียงเจตนาของแผน ไม่ต้องสร้างตารางหรือแนะนำผลิตภัณฑ์เฉพาะ`;
  for (const [index, model] of GEMINI_MODELS.entries()) {
    if (index > 0) await wait(index * 700);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7_000);
    try {
      const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
        body: JSON.stringify({
          model,
          input: [
            { type: 'text', text: prompt },
            { type: 'image', mime_type: 'image/jpeg', data: imageBase64 },
          ],
          response_format: { type: 'text', mime_type: 'application/json', schema: resultSchema },
          generation_config: { max_output_tokens: 750 },
          store: false,
        }),
      });
      if (upstream.ok) {
        const text = interactionText(await upstream.json());
        if (!text) throw new Error('invalid_ai_response');
        return { model, text };
      }
      const details = (await upstream.text()).slice(0, 800);
      console.error('Gemini Interactions request failed', { model, status: upstream.status, details });
      if ([429, 503, 504].includes(upstream.status) && index < GEMINI_MODELS.length - 1) continue;
      if ([429, 503, 504].includes(upstream.status)) throw new Error('gemini_capacity');
      if (upstream.status === 400) throw new Error('gemini_invalid_request');
      if (upstream.status === 401 || upstream.status === 403) throw new Error('gemini_not_authorized');
      if (upstream.status === 404) throw new Error('gemini_model_unavailable');
      throw new Error('gemini_unavailable');
    } catch (error) {
      if (error instanceof Error && ['invalid_ai_response', 'gemini_invalid_request', 'gemini_not_authorized', 'gemini_model_unavailable', 'gemini_unavailable'].includes(error.message)) throw error;
      if (index === GEMINI_MODELS.length - 1) throw new Error('gemini_capacity');
    } finally { clearTimeout(timer); }
  }
  throw new Error('gemini_capacity');
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return response(405, { error: 'method_not_allowed' });
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return response(401, { error: 'unauthorized' });
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!url || !key || !geminiKey) return response(503, { error: 'not_configured' });
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user || auth.user.is_anonymous) return response(401, { error: 'unauthorized' });
  const { data: profile } = await admin.from('skin_profiles')
    .select('skin_type,concern_ids,avoid_ingredient_ids,onboarding_completed_at')
    .eq('user_id', auth.user.id).maybeSingle();
  const onboarding = parseOnboarding(profile ? {
    skinType: profile.skin_type,
    concernIds: profile.concern_ids,
    avoidIngredientIds: profile.avoid_ingredient_ids,
  } : null);
  if (!profile?.onboarding_completed_at || !onboarding) return response(400, { error: 'invalid_onboarding' });
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) return response(413, { error: 'image_too_large' });
  let body: Record<string, unknown>;
  try { body = await readBoundedJson(request); } catch (error) { return response(error instanceof Error && error.message === 'image_too_large' ? 413 : 400, { error: error instanceof Error && error.message === 'image_too_large' ? 'image_too_large' : 'invalid_body' }); }
  const { scanId, imageBase64 } = body;
  if (typeof scanId !== 'string' || !/^[0-9a-f-]{36}$/i.test(scanId)
    || typeof imageBase64 !== 'string' || imageBase64.length > MAX_BODY_BYTES || imageBase64.length < 100) return response(400, { error: 'invalid_body' });
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(imageBase64), (character) => character.charCodeAt(0)); } catch { return response(400, { error: 'invalid_image' }); }
  if (bytes.length > MAX_IMAGE_BYTES || bytes.length < 100 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return response(400, { error: 'invalid_image' });

  const { data: scan, error: scanError } = await admin.from('skin_scans')
    .select('id,status,consent_id')
    .eq('id', scanId).eq('user_id', auth.user.id).single();
  if (scanError || !scan || scan.status !== 'created' || !scan.consent_id) return response(403, { error: 'scan_not_authorized' });
  const { data: consent } = await admin.from('skin_scan_consents').select('consent_version')
    .eq('id', scan.consent_id).eq('user_id', auth.user.id).single();
  if (consent?.consent_version !== CONSENT) return response(403, { error: 'scan_not_authorized' });
  const { data: claimed } = await admin.from('skin_scans').update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', scanId).eq('user_id', auth.user.id).eq('status', 'created').select('id').maybeSingle();
  if (!claimed) return response(409, { error: 'already_processing' });

  try {
    const gemini = await analyzeWithGemini(imageBase64, onboarding, geminiKey);
    const result = JSON.parse(gemini.text);
    if (!validResult(result)) throw new Error('invalid_ai_response');
    const finalResult = { ...result, skin_tendency: resolveSkinTendency(result.visual_skin_tendency, onboarding) };
    const intensity = finalResult.plan_intensity as PlanIntensity;
    const focus = finalResult.primary_focus as PlanFocus;
    const { error: saveError } = await admin.rpc('complete_gemini_scan_with_plan', {
      p_scan_id: scanId, p_user_id: auth.user.id, p_model_version: gemini.model,
      p_observations: [{ ...finalResult, onboarding, source: 'gemini_vision', detections: null }],
      p_plan_intensity: intensity, p_primary_focus: focus,
      p_plan_days: createPlanDays(intensity, focus, String(finalResult.visible_redness)),
    });
    if (saveError) throw new Error('save_failed');
    return response(200, { result: finalResult, modelVersion: gemini.model });
  } catch (error) {
    const known = ['rate_limited', 'invalid_ai_response', 'save_failed', 'gemini_capacity', 'gemini_invalid_request', 'gemini_not_authorized', 'gemini_model_unavailable'];
    const code = error instanceof Error && known.includes(error.message) ? error.message : 'gemini_unavailable';
    await admin.from('skin_scans').update({ status: 'failed', error_code: code, updated_at: new Date().toISOString() }).eq('id', scanId).eq('user_id', auth.user.id);
    return response(code === 'rate_limited' ? 429 : 502, { error: code });
  }
});
