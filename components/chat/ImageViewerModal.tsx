// components/chat/ImageViewerModal.tsx
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Gesture & Reanimated
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  visible: boolean;
  onClose: () => void;
  uri: string;
  title?: string;
  dismissOnBackdrop?: boolean;
  /** 배경 모드: 'auto'(테마 따름) | 'light'(항상 밝게) | 'dark'(항상 어둡게) */
  background?: 'auto' | 'light' | 'dark';
  /** 줌 범위 */
  minScale?: number;
  maxScale?: number;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function ImageViewerModal({
  visible,
  onClose,
  uri,
  title,
  dismissOnBackdrop = true,
  background = 'auto',
  minScale = 1,
  maxScale = 4,
}: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const insets = useSafeAreaInsets();

  if (!uri) return null;

  // UI 톤 결정
  const isDarkUI = background === 'auto' ? (scheme ?? 'light') === 'dark' : background === 'dark';
  const overlayBg = isDarkUI ? 'rgba(0,0,0,0.92)' : 'rgba(255,255,255,0.98)';
  const chromeBg  = isDarkUI ? 'rgba(28,31,33,0.7)' : 'rgba(255,255,255,0.85)';
  const iconColor = isDarkUI ? '#FFF' : '#111';
  const textColor = isDarkUI ? '#EEE' : '#111';

  // Zoom/Pan shared values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // 이미지 변경/모달 오픈 시 상태 초기화
  useEffect(() => {
    if (visible) {
      scale.value = withTiming(1, { duration: 120 });
      savedScale.value = 1;
      translateX.value = withTiming(0, { duration: 120 });
      translateY.value = withTiming(0, { duration: 120 });
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [visible, uri]);

  // 더블탭: 1x ↔ 2x 토글(중앙 기준)
  const onDoubleTap = () => {
    const to = Math.abs(scale.value - 1) < 0.01 ? 2 : 1;
    scale.value = withTiming(to, { duration: 140 });
    if (to === 1) {
      translateX.value = withTiming(0, { duration: 140 });
      translateY.value = withTiming(0, { duration: 140 });
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
    savedScale.value = to;
  };

  // Pinch gesture
  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const next = Math.min(maxScale, Math.max(minScale, savedScale.value * e.scale));
      scale.value = next;
    })
    .onEnd(() => {
      // 스케일이 1x로 돌아오면 중심으로 복귀
      if (scale.value <= 1.01) {
        scale.value = withTiming(1, { duration: 120 });
        translateX.value = withTiming(0, { duration: 120 });
        translateY.value = withTiming(0, { duration: 120 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  // Pan gesture (확대 상태에서만 이동)
  const pan = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value <= 1.01) return; // 1x에서는 패닝 비활성
      // 화면 대비 이동 한계 계산(이미지 컨텐츠 가로/세로)
      const boundX = ((SCREEN_W * scale.value) - SCREEN_W) / 2;
      const boundY = ((SCREEN_H * scale.value) - SCREEN_H) / 2;

      const nextX = savedTranslateX.value + e.translationX;
      const nextY = savedTranslateY.value + e.translationY;

      // 경계 내로 제한
      translateX.value = Math.min(boundX, Math.max(-boundX, nextX));
      translateY.value = Math.min(boundY, Math.max(-boundY, nextY));
    })
    .onEnd(() => {
      // inertia 생략(필요하면 withDecay 등으로 확장)
    });

  // 더블탭 제스처
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd((_e, success) => {
      if (success) runOnJS(onDoubleTap)();
    });

  // 단일 탭: 배경 닫기 허용 시 닫기
  const singleTap = Gesture.Tap()
    .maxDuration(220)
    .onEnd((_e, success) => {
      if (success && dismissOnBackdrop && scale.value <= 1.01) {
        runOnJS(onClose)();
      }
    });

  // Gesture 조합: 더블탭 우선, 그 외엔 핀치/팬 동시
  const composed = Gesture.Race(
    doubleTap,
    Gesture.Simultaneous(pinch, pan, singleTap),
  );

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

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

      <View style={[styles.overlay, { backgroundColor: overlayBg }]}>
        {/* 배경 터치 닫기 */}
        {dismissOnBackdrop && <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />}

        {/* 🔹 제스처/이미지 레이어: 화면 전체(unsafe) */}
        <GestureDetector gesture={composed}>
          <Animated.View style={styles.gestureLayer}>
            <Animated.Image
              source={{ uri }}
              resizeMode="contain"
              style={[styles.image, animatedImageStyle]}
            />
          </Animated.View>
        </GestureDetector>

        {/* 🔹 상/하단 크롬은 SafeArea 안으로 */}
        <SafeAreaView
          pointerEvents="box-none"
          style={StyleSheet.absoluteFill}
          edges={['top', 'bottom']}
        >
          {/* 상단 바 */}
          <View style={[styles.topBar, { backgroundColor: chromeBg }]}>
            <View style={styles.topBarRow}>
              <Pressable onPress={onClose} hitSlop={12} style={styles.iconBtn} accessibilityLabel="닫기">
                <Ionicons name="close" size={22} color={iconColor} />
              </Pressable>

              {title ? (
                <Text numberOfLines={1} style={[styles.title, { color: textColor }]}>{title}</Text>
              ) : (
                <View />
              )}

              <View style={styles.spacer} />
            </View>
          </View>

          {/* 하단 바 (컨트롤 자리) */}
          <View style={[styles.bottomBar, { backgroundColor: chromeBg }]}>
            {/* 컨트롤 버튼/배율표시 등 배치 */}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  gestureLayer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: SCREEN_W, height: SCREEN_H },

  // 상단 바: 인셋 기반 패딩 제거
  topBar: {
    paddingHorizontal: 10,
    paddingTop: 6,          // ← 일반 여백만
    paddingBottom: 6,
  },
  topBarRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  iconBtn: { padding: 6 },
  title: {
    flex: 1,
    marginLeft: 6, marginRight: 6,
    fontSize: 15,
    fontWeight: Platform.select({ ios: '600', default: '700' }) as any,
    textAlign: 'center',
  },
  spacer: { width: 34 },

  // 하단 바: 인셋 기반 패딩 제거
  bottomBar: {
    paddingTop: 8, paddingBottom: 8, paddingHorizontal: 12,
  },
});

