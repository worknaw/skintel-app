/**
 * A small, non-diagnostic summary that may personalize the next Skin Cycling
 * routine. It intentionally excludes the source image and bounding boxes.
 */
export type ScanRoutineInsight = Readonly<{
  score: number;
  acneCount: number;
  modelVersion: string;
  createdAt: string;
}>;

export function scoreFromPrototypeAcneCount(count: number): number {
  if (!Number.isFinite(count)) return 45;
  return Math.max(45, 100 - Math.max(0, Math.round(count)) * 6);
}

export function isFreshScanRoutineInsight(insight: ScanRoutineInsight | null, now = new Date()): boolean {
  if (!insight || !Number.isFinite(insight.score) || !Number.isFinite(insight.acneCount)) return false;
  const createdAt = new Date(insight.createdAt).getTime();
  return Number.isFinite(createdAt) && createdAt <= now.getTime() && now.getTime() - createdAt <= 14 * 86_400_000;
}
