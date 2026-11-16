import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Palette, Spacing } from '@/constants/theme';

export interface FloatingChatDockingHook {
  translateX: Animated.Value;
  opacity: Animated.Value;
  scrollHandlers: {
    onScrollBeginDrag: () => void;
    onScroll: (event?: NativeSyntheticEvent<NativeScrollEvent>) => void;
    onScrollEndDrag: () => void;
    onMomentumScrollBegin: () => void;
    onMomentumScrollEnd: () => void;
    scrollEventThrottle: number;
  };
  dock: () => void;
  undock: () => void;
}

/**
 * Hook to smoothly tuck the chat icon into the screen corner during scrolling,
 * and bounce it smoothly back when scrolling ends or idles.
 */
export function useFloatingChatDocking(): FloatingChatDockingHook {
  const [translateX] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dock = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);

    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 36, // slides 36px toward the right corner
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0.65,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-return fallback after 800ms idle in case momentum finishes without event
    idleTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          friction: 6,
          tension: 45,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, 800);
  }, [translateX, opacity]);

  const undock = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);

    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        friction: 6,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateX, opacity]);

  const scrollHandlers = useMemo(
    () => ({
      onScrollBeginDrag: dock,
      onScroll: dock,
      onScrollEndDrag: undock,
      onMomentumScrollBegin: dock,
      onMomentumScrollEnd: undock,
      scrollEventThrottle: 32,
    }),
    [dock, undock],
  );

  return { translateX, opacity, scrollHandlers, dock, undock };
}

interface FloatingChatButtonProps {
  translateX: Animated.Value;
  opacity: Animated.Value;
  onPress: () => void;
  bottomOffset?: number;
}

export function FloatingChatButton({
  translateX,
  opacity,
  onPress,
  bottomOffset = 92,
}: FloatingChatButtonProps) {
  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: bottomOffset,
          transform: [{ translateX }],
          opacity,
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="เปิดแชทบอทปรึกษาผิวพรรณกับ AI"
        accessibilityHint="แตะเพื่อเปิดหน้าต่างสนทนากับ SkinCycle AI Consultant"
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          pressed && { transform: [{ scale: 0.94 }] },
        ]}>
        <LinearGradient
          colors={['#72BE94', '#28674A']}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={styles.gradient}>
          <MaterialCommunityIcons name="chat-processing" size={26} color={Palette.white} />

          {/* AI Sparkle badge */}
          <View style={styles.badgeContainer}>
            <LinearGradient
              colors={['#FFE6A3', '#F3A66A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badgeGradient}>
              <MaterialCommunityIcons name="shimmer" size={10} color="#5C3400" />
            </LinearGradient>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: Spacing.four,
    zIndex: 50,
    ...Platform.select({
      ios: {
        shadowColor: '#28674A',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 7,
      },
      default: {
        boxShadow: '0 5px 16px rgba(40, 103, 74, 0.35)',
      },
    }),
  },
  pressable: {
    borderRadius: 28,
  },
  gradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
  },
  badgeContainer: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: 9,
    padding: 1.5,
    backgroundColor: '#FFFFFF',
  },
  badgeGradient: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
