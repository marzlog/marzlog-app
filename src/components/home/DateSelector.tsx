import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import { palette, lightTheme, darkTheme } from '@/src/theme/colors';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { getEmotionIcon } from '@/constants/emotions';

const { width } = Dimensions.get('window');

// Figma 기반: 7개 날짜, 각 50px 너비, 8px 간격
const DATE_CARD_WIDTH = 46;
const DATE_CARD_HEIGHT = 61;

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

// 캘린더 아이콘 (월간 뷰 전환용) - 주간 뷰에서 표시
function CalendarViewIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={2} />
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={2} />
      <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// 그리드 아이콘 (주간 뷰 전환용) - 월간 뷰에서 표시
function GridViewIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="8" height="8" rx="1" stroke={color} strokeWidth={2} />
      <Rect x="13" y="3" width="8" height="8" rx="1" stroke={color} strokeWidth={2} />
      <Rect x="3" y="13" width="8" height="8" rx="1" stroke={color} strokeWidth={2} />
      <Rect x="13" y="13" width="8" height="8" rx="1" stroke={color} strokeWidth={2} />
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
  const DAY_NAMES_EN = t('date.weekdaysEn') as unknown as string[];
  const MONTHS = t('date.months') as unknown as string[];
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  // 주차 계산
  const getWeekOfMonth = (date: Date): number => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    return Math.ceil((date.getDate() + firstDay.getDay()) / 7);
  };

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

  const getDateEmotion = (date: Date): string | undefined => {
    // formatDateKey와 동일하게 로컬 타임존(KST) 기준으로 키 생성
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return dateEmotions.get(key);
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

  // 이전 주로 이동
  const goToPrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateSelect(newDate);
  };

  // 다음 주로 이동
  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateSelect(newDate);
  };

  // 주간 네비게이션 텍스트 (예: "11월 2주")
  const getWeekNavText = () => {
    const month = selectedDate.getMonth() + 1;
    const week = getWeekOfMonth(selectedDate);
    if (language === 'ko') {
      return `${month}월 ${week}주`;
    }
    return `${MONTHS[selectedDate.getMonth()]} Week ${week}`;
  };

  // 주간 뷰 렌더링 (Figma 디자인 적용)
  const renderWeekView = () => (
    <View style={styles.weekViewContainer}>
      {/* 주간 날짜 카드 */}
      <View style={styles.weekContainer}>
        {weekDays.map((date, index) => {
          const selected = isSelected(date);
          const emotion = getDateEmotion(date);
          const emotionIcon = emotion ? getEmotionIcon(emotion, 'color') : null;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.weekDayItem,
                { backgroundColor: selected ? palette.primary[500] : theme.surface.secondary },
              ]}
              onPress={() => handleDatePress(date)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.weekDayName,
                  { color: selected ? palette.neutral[0] : theme.text.primary },
                ]}
              >
                {DAY_NAMES_EN[date.getDay()]}
              </Text>
              <Text
                style={[
                  styles.weekDayNumber,
                  { color: selected ? palette.neutral[0] : theme.text.primary },
                ]}
              >
                {date.getDate()}
              </Text>
              {emotionIcon ? (
                <Image source={emotionIcon} style={styles.weekEmotionIcon} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // 월간 뷰 렌더링
  const renderMonthView = () => (
    <View style={[styles.monthContainer, { backgroundColor: theme.surface.secondary }]}>
      {/* 월 네비게이션: [←] [2025년 1월 ⊞] [→] */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.monthNavButton}>
          <ChevronLeft color={theme.text.primary} />
        </TouchableOpacity>
        {/* 중앙: 월 텍스트 + 그리드 아이콘 (주간 뷰 전환) */}
        <TouchableOpacity
          style={styles.monthCenterButton}
          onPress={toggleViewMode}
          activeOpacity={0.7}
        >
          <Text style={[styles.monthNavText, { color: theme.text.primary }]}>{formatMonthYear()}</Text>
          <GridViewIcon color={theme.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavButton}>
          <ChevronRight color={theme.text.primary} />
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 */}
      <View style={styles.monthWeekdayRow}>
        {DAY_NAMES_SHORT.map((day, index) => (
          <View key={index} style={styles.monthWeekdayCell}>
            <Text style={[
              styles.monthWeekdayText,
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
      <View style={styles.monthGrid}>
        {monthDays.map((date, index) => (
          <View key={index} style={styles.monthDayCell}>
            {date && (
              <TouchableOpacity
                style={[
                  styles.monthDayButton,
                  isSelected(date) && { backgroundColor: palette.primary[500] },
                  isToday(date) && !isSelected(date) && { borderWidth: 1.5, borderColor: palette.primary[500] },
                ]}
                onPress={() => handleDatePress(date)}
              >
                <Text style={[
                  styles.monthDayText,
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
                    return <Image source={emoIcon} style={styles.monthEmotionIcon} />;
                  }
                  return null;
                })()}
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* 오늘 버튼 */}
      <TouchableOpacity
        style={[styles.todayButton, { backgroundColor: theme.background.tertiary }]}
        onPress={() => handleDatePress(today)}
      >
        <Text style={[styles.todayButtonText, { color: theme.text.primary }]}>{t('date.today')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      {/* 헤더: 주간 뷰에서만 표시 */}
      {viewMode === 'week' && (
        <View style={styles.header}>
          {/* 이전 주 버튼 */}
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: theme.surface.secondary }]}
            onPress={goToPrevWeek}
          >
            <ChevronLeft color={theme.text.primary} />
          </TouchableOpacity>

          {/* 중앙: 주간 정보 + 캘린더 아이콘 (월간 뷰로 전환) */}
          <TouchableOpacity
            style={[styles.centerButton, { backgroundColor: theme.surface.secondary }]}
            onPress={toggleViewMode}
          >
            <Text style={[styles.centerButtonText, { color: theme.text.primary }]}>
              {getWeekNavText()}
            </Text>
            <CalendarViewIcon color={theme.text.primary} />
          </TouchableOpacity>

          {/* 다음 주 버튼 */}
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: theme.surface.secondary }]}
            onPress={goToNextWeek}
          >
            <ChevronRight color={theme.text.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* 날짜 뷰 */}
      {viewMode === 'week' ? renderWeekView() : renderMonthView()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  // Header (Figma Date Navigation)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingVertical: 12,
    gap: 8,
  },
  navButton: {
    width: 72,
    height: 40,
    borderRadius: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    flex: 1,
    height: 40,
    borderRadius: 360,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  centerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  // Week View (Figma 기반)
  weekViewContainer: {
    gap: 12,
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  weekDayItem: {
    flex: 1,
    height: DATE_CARD_HEIGHT,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    gap: 4,
  },
  weekDayName: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 15,
  },
  weekDayNumber: {
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: -0.96,
    lineHeight: 34,
  },
  weekEmotionIcon: {
    width: 16,
    height: 16,
  },
  // Month View
  monthContainer: {
    borderRadius: 20,
    padding: 16,
    marginTop: 8,
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
  monthCenterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  monthNavText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
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
  monthDayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sundayText: {
    color: palette.error[500],
  },
  saturdayText: {
    color: palette.info[500],
  },
  monthEmotionIcon: {
    position: 'absolute',
    bottom: 2,
    width: 14,
    height: 14,
  },
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
