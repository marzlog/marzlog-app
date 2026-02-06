import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors } from '@/src/theme';
import { EMOTIONS as EMOTION_DATA } from '@/constants/emotions';

interface EmotionPickerProps {
  selectedEmotion: string;
  onSelect: (emotion: string) => void;
  isDark?: boolean;
}

export function EmotionPicker({ selectedEmotion, onSelect, isDark = false }: EmotionPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, isDark && styles.titleDark]}>현재 기분은 어떤가요?</Text>
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
                source={isSelected ? emotion.icons.color : emotion.icons.gray}
                style={styles.emotionIcon}
              />
              <Text
                style={[
                  styles.label,
                  isDark && styles.labelDark,
                  isSelected && styles.labelSelected,
                ]}
              >
                {emotion.nameKo}
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
    backgroundColor: colors.neutral[2],
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emotionButtonDark: {
    backgroundColor: '#374151',
  },
  emotionButtonSelected: {
    backgroundColor: colors.brand.primary,
    borderWidth: 2,
    borderColor: colors.brand.primary,
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
    color: colors.text.inverse,
  },
});

export default EmotionPicker;
