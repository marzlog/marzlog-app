import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 2;

// Mock album keys (mapped to i18n)
const MOCK_ALBUM_KEYS = ['travel', 'family', 'food', 'daily', 'friends', 'pets'] as const;
const MOCK_ALBUM_COUNTS = [128, 64, 89, 234, 45, 78];
const MOCK_ALBUM_RANDOMS = [20, 21, 22, 23, 24, 25];

export default function AlbumsScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();

  // 다크모드 결정: themeMode가 'system'이면 시스템 설정, 아니면 직접 설정값 사용
  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const MOCK_ALBUMS = MOCK_ALBUM_KEYS.map((key, i) => ({
    id: String(i + 1),
    name: t(`albums.${key}` as any),
    count: MOCK_ALBUM_COUNTS[i],
    coverUri: `https://picsum.photos/400/400?random=${MOCK_ALBUM_RANDOMS[i]}`,
  }));

  const renderAlbumItem = ({ item }: { item: typeof MOCK_ALBUMS[0] }) => (
    <TouchableOpacity style={styles.albumItem} activeOpacity={0.8}>
      <View style={styles.albumCover}>
        <Image source={item.coverUri} style={styles.albumImage} contentFit="cover" cachePolicy="memory-disk" />
        <View style={styles.albumOverlay}>
          <Ionicons name="images" size={16} color="#fff" />
          <Text style={styles.photoCount}>{item.count}</Text>
        </View>
      </View>
      <Text style={[styles.albumName, isDark && styles.textLight]} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* AI Generated Albums Section */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="sparkles" size={18} color="#6366F1" />
          <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
            {t('albums.aiAutoClassify')}
          </Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>{t('albums.seeAll')}</Text>
        </TouchableOpacity>
      </View>

      {/* Albums Grid */}
      <FlatList
        data={MOCK_ALBUMS}
        keyExtractor={(item) => item.id}
        renderItem={renderAlbumItem}
        numColumns={2}
        contentContainerStyle={styles.albumsContainer}
        columnWrapperStyle={styles.albumsRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="albums-outline"
              size={64}
              color={isDark ? '#6B7280' : '#D1D5DB'}
            />
            <Text style={[styles.emptyText, isDark && styles.textLight]}>
              {t('albums.empty')}
            </Text>
            <Text style={styles.emptySubtext}>
              {t('albums.emptyDesc')}
            </Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.createAlbumButton}>
            <Ionicons name="add-circle-outline" size={24} color="#6366F1" />
            <Text style={styles.createAlbumText}>{t('albums.createNew')}</Text>
          </TouchableOpacity>
        }
      />
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  textLight: {
    color: '#F9FAFB',
  },
  seeAllText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  albumsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  albumsRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  albumItem: {
    width: ITEM_SIZE,
  },
  albumCover: {
    width: '100%',
    height: ITEM_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  albumImage: {
    width: '100%',
    height: '100%',
  },
  albumOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  photoCount: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  albumName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  createAlbumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  createAlbumText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
});
