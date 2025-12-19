import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import timelineApi, { TimelineItem } from '@/src/api/timeline';
import { useAuthStore } from '@/src/store/authStore';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 3;
const PAGE_SIZE = 30;

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface DateGroup {
  date: string;
  items: TimelineItem[];
}

export default function TimelineScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { accessToken } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const allItemsRef = useRef<TimelineItem[]>([]);
  const offsetRef = useRef(0);
  const loadingRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  const loadTimeline = useCallback(async (showLoading = true) => {
    // 토큰이 없으면 API 호출하지 않음
    if (!accessToken) {
      console.log('[Timeline] No token, skipping API call');
      setLoading(false);
      return;
    }

    try {
      if (showLoading) {
        loadingRef.current = true;
        setLoading(true);
      }
      setError(null);
      offsetRef.current = 0;
      allItemsRef.current = [];
      loadingMoreRef.current = false;
      hasMoreRef.current = true;

      const response = await timelineApi.getTimeline(PAGE_SIZE, 0);
      setTotal(response.total);
      allItemsRef.current = response.items;
      offsetRef.current = response.items.length;
      setLoadedCount(response.items.length);
      hasMoreRef.current = response.items.length < response.total;
      setHasMore(hasMoreRef.current);

      const groups = groupByDate(response.items);
      setDateGroups(groups);
    } catch (err: any) {
      console.error('Timeline load error:', err);
      setError(err.message || '타임라인을 불러올 수 없습니다');
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current) return;

    try {
      loadingMoreRef.current = true;
      setLoadingMore(true);
      const response = await timelineApi.getTimeline(PAGE_SIZE, offsetRef.current);

      if (response.items.length > 0) {
        allItemsRef.current = [...allItemsRef.current, ...response.items];
        offsetRef.current += response.items.length;
        setLoadedCount(allItemsRef.current.length);
        hasMoreRef.current = allItemsRef.current.length < response.total;
        setHasMore(hasMoreRef.current);

        const groups = groupByDate(allItemsRef.current);
        setDateGroups(groups);
      } else {
        hasMoreRef.current = false;
        setHasMore(false);
      }
    } catch (err: any) {
      console.error('Load more error:', err);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  const groupByDate = (items: TimelineItem[]): DateGroup[] => {
    const grouped: Record<string, TimelineItem[]> = {};
    items.forEach((item) => {
      const dateStr = item.media?.taken_at || item.created_at;
      const date = new Date(dateStr).toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({ date, items }));
  };

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTimeline(false);
  }, [loadTimeline]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (dateStr === todayStr) return '오늘';
    if (dateStr === yesterdayStr) return '어제';
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // AWS S3 presigned URL 직접 사용
  const getImageUrl = (item: TimelineItem): string => {
    return item.media?.download_url || item.media?.thumbnail_url || '';
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={[styles.loadingText, isDark && styles.textLight]}>타임라인 불러오는 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, isDark && styles.containerDark]}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={[styles.errorText, isDark && styles.textLight]}>{error}</Text>
        <Text style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
          Token: {accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadTimeline()}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderDateSection = ({ item }: { item: DateGroup }) => (
    <View style={styles.dateSection}>
      <Text style={[styles.dateHeader, isDark && styles.textLight]}>{formatDate(item.date)}</Text>
      <View style={styles.gridContainer}>
        {item.items.map((photo) => (
          <TouchableOpacity key={photo.id} style={styles.gridItem} activeOpacity={0.8}>
            <Image
              source={{
                uri: getImageUrl(photo),
                
              }}
              style={styles.gridImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // dateGroups에서 직접 계산 (React Native Web Text 업데이트 버그 우회)
  const displayCount = dateGroups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.statsBar}>
        <Text key={`stats-${displayCount}-${total}`} style={[styles.statsText, isDark && styles.textLight]}>{displayCount} / {total}장의 사진</Text>
      </View>
      <FlatList
        data={dateGroups}
        keyExtractor={(item) => item.date}
        renderItem={renderDateSection}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} tintColor="#6366F1" />}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color="#6366F1" />
              <Text style={styles.loadingMoreText}>더 불러오는 중...</Text>
            </View>
          ) : !hasMore && dateGroups.length > 0 ? (
            <View style={styles.endOfList}>
              <Text style={styles.endOfListText}>모든 사진을 불러왔습니다</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={64} color={isDark ? '#6B7280' : '#D1D5DB'} />
            <Text style={[styles.emptyText, isDark && styles.textLight]}>아직 사진이 없습니다</Text>
            <Text style={styles.emptySubtext}>사진을 업로드하여 추억을 기록하세요</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  containerDark: { backgroundColor: '#111827' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6B7280' },
  errorText: { marginTop: 16, fontSize: 16, color: '#374151', textAlign: 'center', paddingHorizontal: 32 },
  retryButton: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#6366F1', borderRadius: 8 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statsBar: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  statsText: { fontSize: 14, color: '#6B7280' },
  listContent: { paddingVertical: 16 },
  dateSection: { marginBottom: 24, paddingHorizontal: 16 },
  dateHeader: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  textLight: { color: '#F9FAFB' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  gridItem: { width: ITEM_SIZE, height: ITEM_SIZE, borderRadius: 8, overflow: 'hidden', backgroundColor: '#E5E7EB' },
  gridImage: { width: '100%', height: '100%' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  loadingMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 8 },
  loadingMoreText: { fontSize: 14, color: '#6B7280' },
  endOfList: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  endOfListText: { fontSize: 14, color: '#9CA3AF' },
});
