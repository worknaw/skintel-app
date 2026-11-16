/* eslint-disable import/first, @typescript-eslint/no-require-imports */

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', TIME_INTERVAL: 'timeInterval' },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));

import type * as Notifications from 'expo-notifications';

import { clearLocalReminderNotifications, getReminderDefinitions, requestLocalNotificationPermission, synchronizeLocalReminderNotifications } from './local-notifications';
import { defaultUserSettings } from '@/features/settings/domain/user-settings';

const notificationApi = require('expo-notifications') as jest.Mocked<typeof Notifications>;

describe('local reminder notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    notificationApi.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
    notificationApi.getAllScheduledNotificationsAsync.mockResolvedValue([]);
    notificationApi.setNotificationChannelAsync.mockResolvedValue(null);
    notificationApi.scheduleNotificationAsync.mockResolvedValue('scheduled-id');
  });

  it('defines the three usable routine reminders with deterministic daily times', () => {
    expect(getReminderDefinitions().map((reminder) => reminder.key)).toEqual([
      'routine_morning', 'routine_evening', 'skin_cycling',
    ]);
    expect(getReminderDefinitions()[0]?.trigger).toMatchObject({ type: 'daily', hour: 8, minute: 0 });
    expect(getReminderDefinitions()[2]?.trigger).toMatchObject({ type: 'daily', hour: 19, minute: 30 });
  });

  it('creates the Android channel before requesting notification permission', async () => {
    notificationApi.getPermissionsAsync.mockResolvedValue({ granted: false } as never);
    notificationApi.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);
    await expect(requestLocalNotificationPermission()).resolves.toBe('granted');
    expect(notificationApi.setNotificationChannelAsync.mock.invocationCallOrder[0])
      .toBeLessThan(notificationApi.requestPermissionsAsync.mock.invocationCallOrder[0]);
  });

  it('replaces only SkinCycle-owned reminders with the currently enabled settings', async () => {
    notificationApi.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'owned', content: { data: { source: 'skincycle-local-reminder' } } },
      { identifier: 'other-app', content: { data: { source: 'other-app' } } },
    ] as never);

    await expect(synchronizeLocalReminderNotifications({ ...defaultUserSettings, routine_morning: true, skin_cycling: true })).resolves.toBe('granted');

    expect(notificationApi.cancelScheduledNotificationAsync).toHaveBeenCalledWith('owned');
    expect(notificationApi.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('other-app');
    expect(notificationApi.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(notificationApi.setNotificationChannelAsync).toHaveBeenCalledWith('skincycle-reminders', expect.any(Object));
  });

  it('clears only managed reminders when every reminder is disabled', async () => {
    notificationApi.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'owned', content: { data: { source: 'skincycle-local-reminder' } } },
    ] as never);

    await expect(clearLocalReminderNotifications()).resolves.toBeUndefined();
    expect(notificationApi.cancelScheduledNotificationAsync).toHaveBeenCalledWith('owned');
  });
});
