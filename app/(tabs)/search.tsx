import { useColorScheme } from '@/components/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import searchApi, { SearchResult } from '@/src/api/search';
import { colors } from '@/src/theme';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 40) / 2;

const SUGGESTIONS = ['해변 일몰', '산 풍경', '도시 야경', '음식 사진', '가족 모임'];

export default function SearchScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setError(null);

    try {
      const response = await searchApi.search(query.trim());
      setResults(response.results);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || '검색에 실패했습니다');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setQuery(suggestion);
    setTimeout(() => handleSearch(), 100);
  };

  const getImageUrl = (item: SearchResult) => {
    return item.thumbnail_url || '';
  };

  const handleResultPress = (mediaId: string) => {
    router.push(`/media/${mediaId}`);
  };

  const renderResultItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      activeOpacity={0.8}
      onPress={() => handleResultPress(item.media_id)}
    >
      <Image source={{ uri: getImageUrl(item) }} style={styles.resultImage} />
      <View style={styles.resultCaption}>
        <Text style={styles.captionText} numberOfLines={2}>
          {item.caption || '캡션 없음'}
        </Text>
        {item.score && (
          <Text style={styles.scoreText}>
            관련도: {(item.score * 100).toFixed(0)}%
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, isDark && styles.inputDark]}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, isDark && styles.textLight]}
            placeholder="사진 검색 (예: 해변 일몰)"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setHasSearched(false); }}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={[styles.loadingText, isDark && styles.textLight]}>
            검색 중...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : !hasSearched ? (
        <View style={styles.suggestionsContainer}>
          <Text style={[styles.suggestionsTitle, isDark && styles.textLight]}>
            추천 검색어
          </Text>
          <View style={styles.suggestionsList}>
            {SUGGESTIONS.map((suggestion) => (
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

          <View style={[styles.aiFeatureCard, isDark && styles.cardDark]}>
            <View style={styles.aiIconContainer}>
              <Ionicons name="sparkles" size={24} color={colors.brand.primary} />
            </View>
            <View style={styles.aiTextContainer}>
              <Text style={[styles.aiTitle, isDark && styles.textLight]}>
                AI 시맨틱 검색
              </Text>
              <Text style={styles.aiDescription}>
                자연어로 원하는 사진을 찾아보세요.{'\n'}
                "작년 여름 해운대", "가족과 저녁 식사" 등
              </Text>
            </View>
          </View>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderResultItem}
          numColumns={2}
          contentContainerStyle={styles.resultsContainer}
          columnWrapperStyle={styles.resultsRow}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.noResultsContainer}>
          <Ionicons name="search-outline" size={64} color="#D1D5DB" />
          <Text style={[styles.noResultsText, isDark && styles.textLight]}>
            검색 결과가 없습니다
          </Text>
          <Text style={styles.noResultsSubtext}>
            다른 검색어로 시도해보세요
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
});
