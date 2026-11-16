import type { ProductId, RoutineRole } from '@/features/products/domain/product';

export type CycleDayType = 'active' | 'recovery' | 'rest' | 'hydration';
export type RoutinePeriod = 'am' | 'pm';

export type RoutineStep = Readonly<{
  id: string;
  order: number;
  period: RoutinePeriod;
  role: RoutineRole;
  productId: ProductId | null;
  title: string;
  reason: string;
}>;

export type RoutineDay = Readonly<{
  id: string;
  cycleIndex: number;
  type: CycleDayType;
  steps: readonly RoutineStep[];
}>;

export type Routine = Readonly<{
  id: string;
  userId: string;
  sourceAnalysisId: string;
  revision: number;
  rulesetVersion: string;
  days: readonly RoutineDay[];
  createdAt: string;
}>;

