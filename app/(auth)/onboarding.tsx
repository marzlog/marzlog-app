/**
 * Onboarding Screen
 *
 * Welcome screen with app introduction
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, textStyles } from '@/theme';

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🚀</Text>
        </View>
        <Text style={styles.title}>환영합니다!</Text>
        <Text style={styles.subtitle}>MarZlog와 함께 추억을 정리하세요</Text>
      </View>

      {/* Features */}
      <View style={styles.featureList}>
        <FeatureItem icon="📸" text="AI 자동 캡션 생성" />
        <FeatureItem icon="🔍" text="자연어 검색" />
        <FeatureItem icon="📅" text="스마트 타임라인" />
        <FeatureItem icon="📁" text="자동 앨범 정리" />
      </View>

      {/* CTA Button */}
      <View style={styles.ctaSection}>
        <Pressable
          style={styles.ctaButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.ctaButtonText}>시작하기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.xl,
  },
  headerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoEmoji: {
    fontSize: 60,
  },
  title: {
    ...textStyles.displaySmall,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...textStyles.bodyLarge,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  featureList: {
    gap: spacing.lg,
    marginBottom: spacing['3xl'],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureText: {
    ...textStyles.bodyLarge,
    color: colors.text.primary,
  },
  ctaSection: {
    paddingBottom: spacing['2xl'],
  },
  ctaButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
  },
  ctaButtonText: {
    ...textStyles.buttonLarge,
    color: colors.neutral[0],
  },
});
