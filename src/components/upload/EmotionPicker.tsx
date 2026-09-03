import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { getTheme } from '@/src/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { EMOTIONS as EMOTION_DATA, emotionLabel } from '@/constants/emotions';
import { useTranslation } from '@/src/hooks/useTranslation';

interface EmotionPickerProps {
  /** 선택된 감정 **키**(joy/calm/…). ★F-MOOD-DIMENSION P3에서 nameKo → key 전환. */
  selectedEmotion: string;
  /** 선택 시 감정 키를 돌려준다. 서버 전송값도 이 키 그대로다. */
  onSelect: (emotion: string) => void;
}

export function EmotionPicker({ selectedEmotion, onSelect }: EmotionPickerProps) {
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
              onPress={() => onSelect(emotion.key)}
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
    marginBottom: 16,
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
});

export default EmotionPicker;
