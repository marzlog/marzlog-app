import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import timelineApi, { TimelineItem } from '@/src/api/timeline';
import { palette, lightTheme, darkTheme, Theme } from '@/src/theme/colors';
import { useAuthStore } from '@/src/store/authStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useImageUpload } from '@/src/hooks/useImageUpload';
import { useTranslation } from '@/src/hooks/useTranslation';

// Figma 기반 아이콘들
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

function AlertIcon({ color = palette.error[500] }: { color?: string }) {
  return (
    <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 9V13M12 17H12.01M12 3L2 21H22L12 3Z"
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

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 3;
const PAGE_SIZE = 30;

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface DateGroup {
  date: string;
  items: TimelineItem[];
}

export default function TimelineScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const { t } = useTranslation();

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
      console.log('[Timeline] No token, skipping API call');
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
      console.log('[Timeline] API Response - total:', response.total, 'items:', response.items.length);
      console.log('[Timeline] First 3 items:', response.items.slice(0, 3).map(item => ({
        id: item.id,
        created_at: item.created_at,
        taken_at: item.media?.taken_at,
      })));
      setTotal(response.total);
      allItemsRef.current = response.items;
      offsetRef.current = response.items.length;
      setLoadedCount(response.items.length);
      hasMoreRef.current = response.items.length < response.total;
      setHasMore(hasMoreRef.current);

      const groups = groupByDate(response.items);
      setDateGroups(groups);
    } catch (err: any) {
      console.error('Timeline load error:', err);
      setError(err.message || '타임라인을 불러올 수 없습니다');
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

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
      console.error('Load more error:', err);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  const groupByDate = (items: TimelineItem[]): DateGroup[] => {
    const grouped: Record<string, TimelineItem[]> = {};
    items.forEach((item) => {
      // created_at (등록일) 기준으로 그룹핑
      const date = new Date(item.created_at);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(item);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({ date, items }));
  };

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

  // AWS S3 presigned URL 직접 사용
  const getImageUrl = (item: TimelineItem): string => {
    return item.media?.download_url || item.media?.thumbnail_url || '';
  };

  // 사진 클릭 → 상세 페이지로 이동
  const handlePhotoPress = (mediaId: string) => {
    router.push(`/media/${mediaId}`);
  };

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
        <AlertIcon color={theme.error.default} />
        <Text style={[styles.errorText, { color: theme.text.primary }]}>{error}</Text>
        <Text style={{ color: theme.text.tertiary, fontSize: 12, marginTop: 8 }}>
          Token: {accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING'}
        </Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: palette.primary[500] }]} onPress={() => loadTimeline()}>
          <Text style={[styles.retryButtonText, { color: palette.neutral[0] }]}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderDateSection = ({ item }: { item: DateGroup }) => (
    <View style={styles.dateSection}>
      <Text style={[styles.dateHeader, { color: theme.text.primary }]}>{formatDate(item.date)}</Text>
      <View style={styles.gridContainer}>
        {item.items.map((photo) => (
          <TouchableOpacity
            key={photo.id}
            style={[styles.gridItem, { backgroundColor: theme.background.tertiary }]}
            activeOpacity={0.8}
            onPress={() => handlePhotoPress(photo.media_id)}
          >
            <Image
              source={{ uri: getImageUrl(photo) }}
              style={styles.gridImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // dateGroups에서 직접 계산 (React Native Web Text 업데이트 버그 우회)
  const displayCount = dateGroups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <View style={[styles.statsBar, { borderBottomColor: theme.border.light }]}>
        <Text key={`stats-${displayCount}-${total}`} style={[styles.statsText, { color: theme.text.secondary }]}>{displayCount} / {total} {t('timeline.photoCount')}</Text>
      </View>
      <FlatList
        data={dateGroups}
        keyExtractor={(item) => item.date}
        renderItem={renderDateSection}
        contentContainerStyle={styles.listContent}
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
          ) : !hasMore && dateGroups.length > 0 ? (
            <View style={styles.endOfList}>
              <Text style={[styles.endOfListText, { color: theme.text.tertiary }]}>{t('timeline.allLoaded')}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ImageIcon color={theme.icon.secondary} />
            <Text style={[styles.emptyText, { color: theme.text.primary }]}>{t('timeline.noPhotos')}</Text>
            <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>{t('timeline.uploadPrompt')}</Text>
          </View>
        }
      />
      {/* FAB 버튼 */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: palette.primary[500], shadowColor: palette.primary[500] },
          isUploading && { backgroundColor: theme.text.disabled }
        ]}
        activeOpacity={0.8}
        onPress={handleFabPress}
        disabled={isUploading}
      >
        {isUploading ? (
          <ActivityIndicator size="small" color={palette.neutral[0]} />
        ) : (
          <PlusIcon color={palette.neutral[0]} />
        )}
      </TouchableOpacity>

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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statsText: {
    fontSize: 14,
  },
  listContent: {
    paddingVertical: 16,
  },
  dateSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
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
    bottom: 88,
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
