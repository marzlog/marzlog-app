import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/src/theme';

// 감정 데이터 (4열 x 3행 = 12개, label이 저장값)
const EMOTIONS = [
  { label: '기쁨', emoji: '😊' },
  { label: '평온', emoji: '😌' },
  { label: '사랑', emoji: '🥰' },
  { label: '감사', emoji: '🙏' },
  { label: '놀람', emoji: '😮' },
  { label: '불안', emoji: '😰' },
  { label: '슬픔', emoji: '😢' },
  { label: '분노', emoji: '😠' },
  { label: '몰입', emoji: '🎯' },
  { label: '생각', emoji: '🤔' },
  { label: '피곤', emoji: '😴' },
  { label: '아픔', emoji: '🤒' },
];

interface EmotionPickerProps {
  selectedEmotion: string;
  onSelect: (emotion: string) => void;
}

export function EmotionPicker({ selectedEmotion, onSelect }: EmotionPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>현재 기분은 어떤가요?</Text>
      <View style={styles.grid}>
        {EMOTIONS.map((emotion) => (
          <TouchableOpacity
            key={emotion.label}
            style={[
              styles.emotionButton,
              selectedEmotion === emotion.label && styles.emotionButtonSelected,
            ]}
            onPress={() => onSelect(emotion.label)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{emotion.emoji}</Text>
            <Text
              style={[
                styles.label,
                selectedEmotion === emotion.label && styles.labelSelected,
              ]}
            >
              {emotion.label}
            </Text>
          </TouchableOpacity>
        ))}
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
  emotionButtonSelected: {
    backgroundColor: colors.brand.primary,
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.primary,
  },
  labelSelected: {
    color: colors.text.inverse,
  },
});

export default EmotionPicker;
