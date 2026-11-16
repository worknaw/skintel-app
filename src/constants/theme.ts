/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  background: '#FAFAF7',
  surface: '#FFFFFF',
  primary: '#72BE94',
  primaryDark: '#28674A',
  accent: '#F3A66A',
  softPeach: '#FBE4D2',
  softGreen: '#E3F4E9',
  softBlue: '#E7F0F4',
  warmBeige: '#F3EFE6',
  mutedRose: '#F3E1DF',
  textPrimary: '#252725',
  textSecondary: '#737773',
  border: '#E7E8E4',
  danger: '#A85F59',
  white: '#FFFFFF',
} as const;

export const Colors = {
  light: {
    text: Palette.textPrimary,
    background: Palette.background,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.softGreen,
    textSecondary: Palette.textSecondary,
  },
  dark: {
    text: Palette.textPrimary,
    background: Palette.background,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.softGreen,
    textSecondary: Palette.textSecondary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 32,
  eight: 40,
  nine: 64,
} as const;

export const Radius = {
  small: 12,
  input: 16,
  card: 18,
  large: 24,
  round: 999,
} as const;

export const Typography = {
  display: 30,
  h1: 24,
  h2: 19,
  h3: 16,
  body: 15,
  caption: 12,
  button: 15,
  price: 21,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
