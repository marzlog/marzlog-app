import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Modal,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { palette, lightTheme, darkTheme } from '@/src/theme/colors';
import { ScheduleCard, DateSelector } from '@/src/components/home';
import { Logo } from '@/src/components/common/Logo';
import timelineApi, { TimelineItem } from '@/src/api/timeline';
import { useAuthStore } from '@/src/store/authStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTimelineStore } from '@/src/store/timelineStore';
import { useImageUpload } from '@/src/hooks/useImageUpload';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useColorScheme } from '@/components/useColorScheme';
import { useDialog } from '@/src/components/ui/Dialog';
import notificationsApi from '@/src/api/notifications';

const { width } = Dimensions.get('window');

// Figma 기반 아이콘들
function SearchIcon({ color = palette.neutral[900] }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusIcon({ color = palette.neutral[900] }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5V19M5 12H19"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BellIcon({ color = palette.neutral[900] }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ImageIcon({ color = palette.neutral[500] }: { color?: string }) {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
      <Path
        d="M38 6H10C7.79086 6 6 7.79086 6 10V38C6 40.2091 7.79086 42 10 42H38C40.2091 42 42 40.2091 42 38V10C42 7.79086 40.2091 6 38 6Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 20C18.6569 20 20 18.6569 20 17C20 15.3431 18.6569 14 17 14C15.3431 14 14 15.3431 14 17C14 18.6569 15.3431 20 17 20Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M42 30L32 20L10 42"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Grid2X2 아이콘 (Lucide)
function GridIcon({ color = palette.neutral[500] }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 3H3V10H10V3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 3H14V10H21V3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 14H14V21H21V14Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 14H3V21H10V14Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// LayoutList 아이콘 (Lucide)
function ListIcon({ color = palette.neutral[500] }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 8H10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 12H10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 16H10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 8H3V4H7V8Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 20H3V16H7V20Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 시간 포맷
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? '오후' : '오전';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}시 ${minutes.toString().padStart(2, '0')}분 (${period})`;
};

// 날짜 비교 함수 (시간 무시, 날짜만 비교)
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// 날짜를 YYYY-MM-DD 형식으로 변환
const formatDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

interface ScheduleItem {
  id: string;
  title: string;
  location?: string;
  time: string;
  imageUrl: string;
  mediaId: string;
  groupId?: string;
  groupCount?: number;
  emotion?: string | null;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();
  const systemColorScheme = useColorScheme();
  const { alert: showAlert } = useDialog();

  // Timeline store - 선택된 날짜 유지
  const {
    getSelectedDate,
    setSelectedDate: setStoreSelectedDate,
    restoreFromLastViewed,
  } = useTimelineStore();

  // 다크모드 결정: themeMode가 'system'이면 시스템 설정, 아니면 직접 설정값 사용
  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const theme = isDark ? darkTheme : lightTheme;

  // 스토어에서 초기값 가져오기
  const [selectedDate, setSelectedDateLocal] = useState(() => getSelectedDate());
  const [refreshing, setRefreshing] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [allItems, setAllItems] = useState<TimelineItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [unreadCount, setUnreadCount] = useState(0);

  // Upload hook
  const {
    isUploading,
    pickFromGallery,
    takePhoto,
  } = useImageUpload();

  // 날짜별 대표 감정 매핑 (첫 번째 그룹의 감정)
  const dateEmotions = useMemo(() => {
    const map = new Map<string, string>();
    allItems.forEach((item) => {
      const emotion = item.media?.emotion;
      if (!emotion) return;
      // group_dates는 서버에서 KST 기준 'YYYY-MM-DD' 형식으로 반환
      const groupDates = item.media?.group_dates;
      if (groupDates && groupDates.length > 0) {
        groupDates.forEach((dateStr) => {
          if (dateStr) {
            // 이미 YYYY-MM-DD 형식이므로 직접 사용
            const key = dateStr.substring(0, 10);
            if (!map.has(key)) map.set(key, emotion);
          }
        });
      } else {
        const takenAt = new Date(item.media?.taken_at || item.created_at);
        const key = formatDateKey(takenAt);
        if (!map.has(key)) map.set(key, emotion);
      }
    });
    return map;
  }, [allItems]);

  const PAGE_SIZE = 20;

  // 전체 타임라인 로드 (초기 20개 + 자동 추가 로드)
  const loadAllItems = useCallback(async () => {
    console.log('[Home] loadAllItems called, accessToken:', accessToken ? 'EXISTS' : 'MISSING');

    if (!accessToken) {
      console.log('[Home] No accessToken, skipping API call');
      setLoading(false);
      return;
    }

    try {
      console.log('[Home] Calling timelineApi.getTimeline with limit=', PAGE_SIZE);
      const response = await timelineApi.getTimeline(PAGE_SIZE, 0, false);
      console.log('[Home] API Response - total:', response.total, 'items:', response.items.length);
      setAllItems(response.items);
      setHasMore(response.has_more);

      // 추가 페이지가 있으면 백그라운드로 나머지 로드
      if (response.has_more) {
        loadRemainingItems(response.items.length, response.total);
      }
    } catch (err) {
      console.error('[Home] Failed to load all items:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // 나머지 아이템 백그라운드 로드 (캘린더 점 표시용)
  const loadRemainingItems = useCallback(async (loaded: number, total: number) => {
    try {
      const remaining = await timelineApi.getTimeline(total - loaded, loaded, false);
      console.log('[Home] Background loaded', remaining.items.length, 'more items');
      setAllItems(prev => [...prev, ...remaining.items]);
      setHasMore(false);
    } catch (err) {
      console.error('[Home] Failed to load remaining items:', err);
    }
  }, []);

  // accessToken 변경 감지
  useEffect(() => {
    console.log('[Home] accessToken changed:', accessToken ? 'EXISTS' : 'MISSING');
  }, [accessToken]);

  // 선택된 날짜의 타임라인 필터링 (group_dates 기준 - 그룹 내 아무 이미지라도 해당 날짜면 표시)
  useEffect(() => {
    console.log('[Home] Filtering - selectedDate:', formatDateKey(selectedDate));
    console.log('[Home] Filtering - allItems count:', allItems.length);

    const selectedDateStr = formatDateKey(selectedDate);

    const filtered = allItems.filter((item) => {
      // group_dates는 서버에서 KST 기준 'YYYY-MM-DD' 형식으로 반환
      const groupDates = item.media?.group_dates;
      if (groupDates && groupDates.length > 0) {
        const isMatch = groupDates.some((dateStr) => {
          if (!dateStr) return false;
          return dateStr.substring(0, 10) === selectedDateStr;
        });
        return isMatch;
      }

      // fallback: taken_at 또는 created_at
      const takenAt = new Date(item.media?.taken_at || item.created_at);
      return isSameDay(takenAt, selectedDate);
    });

    console.log('[Home] Filtered count:', filtered.length);

    const mapped: ScheduleItem[] = filtered.map((item) => ({
      id: item.id,
      title: item.title || item.caption || t('common.noTitle'),
      location: undefined,
      time: formatTime(item.media?.taken_at || item.created_at),
      imageUrl: item.media?.thumbnail_url || item.media?.download_url || '',
      mediaId: item.media_id,
      groupId: item.media?.group_id || undefined,
      groupCount: item.media?.group_count || undefined,
      emotion: item.media?.emotion || null,
    }));

    setSchedules(mapped);
    setLoading(false);
  }, [selectedDate, allItems]);

  // 초기 로드
  useEffect(() => {
    console.log('[Home] Initial load useEffect triggered');
    loadAllItems();
  }, [loadAllItems]);

  // 선택된 날짜 변경 시 스토어에도 동기화
  const setSelectedDate = useCallback((date: Date) => {
    setSelectedDateLocal(date);
    setStoreSelectedDate(date);
  }, [setStoreSelectedDate]);

  // 화면 포커스 시 데이터 갱신 (상세에서 돌아올 때 새 데이터 반영)
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      // 첫 포커스는 초기 로드에서 처리하므로 스킵
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      console.log('[Home] Screen focused - refreshing data');

      // 상세보기에서 돌아올 때 lastViewedDate로 복원
      const restoredDate = restoreFromLastViewed();
      if (restoredDate) {
        console.log('[Home] Restored date from lastViewed:', restoredDate);
        setSelectedDateLocal(restoredDate);
      }

      loadAllItems();
    }, [loadAllItems, restoreFromLastViewed])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllItems();
    setRefreshing(false);
  }, [loadAllItems]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  // 검색 화면으로 이동
  const handleSearchPress = () => {
    router.push('/search');
  };

  // 업로드 모달 열기
  const handleAddPress = () => {
    setShowUploadModal(true);
  };

  // 알림
  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  // 읽지 않은 알림 수 조회
  useEffect(() => {
    if (!accessToken) return;
    notificationsApi.getUnreadCount()
      .then(data => setUnreadCount(data.count))
      .catch(() => {});
  }, [accessToken]);

  // 지원하는 이미지 형식
  const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

  // 이미지 형식 검증
  const isImageSupported = (mimeType?: string, uri?: string): boolean => {
    if (mimeType && SUPPORTED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      return true;
    }
    if (uri) {
      const extension = uri.split('.').pop()?.toLowerCase() || '';
      if (SUPPORTED_EXTENSIONS.includes(extension)) {
        return true;
      }
    }
    return false;
  };

  // 갤러리에서 선택 후 업로드 화면으로 이동
  const handlePickFromGallery = async () => {
    setShowUploadModal(false);
    try {
      console.log('[Gallery] Starting picker...');
      const pickedItems = await pickFromGallery(true);
      console.log('[Gallery] Picked items:', pickedItems);

      if (pickedItems && pickedItems.length > 0) {
        // 지원하는 형식만 필터링
        const validItems: typeof pickedItems = [];
        const invalidFiles: string[] = [];

        pickedItems.forEach(item => {
          if (isImageSupported(item.mimeType, item.uri)) {
            validItems.push(item);
          } else {
            invalidFiles.push(item.filename || item.uri.split('/').pop() || 'unknown');
          }
        });

        // 지원하지 않는 형식 경고
        if (invalidFiles.length > 0) {
          showAlert(`지원하지 않는 형식이 제외되었습니다:\n${invalidFiles.join(', ')}\n\nJPG, PNG, WebP, HEIC만 업로드 가능합니다.`);
        }

        // 유효한 이미지가 있으면 업로드 화면으로 이동
        if (validItems.length > 0) {
          const dateIso = selectedDate.toISOString();
          console.log('=== Home → Upload Navigation ===');
          console.log('selectedDate:', selectedDate);
          console.log('selectedDate.toISOString():', dateIso);
          console.log('[Gallery] Navigating to /upload with', validItems.length, 'valid images');
          router.push({
            pathname: '/upload',
            params: {
              images: JSON.stringify(validItems),
              selectedDate: dateIso,  // 캘린더 선택 날짜 전달
            },
          });
        } else if (invalidFiles.length > 0) {
          console.log('[Gallery] No valid images after filtering');
        }
      } else {
        console.log('[Gallery] No items selected or picker cancelled');
      }
    } catch (error) {
      console.error('[Gallery] Error:', error);
      showAlert('이미지를 선택하는 중 오류가 발생했습니다.');
    }
  };

  // 카메라로 촬영 후 업로드 화면으로 이동
  const handleTakePhoto = async () => {
    setShowUploadModal(false);
    const takenItem = await takePhoto();
    if (takenItem) {
      router.push({
        pathname: '/upload',
        params: {
          images: JSON.stringify([takenItem]),
          selectedDate: selectedDate.toISOString(),  // 캘린더 선택 날짜 전달
        },
      });
    }
  };

  // 사진 상세 화면으로 이동
  const handlePhotoPress = (mediaId: string) => {
    router.push(`/media/${mediaId}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background.primary} />

      {/* Header (Figma 기반) */}
      <View style={[styles.header, { backgroundColor: theme.background.primary }]}>
        <View style={styles.headerLeft}>
          <Logo size={32} showText={false} color={theme.text.primary} />
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Marzlog</Text>
        </View>

        <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton} onPress={handleSearchPress}>
              <SearchIcon color={theme.icon.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleAddPress}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color={theme.icon.primary} />
              ) : (
                <PlusIcon color={theme.icon.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleNotificationPress}>
              <BellIcon color={theme.icon.primary} />
              {unreadCount > 0 && <View style={styles.bellBadge} />}
            </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.primary[500]}
          />
        }
      >
        {/* Date Selector (주/월 토글) */}
        <View style={styles.dateSelectorContainer}>
          <DateSelector
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            dateEmotions={dateEmotions}
          />
        </View>

        {/* Filter Bar */}
        <View style={styles.filterBar}>
          {/* 총 건수 */}
          <Text style={[styles.totalCount, { color: theme.text.secondary }]}>
            총 {schedules.length}건
          </Text>

          {/* 뷰 모드 토글 */}
          <View style={styles.viewModeContainer}>
            <TouchableOpacity
              style={styles.viewModeButton}
              onPress={() => setViewMode('grid')}
            >
              <GridIcon color={viewMode === 'grid' ? (isDark ? palette.neutral[0] : '#252525') : (isDark ? palette.neutral[500] : '#A3A3A3')} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.viewModeButton}
              onPress={() => setViewMode('list')}
            >
              <ListIcon color={viewMode === 'list' ? (isDark ? palette.neutral[0] : '#252525') : (isDark ? palette.neutral[500] : '#A3A3A3')} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Schedule Cards */}
        <View style={viewMode === 'grid' ? styles.schedulesContainerGrid : styles.schedulesContainer}>
          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={palette.primary[500]} />
              <Text style={[styles.loadingText, { color: theme.text.secondary }]}>{t('common.loading')}</Text>
            </View>
          ) : schedules.length === 0 ? (
            <View style={styles.emptyState}>
              <ImageIcon color={theme.icon.secondary} />
              <Text style={[styles.emptyText, { color: theme.text.secondary }]}>{t('home.noPhotosToday')}</Text>
              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: palette.primary[500] }]}
                onPress={handleAddPress}
              >
                <PlusIcon color={palette.neutral[0]} />
                <Text style={[styles.uploadButtonText, { color: palette.neutral[0] }]}>{t('home.addPhotos')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            schedules.map((schedule) => (
              <View key={schedule.id} style={viewMode === 'grid' ? styles.gridCardWrapper : undefined}>
                <ScheduleCard
                  id={schedule.id}
                  title={schedule.title}
                  location={schedule.location}
                  time={schedule.time}
                  imageUrl={schedule.imageUrl}
                  groupCount={schedule.groupCount}
                  emotion={schedule.emotion}
                  onPress={() => handlePhotoPress(schedule.mediaId)}
                  theme={theme}
                  size={viewMode === 'grid' ? 'compact' : 'large'}
                />
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          activeOpacity={1}
          onPress={() => setShowUploadModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface.primary }]}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>{t('upload.title')}</Text>

            <TouchableOpacity style={[styles.modalOption, { borderBottomColor: theme.border.light }]} onPress={handlePickFromGallery}>
              <ImageIcon color={palette.primary[500]} />
              <Text style={[styles.modalOptionText, { color: theme.text.primary }]}>{t('upload.fromGallery')}</Text>
            </TouchableOpacity>

            {Platform.OS !== 'web' && (
              <TouchableOpacity style={[styles.modalOption, { borderBottomColor: theme.border.light }]} onPress={handleTakePhoto}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
                    stroke={palette.primary[500]}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z"
                    stroke={palette.primary[500]}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={[styles.modalOptionText, { color: theme.text.primary }]}>{t('upload.takePhoto')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowUploadModal(false)}
            >
              <Text style={[styles.modalCancelText, { color: theme.text.secondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '300',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
    borderRadius: 20,
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6A5F',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingBottom: 120,
    gap: 16,
  },
  dateSelectorContainer: {
    paddingTop: 4,
  },
  schedulesContainer: {
    flex: 1,
    gap: 12,
  },
  schedulesContainerGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridCardWrapper: {
    width: (width - 24 - 8) / 2,  // paddingHorizontal 12*2 + gap 8
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  viewModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewModeButton: {
    padding: 6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '400',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 360,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalCancel: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
