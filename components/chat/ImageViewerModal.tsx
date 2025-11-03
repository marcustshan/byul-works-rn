// components/chat/ImageViewerModal.tsx
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  uri: string;
  title?: string;
  /** 배경: 'auto'(테마) | 'light'(항상 밝게) | 'dark'(항상 어둡게) */
  background?: 'auto' | 'light' | 'dark';
  /** 배경 탭으로 닫기 (확대 중엔 닫히지 않음) */
  dismissOnBackdrop?: boolean;
  /** 확대 범위 (축소 허용 시 0.5 등으로 설정) */
  minScale?: number;
  maxScale?: number;
};

export default function ImageViewerModal({
  visible,
  onClose,
  uri,
  title,
  background = 'auto',
  dismissOnBackdrop = true,
  minScale = 1,
  maxScale = 4,
}: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  // UI 톤
  const isDarkUI =
    background === 'auto' ? (scheme ?? 'light') === 'dark' : background === 'dark';
  const overlayBg = isDarkUI ? 'rgba(0,0,0,0.92)' : 'rgba(255,255,255,0.98)';
  const chromeBg = isDarkUI ? 'rgba(28,31,33,0.7)' : 'rgba(255,255,255,0.85)';
  const iconColor = isDarkUI ? '#FFF' : '#111';
  const textColor = isDarkUI ? '#EEE' : '#111';

  // 중앙 뷰어 영역(Safe Area에서 상/하단 바 제외)의 크기
  const [centerSize, setCenterSize] = useState({ w: 0, h: 0 });
  const cw = useSharedValue(0);
  const ch = useSharedValue(0);

  const onCenterLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCenterSize({ w: width, h: height });
  };
  useEffect(() => {
    cw.value = centerSize.w;
    ch.value = centerSize.h;
  }, [centerSize]);

  // Zoom/Pan 상태
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // 모달 열릴 때/이미지 변경 시 초기화
  useEffect(() => {
    if (visible) {
      scale.value = withTiming(1, { duration: 120 });
      savedScale.value = minScale;
      translateX.value = withTiming(0, { duration: 120 });
      translateY.value = withTiming(0, { duration: 120 });
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [visible, uri, minScale]);

  // 더블탭: minScale ↔ 2x 토글
  const onDoubleTap = () => {
    const EPS = 0.01;
    const to = Math.abs(scale.value - minScale) < EPS ? 2 : minScale;
    scale.value = withTiming(to, { duration: 140 });
    if (to === minScale) {
      translateX.value = withTiming(0, { duration: 140 });
      translateY.value = withTiming(0, { duration: 140 });
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
    savedScale.value = to;
  };

  // Pinch
  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      // min~max로 클램프
      const next = Math.min(maxScale, Math.max(minScale, savedScale.value * e.scale));
      scale.value = next;
    })
    .onEnd(() => {
      // minScale 근처면 스냅 & 위치 리셋
      const EPS = 0.01;
      if (scale.value <= minScale + EPS) {
        scale.value = withTiming(minScale, { duration: 120 });
        translateX.value = withTiming(0, { duration: 120 });
        translateY.value = withTiming(0, { duration: 120 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  // Pan (확대 상태에서만), 중앙 영역 기준으로 경계 클램프
  const pan = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      const EPS = 0.01;
      if (scale.value <= minScale + EPS) return;

      const boundX = Math.max(0, ((cw.value * scale.value) - cw.value) / 2);
      const boundY = Math.max(0, ((ch.value * scale.value) - ch.value) / 2);

      const nextX = savedTranslateX.value + e.translationX;
      const nextY = savedTranslateY.value + e.translationY;

      translateX.value = Math.min(boundX, Math.max(-boundX, nextX));
      translateY.value = Math.min(boundY, Math.max(-boundY, nextY));
    });

  // 탭 제스처 (배경 닫기)
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd((_e, ok) => {
      if (ok) runOnJS(onDoubleTap)();
    });

  const singleTap = Gesture.Tap()
    .maxDuration(220)
    .onEnd((_e, ok) => {
      const EPS = 0.01;
      if (ok && dismissOnBackdrop && scale.value <= minScale + EPS) {
        runOnJS(onClose)();
      }
    });

  const composed = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan, singleTap));

  const animatedImageStyle = useAnimatedStyle(() => ({
    width: cw.value,
    height: ch.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <StatusBar
        barStyle={isDarkUI ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />

      {/* 모달 콘텐츠 루트: GHRootView (Modal은 별도 네이티브 트리) */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.overlay, { backgroundColor: overlayBg }]}>
          {/* Safe Area 전체 */}
          <SafeAreaView style={styles.safeFill} edges={['top', 'bottom', 'left', 'right']}>
            {/* 상단 바 */}
            <View style={[styles.topBar, { backgroundColor: chromeBg }]}>
              <View style={styles.topBarRow}>
                <Pressable onPress={onClose} hitSlop={12} style={styles.iconBtn} accessibilityLabel="닫기">
                  <Ionicons name="close" size={22} color={iconColor} />
                </Pressable>
                {title ? (
                  <Text numberOfLines={1} style={[styles.title, { color: textColor }]}>
                    {title}
                  </Text>
                ) : (
                  <View />
                )}
                <View style={styles.spacer} />
              </View>
            </View>

            {/* 중앙 뷰어 영역: 이 크기를 기준으로 이미지/경계 계산 */}
            <View style={styles.centerArea} onLayout={onCenterLayout}>
              {/* 배경 탭 닫기: 중앙 영역만; 툴바와 겹치지 않음 */}
              {dismissOnBackdrop && (
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => {
                    const EPS = 0.01;
                    if (scale.value <= minScale + EPS) onClose();
                  }}
                />
              )}

              {/* 제스처 레이어 */}
              <GestureDetector gesture={composed}>
                <Animated.View style={styles.gestureLayer}>
                  <Animated.Image
                    source={{ uri }}
                    resizeMode="contain"
                    style={[styles.image, animatedImageStyle]}
                  />
                </Animated.View>
              </GestureDetector>
            </View>
          </SafeAreaView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  safeFill: { flex: 1 },

  // 상단/하단 바 (SafeAreaView가 인셋 처리 → 일반 여백만)
  topBar: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 6,
    zIndex: 2,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  iconBtn: { padding: 6 },
  title: {
    flex: 1,
    marginLeft: 6,
    marginRight: 6,
    fontSize: 15,
    fontWeight: Platform.select({ ios: '600', default: '700' }) as any,
    textAlign: 'center',
  },
  spacer: { width: 34 },

  // 중앙 뷰어 영역: 남은 공간 모두 차지
  centerArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  gestureLayer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 실제 width/height는 animated style에서 지정
  image: {},
});
