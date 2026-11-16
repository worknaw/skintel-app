import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const noStoreHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders };
const tokenUrl = 'https://trackapi.thailandpost.co.th/post/api/v1/authenticate/token';
const trackingUrl = 'https://trackapi.thailandpost.co.th/post/api/v1/track';
const rateWindowMs = 60_000;
const maxRequestsPerUser = 8;
const recentRequests = new Map<string, number[]>();

type TrackingEvent = Readonly<{
  statusCode: string | null;
  statusDescription: string | null;
  location: string | null;
  postcode: string | null;
  statusDate: string | null;
}>;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: noStoreHeaders });
}

function allowRequest(userId: string, now = Date.now()) {
  const recent = (recentRequests.get(userId) ?? []).filter((time) => now - time < rateWindowMs);
  if (recent.length >= maxRequestsPerUser) {
    recentRequests.set(userId, recent);
    return false;
  }
  recent.push(now);
  recentRequests.set(userId, recent);
  if (recentRequests.size > 5000) {
    for (const [id, times] of recentRequests) {
      if (!times.some((time) => now - time < rateWindowMs)) recentRequests.delete(id);
    }
  }
  return true;
}

async function readOrderId(request: Request): Promise<string | null> {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return null;
  if (Number(request.headers.get('content-length') ?? 0) > 1024) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const text = new TextDecoder().decode(bytes);
  if (!text) return null;
  try {
    const value = JSON.parse(text) as { orderId?: unknown };
    return typeof value.orderId === 'string' && /^[0-9a-f-]{36}$/i.test(value.orderId) ? value.orderId : null;
  } catch {
    return null;
  }
}

async function fetchJson(url: string, init: RequestInit, timeoutMs = 12_000): Promise<{ response: Response; body: Record<string, unknown> | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const parsed = await response.json().catch(() => null);
    const body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

function safeText(value: unknown, maxLength = 160): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim().replace(/[\u0000-\u001f\u007f]/g, '');
  return text ? text.slice(0, maxLength) : null;
}

function toTrackingEvent(value: unknown): TrackingEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  return {
    statusCode: safeText(item.status, 32),
    statusDescription: safeText(item.status_description),
    location: safeText(item.location),
    postcode: safeText(item.postcode, 16),
    statusDate: safeText(item.status_date, 64),
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const thailandPostKey = Deno.env.get('THAILAND_POST_API_KEY') ?? Deno.env.get('THAIPOST_TOKEN');
  if (!token) return json(401, { error: 'unauthorized' });
  if (!url || !serviceKey) return json(503, { error: 'not_configured' });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user || auth.user.is_anonymous) return json(401, { error: 'unauthorized' });

  const orderId = await readOrderId(request);
  if (!orderId) return json(400, { error: 'invalid_request' });
  const { data: order, error: orderError } = await admin.from('store_orders')
    .select('id,user_id,status,shipping_carrier,tracking_number')
    .eq('id', orderId).eq('user_id', auth.user.id).maybeSingle();
  if (orderError || !order) return json(404, { error: 'order_not_found' });
  const carrier = String(order.shipping_carrier ?? '').toLocaleLowerCase().replace(/[\s_-]+/g, '');
  if (!carrier.includes('thailandpost') && !carrier.includes('ไปรษณีย์ไทย')) return json(409, { error: 'unsupported_carrier' });
  if (!['shipped', 'completed'].includes(order.status)) return json(409, { error: 'not_shipped' });
  const trackingNumber = String(order.tracking_number ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{5,30}$/.test(trackingNumber)) return json(409, { error: 'tracking_unavailable' });
  if (!thailandPostKey) return json(503, { error: 'not_configured' });
  if (!allowRequest(auth.user.id)) return json(429, { error: 'rate_limited' });

  try {
    const tokenResult = await fetchJson(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Token ${thailandPostKey}` },
      body: '{}',
    });
    const postToken = tokenResult.body?.token;
    if (!tokenResult.response.ok || typeof postToken !== 'string' || !postToken) {
      return json(tokenResult.response.status === 429 ? 429 : 502, { error: tokenResult.response.status === 429 ? 'rate_limited' : 'carrier_unavailable' });
    }

    const trackingResult = await fetchJson(trackingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Token ${postToken}` },
      body: JSON.stringify({ status: 'all', language: 'TH', barcode: [trackingNumber] }),
    });
    if (!trackingResult.response.ok || !trackingResult.body?.status) {
      return json(trackingResult.response.status === 429 ? 429 : 502, { error: trackingResult.response.status === 429 ? 'rate_limited' : 'carrier_unavailable' });
    }
    const payload = trackingResult.body?.response;
    const items = payload && typeof payload === 'object' ? (payload as Record<string, unknown>).items : null;
    const rawEvents = items && typeof items === 'object' ? (items as Record<string, unknown>)[trackingNumber] : null;
    // Thailand Post returns events oldest first; the source project's sync job treats the final entry as latest.
    const events = Array.isArray(rawEvents) ? rawEvents.slice(-100).reverse().map(toTrackingEvent).filter((item): item is TrackingEvent => item !== null) : [];
    return json(200, { trackingNumber, carrier: 'Thailand Post', checkedAt: new Date().toISOString(), events });
  } catch {
    return json(502, { error: 'carrier_unavailable' });
  }
});
