import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors } from '@/src/theme';
import { EMOTIONS as EMOTION_DATA, emotionLabel } from '@/constants/emotions';
import { useTranslation } from '@/src/hooks/useTranslation';

interface EmotionPickerProps {
  selectedEmotion: string;
  onSelect: (emotion: string) => void;
  isDark?: boolean;
}

export function EmotionPicker({ selectedEmotion, onSelect, isDark = false }: EmotionPickerProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, isDark && styles.titleDark]}>{t('mediaDetail.emotionQuestion')}</Text>
      <View style={styles.grid}>
        {EMOTION_DATA.map((emotion) => {
          const isSelected = selectedEmotion === emotion.nameKo;
          return (
            <TouchableOpacity
              key={emotion.key}
              style={[
                styles.emotionButton,
                isDark && styles.emotionButtonDark,
                isSelected && styles.emotionButtonSelected,
              ]}
              onPress={() => onSelect(emotion.nameKo)}
              activeOpacity={0.7}
            >
              <Image
                source={emotion.icons.color}
                style={styles.emotionIcon}
              />
              <Text
                style={[
                  styles.label,
                  isDark && styles.labelDark,
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
    color: colors.text.primary,
    marginBottom: 16,
  },
  titleDark: {
    color: '#F9FAFB',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emotionButton: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  emotionButtonDark: {
    backgroundColor: '#1F2937',
  },
  emotionButtonSelected: {
    borderColor: '#FF6B6B',
  },
  emotionIcon: {
    width: 32,
    height: 32,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.primary,
  },
  labelDark: {
    color: '#9CA3AF',
  },
  labelSelected: {
    color: colors.text.primary,
    fontWeight: '600',
  },
});

export default EmotionPicker;
