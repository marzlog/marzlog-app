import { useColorScheme } from '@/components/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import searchApi, { SearchResult } from '@/src/api/search';
import { useMediaUpdatesStore } from '@/src/store/mediaUpdatesStore';
import { colors } from '@/src/theme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { ScheduleCard } from '@/src/components/home';
import { Logo } from '@/src/components/common/Logo';
import { getErrorMessage } from '@/src/utils/errorMessages';
import ErrorView from '@/src/components/common/ErrorView';
import { AiNotice } from '@/src/components/common/AiNotice';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 40) / 2;
const RECENT_SEARCHES_KEY = 'marzlog_recent_searches';
const MAX_RECENT_SEARCHES = 10;
const DEBOUNCE_DELAY = 300;

const CATEGORY_ICONS = ['🍽️', '👨‍👩‍👧', '🎉', '🌅', '👥', '✈️', '📝'];
const TIP_ICONS = ['💬', '🎯', '📅'];

export default function SearchScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const ROTATING_PLACEHOLDERS = [
    t('search.placeholder1'), t('search.placeholder2'), t('search.placeholder3'),
    t('search.placeholder4'), t('search.placeholder5'), t('search.placeholder6'),
  ];
  const CATEGORY_CHIPS = [
    { label: t('search.catFood'), icon: '🍽️', query: t('search.catFood') },
    { label: t('search.catFamily'), icon: '👨‍👩‍👧', query: t('search.catFamily') },
    { label: t('search.catSpecial'), icon: '🎉', query: t('search.catSpecialQuery') },
    { label: t('search.catScenery'), icon: '🌅', query: t('search.catSceneryQuery') },
    { label: t('search.catFriends'), icon: '👥', query: t('search.catFriends') },
    { label: t('search.catTravel'), icon: '✈️', query: t('search.catTravel') },
    { label: t('search.catText'), icon: '📝', query: '' },
  ];
  const SEARCH_TIPS = [
    { icon: '💬', example: t('search.tipExample1'), desc: t('search.tipDesc1') },
    { icon: '🎯', example: t('search.tipExample2'), desc: t('search.tipDesc2') },
    { icon: '📅', example: t('search.tipExample3'), desc: t('search.tipDesc3') },
  ];

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const [query, setQuery] = useState('');
  const [isBookmarkFilter, setIsBookmarkFilter] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholderOpacity = useRef(new Animated.Value(1)).current;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  // 회전 placeholder 애니메이션
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(placeholderOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setPlaceholderIndex(i => (i + 1) % ROTATING_PLACEHOLDERS.length);
        Animated.timing(placeholderOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // 미디어 메타데이터(emotion) 변경 broadcast 구독 →
  // results 배열에서 해당 항목만 in-place patch (스크롤 위치 유지, 전체 refetch X)
  const lastEmotionUpdate = useMediaUpdatesStore(s => s.lastEmotionUpdate);
  useEffect(() => {
    if (!lastEmotionUpdate) return;
    setResults(prev => prev.map(r =>
      r.media_id === lastEmotionUpdate.mediaId
        ? { ...r, emotion: lastEmotionUpdate.emotion }
        : r
    ));
  }, [lastEmotionUpdate]);

  // 자동완성 debounce
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await searchApi.suggestions(query);
        const combined = [...(response.tags || []), ...(response.words || [])];
        const unique = [...new Set(combined)].slice(0, 6);
        setSuggestions(unique);
        setShowSuggestions(unique.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, DEBOUNCE_DELAY);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  };

  const saveRecentSearch = async (term: string) => {
    try {
      const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {}
  };

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {}
  };

  const removeRecentSearch = async (term: string) => {
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const handleSearch = async (searchQuery?: string) => {
    const term = (typeof searchQuery === 'string' ? searchQuery : query).trim();
    // 북마크 필터 ON일 때는 빈 query도 허용 (전체 북마크 목록)
    if (!term && !isBookmarkFilter) return;

    setShowSuggestions(false);
    setIsSearching(true);
    setHasSearched(true);
    setError(null);
    setResults([]);
    inputRef.current?.blur();

    const bookmarkFlag = isBookmarkFilter ? true : undefined;

    try {
      const response = await searchApi.search(term, 20, 'hybrid', bookmarkFlag);
      setResults(response.results || []);
      if (term && response.results?.length > 0) saveRecentSearch(term);
    } catch (err: any) {
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      if (isTimeout && !err._retried) {
        try {
          const response = await searchApi.search(term, 20, 'hybrid', bookmarkFlag);
          setResults(response.results || []);
          if (term && response.results?.length > 0) saveRecentSearch(term);
          return;
        } catch (retryErr: any) { retryErr._retried = true; }
      }
      setError(isTimeout ? t('search.aiPreparing') : getErrorMessage(err));
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 북마크 필터 토글 시 자동 재검색
  useEffect(() => {
    if (hasSearched || isBookmarkFilter) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBookmarkFilter]);

  const handleCategoryPress = (chip: typeof CATEGORY_CHIPS[0]) => {
    const q = chip.query || chip.label;
    setQuery(q);
    handleSearch(q);
  };

  const handleResultPress = (mediaId: string) => {
    router.push(`/media/${mediaId}`);
  };

  const getImageUrl = (item: SearchResult) => item.thumbnail_url || '';

  const renderResultItem = ({ item }: { item: SearchResult }) => (
    <View style={styles.resultCardWrapper}>
      <ScheduleCard
        id={item.id}
        title={item.title || item.caption_ko || item.caption || t('search.noCaption')}
        time={item.score ? `${(item.score * 100).toFixed(0)}%` : ''}
        imageUrl={getImageUrl(item)}
        emotion={item.emotion}
        onPress={() => handleResultPress(item.media_id)}
        size="compact"
      />
    </View>
  );

  const theme = {
    bg: isDark ? '#111827' : '#F9FAFB',
    surface: isDark ? '#1F2937' : '#FFFFFF',
    border: isDark ? '#374151' : '#E5E7EB',
    text: isDark ? '#F9FAFB' : '#1F2937',
    subText: isDark ? '#9CA3AF' : '#6B7280',
    chipBg: isDark ? '#374151' : '#F3F4F6',
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Logo size={32} showText={false} color={theme.text} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('search.title')}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <View style={styles.searchInputContainer}>
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: theme.text }]}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch()}
            onFocus={() => query.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
            returnKeyType="search"
            placeholderTextColor="transparent"
          />
          {!query && (
            <Animated.Text
              style={[styles.rotatePlaceholder, { color: theme.subText, opacity: placeholderOpacity }]}
              numberOfLines={1}
              pointerEvents="none"
            >
              {ROTATING_PLACEHOLDERS[placeholderIndex]}
            </Animated.Text>
          )}
        </View>
        {query.length > 0 ? (
          <TouchableOpacity onPress={() => { setQuery(''); setHasSearched(false); setShowSuggestions(false); }}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ) : (
          <View style={[styles.aiBadge, { backgroundColor: colors.primary[50] }]}>
            <Ionicons name="sparkles" size={12} color={colors.brand.primary} />
            <Text style={[styles.aiBadgeText, { color: colors.brand.primary }]}>AI</Text>
          </View>
        )}
      </View>

      {/* 북마크 필터 토글 */}
      <TouchableOpacity
        onPress={() => setIsBookmarkFilter(prev => !prev)}
        style={[
          styles.bookmarkFilter,
          { borderColor: theme.border },
          isBookmarkFilter && styles.bookmarkFilterActive,
        ]}
      >
        <Ionicons
          name={isBookmarkFilter ? 'bookmark' : 'bookmark-outline'}
          size={14}
          color={isBookmarkFilter ? '#fff' : theme.subText}
        />
        <Text
          style={[
            styles.bookmarkFilterText,
            { color: isBookmarkFilter ? '#fff' : theme.subText },
          ]}
        >
          {t('search.bookmarkFilter')}
        </Text>
      </TouchableOpacity>

      {/* 자동완성 드롭다운 */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={[styles.dropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={`${s}-${i}`}
              style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
              onPress={() => { setQuery(s); setShowSuggestions(false); handleSearch(s); }}
            >
              <Ionicons name="search-outline" size={15} color="#9CA3AF" />
              <Text style={[styles.dropdownText, { color: theme.text }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      {isSearching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={[styles.centerText, { color: theme.subText, marginTop: 16 }]}>
            {t('search.searching')}
          </Text>
        </View>
      ) : error ? (
        <ErrorView
          message={error}
          onRetry={() => handleSearch()}
          textColor={theme.text}
          subTextColor={theme.subText}
          buttonColor={colors.brand.primary}
        />
      ) : !hasSearched ? (
        <ScrollView
          style={styles.emptyScroll}
          contentContainerStyle={styles.emptyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 최근 검색어 */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('search.recentSearches')}</Text>
                <TouchableOpacity onPress={clearRecentSearches}>
                  <Text style={{ fontSize: 13, color: colors.brand.primary }}>{t('search.clearAll')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipRow}>
                {recentSearches.slice(0, 6).map(term => (
                  <TouchableOpacity
                    key={term}
                    style={[styles.recentChip, { backgroundColor: theme.chipBg }]}
                    onPress={() => { setQuery(term); handleSearch(term); }}
                  >
                    <Ionicons name="time-outline" size={13} color={theme.subText} />
                    <Text style={[styles.chipText, { color: theme.text }]}>{term}</Text>
                    <TouchableOpacity
                      onPress={() => removeRecentSearch(term)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={13} color={theme.subText} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 카테고리 탐색 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('search.browseByCategory')}</Text>
            <View style={styles.categoryGrid}>
              {CATEGORY_CHIPS.map(chip => (
                <TouchableOpacity
                  key={chip.label}
                  style={[styles.categoryChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => handleCategoryPress(chip)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.categoryIcon}>{chip.icon}</Text>
                  <Text style={[styles.categoryLabel, { color: theme.text }]}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 검색 팁 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('search.trySearching')}</Text>
            <View style={[styles.tipsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {SEARCH_TIPS.map((tip, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.tipRow,
                    i < SEARCH_TIPS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}
                  onPress={() => { setQuery(tip.example.replace(/"/g, '')); handleSearch(tip.example.replace(/"/g, '')); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tipIcon}>{tip.icon}</Text>
                  <View style={styles.tipTextBox}>
                    <Text style={[styles.tipExample, { color: colors.brand.primary }]}>{tip.example}</Text>
                    <Text style={[styles.tipDesc, { color: theme.subText }]}>{tip.desc}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={14} color={theme.subText} />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.tipFootnote, { color: theme.subText }]}>
              {t('search.aiHint')}
            </Text>
          </View>
        </ScrollView>
      ) : results.length > 0 ? (
        <View style={{ flex: 1 }}>
          <View style={styles.resultHeader}>
            <Text style={[styles.resultCount, { color: theme.subText }]}>
              {t('search.foundPhotos', { count: results.length })}
            </Text>
            <AiNotice text={t('ai.searchNotice')} isDark={isDark} />
          </View>
          <FlatList
            data={results}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={renderResultItem}
            numColumns={2}
            contentContainerStyle={styles.resultsContainer}
            columnWrapperStyle={styles.resultsRow}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <View style={styles.centerContainer}>
          <Text style={{ fontSize: 48 }}>🔍</Text>
          <Text style={[styles.centerText, { color: theme.text, marginTop: 16 }]}>
            {t('search.noResults')}
          </Text>
          <Text style={[{ fontSize: 14, color: theme.subText, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }]}>
            {t('search.noResultsDesc')}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: colors.brand.primary }]}
            onPress={() => { setHasSearched(false); setQuery(''); inputRef.current?.focus(); }}
          >
            <Text style={{ color: colors.brand.primary, fontSize: 14, fontWeight: '500' }}>{t('search.retrySearch')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '300' },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    justifyContent: 'center',
    height: '100%',
  },
  searchInput: {
    fontSize: 15,
    height: '100%',
    padding: 0,
  },
  rotatePlaceholder: {
    position: 'absolute',
    fontSize: 15,
    left: 0,
    right: 0,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  aiBadgeText: { fontSize: 11, fontWeight: '600' },

  // 북마크 필터 토글
  bookmarkFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  bookmarkFilterActive: {
    backgroundColor: '#FF6A5F',
    borderColor: '#FF6A5F',
  },
  bookmarkFilterText: { fontSize: 12, fontWeight: '500' },

  // Dropdown
  dropdown: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 10,
  },
  dropdownText: { fontSize: 15 },

  // Empty state
  emptyScroll: { flex: 1 },
  emptyContent: { padding: 16, paddingBottom: 120 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },

  // Recent chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
  },
  chipText: { fontSize: 13 },

  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    width: (width - 32 - 30) / 4,
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 4,
  },
  categoryIcon: { fontSize: 24 },
  categoryLabel: { fontSize: 12, fontWeight: '500' },

  // Tips
  tipsCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  tipIcon: { fontSize: 20 },
  tipTextBox: { flex: 1 },
  tipExample: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  tipDesc: { fontSize: 12 },
  tipFootnote: { fontSize: 12, textAlign: 'center', marginTop: 12 },

  // Results
  resultHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  resultCount: { fontSize: 13, marginBottom: 6 },
  resultsContainer: { padding: 16 },
  resultsRow: { justifyContent: 'space-between', marginBottom: 12 },
  resultCardWrapper: { width: ITEM_SIZE },

  // No results / loading
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { fontSize: 17, fontWeight: '600' },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
});
