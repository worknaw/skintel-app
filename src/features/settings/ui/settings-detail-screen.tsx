import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { useAppNotification } from '@/components/ui/app-notification';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/features/auth/ui/auth-session-provider';
import { validateDisplayName, validateEmail, validatePassword, validateSupportRequest } from '../application/account-validation';
import { helpSections, privacySections, settingsTitles, termsSections } from '../application/settings-content';
import { accountErrorMessage, changeEmail, changePassword, deleteAccount, exportAccount, loadAccountProfile, loadSupportRequests, requestSecurityCode, saveDisplayName, sendSupportRequest } from '../data/account-repository';

const publicSections = new Set(['privacy', 'terms', 'help', 'about', 'contact']);

function Field({ label, value, onChange, password = false, multiline = false, email = false, maxLength, disabled }: {
  label: string; value: string; onChange: (value: string) => void; password?: boolean; multiline?: boolean;
  email?: boolean; maxLength: number; disabled: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return <View style={styles.field}><AppText variant="caption">{label}</AppText><View style={styles.inputRow}>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled}
      maxLength={maxLength} autoCorrect={false} autoCapitalize="none" secureTextEntry={password && !visible}
      keyboardType={email ? 'email-address' : 'default'} multiline={multiline}
      textContentType={password ? 'newPassword' : email ? 'emailAddress' : 'none'}
      style={[styles.input, multiline && styles.multiline]} />
    {password && <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} onPress={() => setVisible(!visible)} style={styles.eye}>
      <MaterialCommunityIcons name={visible ? 'eye-outline' : 'eye-off-outline'} size={21} color={Palette.primaryDark} />
    </Pressable>}
  </View></View>;
}

function Action({ label, onPress, disabled = false, secondary = false, danger = false }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; danger?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[styles.button, secondary && styles.secondary, danger && styles.danger, disabled && styles.disabled]}>
    <AppText variant="button" tone={secondary ? 'brand' : 'inverse'}>{label}</AppText>
  </Pressable>;
}

export default function SettingsDetailScreen() {
  return <SettingsDetailContent />;
}

function SettingsDetailContent() {
  const params = useLocalSearchParams<{ section: string }>();
  const section = typeof params.section === 'string' ? params.section : '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session, isLoading: sessionLoading } = useAuthSession();
  const { showNotification } = useAppNotification();
  const userId = session?.user.id;
  const identity = useRef(userId);
  useEffect(() => { identity.current = userId; }, [userId]);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const lock = useRef(false);
  const deleting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [failed, setFailed] = useState(false);
  const [nameDraft, setName] = useState<string | null>(null);
  const [emailDraft, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nonce, setNonce] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const needsProfile = ['profile', 'security', 'connections'].includes(section);
  const profile = useQuery({ queryKey: ['account-profile', userId], queryFn: loadAccountProfile, enabled: !!userId && needsProfile, retry: 1 });
  const requests = useQuery({ queryKey: ['support-requests', userId], queryFn: loadSupportRequests, enabled: !!userId && section === 'support', retry: 1 });
  const name = nameDraft ?? profile.data?.displayName ?? '';
  const email = emailDraft ?? profile.data?.email ?? '';
  useFocusEffect(useCallback(() => {
    if (!deleting.current && !sessionLoading && !userId && !publicSections.has(section)) {
      router.replace({ pathname: '/auth', params: { returnTo: `/settings-detail/${section}` } } as never);
    }
  }, [router, section, sessionLoading, userId]));

  const run = async (operation: () => Promise<string | void>) => {
    if (lock.current) return;
    lock.current = true;
    const owner = userId;
    setBusy(true); setFeedback(''); setFailed(false);
    try {
      const result = await operation();
      if (mounted.current && identity.current === owner) setFeedback(result ?? 'บันทึกเรียบร้อยแล้ว');
    } catch (error) {
      if (mounted.current && identity.current === owner) { setFailed(true); setFeedback(accountErrorMessage(error)); }
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const validated = (error: string | null, operation: () => Promise<string | void>) => {
    if (error) { setFailed(true); setFeedback(error); return; }
    void run(operation);
  };
  const open = (next: string) => router.push({ pathname: '/settings-detail/[section]', params: { section: next } } as never);
  const fieldProps = { disabled: busy };

  if (sessionLoading || (!userId && !publicSections.has(section))) return <View style={styles.loading}><ActivityIndicator color={Palette.primaryDark} /></View>;

  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 30 }]}>
      <View style={styles.header}><Pressable accessibilityLabel="ย้อนกลับ" accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')} style={styles.back}>
        <MaterialCommunityIcons name="arrow-left" size={26} color={Palette.textPrimary} />
      </Pressable><AppText variant="h3" style={styles.title}>{settingsTitles[section] ?? 'ไม่พบหน้า'}</AppText><View style={styles.back} /></View>

      {needsProfile && profile.isPending && <ActivityIndicator color={Palette.primaryDark} />}
      {needsProfile && profile.isError && <View style={styles.card}><AppText>โหลดข้อมูลไม่สำเร็จ</AppText><Action label="ลองใหม่" onPress={() => { void profile.refetch(); }} disabled={profile.isFetching} /></View>}

      {section === 'profile' && profile.data && <View style={styles.card}>
        <Field {...fieldProps} label="ชื่อ" value={name} onChange={setName} maxLength={80} />
        <AppText variant="caption" tone="secondary">ใช้ตัวอักษรภาษาอังกฤษ ช่องว่าง จุด ขีดกลาง หรือเครื่องหมายอัญประกาศเดี่ยว</AppText>
        <Action label="บันทึก" disabled={busy} onPress={() => validated(validateDisplayName(name), async () => {
          await saveDisplayName(name);
          queryClient.setQueryData(['profile', userId], { display_name: name.trim() });
          await queryClient.invalidateQueries({ queryKey: ['account-profile', userId] });
          return 'บันทึกข้อมูลส่วนตัวแล้ว';
        })} />
      </View>}

      {section === 'security' && profile.data && <>
        <View style={styles.card}><AppText variant="h3" tone="brand">เปลี่ยนอีเมล</AppText>
          <AppText variant="caption" tone="secondary">อีเมลปัจจุบัน: {profile.data.email}</AppText>
          <Field {...fieldProps} label="อีเมลใหม่" value={email} onChange={setEmail} maxLength={254} email />
          <Action label="ยืนยันการเปลี่ยนอีเมล" disabled={busy} onPress={() => validated(validateEmail(email) ?? (email.trim().toLowerCase() === profile.data.email.toLowerCase() ? 'กรุณากรอกอีเมลใหม่ที่ต่างจากเดิม' : null), async () => {
            await changeEmail(email);
            await queryClient.invalidateQueries({ queryKey: ['account-profile', userId] });
            return 'ส่งคำขอแล้ว กรุณาตรวจอีเมลเดิมและอีเมลใหม่เพื่อยืนยันตามข้อความจากระบบ';
          })} />
        </View>
        <View style={styles.card}><AppText variant="h3" tone="brand">เปลี่ยนรหัสผ่าน</AppText>
          <Field {...fieldProps} label="รหัสผ่านใหม่" value={password} onChange={setPassword} maxLength={128} password />
          <Field {...fieldProps} label="ยืนยันรหัสผ่านใหม่" value={confirmPassword} onChange={setConfirmPassword} maxLength={128} password />
          <AppText variant="caption" tone="secondary">หากระบบต้องการยืนยันตัวตน ให้ขอรหัสและตรวจอีเมลของคุณ</AppText>
          <Action label="ขอรหัสยืนยันทางอีเมล" secondary disabled={busy} onPress={() => void run(async () => { await requestSecurityCode(); return 'ส่งรหัสแล้ว กรุณาตรวจอีเมลของคุณ'; })} />
          <Field {...fieldProps} label="รหัสยืนยัน (เมื่อระบบร้องขอ)" value={nonce} onChange={setNonce} maxLength={20} />
          <Action label="บันทึกรหัสผ่าน" disabled={busy} onPress={() => validated(validatePassword(password, confirmPassword), async () => {
            await changePassword(password, nonce); setPassword(''); setConfirmPassword(''); setNonce(''); return 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว';
          })} />
        </View>
      </>}

      {section === 'connections' && profile.data && <View style={styles.card}>
        <AppText variant="caption" tone="secondary">ช่องทางที่เชื่อมกับบัญชีนี้</AppText>
        {profile.data.providers.length ? profile.data.providers.map((provider) => <AppText key={provider}>{provider === 'email' ? 'อีเมล' : provider === 'google' ? 'Google' : provider === 'apple' ? 'Apple' : provider}</AppText>) : <AppText>ไม่พบช่องทางที่เชื่อมต่อ</AppText>}
      </View>}

      {section === 'delete' && <View style={styles.card}>
        <AppText variant="h3">ลบบัญชีอย่างถาวร</AppText>
        <AppText>บัญชี โปรไฟล์ การตั้งค่า และรายงานปัญหาของคุณจะถูกลบและไม่สามารถกู้คืนผ่านแอปได้ หากมีประวัติคำสั่งซื้อ ร้านค้าต้องจัดการข้อมูลที่จำเป็นต่อการจัดส่งและบัญชีก่อน</AppText>
        <Action label="ดาวน์โหลดข้อมูลก่อนลบ" secondary disabled={busy} onPress={() => open('export')} />
        <Field {...fieldProps} label="พิมพ์ DELETE เพื่อยืนยัน" value={confirmation} onChange={setConfirmation} maxLength={6} />
        <Action label="ลบบัญชี" danger disabled={busy || confirmation !== 'DELETE'} onPress={() => showNotification({ title: 'ยืนยันการลบบัญชี', message: 'ต้องการลบบัญชีนี้อย่างถาวรหรือไม่?', variant: 'warning', actions: [
          { label: 'ยกเลิก', style: 'cancel' }, { label: 'ลบบัญชี', style: 'destructive', onPress: () => void run(async () => {
            deleting.current = true;
            try {
              await deleteAccount(confirmation); queryClient.clear(); router.dismissTo('/');
            } catch (error) {
              deleting.current = false;
              throw error;
            }
          }) },
        ] })} />
      </View>}

      {section === 'export' && <View style={styles.card}>
        <AppText>ดาวน์โหลดข้อมูลบัญชี โปรไฟล์ การตั้งค่า และรายงานปัญหาเป็นไฟล์ JSON</AppText>
        <AppText variant="caption" tone="secondary">ไฟล์นี้มีข้อมูลส่วนตัว ไม่มีรหัสผ่านหรือโทเคนเข้าสู่ระบบ ข้อมูลตัวอย่างและผลวิเคราะห์ที่ยังไม่ได้บันทึกจริงจะไม่รวมอยู่ในไฟล์</AppText>
        <Action label="ดาวน์โหลดข้อมูล" disabled={busy} onPress={() => void run(async () => {
          const contents = await exportAccount();
          if (!mounted.current || identity.current !== userId) return;
          const { shareAccountExport } = await import('../application/share-account-export');
          await shareAccountExport(contents);
          return Platform.OS === 'web' ? 'สร้างไฟล์แล้ว กรุณาตรวจรายการดาวน์โหลด' : 'สร้างไฟล์แล้ว หากเลือกบันทึก กรุณาตรวจในตำแหน่งที่เลือก';
        })} />
      </View>}

      {(section === 'privacy' || section === 'terms' || section === 'help') && (section === 'privacy' ? privacySections : section === 'terms' ? termsSections : helpSections).map(([title, body]) => <View style={styles.card} key={title}><AppText variant="h3" tone="brand">{title}</AppText><AppText>{body}</AppText></View>)}
      {section === 'help' && <Action label="รายงานปัญหา" onPress={() => open('support')} />}
      {section === 'contact' && <View style={styles.card}><AppText>ส่งคำถามหรือข้อเสนอแนะผ่านแบบฟอร์มในแอปได้</AppText><AppText variant="caption" tone="secondary">อีเมลติดต่อยังไม่ได้ระบุ</AppText><Action label="ส่งคำถาม / รายงานปัญหา" onPress={() => open('support')} /></View>}
      {section === 'about' && <View style={styles.card}><AppText variant="h2" tone="brand">SkinCycle</AppText><AppText>แอปดูแลผิวสำหรับโครงการจบการศึกษา</AppText><AppText variant="caption" tone="secondary">เวอร์ชัน {version}</AppText></View>}

      {section === 'support' && <>
        <View style={styles.card}><AppText variant="caption" tone="secondary">บอกขั้นตอนก่อนพบปัญหา โดยไม่ส่งรหัสผ่าน รหัสยืนยัน หรือข้อมูลลับ</AppText>
          <Field {...fieldProps} label="หัวข้อ" value={subject} onChange={setSubject} maxLength={120} />
          <Field {...fieldProps} label="รายละเอียด" value={message} onChange={setMessage} maxLength={4000} multiline />
          <Action label="ส่งรายงาน" disabled={busy} onPress={() => validated(validateSupportRequest(subject, message), async () => {
            const id = await sendSupportRequest(subject, message, version); setSubject(''); setMessage('');
            await queryClient.invalidateQueries({ queryKey: ['support-requests', userId] });
            return `บันทึกรายงานแล้ว เลขอ้างอิง ${id}`;
          })} />
        </View>
        <View style={styles.card}><AppText variant="h3">รายงานล่าสุดของคุณ</AppText>
          {requests.isPending ? <ActivityIndicator color={Palette.primaryDark} /> : requests.isError ? <><AppText>โหลดรายงานไม่สำเร็จ</AppText><Action label="ลองใหม่" secondary disabled={requests.isFetching} onPress={() => { void requests.refetch(); }} /></> : !requests.data?.length ? <AppText tone="secondary">ยังไม่มีรายงาน</AppText> : requests.data.map((request) => <View key={request.id} style={styles.field}><AppText>{request.subject}</AppText><AppText variant="caption" tone="secondary">{request.status === 'resolved' ? 'ดำเนินการแล้ว' : request.status === 'in_progress' ? 'กำลังตรวจสอบ' : 'บันทึกคำขอแล้ว'} · {new Date(request.created_at).toLocaleDateString('th-TH')}</AppText><AppText selectable variant="caption" tone="secondary">{request.id}</AppText></View>)}
        </View>
      </>}
      {busy && <ActivityIndicator accessibilityLabel="กำลังดำเนินการ" color={Palette.primaryDark} />}
      {!!feedback && <View accessibilityLiveRegion="polite" style={[styles.feedback, failed && styles.error]}><AppText selectable variant="caption">{feedback}</AppText></View>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Palette.background }, loading: { flex: 1, backgroundColor: Palette.background, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.four, gap: 16 }, header: { flexDirection: 'row', alignItems: 'center' }, title: { flex: 1, textAlign: 'center' },
  back: { width: 42, height: 42, justifyContent: 'center' }, card: { backgroundColor: Palette.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: Palette.border, padding: 16, gap: 14 },
  field: { gap: 6 }, inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Palette.background, borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.input },
  input: { flex: 1, minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'NotoSansThai_400Regular', fontSize: 14, color: Palette.textPrimary },
  multiline: { minHeight: 140, textAlignVertical: 'top' }, eye: { padding: 12 }, button: { minHeight: 48, borderRadius: Radius.input, backgroundColor: Palette.primaryDark, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  secondary: { backgroundColor: Palette.softGreen, borderColor: Palette.border, borderWidth: 1 }, danger: { backgroundColor: Palette.danger }, disabled: { opacity: 0.5 },
  feedback: { backgroundColor: Palette.softGreen, padding: 14, borderRadius: Radius.small }, error: { backgroundColor: Palette.softPeach },
});
