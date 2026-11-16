import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Palette, Radius, Spacing } from '@/constants/theme';

import { AppText } from './app-text';

export type AppNotificationVariant = 'success' | 'error' | 'info' | 'warning';

export type AppNotificationAction = Readonly<{
  label: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}>;

export type AppNotification = Readonly<{
  title: string;
  message?: string;
  variant?: AppNotificationVariant;
  actions?: readonly AppNotificationAction[];
}>;

type AppNotificationContextValue = Readonly<{
  showNotification: (notification: AppNotification) => void;
  hideNotification: () => void;
}>;

const AppNotificationContext = createContext<AppNotificationContextValue | null>(null);

const variantDetails = {
  success: { icon: 'check-circle-outline', background: Palette.softGreen, color: Palette.primaryDark },
  error: { icon: 'alert-circle-outline', background: Palette.mutedRose, color: Palette.danger },
  info: { icon: 'information-outline', background: Palette.softBlue, color: Palette.primaryDark },
  warning: { icon: 'alert-outline', background: Palette.softPeach, color: '#A85D27' },
} as const;

export function AppNotificationProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const hideNotification = useCallback(() => setNotification(null), []);
  const showNotification = useCallback((nextNotification: AppNotification) => setNotification(nextNotification), []);
  const value = useMemo(() => ({ showNotification, hideNotification }), [hideNotification, showNotification]);

  const variant = notification?.variant ?? 'info';
  const details = variantDetails[variant];
  const actions = notification?.actions?.length
    ? notification.actions
    : [{ label: 'ตกลง', style: 'default' as const }];

  const pressAction = (action: AppNotificationAction) => {
    hideNotification();
    action.onPress?.();
  };

  return (
    <AppNotificationContext value={value}>
      {children}
      <Modal
        transparent
        visible={notification !== null}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={hideNotification}>
        <View style={styles.scrim}>
          <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.dialog}>
            <View style={[styles.iconContainer, { backgroundColor: details.background }]}>
              <MaterialCommunityIcons name={details.icon} size={28} color={details.color} />
            </View>
            <View style={styles.copy}>
              <AppText variant="h3">{notification?.title}</AppText>
              {notification?.message ? <AppText tone="secondary">{notification.message}</AppText> : null}
            </View>
            <View style={[styles.actions, actions.length > 1 && styles.multipleActions]}>
              {actions.map((action, index) => {
                const destructive = action.style === 'destructive';
                const secondary = action.style === 'cancel';
                return (
                  <Pressable
                    key={`${action.label}-${index}`}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    onPress={() => pressAction(action)}
                    style={({ pressed }) => [
                      styles.action,
                      secondary && styles.secondaryAction,
                      destructive && styles.destructiveAction,
                      pressed && styles.actionPressed,
                    ]}>
                    <AppText variant="button" tone={secondary ? 'brand' : 'inverse'}>{action.label}</AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AppNotificationContext>
  );
}

export function useAppNotification() {
  const value = use(AppNotificationContext);
  if (!value) throw new Error('useAppNotification must be used within AppNotificationProvider');
  return value;
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'center', padding: Spacing.five, backgroundColor: 'rgba(25, 35, 29, 0.42)' },
  dialog: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: Spacing.four, padding: Spacing.five, borderRadius: Radius.large, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, shadowColor: '#1A2B20', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  iconContainer: { width: 52, height: 52, borderRadius: Radius.round, alignItems: 'center', justifyContent: 'center' },
  copy: { gap: Spacing.one },
  actions: { gap: Spacing.two },
  multipleActions: { flexDirection: 'row' },
  action: { flex: 1, minHeight: 46, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.three, backgroundColor: Palette.primaryDark },
  secondaryAction: { backgroundColor: Palette.softGreen, borderWidth: 1, borderColor: Palette.border },
  destructiveAction: { backgroundColor: Palette.danger },
  actionPressed: { opacity: 0.78 },
});
