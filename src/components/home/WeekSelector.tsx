import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@/src/theme';

interface DayItem {
  date: Date;
  dayName: string;
  dayNumber: number;
  isSelected: boolean;
  isToday: boolean;
}

interface WeekSelectorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeekSelector({ selectedDate, onDateSelect }: WeekSelectorProps) {
  const today = new Date();

  // 현재 주의 날짜들 생성 (일요일 시작)
  const getWeekDays = (): DayItem[] => {
    const currentDay = new Date(selectedDate);
    const dayOfWeek = currentDay.getDay();
    const startOfWeek = new Date(currentDay);
    startOfWeek.setDate(currentDay.getDate() - dayOfWeek);

    const days: DayItem[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      days.push({
        date,
        dayName: DAY_NAMES[date.getDay()],
        dayNumber: date.getDate(),
        isSelected: date.toDateString() === selectedDate.toDateString(),
        isToday: date.toDateString() === today.toDateString(),
      });
    }
    return days;
  };

  const weekDays = getWeekDays();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {weekDays.map((day, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.dayItem,
            day.isSelected && styles.dayItemSelected,
          ]}
          onPress={() => onDateSelect(day.date)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.dayName,
              day.isSelected && styles.dayNameSelected,
            ]}
          >
            {day.dayName}
          </Text>
          <Text
            style={[
              styles.dayNumber,
              day.isSelected && styles.dayNumberSelected,
            ]}
          >
            {day.dayNumber}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 0,
  },
  dayItem: {
    width: 50,
    height: 61,
    borderRadius: 16,
    backgroundColor: colors.neutral['0.5'],
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    gap: 4,
  },
  dayItemSelected: {
    backgroundColor: colors.brand.primary,
  },
  dayName: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.2,
    lineHeight: 15,
  },
  dayNameSelected: {
    color: colors.text.inverse,
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: '500',
    color: colors.text.primary,
    letterSpacing: -0.96,
    lineHeight: 34,
  },
  dayNumberSelected: {
    color: colors.text.inverse,
  },
});

export default WeekSelector;
