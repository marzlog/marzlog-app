import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { getTheme } from '@/src/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { intensityAdverbKey } from '@/src/utils/intensity';

const MAX_INTENSITY = 10;
const LEVELS = Array.from({ length: MAX_INTENSITY }, (_, i) => i + 1);

interface IntensitySliderProps {
  value: number;
  onChange: (value: number) => void;
  /**
   * 모달 등 이미 카드 배경을 가진 컨테이너에 끼워 넣을 때 true.
   * 자체 배경·라운드·패딩을 생략해 배경 중첩을 막는다(업로드 화면은 기본값 false 유지).
   */
  embedded?: boolean;
}

/** 개별 dot — 현재 값이면 스프링으로 확대 강조 (F-INTENSITY-HAPTICS 대체 시각 피드백) */
function Dot({
  isCurrent,
  isFilled,
  activeColor,
  inactiveColor,
}: {
  isCurrent: boolean;
  isFilled: boolean;
  activeColor: string;
  inactiveColor: string;
}) {
  const scale = useSharedValue(isCurrent ? 1.6 : 1);

  useEffect(() => {
    scale.value = withSpring(isCurrent ? 1.6 : 1, { damping: 14, stiffness: 260 });
  }, [isCurrent, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: isFilled ? activeColor : inactiveColor },
        animatedStyle,
      ]}
    />
  );
}

export function IntensitySlider({ value, onChange, embedded = false }: IntensitySliderProps) {
  const { t } = useTranslation();
  // F-DARKMODE-LABELS: 다크모드 결정 — ImageSelector 동형 (themeMode 'system'이면 시스템 설정)
  const { themeMode } = useSettingsStore();
  const systemColorScheme = useColorScheme();
  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';
  const theme = getTheme(isDark);

  // 값 변경 시 숫자 펄스 (햅틱 대신 시각 피드백 — expo-haptics 미설치, F-INTENSITY-HAPTICS)
  const pulse = useSharedValue(1);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true; // 최초 렌더에선 펄스 생략
      return;
    }
    pulse.value = withSequence(
      withSpring(1.18, { damping: 12, stiffness: 340 }),
      withSpring(1, { damping: 14, stiffness: 260 }),
    );
  }, [value, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const adverbKey = intensityAdverbKey(value);

  return (
    <View
      style={[
        styles.container,
        embedded
          ? styles.containerEmbedded
          : { backgroundColor: theme.background.tertiary },
      ]}
    >
      <Text style={[styles.title, { color: theme.text.primary }]}>{t('mediaDetail.intensityLabel')}</Text>

      {/* 현재 값 + 부사 미리보기 */}
      <View style={styles.valueBlock}>
        <Animated.Text style={[styles.valueText, { color: theme.primary.default }, pulseStyle]}>
          {value} / {MAX_INTENSITY}
        </Animated.Text>
        {adverbKey && (
          <Text style={[styles.adverbText, { color: theme.text.secondary }]}>{t(adverbKey)}</Text>
        )}
      </View>

      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={MAX_INTENSITY}
          step={1}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor={theme.primary.default}
          maximumTrackTintColor={theme.border.strong}
          thumbTintColor={theme.primary.default}
        />
      </View>

      <View style={styles.labelsContainer}>
        <Text style={[styles.labelText, { color: theme.text.secondary }]}>1</Text>
        <Text style={[styles.labelText, { color: theme.text.secondary }]}>5</Text>
        <Text style={[styles.labelText, { color: theme.text.secondary }]}>{MAX_INTENSITY}</Text>
      </View>

      <View style={styles.indicatorContainer}>
        {LEVELS.map((level) => (
          <Dot
            key={level}
            isCurrent={level === value}
            isFilled={level <= value}
            activeColor={theme.primary.default}
            inactiveColor={theme.border.default}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    // backgroundColor는 인라인 theme.background.tertiary (F-DARKMODE-LABELS)
    borderRadius: 20,
    padding: 20,
  },
  containerEmbedded: {
    // 모달 등 이미 카드 배경이 있는 곳: 배경·라운드·패딩 생략 (배경 중첩 방지)
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    // color는 인라인 theme.text.primary (F-DARKMODE-LABELS)
    marginBottom: 12,
  },
  valueBlock: {
    alignItems: 'center',
    marginBottom: 8,
  },
  valueText: {
    fontSize: 28,
    fontWeight: '700',
    // color는 인라인 theme.primary.default (F-DARKMODE-LABELS)
  },
  adverbText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    // color는 인라인 theme.text.secondary (F-DARKMODE-LABELS)
  },
  sliderContainer: {
    paddingHorizontal: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: -8,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '500',
    // color는 인라인 theme.text.secondary (F-DARKMODE-LABELS)
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    // backgroundColor는 인라인 theme.primary.default(활성)/theme.border.default(비활성) (F-DARKMODE-LABELS)
  },
});

export default IntensitySlider;
