import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Linking,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMediaDetail, getMediaAnalysis, deleteMedia, generateDiary, updateCaption, updateDiary, updateMediaEmotion, patchBookmark } from '@/src/api/media';
import { useMediaUpdatesStore } from '@/src/store/mediaUpdatesStore';
import Slider from '@react-native-community/slider';
import { timelineApi, GroupImageItem } from '@/src/api/timeline';
import { colors } from '@/src/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTimelineStore } from '@/src/store/timelineStore';
import { useDialog } from '@/src/components/ui/Dialog';
import { t } from '@/src/i18n';
import { getErrorMessage } from '@/src/utils/errorMessages';
import { captureError } from '@/src/utils/sentry';
import ErrorView from '@/src/components/common/ErrorView';
import { AiNotice } from '@/src/components/common/AiNotice';
import type { MediaDetail, MediaAnalysis } from '@/src/types/media';
import { EMOTIONS, getEmotionByName, getEmotionIcon, getEmotionIllustration, EMOTION_KEY_TO_NAME } from '@/constants/emotions';
import { ShareSheet } from '@/src/components/media/ShareSheet';
import { ShareCardView } from '@/src/components/media/ShareCardView';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 40;
const CAROUSEL_IMAGE_WIDTH = SCREEN_WIDTH;
const CAROUSEL_IMAGE_HEIGHT = SCREEN_HEIGHT * 0.45; // 화면 높이의 45%
const isWeb = Platform.OS === 'web';

export default function MediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { setLastViewedDate } = useTimelineStore();
  const { confirmDelete, alert } = useDialog();

  // 다크모드 결정
  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const [media, setMedia] = useState<MediaDetail | null>(null);
  const [analysis, setAnalysis] = useState<MediaAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingDiary, setIsGeneratingDiary] = useState(false);

  // 일기/캡션 편집 모달 상태
  const [diaryEditModalVisible, setDiaryEditModalVisible] = useState(false);
  const [captionEditModalVisible, setCaptionEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editMood, setEditMood] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 분위기 옵션
  const MOOD_OPTIONS = [
    t('mediaDetail.moodHappy'), t('mediaDetail.moodPeace'), t('mediaDetail.moodExcited'),
    t('mediaDetail.moodNostalgia'), t('mediaDetail.moodGratitude'), t('mediaDetail.moodEnergy'),
    t('mediaDetail.moodComfy'),
  ];

  // 감정 편집 모달 상태
  const [emotionModalVisible, setEmotionModalVisible] = useState(false);
  const [editEmotion, setEditEmotion] = useState('');
  const [editIntensity, setEditIntensity] = useState(3);

  // 공유 관련 상태
  const [showShareSheet, setShowShareSheet] = useState(false);
  const shareCardRef = useRef<View>(null);

  // 그룹 이미지 관련 상태
  const [groupImages, setGroupImages] = useState<GroupImageItem[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselRef = useRef<ScrollView>(null);

  // GPS 지역명 상태
  const [locationName, setLocationName] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // 스와이프 시 analysis 캐시 (media_id → analysis)
  const analysisCacheRef = useRef<Record<string, MediaAnalysis | null>>({});

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
          return null;
        }),
      ]);


      setMedia(mediaData);
      setAnalysis(analysisData);

      // 미디어 날짜를 lastViewedDate에 저장 (뒤로가기 시 홈 화면에서 해당 날짜로 복원)
      const mediaDate = mediaData.taken_at || mediaData.created_at;
      if (mediaDate) {
        setLastViewedDate(new Date(mediaDate));
      }

      // 초기 analysis 캐시
      if (analysisData) {
        analysisCacheRef.current[id!] = analysisData;
      }

      // 그룹 이미지 로드 (group_id가 있는 경우)
      if (mediaData.group_id) {
        try {
          const groupData = await timelineApi.getGroupImages(mediaData.group_id);
          const items = groupData.items || [];
          setGroupImages(items);

          // 클릭한 이미지의 인덱스 찾기 (검색에서 secondary 클릭 시)
          const targetIndex = items.findIndex(
            (img: GroupImageItem) => String(img.id) === id
          );
          if (targetIndex > 0) {
            setCurrentImageIndex(targetIndex);
            // 렌더 후 캐러셀 스크롤
            setTimeout(() => {
              carouselRef.current?.scrollTo({
                x: targetIndex * CAROUSEL_IMAGE_WIDTH,
                animated: false,
              });
            }, 50);
          }
        } catch (groupErr) {
        }
      }
    } catch (err: any) {
      captureError(err instanceof Error ? err : new Error(String(err)), { context: 'MediaDetail.load' });
      // 404: media가 삭제된 경우 → 홈으로 돌아가기
      if (err?.response?.status === 404) {
        alert(t('media.deleted'), t('media.deletedDesc'));
        router.back();
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // GPS 좌표를 지역명으로 변환 (Nominatim API)
  const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ko`,
        {
          headers: {
            'User-Agent': 'MarZlog/1.0',
          },
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      const address = data.address || {};

      const city = address.city || address.town || address.village || address.county || address.state;
      const country = address.country;

      if (city && country) {
        return `${city}, ${country}`;
      } else if (city || country) {
        return city || country;
      }
      return null;
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), { context: 'MediaDetail.reverseGeocode' });
      return null;
    }
  };

  // GPS 좌표가 있으면 지역명 가져오기
  useEffect(() => {
    const fetchLocationName = async () => {
      const gps = analysis?.exif?.gps;
      if (gps?.latitude && gps?.longitude) {
        setLoadingLocation(true);
        const name = await reverseGeocode(gps.latitude, gps.longitude);
        setLocationName(name);
        setLoadingLocation(false);
      }
    };

    if (analysis) {
      fetchLocationName();
    }
  }, [analysis]);

  // 스와이프 시 현재 이미지의 analysis 로드
  useEffect(() => {
    // 그룹이 없으면 (단일 이미지) 스와이프 없으므로 skip
    if (loading || groupImages.length === 0) return;

    const currentMedia = groupImages[currentImageIndex];
    if (!currentMedia?.id) return;

    const mediaId = String(currentMedia.id);

    // 캐시에 있으면 바로 사용
    if (mediaId in analysisCacheRef.current) {
      setAnalysis(analysisCacheRef.current[mediaId]);
      return;
    }

    // 캐시에 없으면 API 호출
    setLocationName(null);
    getMediaAnalysis(mediaId)
      .then((data) => {
        analysisCacheRef.current[mediaId] = data;
        setAnalysis(data);
      })
      .catch(() => {
        analysisCacheRef.current[mediaId] = null;
        setAnalysis(null);
      });
  }, [currentImageIndex]);

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

  // 현재 이미지의 감정/강도 (그룹 이미지별 독립)
  const currentImage = groupImages.length > 0 ? groupImages[currentImageIndex] : null;
  const currentEmotion = currentImage?.emotion ?? media?.emotion;
  const currentIntensity = currentImage?.intensity ?? media?.intensity;

  // 현재 이미지가 메인인지 (스와이프 대응)
  const isCurrentImagePrimary = currentImage
    ? currentImage.is_primary === true
    : media?.is_primary === true || !media?.group_id;


  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${year}. ${month}. ${day}. ${period} ${displayHours}:${minutes.toString().padStart(2, '0')}`;
  };

  // 감정 이모지 헬퍼
  // 파일 크기 포맷 (bytes → MB/KB)
  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  };

  // 셔터스피드 포맷
  const formatShutterSpeed = (speed: [number, number] | number | null): string => {
    if (!speed) return '';
    if (Array.isArray(speed)) {
      const [num, den] = speed;
      if (num === 1) {
        return `1/${den}s`;
      } else if (den === 1) {
        return `${num}s`;
      } else {
        return `${num}/${den}s`;
      }
    }
    if (speed >= 1) {
      return `${speed}s`;
    }
    return `1/${Math.round(1 / speed)}s`;
  };

  // 조리개 포맷
  const formatAperture = (aperture: number | null): string => {
    if (!aperture) return '';
    return `f/${aperture.toFixed(1)}`;
  };

  // GPS 좌표로 구글맵 열기
  const openMapWithGPS = (lat: number, lon: number) => {
    const url = `https://maps.google.com/?q=${lat},${lon}`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={[styles.centered, isDark && styles.containerDark, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text style={[styles.loadingText, isDark && styles.textLight]}>{t('media.loading')}</Text>
      </View>
    );
  }

  if (error || !media) {
    return (
      <View style={[styles.centered, isDark && styles.containerDark, { paddingTop: insets.top }]}>
        <ErrorView
          message={error || t('media.notFound')}
          onRetry={loadData}
          textColor={isDark ? '#F9FAFB' : '#1F2937'}
          subTextColor={isDark ? '#9CA3AF' : '#6B7280'}
          buttonColor={colors.brand.primary}
        />
      </View>
    );
  }

  // 삭제 처리
  const handleDelete = async () => {
    const confirmed = await confirmDelete();
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteMedia(id!);
      router.back(); // 이전 화면(해당 날짜 그룹)으로 돌아감
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), { context: 'MediaDetail.delete' });
      await alert(t('common.error'), t('error.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  // AI 일기 재생성
  const handleRegenerateDiary = async () => {
    if (isGeneratingDiary || !media) return;

    // 그룹이면서 메인이 아닌 경우 경고
    if (media.group_id && !isCurrentImagePrimary) {
      await alert(t('common.confirm'), t('media.diaryGroupOnly'));
      return;
    }

    setIsGeneratingDiary(true);
    try {
      await generateDiary(id!);
      await alert(t('media.diaryStartedTitle'), t('media.diaryStarted'));

      // 10초 후 자동 새로고침
      setTimeout(async () => {
        try {
          const [mediaData, analysisData] = await Promise.all([
            getMediaDetail(id!),
            getMediaAnalysis(id!),
          ]);
          setMedia(mediaData);
          setAnalysis(analysisData);
        } catch (err) {
          captureError(err instanceof Error ? err : new Error(String(err)), { context: 'MediaDetail.autoRefresh' });
        }
      }, 10000);
    } catch (err: any) {
      captureError(err instanceof Error ? err : new Error(String(err)), { context: 'MediaDetail.diaryGeneration' });
      await alert(t('common.error'), getErrorMessage(err));
    } finally {
      setIsGeneratingDiary(false);
    }
  };

  // 일기 편집 모달 열기
  const openDiaryEditModal = () => {
    // 현재 미디어의 일기 정보 가져오기
    const currentTitle = media?.title || '';
    const currentContent = media?.content || '';
    const currentMood = media?.mood || '';

    setEditTitle(currentTitle);
    setEditContent(currentContent);
    setEditMood(currentMood);
    setDiaryEditModalVisible(true);
  };

  // 캡션 편집 모달 열기
  const openCaptionEditModal = () => {
    setEditCaption(analysis?.caption_ko || analysis?.caption || '');
    setCaptionEditModalVisible(true);
  };

  // 일기 저장
  const handleSaveDiary = async () => {
    try {
      setIsSaving(true);
      await updateDiary(id!, {
        title: editTitle,
        content: editContent,
        mood: editMood,
      });

      // 미디어 새로고침
      const mediaData = await getMediaDetail(id!);
      setMedia(mediaData);

      setDiaryEditModalVisible(false);
      await alert(t('common.done'), t('media.diaryUpdated'));
    } catch (err: any) {
      await alert(t('common.error'), getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  // 캡션 저장
  const handleSaveCaption = async () => {
    const currentMediaId = groupImages.length > 0
      ? String(groupImages[currentImageIndex]?.id)
      : id!;

    try {
      setIsSaving(true);
      await updateCaption(currentMediaId, editCaption);

      // 캐시 무효화 및 새로고침
      delete analysisCacheRef.current[currentMediaId];
      const newAnalysis = await getMediaAnalysis(currentMediaId);
      analysisCacheRef.current[currentMediaId] = newAnalysis;
      setAnalysis(newAnalysis);

      setCaptionEditModalVisible(false);
      await alert(t('common.done'), t('media.captionUpdated'));
    } catch (err) {
      await alert(t('common.error'), t('error.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  // 감정 편집 모달 열기
  const openEmotionModal = () => {
    setEditEmotion(currentEmotion || '');
    setEditIntensity(currentIntensity || 3);
    setEmotionModalVisible(true);
  };

  // 감정 저장
  const handleSaveEmotion = async () => {
    const currentMediaId = groupImages.length > 0
      ? String(groupImages[currentImageIndex]?.id)
      : id!;

    try {
      setIsSaving(true);
      await updateMediaEmotion(currentMediaId, {
        emotion: editEmotion,
        intensity: editIntensity,
      });

      // 다른 화면 (search/timeline/home)에 emotion 변경 broadcast
      // → 각 화면이 results/items 배열 in-place patch (스크롤 유지)
      useMediaUpdatesStore.getState().setEmotionUpdate(
        currentMediaId, editEmotion, editIntensity,
      );

      // 그룹 이미지 새로고침 (감정/강도 반영)
      if (media?.group_id) {
        const groupData = await timelineApi.getGroupImages(media.group_id);
        setGroupImages(groupData.items || []);
      } else {
        // 단일 이미지인 경우 미디어 새로고침
        const mediaData = await getMediaDetail(id!);
        setMedia(mediaData);
      }

      setEmotionModalVisible(false);
      await alert(t('common.done'), t('media.emotionUpdated'));
    } catch (err) {
      await alert(t('common.error'), t('error.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  // 북마크 토글
  const handleBookmarkToggle = async () => {
    const currentMediaId = groupImages.length > 0
      ? String(groupImages[currentImageIndex]?.id)
      : id!;
    const currentValue = !!(media as any)?.is_bookmarked;
    const next = !currentValue;
    // 낙관적: 즉시 broadcast (다른 화면 + 로컬 reflect)
    useMediaUpdatesStore.getState().setBookmarkUpdate(currentMediaId, next);
    setMedia(prev => prev ? ({ ...prev, is_bookmarked: next } as any) : prev);
    try {
      await patchBookmark(currentMediaId, next);
    } catch {
      // 롤백
      useMediaUpdatesStore.getState().setBookmarkUpdate(currentMediaId, currentValue);
      setMedia(prev => prev ? ({ ...prev, is_bookmarked: currentValue } as any) : prev);
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#F9FAFB' : colors.text.primary} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, isDark && styles.textLight]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {t('mediaDetail.pageTitle')}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleBookmarkToggle}
          >
            <Ionicons
              name={(media as any)?.is_bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={(media as any)?.is_bookmarked ? '#FF6A5F' : (isDark ? '#F9FAFB' : colors.text.primary)}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowShareSheet(true)}
          >
            <Ionicons name="share-outline" size={20} color={isDark ? '#F9FAFB' : colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            <Ionicons name="trash-outline" size={20} color={isDeleting ? colors.neutral[4] : '#EF4444'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={isDark ? '#F9FAFB' : colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 전체 스크롤 (이미지 + 콘텐츠) */}
      <ScrollView
        style={styles.detailContent}
        contentContainerStyle={styles.detailContentContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* Image Carousel */}
        <View style={[styles.carouselWrapper, isDark && styles.carouselWrapperDark]}>
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
                  source={img.download_url || img.thumbnail_url}
                  style={styles.carouselImage}
                  contentFit="contain"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              </View>
            ))}
          </ScrollView>

          {/* 좌측 버튼 (이전) - 웹에서만 표시 */}
          {isWeb && displayImages.length > 1 && currentImageIndex > 0 && (
            <Pressable
              style={[styles.carouselButton, styles.carouselButtonLeft]}
              onPress={goToPrevious}
            >
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </Pressable>
          )}

          {/* 우측 버튼 (다음) - 웹에서만 표시 */}
          {isWeb && displayImages.length > 1 && currentImageIndex < displayImages.length - 1 && (
            <Pressable
              style={[styles.carouselButton, styles.carouselButtonRight]}
              onPress={goToNext}
            >
              <Ionicons name="chevron-forward" size={28} color="#fff" />
            </Pressable>
          )}

          {/* Pagination Dots - 이미지 하단 오버레이 */}
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

          {/* AI Badge - 분석된 모든 이미지에 표시 */}
          {analysis?.ai_analyzed && (
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={12} color="#fff" />
              <Text style={styles.aiBadgeText}>
                {analysis.ai_reused ? 'AI (재사용)' : 'AI'}
              </Text>
            </View>
          )}
        </View>
        {/* 콘텐츠 영역 (padding 적용) */}
        <View style={styles.contentPadding}>

        {/* 감정 카드 (일러스트 + 아이콘 + 텍스트) */}
        <TouchableOpacity
          style={[styles.emotionCard, isDark && styles.emotionCardDark]}
          onPress={openEmotionModal}
          activeOpacity={0.8}
        >
          {currentEmotion ? (
            <>
              {/* 좌측: 일러스트 (카드 60% 꽉 채움) */}
              <View style={styles.emotionCardIllustWrap}>
                <Image
                  source={getEmotionIllustration(currentEmotion) || getEmotionIcon(currentEmotion, 'color')}
                  style={styles.emotionCardIllustration}
                  contentFit="cover"
                />
              </View>
              {/* 우측: 아이콘 + 텍스트 (세로 중앙) */}
              <View style={styles.emotionCardLabel}>
                {getEmotionIcon(currentEmotion, 'color') && (
                  <Image
                    source={getEmotionIcon(currentEmotion, 'color')}
                    style={styles.emotionCardIcon}
                  />
                )}
                <Text style={[styles.emotionCardText, isDark && styles.emotionCardTextDark]}>
                  {currentIntensity
                    ? `${currentIntensity <= 2 ? t('mediaDetail.intensitySlight') : currentIntensity === 3 ? t('mediaDetail.intensityNormal') : t('mediaDetail.intensityVery')} ${currentEmotion}`
                    : currentEmotion}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.emotionCardEmpty}>
              <Ionicons name="add-circle-outline" size={28} color={isDark ? '#6B7280' : '#9CA3AF'} />
              <Text style={[styles.emotionPlaceholder, isDark && styles.textSecondaryDark]}>
                감정을 선택해주세요
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* AI 일기 제목 + mood 배지 */}
        {media.title && (
          <View style={[styles.userSection, isDark && styles.sectionBorderDark]}>
            <View style={styles.titleRow}>
              <Text style={[styles.titleText, isDark && styles.textLight, { flex: 1 }]}>{media.title}</Text>
              {media.mood && (
                <View style={[styles.moodBadge, isDark && styles.moodBadgeDark]}>
                  <Text style={[styles.moodBadgeText, isDark && styles.moodBadgeTextDark]}>{media.mood}</Text>
                </View>
              )}
            </View>
            {media.ai_provider && (
              <View style={styles.aiProviderRow}>
                <Ionicons name="sparkles" size={12} color={isDark ? '#9CA3AF' : colors.neutral[5]} />
                <Text style={[styles.aiProviderText, isDark && styles.textTertiaryDark]}>
                  AI 생성
                </Text>
              </View>
            )}
            <AiNotice text={t('ai.draftNotice')} fontSize={12} isDark={isDark} />
          </View>
        )}

        {/* AI 일기 재생성 버튼 */}
        <View style={[styles.userSection, isDark && styles.sectionBorderDark]}>
          <TouchableOpacity
            style={[
              styles.regenerateButton,
              isGeneratingDiary && styles.regenerateButtonDisabled,
              isDark && styles.regenerateButtonDark,
            ]}
            onPress={handleRegenerateDiary}
            disabled={isGeneratingDiary}
          >
            <Ionicons
              name={isGeneratingDiary ? 'hourglass-outline' : 'refresh'}
              size={16}
              color={isGeneratingDiary ? '#9CA3AF' : '#fff'}
            />
            <Text style={[
              styles.regenerateButtonText,
              isGeneratingDiary && styles.regenerateButtonTextDisabled,
            ]}>
              {isGeneratingDiary ? t('mediaDetail.generating') : t('mediaDetail.regenerateDiary')}
            </Text>
          </TouchableOpacity>
          {media.group_id && !isCurrentImagePrimary && (
            <Text style={[styles.hintText, isDark && styles.textTertiaryDark]}>
              💡 {t('mediaDetail.groupDiaryHint')}
            </Text>
          )}
        </View>

        {/* 편집 버튼 영역 */}
        <View style={[styles.editButtonsSection, isDark && styles.sectionBorderDark]}>
          {/* 캡션 편집 - 항상 가능 */}
          <TouchableOpacity
            style={[styles.editActionButton, isDark && styles.editActionButtonDark]}
            onPress={openCaptionEditModal}
          >
            <Ionicons name="chatbubble-outline" size={16} color={isDark ? '#F9FAFB' : colors.text.primary} />
            <Text style={[styles.editActionButtonText, isDark && styles.textLight]}>{t('mediaDetail.captionEdit')}</Text>
          </TouchableOpacity>

          {/* 일기 편집 - 메인 또는 개별 이미지만 */}
          {isCurrentImagePrimary ? (
            <TouchableOpacity
              style={[styles.editActionButton, isDark && styles.editActionButtonDark]}
              onPress={openDiaryEditModal}
            >
              <Ionicons name="create-outline" size={16} color={isDark ? '#F9FAFB' : colors.text.primary} />
              <Text style={[styles.editActionButtonText, isDark && styles.textLight]}>{t('mediaDetail.diaryEdit')}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.hintText, isDark && styles.textTertiaryDark]}>
              💡 {t('mediaDetail.diaryEditHint')}
            </Text>
          )}
        </View>

        {/* 내용 */}
        {media.content && (
          <View style={[styles.userSection, isDark && styles.sectionBorderDark]}>
            <Text style={[styles.userSectionLabel, isDark && styles.textSecondaryDark]}>{t('mediaDetail.content')}</Text>
            <Text style={[styles.contentText, isDark && styles.textLight]}>{media.content}</Text>
          </View>
        )}

        {/* 메모 */}
        {media.memo && (
          <View style={[styles.userSection, isDark && styles.sectionBorderDark]}>
            <Text style={[styles.userSectionLabel, isDark && styles.textSecondaryDark]}>메모</Text>
            <Text style={[styles.memoText, isDark && styles.textLight]}>{media.memo}</Text>
          </View>
        )}

        {/* 등록일 */}
        <View style={[styles.userSection, isDark && styles.sectionBorderDark]}>
          <Text style={[styles.userSectionLabel, isDark && styles.textSecondaryDark]}>등록일</Text>
          <Text style={[styles.dateText, isDark && styles.textSecondaryDark]}>
            {formatDateTime(media.created_at)}
          </Text>
        </View>

        {/* AI Caption */}
        {analysis?.caption && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>✨</Text>
              <Text style={[styles.sectionTitle, isDark && styles.textLight]}>AI Caption</Text>
            </View>
            <Text style={[styles.captionText, isDark && styles.captionTextDark]}>{analysis.caption_ko || analysis.caption}</Text>
            <AiNotice text={t('ai.captionNotice')} isDark={isDark} />
          </View>
        )}

        {/* Scene Type */}
        {analysis?.scene_type && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📋</Text>
              <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Scene Type</Text>
            </View>
            <View style={styles.chipContainer}>
              <View style={[styles.chip, isDark && styles.chipDark]}>
                <Text style={[styles.chipText, isDark && styles.textLight]}>
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
              <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Tags</Text>
            </View>
            <View style={styles.tagsContainer}>
              {(analysis.tags_ko && analysis.tags_ko.length > 0 ? analysis.tags_ko : analysis.tags).map((tag, index) => (
                <View key={index} style={[styles.tagChip, isDark && styles.chipDark]}>
                  <Text style={[styles.tagText, isDark && styles.textLight]}>{tag}</Text>
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
              <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Detected Text (OCR)</Text>
            </View>
            <View style={[styles.ocrBox, isDark && styles.boxDark]}>
              <Text style={[styles.ocrText, isDark && styles.textLight]}>{analysis.ocr_text}</Text>
            </View>
          </View>
        )}

        {/* Photo Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📷</Text>
            <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Photo Details</Text>
          </View>

          <View style={[styles.detailsContainer, isDark && styles.boxDark]}>
            {/* 파일 크기 - 항상 표시 */}
            {media.metadata?.size && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, isDark && styles.textSecondaryDark]}>{t('exif.fileSize')}</Text>
                <Text style={[styles.detailValue, isDark && styles.textLight]}>
                  {formatFileSize(media.metadata.size)}
                </Text>
              </View>
            )}

            {/* 해상도 - 항상 표시 */}
            {(analysis?.exif?.width || media.metadata?.exif?.width) && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, isDark && styles.textSecondaryDark]}>{t('exif.resolution')}</Text>
                <Text style={[styles.detailValue, isDark && styles.textLight]}>
                  {analysis?.exif?.width || media.metadata?.exif?.width} x {analysis?.exif?.height || media.metadata?.exif?.height}
                </Text>
              </View>
            )}

            {/* 촬영일 */}
            {(analysis?.taken_at || media.taken_at) && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, isDark && styles.textSecondaryDark]}>{t('exif.taken')}</Text>
                <Text style={[styles.detailValue, isDark && styles.textLight]}>
                  {formatDateTime(analysis?.taken_at || media.taken_at!)}
                </Text>
              </View>
            )}

            {/* EXIF 카메라 정보 있는 경우 */}
            {(analysis?.exif?.camera_model || analysis?.exif?.aperture || analysis?.exif?.iso || analysis?.exif?.shutter_speed || analysis?.exif?.gps) ? (
              <>
                {/* 카메라 모델 */}
                {analysis?.exif?.camera_model && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, isDark && styles.textSecondaryDark]}>{t('exif.camera')}</Text>
                    <Text style={[styles.detailValue, isDark && styles.textLight]}>
                      {`${analysis.exif.camera_make || ''} ${analysis.exif.camera_model}`.trim()}
                    </Text>
                  </View>
                )}

                {/* 카메라 설정 (조리개/셔터/ISO) */}
                {(analysis.exif.aperture || analysis.exif.shutter_speed || analysis.exif.iso) && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, isDark && styles.textSecondaryDark]}>{t('exif.settings')}</Text>
                    <Text style={[styles.detailValue, isDark && styles.textLight]}>
                      {[
                        analysis.exif.aperture && formatAperture(analysis.exif.aperture),
                        analysis.exif.shutter_speed && formatShutterSpeed(analysis.exif.shutter_speed),
                        analysis.exif.iso && `ISO ${analysis.exif.iso}`,
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                )}

                {/* 초점거리 */}
                {analysis.exif.focal_length && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, isDark && styles.textSecondaryDark]}>{t('exif.focalLength')}</Text>
                    <Text style={[styles.detailValue, isDark && styles.textLight]}>
                      {analysis.exif.focal_length.toFixed(0)}mm
                    </Text>
                  </View>
                )}

                {/* 플래시 */}
                {analysis.exif.flash !== null && analysis.exif.flash !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, isDark && styles.textSecondaryDark]}>{t('exif.flash')}</Text>
                    <Text style={[styles.detailValue, isDark && styles.textLight]}>
                      {analysis.exif.flash ? t('exif.flashFired') : t('exif.flashNotFired')}
                    </Text>
                  </View>
                )}

                {/* GPS 위치 */}
                {analysis.exif.gps && (
                  <TouchableOpacity
                    style={styles.detailRow}
                    onPress={() => openMapWithGPS(analysis.exif!.gps!.latitude, analysis.exif!.gps!.longitude)}
                  >
                    <Text style={[styles.detailLabel, isDark && styles.textSecondaryDark]}>{t('exif.location')}</Text>
                    <View style={styles.locationValueColumn}>
                      <View style={styles.locationValue}>
                        <Ionicons name="location" size={14} color={colors.brand.primary} />
                        {loadingLocation ? (
                          <ActivityIndicator size="small" color={colors.brand.primary} style={{ marginLeft: 4 }} />
                        ) : locationName ? (
                          <Text style={[styles.detailValueLink, isDark && styles.textLight]}>
                            {locationName}
                          </Text>
                        ) : (
                          <Text style={[styles.detailValueLink, isDark && styles.textLight]}>
                            {analysis.exif.gps.latitude.toFixed(4)}, {analysis.exif.gps.longitude.toFixed(4)}
                          </Text>
                        )}
                        <Ionicons name="open-outline" size={14} color={colors.brand.primary} />
                      </View>
                      {locationName && (
                        <Text style={[styles.coordsText, isDark && styles.textTertiaryDark]}>
                          {analysis.exif.gps.latitude.toFixed(4)}, {analysis.exif.gps.longitude.toFixed(4)}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}

                {/* 지도에서 보기 버튼 */}
                {analysis.exif.gps && (
                  <TouchableOpacity
                    style={[styles.openMapButton, isDark && styles.openMapButtonDark]}
                    onPress={() => {
                      const { latitude, longitude } = analysis.exif!.gps!;
                      const url = Platform.select({
                        ios: `maps://app?ll=${latitude},${longitude}`,
                        android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
                        default: `https://maps.google.com/?q=${latitude},${longitude}`,
                      })!;
                      Linking.openURL(url);
                    }}
                  >
                    <Text style={styles.openMapButtonText}>{'\uD83D\uDCCD'} 지도에서 보기</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              /* EXIF 카메라 정보 없는 경우 - 안내 메시지 */
              <View style={[styles.noExifContainer, isDark && styles.noExifContainerDark]}>
                <Ionicons name="information-circle-outline" size={20} color={isDark ? '#9CA3AF' : colors.neutral[5]} />
                <Text style={[styles.noExifTitle, isDark && styles.textSecondaryDark]}>
                  {t('exif.noInfo')}
                </Text>
                <Text style={[styles.noExifDesc, isDark && styles.textTertiaryDark]}>
                  {t('exif.noInfoDesc')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Pending Analysis */}
        {!analysis?.caption && (
          <View style={styles.section}>
            <View style={[styles.pendingBox, isDark && styles.boxDark]}>
              <Ionicons name="hourglass-outline" size={24} color={isDark ? '#9CA3AF' : colors.neutral[5]} />
              <Text style={[styles.pendingText, isDark && styles.textSecondaryDark]}>AI 분석 대기 중...</Text>
            </View>
          </View>
        )}

        {/* Bottom Spacer for button */}
        <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Confirm Button - Fixed at bottom */}
      <View style={[styles.bottomContainer, isDark && styles.bottomContainerDark, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>확인</Text>
        </TouchableOpacity>
      </View>

      {/* 일기 편집 모달 */}
      <Modal
        visible={diaryEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDiaryEditModalVisible(false)}
      >
        {isWeb ? (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
              <Text style={[styles.modalTitle, isDark && styles.textLight]}>{t('mediaDetail.diaryEdit')}</Text>
              <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>제목</Text>
              <TextInput
                style={[styles.textInput, isDark && styles.textInputDark]}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder={t('mediaDetail.titlePlaceholder')}
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                maxLength={50}
              />
              <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>내용</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, isDark && styles.textInputDark]}
                value={editContent}
                onChangeText={setEditContent}
                placeholder={t('mediaDetail.contentPlaceholder')}
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>{t('mediaDetail.mood')}</Text>
              <View style={styles.moodSelector}>
                {MOOD_OPTIONS.map((mood) => (
                  <TouchableOpacity
                    key={mood}
                    style={[
                      styles.moodOption,
                      isDark && styles.moodOptionDark,
                      editMood === mood && styles.moodOptionSelected,
                    ]}
                    onPress={() => setEditMood(mood)}
                  >
                    <Text style={[styles.moodOptionText, isDark && styles.textSecondaryDark, editMood === mood && styles.moodOptionTextSelected]}>
                      #{mood}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.cancelButton, isDark && styles.cancelButtonDark]} onPress={() => setDiaryEditModalVisible(false)}>
                  <Text style={[styles.cancelButtonText, isDark && styles.textSecondaryDark]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, isSaving && styles.buttonDisabled]} onPress={handleSaveDiary} disabled={isSaving}>
                  <Text style={styles.saveButtonText}>{isSaving ? t('mediaDetail.saving') : t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                <Text style={[styles.modalTitle, isDark && styles.textLight]}>{t('mediaDetail.diaryEdit')}</Text>
                <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>제목</Text>
                <TextInput
                  style={[styles.textInput, isDark && styles.textInputDark]}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder={t('mediaDetail.titlePlaceholder')}
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  maxLength={50}
                />
                <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>내용</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, isDark && styles.textInputDark]}
                  value={editContent}
                  onChangeText={setEditContent}
                  placeholder={t('mediaDetail.contentPlaceholder')}
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>{t('mediaDetail.mood')}</Text>
                <View style={styles.moodSelector}>
                  {MOOD_OPTIONS.map((mood) => (
                    <TouchableOpacity
                      key={mood}
                      style={[styles.moodOption, isDark && styles.moodOptionDark, editMood === mood && styles.moodOptionSelected]}
                      onPress={() => setEditMood(mood)}
                    >
                      <Text style={[styles.moodOptionText, isDark && styles.textSecondaryDark, editMood === mood && styles.moodOptionTextSelected]}>
                        #{mood}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.cancelButton, isDark && styles.cancelButtonDark]} onPress={() => setDiaryEditModalVisible(false)}>
                    <Text style={[styles.cancelButtonText, isDark && styles.textSecondaryDark]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveButton, isSaving && styles.buttonDisabled]} onPress={handleSaveDiary} disabled={isSaving}>
                    <Text style={styles.saveButtonText}>{isSaving ? t('mediaDetail.saving') : t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        )}
      </Modal>

      {/* 캡션 편집 모달 */}
      <Modal
        visible={captionEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCaptionEditModalVisible(false)}
      >
        {isWeb ? (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
              <Text style={[styles.modalTitle, isDark && styles.textLight]}>{t('mediaDetail.captionEdit')}</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, isDark && styles.textInputDark]}
                value={editCaption}
                onChangeText={setEditCaption}
                placeholder={t('mediaDetail.captionPlaceholder')}
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.cancelButton, isDark && styles.cancelButtonDark]} onPress={() => setCaptionEditModalVisible(false)}>
                  <Text style={[styles.cancelButtonText, isDark && styles.textSecondaryDark]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, isSaving && styles.buttonDisabled]} onPress={handleSaveCaption} disabled={isSaving}>
                  <Text style={styles.saveButtonText}>{isSaving ? t('mediaDetail.saving') : t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                <Text style={[styles.modalTitle, isDark && styles.textLight]}>{t('mediaDetail.captionEdit')}</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, isDark && styles.textInputDark]}
                  value={editCaption}
                  onChangeText={setEditCaption}
                  placeholder={t('mediaDetail.captionPlaceholder')}
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.cancelButton, isDark && styles.cancelButtonDark]} onPress={() => setCaptionEditModalVisible(false)}>
                    <Text style={[styles.cancelButtonText, isDark && styles.textSecondaryDark]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveButton, isSaving && styles.buttonDisabled]} onPress={handleSaveCaption} disabled={isSaving}>
                    <Text style={styles.saveButtonText}>{isSaving ? t('mediaDetail.saving') : t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        )}
      </Modal>

      {/* 감정 편집 모달 */}
      <Modal
        visible={emotionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEmotionModalVisible(false)}
      >
        {isWeb ? (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.emotionModalContent, isDark && styles.modalContentDark]}>
              <Text style={[styles.modalTitle, isDark && styles.textLight]}>{t('mediaDetail.emotionQuestion')}</Text>
              <View style={styles.emotionGrid}>
                {EMOTIONS.map((emotion) => {
                  const isSelected = editEmotion === emotion.nameKo;
                  return (
                    <TouchableOpacity
                      key={emotion.key}
                      style={[styles.emotionOption, isDark && styles.emotionOptionDark, isSelected && styles.emotionOptionSelected]}
                      onPress={() => setEditEmotion(emotion.nameKo)}
                    >
                      <Image
                        source={emotion.icons.color}
                        style={styles.emotionOptionIcon}
                      />
                      <Text style={[styles.emotionOptionName, isDark && styles.textSecondaryDark, isSelected && styles.emotionOptionNameSelected]}>
                        {emotion.nameKo}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.intensityLabel, isDark && styles.textSecondaryDark]}>{t('mediaDetail.intensityLabel')}</Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={5}
                step={1}
                value={editIntensity}
                onValueChange={(value) => setEditIntensity(value)}
                minimumTrackTintColor={colors.brand.primary}
                maximumTrackTintColor={isDark ? '#374151' : '#ddd'}
                thumbTintColor={colors.brand.primary}
              />
              <View style={styles.sliderLabels}>
                <Text style={[styles.sliderLabelText, isDark && styles.textSecondaryDark]}>{t('mediaDetail.intensityLow')}</Text>
                <Text style={[styles.sliderLabelText, isDark && styles.textSecondaryDark]}>{t('mediaDetail.intensityMid')}</Text>
                <Text style={[styles.sliderLabelText, isDark && styles.textSecondaryDark]}>{t('mediaDetail.intensityHigh')}</Text>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.cancelButton, isDark && styles.cancelButtonDark]} onPress={() => setEmotionModalVisible(false)}>
                  <Text style={[styles.cancelButtonText, isDark && styles.textSecondaryDark]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, isSaving && styles.buttonDisabled]} onPress={handleSaveEmotion} disabled={isSaving}>
                  <Text style={styles.saveButtonText}>{isSaving ? t('mediaDetail.saving') : t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, styles.emotionModalContent, isDark && styles.modalContentDark]}>
                <Text style={[styles.modalTitle, isDark && styles.textLight]}>{t('mediaDetail.emotionQuestion')}</Text>
                <View style={styles.emotionGrid}>
                  {EMOTIONS.map((emotion) => {
                    const isSelected = editEmotion === emotion.nameKo;
                    return (
                      <TouchableOpacity
                        key={emotion.key}
                        style={[styles.emotionOption, isDark && styles.emotionOptionDark, isSelected && styles.emotionOptionSelected]}
                        onPress={() => setEditEmotion(emotion.nameKo)}
                      >
                        <Image
                          source={emotion.icons.color}
                          style={styles.emotionOptionIcon}
                        />
                        <Text style={[styles.emotionOptionName, isDark && styles.textSecondaryDark, isSelected && styles.emotionOptionNameSelected]}>
                          {emotion.nameKo}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={[styles.intensityLabel, isDark && styles.textSecondaryDark]}>{t('mediaDetail.intensityLabel')}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={5}
                  step={1}
                  value={editIntensity}
                  onValueChange={(value) => setEditIntensity(value)}
                  minimumTrackTintColor={colors.brand.primary}
                  maximumTrackTintColor={isDark ? '#374151' : '#ddd'}
                  thumbTintColor={colors.brand.primary}
                />
                <View style={styles.sliderLabels}>
                  <Text style={[styles.sliderLabelText, isDark && styles.textSecondaryDark]}>{t('mediaDetail.intensityLow')}</Text>
                  <Text style={[styles.sliderLabelText, isDark && styles.textSecondaryDark]}>{t('mediaDetail.intensityMid')}</Text>
                  <Text style={[styles.sliderLabelText, isDark && styles.textSecondaryDark]}>{t('mediaDetail.intensityHigh')}</Text>
                </View>
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.cancelButton, isDark && styles.cancelButtonDark]} onPress={() => setEmotionModalVisible(false)}>
                    <Text style={[styles.cancelButtonText, isDark && styles.textSecondaryDark]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveButton, isSaving && styles.buttonDisabled]} onPress={handleSaveEmotion} disabled={isSaving}>
                    <Text style={styles.saveButtonText}>{isSaving ? t('mediaDetail.saving') : t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        )}
      </Modal>

      {/* Share */}
      <View style={styles.offscreen}>
        <ShareCardView
          ref={shareCardRef}
          imageUrl={media?.download_url || ''}
          caption={analysis?.caption_ko || analysis?.caption || ''}
        />
      </View>

      <ShareSheet
        visible={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        imageUrl={media?.download_url || ''}
        caption={analysis?.caption_ko || analysis?.caption}
        diary={media?.title && media?.content ? { title: media.title, content: media.content } : null}
        cardViewRef={shareCardRef}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  textLight: {
    color: '#F9FAFB',
  },
  textSecondaryDark: {
    color: '#9CA3AF',
  },
  textTertiaryDark: {
    color: '#6B7280',
  },
  noExifContainer: {
    backgroundColor: colors.neutral[1],
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  noExifContainerDark: {
    backgroundColor: '#374151',
  },
  noExifTitle: {
    fontSize: 14,
    color: colors.neutral[5],
    fontWeight: '500',
    marginTop: 4,
  },
  noExifDesc: {
    fontSize: 12,
    color: colors.neutral[4],
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 2,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.neutral[5],
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
  headerDark: {
    borderBottomColor: '#374151',
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
    textAlign: 'left',
    marginLeft: 4,
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
    height: CAROUSEL_IMAGE_HEIGHT,
    backgroundColor: colors.neutral[1],
    position: 'relative',
    overflow: 'hidden',
  },
  carouselWrapperDark: {
    backgroundColor: '#1F2937',
  },
  carouselImageContainer: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_IMAGE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselImage: {
    width: CAROUSEL_IMAGE_WIDTH,
    height: CAROUSEL_IMAGE_HEIGHT,
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
    paddingBottom: 100,
  },
  contentPadding: {
    paddingHorizontal: 20,
    paddingVertical: 20,
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
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  aiBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  captionTextDark: {
    backgroundColor: '#1F2937',
    color: '#F9FAFB',
  },
  chipDark: {
    backgroundColor: '#1F2937',
  },
  boxDark: {
    backgroundColor: '#1F2937',
  },
  sectionBorderDark: {
    borderBottomColor: '#374151',
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
  locationValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationValueColumn: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
  },
  coordsText: {
    fontSize: 11,
    color: colors.neutral[4],
  },
  openMapButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    alignSelf: 'flex-start',
  },
  openMapButtonDark: {
    borderColor: '#FF8A82',
  },
  openMapButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.primary,
  },
  detailValueLink: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.brand.primary,
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
  // 감정 카드 스타일
  emotionCard: {
    backgroundColor: '#FEF7F0',
    borderRadius: 16,
    height: 210,
    marginBottom: 16,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  emotionCardDark: {
    backgroundColor: '#2A2520',
  },
  emotionCardIllustWrap: {
    width: '48%',
    height: 210,
    overflow: 'hidden',
  },
  emotionCardIllustration: {
    width: '100%',
    height: '100%',
  },
  emotionCardLabel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emotionCardIcon: {
    width: 30,
    height: 30,
  },
  emotionCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B5C4F',
    marginTop: 4,
  },
  emotionCardTextDark: {
    color: '#D1C4B2',
  },
  emotionCardEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  moodBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  moodBadgeDark: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  moodBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366F1',
  },
  moodBadgeTextDark: {
    color: '#A5B4FC',
  },
  aiProviderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  aiProviderText: {
    fontSize: 11,
    color: colors.neutral[5],
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  regenerateButtonDark: {
    backgroundColor: '#4F46E5',
  },
  regenerateButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  regenerateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  regenerateButtonTextDisabled: {
    color: '#9CA3AF',
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
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
  bottomContainerDark: {
    backgroundColor: '#111827',
    borderTopColor: '#374151',
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
  // 편집 버튼 섹션
  editButtonsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[2],
    marginBottom: 8,
  },
  editActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.neutral[2],
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  editActionButtonDark: {
    backgroundColor: '#374151',
  },
  editActionButtonText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalContentDark: {
    backgroundColor: '#1F2937',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: colors.text.primary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
    color: colors.text.secondary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.neutral[3],
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.background,
  },
  textInputDark: {
    borderColor: '#374151',
    backgroundColor: '#111827',
    color: '#F9FAFB',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  moodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  moodOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.neutral[2],
  },
  moodOptionDark: {
    backgroundColor: '#374151',
  },
  moodOptionSelected: {
    backgroundColor: colors.brand.primary,
  },
  moodOptionText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  moodOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.neutral[2],
    alignItems: 'center',
  },
  cancelButtonDark: {
    backgroundColor: '#374151',
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // 감정 편집 관련 스타일
  emotionPlaceholder: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  emotionModalContent: {
    maxHeight: '85%',
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  emotionOption: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  emotionOptionDark: {
    backgroundColor: '#1F2937',
  },
  emotionOptionSelected: {
    borderColor: '#FF6B6B',
  },
  emotionOptionIcon: {
    width: 32,
    height: 32,
  },
  emotionOptionName: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  // 감정 표시 영역 스타일
  // 감정 편집 플레이스홀더
  emotionOptionNameSelected: {
    color: '#1F2937',
    fontWeight: '600',
  },
  intensityLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  sliderLabelText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
});
