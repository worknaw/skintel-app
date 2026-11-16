import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DefaultTheme, ThemeProvider } from 'expo-router';
import Stack from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';

import { Palette } from '@/constants/theme';
import { AppNotificationProvider } from '@/components/ui/app-notification';
import { queryClient } from '@/core/query/query-client';
import { AuthSessionProvider } from '@/features/auth/ui/auth-session-provider';
import { NotificationNavigationObserver } from '@/features/settings/application/notification-navigation-observer';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Palette.primaryDark,
    background: Palette.background,
    card: Palette.background,
    text: Palette.textPrimary,
    border: Palette.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansThai_400Regular: require('../../assets/fonts/NotoSansThai-Regular.ttf'),
    NotoSansThai_500Medium: require('../../assets/fonts/NotoSansThai-Medium.ttf'),
    NotoSansThai_600SemiBold: require('../../assets/fonts/NotoSansThai-SemiBold.ttf'),
    NotoSansThai_700Bold: require('../../assets/fonts/NotoSansThai-Bold.ttf'),
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>
        <AppNotificationProvider>
          <ThemeProvider value={navigationTheme}>
            <NotificationNavigationObserver />
            <StatusBar style="dark" />
            <Stack
            screenOptions={{
              contentStyle: { backgroundColor: Palette.background },
              headerStyle: { backgroundColor: Palette.background },
              headerTintColor: Palette.primaryDark,
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
              headerTitleStyle: { color: Palette.textPrimary, fontFamily: 'NotoSansThai_600SemiBold', fontSize: 17 },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="favorites" options={{ headerShown: false }} />
            <Stack.Screen name="cart" options={{ headerShown: false }} />
            <Stack.Screen name="checkout" options={{ headerShown: false }} />
            <Stack.Screen name="addresses" options={{ headerShown: false }} />
            <Stack.Screen name="orders" options={{ headerShown: false }} />
            <Stack.Screen name="payment/[orderId]" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="settings-detail/[section]" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" options={{ title: 'ไม่พบหน้า' }} />
            </Stack>
          </ThemeProvider>
        </AppNotificationProvider>
      </AuthSessionProvider>
    </QueryClientProvider>
  );
}
