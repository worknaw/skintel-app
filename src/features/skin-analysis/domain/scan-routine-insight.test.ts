import { isFreshScanRoutineInsight, scoreFromPrototypeAcneCount } from './scan-routine-insight';

describe('scan routine insight', () => {
  it('converts prototype acne detections into a bounded routine score', () => {
    expect(scoreFromPrototypeAcneCount(0)).toBe(100);
    expect(scoreFromPrototypeAcneCount(4)).toBe(76);
    expect(scoreFromPrototypeAcneCount(100)).toBe(45);
    expect(scoreFromPrototypeAcneCount(-2)).toBe(100);
    expect(scoreFromPrototypeAcneCount(Number.NaN)).toBe(45);
  });

  it('accepts only valid insights from the last fourteen days', () => {
    const now = new Date('2026-01-15T12:00:00.000Z');
    const insight = { score: 58, acneCount: 7, modelVersion: 'prototype', createdAt: '2026-01-08T12:00:00.000Z' };
    expect(isFreshScanRoutineInsight(insight, now)).toBe(true);
    expect(isFreshScanRoutineInsight({ ...insight, createdAt: '2025-12-31T12:00:00.000Z' }, now)).toBe(false);
    expect(isFreshScanRoutineInsight({ ...insight, createdAt: '2026-01-16T12:00:00.000Z' }, now)).toBe(false);
    expect(isFreshScanRoutineInsight({ ...insight, score: Number.NaN }, now)).toBe(false);
  });
});
