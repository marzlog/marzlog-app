import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Image,
  ViewToken,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@src/hooks/useTranslation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CORAL = '#F08E76';
const ONBOARDING_KEY = '@marzlog_onboarding_completed';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface FrameConfig {
  key: string;
  titleKey: string;
  subtitleKey: string;
  icons: IconName[];
  hasMascot?: boolean;
  rotated?: boolean;
}

const FRAMES: FrameConfig[] = [
  {
    key: 'frame1',
    titleKey: 'onboarding.frame1Title',
    subtitleKey: 'onboarding.frame1Subtitle',
    icons: ['heart', 'thumbs-up'],
    hasMascot: true,
    rotated: true,
  },
  {
    key: 'frame2',
    titleKey: 'onboarding.frame2Title',
    subtitleKey: 'onboarding.frame2Subtitle',
    icons: ['lock-closed', 'eye-off'],
    rotated: true,
  },
  {
    key: 'frame3',
    titleKey: 'onboarding.frame3Title',
    subtitleKey: 'onboarding.frame3Subtitle',
    icons: ['sparkles'],
  },
  {
    key: 'frame4',
    titleKey: 'onboarding.frame4Title',
    subtitleKey: 'onboarding.frame4Subtitle',
    icons: ['camera'],
  },
  {
    key: 'frame5',
    titleKey: 'onboarding.frame5Title',
    subtitleKey: 'onboarding.frame5Subtitle',
    icons: ['document-text', 'receipt'],
  },
  {
    key: 'frame6',
    titleKey: 'onboarding.frame6Title',
    subtitleKey: 'onboarding.frame6Subtitle',
    icons: ['shield-checkmark', 'search'],
  },
  {
    key: 'frame7',
    titleKey: 'onboarding.frame7Title',
    subtitleKey: 'onboarding.frame7Subtitle',
    icons: ['heart'],
    hasMascot: true,
  },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const getItemLayout = (_: any, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  });

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/login');
  };

  const handleNext = () => {
    if (currentIndex < FRAMES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const renderFrame = ({ item, index }: { item: FrameConfig; index: number }) => {
    const isRotated = item.rotated;

    return (
      <View style={[styles.page, { paddingTop: insets.top + 40 }]}>
        <View style={[styles.card, isRotated && styles.cardRotated]}>
          <View style={styles.iconRow}>
            {item.icons.map((icon, i) => (
              <View key={i} style={styles.iconCircle}>
                <Ionicons name={icon} size={28} color={CORAL} />
              </View>
            ))}
          </View>

          {item.hasMascot && (
            <Image
              source={require('@/assets/images/mascot.png')}
              style={styles.mascot}
              resizeMode="contain"
            />
          )}

          <Text style={styles.cardTitle}>{t(item.titleKey)}</Text>
          <Text style={styles.cardSubtitle}>{t(item.subtitleKey)}</Text>
        </View>
      </View>
    );
  };

  const isLastPage = currentIndex === FRAMES.length - 1;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={FRAMES}
        renderItem={renderFrame}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        bounces={false}
      />

      {/* Bottom section */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dot indicators */}
        <View style={styles.dotContainer}>
          {FRAMES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        {isLastPage ? (
          <TouchableOpacity style={styles.startButton} onPress={completeOnboarding} activeOpacity={0.8}>
            <Text style={styles.startButtonText}>{t('onboarding.start')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={completeOnboarding} activeOpacity={0.7}>
              <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
              <Text style={styles.nextButtonText}>{t('onboarding.next')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const CARD_HORIZONTAL_MARGIN = 32;
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_MARGIN * 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CORAL,
  },
  page: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    paddingHorizontal: CARD_HORIZONTAL_MARGIN,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardRotated: {
    transform: [{ rotate: '-3deg' }],
  },
  iconRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascot: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
    textAlign: 'center',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  dotContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#fff',
  },
  dotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  skipText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: CORAL,
  },
  startButton: {
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: CORAL,
  },
});
