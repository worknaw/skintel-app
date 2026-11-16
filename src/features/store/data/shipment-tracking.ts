import { supabase } from '@/core/supabase/client';

export type ShipmentTrackingEvent = Readonly<{
  statusCode: string | null;
  statusDescription: string | null;
  location: string | null;
  postcode: string | null;
  statusDate: string | null;
}>;

export type ShipmentTracking = Readonly<{
  trackingNumber: string;
  carrier: 'Thailand Post';
  checkedAt: string;
  events: readonly ShipmentTrackingEvent[];
}>;

const errorMessages: Record<string, string> = {
  unauthorized: 'กรุณาเข้าสู่ระบบใหม่ก่อนตรวจสอบพัสดุ',
  order_not_found: 'ไม่พบคำสั่งซื้อนี้ในบัญชีของคุณ',
  unsupported_carrier: 'ระบบติดตามอัตโนมัติรองรับเฉพาะไปรษณีย์ไทย',
  not_shipped: 'คำสั่งซื้อนี้ยังไม่ถูกจัดส่ง',
  tracking_unavailable: 'ยังไม่มีเลขพัสดุที่ถูกต้องสำหรับคำสั่งซื้อนี้',
  not_configured: 'ระบบติดตามพัสดุยังไม่ได้ตั้งค่า API key',
  rate_limited: 'ตรวจสอบพัสดุบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
  carrier_unavailable: 'เชื่อมต่อระบบไปรษณีย์ไทยไม่สำเร็จ กรุณาลองใหม่',
};

async function getErrorCode(error: unknown): Promise<string | null> {
  if (!error || typeof error !== 'object' || !('context' in error)) return null;
  const context = (error as { context?: unknown }).context;
  if (!context || typeof context !== 'object' || !('clone' in context) || typeof context.clone !== 'function') return null;
  const response = (context as Response).clone();
  const body = await response.json().catch(() => null) as { error?: unknown } | null;
  return typeof body?.error === 'string' ? body.error : null;
}

function isEvent(value: unknown): value is ShipmentTrackingEvent {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return ['statusCode', 'statusDescription', 'location', 'postcode', 'statusDate']
    .every((key) => item[key] === null || typeof item[key] === 'string');
}

export async function getShipmentTracking(orderId: string): Promise<ShipmentTracking> {
  if (!orderId) throw new Error('ไม่พบหมายเลขคำสั่งซื้อ');
  const { data, error } = await supabase.functions.invoke('track-shipment', { body: { orderId } });
  if (error) {
    const code = await getErrorCode(error);
    throw new Error((code && errorMessages[code]) || 'ตรวจสอบสถานะพัสดุไม่สำเร็จ กรุณาลองใหม่');
  }
  if (!data || typeof data !== 'object' || typeof data.trackingNumber !== 'string'
    || data.carrier !== 'Thailand Post' || typeof data.checkedAt !== 'string'
    || !Array.isArray(data.events) || !data.events.every(isEvent)) {
    throw new Error('ข้อมูลสถานะพัสดุไม่ถูกต้อง กรุณาลองใหม่');
  }
  return data as ShipmentTracking;
}
