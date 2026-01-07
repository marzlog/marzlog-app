import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMediaDetail, getMediaAnalysis } from '@/src/api/media';
import { timelineApi, GroupImageItem } from '@/src/api/timeline';
import { colors } from '@/src/theme';
import type { MediaDetail, MediaAnalysis } from '@/src/types/media';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 40;
const CAROUSEL_IMAGE_WIDTH = SCREEN_WIDTH; // 캐러셀은 화면 전체 너비 사용

export default function MediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [media, setMedia] = useState<MediaDetail | null>(null);
  const [analysis, setAnalysis] = useState<MediaAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 그룹 이미지 관련 상태
  const [groupImages, setGroupImages] = useState<GroupImageItem[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [mediaData, analysisData] = await Promise.all([
        getMediaDetail(id!),
        getMediaAnalysis(id!).catch((err) => {
          console.log('[MediaDetail] Analysis API error:', err);
          return null;
        }),
      ]);

      console.log('[MediaDetail] Media data:', JSON.stringify(mediaData, null, 2));
      console.log('[MediaDetail] Analysis data:', JSON.stringify(analysisData, null, 2));

      setMedia(mediaData);
      setAnalysis(analysisData);

      // 그룹 이미지 로드 (group_id가 있는 경우)
      if (mediaData.group_id) {
        try {
          const groupData = await timelineApi.getGroupImages(mediaData.group_id);
          setGroupImages(groupData.items || []);
          console.log('[MediaDetail] Loaded group images:', groupData.items?.length);
        } catch (groupErr) {
          console.log('[MediaDetail] Failed to load group images:', groupErr);
          // 그룹 이미지 로드 실패해도 단일 이미지는 보여줌
        }
      }
    } catch (err) {
      console.error('Load error:', err);
      setError(err instanceof Error ? err.message : '로딩 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  const handleConfirm = () => {
    router.back();
  };

  // 캐러셀 스크롤 핸들러
  const handleCarouselScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / CAROUSEL_IMAGE_WIDTH);
    if (index !== currentImageIndex && index >= 0 && index < displayImages.length) {
      setCurrentImageIndex(index);
    }
  };

  // 이전 이미지로 이동
  const goToPrevious = () => {
    if (currentImageIndex > 0) {
      const newIndex = currentImageIndex - 1;
      setCurrentImageIndex(newIndex);
      carouselRef.current?.scrollTo({
        x: newIndex * CAROUSEL_IMAGE_WIDTH,
        animated: true,
      });
    }
  };

  // 다음 이미지로 이동
  const goToNext = () => {
    if (currentImageIndex < displayImages.length - 1) {
      const newIndex = currentImageIndex + 1;
      setCurrentImageIndex(newIndex);
      carouselRef.current?.scrollTo({
        x: newIndex * CAROUSEL_IMAGE_WIDTH,
        animated: true,
      });
    }
  };

  // 표시할 이미지 목록 (그룹 이미지가 있으면 그룹, 없으면 단일)
  const displayImages = groupImages.length > 0
    ? groupImages
    : media
      ? [{ id: media.id, download_url: media.download_url, thumbnail_url: media.thumbnail_url || '' }]
      : [];

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? '오후' : '오전';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${year}년 ${month}월 ${day}일 ${period} ${displayHours}:${minutes.toString().padStart(2, '0')}`;
  };

  // 감정 이모지 헬퍼
  const getEmotionEmoji = (emotion: string): string => {
    const emotionMap: Record<string, string> = {
      '기쁨': '😊',
      '평온': '😌',
      '사랑': '❤️',
      '감사': '🙏',
      '놀람': '😮',
      '불안': '😰',
      '슬픔': '😢',
      '분노': '😠',
      '몰입': '🎯',
      '생각': '🤔',
      '피곤': '😫',
      '아픔': '🤕',
    };
    return emotionMap[emotion] || '😶';
  };

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text style={styles.loadingText}>불러오는 중...</Text>
      </View>
    );
  }

  if (error || !media) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error || '사진을 찾을 수 없습니다'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 편집 화면으로 이동
  const handleEdit = () => {
    router.push({
      pathname: '/upload',
      params: {
        editMode: 'true',
        mediaId: id,
        groupId: media?.group_id || '',
      },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>상세보기</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton} onPress={handleEdit}>
            <Ionicons name="pencil" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Image Carousel - 세로 스크롤과 분리하여 스와이프 충돌 방지 */}
      <View style={styles.carouselWrapper}>
        <ScrollView
          ref={carouselRef}
          horizontal={true}
          pagingEnabled={true}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleCarouselScroll}
          scrollEventThrottle={16}
          style={{ width: CAROUSEL_IMAGE_WIDTH }}
        >
          {displayImages.map((img, index) => (
            <View key={img.id || index} style={styles.carouselImageContainer}>
              <Image
                source={{ uri: img.download_url || img.thumbnail_url }}
                style={styles.carouselImage}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* 좌측 버튼 (이전) */}
        {displayImages.length > 1 && currentImageIndex > 0 && (
          <Pressable
            style={[styles.carouselButton, styles.carouselButtonLeft]}
            onPress={goToPrevious}
          >
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </Pressable>
        )}

        {/* 우측 버튼 (다음) */}
        {displayImages.length > 1 && currentImageIndex < displayImages.length - 1 && (
          <Pressable
            style={[styles.carouselButton, styles.carouselButtonRight]}
            onPress={goToNext}
          >
            <Ionicons name="chevron-forward" size={28} color="#fff" />
          </Pressable>
        )}

        {/* Pagination Dots */}
        {displayImages.length > 1 && (
          <View style={styles.paginationContainer}>
            {displayImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentImageIndex && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* 분석 정보 등 나머지 컨텐츠 */}
      <ScrollView
        style={styles.detailContent}
        contentContainerStyle={styles.detailContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 감정 + 강도 */}
        {media.emotion && (
          <View style={styles.emotionSection}>
            <Text style={styles.emotionText}>
              {getEmotionEmoji(media.emotion)} {media.emotion}
            </Text>
            {media.intensity && (
              <View style={styles.intensityBar}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.intensityDot,
                      i <= media.intensity! && styles.intensityDotActive,
                    ]}
                  />
                ))}
                <Text style={styles.intensityText}>({media.intensity}/5)</Text>
              </View>
            )}
          </View>
        )}

        {/* 제목 */}
        {media.title && (
          <View style={styles.userSection}>
            <Text style={styles.titleText}>{media.title}</Text>
          </View>
        )}

        {/* 내용 */}
        {media.content && (
          <View style={styles.userSection}>
            <Text style={styles.userSectionLabel}>내용</Text>
            <Text style={styles.contentText}>{media.content}</Text>
          </View>
        )}

        {/* 메모 */}
        {media.memo && (
          <View style={styles.userSection}>
            <Text style={styles.userSectionLabel}>메모</Text>
            <Text style={styles.memoText}>{media.memo}</Text>
          </View>
        )}

        {/* 등록일 */}
        <View style={styles.userSection}>
          <Text style={styles.userSectionLabel}>등록일</Text>
          <Text style={styles.dateText}>
            {formatDateTime(media.created_at)}
          </Text>
        </View>

        {/* AI Caption */}
        {analysis?.caption && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>✨</Text>
              <Text style={styles.sectionTitle}>AI Caption</Text>
            </View>
            <Text style={styles.captionText}>{analysis.caption}</Text>
          </View>
        )}

        {/* Scene Type */}
        {analysis?.scene_type && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📋</Text>
              <Text style={styles.sectionTitle}>Scene Type</Text>
            </View>
            <View style={styles.chipContainer}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  {analysis.scene_type.charAt(0).toUpperCase() + analysis.scene_type.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Tags */}
        {analysis?.tags && analysis.tags.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🏷️</Text>
              <Text style={styles.sectionTitle}>Tags</Text>
            </View>
            <View style={styles.tagsContainer}>
              {analysis.tags.map((tag, index) => (
                <View key={index} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* OCR Text */}
        {analysis?.ocr_text && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📝</Text>
              <Text style={styles.sectionTitle}>Detected Text (OCR)</Text>
            </View>
            <View style={styles.ocrBox}>
              <Text style={styles.ocrText}>{analysis.ocr_text}</Text>
            </View>
          </View>
        )}

        {/* Photo Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📷</Text>
            <Text style={styles.sectionTitle}>Photo Details</Text>
          </View>
          <View style={styles.detailsContainer}>
            {analysis?.exif?.width && analysis?.exif?.height && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Resolution</Text>
                <Text style={styles.detailValue}>
                  {analysis.exif.width} x {analysis.exif.height}
                </Text>
              </View>
            )}
            {(analysis?.taken_at || media.taken_at) && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Taken</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(analysis?.taken_at || media.taken_at!)}
                </Text>
              </View>
            )}
            {analysis?.exif?.camera_model && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Camera</Text>
                <Text style={styles.detailValue}>
                  {`${analysis.exif.camera_make || ''} ${analysis.exif.camera_model}`.trim()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Pending Analysis */}
        {!analysis?.caption && (
          <View style={styles.section}>
            <View style={styles.pendingBox}>
              <Ionicons name="hourglass-outline" size={24} color={colors.neutral[5]} />
              <Text style={styles.pendingText}>AI 분석 대기 중...</Text>
            </View>
          </View>
        )}

        {/* Bottom Spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirm Button - Fixed at bottom */}
      <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>확인</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.neutral[5],
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
  },
  retryText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[2],
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text.primary,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  carouselWrapper: {
    width: SCREEN_WIDTH,
    backgroundColor: colors.neutral[1],
    position: 'relative',
  },
  carouselImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75, // 4:3 비율
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -24, // 버튼 높이의 절반
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  carouselButtonLeft: {
    left: 12,
  },
  carouselButtonRight: {
    right: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailContentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  // 기존 스타일 유지 (단일 이미지용)
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.neutral[2],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral[3],
  },
  paginationDotActive: {
    backgroundColor: colors.brand.primary,
    width: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  captionText: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.text.primary,
    lineHeight: 22,
    backgroundColor: colors.neutral[2],
    padding: 16,
    borderRadius: 16,
  },
  chipContainer: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.neutral[2],
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.neutral[2],
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  ocrBox: {
    padding: 16,
    backgroundColor: colors.neutral[2],
    borderRadius: 16,
  },
  ocrText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.text.primary,
    lineHeight: 20,
  },
  detailsContainer: {
    backgroundColor: colors.neutral[2],
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  pendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.neutral[2],
    borderRadius: 16,
    gap: 12,
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[5],
  },
  // 사용자 입력 정보 스타일
  emotionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[2],
    marginBottom: 16,
  },
  emotionText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  intensityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  intensityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.neutral[3],
  },
  intensityDotActive: {
    backgroundColor: colors.brand.primary,
  },
  intensityText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  userSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[2],
    marginBottom: 8,
  },
  userSectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: 6,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    lineHeight: 28,
  },
  contentText: {
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 24,
  },
  memoText: {
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 24,
  },
  dateText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[2],
  },
  confirmButton: {
    height: 56,
    backgroundColor: colors.brand.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});
