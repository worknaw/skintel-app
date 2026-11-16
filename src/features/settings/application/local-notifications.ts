/* eslint-disable @typescript-eslint/no-require-imports */
import type * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { UserSettingKey, UserSettings } from '@/features/settings/domain/user-settings';

const MANAGED_SOURCE = 'skincycle-local-reminder';
const ANDROID_CHANNEL_ID = 'skincycle-reminders';

export const localNotificationKeys = [
  'routine_morning',
  'routine_evening',
  'skin_cycling',
] as const satisfies readonly UserSettingKey[];

type LocalNotificationKey = (typeof localNotificationKeys)[number];
export type NotificationPermissionResult = 'granted' | 'denied' | 'unsupported';

type ReminderDefinition = Readonly<{
  key: LocalNotificationKey;
  title: string;
  body: string;
  url: '/routine';
  trigger: Notifications.SchedulableNotificationTriggerInput;
}>;

type NotificationsApi = typeof import('expo-notifications');

function getNotifications(): NotificationsApi {
  return require('expo-notifications') as NotificationsApi;
}

function isPermissionGranted(status: Notifications.NotificationPermissionsStatus): boolean {
  return status.granted || status.ios?.status === getNotifications().IosAuthorizationStatus.PROVISIONAL;
}

export function isLocalNotificationKey(key: UserSettingKey): key is LocalNotificationKey {
  return (localNotificationKeys as readonly string[]).includes(key);
}

export function getReminderDefinitions(): readonly ReminderDefinition[] {
  const Notifications = getNotifications();
  const channelId = Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {};
  return [
    {
      key: 'routine_morning',
      title: 'รูทีนตอนเช้าของคุณ',
      body: 'เริ่มดูแลผิวตามรูทีนเช้าของวันนี้',
      url: '/routine',
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 8, minute: 0, ...channelId },
    },
    {
      key: 'routine_evening',
      title: 'รูทีนตอนเย็นของคุณ',
      body: 'ถึงเวลาดูแลผิวและบันทึกรูทีนคืนนี้',
      url: '/routine',
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 20, minute: 30, ...channelId },
    },
    {
      key: 'skin_cycling',
      title: 'Skin Cycling คืนนี้',
      body: 'ตรวจสอบขั้นตอน Skin Cycling ที่เหมาะกับผิวของคุณ',
      url: '/routine',
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 19, minute: 30, ...channelId },
    },
  ];
}

function isManagedRequest(request: Notifications.NotificationRequest): boolean {
  return request.content.data?.source === MANAGED_SOURCE;
}

async function configureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = getNotifications();
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'SkinCycle reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function requestLocalNotificationPermission(): Promise<NotificationPermissionResult> {
  if (Platform.OS === 'web') return 'unsupported';
  await configureAndroidChannel();
  const Notifications = getNotifications();
  const existing = await Notifications.getPermissionsAsync();
  if (isPermissionGranted(existing)) return 'granted';
  const requested = await Notifications.requestPermissionsAsync();
  return isPermissionGranted(requested) ? 'granted' : 'denied';
}

async function cancelManagedNotifications(): Promise<void> {
  const Notifications = getNotifications();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter(isManagedRequest).map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
}

let syncTail: Promise<void> = Promise.resolve();

function queueNotificationWork<T>(work: () => Promise<T>): Promise<T> {
  const next = syncTail.catch(() => undefined).then(work);
  syncTail = next.then(() => undefined, () => undefined);
  return next;
}

export function clearLocalReminderNotifications(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  return queueNotificationWork(cancelManagedNotifications);
}

export function synchronizeLocalReminderNotifications(settings: UserSettings, requestPermission = false): Promise<NotificationPermissionResult> {
  if (Platform.OS === 'web') return Promise.resolve('unsupported');
  return queueNotificationWork(async () => {
    const Notifications = getNotifications();
    const reminders = getReminderDefinitions().filter((definition) => settings[definition.key]);
    if (reminders.length === 0) {
      await cancelManagedNotifications();
      return 'granted';
    }

    const permission = requestPermission
      ? await requestLocalNotificationPermission()
      : (isPermissionGranted(await Notifications.getPermissionsAsync()) ? 'granted' : 'denied');
    if (permission !== 'granted') return permission;

    await configureAndroidChannel();
    await cancelManagedNotifications();
    await Promise.all(reminders.map((reminder) => Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        data: { source: MANAGED_SOURCE, settingKey: reminder.key, url: reminder.url },
      },
      trigger: reminder.trigger,
    })));
    return 'granted';
  });
}

if (Platform.OS !== 'web') {
  const Notifications = getNotifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
