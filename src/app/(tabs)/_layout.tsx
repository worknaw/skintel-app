import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, useRouter } from 'expo-router';
import { useAuthSession } from '@/features/auth/ui/auth-session-provider';
import { getProtectedAuthRoute } from '@/features/auth/application/auth-session';
import { Platform, Pressable, View } from 'react-native';

import { Palette } from '@/constants/theme';

const iconSize = 22;

export default function TabLayout() {
  const router = useRouter();
  const { session, isLoading } = useAuthSession();
  return (
    <Tabs
      // Keep native tab views attached: switching tabs must not reparent Fabric children.
      // Keep the Android native view workaround while preparing frequently used tabs early.
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        ...(Platform.OS === 'android' ? {
          tabBarButton: ({ ref: _ref, href: _href, pressColor: _pressColor, pressOpacity: _pressOpacity, hoverEffect: _hoverEffect, android_ripple: _ripple, ...props }) => (
            <Pressable {...props} />
          ),
        } : {}),
        tabBarActiveTintColor: Palette.primaryDark,
        tabBarInactiveTintColor: '#777B78',
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontFamily: 'NotoSansThai_500Medium',
          fontSize: 9,
          lineHeight: 13,
          paddingTop: 1,
        },
        tabBarStyle: {
          height: 78,
          paddingTop: 9,
          paddingBottom: 9,
          backgroundColor: '#FFFEFC',
          borderTopWidth: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderCurve: 'continuous',
          boxShadow: '0 -4px 18px rgba(44, 65, 55, 0.10)',
          overflow: 'visible',
        },
        tabBarItemStyle: { overflow: 'visible' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'หน้าหลัก',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? 'home-variant' : 'home-variant-outline'} size={iconSize} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'ค้นพบ',
          lazy: Platform.OS !== 'android',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="magnify" size={iconSize} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: 'วิเคราะห์ผิว',
          lazy: Platform.OS !== 'android',
          tabBarLabelStyle: {
            fontFamily: 'NotoSansThai_500Medium',
            fontSize: 9,
            lineHeight: 13,
            marginTop: 7,
          },
          tabBarIcon: () => (
            <View style={{ width: 62, height: 62, marginTop: -29, borderRadius: 31, padding: 4, backgroundColor: '#FFFEFC', boxShadow: '0 5px 15px rgba(49,92,73,0.25)' }}>
              <LinearGradient colors={['#A8E1BC', '#61B487', '#28704E']} locations={[0, 0.42, 1]} start={{ x: 0.12, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1, borderRadius: 27, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <View style={{ position: 'absolute', width: 14, height: 14, top: 10, right: 8, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.23)' }} />
                <MaterialCommunityIcons name="face-recognition" size={27} color={Palette.white} />
              </LinearGradient>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="routine"
        options={{
          title: 'รูทีน',
          lazy: Platform.OS !== 'android',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? 'calendar-check' : 'calendar-blank-outline'} size={iconSize} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        listeners={{
          tabPress: (event) => {
            if (isLoading || !session) {
              event.preventDefault();
              if (!isLoading) router.navigate(getProtectedAuthRoute('/profile', false) as never);
            }
          },
        }}
        options={{
          title: 'โปรไฟล์',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? 'account' : 'account-outline'} size={iconSize} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
