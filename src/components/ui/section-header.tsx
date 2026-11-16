import { Link, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText } from './app-text';

type SectionHeaderProps = Readonly<{
  title: string;
  subtitle?: string;
  href?: Href;
}>;

export function SectionHeader({ title, subtitle, href }: SectionHeaderProps) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontSize: 17, lineHeight: 22, fontWeight: '600' }}>{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" tone="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {href ? (
        <Link href={href} asChild>
          <Pressable hitSlop={10}>
            <AppText variant="caption" tone="brand">
              ดูทั้งหมด
            </AppText>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}
