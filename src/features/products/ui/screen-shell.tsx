import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';

export function ScreenHeader({ eyebrow, title, action }: Readonly<{ eyebrow?: string; title: string; action?: ReactNode }>) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: process.env.EXPO_OS === 'android' ? insets.top + Spacing.four : Spacing.four,
        paddingHorizontal: Spacing.five,
        paddingBottom: Spacing.four,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.four,
        maxWidth: MaxContentWidth,
        width: '100%',
        alignSelf: 'center',
      }}>
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <AppText variant="caption" tone="secondary">
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="h1" tone="brand">
          {title}
        </AppText>
      </View>
      {action}
    </View>
  );
}

export const screenContentStyle = {
  paddingHorizontal: Spacing.four,
  paddingBottom: Spacing.nine,
  gap: Spacing.five,
  maxWidth: MaxContentWidth,
  width: '100%' as const,
  alignSelf: 'center' as const,
  backgroundColor: Palette.background,
};
