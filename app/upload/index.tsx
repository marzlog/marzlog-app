import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  StatusBar,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/src/theme';
import { useImageUpload, ImagePickerItem } from '@/src/hooks/useImageUpload';
import { ImageSelector, EmotionPicker, IntensitySlider } from '@/src/components/upload';

export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [images, setImages] = useState<ImagePickerItem[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showMemo, setShowMemo] = useState(false);
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { startUpload, pickFromGallery } = useImageUpload();

  // 현재 시간
  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? '오후' : '오전';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}시 ${minutes.toString().padStart(2, '0')}분 (${period})`;
  };

  // params에서 이미지 데이터 받기
  useEffect(() => {
    if (params.images) {
      try {
        const parsedImages = JSON.parse(params.images as string);
        setImages(parsedImages);
      } catch (e) {
        console.error('Failed to parse images:', e);
      }
    }
  }, [params.images]);

  const handleAddMoreImages = async () => {
    const remainingSlots = 9 - images.length;
    if (remainingSlots <= 0) {
      Alert.alert('알림', '최대 9장까지 추가할 수 있습니다.');
      return;
    }
    const pickedItems = await pickFromGallery(true);
    if (pickedItems && pickedItems.length > 0) {
      const newImages = [...images, ...pickedItems].slice(0, 9);
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

  // 뒤로가기 또는 홈으로 이동
  const goBack = () => {
    console.log('[Upload] goBack called, canGoBack:', router.canGoBack());
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const handleBack = () => {
    console.log('[Upload] handleBack called');
    if (images.length > 0 || title || content || memo) {
      Alert.alert(
        '등록 취소',
        '작성 중인 내용이 삭제됩니다. 취소하시겠습니까?',
        [
          { text: '계속 작성', style: 'cancel' },
          { text: '취소', style: 'destructive', onPress: goBack },
        ]
      );
    } else {
      goBack();
    }
  };

  const handleSubmit = async () => {
    console.log('[Upload] handleSubmit called, images:', images.length);

    if (images.length === 0) {
      Alert.alert('알림', '사진을 추가해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 대표 이미지를 첫 번째로 정렬
      const sortedImages = [...images];
      if (primaryImageIndex > 0) {
        const [primaryImage] = sortedImages.splice(primaryImageIndex, 1);
        sortedImages.unshift(primaryImage);
      }

      console.log('[Upload] Starting upload...');
      const results = await startUpload(sortedImages);
      console.log('[Upload] Upload results:', results.length);

      if (results.length > 0) {
        console.log('[Upload] Navigating to home...');
        router.replace('/(tabs)/home');
      } else {
        // 업로드 실패해도 홈으로 이동 (취소된 경우)
        console.log('[Upload] No results, going back...');
        goBack();
      }
    } catch (error) {
      console.error('[Upload] Error:', error);
      Alert.alert('오류', '업로드 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerSpacer} />
        <Pressable style={styles.headerButton}>
          <Ionicons name="pencil-outline" size={20} color={colors.text.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title and Time */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>오늘의 일상을 등록하세요!</Text>
          <Text style={styles.timeText}>{getCurrentTime()}</Text>
        </View>

        {/* Image Selector */}
        <ImageSelector
          images={images}
          primaryIndex={primaryImageIndex}
          onAddImages={handleAddMoreImages}
          onRemoveImage={handleRemoveImage}
          onSetPrimary={handleSetPrimary}
          maxImages={9}
        />

        {/* Emotion Picker */}
        <EmotionPicker
          selectedEmotion={selectedEmotion}
          onSelect={setSelectedEmotion}
        />

        {/* Intensity Slider (감정 선택 후 표시) */}
        {selectedEmotion && (
          <IntensitySlider
            value={intensity}
            onChange={setIntensity}
          />
        )}

        {/* Title Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>제목</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="제목을 입력하세요 (선택)"
            placeholderTextColor={colors.neutral[5]}
            value={title}
            onChangeText={setTitle}
            maxLength={50}
          />
        </View>

        {/* Content Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>내용</Text>
          <TextInput
            style={styles.contentInput}
            placeholder="오늘의 일상을 기록해보세요 (선택)"
            placeholderTextColor={colors.neutral[5]}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Memo Toggle */}
        <View style={styles.memoToggleContainer}>
          <Text style={styles.memoToggleText}>메모 작성하기</Text>
          <Switch
            value={showMemo}
            onValueChange={setShowMemo}
            trackColor={{ false: colors.neutral[2], true: colors.brand.primary }}
            thumbColor={colors.background}
          />
        </View>

        {/* Memo Input */}
        {showMemo && (
          <View style={styles.memoContainer}>
            <TextInput
              style={styles.memoInput}
              placeholder="추가 메모를 작성하세요..."
              placeholderTextColor={colors.neutral[5]}
              value={memo}
              onChangeText={setMemo}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Bottom Spacer */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleBack}
          disabled={isSubmitting}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.cancelButtonText}>취소</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            (isSubmitting || images.length === 0) && styles.submitButtonDisabled,
            pressed && !isSubmitting && images.length > 0 && styles.buttonPressed,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || images.length === 0}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <Text style={styles.submitButtonText}>등록</Text>
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
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
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
    fontWeight: '400',
    color: colors.text.primary,
  },
  contentInput: {
    backgroundColor: colors.neutral[2],
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: '400',
    color: colors.text.primary,
    minHeight: 100,
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
    fontWeight: '400',
    color: colors.text.primary,
    minHeight: 80,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[2],
    zIndex: 100,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  cancelButton: {
    flex: 1,
    height: 56,
    backgroundColor: colors.neutral[2],
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  submitButton: {
    flex: 1,
    height: 56,
    backgroundColor: colors.text.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});
