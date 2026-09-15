import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { getTheme } from '@/src/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { EMOTIONS as EMOTION_DATA, emotionLabel } from '@/constants/emotions';
import { useTranslation } from '@/src/hooks/useTranslation';
import { toggleEmotion } from '@/src/utils/emotionIntensity';

interface EmotionPickerProps {
  /** 선택된 감정 **키**(joy/calm/…). 미선택은 null (F-EMOTION-REVAMP — 기본 선택 없음). */
  selectedEmotion: string | null;
  /** 선택 시 감정 키, 같은 감정 재탭으로 해제하면 null. 서버 전송값도 이 키 그대로다. */
  onSelect: (emotion: string | null) => void;
  /**
   * 재탭 해제 허용 여부(기본 true). 서버에 감정을 지울 계약이 없으므로(편집 해제 보류),
   * 이미 감정이 저장된 게시물의 편집 화면은 false 로 넘겨 "해제한 척" 상태를 막는다.
   */
  allowDeselect?: boolean;
  /** 그리드 아래 안내 문구 — 넘기면 표시한다 (예: 미선택 시 AI 추정 안내). */
  hint?: string;
}

export function EmotionPicker({ selectedEmotion, onSelect, allowDeselect = true, hint }: EmotionPickerProps) {
  const { t } = useTranslation();
  // F-DARKMODE-LABELS: 다크모드 결정 — ImageSelector 동형 (themeMode 'system'이면 시스템 설정)
  const { themeMode } = useSettingsStore();
  const systemColorScheme = useColorScheme();
  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';
  const theme = getTheme(isDark);
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text.primary }]}>{t('mediaDetail.emotionQuestion')}</Text>
      <View style={styles.grid}>
        {EMOTION_DATA.map((emotion) => {
          const isSelected = selectedEmotion === emotion.key;
          return (
            <TouchableOpacity
              key={emotion.key}
              style={[
                styles.emotionButton,
                { backgroundColor: theme.surface.primary },
                isSelected && { borderColor: theme.primary.default },
              ]}
              onPress={() => onSelect(allowDeselect ? toggleEmotion(selectedEmotion, emotion.key) : emotion.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              activeOpacity={0.7}
            >
              <Image
                source={emotion.icons.color}
                style={styles.emotionIcon}
              />
              <Text
                style={[
                  styles.label,
                  { color: isSelected ? theme.text.primary : theme.text.secondary },
                  isSelected && styles.labelSelected,
                ]}
              >
                {emotionLabel(emotion)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {hint ? (
        <Text style={[styles.hint, { color: theme.text.secondary }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    // color는 인라인 theme.text.primary (F-DARKMODE-LABELS)
    marginBottom: 8, // 12차: 그리드 상단 여백 축소 (16 → 8)
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emotionButton: {
    width: '23%',
    aspectRatio: 1,
    // backgroundColor는 인라인 theme.surface.primary, 선택 borderColor는 theme.primary.default (F-DARKMODE-LABELS)
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  emotionIcon: {
    width: 32,
    height: 32,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    // color는 인라인 theme.text.secondary, 선택 시 theme.text.primary (F-DARKMODE-LABELS)
  },
  labelSelected: {
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    marginTop: 4, // 12차: 안내 문구를 그리드 직하로 당김 (12 → 4)
    // color는 인라인 theme.text.secondary (F-DARKMODE-LABELS)
  },
});

export default EmotionPicker;
