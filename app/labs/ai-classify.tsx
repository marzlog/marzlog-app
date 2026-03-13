import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/store/settingsStore';
import { useTranslation } from '@/src/hooks/useTranslation';
import { Logo } from '@/src/components/common/Logo';
import { getSceneSummary, type SceneCategory } from '@/src/api/scene';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (width - 32 - CARD_GAP) / 2;

interface CategoryMeta {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORIES: CategoryMeta[] = [
  { key: 'landscape', icon: 'image-outline' },
  { key: 'people', icon: 'people-outline' },
  { key: 'food', icon: 'restaurant-outline' },
  { key: 'animal', icon: 'paw-outline' },
  { key: 'text', icon: 'document-text-outline' },
  { key: 'object', icon: 'cube-outline' },
];

export default function AiClassifyScreen() {
  const systemColorScheme = useColorScheme();
  const { themeMode } = useSettingsStore();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<Record<string, SceneCategory>>({});

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSceneSummary();
      const map: Record<string, SceneCategory> = {};
      for (const cat of data.categories) {
        map[cat.scene_type] = cat;
      }
      setCategoryData(map);
    } catch (e) {
      // silently fail — cards show 0
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handlePress = (sceneType: string, count: number) => {
    if (count === 0) return;
    router.push(`/labs/scene-photos?scene_type=${sceneType}` as any);
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#F9FAFB' : '#1F2937'} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Logo size={28} showText={false} color={isDark ? '#F9FAFB' : '#1F2937'} />
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>{t('labs.aiClassify')}</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.grid}>
            {CATEGORIES.map((cat) => {
              const data = categoryData[cat.key];
              const count = data?.count ?? 0;
              const thumbnailUrl = data?.thumbnail_url ?? null;

              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryCard, isDark && styles.categoryCardDark]}
                  onPress={() => handlePress(cat.key, count)}
                  activeOpacity={0.7}
                >
                  {thumbnailUrl ? (
                    <Image
                      source={{ uri: thumbnailUrl }}
                      style={styles.thumbnail}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={200}
                    />
                  ) : (
                    <View style={[styles.iconPlaceholder, isDark && styles.iconPlaceholderDark]}>
                      <Ionicons
                        name={cat.icon}
                        size={32}
                        color={isDark ? '#4B5563' : '#D1D5DB'}
                      />
                    </View>
                  )}
                  <Text style={[styles.categoryLabel, isDark && styles.textLight]}>
                    {t(`labs.${cat.key}` as any)}
                  </Text>
                  <Text style={styles.countText}>
                    {count > 0 ? `${count}${t('labs.photoUnit')}` : '-'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '300',
    color: '#1F2937',
  },
  textLight: {
    color: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  categoryCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 16,
  },
  categoryCardDark: {
    backgroundColor: '#1F2937',
  },
  thumbnail: {
    width: '100%',
    height: CARD_WIDTH * 0.7,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  iconPlaceholder: {
    width: '100%',
    height: CARD_WIDTH * 0.7,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPlaceholderDark: {
    backgroundColor: '#374151',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginTop: 10,
  },
  countText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
