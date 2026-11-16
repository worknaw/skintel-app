import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from './app-text';

import { Palette, Radius, Spacing } from '@/constants/theme';

type AppButtonProps = Readonly<{
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}>;

const backgrounds = {
  primary: Palette.primaryDark,
  secondary: Palette.softGreen,
  ghost: 'transparent',
};

export function AppButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
}: AppButtonProps) {
  const content = (
    <>
      {icon ? <View>{icon}</View> : null}
      <AppText variant="button" tone={variant === 'primary' ? 'inverse' : 'brand'}>
        {label}
      </AppText>
    </>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        borderRadius: Radius.small,
        borderCurve: 'continuous',
        borderWidth: variant === 'ghost' ? 1 : 0,
        borderColor: Palette.border,
        backgroundColor: variant === 'primary' ? 'transparent' : backgrounds[variant],
        opacity: disabled ? 0.5 : pressed ? 0.82 : 1,
        overflow: 'hidden',
      })}>
      {variant === 'primary' ? (
        <LinearGradient colors={['#78C99A', '#3E9368', '#28674A']} locations={[0, 0.5, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 44, paddingHorizontal: Spacing.five, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two }}>
          {content}
        </LinearGradient>
      ) : (
        <View style={{ minHeight: 44, paddingHorizontal: Spacing.five, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two }}>
          {content}
        </View>
      )}
    </Pressable>
  );
}
