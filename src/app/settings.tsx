import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { useAppNotification } from '@/components/ui/app-notification';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { settingsSections } from '@/features/settings/application/settings-sections';
import { settingsDestinations } from '@/features/settings/application/settings-content';
import { supabase } from '@/core/supabase/client';
import { getProtectedAuthRoute } from '@/features/auth/application/auth-session';
import { useAuthSession } from '@/features/auth/ui/auth-session-provider';
import { loadUserSettings, saveUserSetting } from '@/features/settings/data/supabase-settings-repository';
import { defaultUserSettings, isPersistedSettingLabel, settingsKeyByLabel, type UserSettings } from '@/features/settings/domain/user-settings';
import { clearLocalReminderNotifications, isLocalNotificationKey, requestLocalNotificationPermission, synchronizeLocalReminderNotifications } from '@/features/settings/application/local-notifications';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { isLoading: isLoadingSession, session } = useAuthSession();
  const { showNotification } = useAppNotification();
  const userId = session?.user.id;
  const identity = useRef(userId);
  useLayoutEffect(() => { identity.current = userId; }, [userId]);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [storedEnabled, setEnabled] = useState<UserSettings>(defaultUserSettings);
  const settingsRef = useRef<UserSettings>(defaultUserSettings);
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<keyof UserSettings>>(new Set());
  const pending = useRef(new Set<keyof UserSettings>());
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const ready = useRef(false);
  const enabled = loadedUserId === userId ? storedEnabled : defaultUserSettings;
  const signingOut = useRef(false);

  useFocusEffect(useCallback(() => {
    if (!signingOut.current && !isLoadingSession && !session?.user) router.replace(getProtectedAuthRoute('/settings', false) as never);
  }, [isLoadingSession, router, session]));

  useEffect(() => {
    ready.current = false;
    pending.current.clear();
    if (!userId) return;
    let active = true;
    void loadUserSettings(userId)
      .then((settings) => {
        if (!active) return;
        settingsRef.current = settings;
        ready.current = true;
        setEnabled(settings);
        setPendingKeys(new Set());
        setLoadedUserId(userId);
        void synchronizeLocalReminderNotifications(settings).catch(() => {
          if (mounted.current && identity.current === userId) showNotification({ title: 'อัปเดตการแจ้งเตือนไม่สำเร็จ', message: 'กรุณาลองใหม่อีกครั้ง', variant: 'error' });
        });
      })
      .catch(() => {
        if (active) showNotification({ title: 'โหลดการตั้งค่าไม่สำเร็จ', message: 'กรุณาลองใหม่อีกครั้ง', variant: 'error' });
      });
    return () => { active = false; };
  }, [showNotification, userId]);

  const toggle = async (item: string) => {
    if (!ready.current || !userId || loadedUserId !== userId || !isPersistedSettingLabel(item)) return;
    const key = settingsKeyByLabel[item];
    if (pending.current.has(key)) return;
    const previous = settingsRef.current[key];
    const next = !previous;
    pending.current.add(key);
    setPendingKeys((current) => new Set(current).add(key));

    try {
      if (next && isLocalNotificationKey(key)) {
        let permission;
        try {
          permission = await requestLocalNotificationPermission();
        } catch {
          if (mounted.current && identity.current === userId) showNotification({ title: 'ตรวจสอบสิทธิ์การแจ้งเตือนไม่สำเร็จ', message: 'กรุณาลองใหม่อีกครั้ง', variant: 'error' });
          return;
        }
        if (!mounted.current || identity.current !== userId) return;
        if (permission !== 'granted') {
          showNotification({ title: 'ยังไม่ได้รับอนุญาตการแจ้งเตือน', message: 'เปิดสิทธิ์การแจ้งเตือนของ SkinCycle ในการตั้งค่าเครื่องก่อนใช้งาน', variant: 'warning' });
          return;
        }
      }
      const nextSettings = { ...settingsRef.current, [key]: next };
      settingsRef.current = nextSettings;
      setEnabled(nextSettings);
      const saved = await saveUserSetting(userId, key, next);
      if (!mounted.current || identity.current !== userId) return;
      const synchronized = { ...settingsRef.current, [key]: saved[key] };
      settingsRef.current = synchronized;
      const notificationResult = await synchronizeLocalReminderNotifications(synchronized);
      if (notificationResult === 'denied' && isLocalNotificationKey(key) && next) throw new Error('Notification permission denied');
      if (mounted.current && identity.current === userId) setEnabled(synchronized);
    } catch {
      if (!mounted.current || identity.current !== userId) return;
      const rolledBack = { ...settingsRef.current, [key]: previous };
      settingsRef.current = rolledBack;
      void saveUserSetting(userId, key, previous).catch(() => undefined);
      void synchronizeLocalReminderNotifications(rolledBack).catch(() => undefined);
      if (mounted.current && identity.current === userId) {
        setEnabled(rolledBack);
        showNotification({ title: 'บันทึกการตั้งค่าไม่สำเร็จ', message: 'กรุณาลองใหม่อีกครั้ง', variant: 'error' });
      }
    } finally {
      if (mounted.current && identity.current === userId) {
        pending.current.delete(key);
        setPendingKeys((current) => {
          const nextPending = new Set(current);
          nextPending.delete(key);
          return nextPending;
        });
      }
    }
  };

  const signOut = async () => {
    if (signingOut.current) return;
    signingOut.current = true;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      queryClient.clear();
      await clearLocalReminderNotifications().catch(() => undefined);
      router.replace('/auth');
    } catch {
      signingOut.current = false;
      showNotification({ title: 'ออกจากระบบไม่สำเร็จ', message: 'กรุณาลองใหม่อีกครั้ง', variant: 'error' });
    }
  };

  if (isLoadingSession || !session?.user) return <View style={styles.page} />;

  return <View style={styles.page}><ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={26} color={Palette.textPrimary} /></Pressable><AppText variant="h1">ตั้งค่า</AppText><View style={styles.back} /></View>
    {settingsSections.map((section) => <View key={section.title} style={styles.section}><View style={styles.sectionTitle}><MaterialCommunityIcons name={section.icon as never} size={22} color={Palette.primaryDark} /><AppText variant="h3" tone="brand">{section.title}</AppText></View><View style={styles.card}>{section.items.map((item) => { const hasSwitch = isPersistedSettingLabel(item); const settingKey = hasSwitch ? settingsKeyByLabel[item] : null; return <Pressable key={item} style={styles.row} onPress={hasSwitch ? () => { void toggle(item); } : settingsDestinations[item] ? () => router.push({ pathname: '/settings-detail/[section]', params: { section: settingsDestinations[item] } } as never) : undefined}><MaterialCommunityIcons name="chevron-right" size={21} color={Palette.textSecondary} style={styles.rowIcon} /><AppText style={styles.label}>{item}</AppText>{hasSwitch && settingKey ? <Switch value={enabled[settingKey]} disabled={pendingKeys.has(settingKey)} onValueChange={() => { void toggle(item); }} trackColor={{ false: '#DDE2DE', true: Palette.primary }} thumbColor={Palette.white} /> : null}</Pressable>; })}</View></View>)}
    <Pressable style={styles.logout} onPress={() => void signOut()}><MaterialCommunityIcons name="logout" size={21} color={Palette.accent} /><AppText variant="button" tone="accent">ออกจากระบบ</AppText></Pressable>
    <AppText variant="caption" tone="secondary" style={styles.version}>SkinCycle v1.0.0</AppText>
  </ScrollView></View>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: Palette.background }, content: { paddingHorizontal: Spacing.four, gap: 18 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }, back: { width: 42, height: 42, justifyContent: 'center' }, section: { gap: 8 }, sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 }, card: { backgroundColor: Palette.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: Palette.border, paddingHorizontal: 14 }, row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Palette.border, gap: 7 }, rowIcon: { transform: [{ rotate: '180deg' }] }, label: { flex: 1, fontSize: 14 }, logout: { minHeight: 52, borderRadius: Radius.card, backgroundColor: '#FFF3EA', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, version: { textAlign: 'center', marginTop: -7 } });
