import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 2;

// Mock albums data
const MOCK_ALBUMS = [
  {
    id: '1',
    name: '여행',
    count: 128,
    coverUri: 'https://picsum.photos/400/400?random=20',
  },
  {
    id: '2',
    name: '가족',
    count: 64,
    coverUri: 'https://picsum.photos/400/400?random=21',
  },
  {
    id: '3',
    name: '음식',
    count: 89,
    coverUri: 'https://picsum.photos/400/400?random=22',
  },
  {
    id: '4',
    name: '일상',
    count: 234,
    coverUri: 'https://picsum.photos/400/400?random=23',
  },
  {
    id: '5',
    name: '친구들',
    count: 45,
    coverUri: 'https://picsum.photos/400/400?random=24',
  },
  {
    id: '6',
    name: '반려동물',
    count: 78,
    coverUri: 'https://picsum.photos/400/400?random=25',
  },
];

export default function AlbumsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const renderAlbumItem = ({ item }: { item: typeof MOCK_ALBUMS[0] }) => (
    <TouchableOpacity style={styles.albumItem} activeOpacity={0.8}>
      <View style={styles.albumCover}>
        <Image source={{ uri: item.coverUri }} style={styles.albumImage} />
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
            AI 자동 분류
          </Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>모두 보기</Text>
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
              앨범이 없습니다
            </Text>
            <Text style={styles.emptySubtext}>
              사진을 업로드하면 AI가 자동으로 분류합니다
            </Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.createAlbumButton}>
            <Ionicons name="add-circle-outline" size={24} color="#6366F1" />
            <Text style={styles.createAlbumText}>새 앨범 만들기</Text>
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
