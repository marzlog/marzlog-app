import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
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

export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { alert: showAlert, confirm } = useDialog();
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
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showMemo, setShowMemo] = useState(false);
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { startUpload, startGroupUpload, addToExistingGroup, pickFromGallery } = useImageUpload();

  // 현재 시간
  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? '오후' : '오전';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}시 ${minutes.toString().padStart(2, '0')}분 (${period})`;
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
      console.log('[Upload] Loading existing data for mediaId:', mediaId);

      // 미디어 상세 조회
      const mediaDetail = await getMediaDetail(mediaId);
      console.log('[Upload] Loaded media detail:', mediaDetail);

      // 폼에 데이터 설정
      setTitle(mediaDetail.title || '');
      setContent(mediaDetail.content || '');
      setMemo(mediaDetail.memo || '');
      if (mediaDetail.memo) setShowMemo(true);
      setSelectedEmotion(mediaDetail.emotion || null);
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
            const primaryIdx = groupData.items.findIndex((img: any) => img.is_primary === 'true');
            if (primaryIdx >= 0) setPrimaryImageIndex(primaryIdx);
          }
        } catch (e) {
          console.log('[Upload] No group images or error:', e);
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
      console.log('[Upload] Loaded images:', loadedImages.length);

    } catch (error) {
      console.error('[Upload] Failed to load existing data:', error);
      showAlert('데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // params에서 이미지 데이터 받기 (새 등록 모드에서만)
  useEffect(() => {
    if (isEditMode) return; // 편집 모드에서는 건너뛰기

    console.log('[Upload] useEffect - params:', params);
    console.log('[Upload] useEffect - params.images:', params.images);

    if (params.images) {
      try {
        const parsedImages = JSON.parse(params.images as string);
        console.log('[Upload] Parsed images:', parsedImages);
        console.log('[Upload] Parsed images count:', parsedImages.length);
        setImages(parsedImages);
      } catch (e) {
        console.error('[Upload] Failed to parse images:', e);
      }
    } else {
      console.log('[Upload] No images in params');
    }
  }, [params.images, isEditMode]);

  // ========== 유틸리티 함수 ==========

  // 확인 다이얼로그 (취소 확인용)
  const showConfirm = async (message: string, onConfirm: () => void) => {
    const confirmed = await confirm({
      title: '취소하시겠습니까?',
      description: message,
      confirmText: '확인',
      cancelText: '취소',
      variant: 'confirm',
    });
    if (confirmed) {
      onConfirm();
    }
  };

  // 뒤로가기
  const goBack = () => {
    console.log('[Upload] goBack - Platform:', Platform.OS);
    router.push('/(tabs)');
  };

  // ========== 이미지 핸들러 ==========

  const handleAddMoreImages = async () => {
    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      showAlert('최대 5장까지 추가할 수 있습니다. (대표 1장 + 서브 4장)');
      return;
    }
    const pickedItems = await pickFromGallery(true);
    if (pickedItems && pickedItems.length > 0) {
      const newImages = [...images, ...pickedItems].slice(0, 5);
      setImages(newImages);
    }
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
    console.log('[Upload] handleCancel');
    if (images.length > 0 || title || content || memo) {
      showConfirm('작성 중인 내용이 삭제됩니다. 취소하시겠습니까?', goBack);
    } else {
      goBack();
    }
  };

  // 수정 처리
  const handleUpdate = async () => {
    if (!mediaId) return;

    console.log('[Upload] ===== handleUpdate START =====');
    console.log('[Upload] images:', images.map(img => ({ id: img.id, isExisting: (img as any).isExisting })));
    console.log('[Upload] groupId:', groupId);
    console.log('[Upload] primaryImageIndex:', primaryImageIndex);
    setIsSubmitting(true);

    try {
      // 1. 새 이미지가 있으면 그룹에 추가
      // isExisting이 명시적으로 true가 아닌 이미지만 새 이미지로 간주
      const newImages = images.filter((img: any) => img.isExisting !== true);
      console.log('[Upload] newImages count:', newImages.length);

      if (newImages.length > 0 && groupId) {
        console.log('[Upload] Adding', newImages.length, 'new images to group:', groupId);
        const addResult = await addToExistingGroup(groupId, newImages);
        if (!addResult) {
          showAlert('새 이미지 추가 중 오류가 발생했습니다.');
          setIsSubmitting(false);
          return;
        }
        console.log('[Upload] New images added successfully');
      }

      // 2. 대표 이미지 변경 (기존 이미지 중에서 선택된 경우)
      if (groupId && images.length > 0) {
        const primaryImage = images[primaryImageIndex];
        // 기존 이미지이고 id가 있는 경우에만 대표 이미지 변경 API 호출
        if ((primaryImage as any)?.isExisting && primaryImage?.id) {
          console.log('[Upload] Setting primary image:', primaryImage.id);
          try {
            await setPrimaryImage(groupId, primaryImage.id);
            console.log('[Upload] Primary image updated');
          } catch (primaryError) {
            console.error('[Upload] Failed to set primary image:', primaryError);
            showAlert('대표 이미지 변경에 실패했습니다.');
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

      console.log('[Upload] Update data:', updateData);
      const result = await updateMedia(mediaId, updateData);
      console.log('[Upload] Update result:', result);

      showAlert('수정되었습니다.');
      // 캐시 문제 방지: 홈으로 이동하여 타임라인 새로고침
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[Upload] Update error:', error);
      showAlert('수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 등록 버튼 핸들러
  const handleSubmit = async () => {
    console.log('[Upload] ===== handleSubmit START =====');
    console.log('[Upload] isEditMode:', isEditMode);
    console.log('[Upload] images:', images);
    console.log('[Upload] images.length:', images.length);
    console.log('[Upload] primaryImageIndex:', primaryImageIndex);

    // 편집 모드일 때는 수정 처리
    if (isEditMode) {
      await handleUpdate();
      return;
    }

    // 새 등록 모드
    if (images.length === 0) {
      console.log('[Upload] No images - showing alert');
      showAlert('사진을 추가해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 선택한 날짜 (캘린더에서 전달받은 날짜)
      console.log('=== Upload Submit Debug ===');
      console.log('params:', JSON.stringify(params));
      console.log('params.selectedDate:', params.selectedDate);
      console.log('params.selectedDate type:', typeof params.selectedDate);

      const takenAt = params.selectedDate || undefined;
      console.log('[Upload] Using takenAt:', takenAt);

      if (takenAt) {
        console.log('[Upload] takenAt parsed as Date:', new Date(takenAt));
      }

      if (images.length === 1) {
        // 단일 이미지: 기존 업로드 방식
        console.log('[Upload] Single image upload');
        const results = await startUpload(images, takenAt);
        console.log('[Upload] Upload completed, results:', results.length);
      } else {
        // 여러 이미지: 그룹 업로드
        console.log('[Upload] Group upload with', images.length, 'images, primary:', primaryImageIndex);
        const result = await startGroupUpload(images, primaryImageIndex, takenAt);
        console.log('[Upload] Group upload completed:', result?.group_id);
      }

      router.push('/(tabs)');
    } catch (error) {
      console.error('[Upload] Upload error:', error);
      showAlert('업로드 중 오류가 발생했습니다.');
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
            console.log('[Upload] Back button pressed!');
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title and Time */}
        <View style={styles.titleSection}>
          <Text style={[styles.mainTitle, isDark && styles.textLight]}>
            {isEditMode ? '일상 수정하기' : '오늘의 일상을 등록하세요!'}
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
          <Text style={[styles.inputLabel, isDark && styles.textLight]}>제목</Text>
          <TextInput
            style={[styles.titleInput, isDark && styles.inputDark]}
            placeholder="제목을 입력하세요 (선택)"
            placeholderTextColor={isDark ? '#6B7280' : colors.neutral[5]}
            value={title}
            onChangeText={setTitle}
            maxLength={50}
          />
        </View>

        {/* Content Input */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, isDark && styles.textLight]}>내용</Text>
          <TextInput
            style={[styles.contentInput, isDark && styles.inputDark]}
            placeholder="오늘의 일상을 기록해보세요 (선택)"
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
          <Text style={[styles.memoToggleText, isDark && styles.textLight]}>메모 작성하기</Text>
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
              placeholder="추가 메모를 작성하세요..."
              placeholderTextColor={isDark ? '#6B7280' : colors.neutral[5]}
              value={memo}
              onChangeText={setMemo}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )}
      </ScrollView>

      {/* Bottom Buttons - ScrollView 밖에 배치 (position: absolute 제거) */}
      <View style={[styles.bottomButtons, isDark && styles.bottomButtonsDark, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* 취소 버튼 */}
        <Pressable
          onPress={() => {
            console.log('[Upload] Cancel button pressed!');
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
            console.log('[Upload] Submit button pressed!');
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
            <Text style={styles.submitButtonText}>{isEditMode ? '수정' : '등록'}</Text>
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
    color: '#fff',
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
