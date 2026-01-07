import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useColorScheme } from '@/components/useColorScheme';

const { width } = Dimensions.get('window');
const DAY_SIZE = (width - 48) / 7;

type ViewMode = 'week' | 'month';

interface DateSelectorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  datesWithPhotos?: Set<string>; // 'YYYY-MM-DD' format
}

export function DateSelector({
  selectedDate,
  onDateSelect,
  datesWithPhotos = new Set(),
}: DateSelectorProps) {
  const { t, language } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // 동적으로 요일 이름 가져오기
  const DAY_NAMES_SHORT = t('date.weekdaysShort') as unknown as string[];
  const DAY_NAMES_EN = t('date.weekdaysEn') as unknown as string[];
  const MONTHS = t('date.months') as unknown as string[];
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // 주간 날짜 생성
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const current = new Date(selectedDate);
    const dayOfWeek = current.getDay();
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  }, [selectedDate]);

  // 월간 날짜 생성
  const monthDays = useMemo(() => {
    const days: (Date | null)[] = [];
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    // 이전 달 빈 칸
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // 현재 달 날짜
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }

    return days;
  }, [currentMonth]);

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const hasPhotos = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return datesWithPhotos.has(dateStr);
  };

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDatePress = (date: Date) => {
    onDateSelect(date);
    if (viewMode === 'month') {
      setCurrentMonth(date);
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'week' ? 'month' : 'week');
    if (viewMode === 'week') {
      setCurrentMonth(selectedDate);
    }
  };

  const formatMonthYear = (date: Date = currentMonth) => {
    if (language === 'ko') {
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
    }
    return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  };

  // 주간 뷰 렌더링
  const renderWeekView = () => (
    <View style={styles.weekContainer}>
      {weekDays.map((date, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.weekDayItem,
            isDark && styles.weekDayItemDark,
            isSelected(date) && styles.weekDayItemSelected,
          ]}
          onPress={() => handleDatePress(date)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.weekDayName,
              isDark && styles.textLight,
              isSelected(date) && styles.weekDayNameSelected,
            ]}
          >
            {DAY_NAMES_EN[date.getDay()]}
          </Text>
          <Text
            style={[
              styles.weekDayNumber,
              isDark && styles.textLight,
              isSelected(date) && styles.weekDayNumberSelected,
            ]}
          >
            {date.getDate()}
          </Text>
          {hasPhotos(date) && (
            <View style={[
              styles.photoIndicator,
              isSelected(date) && styles.photoIndicatorSelected,
            ]} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  // 월간 뷰 렌더링
  const renderMonthView = () => (
    <View style={[styles.monthContainer, isDark && styles.monthContainerDark]}>
      {/* 월 네비게이션 */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.monthNavButton}>
          <Ionicons name="chevron-back" size={20} color={isDark ? '#F9FAFB' : colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.monthNavText, isDark && styles.textLight]}>{formatMonthYear()}</Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavButton}>
          <Ionicons name="chevron-forward" size={20} color={isDark ? '#F9FAFB' : colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 */}
      <View style={styles.monthWeekdayRow}>
        {DAY_NAMES_SHORT.map((day, index) => (
          <View key={index} style={styles.monthWeekdayCell}>
            <Text style={[
              styles.monthWeekdayText,
              index === 0 && styles.sundayText,
              index === 6 && styles.saturdayText,
            ]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* 날짜 그리드 */}
      <View style={styles.monthGrid}>
        {monthDays.map((date, index) => (
          <View key={index} style={styles.monthDayCell}>
            {date && (
              <TouchableOpacity
                style={[
                  styles.monthDayButton,
                  isSelected(date) && styles.monthDayButtonSelected,
                  isToday(date) && !isSelected(date) && styles.monthDayButtonToday,
                ]}
                onPress={() => handleDatePress(date)}
              >
                <Text style={[
                  styles.monthDayText,
                  isDark && styles.textLight,
                  isSelected(date) && styles.monthDayTextSelected,
                  isToday(date) && !isSelected(date) && styles.todayText,
                  index % 7 === 0 && styles.sundayText,
                  index % 7 === 6 && styles.saturdayText,
                ]}>
                  {date.getDate()}
                </Text>
                {hasPhotos(date) && (
                  <View style={[
                    styles.monthPhotoIndicator,
                    isSelected(date) && styles.monthPhotoIndicatorSelected,
                  ]} />
                )}
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* 오늘 버튼 */}
      <TouchableOpacity
        style={[styles.todayButton, isDark && styles.todayButtonDark]}
        onPress={() => handleDatePress(today)}
      >
        <Text style={[styles.todayButtonText, isDark && styles.textLight]}>{t('date.today')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* 헤더: 월/년 + 토글 버튼 */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, isDark && styles.textLight]}>
          {viewMode === 'week'
            ? formatMonthYear(selectedDate)
            : formatMonthYear()
          }
        </Text>
        <TouchableOpacity style={[styles.toggleButton, isDark && styles.toggleButtonDark]} onPress={toggleViewMode}>
          <Ionicons
            name={viewMode === 'week' ? 'calendar-outline' : 'calendar-number-outline'}
            size={20}
            color={isDark ? '#F9FAFB' : colors.text.primary}
          />
        </TouchableOpacity>
      </View>

      {/* 날짜 뷰 */}
      {viewMode === 'week' ? renderWeekView() : renderMonthView()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  textLight: {
    color: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  toggleButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[2],
    borderRadius: 20,
  },
  toggleButtonDark: {
    backgroundColor: '#374151',
  },
  // Week View
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  weekDayItem: {
    width: 46,
    height: 70,
    borderRadius: 16,
    backgroundColor: colors.neutral['0.5'],
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    gap: 2,
  },
  weekDayItemDark: {
    backgroundColor: '#1F2937',
  },
  weekDayItemSelected: {
    backgroundColor: colors.brand.primary,
  },
  weekDayName: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
  weekDayNameSelected: {
    color: colors.text.inverse,
  },
  weekDayNumber: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  weekDayNumberSelected: {
    color: colors.text.inverse,
  },
  photoIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand.primary,
    marginTop: 2,
  },
  photoIndicatorSelected: {
    backgroundColor: colors.text.inverse,
  },
  // Month View
  monthContainer: {
    backgroundColor: colors.neutral['0.5'],
    borderRadius: 20,
    padding: 16,
    marginTop: 4,
  },
  monthContainerDark: {
    backgroundColor: '#1F2937',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthNavButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  monthNavText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  monthWeekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  monthWeekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  monthWeekdayText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthDayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  monthDayButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  monthDayButtonSelected: {
    backgroundColor: colors.brand.primary,
  },
  monthDayButtonToday: {
    borderWidth: 1.5,
    borderColor: colors.brand.primary,
  },
  monthDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  monthDayTextSelected: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  todayText: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  sundayText: {
    color: '#EF4444',
  },
  saturdayText: {
    color: '#3B82F6',
  },
  monthPhotoIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand.primary,
  },
  monthPhotoIndicatorSelected: {
    backgroundColor: colors.text.inverse,
  },
  todayButton: {
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: colors.neutral[2],
    borderRadius: 12,
    alignItems: 'center',
  },
  todayButtonDark: {
    backgroundColor: '#374151',
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

export default DateSelector;
