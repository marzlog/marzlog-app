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
  Linking,
  Modal,
  TextInput,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Image, type ImageLoadEventData } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMediaDetail, getMediaAnalysis, deleteMedia, generateDiary, triggerOcr, submitDeviceOcr, updateCaption, updateDiary, updateMediaEmotion, patchBookmark } from '@/src/api/media';
import { runDeviceOcr } from '@/src/services/deviceOcr';
import { useMediaUpdatesStore } from '@/src/store/mediaUpdatesStore';
import { copyText, saveImageToGallery } from '@/src/utils/copyUtils';
import { timelineApi, GroupImageItem } from '@/src/api/timeline';
import { colors } from '@/src/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useAuthStore } from '@/src/store/authStore';
import { useTimelineStore } from '@/src/store/timelineStore';
import { useDialog } from '@/src/components/ui/Dialog';
import { t } from '@/src/i18n';
import { getErrorMessage } from '@/src/utils/errorMessages';
import { captureError } from '@/src/utils/sentry';
import ErrorView from '@/src/components/common/ErrorView';
import { AiNotice } from '@/src/components/common/AiNotice';
import type { MediaDetail, MediaAnalysis } from '@/src/types/media';
import { EMOTIONS, getEmotionByName, getEmotionIcon, getEmotionIllustration, EMOTION_KEY_TO_NAME, emotionLabel } from '@/constants/emotions';
import { intensityAdverbKey } from '@/src/utils/intensity';
import { IntensitySlider } from '@/src/components/upload/IntensitySlider';
import { ShareSheet } from '@/src/components/media/ShareSheet';
import { ShareCardView } from '@/src/components/media/ShareCardView';
import FullscreenImageViewer from '@/src/components/media/FullscreenImageViewer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 40;
const CAROUSEL_IMAGE_WIDTH = SCREEN_WIDTH;
const CAROUSEL_IMAGE_HEIGHT = SCREEN_HEIGHT * 0.45; // 화면 높이의 45%
// 단일 이미지 비율 자동높이 경로의 세로 상한 (극단 세로사진이 화면을 넘기지 않도록 캡)
const CAROUSEL_SINGLE_MAX_HEIGHT = SCREEN_HEIGHT * 0.7;
const isWeb = Platform.OS === 'web';

// ── 스택 카드 뷰어 파라미터 (그룹 2장 이상에서만 사용) ──
// 카드 폭은 기존 CAROUSEL_IMAGE_WIDTH에서 뒤 카드가 삐져나올 여백을 뺀 값.
// 스택은 좌측 기준 정렬 — 남는 폭 전부를 우측 뒤 카드 노출에 쓴다.
const STACK_CARD_WIDTH = CAROUSEL_IMAGE_WIDTH - 104;
const STACK_CARD_HEIGHT = CAROUSEL_IMAGE_HEIGHT;
const STACK_PADDING_LEFT = 20;  // 앞 카드 좌측 여백
const STACK_VISIBLE = 4;        // 앞 카드 포함 최대 4장(뒤 3장)까지만 시각화
const STACK_MAX_DEPTH = STACK_VISIBLE - 1; // 뒤 스택 최대 depth (= 3)
// zIndex 명시 — 렌더 순서 의존 금지. 진입하는 prev(rel -1)가 앞 카드를 덮는다.
const STACK_Z_PREV = 100;
const STACK_Z_FRONT = 90;
const STACK_Z_STEP = 10;
const STACK_OFFSET = 24;        // 뒤 카드 1장당 우측 어긋남(px)
const STACK_SCALE_STEP = 0.065; // 뒤 카드 1장당 축소량
const STACK_OPACITY_STEP = 0.14;// 뒤 카드 1장당 투명도 감소 (3장까지라 완만하게)
// 우측 가용 폭 = SCREEN_WIDTH - (STACK_PADDING_LEFT + STACK_CARD_WIDTH) = 84px (화면폭 무관 상수).
// transformOrigin 'right center' 로 축소가 우측 끝을 고정하므로 돌출량 = offset 그대로:
// 24 / 48 / 72px < 84px → 3장 계단이 화면 안에 수납된다.
const SWIPE_THRESHOLD = STACK_CARD_WIDTH * 0.25; // 이 이상 끌면 확정
// 거리 미달이어도 이 속도(px/s) 이상으로 튕기면 방향대로 전환 (표준 플릭)
const SWIPE_VELOCITY_THRESHOLD = 350;
// 빠른 플릭은 나가는 시간을 줄여 손끝 속도와 어긋나지 않게 한다
const FAST_FLICK_VELOCITY = 1200;
const SWIPE_OUT_DURATION = 180;
const SWIPE_OUT_DURATION_FAST = 120;
const CANCEL_DURATION = 140;     // 임계 미달 원위치 복귀
const RUBBER_BAND_FACTOR = 0.25; // 첫/마지막에서의 저항 계수
// 이전 카드가 화면 밖 좌측에서 대기하는 거리. dragX 가 이 값이 되면 정확히 앞자리(0)에 놓인다.
const PREV_TRAVEL = STACK_CARD_WIDTH + STACK_PADDING_LEFT + 24;
// 전환·복귀 전부 withTiming — 스프링 출렁임(overshoot) 제거

// 백엔드 diary_generator.py:31-40의 fallback 문구와 동기.
// 백엔드 문구 변경 시 이 배열도 갱신 필요 (B-REGEN-FALLBACK-SYNC).
const DIARY_FALLBACK_PREFIXES = [
  'AI 일기를 생성하지 못했',
  'Could not generate the diary',
] as const;

/**
 * "부사 + 감정어" 표기 조합 (예: 꽤 기쁨 / quite Joy).
 * - intensity 5-6(부사 없음)·범위 밖·null 이면 감정어만 반환
 * - 감정어는 emotionLabel로 현재 언어에 맞게 표시(저장 정본은 한글 nameKo 유지)
 * - EMOTION_NAME_TO_KEY 매핑에 없는 문자열은 원값 그대로 폴백
 */
function emotionWithIntensity(
  emotion: string | null | undefined,
  intensity: number | null | undefined,
): string {
  if (!emotion) return '';
  const data = getEmotionByName(emotion);
  const label = data ? emotionLabel(data) : emotion;
  const adverbKey = intensityAdverbKey(intensity ?? 0);
  return adverbKey ? `${t(adverbKey)} ${label}` : label;
}

/**
 * mood 선택 상태 비교. 대소문자를 무시한다.
 * 저장 정본은 워커 프롬프트 어휘(소문자: 'peaceful' / 'bình yên')이지만,
 * 앱 선택지가 한때 대문자('Peaceful')였던 시기에 저장된 레코드가 남아 있어
 * 정확 비교로는 기존 일기의 mood 가 미선택으로 보인다. (B-MOOD-VOCAB-DRIFT)
 */
function isSameMood(a: string, b: string): boolean {
  return a.toLocaleLowerCase() === b.toLocaleLowerCase();
}

type StackImage = { id?: string | number; download_url?: string; thumbnail_url?: string };

/**
 * 스택 카드 뷰어 — 현재 사진이 맨 앞, 뒤 카드들이 우측으로 어긋나 겹쳐 남은 장수를 보여준다.
 *
 * 구조: 슬롯(front/prev/back) 분리 렌더를 폐기하고 **단일 배열 + id 키**로 렌더한다.
 * 각 카드는 자기 relIndex(= i - currentIndex)만 알면 pose가 결정되고, 커밋 후에는
 * 같은 엘리먼트가 새 relIndex의 pose로 이동할 뿐이라 **리마운트가 0**이다
 * (슬롯 분리 구조에서 같은 사진이 prev→front로 옮겨갈 때 발생하던 언마운트/크로스페이드 잔상 제거).
 *
 * pose 규약 (dragX 하나로 전 카드 보간):
 *   rel = -1  좌측 화면 밖 대기 → dragX 따라 진입 (우 스와이프의 '이전 카드')
 *   rel =  0  앞 카드. 좌 드래그는 손끝 추종, 우 드래그는 depth1로 후퇴
 *   rel >= 1  뒤 스택. 좌 드래그(p)로 승격, 우 드래그(q)로 강등
 *   d >= STACK_MAX_DEPTH+1 이면 opacity 0 (스택 밖 잔상 제거)
 *
 * 전환 확정 시 dragX 목표를 양방향 모두 ±PREV_TRAVEL 로 두어, 커밋 직전 그림과
 * 커밋 직후(dragX=0, 새 index) 그림이 모든 카드에서 동일해진다 → 프레임 갭에도 화면 불변.
 */
function StackCard({
  img,
  absIndex,
  dragX,
  indexSV,
}: {
  img: StackImage;
  absIndex: number;
  dragX: SharedValue<number>;
  indexSV: SharedValue<number>;
}) {
  // pose 는 전적으로 UI 스레드 상태(indexSV, dragX)로만 계산한다.
  // absIndex 는 커밋 때 바뀌지 않는 prop 이므로, React 리렌더 타이밍과 무관하게
  // 항상 정합한 그림이 그려진다(리렌더-리셋 프레임 불일치 원천 소멸).
  const animatedStyle = useAnimatedStyle(() => {
    const rel = absIndex - indexSV.value;

    // 좌측 밖 대기 카드: dragX 를 그대로 따라 들어온다.
    // rel -2 는 우 커밋 시 rel -1 이 될 예비 카드 — 미리 마운트해 두되 완전 투명.
    if (rel < 0) {
      return {
        transform: [{ translateX: dragX.value - PREV_TRAVEL * -rel }, { scale: 1 }],
        opacity: rel < -1 ? 0 : 1,
        zIndex: STACK_Z_PREV, // 진입하는 이전 카드가 앞 카드를 덮는다
      };
    }
    // 앞 카드의 좌 드래그: 손끝 추종 (나가는 동작)
    if (rel === 0 && dragX.value < 0) {
      return {
        transform: [{ translateX: dragX.value }, { scale: 1 }],
        opacity: 1,
        zIndex: STACK_Z_FRONT,
      };
    }
    // 그 외: depth 보간. p(좌)와 q(우)는 dragX 부호로 배타 분기한다.
    const p = interpolate(-dragX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP);
    const q = interpolate(dragX.value, [0, PREV_TRAVEL], [0, 1], Extrapolation.CLAMP);
    const d = rel - p + q;
    const fade = interpolate(
      d,
      [STACK_MAX_DEPTH, STACK_MAX_DEPTH + 1],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateX: STACK_OFFSET * d }, { scale: 1 - STACK_SCALE_STEP * d }],
      opacity: (1 - STACK_OPACITY_STEP * d) * fade,
      // zIndex 도 rel 기반이라 워크릿 안에서 계산 (렌더 순서 비의존)
      zIndex: STACK_Z_FRONT - rel * STACK_Z_STEP,
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.stackCard, animatedStyle]}>
      <Image
        source={img.download_url || img.thumbnail_url}
        style={styles.stackCardImage}
        contentFit="cover"
        transition={0}
        cachePolicy="memory-disk"
      />
    </Animated.View>
  );
}

function ImageStackCarousel({
  images,
  index,
  onIndexChange,
  onPressCard,
  enableGesture,
}: {
  images: StackImage[];
  index: number;
  onIndexChange: (next: number) => void;
  onPressCard: () => void;
  enableGesture: boolean;
}) {
  const dragX = useSharedValue(0);
  // 전환의 단일 진실. pose 는 이 값만 보고 그려지며, React 의 currentImageIndex 는 뒤따라간다.
  const indexSV = useSharedValue(index);
  const count = images.length;

  // 외부에서 인덱스가 바뀐 경우(웹 화살표, 딥링크 targetIndex 등) UI 스레드 값 동기화.
  // 스와이프 경로에서는 워크릿이 이미 같은 값을 써둔 뒤라 no-op 이다.
  useEffect(() => {
    if (indexSV.value !== index) indexSV.value = index;
  }, [index, indexSV]);

  const pan = React.useMemo(
    () =>
      Gesture.Pan()
        // 작은 움직임은 탭(전체화면 진입)에 양보
        .activeOffsetX([-8, 8])
        .failOffsetY([-16, 16])
        .onUpdate((e) => {
          const idx = indexSV.value;
          const blocked =
            (e.translationX < 0 && idx >= count - 1) || (e.translationX > 0 && idx <= 0);
          dragX.value = blocked ? e.translationX * RUBBER_BAND_FACTOR : e.translationX;
        })
        .onEnd((e) => {
          const idx = indexSV.value;
          // 거리 OR 속도 — 둘 중 하나만 넘겨도 전환.
          // 플릭은 방향이 뒤집힌 오작동을 막기 위해 이동 방향과 부호가 같을 때만 인정한다.
          const flickNext = e.velocityX < -SWIPE_VELOCITY_THRESHOLD && e.translationX <= 0;
          const flickPrev = e.velocityX > SWIPE_VELOCITY_THRESHOLD && e.translationX >= 0;
          const goNext = idx < count - 1 && (e.translationX < -SWIPE_THRESHOLD || flickNext);
          const goPrev = idx > 0 && (e.translationX > SWIPE_THRESHOLD || flickPrev);

          const outDuration =
            Math.abs(e.velocityX) > FAST_FLICK_VELOCITY
              ? SWIPE_OUT_DURATION_FAST
              : SWIPE_OUT_DURATION;

          // 양방향 목표를 ±PREV_TRAVEL 로 대칭 — 커밋 전후 pose 가 정확히 일치한다
          if (goNext || goPrev) {
            const next = goNext ? idx + 1 : idx - 1;
            const target = goNext ? -PREV_TRAVEL : PREV_TRAVEL;
            dragX.value = withTiming(target, { duration: outDuration }, (done) => {
              if (done) {
                // 같은 워크릿 프레임에서 인덱스 확정 + 오프셋 리셋 → 프레임 불일치 없음
                indexSV.value = next;
                dragX.value = 0;
                // React 상태는 뒤따라가기만 (감정 카드/dots 용, 늦어도 시각 전환과 무관)
                runOnJS(onIndexChange)(next);
              }
            });
          } else {
            dragX.value = withTiming(0, { duration: CANCEL_DURATION });
          }
        }),
    [count, dragX, indexSV, onIndexChange],
  );

  const tap = React.useMemo(
    () => Gesture.Tap().onEnd((_e, success) => {
      if (success) runOnJS(onPressCard)();
    }),
    [onPressCard],
  );

  const composed = React.useMemo(() => Gesture.Exclusive(pan, tap), [pan, tap]);

  // rel -2(투명 예비) ~ STACK_MAX_DEPTH+1(페이드인 예비)까지 렌더.
  // 양 끝을 opacity 0 예비 슬롯으로 두어 좌/우 커밋 모두 "신규 마운트가 보이지 않는" 상태로 대칭화.
  const from = Math.max(0, index - 2);
  const to = Math.min(images.length, index + STACK_MAX_DEPTH + 2);
  const windowed = images.slice(from, to);

  const stack = (
    <View style={styles.stackArea}>
      {windowed.map((img, i) => {
        const absolute = from + i;
        return (
          <StackCard
            key={img.id != null ? String(img.id) : `stack-${absolute}`}
            img={img}
            absIndex={absolute}
            dragX={dragX}
            indexSV={indexSV}
          />
        );
      })}
    </View>
  );

  // 웹은 제스처 대신 화살표 버튼으로 이동 — 탭(전체화면)만 유지
  if (!enableGesture) {
    return (
      <Pressable onPress={onPressCard} style={styles.stackPressArea}>
        {stack}
      </Pressable>
    );
  }

  return <GestureDetector gesture={composed}>{stack}</GestureDetector>;
}

export default function MediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { setLastViewedDate } = useTimelineStore();
  const { confirm, alert } = useDialog();

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
  const [isOcrLoading, setIsOcrLoading] = useState(false);

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
  // 전체화면 줌 뷰어 표시 상태
  const [viewerVisible, setViewerVisible] = useState(false);
  const shareCardRef = useRef<View>(null);

  // 이미지 갤러리 저장 상태 (early return 위에 위치 — hooks 순서 보장)
  const [isSavingImage, setIsSavingImage] = useState(false);

  // 그룹 이미지 관련 상태
  const [groupImages, setGroupImages] = useState<GroupImageItem[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // 단일 이미지 비율(w/h) 런타임 취득값(onLoad). exif 비율이 없을 때만 사용.
  const [singleImageRatio, setSingleImageRatio] = useState<number | null>(null);

  // GPS 지역명 상태
  const [locationName, setLocationName] = useState<string | null>(null);

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
            // 스택 뷰어는 index만으로 렌더되므로 별도 스크롤 동기화가 필요 없다
            setCurrentImageIndex(targetIndex);
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
  const reverseGeocode = async (lat: number, lon: number, signal?: AbortSignal): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ko`,
        {
          headers: {
            'User-Agent': 'MarZlog/1.0',
          },
          signal,
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
      if (error instanceof Error && error.name === 'AbortError') return null;
      captureError(error instanceof Error ? error : new Error(String(error)), { context: 'MediaDetail.reverseGeocode' });
      return null;
    }
  };

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

  // 이전 이미지로 이동 (웹 화살표 — 스택은 index만 바뀌면 재배치된다)
  const goToPrevious = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  // 다음 이미지로 이동
  const goToNext = () => {
    if (currentImageIndex < displayImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  // 표시할 이미지 목록 (그룹 이미지가 있으면 그룹, 없으면 단일)
  const displayImages = groupImages.length > 0
    ? groupImages
    : media
      ? [{ id: media.id, download_url: media.download_url, thumbnail_url: media.thumbnail_url || '' }]
      : [];

  // ── 단일 이미지 비율 자동높이 분기 (N장 그룹은 기존 고정 height 유지) ──
  // 분기 기준: displayImages.length === 1 일 때만 비율 경로. 비율은 onLoad(1순위)→exif(2순위),
  // 둘 다 없으면 null → 기존 고정 height 폴백(현행 동작 보존).
  // ⚠️ onLoad 우선 이유: exif width/height는 센서 원본 치수라 EXIF orientation(6/8=90°회전)을
  //    반영하지 않음(삼성 세로 사진: 4000×3000 + orientation:6 → 실제 표시는 세로). expo-image의
  //    e.source 치수는 회전 반영 후 값이므로 항상 올바름. exif는 onLoad 도착 전 초기 폴백으로만 사용.
  const isSingleImage = displayImages.length === 1;
  const exifW = analysis?.exif?.width ?? null;
  const exifH = analysis?.exif?.height ?? null;
  const exifRatio = exifW && exifH && exifH > 0 ? exifW / exifH : null;
  const singleAspectRatio = isSingleImage ? singleImageRatio ?? exifRatio : null;
  const useSingleAspect = singleAspectRatio != null;

  // 단일 이미지 런타임 비율 취득(1순위). expo-image onLoad의 source 치수(회전 반영 후)를 사용.
  const handleSingleImageLoad = (e: ImageLoadEventData) => {
    const w = e.source?.width;
    const h = e.source?.height;
    if (w && h && h > 0) setSingleImageRatio(w / h);
  };

  const currentImage = groupImages.length > 0 ? groupImages[currentImageIndex] : null;

  // 대표 감정/강도 — 감정은 사진별이 아니라 게시물(그룹)당 1개다.
  // 따라서 캐러셀 인덱스와 무관하게 항상 primary media 기준으로 읽는다(스와이프해도 안 바뀜).
  // 그룹이면 is_primary 항목(없으면 첫 항목), 그룹이 없으면 media 폴백.
  const primaryImage = groupImages.length > 0
    ? (groupImages.find((img) => img.is_primary === true) ?? groupImages[0])
    : null;
  const primaryMediaId = primaryImage?.id ? String(primaryImage.id) : id!;
  const groupEmotion = primaryImage ? primaryImage.emotion : media?.emotion;
  const groupIntensity = primaryImage ? primaryImage.intensity : media?.intensity;

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

  // GPS 좌표로 지도 열기 (iOS Apple Maps / Android geo / web Google Maps)
  const openMapWithGPS = (lat: number, lon: number) => {
    const url = Platform.select({
      ios: `maps://?q=${lat},${lon}`,
      android: `geo:${lat},${lon}?q=${lat},${lon}`,
      default: `https://maps.google.com/?q=${lat},${lon}`,
    })!;
    Linking.openURL(url).catch(() => {
      alert(t('common.error'), t('exif.mapOpenFailed'));
    });
  };

  // 지도를 보고 돌아오면(앱 active 복귀) 1회 주소 조회. 자동/스피너 없음 — 무한 방지.
  const mapVisitedRef = useRef(false);
  const openMapWithGPSRef = useRef(openMapWithGPS);
  openMapWithGPSRef.current = openMapWithGPS;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && mapVisitedRef.current) {
        mapVisitedRef.current = false;
        const gps = analysis?.exif?.gps;
        if (gps?.latitude && gps?.longitude && !locationName) {
          // 백그라운드 조회 — 실패/지연돼도 화면엔 좌표 유지(스피너 없음)
          reverseGeocode(gps.latitude, gps.longitude)
            .then((name) => { if (name) setLocationName(name); })
            .catch(() => {});
        }
      }
    });
    return () => sub.remove();
  }, [analysis, locationName]);

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
    const contextLines: string[] = [];
    if ((media as any)?.is_bookmarked) {
      contextLines.push(t('media.deleteContextBookmarked'));
    }
    if (media?.title || media?.content) {
      contextLines.push(t('media.deleteContextHasDiary'));
    }
    const groupCount = media?.group_count ?? 0;
    if (media?.group_id && groupCount > 1) {
      const isPrimary = media.group_id === media.id;
      contextLines.push(
        isPrimary
          ? t('media.deleteContextGroupPrimary', { count: groupCount })
          : t('media.deleteContextGroupMember', { count: groupCount })
      );
    }

    const description = [
      t('media.deleteConfirmBody'),
      ...(contextLines.length > 0 ? ['', ...contextLines] : []),
    ].join('\n');

    const confirmed = await confirm({
      title: t('media.deleteConfirmTitle'),
      description,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'danger',
    });
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteMedia(id!);
      useMediaUpdatesStore.getState().setDeleteUpdate(id!);
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

    // Plus 예고 게이트: 정상 일기 재생성은 Marzlog Plus 출시 전까지 차단.
    // 실패 일기(ai_provider='fallback' 또는 fallback 문구) 복구 재생성은 게이트 우회.
    // 복구: REGEN_PLUS_GATE 를 false 로 바꾸거나 이 가드 블록을 제거하면 됨.
    const REGEN_PLUS_GATE: boolean = true;
    const isDiaryFailed =
      media.ai_provider === 'fallback' ||
      DIARY_FALLBACK_PREFIXES.some((prefix) => media.content?.startsWith(prefix));
    if (REGEN_PLUS_GATE && !isDiaryFailed) {
      await alert(t('plus.regenComingSoonTitle'), t('plus.regenComingSoonBody'));
      return;
    }

    // 재생성 = 현재 app_lang으로 덮어씀. 기존 일기 언어와 다르면 경고.
    const appLang = useAuthStore.getState().user?.app_lang;
    if (media?.diary_lang && appLang && media.diary_lang !== appLang) {
      const ok = await confirm({
        title: t('media.regenerateLangWarnTitle'),
        description: t('media.regenerateLangWarnBody'),
        confirmText: t('common.confirm'),
      });
      if (!ok) return;
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

  const handleTriggerOcr = async () => {
    if (isOcrLoading) return;

    const targetMediaId = currentImage?.id ? String(currentImage.id) : id!;
    const imageUrl = currentImage?.download_url || media?.download_url;
    if (!imageUrl) {
      await alert(t('common.error'), t('media.readTextFailed'));
      return;
    }

    setIsOcrLoading(true);
    try {
      const ocrResult = await runDeviceOcr(imageUrl);

      if (ocrResult.status === 'failed') {
        captureError(
          ocrResult.error,
          { context: 'MediaDetail.deviceOcr' },
          { skipClientErrors: true },
        );
        await alert(t('common.error'), t('media.readTextFailed'));
        return;
      }

      const fresh = await submitDeviceOcr(targetMediaId, {
        ocr_text: ocrResult.status === 'done' ? ocrResult.text : '',
        ocr_status: ocrResult.status,
      });
      setAnalysis(fresh);
    } catch (err: any) {
      captureError(
        err instanceof Error ? err : new Error(String(err)),
        { context: 'MediaDetail.submitDeviceOcr' },
        { skipClientErrors: true },
      );
      await alert(t('common.error'), t('media.readTextFailed'));
    } finally {
      setIsOcrLoading(false);
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
    setEditEmotion(groupEmotion || '');
    setEditIntensity(groupIntensity || 3);
    setEmotionModalVisible(true);
  };

  // 감정 저장 — 대상은 항상 primary media (게시물당 감정 1개)
  const handleSaveEmotion = async () => {
    const targetMediaId = primaryMediaId;

    try {
      setIsSaving(true);
      await updateMediaEmotion(targetMediaId, {
        emotion: editEmotion,
        intensity: editIntensity,
      });

      // 다른 화면 (search/timeline/home)에 emotion 변경 broadcast
      // → 각 화면이 results/items 배열 in-place patch (스크롤 유지)
      useMediaUpdatesStore.getState().setEmotionUpdate(
        targetMediaId, editEmotion, editIntensity,
      );

      // 로컬 상태 갱신 — 대표 감정은 primary에서 읽으므로 primary가 든 소스를 다시 받는다.
      if (media?.group_id && groupImages.length > 0) {
        const groupData = await timelineApi.getGroupImages(media.group_id);
        setGroupImages(groupData.items || []);
      } else {
        // 단일 이미지(또는 그룹 목록 미확보)인 경우 저장 대상 미디어 새로고침
        const mediaData = await getMediaDetail(targetMediaId);
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

  // 텍스트 복사 핸들러 (캡션/일기/OCR 공통) — useState는 위에서 이미 선언됨
  const handleCopy = async (text: string | null | undefined, toastKey: string) => {
    if (!text) return;
    try {
      await copyText(text);
      await alert('', t(toastKey));
    } catch {
      // 무시
    }
  };

  // 이미지 갤러리 직접 저장 (expo-media-library)
  const handleSaveImage = async () => {
    const currentMediaId = groupImages.length > 0
      ? groupImages[currentImageIndex]
      : null;
    const imageUrl = currentMediaId?.download_url || media?.download_url;
    if (!imageUrl) return;
    setIsSavingImage(true);
    try {
      const result = await saveImageToGallery(imageUrl);
      if (result === 'success') {
        await alert('', t('copy.imageSaved'));
      } else if (result === 'denied') {
        await alert(t('common.error'), t('copy.permissionDenied'));
      } else {
        await alert(t('common.error'), t('copy.imageSaveFailed'));
      }
    } finally {
      setIsSavingImage(false);
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
            onPress={handleSaveImage}
            disabled={isSavingImage}
          >
            <Ionicons
              name="download-outline"
              size={20}
              color={isSavingImage ? colors.neutral[4] : (isDark ? '#F9FAFB' : colors.text.primary)}
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
        <View style={[useSingleAspect ? styles.carouselWrapperAuto : styles.carouselWrapper, isDark && styles.carouselWrapperDark]}>
          {isSingleImage ? (
            /* 단일 사진: 스택·제스처 없이 기존 비율 자동높이 경로 유지 */
            <Pressable
              style={useSingleAspect ? styles.carouselImageContainerAuto : styles.carouselImageContainer}
              onPress={() => setViewerVisible(true)}
            >
              <Image
                source={displayImages[0]?.download_url || displayImages[0]?.thumbnail_url}
                style={useSingleAspect ? [styles.carouselImageAuto, { aspectRatio: singleAspectRatio }] : styles.carouselImage}
                contentFit="contain"
                transition={200}
                cachePolicy="memory-disk"
                onLoad={handleSingleImageLoad}
              />
            </Pressable>
          ) : (
            <ImageStackCarousel
              images={displayImages}
              index={currentImageIndex}
              onIndexChange={setCurrentImageIndex}
              onPressCard={() => setViewerVisible(true)}
              enableGesture={!isWeb}
            />
          )}

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
                {analysis.ai_reused ? t('mediaDetail.aiReused') : t('mediaDetail.aiBadge')}
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
          {groupEmotion ? (
            <>
              {/* 좌측: 일러스트 (카드 60% 꽉 채움) */}
              <View style={styles.emotionCardIllustWrap}>
                <Image
                  source={getEmotionIllustration(groupEmotion) || getEmotionIcon(groupEmotion, 'color')}
                  style={styles.emotionCardIllustration}
                  contentFit="cover"
                />
              </View>
              {/* 우측: 아이콘 + 텍스트 (세로 중앙) */}
              <View style={styles.emotionCardLabel}>
                {getEmotionIcon(groupEmotion, 'color') && (
                  <Image
                    source={getEmotionIcon(groupEmotion, 'color')}
                    style={styles.emotionCardIcon}
                  />
                )}
                <Text style={[styles.emotionCardText, isDark && styles.emotionCardTextDark]}>
                  {emotionWithIntensity(groupEmotion, groupIntensity)}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.emotionCardEmpty}>
              <Ionicons name="add-circle-outline" size={28} color={isDark ? '#6B7280' : '#9CA3AF'} />
              <Text style={[styles.emotionPlaceholder, isDark && styles.textSecondaryDark]}>
                {t('mediaDetail.selectEmotion')}
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
                  {t('mediaDetail.aiGenerated')}
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
          {/* 캡션 편집 버튼 렌더 제거 — 편집 대상이 표시 제거된 AI Caption(analysis.caption_ko)
              과 동일 필드이기 때문. 편집 모달·openCaptionEditModal·handleSaveCaption·
              updateCaption 은 보존됨 [F-CAPTION-TAGS-I18N 재론 시 복구] */}

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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.userSectionLabel, isDark && styles.textSecondaryDark]}>{t('mediaDetail.content')}</Text>
              <TouchableOpacity
                onPress={() => handleCopy(media.content, 'copy.diaryCopied')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="copy-outline" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.contentText, isDark && styles.textLight]}>{media.content}</Text>
          </View>
        )}

        {/* 메모 */}
        {media.memo && (
          <View style={[styles.userSection, isDark && styles.sectionBorderDark]}>
            <Text style={[styles.userSectionLabel, isDark && styles.textSecondaryDark]}>{t('mediaDetail.memo')}</Text>
            <Text style={[styles.memoText, isDark && styles.textLight]}>{media.memo}</Text>
          </View>
        )}

        {/* 등록일 */}
        <View style={[styles.userSection, isDark && styles.sectionBorderDark]}>
          <Text style={[styles.userSectionLabel, isDark && styles.textSecondaryDark]}>{t('mediaDetail.registeredDate')}</Text>
          <Text style={[styles.dateText, isDark && styles.textSecondaryDark]}>
            {formatDateTime(media.created_at)}
          </Text>
        </View>

        {/* OCR Text */}
        {analysis?.ocr_text ? (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.sectionIcon}>📝</Text>
                <Text style={[styles.sectionTitle, isDark && styles.textLight]}>{t('media.readTextSection')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleCopy(analysis.ocr_text, 'copy.ocrCopied')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="copy-outline" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            </View>
            <View style={[styles.ocrBox, isDark && styles.boxDark]}>
              <Text style={[styles.ocrText, isDark && styles.textLight]}>{analysis.ocr_text}</Text>
            </View>
          </View>
        ) : analysis?.ocr_status === 'no_text' ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📝</Text>
              <Text style={[styles.sectionTitle, isDark && styles.textLight]}>{t('media.readTextSection')}</Text>
            </View>
            <Text style={[styles.ocrEmptyMessage, isDark && styles.textSecondaryDark]}>
              {t('media.noTextInPhoto')}
            </Text>
          </View>
        ) : analysis?.ocr_status === 'failed' ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📝</Text>
              <Text style={[styles.sectionTitle, isDark && styles.textLight]}>{t('media.readTextSection')}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.regenerateButton,
                isOcrLoading && styles.regenerateButtonDisabled,
                isDark && styles.regenerateButtonDark,
              ]}
              onPress={handleTriggerOcr}
              disabled={isOcrLoading}
            >
              <Ionicons
                name={isOcrLoading ? 'hourglass-outline' : 'refresh-outline'}
                size={16}
                color={isOcrLoading ? '#9CA3AF' : '#fff'}
              />
              <Text style={[
                styles.regenerateButtonText,
                isOcrLoading && styles.regenerateButtonTextDisabled,
              ]}>
                {isOcrLoading ? t('media.readingText') : t('media.readTextRetry')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : analysis ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📝</Text>
              <Text style={[styles.sectionTitle, isDark && styles.textLight]}>{t('media.readTextSection')}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.regenerateButton,
                isOcrLoading && styles.regenerateButtonDisabled,
                isDark && styles.regenerateButtonDark,
              ]}
              onPress={handleTriggerOcr}
              disabled={isOcrLoading}
            >
              <Ionicons
                name={isOcrLoading ? 'hourglass-outline' : 'scan-outline'}
                size={16}
                color={isOcrLoading ? '#9CA3AF' : '#fff'}
              />
              <Text style={[
                styles.regenerateButtonText,
                isOcrLoading && styles.regenerateButtonTextDisabled,
              ]}>
                {isOcrLoading ? t('media.readingText') : t('media.readTextButton')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

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
                    onPress={() => { mapVisitedRef.current = true; openMapWithGPS(analysis.exif!.gps!.latitude, analysis.exif!.gps!.longitude); }}
                  >
                    <Text style={[styles.detailLabel, isDark && styles.textSecondaryDark]}>{t('exif.location')}</Text>
                    <View style={styles.locationValueColumn}>
                      <View style={styles.locationValue}>
                        <Ionicons name="location" size={14} color={colors.brand.primary} />
                        {locationName ? (
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
                    onPress={() => openMapWithGPS(analysis.exif!.gps!.latitude, analysis.exif!.gps!.longitude)}
                  >
                    <Text style={styles.openMapButtonText}>{'\uD83D\uDCCD'} {t('mediaDetail.openInMap')}</Text>
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
              <Text style={[styles.pendingText, isDark && styles.textSecondaryDark]}>{t('mediaDetail.analysisPending')}</Text>
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
          <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
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
              <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>{t('mediaDetail.titleLabel')}</Text>
              <TextInput
                style={[styles.textInput, isDark && styles.textInputDark]}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder={t('mediaDetail.titlePlaceholder')}
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                maxLength={50}
              />
              <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>{t('mediaDetail.contentLabel')}</Text>
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
                      isSameMood(editMood, mood) && styles.moodOptionSelected,
                    ]}
                    onPress={() => setEditMood(mood)}
                  >
                    <Text style={[styles.moodOptionText, isDark && styles.textSecondaryDark, isSameMood(editMood, mood) && styles.moodOptionTextSelected]}>
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
                <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>{t('mediaDetail.titleLabel')}</Text>
                <TextInput
                  style={[styles.textInput, isDark && styles.textInputDark]}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder={t('mediaDetail.titlePlaceholder')}
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  maxLength={50}
                />
                <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>{t('mediaDetail.contentLabel')}</Text>
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
                      style={[styles.moodOption, isDark && styles.moodOptionDark, isSameMood(editMood, mood) && styles.moodOptionSelected]}
                      onPress={() => setEditMood(mood)}
                    >
                      <Text style={[styles.moodOptionText, isDark && styles.textSecondaryDark, isSameMood(editMood, mood) && styles.moodOptionTextSelected]}>
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
                        {emotionLabel(emotion)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {/* 강도: 라벨·값 표시·부사 미리보기·dot 인디케이터를 컴포넌트가 자체 렌더 */}
              <IntensitySlider value={editIntensity} onChange={setEditIntensity} embedded />
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
                          {emotionLabel(emotion)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {/* 강도: 라벨·값 표시·부사 미리보기·dot 인디케이터를 컴포넌트가 자체 렌더 */}
                <IntensitySlider value={editIntensity} onChange={setEditIntensity} embedded />
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

      {/* 전체화면 줌 뷰어 (탭으로 진입, 핀치/더블탭/팬/스와이프) */}
      <FullscreenImageViewer
        images={displayImages}
        initialIndex={currentImageIndex}
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
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
  // 단일 이미지 비율 자동높이 경로 (고정 height 제거, width는 SCREEN_WIDTH 유지 — 페이징 산식 보존)
  carouselWrapperAuto: {
    width: SCREEN_WIDTH,
    backgroundColor: colors.neutral[1],
    position: 'relative',
    overflow: 'hidden',
  },
  carouselImageContainerAuto: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselImageAuto: {
    width: CAROUSEL_IMAGE_WIDTH,
    maxHeight: CAROUSEL_SINGLE_MAX_HEIGHT,
  },
  // ── 스택 카드 뷰어 (그룹 2장 이상) ──
  stackArea: {
    width: CAROUSEL_IMAGE_WIDTH,
    height: CAROUSEL_IMAGE_HEIGHT,
    alignItems: 'flex-start', // 좌측 기준 — 우측 여백이 뒤 카드 노출 공간
    justifyContent: 'center',
  },
  stackCard: {
    position: 'absolute',
    left: STACK_PADDING_LEFT,
    width: STACK_CARD_WIDTH,
    height: STACK_CARD_HEIGHT,
    // 축소 기준점을 우측 끝에 고정 → 돌출량이 offset 그대로 유지된다
    transformOrigin: 'right center',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.neutral[1],
  },
  stackPressArea: {
    width: CAROUSEL_IMAGE_WIDTH,
    height: CAROUSEL_IMAGE_HEIGHT,
  },
  stackCardImage: {
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
  boxDark: {
    backgroundColor: '#1F2937',
  },
  sectionBorderDark: {
    borderBottomColor: '#374151',
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
  ocrEmptyMessage: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingVertical: 12,
    textAlign: 'center',
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
});
