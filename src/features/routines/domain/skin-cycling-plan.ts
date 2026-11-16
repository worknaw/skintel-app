import type { RoutineRole } from '@/features/products/domain/product';

export type PlannedDayType = 'exfoliate' | 'hydrate' | 'recovery' | 'rest';
export type SkinCyclingPlanDay = Readonly<{
  id: string;
  routineDate: string;
  dayType: PlannedDayType;
  rationale: string;
  morningRoles: readonly RoutineRole[];
  eveningRoles: readonly RoutineRole[];
}>;

export type SkinCyclingPlan = Readonly<{
  id: string;
  startDate: string;
  endDate: string;
  planIntensity: 'gentle' | 'balanced' | 'active';
  primaryFocus: 'hydration' | 'acne' | 'redness' | 'marks' | 'balance';
  days: readonly SkinCyclingPlanDay[];
}>;

export const plannedDayMeta: Record<PlannedDayType, Readonly<{ label: string; hint: string }>> = {
  exfoliate: { label: 'ผลัดเซลล์', hint: 'ใช้สารบำรุงเฉพาะคืนตามแผนเพียงหนึ่งชนิด' },
  hydrate: { label: 'เติมน้ำ', hint: 'เน้นเพิ่มและกักเก็บความชุ่มชื้น' },
  recovery: { label: 'พักฟื้น', hint: 'ลดขั้นตอนและปลอบประโลมเกราะผิว' },
  rest: { label: 'พักผิว', hint: 'ดูแลพื้นฐานอย่างอ่อนโยน' },
};
