import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getTheme } from '@/src/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import {
  INTENSITY_NORMAL,
  INTENSITY_VERY,
  emotionLabelKey,
  isIntense,
} from '@/src/utils/emotionIntensity';

interface IntensityChipsProps {
  /** 선택된 감정 키. 호출부는 감정이 선택됐을 때만 렌더한다. */
  emotion: string;
  /** 서버 intensity 원값(1~10). 칩 선택 상태는 임계 8 기준으로 접어서 보여준다. */
  value: number;
  onChange: (value: number) => void;
  /** 모달 등 이미 카드 배경을 가진 컨테이너 안이면 true — 바깥 여백을 줄인다. */
  embedded?: boolean;
}

/**
 * 감정 강도 칩 2개 — "{감정}"(6) / "매우 {감정}"(9). F-EMOTION-REVAMP ⓒ, IntensitySlider 대체.
 * 이미 선택된 칩을 다시 눌러도 onChange 를 부르지 않는다 — 기존 원값(예: 7)을 보존한다(ⓕ).
 */
export function IntensityChips({ emotion, value, onChange, embedded = false }: IntensityChipsProps) {
  const { t } = useTranslation();
  // 다크모드 결정 — EmotionPicker 동형 (themeMode 'system'이면 시스템 설정)
  const { themeMode } = useSettingsStore();
  const systemColorScheme = useColorScheme();
  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';
  const theme = getTheme(isDark);

  const normalKey = emotionLabelKey(emotion, false);
  const veryKey = emotionLabelKey(emotion, true);
  if (!normalKey || !veryKey) return null;

  const intense = isIntense(value);
  const chips = [
    { id: 'normal', label: t(normalKey), selected: !intense, next: INTENSITY_NORMAL },
    { id: 'very', label: t(veryKey), selected: intense, next: INTENSITY_VERY },
  ];

  return (
    <View style={[styles.row, embedded && styles.rowEmbedded]}>
      {chips.map((chip) => (
        <TouchableOpacity
          key={chip.id}
          accessibilityRole="button"
          accessibilityState={{ selected: chip.selected }}
          style={[
            styles.chip,
            { backgroundColor: theme.surface.primary, borderColor: theme.border.default },
            chip.selected && { borderColor: theme.primary.default },
          ]}
          onPress={() => {
            if (!chip.selected) onChange(chip.next);
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.label,
              { color: chip.selected ? theme.text.primary : theme.text.secondary },
              chip.selected && styles.labelSelected,
            ]}
            numberOfLines={1}
          >
            {chip.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  rowEmbedded: {
    marginBottom: 8,
  },
  chip: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor·borderColor 는 인라인 theme (F-DARKMODE-LABELS)
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  labelSelected: {
    fontWeight: '600',
  },
});

export default IntensityChips;
