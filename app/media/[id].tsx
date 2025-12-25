import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMediaDetail, getMediaAnalysis } from '@/src/api/media';
import { colors } from '@/src/theme';
import type { MediaDetail, MediaAnalysis } from '@/src/types/media';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 40;

export default function MediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [media, setMedia] = useState<MediaDetail | null>(null);
  const [analysis, setAnalysis] = useState<MediaAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        getMediaAnalysis(id!).catch(() => null),
      ]);

      setMedia(mediaData);
      setAnalysis(analysisData);
    } catch (err) {
      console.error('Load error:', err);
      setError(err instanceof Error ? err.message : '로딩 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  const handleConfirm = () => {
    router.back();
  };

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

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text style={styles.loadingText}>불러오는 중...</Text>
      </View>
    );
  }

  if (error || !media) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error || '사진을 찾을 수 없습니다'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>상세보기</Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: media.download_url }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        {/* AI Caption */}
        {analysis?.caption && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>✨</Text>
              <Text style={styles.sectionTitle}>AI Caption</Text>
            </View>
            <Text style={styles.captionText}>{analysis.caption}</Text>
          </View>
        )}

        {/* Scene Type */}
        {analysis?.scene_type && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📋</Text>
              <Text style={styles.sectionTitle}>Scene Type</Text>
            </View>
            <View style={styles.chipContainer}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>
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
              <Text style={styles.sectionTitle}>Tags</Text>
            </View>
            <View style={styles.tagsContainer}>
              {analysis.tags.map((tag, index) => (
                <View key={index} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
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
              <Text style={styles.sectionTitle}>Detected Text (OCR)</Text>
            </View>
            <View style={styles.ocrBox}>
              <Text style={styles.ocrText}>{analysis.ocr_text}</Text>
            </View>
          </View>
        )}

        {/* Photo Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📷</Text>
            <Text style={styles.sectionTitle}>Photo Details</Text>
          </View>
          <View style={styles.detailsContainer}>
            {analysis?.exif?.width && analysis?.exif?.height && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Resolution</Text>
                <Text style={styles.detailValue}>
                  {analysis.exif.width} x {analysis.exif.height}
                </Text>
              </View>
            )}
            {(analysis?.taken_at || media.taken_at) && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Taken</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(analysis?.taken_at || media.taken_at!)}
                </Text>
              </View>
            )}
            {analysis?.exif?.camera_model && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Camera</Text>
                <Text style={styles.detailValue}>
                  {`${analysis.exif.camera_make || ''} ${analysis.exif.camera_model}`.trim()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Pending Analysis */}
        {!analysis?.caption && (
          <View style={styles.section}>
            <View style={styles.pendingBox}>
              <Ionicons name="hourglass-outline" size={24} color={colors.neutral[5]} />
              <Text style={styles.pendingText}>AI 분석 대기 중...</Text>
            </View>
          </View>
        )}

        {/* Bottom Spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirm Button - Fixed at bottom */}
      <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
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
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
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
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.neutral[2],
    marginBottom: 24,
  },
  image: {
    width: '100%',
    height: '100%',
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
