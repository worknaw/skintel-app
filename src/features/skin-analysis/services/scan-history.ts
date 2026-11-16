import { supabase } from '@/core/supabase/client';
import type { GeminiScanResult } from './gemini-scan';

export type ScanHistoryItem = Readonly<{
  id: string;
  createdAt: string;
  modelVersion: string;
  result: GeminiScanResult;
}>;

function isResult(value: unknown): value is GeminiScanResult {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return ['visible_acne', 'visible_redness', 'visible_marks', 'skin_tendency', 'limitation'].every((key) => typeof item[key] === 'string')
    && Array.isArray(item.morning) && item.morning.every((text) => typeof text === 'string')
    && Array.isArray(item.evening) && item.evening.every((text) => typeof text === 'string');
}

export async function loadScanHistory(): Promise<ScanHistoryItem[]> {
  const { data, error } = await supabase.from('skin_analysis_results')
    .select('scan_id,model_version,observations,skin_scans!inner(created_at)')
    .order('created_at', { ascending: false }).limit(30);
  if (error) throw new Error('โหลดประวัติสแกนไม่สำเร็จ');
  return (data ?? []).flatMap<ScanHistoryItem>((row) => {
    const observation = Array.isArray(row.observations) ? row.observations[0] : null;
    const scan = row.skin_scans as unknown as { created_at?: string } | null;
    if (!scan?.created_at) return [];
    return isResult(observation) ? [{ id: row.scan_id, createdAt: scan.created_at, modelVersion: row.model_version, result: observation }] : [];
  });
}

export async function deleteScan(id: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_own_skin_scan', { p_scan_id: id });
  if (error || data !== true) throw new Error('ลบผลสแกนไม่สำเร็จ');
}
