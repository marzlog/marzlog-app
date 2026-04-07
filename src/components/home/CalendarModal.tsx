import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme';
import i18n from '@/src/i18n';

const { width } = Dimensions.get('window');
const DAY_SIZE = (width - 80) / 7;

interface CalendarModalProps {
  visible: boolean;
  selectedDate: Date;
  onClose: () => void;
  onDateSelect: (date: Date) => void;
}

const getWeekdays = () => (i18n.t('calendar.weekdays') as string).split(',');
const getMonths = () => (i18n.t('calendar.months') as string).split(',');

export function CalendarModal({
  visible,
  selectedDate,
  onClose,
  onDateSelect,
}: CalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 해당 월의 첫 번째 날과 마지막 날
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  // 달력에 표시할 날짜 배열 생성
  const getDaysInMonth = () => {
    const days: (Date | null)[] = [];

    // 이전 달의 빈 칸
    const startDay = firstDayOfMonth.getDay();
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // 현재 달의 날짜들
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }

    return days;
  };

  const days = getDaysInMonth();

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDatePress = (date: Date) => {
    onDateSelect(date);
    onClose();
  };

  const isSelectedDate = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.container}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
              <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>

            <Text style={styles.monthText}>
              {i18n.t('calendar.monthFormat', { year: currentMonth.getFullYear(), month: getMonths()[currentMonth.getMonth()] })}
            </Text>

            <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekdayRow}>
            {getWeekdays().map((day, index) => (
              <View key={index} style={styles.weekdayCell}>
                <Text style={[
                  styles.weekdayText,
                  index === 0 && styles.sundayText,
                  index === 6 && styles.saturdayText,
                ]}>
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {days.map((date, index) => (
              <View key={index} style={styles.dayCell}>
                {date && (
                  <TouchableOpacity
                    style={[
                      styles.dayButton,
                      isSelectedDate(date) && styles.selectedDay,
                      isToday(date) && !isSelectedDate(date) && styles.todayDay,
                    ]}
                    onPress={() => handleDatePress(date)}
                  >
                    <Text style={[
                      styles.dayText,
                      isSelectedDate(date) && styles.selectedDayText,
                      isToday(date) && !isSelectedDate(date) && styles.todayText,
                      index % 7 === 0 && styles.sundayText,
                      index % 7 === 6 && styles.saturdayText,
                    ]}>
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Today Button */}
          <TouchableOpacity
            style={styles.todayButton}
            onPress={() => handleDatePress(today)}
          >
            <Text style={styles.todayButtonText}>{i18n.t('calendar.today')}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 14,
    width: width - 48,
    maxWidth: 360,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  monthText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayCell: {
    width: DAY_SIZE,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: DAY_SIZE,
    height: Math.round(DAY_SIZE * 0.85),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  selectedDay: {
    backgroundColor: colors.brand.primary,
  },
  todayDay: {
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.primary,
  },
  selectedDayText: {
    color: colors.text.inverse,
  },
  todayText: {
    color: colors.brand.primary,
  },
  sundayText: {
    color: '#EF4444',
  },
  saturdayText: {
    color: '#3B82F6',
  },
  todayButton: {
    marginTop: 8,
    paddingVertical: 8,
    backgroundColor: colors.neutral[2],
    borderRadius: 10,
    alignItems: 'center',
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

export default CalendarModal;
