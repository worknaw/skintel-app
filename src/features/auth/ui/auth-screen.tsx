import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Palette, Radius } from '@/constants/theme';
import { supabase } from '@/core/supabase/client';
import { getKeyboardAvoidingBehavior } from '@/features/auth/application/keyboard-layout';
import { extractOAuthSession, type OAuthSessionParams } from '@/features/auth/application/oauth-callback';
import { getAuthRedirectUrl } from '@/features/auth/application/auth-redirect';
import { getPostAuthRoute } from '@/features/auth/application/auth-session';
import { getSkinProfile } from '@/features/skin-profile/data/supabase-skin-profile-repository';

type AuthMode = 'login' | 'register';

type AuthFieldProps = Readonly<{
  label: string;
  placeholder: string;
  icon: 'account-outline' | 'email-outline' | 'lock-outline';
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  keyboardType?: 'default' | 'email-address';
  textContentType?: 'name' | 'emailAddress' | 'password' | 'newPassword';
}>;

function AuthField({
  label,
  placeholder,
  icon,
  value,
  onChangeText,
  secure = false,
  showPassword = false,
  onTogglePassword,
  keyboardType = 'default',
  textContentType,
}: AuthFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <AppText style={styles.fieldLabel}>{label}</AppText>
      <View style={styles.inputShell}>
        <MaterialCommunityIcons name={icon} size={21} color="#26312B" />
        <TextInput
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          autoCorrect={false}
          keyboardType={keyboardType}
          key={secure ? `password-${showPassword ? 'visible' : 'masked'}` : undefined}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A4AAA5"
          secureTextEntry={secure && !showPassword}
          style={styles.input}
          textContentType={textContentType}
          value={value}
        />
        {secure ? (
          <Pressable
            accessibilityLabel={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
            accessibilityRole="button"
            hitSlop={10}
            onPress={onTogglePassword}
            style={({ pressed }) => [styles.eyeButton, pressed && styles.pressed]}>
            <MaterialCommunityIcons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color="#26312B"
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function LiquidButton({
  label,
  onPress,
  loading = false,
}: Readonly<{ label: string; onPress: () => void; loading?: boolean }>) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, loading && styles.primaryButtonDisabled, pressed && styles.pressed]}>
      <LinearGradient colors={['#276749', '#4B9870', '#F6F6E9']} locations={[0, 0.62, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.primaryGradient}>
        <View style={styles.buttonPearlLarge} />
        <View style={styles.buttonPearlSmall} />
        <AppText style={styles.primaryButtonText}>{loading ? 'กำลังดำเนินการ...' : label}</AppText>
      </LinearGradient>
    </Pressable>
  );
}

function PasswordRecoveryScreen({ code }: Readonly<{ code: string | null }>) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const establishRecoverySession = async () => {
      let callback: OAuthSessionParams = code ? { code } : null;
      if (!callback) {
        const initialUrl = await Linking.getInitialURL();
        callback = initialUrl ? extractOAuthSession(initialUrl) : null;
      }
      const result = callback && 'code' in callback
        ? await supabase.auth.exchangeCodeForSession(callback.code)
        : callback && 'accessToken' in callback
          ? await supabase.auth.setSession({ access_token: callback.accessToken, refresh_token: callback.refreshToken })
          : await supabase.auth.getSession();
      if (!active) return;
      if (result.error || !result.data.session) {
        setFeedback('ลิงก์ตั้งรหัสผ่านไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่อีกครั้ง');
        return;
      }
      setIsReady(true);
    };
    void establishRecoverySession().catch(() => {
      if (active) setFeedback('ตรวจสอบลิงก์ตั้งรหัสผ่านไม่สำเร็จ กรุณาขอลิงก์ใหม่อีกครั้ง');
    });
    return () => { active = false; };
  }, [code]);

  const submit = async () => {
    if (!isReady || isSubmitting) return;
    if (password.length < 6) {
      setFeedback('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (password !== confirmation) {
      setFeedback('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    setIsSubmitting(true);
    setFeedback('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setFeedback('ตั้งรหัสผ่านใหม่ไม่สำเร็จ กรุณาขอลิงก์ใหม่แล้วลองอีกครั้ง');
        return;
      }
      router.replace('/profile' as never);
    } catch {
      setFeedback('ไม่สามารถเชื่อมต่อระบบบัญชีได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={getKeyboardAvoidingBehavior(process.env.EXPO_OS)} keyboardVerticalOffset={insets.top} style={styles.page}>
      <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 14) + 8 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <Image accessibilityLabel="SkinCycle" contentFit="cover" source={require('../../../../assets/brand/skincycle-logo-original.png')} style={styles.brandLogo} />
        </View>
        <View style={styles.formCard}>
          <View style={styles.formFields}>
            <AppText variant="h2" tone="brand">ตั้งรหัสผ่านใหม่</AppText>
            <AppText tone="secondary">ตั้งรหัสผ่านใหม่สำหรับบัญชี SkinCycle ของคุณ</AppText>
            <AuthField icon="lock-outline" label="รหัสผ่านใหม่" onChangeText={setPassword} onTogglePassword={() => setShowPassword((value) => !value)} placeholder="อย่างน้อย 6 ตัวอักษร" secure showPassword={showPassword} textContentType="newPassword" value={password} />
            <AuthField icon="lock-outline" label="ยืนยันรหัสผ่านใหม่" onChangeText={setConfirmation} onTogglePassword={() => setShowConfirmation((value) => !value)} placeholder="พิมพ์รหัสผ่านอีกครั้ง" secure showPassword={showConfirmation} textContentType="newPassword" value={confirmation} />
            {feedback ? <View style={styles.feedbackBox}><MaterialCommunityIcons name="information-outline" size={17} color="#356C50" /><AppText selectable style={styles.feedbackText}>{feedback}</AppText></View> : null}
            <LiquidButton label="บันทึกรหัสผ่านใหม่" loading={isSubmitting || !isReady} onPress={() => void submit()} />
            <Pressable accessibilityRole="button" onPress={() => router.replace('/auth' as never)} style={({ pressed }) => [styles.forgotButton, pressed && styles.pressed]}><AppText style={styles.forgotText}>กลับไปหน้าเข้าสู่ระบบ</AppText></Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

WebBrowser.maybeCompleteAuthSession();
const authRedirectUrl = getAuthRedirectUrl(Linking.createURL);

export default function AuthScreen() {
  const { type, code } = useLocalSearchParams<{ type?: string; code?: string }>();
  return type === 'recovery' ? <PasswordRecoveryScreen code={typeof code === 'string' ? code : null} /> : <LoginScreen />;
}

function LoginScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const insets = useSafeAreaInsets();
  const postAuthRoute = getPostAuthRoute(typeof returnTo === 'string' ? returnTo : undefined);
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [profileRetryAvailable, setProfileRetryAvailable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const leaving = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const reportFeedback = (message: string) => {
    if (mounted.current && !leaving.current) setFeedback(message);
  };
  const finishAuth = async () => {
    // The OAuth code exchange has already persisted a fresh local session. Do
    // not add a second network-only getUser() request here: it can fail after a
    // successful Google sign-in and incorrectly leave the user on this screen.
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) throw error ?? new Error('No authenticated user');
    let skinProfile;
    try {
      skinProfile = await getSkinProfile(data.session.user.id);
    } catch {
      if (mounted.current && !leaving.current) {
        setProfileRetryAvailable(true);
        reportFeedback('เข้าสู่ระบบแล้ว แต่โหลดข้อมูลโปรไฟล์ผิวไม่สำเร็จ กรุณาลองอีกครั้ง');
      }
      return;
    }
    if (!mounted.current || leaving.current) return;
    setProfileRetryAvailable(false);
    leaving.current = true;
    if (!skinProfile?.onboardingCompletedAt) {
      router.replace({ pathname: '/onboarding', params: { returnTo: postAuthRoute } } as never);
      return;
    }
    router.replace(postAuthRoute as never);
  };

  const retryProfile = async () => {
    if (submitting.current || leaving.current) return;
    submitting.current = true;
    setIsSubmitting(true);
    reportFeedback('');
    try {
      await finishAuth();
    } catch {
      reportFeedback('ตรวจสอบบัญชีไม่สำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง');
    } finally {
      submitting.current = false;
      if (mounted.current && !leaving.current) setIsSubmitting(false);
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    if (submitting.current || leaving.current) return;
    setMode(nextMode);
    setFeedback('');
  };

  const requestPasswordReset = async () => {
    if (submitting.current || leaving.current) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
      reportFeedback('กรุณากรอกอีเมลให้ถูกต้องก่อนขอลิงก์ตั้งรหัสผ่าน');
      return;
    }
    submitting.current = true;
    setIsSubmitting(true);
    reportFeedback('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: authRedirectUrl });
      if (error) {
        reportFeedback('ส่งลิงก์ตั้งรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        return;
      }
      reportFeedback('ส่งลิงก์ตั้งรหัสผ่านไปที่อีเมลแล้ว กรุณาเปิดลิงก์บนอุปกรณ์นี้เพื่อตั้งรหัสผ่านใหม่');
    } catch {
      reportFeedback('ไม่สามารถเชื่อมต่อระบบบัญชีได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      submitting.current = false;
      if (mounted.current && !leaving.current) setIsSubmitting(false);
    }
  };

  const signInWithGoogle = async () => {
    if (submitting.current || leaving.current) return;
    submitting.current = true;
    reportFeedback('');
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: authRedirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data.url) {
        reportFeedback('ยังไม่ได้ตั้งค่า Google Sign-In ใน Supabase');
        return;
      }

        const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUrl);
      if (result.type !== 'success') return;

      const callback = extractOAuthSession(result.url);
      if (!callback) {
        reportFeedback('ไม่สามารถยืนยันบัญชี Google ได้');
        return;
      }

      const sessionResult = 'code' in callback
        ? await supabase.auth.exchangeCodeForSession(callback.code)
        : await supabase.auth.setSession({
            access_token: callback.accessToken,
            refresh_token: callback.refreshToken,
          });

      if (sessionResult.error) {
        reportFeedback('ไม่สามารถเข้าสู่ระบบด้วย Google ได้');
        return;
      }

      if (mounted.current && !leaving.current) await finishAuth();
    } catch {
      reportFeedback('ไม่สามารถเชื่อมต่อ Google ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      submitting.current = false;
      if (mounted.current && !leaving.current) setIsSubmitting(false);
    }
  };

  const submit = async () => {
    if (submitting.current || leaving.current) return;
    if ((mode === 'register' && !name.trim()) || !email.trim() || !password) {
      reportFeedback('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (mode === 'register' && !/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(name.trim())) {
      reportFeedback('ชื่อต้องใช้อักษรภาษาอังกฤษเท่านั้น');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) {
      reportFeedback('กรุณากรอกอีเมลให้ถูกต้อง');
      return;
    }
    if (password.length < 6) {
      reportFeedback('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      reportFeedback('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    if (mode === 'register' && !acceptedTerms) {
      reportFeedback('กรุณายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว');
      return;
    }
    reportFeedback('');
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      submitting.current = true;

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          reportFeedback(error.message === 'Invalid login credentials' ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : error.message);
          return;
        }

        if (mounted.current && !leaving.current) await finishAuth();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
          options: {
            emailRedirectTo: authRedirectUrl,
            data: { display_name: name.trim() },
          },
      });

      if (error) {
        reportFeedback(error.message === 'User already registered' ? 'อีเมลนี้ถูกสมัครใช้งานแล้ว' : error.message);
        return;
      }

      if (data.session) {
        if (mounted.current && !leaving.current) await finishAuth();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!signInError) {
        if (mounted.current && !leaving.current) await finishAuth();
        return;
      }

      reportFeedback('กรุณาตรวจอีเมลและยืนยันบัญชี แล้วกลับมาเข้าสู่ระบบ');
    } catch {
      reportFeedback('ไม่สามารถเชื่อมต่อระบบบัญชีได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      submitting.current = false;
      if (mounted.current && !leaving.current) setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={getKeyboardAvoidingBehavior(process.env.EXPO_OS)}
      keyboardVerticalOffset={insets.top}
      style={styles.page}>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 14) + 8 }]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <Pressable
            accessibilityLabel="กลับหน้าหลัก"
            accessibilityRole="button"
            hitSlop={10}
            disabled={isSubmitting}
            onPress={() => { leaving.current = true; router.dismissTo('/'); }}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <MaterialCommunityIcons name="close" size={25} color="#244B39" />
          </Pressable>
          <Image
            accessibilityLabel="SkinCycle"
            contentFit="cover"
            source={require('../../../../assets/brand/skincycle-logo-original.png')}
            style={styles.brandLogo}
          />
        </View>

        <View style={styles.formCard}>
          <View accessibilityRole="tablist" style={styles.segmentedControl}>
            {(['login', 'register'] as const).map((item) => {
              const selected = mode === item;
              const label = item === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก';
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={item}
                  onPress={() => changeMode(item)}
                  style={({ pressed }) => [
                    styles.segment,
                    selected && styles.selectedSegment,
                    pressed && styles.pressed,
                  ]}>
                  {selected ? (
                    <LinearGradient colors={['#70B98C', '#367B58', '#245E43']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.segmentGradient}>
                      <AppText style={styles.selectedSegmentText}>{label}</AppText>
                    </LinearGradient>
                  ) : (
                    <AppText style={styles.segmentText}>{label}</AppText>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.formFields}>
            {mode === 'register' ? (
              <AuthField
                icon="account-outline"
                label="ชื่อ"
                onChangeText={(value) => setName(value.replace(/[^A-Za-z ]/g, '').replace(/ {2,}/g, ' '))}
                placeholder="Name in English"
                textContentType="name"
                value={name}
              />
            ) : null}
            <AuthField
              icon="email-outline"
              keyboardType="email-address"
              label="อีเมล"
              onChangeText={setEmail}
              placeholder="ใส่อีเมลของคุณ"
              textContentType="emailAddress"
              value={email}
            />
            <AuthField
              icon="lock-outline"
              label="รหัสผ่าน"
              onChangeText={setPassword}
              onTogglePassword={() => setIsPasswordVisible((value) => !value)}
              placeholder="ใส่รหัสผ่านของคุณ"
              secure
              showPassword={isPasswordVisible}
              textContentType={mode === 'login' ? 'password' : 'newPassword'}
              value={password}
            />
            {mode === 'register' ? (
              <AuthField
                icon="lock-outline"
                label="ยืนยันรหัสผ่าน"
                onChangeText={setConfirmPassword}
              onTogglePassword={() => setIsConfirmationVisible((value) => !value)}
                placeholder="ยืนยันรหัสผ่านของคุณ"
                secure
              showPassword={isConfirmationVisible}
                textContentType="newPassword"
                value={confirmPassword}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                disabled={isSubmitting}
                onPress={() => void requestPasswordReset()}
                style={({ pressed }) => [styles.forgotButton, pressed && styles.pressed]}>
                <AppText style={styles.forgotText}>ลืมรหัสผ่าน?</AppText>
              </Pressable>
            )}

            {mode === 'register' ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedTerms }}
                onPress={() => setAcceptedTerms((value) => !value)}
                style={({ pressed }) => [styles.termsRow, pressed && styles.pressed]}>
                <View style={[styles.checkbox, acceptedTerms && styles.checkboxSelected]}>
                  {acceptedTerms ? (
                    <MaterialCommunityIcons name="check" size={15} color="#FFFFFF" />
                  ) : null}
                </View>
                <AppText style={styles.termsText}>
                  ฉันยอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว
                </AppText>
              </Pressable>
            ) : null}

            {feedback ? (
              <View style={styles.feedbackBox}>
                <MaterialCommunityIcons name="information-outline" size={17} color="#356C50" />
                <AppText selectable style={styles.feedbackText}>{feedback}</AppText>
              </View>
            ) : null}

            {profileRetryAvailable ? (
              <LiquidButton label="ลองโหลดข้อมูลผิวอีกครั้ง" loading={isSubmitting} onPress={() => void retryProfile()} />
            ) : null}

            <LiquidButton
              label={mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
              loading={isSubmitting}
              onPress={() => void submit()}
            />

            {mode === 'login' ? (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.divider} />
                  <AppText style={styles.dividerText}>หรือ</AppText>
                  <View style={styles.divider} />
                </View>
                <Pressable
                  accessibilityLabel="เข้าสู่ระบบด้วย Google"
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => void signInWithGoogle()}
                  style={({ pressed }) => [styles.googleRegisterButton, pressed && styles.pressed]}>
                  <MaterialCommunityIcons name="google" size={22} color="#4285F4" />
                  <AppText style={styles.googleRegisterText}>เข้าสู่ระบบด้วย Google</AppText>
                </Pressable>
              </>
            ) : null}

            {mode === 'register' ? (
              <Pressable
                accessibilityLabel="สมัครสมาชิกด้วย Google"
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={() => void signInWithGoogle()}
                style={({ pressed }) => [styles.googleRegisterButton, pressed && styles.pressed]}>
                <MaterialCommunityIcons name="google" size={22} color="#4285F4" />
                <AppText style={styles.googleRegisterText}>สมัครสมาชิกด้วย Google</AppText>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.switchPrompt}>
            <AppText style={styles.switchPromptText}>
              {mode === 'login' ? 'ยังไม่มีบัญชี?' : 'มีบัญชีแล้ว?'}
            </AppText>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => changeMode(mode === 'login' ? 'register' : 'login')}>
              <AppText style={styles.switchPromptAction}>
                {mode === 'login' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
              </AppText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8F7F1' },
  scrollContent: { flexGrow: 1 },
  hero: {
    minHeight: 235,
    paddingHorizontal: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDF9F5',
  },
  closeButton: {
    position: 'absolute',
    zIndex: 5,
    left: 14,
    top: 52,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4EC',
    borderWidth: 1,
    borderColor: '#E5E7DD',
  },
  brandLogo: {
    width: 325,
    height: 132,
  },
  formCard: {
    marginTop: -25,
    marginHorizontal: 13,
    borderRadius: 31,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(222,218,202,0.96)',
    backgroundColor: 'rgba(255,254,250,0.97)',
    boxShadow: '0 10px 28px rgba(49, 73, 59, 0.10)',
    padding: 13,
    gap: 20,
  },
  segmentedControl: {
    height: 45,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: '#E4E0D6',
    backgroundColor: '#FBFAF6',
    flexDirection: 'row',
    padding: 3,
  },
  segment: {
    flex: 1,
    borderRadius: Radius.round,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSegment: { backgroundColor: '#337654' },
  segmentGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.round,
  },
  segmentText: {
    fontFamily: 'NotoSansThai_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: '#343936',
  },
  selectedSegmentText: {
    fontFamily: 'NotoSansThai_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  formFields: { gap: 12, paddingHorizontal: 4 },
  fieldGroup: { gap: 5 },
  fieldLabel: {
    fontFamily: 'NotoSansThai_500Medium',
    fontSize: 13,
    lineHeight: 19,
    color: '#252A27',
  },
  inputShell: {
    minHeight: 52,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#E3DFD4',
    backgroundColor: '#FCFBF7',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    fontFamily: 'NotoSansThai_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: Palette.textPrimary,
  },
  eyeButton: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
  forgotButton: { alignSelf: 'flex-end', minHeight: 26, justifyContent: 'center' },
  forgotText: {
    fontFamily: 'NotoSansThai_500Medium',
    fontSize: 12,
    lineHeight: 18,
    color: '#B65A29',
  },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  checkbox: {
    width: 21,
    height: 21,
    marginTop: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#BFC8BE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: { backgroundColor: '#347654', borderColor: '#347654' },
  termsText: { flex: 1, fontSize: 11, lineHeight: 17, color: '#B65A29' },
  feedbackBox: {
    borderRadius: 11,
    backgroundColor: '#EFF6EF',
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  feedbackText: { flex: 1, fontSize: 11, lineHeight: 17, color: '#35614B' },
  primaryButton: {
    minHeight: 54,
    borderRadius: 15,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#8EAA8F',
  },
  primaryButtonDisabled: { opacity: 0.68 },
  primaryGradient: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  primaryButtonText: {
    zIndex: 2,
    fontFamily: 'NotoSansThai_600SemiBold',
    fontSize: 17,
    lineHeight: 24,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowRadius: 2,
  },
  buttonPearlLarge: {
    position: 'absolute',
    width: 23,
    height: 23,
    right: 18,
    top: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  buttonPearlSmall: {
    position: 'absolute',
    width: 7,
    height: 7,
    right: 49,
    top: 31,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  divider: { flex: 1, height: 1, backgroundColor: '#DCD9D0' },
  dividerText: { fontSize: 13, lineHeight: 19, color: '#757A76' },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#DFDBD1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleRegisterButton: {
    minHeight: 50,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#DFDBD1',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  googleRegisterText: { fontSize: 13, lineHeight: 19, color: '#3F4641' },
  switchPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingBottom: 5,
  },
  switchPromptText: { fontSize: 13, lineHeight: 19, color: '#5F6561' },
  switchPromptAction: {
    fontFamily: 'NotoSansThai_600SemiBold',
    fontSize: 13,
    lineHeight: 19,
    color: '#B65A29',
  },
  pressed: { opacity: 0.67 },
});
