/**
 * Date Utilities
 */

import { format, formatDistanceToNow, parseISO, isToday, isYesterday, isThisWeek, isThisMonth, isThisYear } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * Parse ISO string to Date
 */
export const parseDate = (dateString: string): Date => {
  return parseISO(dateString);
};

/**
 * Format date for timeline header
 * e.g., "2024년 12월 15일 일요일"
 */
export const formatDateHeader = (dateString: string): string => {
  const date = parseDate(dateString);
  return format(date, 'yyyy년 M월 d일 EEEE', { locale: ko });
};

/**
 * Format date for short display
 * e.g., "12월 15일"
 */
export const formatDateShort = (dateString: string): string => {
  const date = parseDate(dateString);
  return format(date, 'M월 d일', { locale: ko });
};

/**
 * Format date for month header
 * e.g., "2024년 12월"
 */
export const formatMonthHeader = (dateString: string): string => {
  const date = parseDate(dateString);
  return format(date, 'yyyy년 M월', { locale: ko });
};

/**
 * Format time
 * e.g., "14:30"
 */
export const formatTime = (dateString: string): string => {
  const date = parseDate(dateString);
  return format(date, 'HH:mm');
};

/**
 * Format date and time
 * e.g., "2024.12.15 14:30"
 */
export const formatDateTime = (dateString: string): string => {
  const date = parseDate(dateString);
  return format(date, 'yyyy.MM.dd HH:mm');
};

/**
 * Format relative time
 * e.g., "3시간 전", "어제", "2일 전"
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = parseDate(dateString);

  if (isToday(date)) {
    return formatDistanceToNow(date, { addSuffix: true, locale: ko });
  }

  if (isYesterday(date)) {
    return '어제';
  }

  if (isThisWeek(date)) {
    return format(date, 'EEEE', { locale: ko });
  }

  if (isThisMonth(date)) {
    return format(date, 'M월 d일', { locale: ko });
  }

  if (isThisYear(date)) {
    return format(date, 'M월 d일', { locale: ko });
  }

  return format(date, 'yyyy년 M월 d일', { locale: ko });
};

/**
 * Format date for EXIF display
 * e.g., "2024년 12월 15일 일요일 오후 2:30"
 */
export const formatExifDate = (dateString: string): string => {
  const date = parseDate(dateString);
  return format(date, 'yyyy년 M월 d일 EEEE a h:mm', { locale: ko });
};

/**
 * Get year from date string
 */
export const getYear = (dateString: string): number => {
  return parseDate(dateString).getFullYear();
};

/**
 * Get month from date string (1-12)
 */
export const getMonth = (dateString: string): number => {
  return parseDate(dateString).getMonth() + 1;
};

/**
 * Group dates by month
 */
export const groupByMonth = <T extends { date: string }>(
  items: T[]
): Record<string, T[]> => {
  return items.reduce((acc, item) => {
    const monthKey = format(parseDate(item.date), 'yyyy-MM');
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(item);
    return acc;
  }, {} as Record<string, T[]>);
};
