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
  ImageSourcePropType,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@src/hooks/useTranslation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ONBOARDING_KEY = '@marzlog_onboarding_completed';

const ACCENT = '#FF6A5F';
const DARK_GREEN = '#1A2E28';
const HEADING_COLOR = '#0F172A';
const PARAGRAPH_COLOR = '#334155';
const DOT_ACTIVE = ACCENT;
const DOT_INACTIVE = '#D9D9D9';

type PageType = 'splash' | 'logo' | 'illustration' | 'final';

interface FrameConfig {
  key: string;
  type: PageType;
  titleKey?: string;
  subtitleKey?: string;
  illustration?: ImageSourcePropType;
}

const FRAMES: FrameConfig[] = [
  // Page 1: Astronaut splash
  {
    key: 'splash1',
    type: 'splash',
    titleKey: 'onboarding.frame1Title',
    subtitleKey: 'onboarding.frame1Subtitle',
  },
  // Page 2: Logo page
  {
    key: 'logo',
    type: 'logo',
  },
  // Pages 3-7: Illustration pages
  {
    key: 'illust1',
    type: 'illustration',
    titleKey: 'onboarding.frame2Title',
    subtitleKey: 'onboarding.frame2Subtitle',
    illustration: require('@/assets/images/onboarding/illust_1_algorithm.png'),
  },
  {
    key: 'illust2',
    type: 'illustration',
    titleKey: 'onboarding.frame3Title',
    subtitleKey: 'onboarding.frame3Subtitle',
    illustration: require('@/assets/images/onboarding/illust_2_recall.png'),
  },
  {
    key: 'illust3',
    type: 'illustration',
    titleKey: 'onboarding.frame4Title',
    subtitleKey: 'onboarding.frame4Subtitle',
    illustration: require('@/assets/images/onboarding/illust_3_caption.png'),
  },
  {
    key: 'illust4',
    type: 'illustration',
    titleKey: 'onboarding.frame5Title',
    subtitleKey: 'onboarding.frame5Subtitle',
    illustration: require('@/assets/images/onboarding/illust_4_ocr.png'),
  },
  {
    key: 'illust5',
    type: 'illustration',
    titleKey: 'onboarding.frame6Title',
    subtitleKey: 'onboarding.frame6Subtitle',
    illustration: require('@/assets/images/onboarding/illust_5_secure.png'),
  },
  // Page 8: Astronaut splash again
  {
    key: 'splash2',
    type: 'splash',
  },
  // Page 9: Final CTA
  {
    key: 'final',
    type: 'final',
    titleKey: 'onboarding.frame7Title',
    subtitleKey: 'onboarding.frame7Subtitle',
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

  const renderSplash = (item: FrameConfig) => (
    <View style={styles.page}>
      <Image
        source={require('@/assets/images/onboarding/splash_astronaut_space.png')}
        style={styles.splashImage}
        resizeMode="cover"
      />
      {item.titleKey && (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={styles.splashGradient}
        >
          <Text style={styles.splashTitle}>{t(item.titleKey)}</Text>
          {item.subtitleKey && (
            <Text style={styles.splashSubtitle}>{t(item.subtitleKey)}</Text>
          )}
        </LinearGradient>
      )}
    </View>
  );

  const renderLogo = () => (
    <View style={[styles.page, styles.logoBg]}>
      <View style={styles.logoContent}>
        <Image
          source={require('@/assets/images/onboarding/logo_moon.png')}
          style={styles.logoMoon}
          resizeMode="contain"
        />
        <Image
          source={require('@/assets/images/onboarding/logo_text.png')}
          style={styles.logoText}
          resizeMode="contain"
        />
      </View>
    </View>
  );

  const renderIllustration = (item: FrameConfig) => (
    <View style={[styles.page, styles.whiteBg]}>
      <View style={styles.illustContent}>
        {item.illustration && (
          <Image
            source={item.illustration}
            style={styles.illustration}
            resizeMode="contain"
          />
        )}
        <View style={styles.textBlock}>
          <Text style={styles.heading}>{t(item.titleKey!)}</Text>
          <Text style={styles.paragraph}>{t(item.subtitleKey!)}</Text>
        </View>
      </View>
    </View>
  );

  const renderFinal = (item: FrameConfig) => (
    <View style={styles.page}>
      <LinearGradient
        colors={['rgba(20,21,30,0.5)', 'rgba(255,255,255,0.25)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.finalContent}>
        <Image
          source={require('@/assets/images/onboarding/logo_text.png')}
          style={styles.finalLogoText}
          resizeMode="contain"
        />
        <View style={styles.finalBottom}>
          <View style={styles.textBlock}>
            <Text style={styles.heading}>{t(item.titleKey!)}</Text>
            <Text style={styles.paragraph}>{t(item.subtitleKey!)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFrame = ({ item }: { item: FrameConfig }) => {
    switch (item.type) {
      case 'splash':
        return renderSplash(item);
      case 'logo':
        return renderLogo();
      case 'illustration':
        return renderIllustration(item);
      case 'final':
        return renderFinal(item);
    }
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
                { backgroundColor: i === currentIndex ? DOT_ACTIVE : DOT_INACTIVE },
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        {isLastPage ? (
          <TouchableOpacity
            style={styles.startButton}
            onPress={completeOnboarding}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>{t('onboarding.start')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={completeOnboarding} activeOpacity={0.7}>
              <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>{t('onboarding.next')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },

  // Splash pages (1 & 8)
  splashImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  splashGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingBottom: 160,
    paddingTop: 80,
    alignItems: 'center',
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  splashSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },

  // Logo page (2)
  logoBg: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  logoContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  logoMoon: {
    width: 136,
    height: 136,
  },
  logoText: {
    width: 100,
    height: 25,
  },

  // Illustration pages (3-7)
  whiteBg: {
    backgroundColor: '#FFFFFF',
  },
  illustContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 140,
  },
  illustration: {
    width: 280,
    height: 240,
    marginBottom: 40,
  },
  textBlock: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  heading: {
    fontSize: 24,
    fontWeight: '500',
    color: HEADING_COLOR,
    textAlign: 'center',
    letterSpacing: -0.96,
    lineHeight: 34,
  },
  paragraph: {
    fontSize: 16,
    fontWeight: '500',
    color: PARAGRAPH_COLOR,
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 24,
  },

  // Final page (9)
  finalContent: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 160,
    paddingBottom: 140,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finalLogoText: {
    width: 100,
    height: 25,
  },
  finalBottom: {
    width: '100%',
    alignItems: 'center',
  },

  // Bottom section
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
    gap: 9,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  skipText: {
    fontSize: 16,
    color: 'rgba(150, 150, 150, 0.8)',
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: ACCENT,
    borderRadius: 360,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#292928',
  },
  startButton: {
    backgroundColor: DARK_GREEN,
    borderRadius: 360,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAF9',
  },
});
