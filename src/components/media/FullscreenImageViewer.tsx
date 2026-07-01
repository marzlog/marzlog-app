import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Zoomable } from '@likashefqet/react-native-image-zoom';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
import { palette } from '@/src/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 페이지 폭 = 화면 폭 (상세 캐러셀과 동일한 스냅 산식)
const PAGE_WIDTH = SCREEN_WIDTH;

// 색은 기존 토큰 재사용. 전체화면 뷰어는 항상 다크(검은 배경/흰 전경).
const VIEWER_BACKDROP = palette.neutral[1000]; // #000000
const VIEWER_FOREGROUND = palette.neutral[0]; // #FFFFFF

// 줌 파라미터 (매직넘버 금지)
const MIN_ZOOM_SCALE = 1;
const MAX_ZOOM_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
// 이 스케일 초과면 "줌 상태"로 간주 → 가로 스와이프 잠금(팬 우선)
const ZOOM_ACTIVE_THRESHOLD = 1.01;

// 닫기 버튼 / 인디케이터 레이아웃
const CLOSE_BUTTON_OFFSET = 8;
const CLOSE_BUTTON_HIT_SLOP = 12;
const CLOSE_ICON_SIZE = 28;
const PAGINATION_BOTTOM_OFFSET = 24;
const DOT_SIZE = 6;
const DOT_GAP = 4;
const IMAGE_TRANSITION_MS = 150;

export type FullscreenViewerImage = {
  id?: string | number;
  download_url?: string;
  thumbnail_url?: string;
};

type Props = {
  images: FullscreenViewerImage[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
};

const resolveUri = (img: FullscreenViewerImage): string =>
  img.download_url || img.thumbnail_url || '';

/**
 * 단일 페이지 = 핀치/더블탭/팬 줌 가능한 이미지 1장.
 * 자체 scale SharedValue를 보유하고, 줌 임계 통과 시 부모에 알려
 * 부모가 가로 스와이프(ScrollView)를 잠그게 한다.
 */
function ZoomablePage({
  uri,
  onZoomChange,
}: {
  uri: string;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const scale = useSharedValue(MIN_ZOOM_SCALE);

  useAnimatedReaction(
    () => scale.value > ZOOM_ACTIVE_THRESHOLD,
    (isZoomed, prev) => {
      if (isZoomed !== prev) {
        runOnJS(onZoomChange)(isZoomed);
      }
    },
  );

  return (
    <View style={styles.page}>
      <Zoomable
        style={styles.zoomable}
        scale={scale}
        minScale={MIN_ZOOM_SCALE}
        maxScale={MAX_ZOOM_SCALE}
        doubleTapScale={DOUBLE_TAP_SCALE}
        isDoubleTapEnabled
      >
        <Image
          source={uri}
          style={styles.image}
          contentFit="contain"
          transition={IMAGE_TRANSITION_MS}
          cachePolicy="memory-disk"
        />
      </Zoomable>
    </View>
  );
}

export default function FullscreenImageViewer({
  images,
  initialIndex,
  visible,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  // 열릴 때 initialIndex로 위치/상태 동기화
  useEffect(() => {
    if (!visible) return;
    setCurrentIndex(initialIndex);
    setIsZoomed(false);
    // 레이아웃 직후 해당 인덱스로 점프(애니메이션 없이)
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        x: initialIndex * PAGE_WIDTH,
        animated: false,
      });
    });
  }, [visible, initialIndex]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / PAGE_WIDTH);
    if (index !== currentIndex && index >= 0 && index < images.length) {
      setCurrentIndex(index);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar hidden />

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={!isZoomed}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
        >
          {images.map((img, index) => (
            <ZoomablePage
              key={img.id ?? index}
              uri={resolveUri(img)}
              onZoomChange={setIsZoomed}
            />
          ))}
        </ScrollView>

        {/* 닫기 (X) */}
        <Pressable
          style={[styles.closeButton, { top: insets.top + CLOSE_BUTTON_OFFSET }]}
          onPress={onClose}
          hitSlop={CLOSE_BUTTON_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={CLOSE_ICON_SIZE} color={VIEWER_FOREGROUND} />
        </Pressable>

        {/* 페이지 인디케이터 */}
        {images.length > 1 && (
          <View
            style={[
              styles.pagination,
              { bottom: insets.bottom + PAGINATION_BOTTOM_OFFSET },
            ]}
          >
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VIEWER_BACKDROP,
  },
  page: {
    width: PAGE_WIDTH,
    height: '100%',
  },
  zoomable: {
    flex: 1,
  },
  image: {
    flex: 1,
    width: '100%',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagination: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginHorizontal: DOT_GAP,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: VIEWER_FOREGROUND,
  },
});
