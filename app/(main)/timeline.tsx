/**
 * Timeline Screen
 *
 * Main photo timeline view
 */

import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, textStyles } from '@/theme';

export default function TimelineScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>타임라인</Text>
        <Pressable style={styles.headerAction}>
          <Text style={styles.headerActionText}>+</Text>
        </Pressable>
      </View>

      {/* Search Bar (navigates to search) */}
      <Pressable
        style={styles.searchBar}
        onPress={() => router.push('/(main)/search')}
      >
        <Text style={styles.searchPlaceholder}>🔍 사진, 장소, 사람 검색...</Text>
      </Pressable>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Empty State */}
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📸</Text>
          <Text style={styles.emptyTitle}>아직 사진이 없어요</Text>
          <Text style={styles.emptyText}>
            사진을 업로드하면 AI가 자동으로{'\n'}분석하고 정리해드려요
          </Text>
          <Pressable style={styles.uploadButton}>
            <Text style={styles.uploadButtonText}>사진 업로드</Text>
          </Pressable>
        </View>

        {/* TODO: Timeline sections will go here */}
        {/* <TimelineSection date="2024-12-15" items={[]} /> */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...textStyles.h2,
    color: colors.text.primary,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionText: {
    fontSize: 24,
    color: colors.neutral[0],
    fontWeight: '300',
  },
  searchBar: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.md,
  },
  searchPlaceholder: {
    ...textStyles.bodyMedium,
    color: colors.text.tertiary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['4xl'],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...textStyles.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...textStyles.bodyMedium,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  uploadButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['2xl'],
    borderRadius: 12,
  },
  uploadButtonText: {
    ...textStyles.buttonMedium,
    color: colors.neutral[0],
  },
});
