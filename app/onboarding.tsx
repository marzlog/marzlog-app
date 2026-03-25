import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ViewToken,
  ImageSourcePropType,
  useWindowDimensions,
  Platform,
  Image as RNImage,
  Animated,
  Easing,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@src/hooks/useTranslation';
import { getLanguage } from '@src/i18n';
import { Video, ResizeMode } from 'expo-av';

const ONBOARDING_KEY = '@marzlog_onboarding_completed';

const ACCENT = '#FF6A5F';
const HEADING_COLOR = '#0F172A';
const PARAGRAPH_COLOR = '#334155';
const DOT_ACTIVE = ACCENT;
const DOT_INACTIVE = '#D9D9D9';

type PageType = 'splash' | 'illustration' | 'video' | 'final';

interface FrameConfig {
  key: string;
  type: PageType;
  titleKey?: string;
  subtitleKey?: string;
  illustration?: ImageSourcePropType;
}

const FRAMES: FrameConfig[] = [
  {
    key: 'splash1',
    type: 'splash',
    titleKey: 'onboarding.frame1Title',
    subtitleKey: 'onboarding.frame1Subtitle',
  },
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
  {
    key: 'splash2',
    type: 'splash',
  },
  {
    key: 'video',
    type: 'video',
  },
  {
    key: 'final',
    type: 'final',
  },
];

interface PageSizeProps {
  screenWidth: number;
  screenHeight: number;
}

const VIDEO_SOURCES = {
  ko: require('@/assets/videos/onboarding_ko.mp4'),
  en: require('@/assets/videos/onboarding_en.mp4'),
};

/** Page 8: full-screen video (no buttons, swipe to next) */
function VideoPage({ screenWidth, screenHeight }: PageSizeProps) {
  const [videoError, setVideoError] = useState(false);
  const showVideo = !videoError;

  return (
    <View style={[styles.page, { width: screenWidth, height: screenHeight, backgroundColor: '#1a1a2e' }]}>
      {showVideo ? (
        <Video
          source={VIDEO_SOURCES[getLanguage()]}
          style={[styles.splashImage, { width: screenWidth, height: screenHeight }]}
          resizeMode={ResizeMode.STRETCH}
          shouldPlay
          isLooping
          isMuted
          pointerEvents="none"
          onError={() => setVideoError(true)}
        />
      ) : (
        <Image
          source={require('@/assets/images/onboarding/splash_astronaut_mars.png')}
          style={[styles.splashImage, { width: screenWidth, height: screenHeight }]}
          contentFit="cover"
        />
      )}
    </View>
  );
}

interface FinalPageProps extends PageSizeProps {
  insets: { bottom: number };
  t: (key: string) => string;
  onComplete: () => void;
}

/** Page 9: astronaut image + gradient overlay + start button */
function FinalPage({ screenWidth, screenHeight, insets, t, onComplete }: FinalPageProps) {
  return (
    <View style={[styles.page, { width: screenWidth, height: screenHeight, backgroundColor: '#1a1a2e' }]}>
      <Image
        source={require('@/assets/images/onboarding/splash_astronaut_mars.png')}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
        locations={[0.3, 0.6, 1.0]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.finalBottomWrap, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.finalTitle}>{t('onboarding.final.title')}</Text>
        <Text style={styles.finalSubtitle}>{t('onboarding.final.subtitle')}</Text>
        <TouchableOpacity
          style={styles.finalStartButton}
          onPress={onComplete}
          activeOpacity={0.8}
        >
          <Text style={styles.finalStartButtonText}>{t('onboarding.start')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // === Stars (30 total: 7 big, 10 medium, 13 small) ===
  const stars = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const isBig = i < 7;
      const isMedium = i >= 7 && i < 17;
      return {
        top: `${Math.random() * 80}%`,
        left: `${Math.random() * 95}%`,
        size: isBig
          ? Math.random() * 3 + 10
          : isMedium
            ? Math.random() * 3 + 5
            : Math.random() * 2 + 2,
        duration: Math.random() * 1200 + 300,
        delay: Math.random() * 800,
        glow: isBig || isMedium,
      };
    });
  }, []);

  // === Meteor ===
  const meteorOpacity = useRef(new Animated.Value(0)).current;
  const meteorTranslateX = useRef(new Animated.Value(0)).current;
  const meteorTranslateY = useRef(new Animated.Value(0)).current;

  const starOpacities = useRef(stars.map(() => new Animated.Value(0))).current;
  const splashLogoOpacity = useRef(new Animated.Value(0)).current;
  const splashLogoTranslateY = useRef(new Animated.Value(20)).current;
  const splashSubOpacity = useRef(new Animated.Value(0)).current;
  const splashSubTranslateY = useRef(new Animated.Value(20)).current;

  // === Splash2 (page 7) ===
  const splash2TranslateY = useRef(new Animated.Value(0)).current;
  const splash2Scale = useRef(new Animated.Value(1)).current;

  const starAnimsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    // Star twinkle
    const starAnims = starOpacities.map((opacity, i) => {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: stars[i].duration,
            delay: stars[i].delay,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: stars[i].duration,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      return anim;
    });
    starAnimsRef.current = starAnims;

    // Splash2 float
    const splash2FloatAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(splash2TranslateY, {
          toValue: -15,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(splash2TranslateY, {
          toValue: 15,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    splash2FloatAnim.start();

    // Splash2 breathe scale
    const splash2ScaleAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(splash2Scale, {
          toValue: 1.03,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(splash2Scale, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    splash2ScaleAnim.start();

    // Meteor
    const runMeteor = () => {
      meteorTranslateX.setValue(0);
      meteorTranslateY.setValue(0);
      meteorOpacity.setValue(0);
      Animated.sequence([
        Animated.delay(Math.random() * 4000 + 2000),
        Animated.parallel([
          Animated.timing(meteorOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(meteorTranslateX, { toValue: 200, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(meteorTranslateY, { toValue: 150, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.timing(meteorOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => runMeteor());
    };
    runMeteor();

    // Splash1 logo fade in
    Animated.parallel([
      Animated.timing(splashLogoOpacity, { toValue: 1, duration: 1000, delay: 500, useNativeDriver: true }),
      Animated.timing(splashLogoTranslateY, { toValue: 0, duration: 1000, delay: 500, useNativeDriver: true }),
    ]).start();

    // Splash1 subtitle fade in
    Animated.parallel([
      Animated.timing(splashSubOpacity, { toValue: 1, duration: 800, delay: 1000, useNativeDriver: true }),
      Animated.timing(splashSubTranslateY, { toValue: 0, duration: 800, delay: 1000, useNativeDriver: true }),
    ]).start();

    return () => {
      starAnims.forEach((a) => a.stop());
      splash2FloatAnim.stop();
      splash2ScaleAnim.stop();
    };
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: screenWidth,
      offset: screenWidth * index,
      index,
    }),
    [screenWidth]
  );

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/login');
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < FRAMES.length) {
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToOffset({
        offset: screenWidth * nextIndex,
        animated: true,
      });
    }
  };

  const renderStars = () =>
    stars.map((star, i) => {
      const glowRadius = star.size > 8 ? 15 : star.size > 5 ? 10 : 4;
      const glowStyle = star.glow
        ? Platform.OS === 'web'
          ? { boxShadow: `0 0 ${glowRadius}px #FFFFFF` }
          : {
              shadowColor: '#FFFFFF',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: glowRadius,
              elevation: glowRadius,
            }
        : {};
      return (
        <Animated.View
          key={i}
          style={[
            {
              position: 'absolute' as const,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              backgroundColor: '#FFFFFF',
              top: star.top as any,
              left: star.left as any,
              ...glowStyle,
            },
            { opacity: starOpacities[i] },
          ]}
        />
      );
    });

  const renderMeteor = () => (
    <Animated.View
      style={{
        position: 'absolute',
        top: '15%',
        left: '10%',
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#FFFFFF',
        opacity: meteorOpacity,
        transform: [{ translateX: meteorTranslateX }, { translateY: meteorTranslateY }],
        ...(Platform.OS === 'web'
          ? { boxShadow: '0 0 6px #FFFFFF' }
          : {
              shadowColor: '#FFFFFF',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 6,
              elevation: 6,
            }),
      }}
    />
  );

  const renderSplash = (item: FrameConfig) => (
    <View style={[styles.page, { width: screenWidth, height: screenHeight }]}>
      {item.key === 'splash2' ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateY: splash2TranslateY }, { scale: splash2Scale }] },
          ]}
        >
          <Image
            source={require('@/assets/images/onboarding/splash_astronaut_space.png')}
            style={[styles.splashImage, { width: screenWidth, height: screenHeight }]}
            contentFit="cover"
          />
        </Animated.View>
      ) : (
        <Image
          source={require('@/assets/images/onboarding/splash_astronaut_mars.png')}
          style={[styles.splashImage, { width: screenWidth, height: screenHeight }]}
          contentFit="cover"
        />
      )}
      {renderStars()}
      {renderMeteor()}
      {item.titleKey && (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={styles.splashGradient}
        >
          <Animated.View
            style={{
              opacity: splashLogoOpacity,
              transform: [{ translateY: splashLogoTranslateY }],
            }}
          >
            <RNImage
              source={require('@/assets/images/onboarding/logo_text.png')}
              style={[styles.splashTitle, { width: 150, height: 38 }]}
              resizeMode="contain"
            />
          </Animated.View>
          {item.subtitleKey && (
            <Animated.Text
              style={[
                styles.splashSubtitle,
                {
                  opacity: splashSubOpacity,
                  transform: [{ translateY: splashSubTranslateY }],
                },
              ]}
            >
              {t(item.subtitleKey)}
            </Animated.Text>
          )}
        </LinearGradient>
      )}
    </View>
  );

  const renderIllustration = (item: FrameConfig) => (
    <View style={[styles.page, styles.whiteBg, { width: screenWidth, height: screenHeight }]}>
      <View style={styles.illustContent}>
        {item.illustration && (
          <Image
            source={item.illustration}
            style={styles.illustration}
            contentFit="contain"
          />
        )}
        <View style={styles.textBlock}>
          <Text style={styles.heading}>{t(item.titleKey!)}</Text>
          <Text style={styles.paragraph}>{t(item.subtitleKey!)}</Text>
        </View>
      </View>
    </View>
  );

  const renderVideo = () => <VideoPage screenWidth={screenWidth} screenHeight={screenHeight} />;

  const renderFinal = () => <FinalPage screenWidth={screenWidth} screenHeight={screenHeight} insets={insets} t={t} onComplete={completeOnboarding} />;

  const renderFrame = ({ item }: { item: FrameConfig }) => {
    switch (item.type) {
      case 'splash':
        return renderSplash(item);
      case 'illustration':
        return renderIllustration(item);
      case 'video':
        return renderVideo();
      case 'final':
        return renderFinal();
    }
  };

  // Hide dots/skip/next only on final page (page 9)
  const isLastPage = currentIndex === FRAMES.length - 1;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={FRAMES}
        renderItem={renderFrame}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled={Platform.OS !== 'web'}
        snapToInterval={Platform.OS === 'web' ? screenWidth : undefined}
        decelerationRate={Platform.OS === 'web' ? 'fast' : undefined}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        bounces={false}
      />

      {/* Bottom section — hidden on final page only */}
      {!isLastPage && (
        <View
          style={[styles.bottomSection, { paddingBottom: insets.bottom + 24 }]}
          pointerEvents="box-none"
        >
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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  page: {
    overflow: 'hidden',
  },

  // Splash pages (1 & 7)
  splashImage: {
    ...StyleSheet.absoluteFillObject,
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

  // Illustration pages (2-6)
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

  // Final page (8) - video/image overlay
  finalBottomWrap: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  finalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  finalSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  finalStartButton: {
    backgroundColor: '#FA5252',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  finalStartButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },

  // Bottom section
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 10,
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
});
