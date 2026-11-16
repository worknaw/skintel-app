import { View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Palette, Spacing } from '@/constants/theme';

interface FormattedChatTextProps {
  text: string;
  textColor?: string;
}

function renderFormattedLine(line: string, keyPrefix: string, textColor: string) {
  // Regex to match **bold text**
  const parts = line.split(/(\*\*[^*]+\*\*)/g);

  return (
    <AppText
      key={keyPrefix}
      style={{
        color: textColor,
        fontSize: 14,
        lineHeight: 21,
        fontFamily: 'NotoSansThai_400Regular',
      }}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldContent = part.slice(2, -2);
          return (
            <AppText
              key={`${keyPrefix}-${index}`}
              style={{
                color: textColor,
                fontSize: 14,
                lineHeight: 21,
                fontFamily: 'NotoSansThai_700Bold',
                fontWeight: '700',
              }}>
              {boldContent}
            </AppText>
          );
        }
        return part;
      })}
    </AppText>
  );
}

export function FormattedChatText({ text, textColor = Palette.textPrimary }: FormattedChatTextProps) {
  const lines = text.split('\n');

  return (
    <View style={{ gap: Spacing.half }}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Empty line
        if (trimmed.length === 0) {
          return <View key={`empty-${lineIdx}`} style={{ height: Spacing.one }} />;
        }

        // Bullet point: "- " or "• " or "* "
        const bulletMatch = trimmed.match(/^([-•*])\s+(.+)$/);
        if (bulletMatch) {
          return (
            <View
              key={`bullet-${lineIdx}`}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                paddingLeft: Spacing.one,
                gap: Spacing.two,
              }}>
              <AppText style={{ color: Palette.primaryDark, fontSize: 13, lineHeight: 21 }}>•</AppText>
              <View style={{ flex: 1 }}>
                {renderFormattedLine(bulletMatch[2], `b-${lineIdx}`, textColor)}
              </View>
            </View>
          );
        }

        // Numbered list: "1. ", "2. ", etc.
        const numberMatch = trimmed.match(/^(\d+\.)\s+(.+)$/);
        if (numberMatch) {
          return (
            <View
              key={`num-${lineIdx}`}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                paddingLeft: Spacing.one,
                gap: Spacing.one,
              }}>
              <AppText
                style={{
                  color: Palette.primaryDark,
                  fontSize: 13,
                  lineHeight: 21,
                  fontFamily: 'NotoSansThai_700Bold',
                  fontWeight: '700',
                  minWidth: 20,
                }}>
                {numberMatch[1]}
              </AppText>
              <View style={{ flex: 1 }}>
                {renderFormattedLine(numberMatch[2], `n-${lineIdx}`, textColor)}
              </View>
            </View>
          );
        }

        return renderFormattedLine(line, `line-${lineIdx}`, textColor);
      })}
    </View>
  );
}

