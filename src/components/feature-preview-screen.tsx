import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Palette, Radius, Spacing } from '@/constants/theme';

type FeaturePreviewScreenProps = Readonly<{
  eyebrow: string;
  title: string;
  message: string;
  accent: 'green' | 'peach' | 'blue';
}>;

const accentColors = {
  green: Palette.softGreen,
  peach: Palette.softPeach,
  blue: Palette.softBlue,
};

export function FeaturePreviewScreen({
  eyebrow,
  title,
  message,
  accent,
}: FeaturePreviewScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = process.env.EXPO_OS === 'android' ? insets.top + Spacing.six : Spacing.six;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: Palette.background }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: Spacing.five,
        paddingTop: topPadding,
        paddingBottom: Spacing.eight,
      }}>
      <View
        style={{
          minHeight: 380,
          borderRadius: Radius.large,
          borderCurve: 'continuous',
          backgroundColor: accentColors[accent],
          padding: Spacing.seven,
          justifyContent: 'flex-end',
          gap: Spacing.four,
          overflow: 'hidden',
        }}>
        <View
          style={{
            position: 'absolute',
            top: -60,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: 'rgba(255,255,255,0.45)',
          }}
        />
        <AppText variant="caption" tone="brand" style={{ letterSpacing: 1.2 }}>
          {eyebrow}
        </AppText>
        <AppText variant="display">{title}</AppText>
        <AppText tone="secondary">{message}</AppText>
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: Radius.round,
            backgroundColor: Palette.surface,
            paddingHorizontal: Spacing.four,
            paddingVertical: Spacing.three,
          }}>
          <AppText variant="caption" tone="brand">
            กำลังพัฒนาในเฟสถัดไป
          </AppText>
        </View>
      </View>
    </ScrollView>
  );
}
