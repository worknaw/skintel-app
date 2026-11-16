import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ScanRoutineInsight } from '@/features/skin-analysis/domain/scan-routine-insight';

const keyFor = (userId: string) => `skincycle:last-scan-routine-insight:${userId}`;

function isScanRoutineInsight(value: unknown): value is ScanRoutineInsight {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.score === 'number' && Number.isFinite(item.score)
    && typeof item.acneCount === 'number' && Number.isFinite(item.acneCount)
    && typeof item.modelVersion === 'string' && typeof item.createdAt === 'string';
}

/** Stores only a compact result for routine personalization; never a face image. */
export async function saveLatestScanRoutineInsight(userId: string, insight: ScanRoutineInsight): Promise<void> {
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(insight));
}

export async function getLatestScanRoutineInsight(userId: string): Promise<ScanRoutineInsight | null> {
  const raw = await AsyncStorage.getItem(keyFor(userId));
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isScanRoutineInsight(value) ? value : null;
  } catch {
    return null;
  }
}
