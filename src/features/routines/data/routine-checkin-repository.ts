import { supabase } from '@/core/supabase/client';
import type { RoutinePeriod } from '@/features/routines/domain/routine';

export type RoutineCheckin = Readonly<{ completedStepIds: readonly string[] }>;
export type RoutineCheckinDay = Readonly<{ date: string; period: RoutinePeriod; completedStepIds: readonly string[] }>;

export async function getRoutineCheckin(userId: string, routineDate: string, period: RoutinePeriod): Promise<RoutineCheckin> {
  const { data, error } = await supabase.from('user_routine_checkins')
    .select('completed_step_ids').eq('user_id', userId).eq('routine_date', routineDate).eq('period', period).maybeSingle<{ completed_step_ids: string[] }>();
  if (error) throw error;
  return { completedStepIds: data?.completed_step_ids ?? [] };
}

export async function saveRoutineCheckin(userId: string, routineDate: string, period: RoutinePeriod, completedStepIds: readonly string[]): Promise<void> {
  const { error } = await supabase.from('user_routine_checkins').upsert({
    user_id: userId,
    routine_date: routineDate,
    period,
    completed_step_ids: [...new Set(completedStepIds)].slice(0, 12),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,routine_date,period' });
  if (error) throw error;
}

export async function getRoutineCheckinDays(userId: string, startDate: string, endDate: string): Promise<readonly RoutineCheckinDay[]> {
  const { data, error } = await supabase.from('user_routine_checkins')
    .select('routine_date,period,completed_step_ids')
    .eq('user_id', userId)
    .gte('routine_date', startDate)
    .lte('routine_date', endDate)
    .order('routine_date');
  if (error) throw error;
  return (data ?? []).map((item) => ({
    date: item.routine_date,
    period: item.period as RoutinePeriod,
    completedStepIds: item.completed_step_ids ?? [],
  }));
}
