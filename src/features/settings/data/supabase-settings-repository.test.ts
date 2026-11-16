import { defaultUserSettings, settingsKeyByLabel } from '../domain/user-settings';

describe('user settings domain', () => {
  it('maps each persisted setting label to a stable database key', () => {
    expect(settingsKeyByLabel['เตือนรูทีนตอนเช้า']).toBe('routine_morning');
    expect(settingsKeyByLabel['การใช้ข้อมูลเพื่อปรับคำแนะนำ']).toBe('recommendation_personalization');
  });

  it('starts every privacy and notification preference disabled', () => {
    expect(defaultUserSettings).toEqual({
      routine_morning: false,
      routine_evening: false,
      skin_cycling: false,
      reanalysis_reminder: false,
      promotions: false,
      image_analysis: false,
      recommendation_personalization: false,
    });
  });
});
