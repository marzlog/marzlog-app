import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMediaDetail, getMediaAnalysis, deleteMedia } from '@/src/api/media';
import { colors } from '@/src/theme';
import type { MediaDetail, MediaAnalysis } from '@/src/types/media';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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

      // 미디어 상세 + 분석 결과 동시 요청
      const [mediaData, analysisData] = await Promise.all([
        getMediaDetail(id!),
        getMediaAnalysis(id!).catch(() => null), // 분석 없으면 null
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

  const handleDelete = () => {
    Alert.alert(
      '사진 삭제',
      '이 사진을 삭제하시겠습니까?\n삭제된 사진은 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMedia(id!);
              Alert.alert('완료', '사진이 삭제되었습니다.');
              router.back();
            } catch (err) {
              Alert.alert('오류', '삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text style={styles.loadingText}>불러오는 중...</Text>
      </View>
    );
  }

  if (error || !media) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error || '사진을 찾을 수 없습니다'}</Text>
        <Pressable style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  const sceneTypeKorean: Record<string, string> = {
    people: '인물',
    landscape: '풍경',
    food: '음식',
    animal: '동물',
    text: '문서/텍스트',
    object: '사물',
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '사진 상세',
          headerRight: () => (
            <Pressable onPress={handleDelete} style={{ padding: 8 }}>
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        {/* 이미지 */}
        <Image
          source={{ uri: media.download_url }}
          style={styles.image}
          resizeMode="contain"
        />

        {/* AI 캡션 */}
        {analysis?.caption && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubble-outline" size={20} color={colors.brand.primary} />
              <Text style={styles.sectionTitle}>AI 캡션</Text>
            </View>
            <Text style={styles.caption}>{analysis.caption}</Text>
          </View>
        )}

        {/* Scene 타입 */}
        {analysis?.scene_type && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="image-outline" size={20} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>장면 분류</Text>
            </View>
            <View style={styles.sceneBadge}>
              <Text style={styles.sceneText}>
                {sceneTypeKorean[analysis.scene_type] || analysis.scene_type}
              </Text>
            </View>
            {/* Scene Scores */}
            {analysis.scene_scores && (
              <View style={styles.sceneScores}>
                {Object.entries(analysis.scene_scores)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3)
                  .map(([type, score]) => (
                    <View key={type} style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>
                        {sceneTypeKorean[type] || type}
                      </Text>
                      <View style={styles.scoreBarBg}>
                        <View
                          style={[styles.scoreBar, { width: `${score * 100}%` }]}
                        />
                      </View>
                      <Text style={styles.scoreValue}>
                        {(score * 100).toFixed(0)}%
                      </Text>
                    </View>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* 태그 */}
        {analysis?.tags && analysis.tags.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pricetags-outline" size={20} color="#10B981" />
              <Text style={styles.sectionTitle}>태그</Text>
            </View>
            <View style={styles.tagsContainer}>
              {analysis.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* OCR 텍스트 */}
        {analysis?.ocr_text && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="text-outline" size={20} color="#F59E0B" />
              <Text style={styles.sectionTitle}>인식된 텍스트 (OCR)</Text>
            </View>
            <View style={styles.ocrBox}>
              <Text style={styles.ocrText}>{analysis.ocr_text}</Text>
            </View>
          </View>
        )}

        {/* 메타데이터 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>정보</Text>
          </View>
          <View style={styles.metadataList}>
            {(analysis?.taken_at || media.taken_at) && (
              <MetadataRow
                icon="calendar-outline"
                label="촬영일"
                value={new Date(analysis?.taken_at || media.taken_at!).toLocaleString('ko-KR')}
              />
            )}
            {analysis?.exif?.width && analysis?.exif?.height && (
              <MetadataRow
                icon="resize-outline"
                label="해상도"
                value={`${analysis.exif.width} × ${analysis.exif.height}`}
              />
            )}
            {analysis?.exif?.camera_model && (
              <MetadataRow
                icon="camera-outline"
                label="카메라"
                value={`${analysis.exif.camera_make || ''} ${analysis.exif.camera_model}`.trim()}
              />
            )}
            {analysis?.exif?.has_gps && analysis?.exif?.gps && (
              <MetadataRow
                icon="location-outline"
                label="위치"
                value={`${analysis.exif.gps.latitude.toFixed(4)}, ${analysis.exif.gps.longitude.toFixed(4)}`}
              />
            )}
            <MetadataRow
              icon="document-outline"
              label="파일명"
              value={media.metadata?.original_filename || '-'}
            />
            <MetadataRow
              icon="time-outline"
              label="업로드"
              value={new Date(media.created_at).toLocaleString('ko-KR')}
            />
          </View>
        </View>

        {/* 분석 상태 */}
        {!analysis?.caption && (
          <View style={styles.section}>
            <View style={styles.pendingBox}>
              <Ionicons name="hourglass-outline" size={24} color="#6B7280" />
              <Text style={styles.pendingText}>AI 분석 대기 중...</Text>
            </View>
          </View>
        )}

        {/* 하단 여백 */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

// 메타데이터 행 컴포넌트
function MetadataRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metadataRow}>
      <Ionicons name={icon} size={16} color="#9CA3AF" />
      <Text style={styles.metadataLabel}>{label}</Text>
      <Text style={styles.metadataValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
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
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#F3F4F6',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  caption: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  sceneBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EDE9FE',
    borderRadius: 16,
  },
  sceneText: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500',
  },
  sceneScores: {
    marginTop: 12,
    gap: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6B7280',
    width: 60,
  },
  scoreBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 12,
    color: '#6B7280',
    width: 36,
    textAlign: 'right',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: '#059669',
  },
  ocrBox: {
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ocrText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  metadataList: {
    gap: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    width: 60,
  },
  metadataValue: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  pendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    gap: 8,
  },
  pendingText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
