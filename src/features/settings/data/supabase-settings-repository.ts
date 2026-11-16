import { supabase } from '@/core/supabase/client';
import { defaultUserSettings, type UserSettingKey, type UserSettings } from '@/features/settings/domain/user-settings';

type UserSettingsRow = UserSettings & { user_id: string };

function mapUserSettings(row: Partial<UserSettingsRow> | null): UserSettings {
  return {
    routine_morning: row?.routine_morning ?? defaultUserSettings.routine_morning,
    routine_evening: row?.routine_evening ?? defaultUserSettings.routine_evening,
    skin_cycling: row?.skin_cycling ?? defaultUserSettings.skin_cycling,
    reanalysis_reminder: row?.reanalysis_reminder ?? defaultUserSettings.reanalysis_reminder,
    promotions: row?.promotions ?? defaultUserSettings.promotions,
    image_analysis: row?.image_analysis ?? defaultUserSettings.image_analysis,
    recommendation_personalization: row?.recommendation_personalization ?? defaultUserSettings.recommendation_personalization,
  };
}

export async function loadUserSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('routine_morning,routine_evening,skin_cycling,reanalysis_reminder,promotions,image_analysis,recommendation_personalization')
    .eq('user_id', userId)
    .maybeSingle<UserSettings>();

  if (error) throw error;
  return mapUserSettings(data);
}

export async function saveUserSetting(userId: string, key: UserSettingKey, value: boolean): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, [key]: value }, { onConflict: 'user_id' })
    .select('routine_morning,routine_evening,skin_cycling,reanalysis_reminder,promotions,image_analysis,recommendation_personalization')
    .single<UserSettings>();

  if (error) throw error;
  return mapUserSettings(data);
}
