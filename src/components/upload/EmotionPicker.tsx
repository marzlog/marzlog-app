import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/src/theme';

// 감정 데이터 (4열 x 3행 = 12개)
const EMOTIONS = [
  { id: 'joy', label: '기쁨', emoji: '😊' },
  { id: 'happiness', label: '행복', emoji: '😄' },
  { id: 'love', label: '사랑', emoji: '🥰' },
  { id: 'gratitude', label: '감사', emoji: '🙏' },
  { id: 'surprise', label: '놀람', emoji: '😮' },
  { id: 'anxiety', label: '불안', emoji: '😰' },
  { id: 'sad', label: '슬픔', emoji: '😢' },
  { id: 'angry', label: '분노', emoji: '😠' },
  { id: 'focus', label: '몰입', emoji: '🎯' },
  { id: 'thinking', label: '생각', emoji: '🤔' },
  { id: 'tired', label: '피곤', emoji: '😴' },
  { id: 'sick', label: '아픔', emoji: '🤒' },
];

interface EmotionPickerProps {
  selectedEmotion: string | null;
  onSelect: (emotionId: string) => void;
}

export function EmotionPicker({ selectedEmotion, onSelect }: EmotionPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>현재 기분은 어떤가요?</Text>
      <View style={styles.grid}>
        {EMOTIONS.map((emotion) => (
          <TouchableOpacity
            key={emotion.id}
            style={[
              styles.emotionButton,
              selectedEmotion === emotion.id && styles.emotionButtonSelected,
            ]}
            onPress={() => onSelect(emotion.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{emotion.emoji}</Text>
            <Text
              style={[
                styles.label,
                selectedEmotion === emotion.id && styles.labelSelected,
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
