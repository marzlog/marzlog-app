import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useAuthStore } from '@/src/store/authStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useMediaUpdatesStore } from '@/src/store/mediaUpdatesStore';
import { getBookmarks, BookmarkItem } from '@/src/api/media';
import { getLocalizedTitle } from '@/src/utils/i18n';
import { getErrorMessage } from '@/src/utils/errorMessages';
import { ScheduleCard } from '@/src/components/home';
import ErrorView from '@/src/components/common/ErrorView';
import { AppTouchable } from '@/src/components/common/AppTouchable';
import { Logo } from '@/src/components/common/Logo';
import { captureError } from '@/src/utils/sentry';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 40) / 2;
const PAGE_SIZE = 20;

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export default function BookmarksScreen() {
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const { t, language } = useTranslation();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const itemsRef = useRef<BookmarkItem[]>([]);
  const offsetRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  const loadBookmarks = useCallback(async (showLoading = true) => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    try {
      if (showLoading) setLoading(true);
      setError(null);
      offsetRef.current = 0;
      itemsRef.current = [];
      loadingMoreRef.current = false;
      hasMoreRef.current = true;

      const response = await getBookmarks(PAGE_SIZE, 0);
      itemsRef.current = response.items;
      offsetRef.current = response.items.length;
      hasMoreRef.current = response.has_more;
      setHasMore(response.has_more);
      setItems(response.items);
    } catch (err: any) {
      captureError(err instanceof Error ? err : new Error(String(err)), { context: 'Bookmarks.load' });
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    try {
      loadingMoreRef.current = true;
      setLoadingMore(true);
      const response = await getBookmarks(PAGE_SIZE, offsetRef.current);
      if (response.items.length > 0) {
        itemsRef.current = [...itemsRef.current, ...response.items];
        offsetRef.current += response.items.length;
        hasMoreRef.current = response.has_more;
        setHasMore(response.has_more);
        setItems([...itemsRef.current]);
      } else {
        hasMoreRef.current = false;
        setHasMore(false);
      }
    } catch (err: any) {
      captureError(err instanceof Error ? err : new Error(String(err)), { context: 'Bookmarks.loadMore' });
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, [loadBookmarks])
  );

  // 북마크 해제 broadcast 구독 → 목록에서 즉시 제거
  const lastBookmarkUpdate = useMediaUpdatesStore(s => s.lastBookmarkUpdate);
  useEffect(() => {
    if (!lastBookmarkUpdate) return;
    if (!lastBookmarkUpdate.isBookmarked) {
      itemsRef.current = itemsRef.current.filter(
        item => item.id !== lastBookmarkUpdate.mediaId
      );
      setItems([...itemsRef.current]);
    }
  }, [lastBookmarkUpdate]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadBookmarks(false);
  }, [loadBookmarks]);

  const renderItem = useCallback(({ item }: { item: BookmarkItem }) => {
    const displayTitle = getLocalizedTitle(
      item.title,
      null,
      language,
    ) || (language === 'ko' ? item.caption_ko : item.caption) || '';

    return (
      <View style={{ width: ITEM_SIZE, paddingHorizontal: 4, marginBottom: 8 }}>
        <ScheduleCard
          id={item.id}
          title={displayTitle}
          time={item.taken_at ? formatTime(item.taken_at) : ''}
          imageUrl={item.thumbnail_url || item.download_url || ''}
          emotion={item.emotion}
          size="compact"
          onPress={() => router.push(`/media/${item.id}` as any)}
        />
      </View>
    );
  }, [language, router]);

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="bookmark-outline"
          size={64}
          color={isDark ? '#4B5563' : '#D1D5DB'}
        />
        <Text style={[styles.emptyTitle, isDark && styles.textLight]}>
          {t('bookmarks.empty' as any)}
        </Text>
        <Text style={[styles.emptySubtitle, isDark && styles.textMuted]}>
          {t('bookmarks.emptyHint' as any)}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={isDark ? '#9CA3AF' : '#6B7280'} />
      </View>
    );
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <AppTouchable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#F9FAFB' : '#1F2937'} />
        </AppTouchable>
        <View style={styles.headerCenter}>
          <Logo size={32} showText={false} color={isDark ? '#F9FAFB' : '#1F2937'} />
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>
            {t('bookmarks.title' as any)}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#9CA3AF' : '#6B7280'} />
        </View>
      ) : error ? (
        <ErrorView
          message={error}
          onRetry={() => loadBookmarks()}
          textColor={isDark ? '#F9FAFB' : '#1F2937'}
          subTextColor={isDark ? '#9CA3AF' : '#6B7280'}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 32,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    width: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '300',
    color: '#1F2937',
  },
  textLight: {
    color: '#F9FAFB',
  },
  textMuted: {
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'flex-start',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
