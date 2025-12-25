import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors } from '@/src/theme';

interface IntensitySliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function IntensitySlider({ value, onChange }: IntensitySliderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>기분의 강도를 선택하세요</Text>

      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={5}
          step={1}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor={colors.brand.primary}
          maximumTrackTintColor={colors.neutral[2]}
          thumbTintColor={colors.brand.primary}
        />
      </View>

      <View style={styles.labelsContainer}>
        <Text style={styles.labelText}>1</Text>
        <Text style={styles.labelText}>3</Text>
        <Text style={styles.labelText}>5</Text>
      </View>

      <View style={styles.indicatorContainer}>
        {[1, 2, 3, 4, 5].map((level) => (
          <View
            key={level}
            style={[
              styles.dot,
              level <= value && styles.dotActive,
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
    backgroundColor: colors.neutral[2],
    borderRadius: 20,
    padding: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
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
    color: colors.text.secondary,
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
    backgroundColor: colors.neutral['0.5'],
  },
  dotActive: {
    backgroundColor: colors.brand.primary,
  },
});

export default IntensitySlider;
