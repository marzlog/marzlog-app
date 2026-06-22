import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { palette, lightTheme, darkTheme } from '@/src/theme/colors';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { getEmotionIcon } from '@/constants/emotions';

// Android requires LayoutAnimation flag
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ViewMode = 'week' | 'month';

// 화살표 아이콘
function ChevronLeft({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M12.5 15L7.5 10L12.5 5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRight({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M7.5 15L12.5 10L7.5 5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronDown({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
      <Path
        d="M5 7.5L10 12.5L15 7.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronUp({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
      <Path
        d="M5 12.5L10 7.5L15 12.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface DateSelectorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  dateEmotions?: Map<string, string>; // 'YYYY-MM-DD' → emotion name
}

export function DateSelector({
  selectedDate,
  onDateSelect,
  dateEmotions = new Map(),
}: DateSelectorProps) {
  const { t, language } = useTranslation();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();

  // 다크모드 결정
  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const theme = isDark ? darkTheme : lightTheme;

  // 동적으로 요일 이름 가져오기
  const DAY_NAMES_SHORT = t('date.weekdaysShort') as unknown as string[];
  const MONTHS = t('date.months') as unknown as string[];
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

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

  // 주간 뷰: monthDays에서 selectedDate가 속한 행만 추출
  const weekRowDays = useMemo(() => {
    // selectedDate 기준 주의 시작(일요일)
    const current = new Date(selectedDate);
    const dayOfWeek = current.getDay();
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - dayOfWeek);

    // selectedDate가 currentMonth와 같은 달인지 확인
    const sameMonth =
      selectedDate.getFullYear() === currentMonth.getFullYear() &&
      selectedDate.getMonth() === currentMonth.getMonth();

    if (sameMonth) {
      // monthDays에서 해당 주의 행 찾기
      const selectedDay = selectedDate.getDate();
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const offsetInGrid = firstDayOfMonth.getDay() + selectedDay - 1; // 0-based index in grid
      const rowStart = Math.floor(offsetInGrid / 7) * 7;
      return monthDays.slice(rowStart, rowStart + 7);
    }

    // 다른 달이면 직접 생성
    const days: (Date | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  }, [selectedDate, currentMonth, monthDays]);

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const getDateEmotion = (date: Date): string | undefined => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return dateEmotions.get(key);
  };

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToPrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateSelect(newDate);
    // 주가 바뀌면 currentMonth도 동기화
    if (newDate.getMonth() !== currentMonth.getMonth() || newDate.getFullYear() !== currentMonth.getFullYear()) {
      setCurrentMonth(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
    }
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateSelect(newDate);
    if (newDate.getMonth() !== currentMonth.getMonth() || newDate.getFullYear() !== currentMonth.getFullYear()) {
      setCurrentMonth(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
    }
  };

  const handleDatePress = (date: Date) => {
    onDateSelect(date);
    if (date.getMonth() !== currentMonth.getMonth() || date.getFullYear() !== currentMonth.getFullYear()) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const toggleViewMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (viewMode === 'week') {
      setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
      setViewMode('month');
    } else {
      setViewMode('week');
    }
  };

  const formatMonthYear = (date: Date = currentMonth) => {
    if (language === 'ko') {
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
    }
    return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  };

  // 날짜 셀 렌더링 (주간/월간 공용)
  const renderDayCell = (date: Date | null, index: number) => (
    <View key={index} style={styles.dayCell}>
      {date && (
        <TouchableOpacity
          style={[
            styles.dayButton,
            isSelected(date) && { backgroundColor: palette.primary[500] },
            isToday(date) && !isSelected(date) && { borderWidth: 1.5, borderColor: palette.primary[500] },
          ]}
          onPress={() => handleDatePress(date)}
        >
          <Text style={[
            styles.dayText,
            { color: theme.text.primary },
            isSelected(date) && { color: palette.neutral[0], fontWeight: '600' },
            isToday(date) && !isSelected(date) && { color: palette.primary[500], fontWeight: '600' },
            index % 7 === 0 && styles.sundayText,
            index % 7 === 6 && styles.saturdayText,
          ]}>
            {date.getDate()}
          </Text>
          {(() => {
            const emo = getDateEmotion(date);
            const emoIcon = emo ? getEmotionIcon(emo, 'color') : null;
            if (emoIcon) {
              return <Image source={emoIcon} style={styles.emotionIcon} />;
            }
            return null;
          })()}
        </TouchableOpacity>
      )}
    </View>
  );

  const isWeek = viewMode === 'week';

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.secondary }]}>
      {/* 공통 헤더: [←] 2026년 2월 [▼/▲] [→] */}
      <View style={styles.nav}>
        <TouchableOpacity
          onPress={isWeek ? goToPrevWeek : goToPrevMonth}
          style={styles.navButton}
        >
          <ChevronLeft color={theme.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.centerButton}
          onPress={toggleViewMode}
          activeOpacity={0.7}
        >
          <Text style={[styles.navText, { color: theme.text.primary }]}>
            {formatMonthYear()}
          </Text>
          {isWeek ? (
            <ChevronDown color={theme.text.primary} />
          ) : (
            <ChevronUp color={theme.text.primary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={isWeek ? goToNextWeek : goToNextMonth}
          style={styles.navButton}
        >
          <ChevronRight color={theme.text.primary} />
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 (공통) */}
      <View style={styles.weekdayRow}>
        {DAY_NAMES_SHORT.map((day, index) => (
          <View key={index} style={styles.weekdayCell}>
            <Text style={[
              styles.weekdayText,
              { color: theme.text.secondary },
              index === 0 && styles.sundayText,
              index === 6 && styles.saturdayText,
            ]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* 날짜 그리드 */}
      <View style={styles.grid}>
        {isWeek
          ? weekRowDays.map((date, index) => renderDayCell(date, index))
          : monthDays.map((date, index) => renderDayCell(date, index))
        }
      </View>

      {/* 오늘 버튼 (월간만) */}
      {!isWeek && (
        <TouchableOpacity
          style={[styles.todayButton, { backgroundColor: theme.background.tertiary }]}
          onPress={() => handleDatePress(today)}
        >
          <Text style={[styles.todayButtonText, { color: theme.text.primary }]}>
            {t('date.today')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
  },
  // Header
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  centerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  navText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Weekday header
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Date grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sundayText: {
    color: palette.error[500],
  },
  saturdayText: {
    color: palette.info[500],
  },
  emotionIcon: {
    position: 'absolute',
    bottom: 2,
    width: 14,
    height: 14,
  },
  // Today button
  todayButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DateSelector;
