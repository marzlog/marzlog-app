import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image as RNImage,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme';
import type { UploadItem } from '@/src/hooks/useImageUpload';

// Figma MO_HOM_0102 기준
const GRID_GAP = 12;
const DEFAULT_ASPECT_RATIO = 4 / 3;
const MAX_PRIMARY_HEIGHT = 350;

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
  const primaryImage = images[primaryIndex];
  const additionalImages = images.filter((_, i) => i !== primaryIndex);

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
        (error) => {
          console.log('[ImageSelector] Failed to get image size:', error);
          setImageAspectRatio(DEFAULT_ASPECT_RATIO);
        }
      );
    } else {
      setImageAspectRatio(DEFAULT_ASPECT_RATIO);
    }
  }, [primaryImage?.uri]);

  return (
    <View style={styles.container}>
      {/* Primary Image Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>대표 이미지</Text>
          <TouchableOpacity style={styles.aiButton}>
            <Text style={styles.aiButtonText}>AI</Text>
          </TouchableOpacity>
        </View>

        {primaryImage ? (
          <View style={[styles.primaryImageContainer, { aspectRatio: imageAspectRatio }]}>
            <Image
              source={primaryImage.uri}
              style={styles.primaryImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            {onEditImage && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => onEditImage(primaryIndex)}
              >
                <Ionicons name="pencil" size={16} color={colors.text.inverse} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.primaryPlaceholder}
            onPress={onAddImages}
          >
            <View style={styles.addIconContainer}>
              <Ionicons name="add" size={32} color={colors.neutral[5]} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Additional Images Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>추가 이미지</Text>

        <View style={styles.imageGrid}>
          {/* Show additional images */}
          {additionalImages.map((image, index) => {
            const actualIndex = images.findIndex((img) => img.id === image.id);
            return (
              <View key={image.id} style={styles.gridItem}>
                <Image
                  source={image.uri}
                  style={styles.gridImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemoveImage(actualIndex)}
                >
                  <Ionicons name="close" size={14} color={colors.text.inverse} />
                </TouchableOpacity>
                {onEditImage && (
                  <TouchableOpacity
                    style={styles.gridEditButton}
                    onPress={() => onEditImage(actualIndex)}
                  >
                    <Ionicons name="pencil" size={12} color={colors.text.inverse} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.setPrimaryButton}
                  onPress={() => onSetPrimary(actualIndex)}
                >
                  <Ionicons name="star-outline" size={12} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            );
          })}

          {/* Add more button */}
          {images.length < maxImages && (
            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={onAddImages}
            >
              <Ionicons name="add" size={24} color={colors.neutral[5]} />
            </TouchableOpacity>
          )}

          {/* Empty placeholders - 2열 그리드에 맞게 조정 */}
          {Array.from({ length: Math.max(0, 3 - additionalImages.length - (images.length < maxImages ? 1 : 0)) }).map(
            (_, index) => (
              <View key={`empty-${index}`} style={styles.emptyPlaceholder} />
            )
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
    marginBottom: 24,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
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
  primaryImageContainer: {
    width: '100%',
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
    backgroundColor: colors.neutral[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.neutral['0.5'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridItem: {
    width: '48%', // Figma: 2열 그리드, 각 약 170x170
    aspectRatio: 1, // 1:1 정사각형
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridEditButton: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setPrimaryButton: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.neutral['0.5'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreButton: {
    width: '48%', // Figma: 2열 그리드
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: colors.neutral[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPlaceholder: {
    width: '48%', // Figma: 2열 그리드
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: colors.neutral[2],
    opacity: 0.5,
  },
});

export default ImageSelector;
