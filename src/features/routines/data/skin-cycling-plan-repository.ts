import { supabase } from '@/core/supabase/client';
import type { RoutineRole } from '@/features/products/domain/product';
import type { PlannedDayType, SkinCyclingPlan, SkinCyclingPlanDay } from '@/features/routines/domain/skin-cycling-plan';

type DayRow = { id: string; routine_date: string; day_type: PlannedDayType; rationale: string; morning_roles: string[]; evening_roles: string[] };
type PlanRow = { id: string; start_date: string; end_date: string; plan_intensity: SkinCyclingPlan['planIntensity']; primary_focus: SkinCyclingPlan['primaryFocus']; skin_cycling_plan_days: DayRow[] | null };
const roles = new Set<RoutineRole>(['cleanser', 'hydrator', 'treatment', 'moisturizer', 'sunscreen']);
function asRoles(value: readonly string[]): readonly RoutineRole[] { return value.filter((item): item is RoutineRole => roles.has(item as RoutineRole)); }
function mapDay(row: DayRow): SkinCyclingPlanDay { return { id: row.id, routineDate: row.routine_date, dayType: row.day_type, rationale: row.rationale, morningRoles: asRoles(row.morning_roles ?? []), eveningRoles: asRoles(row.evening_roles ?? []) }; }

export async function getActiveSkinCyclingPlan(userId: string): Promise<SkinCyclingPlan | null> {
  const { data, error } = await supabase.from('skin_cycling_plans')
    .select('id,start_date,end_date,plan_intensity,primary_focus,skin_cycling_plan_days(id,routine_date,day_type,rationale,morning_roles,evening_roles)')
    .eq('user_id', userId).eq('status', 'active').maybeSingle<PlanRow>();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, startDate: data.start_date, endDate: data.end_date, planIntensity: data.plan_intensity, primaryFocus: data.primary_focus, days: (data.skin_cycling_plan_days ?? []).map(mapDay).sort((a, b) => a.routineDate.localeCompare(b.routineDate)) };
}
