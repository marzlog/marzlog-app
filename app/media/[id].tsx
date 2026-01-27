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
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMediaDetail, getMediaAnalysis, deleteMedia } from '@/src/api/media';
import { timelineApi, GroupImageItem } from '@/src/api/timeline';
import { colors } from '@/src/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useDialog } from '@/src/components/ui/Dialog';
import { t } from '@/src/i18n';
import type { MediaDetail, MediaAnalysis } from '@/src/types/media';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 40;
const CAROUSEL_IMAGE_WIDTH = SCREEN_WIDTH;
const CAROUSEL_IMAGE_HEIGHT = SCREEN_HEIGHT * 0.45; // 화면 높이의 45%

export default function MediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
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
          console.log('[MediaDetail] Analysis API error:', err);
          return null;
        }),
      ]);


      setMedia(mediaData);
      setAnalysis(analysisData);

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
          console.log('[MediaDetail] Failed to load group images:', groupErr);
        }
      }
    } catch (err) {
      console.error('Load error:', err);
      setError(err instanceof Error ? err.message : '로딩 실패');
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
            'User-Agent': 'Marzlog/1.0',
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
      console.error('Reverse geocoding error:', error);
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
        <Text style={[styles.loadingText, isDark && styles.textLight]}>불러오는 중...</Text>
      </View>
    );
  }

  if (error || !media) {
    return (
      <View style={[styles.centered, isDark && styles.containerDark, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={[styles.errorText, isDark && styles.textLight]}>{error || '사진을 찾을 수 없습니다'}</Text>
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

  // 삭제 처리
  const handleDelete = async () => {
    const confirmed = await confirmDelete();
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteMedia(id!);
      router.replace('/(tabs)');
    } catch (err) {
      console.error('[MediaDetail] Delete error:', err);
      await alert('삭제 실패', '잠시 후에 다시 시도해 주세요.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#F9FAFB' : colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.textLight]}>상세보기</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            <Ionicons name="trash-outline" size={20} color={isDeleting ? colors.neutral[4] : '#EF4444'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleEdit}>
            <Ionicons name="pencil" size={20} color={isDark ? '#F9FAFB' : colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={isDark ? '#F9FAFB' : colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Image Carousel - 세로 스크롤과 분리하여 스와이프 충돌 방지 */}
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

      {/* 분석 정보 등 나머지 컨텐츠 */}
      <ScrollView
        style={styles.detailContent}
        contentContainerStyle={styles.detailContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 감정 + 강도 */}
        {media.emotion && (
          <View style={[styles.emotionSection, isDark && styles.sectionBorderDark]}>
            <Text style={[styles.emotionText, isDark && styles.textLight]}>
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
          <View style={[styles.userSection, isDark && styles.sectionBorderDark]}>
            <Text style={[styles.titleText, isDark && styles.textLight]}>{media.title}</Text>
          </View>
        )}

        {/* 내용 */}
        {media.content && (
          <View style={[styles.userSection, isDark && styles.sectionBorderDark]}>
            <Text style={[styles.userSectionLabel, isDark && styles.textSecondaryDark]}>내용</Text>
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
            <Text style={[styles.captionText, isDark && styles.captionTextDark]}>{analysis.caption}</Text>
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
              {analysis.tags.map((tag, index) => (
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
            {(analysis?.exif?.camera_model || analysis?.exif?.aperture || analysis?.exif?.iso || analysis?.exif?.shutter_speed) ? (
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
      </ScrollView>

      {/* Confirm Button - Fixed at bottom */}
      <View style={[styles.bottomContainer, isDark && styles.bottomContainerDark, { paddingBottom: Math.max(insets.bottom, 20) }]}>
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
  containerDark: {
    backgroundColor: '#111827',
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
});
