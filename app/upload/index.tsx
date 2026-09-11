import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/src/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useImageUpload, ImagePickerItem, MAX_SELECTION } from '@/src/hooks/useImageUpload';
import { ImageSelector, EmotionPicker, IntensitySlider } from '@/src/components/upload';
import { DEFAULT_EMOTION_KEY, resolveEmotion } from '@/constants/emotions';
import { getMediaDetail, updateMedia, setPrimaryImage } from '@/src/api/media';
import { timelineApi } from '@/src/api/timeline';
import { useDialog } from '@/src/components/ui/Dialog';
import { useTranslation } from '@/src/hooks/useTranslation';
import { captureError } from '@/src/utils/sentry';

export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { alert: showAlert, confirm } = useDialog();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    images?: string;
    editMode?: string;
    mediaId?: string;
    groupId?: string;
    selectedDate?: string;  // 캘린더에서 선택한 날짜 (ISO 형식)
  }>();

  // 다크모드 결정
  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  // 편집 모드 확인
  const isEditMode = params.editMode === 'true';
  const mediaId = params.mediaId;
  const groupId = params.groupId;

  const [images, setImages] = useState<ImagePickerItem[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [selectedEmotion, setSelectedEmotion] = useState<string>(DEFAULT_EMOTION_KEY);
  const [intensity, setIntensity] = useState(6);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showMemo, setShowMemo] = useState(false);
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // F-UPLOAD-DUP D: 이중 탭 차단용 동기 가드 — isSubmitting state는 re-render가
  // 반영되기 전 프레임 동안 뚫릴 수 있다(disabled 미적용 창). ref는 즉시 반영.
  const submittingRef = useRef(false);

  const { startUpload, startGroupUpload, addToExistingGroup, pickFromGallery, takePhoto, quotaExceeded, error: uploadError } = useImageUpload();

  // 현재 시간
  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // 편집 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (isEditMode && mediaId) {
      loadExistingData();
    }
  }, [isEditMode, mediaId]);

  const loadExistingData = async () => {
    if (!mediaId) return;

    setIsLoading(true);
    try {
      // 미디어 상세 조회
      const mediaDetail = await getMediaDetail(mediaId);

      // 폼에 데이터 설정
      setTitle(mediaDetail.title || '');
      setContent(mediaDetail.content || '');
      setMemo(mediaDetail.memo || '');
      if (mediaDetail.memo) setShowMemo(true);
      // 서버 값은 중립 키가 정본. 과도기 데이터(한국어 라벨) 대비 resolve 경유.
      setSelectedEmotion(resolveEmotion(mediaDetail.emotion)?.key ?? DEFAULT_EMOTION_KEY);
      setIntensity(mediaDetail.intensity || 6);

      // 이미지 설정
      const loadedImages: ImagePickerItem[] = [];

      // 그룹 이미지가 있으면 로드
      if (groupId) {
        try {
          const groupData = await timelineApi.getGroupImages(groupId);
          if (groupData.items && groupData.items.length > 0) {
            groupData.items.forEach((img: any, idx: number) => {
              loadedImages.push({
                id: img.id,
                uri: img.download_url || img.thumbnail_url,
                filename: `image_${idx}.jpg`,
                fileSize: 0,
                mimeType: 'image/jpeg',
                width: 0,
                height: 0,
                status: 'done',
                progress: 100,
                isExisting: true,
              });
            });
            // 대표 이미지 인덱스 찾기
            const primaryIdx = groupData.items.findIndex((img: any) => img.is_primary === true);
            if (primaryIdx >= 0) setPrimaryImageIndex(primaryIdx);
          }
        } catch (e) {
        }
      }

      // 그룹 이미지가 없으면 단일 이미지
      if (loadedImages.length === 0 && mediaDetail.download_url) {
        loadedImages.push({
          id: mediaDetail.id,
          uri: mediaDetail.download_url,
          filename: 'image.jpg',
          fileSize: 0,
          mimeType: 'image/jpeg',
          width: 0,
          height: 0,
          status: 'done',
          progress: 100,
          isExisting: true,
        });
      }

      setImages(loadedImages);

    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), { context: 'Upload.loadExistingData' });
      showAlert(t('upload.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // params에서 이미지 데이터 받기 (새 등록 모드에서만)
  useEffect(() => {
    if (isEditMode) return; // 편집 모드에서는 건너뛰기

    if (params.images) {
      try {
        const parsedImages = JSON.parse(params.images as string);
        setImages(parsedImages);
      } catch (e) {
        captureError(e instanceof Error ? e : new Error(String(e)), { context: 'Upload.parseImages' });
      }
    }
  }, [params.images, isEditMode]);

  // ========== 유틸리티 함수 ==========

  // 확인 다이얼로그 (취소 확인용)
  const showConfirm = async (message: string, onConfirm: () => void) => {
    const confirmed = await confirm({
      title: t('upload.cancelConfirmTitle'),
      description: message,
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      variant: 'confirm',
    });
    if (confirmed) {
      onConfirm();
    }
  };

  // 뒤로가기
  const goBack = () => {
    router.push('/(tabs)');
  };

  // ========== 이미지 핸들러 ==========

  const handleAddMoreImages = () => {
    const remainingSlots = MAX_SELECTION - images.length;
    if (remainingSlots <= 0) {
      showAlert(t('upload.maxImagesAlert'));
      return;
    }

    const addFromGallery = async () => {
      const pickedItems = await pickFromGallery(true);
      if (pickedItems && pickedItems.length > 0) {
        const newImages = [...images, ...pickedItems].slice(0, MAX_SELECTION);
        setImages(newImages);
      }
    };

    const addFromCamera = async () => {
      const item = await takePhoto();
      if (item) {
        setImages(prev => [...prev, item].slice(0, MAX_SELECTION));
      }
    };

    if (Platform.OS === 'web') {
      addFromGallery();
      return;
    }

    Alert.alert(
      t('upload.addPhoto'),
      t('upload.addPhotoDesc'),
      [
        { text: t('upload.takePhoto'), onPress: addFromCamera },
        { text: t('upload.fromGallery'), onPress: addFromGallery },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    // 삭제 위치에 따라 대표 인덱스 재조정
    // - 대표 자신이 삭제되면 첫 장 승격
    // - 대표보다 앞이 빠지면 한 칸 당겨야 같은 사진을 계속 가리킨다
    //   (이 보정이 없으면 [A,B,C,D]에서 대표 C일 때 A 삭제 시 대표가 D로 뒤바뀜)
    if (index === primaryImageIndex) {
      setPrimaryImageIndex(0);
    } else if (index < primaryImageIndex) {
      setPrimaryImageIndex(Math.max(0, primaryImageIndex - 1));
    }
  };

  const handleSetPrimary = (index: number) => {
    setPrimaryImageIndex(index);
  };

  // 취소 버튼 핸들러
  const handleCancel = () => {
    if (images.length > 0 || title || content || memo) {
      showConfirm(t('upload.cancelConfirmDesc'), goBack);
    } else {
      goBack();
    }
  };

  // 수정 처리
  const handleUpdate = async () => {
    if (!mediaId) return;

    setIsSubmitting(true);

    try {
      // 1. 새 이미지가 있으면 그룹에 추가
      // isExisting이 명시적으로 true가 아닌 이미지만 새 이미지로 간주
      const newImages = images.filter((img: any) => img.isExisting !== true);

      if (newImages.length > 0 && groupId) {
        const addResult = await addToExistingGroup(groupId, newImages);
        if (!addResult) {
          showAlert(t('upload.addImageError'));
          setIsSubmitting(false);
          return;
        }
      }

      // 2. 대표 이미지 변경 (기존 이미지 중에서 선택된 경우)
      if (groupId && images.length > 0) {
        const primaryImage = images[primaryImageIndex];
        // 기존 이미지이고 id가 있는 경우에만 대표 이미지 변경 API 호출
        if ((primaryImage as any)?.isExisting && primaryImage?.id) {
          try {
            await setPrimaryImage(groupId, primaryImage.id);
          } catch (primaryError) {
            captureError(primaryError instanceof Error ? primaryError : new Error(String(primaryError)), { context: 'Upload.setPrimaryImage' });
            showAlert(t('upload.primaryImageError'));
            setIsSubmitting(false);
            return;
          }
        }
      }

      // 3. 메타데이터 업데이트
      const updateData = {
        title: title || undefined,
        content: content || undefined,
        memo: memo || undefined,
        emotion: selectedEmotion || undefined,
        intensity: intensity,
      };

      const result = await updateMedia(mediaId, updateData);

      showAlert(t('upload.updateSuccess'));
      // 캐시 문제 방지: 홈으로 이동하여 타임라인 새로고침
      router.replace('/(tabs)');
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), { context: 'Upload.handleUpdate' });
      showAlert(t('upload.updateError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 등록 버튼 핸들러 본체 — handleSubmit(이중 탭 가드)를 통해서만 호출
  const doSubmit = async () => {
    // 편집 모드일 때는 수정 처리
    if (isEditMode) {
      await handleUpdate();
      return;
    }

    // 새 등록 모드
    if (images.length === 0) {
      showAlert(t('upload.noPhotos'));
      return;
    }

    setIsSubmitting(true);
    try {
      // 선택한 날짜 (캘린더에서 전달받은 날짜)
      const takenAt = params.selectedDate || undefined;

      const metadata = {
        title: title || undefined,
        content: content || undefined,
        memo: memo || undefined,
        emotion: selectedEmotion || undefined,
        intensity: selectedEmotion ? intensity : undefined,
      };

      if (images.length === 1) {
        // 단일 이미지: 업로드 + 메타데이터(updateMedia)를 한 큐 job으로 영속화/재개
        // (B-DN: metadata를 startUpload에 위임 — 업로드 성공 후 내부에서 updateMedia 수행)
        await startUpload(images, takenAt, metadata);
      } else {
        // 여러 이미지: 그룹 업로드 (메타데이터 포함)
        const result = await startGroupUpload(images, primaryImageIndex, takenAt, metadata);
      }

      router.push('/(tabs)');
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), { context: 'Upload.handleSubmit' });
      // quota exceeded is handled via quotaExceeded state below
      if (!quotaExceeded) {
        showAlert(t('upload.uploadError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // F-UPLOAD-DUP D: 첫 줄 동기 ref 가드 — 이중 탭이 doSubmit을 2번 돌려
  // 같은 이미지를 병렬 업로드(중복 Media)하는 것을 차단. isSubmitting state는
  // 버튼 disabled(UI)용으로 유지.
  const handleSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      await doSubmit();
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#111827' : colors.background} />

      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Pressable
          onPress={() => {
            handleCancel();
          }}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.buttonPressed,
            pressed && isDark && styles.buttonPressedDark,
          ]}
        >
          <Ionicons name="chevron-back" size={28} color={isDark ? '#F9FAFB' : colors.text.primary} />
        </Pressable>
        <View style={styles.headerSpacer} />
        {/* 연필 아이콘 숨김 — `onPress` 가 없어 눌러도 아무 일이 일어나지 않았다(거짓 어포던스).
            `Pressable` 이라 press 스타일만 반응해 "눌리는데 안 된다" 로 읽혔다(VN 테스터 실보고).
            자리는 남겨 headerSpacer 와의 좌우 균형을 보존한다 — 기능이 확정되면
            핸들러와 함께 되살릴 것(B-UPLOAD-DEAD-PENCIL). */}
        <View style={styles.headerButton} />
      </View>

      {/* 로딩 중일 때 */}
      {isLoading && (
        <View style={[styles.loadingOverlay, isDark && styles.loadingOverlayDark]}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={[styles.loadingText, isDark && styles.textLight]}>{t('common.loading')}</Text>
        </View>
      )}

      {/* Scrollable Content */}
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
        {/* Title and Time */}
        <View style={styles.titleSection}>
          <Text style={[styles.mainTitle, isDark && styles.textLight]}>
            {isEditMode ? t('upload.editTitle') : t('upload.newTitle')}
          </Text>
          {!isEditMode && <Text style={[styles.timeText, isDark && styles.textSecondaryDark]}>{getCurrentTime()}</Text>}
        </View>

        {/* Image Selector */}
        <ImageSelector
          images={images}
          primaryIndex={primaryImageIndex}
          onAddImages={handleAddMoreImages}
          onRemoveImage={handleRemoveImage}
          onSetPrimary={handleSetPrimary}
          maxImages={MAX_SELECTION}
        />

        {/* Emotion Picker */}
        <EmotionPicker
          selectedEmotion={selectedEmotion}
          onSelect={setSelectedEmotion}
        />

        {/* Intensity Slider */}
        {selectedEmotion && (
          <IntensitySlider
            value={intensity}
            onChange={setIntensity}
          />
        )}

        {/* Title Input */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, isDark && styles.textLight]}>{t('upload.titleLabel')}</Text>
          <TextInput
            style={[styles.titleInput, isDark && styles.inputDark]}
            placeholder={t('upload.titlePlaceholder')}
            placeholderTextColor={isDark ? '#6B7280' : colors.neutral[5]}
            value={title}
            onChangeText={setTitle}
            maxLength={50}
          />
        </View>

        {/* Content Input */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, isDark && styles.textLight]}>{t('upload.contentLabel')}</Text>
          <TextInput
            style={[styles.contentInput, isDark && styles.inputDark]}
            placeholder={t('upload.contentPlaceholder')}
            placeholderTextColor={isDark ? '#6B7280' : colors.neutral[5]}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Memo Toggle */}
        <View style={[styles.memoToggleContainer, isDark && styles.memoToggleContainerDark]}>
          <Text style={[styles.memoToggleText, isDark && styles.textLight]}>{t('upload.memoToggle')}</Text>
          <Switch
            value={showMemo}
            onValueChange={setShowMemo}
            trackColor={{ false: isDark ? '#374151' : colors.neutral[2], true: colors.brand.primary }}
            thumbColor={isDark ? '#F9FAFB' : colors.background}
          />
        </View>

        {/* Memo Input */}
        {showMemo && (
          <View style={styles.memoContainer}>
            <TextInput
              style={[styles.memoInput, isDark && styles.inputDark]}
              placeholder={t('upload.memoPlaceholder')}
              placeholderTextColor={isDark ? '#6B7280' : colors.neutral[5]}
              value={memo}
              onChangeText={setMemo}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Quota Exceeded Banner */}
      {quotaExceeded && (
        <View style={[styles.quotaBanner, isDark && styles.quotaBannerDark]}>
          <View style={styles.quotaBannerContent}>
            <Ionicons name="cloud-offline-outline" size={20} color="#EF4444" />
            <View style={styles.quotaBannerTextWrap}>
              <Text style={[styles.quotaBannerText, isDark && { color: '#F9FAFB' }]}>
                {t('storage.quotaExceeded')}
              </Text>
              <Text style={[styles.quotaBannerDesc, isDark && { color: '#D1D5DB' }]}>
                {t('storage.quotaExceededCleanup')}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Bottom Buttons - ScrollView 밖에 배치 (position: absolute 제거) */}
      <View style={[styles.bottomButtons, isDark && styles.bottomButtonsDark, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* 취소 버튼 */}
        <Pressable
          onPress={() => {
            handleCancel();
          }}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.cancelButton,
            isDark && styles.cancelButtonDark,
            pressed && styles.cancelButtonPressed,
            pressed && isDark && styles.cancelButtonPressedDark,
          ]}
        >
          <Text style={[styles.cancelButtonText, isDark && styles.textLight]}>{t('common.cancel')}</Text>
        </Pressable>

        {/* 등록/수정 버튼 */}
        <Pressable
          onPress={() => {
            handleSubmit();
          }}
          disabled={isSubmitting || (!isEditMode && images.length === 0)}
          style={({ pressed }) => [
            styles.submitButton,
            (isSubmitting || (!isEditMode && images.length === 0)) && styles.submitButtonDisabled,
            pressed && !isSubmitting && (isEditMode || images.length > 0) && styles.submitButtonPressed,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>{isEditMode ? t('upload.edit') : t('upload.submit')}</Text>
          )}
        </Pressable>
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
  textLight: {
    color: '#F9FAFB',
  },
  textSecondaryDark: {
    color: '#9CA3AF',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    backgroundColor: colors.background,
  },
  headerDark: {
    backgroundColor: '#111827',
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  buttonPressed: {
    opacity: 0.5,
    backgroundColor: colors.neutral[2],
    borderRadius: 24,
  },
  buttonPressedDark: {
    backgroundColor: '#374151',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  titleSection: {
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 10,
  },
  titleInput: {
    backgroundColor: colors.neutral[2],
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.text.primary,
  },
  contentInput: {
    backgroundColor: colors.neutral[2],
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.text.primary,
    minHeight: 100,
  },
  inputDark: {
    backgroundColor: '#1F2937',
    color: '#F9FAFB',
  },
  memoToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[2],
    marginTop: 8,
  },
  memoToggleContainerDark: {
    borderTopColor: '#374151',
  },
  memoToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  memoContainer: {
    marginTop: 12,
  },
  memoInput: {
    backgroundColor: colors.neutral[2],
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.text.primary,
    minHeight: 80,
  },
  // Bottom Buttons - position: absolute 제거!
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[2],
  },
  bottomButtonsDark: {
    backgroundColor: '#111827',
    borderTopColor: '#374151',
  },
  cancelButton: {
    flex: 1,
    height: 56,
    backgroundColor: colors.neutral[2],
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonDark: {
    backgroundColor: '#374151',
  },
  cancelButtonPressed: {
    backgroundColor: colors.neutral[3],
  },
  cancelButtonPressedDark: {
    backgroundColor: '#4B5563',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  submitButton: {
    flex: 1,
    height: 56,
    backgroundColor: colors.brand.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.neutral[3],
  },
  submitButtonPressed: {
    backgroundColor: '#E55A50',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#252525',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  loadingOverlayDark: {
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  quotaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
  },
  quotaBannerDark: {
    backgroundColor: '#1C1917',
    borderTopColor: '#7F1D1D',
  },
  quotaBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  quotaBannerTextWrap: {
    flex: 1,
  },
  quotaBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991B1B',
  },
  quotaBannerDesc: {
    fontSize: 12,
    color: '#991B1B',
    marginTop: 2,
  },
});
