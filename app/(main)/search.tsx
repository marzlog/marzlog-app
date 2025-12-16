/**
 * Search Screen
 *
 * AI-powered photo search
 */

import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, textStyles, borderRadius } from '@/theme';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [recentSearches] = useState(['해운대', '가족 사진', '2024년 여름']);
  const [suggestedTags] = useState(['여행', '음식', '풍경', '셀피', '친구']);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Input */}
      <View style={styles.searchHeader}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="사진, 장소, 사람 검색..."
            placeholderTextColor={colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Text style={styles.clearButton}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Recent Searches */}
        {query.length === 0 && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>최근 검색</Text>
                <Pressable>
                  <Text style={styles.sectionAction}>전체 삭제</Text>
                </Pressable>
              </View>
              <View style={styles.tagList}>
                {recentSearches.map((search, index) => (
                  <Pressable key={index} style={styles.recentItem}>
                    <Text style={styles.recentIcon}>🕐</Text>
                    <Text style={styles.recentText}>{search}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Suggested Tags */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>추천 태그</Text>
              <View style={styles.chipContainer}>
                {suggestedTags.map((tag, index) => (
                  <Pressable key={index} style={styles.chip}>
                    <Text style={styles.chipText}>{tag}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Search Results */}
        {query.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsText}>
              "{query}" 검색 결과가 여기에 표시됩니다
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  searchHeader: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchIcon: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    ...textStyles.bodyMedium,
    color: colors.text.primary,
    paddingVertical: spacing.md,
  },
  clearButton: {
    fontSize: 16,
    color: colors.text.tertiary,
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...textStyles.h5,
    color: colors.text.primary,
  },
  sectionAction: {
    ...textStyles.bodySmall,
    color: colors.text.tertiary,
  },
  tagList: {
    gap: spacing.sm,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  recentIcon: {
    fontSize: 16,
  },
  recentText: {
    ...textStyles.bodyMedium,
    color: colors.text.primary,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  chipText: {
    ...textStyles.bodySmall,
    color: colors.text.primary,
  },
  resultsSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
  },
  resultsText: {
    ...textStyles.bodyMedium,
    color: colors.text.secondary,
  },
});
