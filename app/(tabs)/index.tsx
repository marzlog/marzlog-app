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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import timelineApi, { TimelineItem } from '@/src/api/timeline';
import { colors } from '@/src/theme';
import { useAuthStore } from '@/src/store/authStore';
import { useImageUpload } from '@/src/hooks/useImageUpload';
import { useTranslation } from '@/src/hooks/useTranslation';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 3;
const PAGE_SIZE = 30;

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface DateGroup {
  date: string;
  items: TimelineItem[];
}

export default function TimelineScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const { t } = useTranslation();

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
      <View style={[styles.centerContainer, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text style={[styles.loadingText, isDark && styles.textLight]}>{t('timeline.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, isDark && styles.containerDark]}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={[styles.errorText, isDark && styles.textLight]}>{error}</Text>
        <Text style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
          Token: {accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadTimeline()}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderDateSection = ({ item }: { item: DateGroup }) => (
    <View style={styles.dateSection}>
      <Text style={[styles.dateHeader, isDark && styles.textLight]}>{formatDate(item.date)}</Text>
      <View style={styles.gridContainer}>
        {item.items.map((photo) => (
          <TouchableOpacity
            key={photo.id}
            style={styles.gridItem}
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
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.statsBar}>
        <Text key={`stats-${displayCount}-${total}`} style={[styles.statsText, isDark && styles.textLight]}>{displayCount} / {total} {t('timeline.photoCount')}</Text>
      </View>
      <FlatList
        data={dateGroups}
        keyExtractor={(item) => item.date}
        renderItem={renderDateSection}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand.primary]} tintColor={colors.brand.primary} />}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.brand.primary} />
              <Text style={styles.loadingMoreText}>{t('timeline.loadingMore')}</Text>
            </View>
          ) : !hasMore && dateGroups.length > 0 ? (
            <View style={styles.endOfList}>
              <Text style={styles.endOfListText}>{t('timeline.allLoaded')}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={64} color={isDark ? '#6B7280' : '#D1D5DB'} />
            <Text style={[styles.emptyText, isDark && styles.textLight]}>{t('timeline.noPhotos')}</Text>
            <Text style={styles.emptySubtext}>{t('timeline.uploadPrompt')}</Text>
          </View>
        }
      />
      {/* FAB 버튼 */}
      <TouchableOpacity
        style={[styles.fab, isUploading && styles.fabUploading]}
        activeOpacity={0.8}
        onPress={handleFabPress}
        disabled={isUploading}
      >
        {isUploading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="add" size={28} color="#fff" />
        )}
      </TouchableOpacity>

      {/* 업로드 진행 상태 */}
      {isUploading && uploadItems.length > 0 && (
        <View style={styles.uploadProgress}>
          <ActivityIndicator size="small" color={colors.brand.primary} />
          <Text style={styles.uploadProgressText}>
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
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUploadModal(false)}
        >
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <Text style={[styles.modalTitle, isDark && styles.textLight]}>{t('upload.title')}</Text>

            <TouchableOpacity style={styles.modalOption} onPress={handlePickFromGallery}>
              <Ionicons name="images-outline" size={24} color={colors.brand.primary} />
              <Text style={[styles.modalOptionText, isDark && styles.textLight]}>{t('upload.fromGallery')}</Text>
            </TouchableOpacity>

            {Platform.OS !== 'web' && (
              <TouchableOpacity style={styles.modalOption} onPress={handleTakePhoto}>
                <Ionicons name="camera-outline" size={24} color={colors.brand.primary} />
                <Text style={[styles.modalOptionText, isDark && styles.textLight]}>{t('upload.takePhoto')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowUploadModal(false)}
            >
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  containerDark: { backgroundColor: '#111827' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6B7280' },
  errorText: { marginTop: 16, fontSize: 16, color: '#374151', textAlign: 'center', paddingHorizontal: 32 },
  retryButton: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.brand.primary, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statsBar: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  statsText: { fontSize: 14, color: '#6B7280' },
  listContent: { paddingVertical: 16 },
  dateSection: { marginBottom: 24, paddingHorizontal: 16 },
  dateHeader: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  textLight: { color: '#F9FAFB' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  gridItem: { width: ITEM_SIZE, height: ITEM_SIZE, borderRadius: 8, overflow: 'hidden', backgroundColor: '#E5E7EB' },
  gridImage: { width: '100%', height: '100%' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabUploading: { backgroundColor: '#9CA3AF' },
  loadingMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 8 },
  loadingMoreText: { fontSize: 14, color: '#6B7280' },
  endOfList: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  endOfListText: { fontSize: 14, color: '#9CA3AF' },
  // Upload progress
  uploadProgress: { position: 'absolute', bottom: 88, right: 20, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  uploadProgressText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalContentDark: { backgroundColor: '#1F2937' },
  modalTitle: { fontSize: 20, fontWeight: '600', color: '#1F2937', marginBottom: 20, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalOptionText: { fontSize: 16, color: '#374151' },
  modalCancel: { marginTop: 16, paddingVertical: 16, alignItems: 'center' },
  modalCancelText: { fontSize: 16, color: '#6B7280', fontWeight: '500' },
});
