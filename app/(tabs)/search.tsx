import { useColorScheme } from '@/components/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import searchApi, { SearchResult } from '@/src/api/search';
import { colors } from '@/src/theme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 40) / 2;

const DEFAULT_SUGGESTIONS = ['음식', 'food', '가족', 'sunset', 'birthday'];

const RECENT_SEARCHES_KEY = 'marzlog_recent_searches';
const MAX_RECENT_SEARCHES = 10;
const DEBOUNCE_DELAY = 300;

// 검색 모드 타입
type SearchMode = 'hybrid' | 'vector' | 'text';

export default function SearchScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // 다크모드 결정: themeMode가 'system'이면 시스템 설정, 아니면 직접 설정값 사용
  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // 새로운 상태들
  const [searchMode, setSearchMode] = useState<SearchMode>('hybrid');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 최근 검색어 로드
  useEffect(() => {
    loadRecentSearches();
  }, []);

  // 자동완성 (debounce)
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const response = await searchApi.suggestions(query);
        const combined = [...(response.tags || []), ...(response.words || [])];
        const unique = [...new Set(combined)].slice(0, 8);
        setSuggestions(unique);
        setShowSuggestions(unique.length > 0);
      } catch (err) {
        console.log('[Search] Suggestions error:', err);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recent searches:', e);
    }
  };

  const saveRecentSearch = async (term: string) => {
    try {
      const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save recent search:', e);
    }
  };

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (e) {
      console.error('Failed to clear recent searches:', e);
    }
  };

  const handleSearch = async (searchQuery?: string, mode?: SearchMode) => {
    const term = (typeof searchQuery === 'string' ? searchQuery : query).trim();
    if (!term) return;

    setShowSuggestions(false);
    setIsSearching(true);
    setHasSearched(true);
    setError(null);
    setResults([]); // 이전 결과 초기화

    const activeMode = mode || searchMode;

    try {
      console.log('[Search] Searching for:', term, 'mode:', activeMode);
      const response = await searchApi.search(term, 20, activeMode);
      console.log('[Search] Results count:', response.results?.length);
      console.log('[Search] Results:', JSON.stringify(response.results?.slice(0, 3).map(r => ({
        id: r.id,
        media_id: r.media_id,
        caption: r.caption?.substring(0, 30),
        url: r.thumbnail_url?.substring(0, 80)
      })), null, 2));
      setResults(response.results || []);
      if (response.results?.length > 0) {
        saveRecentSearch(term);
      }
    } catch (err: any) {
      console.error('[Search] Error:', err);
      setError(err.response?.data?.detail || err.message || t('search.searchFailed'));
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    handleSearch(suggestion);
  };

  const handleSuggestionPress = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  const handleRecentPress = (term: string) => {
    setQuery(term);
    handleSearch(term);
  };

  const removeRecentSearch = async (term: string) => {
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const getImageUrl = (item: SearchResult) => {
    return item.thumbnail_url || '';
  };

  const handleResultPress = (mediaId: string) => {
    router.push(`/media/${mediaId}`);
  };

  const handleSimilarSearch = async (mediaId: string) => {
    setIsSearching(true);
    setError(null);
    try {
      console.log('[Search] Finding similar to:', mediaId);
      const response = await searchApi.similar(mediaId);
      setResults(response.results || []);
      setHasSearched(true);
      setQuery(`Similar to image`);
    } catch (err: any) {
      console.error('[Search] Similar search error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to find similar images');
    } finally {
      setIsSearching(false);
    }
  };

  const renderResultItem = ({ item, index }: { item: SearchResult; index: number }) => {
    console.log(`[Search] Rendering item ${index}:`, item.id, item.thumbnail_url?.substring(60, 100));
    return (
    <View style={[styles.resultItem, isDark && styles.resultItemDark]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleResultPress(item.media_id)}
      >
        <Image
          source={{ uri: getImageUrl(item) }}
          style={styles.resultImage}
          onError={(e) => console.log('[Search] Image error:', e.nativeEvent.error)}
        />
      </TouchableOpacity>
      <View style={styles.resultCaption}>
        <Text style={[styles.captionText, isDark && styles.textLight]} numberOfLines={2}>
          {item.caption_ko || item.caption || t('search.noCaption')}
        </Text>
        <View style={styles.resultFooter}>
          {item.score && (
            <Text style={styles.scoreText}>
              {(item.score * 100).toFixed(0)}%
            </Text>
          )}
          <TouchableOpacity
            style={styles.similarButton}
            onPress={() => handleSimilarSearch(item.media_id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="images-outline" size={14} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, isDark && styles.inputDark]}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, isDark && styles.textLight]}
            placeholder={t('search.placeholder')}
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch()}
            onFocus={() => query.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setHasSearched(false); setShowSuggestions(false); }}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* 자동완성 드롭다운 */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={[styles.suggestionsDropdown, isDark && styles.dropdownDark]}>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={`${suggestion}-${index}`}
                style={[styles.suggestionItem, isDark && styles.suggestionItemDark]}
                onPress={() => handleSuggestionSelect(suggestion)}
              >
                <Ionicons name="search-outline" size={16} color="#9CA3AF" />
                <Text style={[styles.suggestionItemText, isDark && styles.textLight]}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 검색 모드 선택 */}
        <View style={styles.modeContainer}>
          {(['hybrid', 'vector', 'text'] as SearchMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.modeChip,
                searchMode === mode && styles.modeChipActive,
                isDark && styles.modeChipDark,
                searchMode === mode && isDark && styles.modeChipActiveDark,
              ]}
              onPress={() => {
                setSearchMode(mode);
                if (hasSearched) handleSearch(query, mode);
              }}
            >
              <Ionicons
                name={mode === 'hybrid' ? 'git-merge-outline' : mode === 'vector' ? 'sparkles-outline' : 'text-outline'}
                size={14}
                color={searchMode === mode ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280')}
              />
              <Text style={[
                styles.modeText,
                searchMode === mode && styles.modeTextActive,
                isDark && !searchMode.includes(mode) && { color: '#9CA3AF' },
              ]}>
                {mode === 'hybrid' ? 'AI + Text' : mode === 'vector' ? 'AI' : 'Text'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={[styles.loadingText, isDark && styles.textLight]}>
            {t('search.searching')}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : !hasSearched ? (
        <View style={styles.suggestionsContainer}>
          {/* 최근 검색어 */}
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.suggestionsTitle, isDark && styles.textLight]}>
                  {t('search.recentSearches')}
                </Text>
                <TouchableOpacity onPress={clearRecentSearches}>
                  <Text style={styles.clearText}>
                    {t('search.clearAll')}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.suggestionsList}>
                {recentSearches.slice(0, 5).map((term) => (
                  <TouchableOpacity
                    key={term}
                    style={[styles.recentChip, isDark && styles.recentChipDark]}
                    onPress={() => handleRecentPress(term)}
                  >
                    <Ionicons name="time-outline" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    <Text style={[styles.recentText, isDark && styles.textLight]}>{term}</Text>
                    <TouchableOpacity
                      onPress={() => removeRecentSearch(term)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={14} color={isDark ? '#6B7280' : '#9CA3AF'} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 추천 검색어 */}
          <Text style={[styles.suggestionsTitle, isDark && styles.textLight]}>
            {t('search.suggestions')}
          </Text>
          <View style={styles.suggestionsList}>
            {DEFAULT_SUGGESTIONS.map((suggestion) => (
              <TouchableOpacity
                key={suggestion}
                style={[styles.suggestionChip, isDark && styles.chipDark]}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Ionicons name="search-outline" size={14} color={colors.brand.primary} />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* AI 검색 안내 */}
          <View style={[styles.aiFeatureCard, isDark && styles.cardDark]}>
            <View style={styles.aiIconContainer}>
              <Ionicons name="sparkles" size={24} color={colors.brand.primary} />
            </View>
            <View style={styles.aiTextContainer}>
              <Text style={[styles.aiTitle, isDark && styles.textLight]}>
                {t('search.aiSearch')}
              </Text>
              <Text style={[styles.aiDescription, isDark && { color: '#9CA3AF' }]}>
                {t('search.aiSearchDesc')}
              </Text>
            </View>
          </View>
        </View>
      ) : results.length > 0 ? (
        <View style={{ flex: 1 }}>
          <Text style={[styles.loadingText, isDark && styles.textLight, { padding: 16 }]}>
            {results.length}개 결과 (query: {query})
          </Text>
          <FlatList
            data={results}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={renderResultItem}
            numColumns={2}
            contentContainerStyle={styles.resultsContainer}
            columnWrapperStyle={styles.resultsRow}
            showsVerticalScrollIndicator={false}
            extraData={query}
          />
        </View>
      ) : (
        <View style={styles.noResultsContainer}>
          <Ionicons name="search-outline" size={64} color="#D1D5DB" />
          <Text style={[styles.noResultsText, isDark && styles.textLight]}>
            {t('search.noResults')}
          </Text>
          <Text style={styles.noResultsSubtext}>
            {t('search.noResultsHint')}
          </Text>
        </View>
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
  searchContainer: {
    padding: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  textLight: {
    color: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
  },
  suggestionsContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  recentSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearText: {
    fontSize: 14,
    color: colors.brand.primary,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  recentChipDark: {
    backgroundColor: '#374151',
  },
  recentText: {
    fontSize: 14,
    color: '#374151',
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  chipDark: {
    backgroundColor: colors.primary[900],
  },
  suggestionText: {
    fontSize: 14,
    color: colors.brand.primary,
  },
  aiFeatureCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
  },
  cardDark: {
    backgroundColor: '#1F2937',
  },
  aiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  aiTextContainer: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  aiDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  resultsContainer: {
    padding: 16,
  },
  resultsRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultItem: {
    width: ITEM_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  resultItemDark: {
    backgroundColor: '#1F2937',
  },
  resultImage: {
    width: '100%',
    height: ITEM_SIZE,
  },
  resultCaption: {
    padding: 12,
  },
  captionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 18,
  },
  scoreText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  // 자동완성 드롭다운
  suggestionsDropdown: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  suggestionItemDark: {
    borderBottomColor: '#374151',
  },
  suggestionItemText: {
    fontSize: 15,
    color: '#374151',
  },
  // 검색 모드
  modeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    gap: 4,
  },
  modeChipDark: {
    backgroundColor: '#374151',
  },
  modeChipActive: {
    backgroundColor: colors.brand.primary,
  },
  modeChipActiveDark: {
    backgroundColor: colors.brand.primary,
  },
  modeText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  // 결과 푸터
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  similarButton: {
    padding: 4,
  },
});
