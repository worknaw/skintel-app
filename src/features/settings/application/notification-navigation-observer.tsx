/* eslint-disable @typescript-eslint/no-require-imports */
import type * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const allowedTargets = new Set(['/routine', '/analysis']);

type NotificationsApi = typeof import('expo-notifications');

function getNotifications(): NotificationsApi {
  return require('expo-notifications') as NotificationsApi;
}

function navigateFromNotification(notification: Notifications.Notification) {
  const target = notification.request.content.data?.url;
  if (typeof target === 'string' && allowedTargets.has(target)) router.navigate(target as never);
}

export function NotificationNavigationObserver() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const Notifications = getNotifications();
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) navigateFromNotification(lastResponse.notification);
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromNotification(response.notification);
    });
    return () => subscription.remove();
  }, []);

  return null;
}
