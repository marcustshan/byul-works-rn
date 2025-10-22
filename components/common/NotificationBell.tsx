// components/NotificationBellOverlay.tsx
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RootState } from '@/store';
import { useAppSelector } from '@/store/hooks';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { memo, useEffect, useState } from 'react';
import { Dimensions, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NOTI_ROUTE = '/notifications';       // 알림 목록 화면 라우트
const STORAGE_KEY = 'notification_bell_position';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default memo(function NotificationBellOverlay() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isDragging, setIsDragging] = useState(false);

  // 애니메이션 값들
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const existUnread = useAppSelector((state: RootState) => state.notification.existUnread);

  // 초기 위치 설정
  useEffect(() => {
    const loadPosition = async () => {
      try {
        const savedPosition = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedPosition) {
          const { x, y } = JSON.parse(savedPosition);
          translateX.value = x;
          translateY.value = y;
        } else {
          // 기본 위치 설정 (우측 상단)
          translateX.value = screenWidth - 60;
          translateY.value = Math.max(insets.top, 8);
        }
      } catch (error) {
        console.log('위치 로드 실패:', error);
        // 기본 위치로 설정
        translateX.value = screenWidth - 60;
        translateY.value = Math.max(insets.top, 8);
      }
    };
    loadPosition();
  }, [insets.top]);

  // 위치 저장
  const savePosition = async (x: number, y: number) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }));
    } catch (error) {
      console.log('위치 저장 실패:', error);
    }
  };

  // 제스처 핸들러
  const panGesture = Gesture.Pan()
    .minDistance(10) // 최소 드래그 거리 설정
    .onStart(() => {
      runOnJS(setIsDragging)(true);
      scale.value = withSpring(1.1);
    })
    .onUpdate((event) => {
      translateX.value = event.absoluteX - 20; // 버튼 중심점 조정
      translateY.value = event.absoluteY - 20;
    })
    .onEnd(() => {
      runOnJS(setIsDragging)(false);
      scale.value = withSpring(1);
      
      // 화면 경계 내로 제한
      const minX = 20;
      const maxX = screenWidth - 40;
      const minY = Math.max(insets.top, 8);
      const maxY = screenHeight - 60;

      translateX.value = withSpring(Math.max(minX, Math.min(maxX, translateX.value)));
      translateY.value = withSpring(Math.max(minY, Math.min(maxY, translateY.value)));

      // 최종 위치 저장
      runOnJS(savePosition)(translateX.value, translateY.value);
    });

  // 탭 핸들러
  const handlePress = () => {
    if (!isDragging) {
      router.push(NOTI_ROUTE);
    }
  };

  // 애니메이션 스타일
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <View
      pointerEvents="box-none"
      style={styles.container}
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.noticeBellButton,
            animatedStyle,
            {
              backgroundColor: isDragging
                ? (colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)')
                : (colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'),
              borderColor: colorScheme === 'dark' ? '#333' : '#e6e6e6',
            },
          ]}
        >
          <TouchableOpacity
            onPress={handlePress}
            style={styles.touchableArea}
            activeOpacity={0.7}
          >
            {existUnread && ( <View style={styles.unreadBadge}></View> )}
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.tabIconDefault}
            />
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  noticeBellButton: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
      android: {
      },
    }),
  },
  touchableArea: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: 7,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 50,
    backgroundColor: 'red',
  },
});
