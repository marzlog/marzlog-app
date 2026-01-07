import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/src/theme';
import { ScheduleCard, DateSelector } from '@/src/components/home';
import { Logo } from '@/src/components/common/Logo';
import timelineApi, { TimelineItem } from '@/src/api/timeline';
import { useAuthStore } from '@/src/store/authStore';
import { useImageUpload } from '@/src/hooks/useImageUpload';

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
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuthStore();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [allItems, setAllItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload hook
  const {
    isUploading,
    pickFromGallery,
    takePhoto,
  } = useImageUpload();

  // 사진이 있는 날짜 Set (created_at 등록일 기준)
  const datesWithPhotos = useMemo(() => {
    const dates = new Set<string>();
    allItems.forEach((item) => {
      // created_at (등록일) 기준으로만
      const createdAt = new Date(item.created_at);
      dates.add(formatDateKey(createdAt));
    });
    console.log('[Home] datesWithPhotos:', Array.from(dates));
    return dates;
  }, [allItems]);

  // 전체 타임라인 로드
  const loadAllItems = useCallback(async () => {
    console.log('[Home] loadAllItems called, accessToken:', accessToken ? 'EXISTS' : 'MISSING');

    if (!accessToken) {
      console.log('[Home] No accessToken, skipping API call');
      setLoading(false);
      return;
    }

    try {
      console.log('[Home] Calling timelineApi.getTimeline with limit=50...');
      // 명시적으로 limit=50 지정 (500은 백엔드에서 422 에러 발생)
      const response = await timelineApi.getTimeline(50, 0);
      console.log('[Home] API Response - total:', response.total, 'items:', response.items.length);
      console.log('[Home] First 3 items:', response.items.slice(0, 3).map(item => ({
        id: item.id,
        created_at: item.created_at,
        taken_at: item.media?.taken_at,
      })));
      setAllItems(response.items);
      console.log('[Home] setAllItems called with', response.items.length, 'items');
    } catch (err) {
      console.error('[Home] Failed to load all items:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // accessToken 변경 감지
  useEffect(() => {
    console.log('[Home] accessToken changed:', accessToken ? 'EXISTS' : 'MISSING');
  }, [accessToken]);

  // 선택된 날짜의 타임라인 필터링 (created_at 등록일 기준)
  useEffect(() => {
    console.log('[Home] Filtering - selectedDate:', formatDateKey(selectedDate));
    console.log('[Home] Filtering - allItems count:', allItems.length);

    const filtered = allItems.filter((item) => {
      // created_at (등록일) 기준으로만 필터링
      const createdAt = new Date(item.created_at);
      const isMatch = isSameDay(createdAt, selectedDate);

      if (isMatch) {
        console.log(`[Home] Match found: id=${item.id}, created_at=${item.created_at}`);
      }

      return isMatch;
    });

    console.log('[Home] Filtered count:', filtered.length);

    const mapped: ScheduleItem[] = filtered.map((item) => ({
      id: item.id,
      title: item.caption || '제목 없음',
      location: undefined,
      time: formatTime(item.created_at),
      imageUrl: item.media?.download_url || item.media?.thumbnail_url || '',
      mediaId: item.media_id,
      groupId: item.media?.group_id || undefined,
      groupCount: item.media?.group_count || undefined,
    }));

    setSchedules(mapped);
    setLoading(false);
  }, [selectedDate, allItems]);

  // 초기 로드
  useEffect(() => {
    console.log('[Home] Initial load useEffect triggered');
    loadAllItems();
  }, [loadAllItems]);

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

  // 알림 (추후 구현)
  const handleNotificationPress = () => {
    Alert.alert('알림', '알림 기능은 곧 추가될 예정입니다.');
  };

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

  // 알림 (웹/모바일 모두 지원)
  const showAlert = (message: string) => {
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert('알림', message);
    }
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
          console.log('[Gallery] Navigating to /upload with', validItems.length, 'valid images');
          router.push({
            pathname: '/upload',
            params: { images: JSON.stringify(validItems) },
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
        params: { images: JSON.stringify([takenItem]) },
      });
    }
  };

  // 사진 상세 화면으로 이동
  const handlePhotoPress = (mediaId: string) => {
    router.push(`/media/${mediaId}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.topAppBar}>
          <View style={styles.logoContainer}>
            <Logo size={32} showText={true} />
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={handleSearchPress}>
              <Ionicons name="search" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleAddPress}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color={colors.text.primary} />
              ) : (
                <Ionicons name="add" size={24} color={colors.text.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleNotificationPress}>
              <Ionicons name="notifications-outline" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
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
            tintColor={colors.brand.primary}
          />
        }
      >
        {/* Date Selector (주/월 토글) */}
        <View style={styles.dateSelectorContainer}>
          <DateSelector
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            datesWithPhotos={datesWithPhotos}
          />
        </View>

        {/* Schedule Cards */}
        <View style={styles.schedulesContainer}>
          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.brand.primary} />
              <Text style={styles.loadingText}>불러오는 중...</Text>
            </View>
          ) : schedules.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={48} color={colors.neutral[5]} />
              <Text style={styles.emptyText}>이 날의 사진이 없습니다</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleAddPress}
              >
                <Ionicons name="add" size={20} color={colors.text.inverse} />
                <Text style={styles.uploadButtonText}>사진 추가하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            schedules.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                id={schedule.id}
                title={schedule.title}
                location={schedule.location}
                time={schedule.time}
                imageUrl={schedule.imageUrl}
                groupCount={schedule.groupCount}
                onPress={() => handlePhotoPress(schedule.mediaId)}
              />
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
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUploadModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>사진 추가</Text>

            <TouchableOpacity style={styles.modalOption} onPress={handlePickFromGallery}>
              <Ionicons name="images-outline" size={24} color={colors.brand.primary} />
              <Text style={styles.modalOptionText}>갤러리에서 선택</Text>
            </TouchableOpacity>

            {Platform.OS !== 'web' && (
              <TouchableOpacity style={styles.modalOption} onPress={handleTakePhoto}>
                <Ionicons name="camera-outline" size={24} color={colors.brand.primary} />
                <Text style={styles.modalOptionText}>카메라로 촬영</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowUploadModal(false)}
            >
              <Text style={styles.modalCancelText}>취소</Text>
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
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.background,
  },
  topAppBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  logoContainer: {
    paddingLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral[5],
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral[5],
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.brand.primary,
    borderRadius: 24,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[2],
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text.primary,
  },
  modalCancel: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.secondary,
  },
});
