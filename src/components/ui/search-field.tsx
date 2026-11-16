import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { TextInput, View } from 'react-native';

import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

type SearchFieldProps = Readonly<{
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
}>;

export function SearchField({
  value,
  onChangeText,
  placeholder = 'ค้นหาสกินแคร์ แบรนด์ หรือส่วนผสม',
  editable = true,
}: SearchFieldProps) {
  return (
    <View
      style={{
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        borderWidth: 1,
        borderColor: Palette.border,
        borderRadius: Radius.input,
        borderCurve: 'continuous',
        backgroundColor: Palette.surface,
        paddingHorizontal: Spacing.four,
      }}>
      <MaterialCommunityIcons name="magnify" size={21} color={Palette.textSecondary} />
      <TextInput
        accessibilityLabel="ค้นหาผลิตภัณฑ์"
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Palette.textSecondary}
        style={{
          flex: 1,
          color: Palette.textPrimary,
          fontFamily: 'NotoSansThai_400Regular',
          fontSize: Typography.caption,
          paddingVertical: 0,
        }}
      />
      <MaterialCommunityIcons name="line-scan" size={21} color={Palette.textSecondary} />
    </View>
  );
}
