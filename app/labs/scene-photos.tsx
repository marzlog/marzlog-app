import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { getScenePhotos, type ScenePhoto } from '@/src/api/scene';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GRID_GAP = 2;
const ITEM_SIZE = (width - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const PAGE_SIZE = 30;

export default function ScenePhotosScreen() {
  const { scene_type } = useLocalSearchParams<{ scene_type: string }>();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const [photos, setPhotos] = useState<ScenePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchPhotos = useCallback(async (offset = 0) => {
    if (!scene_type) return;
    try {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      const data = await getScenePhotos(scene_type, PAGE_SIZE, offset);
      if (offset === 0) {
        setPhotos(data.items);
      } else {
        setPhotos((prev) => [...prev, ...data.items]);
      }
      setHasMore(data.has_more);
      setTotal(data.total);
    } catch (e) {
      // silently fail
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [scene_type]);

  useEffect(() => {
    fetchPhotos(0);
  }, [fetchPhotos]);

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    fetchPhotos(photos.length);
  };

  const handlePhotoPress = (photo: ScenePhoto) => {
    router.push(`/media/${photo.media_id}` as any);
  };

  const categoryLabel = scene_type ? t(`labs.${scene_type}` as any) : '';

  const renderItem = ({ item }: { item: ScenePhoto }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => handlePhotoPress(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.thumbnail_url ?? undefined }}
        style={styles.gridImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}
      />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#F9FAFB' : '#1F2937'} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>{categoryLabel}</Text>
          {!loading && (
            <Text style={styles.headerCount}>{total}</Text>
          )}
        </View>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#9CA3AF' : '#6B7280'} />
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>{t('labs.noPhotos')}</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.row}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color="#9CA3AF" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '300',
    color: '#1F2937',
  },
  headerCount: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  textLight: {
    color: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  row: {
    gap: GRID_GAP,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    marginBottom: GRID_GAP,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
