import React, { useState, useEffect } from 'react';
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
import { useImageUpload, ImagePickerItem } from '@/src/hooks/useImageUpload';
import { ImageSelector, EmotionPicker, IntensitySlider } from '@/src/components/upload';
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
  const [selectedEmotion, setSelectedEmotion] = useState<string>('평온');
  const [intensity, setIntensity] = useState(3);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showMemo, setShowMemo] = useState(false);
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { startUpload, startGroupUpload, addToExistingGroup, pickFromGallery, takePhoto } = useImageUpload();

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
      setSelectedEmotion(mediaDetail.emotion || '평온');
      setIntensity(mediaDetail.intensity || 3);

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
    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      showAlert(t('upload.maxImagesAlert'));
      return;
    }

    const addFromGallery = async () => {
      const pickedItems = await pickFromGallery(true);
      if (pickedItems && pickedItems.length > 0) {
        const newImages = [...images, ...pickedItems].slice(0, 5);
        setImages(newImages);
      }
    };

    const addFromCamera = async () => {
      const item = await takePhoto();
      if (item) {
        setImages(prev => [...prev, item].slice(0, 5));
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
    if (primaryImageIndex >= newImages.length) {
      setPrimaryImageIndex(Math.max(0, newImages.length - 1));
    } else if (primaryImageIndex === index) {
      setPrimaryImageIndex(0);
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

  // 등록 버튼 핸들러
  const handleSubmit = async () => {
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
        // 단일 이미지: 업로드 후 메타데이터 업데이트
        const results = await startUpload(images, takenAt);

        // 메타데이터 저장 (title, emotion 등)
        if (results.length > 0 && results[0].media_id) {
          await updateMedia(results[0].media_id, metadata);
        }
      } else {
        // 여러 이미지: 그룹 업로드 (메타데이터 포함)
        const result = await startGroupUpload(images, primaryImageIndex, takenAt, metadata);
      }

      router.push('/(tabs)');
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), { context: 'Upload.handleSubmit' });
      showAlert(t('upload.uploadError'));
    } finally {
      setIsSubmitting(false);
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
          ]}
        >
          <Ionicons name="chevron-back" size={28} color={isDark ? '#F9FAFB' : colors.text.primary} />
        </Pressable>
        <View style={styles.headerSpacer} />
        <Pressable style={styles.headerButton}>
          <Ionicons name="pencil-outline" size={20} color={isDark ? '#F9FAFB' : colors.text.primary} />
        </Pressable>
      </View>

      {/* 로딩 중일 때 */}
      {isLoading && (
        <View style={[styles.loadingOverlay, isDark && styles.loadingOverlayDark]}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={[styles.loadingText, isDark && styles.textLight]}>데이터 로딩 중...</Text>
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
          maxImages={5}
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
          ]}
        >
          <Text style={[styles.cancelButtonText, isDark && styles.textLight]}>취소</Text>
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
});
