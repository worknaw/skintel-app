import type { ComponentProps } from 'react';
import { Text } from 'react-native';

import { Palette, Typography } from '@/constants/theme';

type AppTextVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'button';

type AppTextProps = ComponentProps<typeof Text> & {
  variant?: AppTextVariant;
  tone?: 'primary' | 'secondary' | 'brand' | 'accent' | 'inverse';
};

const variantStyles = {
  display: { fontFamily: 'NotoSansThai_700Bold', fontSize: Typography.display, lineHeight: 40 },
  h1: { fontFamily: 'NotoSansThai_700Bold', fontSize: Typography.h1, lineHeight: 34 },
  h2: { fontFamily: 'NotoSansThai_600SemiBold', fontSize: Typography.h2, lineHeight: 28 },
  h3: { fontFamily: 'NotoSansThai_600SemiBold', fontSize: Typography.h3, lineHeight: 24 },
  body: { fontFamily: 'NotoSansThai_400Regular', fontSize: Typography.body, lineHeight: 24 },
  caption: { fontFamily: 'NotoSansThai_500Medium', fontSize: Typography.caption, lineHeight: 18 },
  button: { fontFamily: 'NotoSansThai_600SemiBold', fontSize: Typography.button, lineHeight: 22 },
};

const toneColors = {
  primary: Palette.textPrimary,
  secondary: Palette.textSecondary,
  brand: Palette.primaryDark,
  accent: '#A85D27',
  inverse: Palette.white,
};

export function AppText({ variant = 'body', tone = 'primary', style, ...props }: AppTextProps) {
  return (
    <Text
      selectable={props.selectable ?? false}
      {...props}
      style={[variantStyles[variant], { color: toneColors[tone] }, style]}
    />
  );
}
