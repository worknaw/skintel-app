import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';

import { AppText } from './app-text';

import { Palette, Radius, Spacing } from '@/constants/theme';

type ChipProps = Readonly<{
  label: string;
  selected?: boolean;
  onPress?: () => void;
}>;

export function Chip({ label, selected = false, onPress }: ChipProps) {
  const labelContent = (
    <AppText variant="caption" tone={selected ? 'inverse' : 'primary'}>
      {label}
    </AppText>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 34,
        borderRadius: Radius.round,
        borderWidth: 1,
        borderColor: selected ? '#61A77B' : Palette.border,
        backgroundColor: selected ? 'transparent' : Palette.surface,
        overflow: 'hidden',
        opacity: pressed ? 0.8 : 1,
      })}>
      {selected ? (
        <LinearGradient colors={['#82CDA0', '#4B9A70', '#28674A']} locations={[0, 0.5, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 32, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center' }}>
          {labelContent}
        </LinearGradient>
      ) : (
        <View style={{ minHeight: 32, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center' }}>
          {labelContent}
        </View>
      )}
    </Pressable>
  );
}
