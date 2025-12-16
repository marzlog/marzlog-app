/**
 * Albums Screen
 *
 * Photo albums management
 */

import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, textStyles, borderRadius, shadows } from '@/theme';

export default function AlbumsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>앨범</Text>
        <Pressable style={styles.addButton}>
          <Text style={styles.addButtonText}>+ 새 앨범</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Album Grid */}
        <View style={styles.albumGrid}>
          {/* Create New Album Card */}
          <Pressable style={styles.createAlbumCard}>
            <View style={styles.createAlbumIcon}>
              <Text style={styles.createAlbumPlus}>+</Text>
            </View>
            <Text style={styles.createAlbumText}>새 앨범 만들기</Text>
          </Pressable>

          {/* Sample Albums (placeholder) */}
          <AlbumCard title="여행" count={0} />
          <AlbumCard title="가족" count={0} />
          <AlbumCard title="친구" count={0} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AlbumCard({ title, count }: { title: string; count: number }) {
  return (
    <Pressable style={styles.albumCard}>
      <View style={styles.albumCover}>
        <Text style={styles.albumCoverEmoji}>📁</Text>
      </View>
      <Text style={styles.albumTitle}>{title}</Text>
      <Text style={styles.albumCount}>{count}장</Text>
    </Pressable>
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
  addButton: {
    backgroundColor: colors.primary[50],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    ...textStyles.labelMedium,
    color: colors.primary[500],
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.base,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  createAlbumCard: {
    width: '47%',
    aspectRatio: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border.default,
  },
  createAlbumIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  createAlbumPlus: {
    fontSize: 24,
    color: colors.primary[500],
    fontWeight: '300',
  },
  createAlbumText: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  albumCard: {
    width: '47%',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  albumCover: {
    aspectRatio: 1,
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumCoverEmoji: {
    fontSize: 48,
  },
  albumTitle: {
    ...textStyles.labelMedium,
    color: colors.text.primary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  albumCount: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
