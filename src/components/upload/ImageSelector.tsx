import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme';
import type { UploadItem } from '@/src/hooks/useImageUpload';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRIMARY_IMAGE_SIZE = SCREEN_WIDTH - 40;
const GRID_GAP = 8;
const GRID_COLUMNS = 3;
const GRID_IMAGE_SIZE = (SCREEN_WIDTH - 40 - (GRID_COLUMNS - 1) * GRID_GAP) / GRID_COLUMNS;

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
          <View style={styles.primaryImageContainer}>
            <Image
              source={{ uri: primaryImage.uri }}
              style={styles.primaryImage}
              resizeMode="cover"
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
                  source={{ uri: image.uri }}
                  style={styles.gridImage}
                  resizeMode="cover"
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

          {/* Empty placeholders */}
          {Array.from({ length: Math.max(0, 5 - additionalImages.length - (images.length < maxImages ? 1 : 0)) }).map(
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
    width: PRIMARY_IMAGE_SIZE,
    height: PRIMARY_IMAGE_SIZE * 0.75,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  primaryImage: {
    width: '100%',
    height: '100%',
  },
  primaryPlaceholder: {
    width: PRIMARY_IMAGE_SIZE,
    height: PRIMARY_IMAGE_SIZE * 0.75,
    borderRadius: 20,
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
    width: GRID_IMAGE_SIZE,
    height: GRID_IMAGE_SIZE,
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
    width: GRID_IMAGE_SIZE,
    height: GRID_IMAGE_SIZE,
    borderRadius: 12,
    backgroundColor: colors.neutral[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPlaceholder: {
    width: GRID_IMAGE_SIZE,
    height: GRID_IMAGE_SIZE,
    borderRadius: 12,
    backgroundColor: colors.neutral[2],
    opacity: 0.5,
  },
});

export default ImageSelector;
