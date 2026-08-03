import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image as RNImage,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, getTheme } from '@/src/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import type { UploadItem } from '@/src/hooks/useImageUpload';

// Figma MO_HOM_0102 기준
const ROW_GAP = 12;
const DEFAULT_ASPECT_RATIO = 4 / 3;
const MAX_PRIMARY_HEIGHT = 350;

// 가로 1행 레이아웃 치수: [대표(크게)] [추가(작게)] [+]
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRIMARY_WIDTH = Math.min(Math.round(SCREEN_WIDTH * 0.62), 260);
const THUMB_SIZE = 104;

interface ImageSelectorProps {
  images: UploadItem[];
  primaryIndex: number;
  onAddImages: () => void;
  onRemoveImage: (index: number) => void;
  onSetPrimary: (index: number) => void;
  onEditImage?: (index: number) => void;
  maxImages?: number;
}

export function ImageSelector({
  images,
  primaryIndex,
  onAddImages,
  onRemoveImage,
  onSetPrimary,
  onEditImage,
  maxImages = 9,
}: ImageSelectorProps) {
  const { t } = useTranslation();
  // F-DARKMODE-LABELS: 다크모드 결정 — 홈 index.tsx 동형 (themeMode 'system'이면 시스템 설정)
  const { themeMode } = useSettingsStore();
  const systemColorScheme = useColorScheme();
  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';
  const theme = getTheme(isDark);

  // primaryIndex가 범위를 벗어나도 첫 장을 대표로 취급 (행 첫 슬롯이 비지 않게)
  const resolvedPrimaryIndex = images[primaryIndex] ? primaryIndex : 0;
  const primaryImage = images.length > 0 ? images[resolvedPrimaryIndex] : undefined;
  const additionalImages = images.filter((_, i) => i !== resolvedPrimaryIndex);
  const canAddMore = images.length < maxImages;

  // 대표 이미지 비율 동적 계산
  const [imageAspectRatio, setImageAspectRatio] = useState(DEFAULT_ASPECT_RATIO);

  useEffect(() => {
    if (primaryImage?.uri) {
      RNImage.getSize(
        primaryImage.uri,
        (width, height) => {
          if (width && height) {
            setImageAspectRatio(width / height);
          }
        },
        () => {
          setImageAspectRatio(DEFAULT_ASPECT_RATIO);
        }
      );
    } else {
      setImageAspectRatio(DEFAULT_ASPECT_RATIO);
    }
  }, [primaryImage?.uri]);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>{t('upload.primaryImageSection')}</Text>
        <TouchableOpacity style={styles.aiButton}>
          <Text style={styles.aiButtonText}>AI</Text>
        </TouchableOpacity>
      </View>

      {primaryImage ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rowContent}
        >
          {/* 첫 슬롯: 대표 이미지 (크게) — 대표 변경 시 자동으로 이 자리로 이동 */}
          <View
            style={[
              styles.primaryImageContainer,
              { aspectRatio: imageAspectRatio },
            ]}
          >
            <Image
              source={primaryImage.uri}
              style={styles.primaryImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            {/* 썸네일 X 버튼과 동일 계열 — 대형 슬롯이라 한 치수 크게.
                삭제 후 대표 승격은 호출부 + resolvedPrimaryIndex 방어에 위임 */}
            <TouchableOpacity
              style={styles.primaryRemoveButton}
              onPress={() => onRemoveImage(resolvedPrimaryIndex)}
            >
              <Ionicons name="close" size={15} color={colors.text.inverse} />
            </TouchableOpacity>
            {onEditImage && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => onEditImage(resolvedPrimaryIndex)}
              >
                <Ionicons name="pencil" size={16} color={colors.text.inverse} />
              </TouchableOpacity>
            )}
          </View>

          {/* 추가 이미지 (정사각 썸네일) */}
          {additionalImages.map((image) => {
            const actualIndex = images.findIndex((img) => img.id === image.id);
            return (
              <View key={image.id} style={styles.thumbItem}>
                <Image
                  source={image.uri}
                  style={styles.thumbImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemoveImage(actualIndex)}
                >
                  <Ionicons name="close" size={12} color={colors.text.inverse} />
                </TouchableOpacity>
                {onEditImage && (
                  <TouchableOpacity
                    style={styles.thumbEditButton}
                    onPress={() => onEditImage(actualIndex)}
                  >
                    <Ionicons name="pencil" size={11} color={colors.text.inverse} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.setPrimaryButton, { backgroundColor: theme.surface.elevated }]}
                  onPress={() => onSetPrimary(actualIndex)}
                >
                  <Ionicons name="star-outline" size={11} color={theme.text.primary} />
                </TouchableOpacity>
              </View>
            );
          })}

          {/* 항상 행의 마지막 — 한도 미만일 때만 */}
          {canAddMore && (
            <TouchableOpacity
              style={[styles.addMoreButton, { backgroundColor: theme.background.tertiary }]}
              onPress={onAddImages}
            >
              <Ionicons name="add" size={28} color={theme.icon.secondary} />
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        /* 빈 상태: 전체 탭으로 onAddImages (기존 동작 유지) */
        <TouchableOpacity
          style={[styles.primaryPlaceholder, { backgroundColor: theme.background.tertiary }]}
          onPress={onAddImages}
        >
          <View style={[styles.addIconContainer, { backgroundColor: theme.surface.primary }]}>
            <Ionicons name="add" size={32} color={theme.icon.secondary} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    // color는 인라인 theme.text.primary (F-DARKMODE-LABELS)
  },
  aiButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
  },
  aiButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    paddingRight: 4, // 마지막 항목이 화면 끝에 붙지 않도록
  },
  primaryImageContainer: {
    width: PRIMARY_WIDTH,
    // aspectRatio는 동적으로 적용됨 (이미지 원본 비율)
    maxHeight: MAX_PRIMARY_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  primaryImage: {
    width: '100%',
    height: '100%',
  },
  primaryPlaceholder: {
    width: '100%',
    aspectRatio: DEFAULT_ASPECT_RATIO, // 기본 4:3 비율
    maxHeight: MAX_PRIMARY_HEIGHT,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryRemoveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    // 썸네일과 같은 배치 규칙: X는 우상단, 연필은 우하단 (대표 X 버튼과 겹치지 않게)
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbItem: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEditButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setPrimaryButton: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreButton: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ImageSelector;
