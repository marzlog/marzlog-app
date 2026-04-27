import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import timelineApi, { TimelineItem } from '@/src/api/timeline';
import { patchBookmark } from '@/src/api/media';
import { palette, lightTheme, darkTheme, Theme } from '@/src/theme/colors';
import { useAuthStore } from '@/src/store/authStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useImageUpload } from '@/src/hooks/useImageUpload';
import { useTranslation } from '@/src/hooks/useTranslation';
import { getLocalizedTitle } from '@/src/utils/i18n';
import { useMediaUpdatesStore } from '@/src/store/mediaUpdatesStore';
import { useDialog } from '@/src/components/ui/Dialog';
import { Logo } from '@/src/components/common/Logo';
import { captureError } from '@/src/utils/sentry';
import { ScheduleCard } from '@/src/components/home';
import notificationsApi from '@/src/api/notifications';
import announcementsApi from '@/src/api/announcements';
import { getErrorMessage } from '@/src/utils/errorMessages';
import ErrorView from '@/src/components/common/ErrorView';

// 다크 그린 색상
const DARK_GREEN = '#2D3A35';

// Figma 기반 아이콘들
function BookOpenIcon({ color = palette.neutral[900] }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 3H8C9.06087 3 10.0783 3.42143 10.8284 4.17157C11.5786 4.92172 12 5.93913 12 7V21C12 20.2044 11.6839 19.4413 11.1213 18.8787C10.5587 18.3161 9.79565 18 9 18H2V3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 3H16C14.9391 3 13.9217 3.42143 13.1716 4.17157C12.4214 4.92172 12 5.93913 12 7V21C12 20.2044 12.3161 19.4413 12.8787 18.8787C13.4413 18.3161 14.2044 18 15 18H22V3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

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

function GridIcon({ color = palette.neutral[900] }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={2} />
      <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={2} />
      <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={2} />
      <Rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function ListIcon({ color = palette.neutral[900] }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M8 6H21" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M8 12H21" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M8 18H21" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 6H3.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 12H3.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 18H3.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function BookmarkIcon({ color = palette.neutral[0], filled = false }: { color?: string; filled?: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <Path
        d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z"
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

function CameraIcon({ color = palette.primary[500] }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 시간 포맷 함수
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

type TabFilter = 'image' | 'text';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 40) / 2; // 2열 그리드
const PAGE_SIZE = 30;

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface DateGroup {
  date: string;
  items: TimelineItem[];
}

export default function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const { t, language } = useTranslation();
  const { alert: showAlert } = useDialog();

  // 다크모드 결정: themeMode가 'system'이면 시스템 설정, 아니면 직접 설정값 사용
  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const theme: Theme = isDark ? darkTheme : lightTheme;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('image');
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | '3month' | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [unreadAnnCount, setUnreadAnnCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const allItemsRef = useRef<TimelineItem[]>([]);
  const offsetRef = useRef(0);
  const loadingRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  // Upload hook
  const {
    items: uploadItems,
    isUploading,
    stats: uploadStats,
    pickFromGallery,
    takePhoto,
    startUpload,
    removeItem,
    reset: resetUpload,
  } = useImageUpload();

  const loadTimeline = useCallback(async (showLoading = true) => {
    // 토큰이 없으면 API 호출하지 않음
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      if (showLoading) {
        loadingRef.current = true;
        setLoading(true);
      }
      setError(null);
      offsetRef.current = 0;
      allItemsRef.current = [];
      loadingMoreRef.current = false;
      hasMoreRef.current = true;

      const response = await timelineApi.getTimeline(PAGE_SIZE, 0);
      setTotal(response.total);
      allItemsRef.current = response.items;
      offsetRef.current = response.items.length;
      setLoadedCount(response.items.length);
      hasMoreRef.current = response.items.length < response.total;
      setHasMore(hasMoreRef.current);

      const groups = groupByDate(response.items);
      setDateGroups(groups);
    } catch (err: any) {
      captureError(err instanceof Error ? err : new Error(String(err)), { context: 'Timeline.load' });
      setError(getErrorMessage(err));
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  // B-1: 분석 중(queued/running) 아이템이 하나라도 있으면 10초 간격 폴링.
  // 모두 done/failed로 전이하면 즉시 중단. push 채널이 없어 폴링만 가능.
  const hasPendingAnalysis = useMemo(
    () => dateGroups.some((g) =>
      g.items.some(
        (it) => it.analysis_status === 'queued' || it.analysis_status === 'running',
      ),
    ),
    [dateGroups],
  );
  useEffect(() => {
    if (!hasPendingAnalysis) return;
    const id = setInterval(() => {
      loadTimeline(false);
    }, 10000);
    return () => clearInterval(id);
  }, [hasPendingAnalysis, loadTimeline]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current) return;

    try {
      loadingMoreRef.current = true;
      setLoadingMore(true);
      const response = await timelineApi.getTimeline(PAGE_SIZE, offsetRef.current);

      if (response.items.length > 0) {
        allItemsRef.current = [...allItemsRef.current, ...response.items];
        offsetRef.current += response.items.length;
        setLoadedCount(allItemsRef.current.length);
        hasMoreRef.current = allItemsRef.current.length < response.total;
        setHasMore(hasMoreRef.current);

        const groups = groupByDate(allItemsRef.current);
        setDateGroups(groups);
      } else {
        hasMoreRef.current = false;
        setHasMore(false);
      }
    } catch (err: any) {
      captureError(err instanceof Error ? err : new Error(String(err)), { context: 'Timeline.loadMore' });
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  // 미디어 emotion 변경 broadcast 구독 → allItemsRef + dateGroups in-place patch
  const lastEmotionUpdate = useMediaUpdatesStore(s => s.lastEmotionUpdate);
  useEffect(() => {
    if (!lastEmotionUpdate) return;
    const patchItem = (item: TimelineItem): TimelineItem => {
      if (item.media?.id === lastEmotionUpdate.mediaId) {
        return {
          ...item,
          media: { ...item.media, emotion: lastEmotionUpdate.emotion },
        };
      }
      return item;
    };
    allItemsRef.current = allItemsRef.current.map(patchItem);
    setDateGroups(prev => prev.map(group => ({
      ...group,
      items: group.items.map(patchItem),
    })));
  }, [lastEmotionUpdate]);

  // 북마크 변경 broadcast 구독 → in-place patch
  const lastBookmarkUpdate = useMediaUpdatesStore(s => s.lastBookmarkUpdate);
  useEffect(() => {
    if (!lastBookmarkUpdate) return;
    const patchItem = (item: TimelineItem): TimelineItem => {
      if (item.media?.id === lastBookmarkUpdate.mediaId) {
        return {
          ...item,
          media: { ...item.media, is_bookmarked: lastBookmarkUpdate.isBookmarked },
        };
      }
      return item;
    };
    allItemsRef.current = allItemsRef.current.map(patchItem);
    setDateGroups(prev => prev.map(group => ({
      ...group,
      items: group.items.map(patchItem),
    })));
  }, [lastBookmarkUpdate]);

  // 북마크 토글 핸들러 (텍스트 카드의 북마크 아이콘 클릭)
  const handleBookmarkToggle = useCallback(async (mediaId: string, currentValue: boolean) => {
    const next = !currentValue;
    // 즉시 UI 반영 (낙관적 업데이트)
    useMediaUpdatesStore.getState().setBookmarkUpdate(mediaId, next);
    try {
      await patchBookmark(mediaId, next);
    } catch {
      // 실패 시 롤백
      useMediaUpdatesStore.getState().setBookmarkUpdate(mediaId, currentValue);
    }
  }, []);

  const groupByDate = (items: TimelineItem[]): DateGroup[] => {
    const grouped: Record<string, TimelineItem[]> = {};
    items.forEach((item) => {
      // taken_at (촬영일/선택일) 기준으로 그룹핑 - 없으면 created_at 사용
      const date = new Date(item.media?.taken_at || item.created_at);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(item);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({ date, items }));
  };

  // 시간 필터 적용 cutoff 날짜
  const cutoffDate = React.useMemo(() => {
    const now = new Date();
    if (timeFilter === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (timeFilter === 'month') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (timeFilter === '3month') return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return new Date(0); // all
  }, [timeFilter]);

  // 필터링된 날짜 그룹 (탭 + 시간 필터 적용)
  const filteredDateGroups = React.useMemo(() => {
    // 먼저 시간 필터 적용 (taken_at 기준)
    const timeFiltered = dateGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => new Date(item.media?.taken_at || item.created_at) >= cutoffDate)
      }))
      .filter(group => group.items.length > 0);

    if (activeTab === 'image') {
      // 이미지 탭: 시간 필터만 적용된 결과
      return timeFiltered;
    } else {
      // 텍스트 탭: 시간 필터 + OCR 텍스트가 있는 항목만
      return timeFiltered
        .map(group => ({
          ...group,
          items: group.items.filter(item => item.ocr_text && item.ocr_text.trim().length > 0)
        }))
        .filter(group => group.items.length > 0);
    }
  }, [activeTab, dateGroups, cutoffDate]);

  // 필터링된 아이템 수
  const filteredCount = React.useMemo(() => {
    return filteredDateGroups.reduce((sum, group) => sum + group.items.length, 0);
  }, [filteredDateGroups]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTimeline(false);
  }, [loadTimeline]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (dateStr === todayStr) return t('date.today');
    if (dateStr === yesterdayStr) return t('date.yesterday');
    // 언어에 따라 날짜 형식 변경
    const locale = (t('date.today') === 'Today') ? 'en-US' : 'ko-KR';
    return date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // 썸네일 우선 (그리드/리스트 뷰용, 16KB vs 3MB)
  const getImageUrl = (item: TimelineItem): string => {
    return item.media?.thumbnail_url || item.media?.download_url || '';
  };

  // 사진 클릭 → 상세 페이지로 이동
  const handlePhotoPress = (mediaId: string) => {
    router.push(`/media/${mediaId}`);
  };

  // 헤더 액션 핸들러
  const handleSearchPress = () => {
    router.push('/search');
  };

  const handleAddPress = () => {
    setShowUploadModal(true);
  };

  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  // 읽지 않은 알림 수 조회 (화면 focus 시마다 refetch)
  const fetchUnreadCount = useCallback(() => {
    if (!accessToken) return;
    Promise.all([
      notificationsApi.getUnreadCount().catch(() => ({ count: 0 })),
      announcementsApi.getUnreadCount().catch(() => ({ count: 0 })),
    ]).then(([notif, ann]) => {
      setUnreadNotifCount(notif.count);
      setUnreadAnnCount(ann.count);
    });
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  // 업로드 관련 핸들러
  const handleFabPress = () => {
    setShowUploadModal(true);
  };

  const handlePickFromGallery = async () => {
    setShowUploadModal(false);
    const pickedItems = await pickFromGallery(true);
    if (pickedItems && pickedItems.length > 0) {
      // 선택한 아이템을 직접 전달하여 업로드 시작
      const results = await startUpload(pickedItems);
      if (results.length > 0) {
        // 업로드 완료 후 타임라인 새로고침
        setTimeout(() => {
          loadTimeline(false);
          resetUpload();
        }, 1000);
      }
    }
  };

  const handleTakePhoto = async () => {
    setShowUploadModal(false);
    const takenItem = await takePhoto();
    if (takenItem) {
      // 촬영한 아이템을 직접 전달하여 업로드 시작
      const results = await startUpload([takenItem]);
      if (results.length > 0) {
        // 업로드 완료 후 타임라인 새로고침
        setTimeout(() => {
          loadTimeline(false);
          resetUpload();
        }, 1000);
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={palette.primary[500]} />
        <Text style={[styles.loadingText, { color: theme.text.secondary }]}>{t('timeline.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background.primary }]}>
        <ErrorView
          message={error}
          onRetry={() => loadTimeline()}
          textColor={theme.text.primary}
          subTextColor={theme.text.secondary}
          buttonColor={palette.primary[500]}
        />
      </View>
    );
  }

  // analysis_status 기반 제목 결정
  const getDisplayTitle = (item: TimelineItem): string => {
    const localized = getLocalizedTitle(item.title, item.title_en, language);
    const title = localized || item.caption_ko || item.caption;
    if (title) return title;
    const status = item.analysis_status;
    if (status === 'queued' || status === 'running') return 'AI 분석 중...';
    if (status === 'failed') return '분석 실패';
    return t('common.noTitle');
  };

  // 그리드 뷰 카드
  const renderGridCard = (photo: TimelineItem & { _featured?: boolean }) => {
    const isFeatured = photo._featured;
    return (
      <View key={photo.id} style={isFeatured ? styles.featuredCardInner : styles.gridCardWrapper}>
        <ScheduleCard
          id={photo.id}
          title={getDisplayTitle(photo)}
          time={formatTime(photo.media?.taken_at || photo.created_at)}
          imageUrl={getImageUrl(photo)}
          emotion={photo.media?.emotion}
          groupCount={photo.media?.group_count || undefined}
          onPress={() => handlePhotoPress(photo.media_id)}
          theme={theme}
          size={isFeatured ? 'large' : 'compact'}
        />
      </View>
    );
  };

  // 리스트 뷰 카드 (텍스트 탭용 - OCR 텍스트 표시)
  const renderListCard = (photo: TimelineItem) => (
    <TouchableOpacity
      key={photo.id}
      style={[styles.listItem, { backgroundColor: theme.surface.primary }]}
      activeOpacity={0.8}
      onPress={() => handlePhotoPress(photo.media_id)}
    >
      <Image
        source={getImageUrl(photo)}
        style={styles.listImage}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
      <View style={styles.listContent}>
        <View style={styles.listHeader}>
          <Text style={[styles.listTime, { color: theme.text.tertiary }]}>{formatTime(photo.media?.taken_at || photo.created_at)}</Text>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              if (photo.media?.id) {
                handleBookmarkToggle(photo.media.id, !!photo.media.is_bookmarked);
              }
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <BookmarkIcon
              color={photo.media?.is_bookmarked ? palette.primary[500] : theme.icon.secondary}
              filled={!!photo.media?.is_bookmarked}
            />
          </TouchableOpacity>
        </View>
        {/* OCR 텍스트 표시 (텍스트 탭에서) */}
        {(() => {
          const displayCaption = language === 'ko'
            ? (photo.caption_ko || photo.caption)
            : (photo.caption || photo.caption_ko);
          return (
            <>
              <Text style={[styles.listCaption, { color: theme.text.primary }]} numberOfLines={3}>
                {photo.ocr_text || displayCaption || t('search.noCaption')}
              </Text>
              {displayCaption && photo.ocr_text && (
                <Text style={[styles.listSubCaption, { color: theme.text.secondary }]} numberOfLines={1}>
                  {displayCaption}
                </Text>
              )}
            </>
          );
        })()}
      </View>
    </TouchableOpacity>
  );

  // 뷰 모드 (사용자 선택에 따름)
  const currentViewMode = viewMode;

  const renderDateSection = ({ item }: { item: DateGroup }) => {
    const dateObj = new Date(item.date);
    const dayNames = (t('calendar.weekdays') as string).split(',');
    const dayName = dayNames[dateObj.getDay()];
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    const dayColor = isWeekend ? '#FA5252' : (isDark ? '#9CA3AF' : '#6B7280');
    const featured = item.items[0];
    const rest = item.items.slice(1);

    return (
      <View style={[styles.dateSection, { backgroundColor: isDark ? '#1A2332' : '#FFFFFF' }]}>
        {/* 날짜 헤더 */}
        <View style={styles.dateSectionHeader}>
          <View style={[styles.dateAccentLine, { backgroundColor: '#FA5252' }]} />
          <View style={styles.dateHeaderContent}>
            <Text style={[styles.dateHeaderMain, { color: theme.text.primary }]}>
              {formatDate(item.date)}
            </Text>
            <Text style={[styles.dateHeaderDay, { color: dayColor }]}>
              {dayName}요일 · {item.items.length}장
            </Text>
          </View>
        </View>

        {currentViewMode === 'grid' ? (
          <View style={styles.featuredGrid}>
            {/* Featured 대표 사진 */}
            {featured && (
              <TouchableOpacity
                style={styles.featuredPhoto}
                onPress={() => handlePhotoPress(featured.media_id)}
                activeOpacity={0.9}
              >
                <Image
                  source={featured.media?.thumbnail_url ? { uri: featured.media.thumbnail_url } : undefined}
                  style={styles.featuredImage}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
                <View style={styles.featuredOverlay}>
                  <Text style={styles.featuredCaption} numberOfLines={2}>
                    {getDisplayTitle(featured)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            {/* 나머지 가로 스크롤 strip */}
            {rest.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.stripContainer}
              >
                {rest.map((photo) => (
                  <TouchableOpacity
                    key={photo.id}
                    style={styles.stripItem}
                    onPress={() => handlePhotoPress(photo.media_id)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={photo.media?.thumbnail_url ? { uri: photo.media.thumbnail_url } : undefined}
                      style={styles.stripImage}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                    />
                    {photo.media?.group_count && photo.media.group_count > 1 && (
                      <View style={styles.stripBadge}>
                        <Text style={styles.stripBadgeText}>+{photo.media.group_count - 1}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {item.items.map(renderListCard)}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background.primary} />

      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: theme.background.primary }]}>
        <View style={styles.headerLeft}>
          <Logo size={32} showText={false} color={theme.text.primary} />
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>{t('timeline.title')}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton} onPress={handleSearchPress}>
            <SearchIcon color={theme.icon.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleNotificationPress}>
            <BellIcon color={theme.icon.primary} />
            {(unreadAnnCount + unreadNotifCount) > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {(unreadAnnCount + unreadNotifCount) > 9 ? '9+' : unreadAnnCount + unreadNotifCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 탭 필터 바 */}
      <View style={[styles.filterBar, { borderBottomColor: theme.border.light }]}>
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              activeTab === 'image'
                ? { backgroundColor: DARK_GREEN }
                : { backgroundColor: isDark ? palette.neutral[700] : '#F5F5F5' }
            ]}
            onPress={() => setActiveTab('image')}
          >
            <Text style={[
              styles.filterTabText,
              { color: activeTab === 'image' ? palette.neutral[0] : theme.text.primary }
            ]}>
              {t('timeline.filterImage')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              activeTab === 'text'
                ? { backgroundColor: DARK_GREEN }
                : { backgroundColor: isDark ? palette.neutral[700] : '#F5F5F5' }
            ]}
            onPress={() => setActiveTab('text')}
          >
            <Text style={[
              styles.filterTabText,
              { color: activeTab === 'text' ? palette.neutral[0] : theme.text.primary }
            ]}>
              {t('timeline.filterText')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 필터 컨트롤 바: 건수 + 시간필터 + 뷰모드 */}
      <View style={styles.filterControlBar}>
        <Text style={[styles.totalCount, { color: theme.text.secondary }]}>
          {t('timeline.totalCount', { count: filteredCount })}
        </Text>

        <View style={styles.filterActions}>
          {/* 시간 필터 (주/월/3개월/전체) */}
          <View style={styles.timeFilterContainer}>
            {(['week', 'month', '3month', 'all'] as const).map((f) => {
              const label = t(`timeline.filter_${f}` as any);
              const isActive = timeFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.timeFilterButton,
                    { backgroundColor: isActive ? '#2D3A35' : (isDark ? palette.neutral[700] : '#F5F5F5') },
                  ]}
                  onPress={() => setTimeFilter(f)}
                >
                  <Text style={[
                    styles.timeFilterText,
                    { color: isActive ? '#FFFFFF' : (isDark ? palette.neutral[200] : '#252525') },
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

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
      </View>

      <FlatList
        data={filteredDateGroups}
        keyExtractor={(item) => item.date}
        renderItem={renderDateSection}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[palette.primary[500]]} tintColor={palette.primary[500]} />}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={palette.primary[500]} />
              <Text style={[styles.loadingMoreText, { color: theme.text.secondary }]}>{t('timeline.loadingMore')}</Text>
            </View>
          ) : !hasMore && filteredDateGroups.length > 0 ? (
            <View style={styles.endOfList}>
              <Text style={[styles.endOfListText, { color: theme.text.tertiary }]}>{t('timeline.allLoaded')}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ImageIcon color={theme.icon.secondary} />
            <Text style={[styles.emptyText, { color: theme.text.primary }]}>
              {activeTab === 'text' ? 'OCR 텍스트가 있는 사진이 없습니다' : t('timeline.noPhotos')}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>
              {activeTab === 'text' ? '이미지 탭에서 사진을 확인하세요' : t('timeline.uploadPrompt')}
            </Text>
          </View>
        }
      />

      {/* 업로드 진행 상태 */}
      {isUploading && uploadItems.length > 0 && (
        <View style={[styles.uploadProgress, { backgroundColor: theme.surface.primary }]}>
          <ActivityIndicator size="small" color={palette.primary[500]} />
          <Text style={[styles.uploadProgressText, { color: theme.text.primary }]}>
            {t('upload.uploading')} {uploadStats.done}/{uploadStats.total}
          </Text>
        </View>
      )}

      {/* 업로드 모달 */}
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
                <CameraIcon color={palette.primary[500]} />
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
  // Header
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
    borderRadius: 20,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 18,
  },
  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 16,
  },
  filterTabs: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsText: {
    fontSize: 13,
    minWidth: 50,
    textAlign: 'right',
  },
  // Filter Control Bar
  filterControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  totalCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeFilterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  timeFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeFilterText: {
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
  // Loading/Error
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  // List Content
  flatListContent: {
    paddingVertical: 16,
    paddingBottom: 120,
  },
  dateSection: {
    marginBottom: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    paddingBottom: 12,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 10,
  },
  dateAccentLine: {
    width: 3,
    height: 36,
    borderRadius: 2,
  },
  dateHeaderContent: {
    flex: 1,
  },
  dateHeaderMain: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  dateHeaderDay: {
    fontSize: 12,
    marginTop: 1,
  },
  featuredGrid: {
    gap: 10,
    paddingBottom: 12,
  },
  featuredPhoto: {
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
    height: 220,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  featuredCaption: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  stripContainer: {
    paddingHorizontal: 12,
    gap: 8,
  },
  stripItem: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
  },
  stripImage: {
    width: '100%',
    height: '100%',
  },
  stripBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  stripBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  featuredCardWrapper: {
    marginBottom: 4,
  },
  featuredCardInner: {
    width: '100%',
  },
  // Grid View (2열)
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 10,
  },
  gridCardWrapper: {
    width: ITEM_SIZE - 10,
  },
  // List View
  listContainer: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  listImage: {
    width: 100,
    height: 100,
  },
  listContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listTime: {
    fontSize: 12,
  },
  listCaption: {
    fontSize: 14,
    lineHeight: 20,
  },
  listSubCaption: {
    fontSize: 12,
    marginTop: 4,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100, // 탭바 위에 위치
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Loading More
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
  },
  endOfList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  endOfListText: {
    fontSize: 14,
  },
  // Upload progress
  uploadProgress: {
    position: 'absolute',
    bottom: 168,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  uploadProgressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal
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
