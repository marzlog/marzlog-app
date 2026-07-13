import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { getTheme } from '@/src/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';

interface IntensitySliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function IntensitySlider({ value, onChange }: IntensitySliderProps) {
  const { t } = useTranslation();
  // F-DARKMODE-LABELS: 다크모드 결정 — ImageSelector 동형 (themeMode 'system'이면 시스템 설정)
  const { themeMode } = useSettingsStore();
  const systemColorScheme = useColorScheme();
  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';
  const theme = getTheme(isDark);
  return (
    <View style={[styles.container, { backgroundColor: theme.background.tertiary }]}>
      <Text style={[styles.title, { color: theme.text.primary }]}>{t('mediaDetail.intensityLabel')}</Text>

      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={5}
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
        <Text style={[styles.labelText, { color: theme.text.secondary }]}>3</Text>
        <Text style={[styles.labelText, { color: theme.text.secondary }]}>5</Text>
      </View>

      <View style={styles.indicatorContainer}>
        {[1, 2, 3, 4, 5].map((level) => (
          <View
            key={level}
            style={[
              styles.dot,
              { backgroundColor: level <= value ? theme.primary.default : theme.border.default },
            ]}
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
  title: {
    fontSize: 14,
    fontWeight: '600',
    // color는 인라인 theme.text.primary (F-DARKMODE-LABELS)
    marginBottom: 20,
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
