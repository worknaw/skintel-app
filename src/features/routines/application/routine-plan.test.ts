import type { ProductSummary } from '@/features/products/domain/product';
import type { SkinProfile } from '@/features/skin-profile/domain/skin-profile';

import { buildDailyRoutine, buildDailyRoutineFromPlan, findCompatibleAlternatives, getCycleDay, getLocalDateKey } from './routine-plan';

const profile: SkinProfile = {
  userId: 'owner',
  skinType: 'dry',
  concernIds: ['dryness'],
  avoidIngredientIds: [],
  monthlyBudgetMinor: null,
  budgetCurrency: 'THB',
  onboardingCompletedAt: '2026-01-01T08:00:00.000+07:00',
};

const products: readonly ProductSummary[] = [
  { id: 'cleanser', brandName: 'SkinCycle', name: 'Cleanser', imageUrl: null, categoryId: 'cleanser', reviewCount: 0, startingPrice: null, tags: [], routineRoles: ['cleanser'] },
  { id: 'treatment', brandName: 'SkinCycle', name: 'Treatment', imageUrl: null, categoryId: 'treatment', reviewCount: 0, startingPrice: null, tags: [], routineRoles: ['treatment'] },
];

describe('routine plan', () => {
  it('uses a deterministic four-night cycle from local calendar days', () => {
    expect(getCycleDay(new Date('2026-01-01T20:00:00.000+07:00'), profile.onboardingCompletedAt)).toBe('active');
    expect(getCycleDay(new Date('2026-01-02T20:00:00.000+07:00'), profile.onboardingCompletedAt)).toBe('recovery');
    expect(getCycleDay(new Date('2026-01-05T20:00:00.000+07:00'), profile.onboardingCompletedAt)).toBe('active');
  });

  it('includes a treatment only for an active night and picks matching products', () => {
    const active = buildDailyRoutine(profile, products, new Date('2026-01-01T20:00:00.000+07:00'));
    const recovery = buildDailyRoutine(profile, products, new Date('2026-01-02T20:00:00.000+07:00'));

    expect(active.evening.map((step) => step.role)).toContain('treatment');
    expect(recovery.evening.map((step) => step.role)).not.toContain('treatment');
    expect(active.morning.find((step) => step.role === 'cleanser')?.product?.id).toBe('cleanser');
    expect(active.evening.find((step) => step.role === 'treatment')?.product?.id).toBe('treatment');
  });

  it('formats calendar keys without UTC date shifts', () => {
    expect(getLocalDateKey(new Date(2026, 0, 2, 0, 1))).toBe('2026-01-02');
  });

  it('temporarily uses a recovery night for a recent low scan score', () => {
    const routine = buildDailyRoutine(profile, products, new Date('2026-01-01T20:00:00.000+07:00'), {
      score: 54, acneCount: 9, modelVersion: 'prototype', createdAt: '2026-01-01T10:00:00.000+07:00',
    });
    expect(routine.cycleDay).toBe('recovery');
    expect(routine.evening.map((step) => step.role)).not.toContain('treatment');
    expect(routine.scanNote).toContain('Recovery night');
  });

  it('only offers routine replacements with the same role and a shared key ingredient', () => {
    const current = { ...products[1], keyIngredients: ['Salicylic Acid'] };
    const matches = [
      current,
      { ...products[1], id: 'same-active', keyIngredients: ['Salicylic Acid', 'Niacinamide'] },
      { ...products[1], id: 'different-active', keyIngredients: ['Retinol'] },
      { ...products[0], id: 'wrong-role', keyIngredients: ['Salicylic Acid'] },
    ];
    expect(findCompatibleAlternatives(current, matches, 'treatment').map((product) => product.id)).toEqual(['same-active']);
  });

  it('uses the persisted plan roles instead of the legacy four-night cycle', () => {
    const routine = buildDailyRoutineFromPlan(products, {
      id: 'day-8', routineDate: '2026-01-08', dayType: 'exfoliate', rationale: 'คืนผลัดเซลล์ตามแผน',
      morningRoles: ['cleanser'], eveningRoles: ['cleanser', 'treatment'],
    });
    expect(routine.cycleLabel).toBe('ผลัดเซลล์');
    expect(routine.evening.map((step) => step.role)).toEqual(['cleanser', 'treatment']);
    expect(routine.scanNote).toBe('คืนผลัดเซลล์ตามแผน');
  });
});
