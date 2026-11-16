export const defaultUserSettings = {
  routine_morning: false,
  routine_evening: false,
  skin_cycling: false,
  reanalysis_reminder: false,
  promotions: false,
  image_analysis: false,
  recommendation_personalization: false,
} as const;

export type UserSettings = { [Key in keyof typeof defaultUserSettings]: boolean };
export type UserSettingKey = keyof UserSettings;

export const settingsKeyByLabel = {
  'เตือนรูทีนตอนเช้า': 'routine_morning',
  'เตือนรูทีนตอนเย็น': 'routine_evening',
  'เตือนวันทำ Skin Cycling': 'skin_cycling',
  'แจ้งเตือนให้วิเคราะห์ผิวอีกครั้ง': 'reanalysis_reminder',
  'ข่าวสาร / โปรโมชั่น': 'promotions',
  'การใช้รูปภาพเพื่อวิเคราะห์': 'image_analysis',
  'การใช้ข้อมูลเพื่อปรับคำแนะนำ': 'recommendation_personalization',
} as const satisfies Record<string, UserSettingKey>;

export type PersistedSettingLabel = keyof typeof settingsKeyByLabel;

export function isPersistedSettingLabel(label: string): label is PersistedSettingLabel {
  return label in settingsKeyByLabel;
}
