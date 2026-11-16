import { ActivityIndicator, View } from 'react-native';

import { AppButton } from './app-button';
import { AppText } from './app-text';

import { Palette, Radius, Spacing } from '@/constants/theme';

type FeedbackStateProps = Readonly<{
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}>;

export function FeedbackState({ title, message, actionLabel, onAction, loading = false }: FeedbackStateProps) {
  return (
    <View
      style={{
        borderRadius: Radius.large,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: Palette.border,
        backgroundColor: Palette.surface,
        shadowColor: '#164A36',
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
        padding: Spacing.six,
        alignItems: 'center',
        gap: Spacing.three,
      }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: Palette.softGreen,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {loading ? <ActivityIndicator size="small" color={Palette.accent} /> : <AppText variant="h3" tone="brand">i</AppText>}
      </View>
      <AppText variant="h3" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText tone="secondary" style={{ textAlign: 'center' }}>
        {message}
      </AppText>
      {loading ? <AppText tone="secondary" style={{ textAlign: 'center', fontSize: 11 }}>กำลังประมวลผล อาจใช้เวลาสักครู่</AppText> : null}
      {actionLabel ? <AppButton label={actionLabel} variant="secondary" onPress={onAction} /> : null}
    </View>
  );
}
