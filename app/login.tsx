import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import GoogleLoginButton from '@src/components/auth/GoogleLoginButton';
import { router } from 'expo-router';
import { useAuthStore } from '@src/store/authStore';
import { useTranslation } from '@src/hooks/useTranslation';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { setError, error } = useAuthStore();
  const { t } = useTranslation();

  const handleSuccess = () => {
    router.replace('/(tabs)');
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#4F46E5', '#7C3AED', '#9333EA']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Logo Area */}
        <View style={styles.logoArea}>
          <View style={styles.logoIcon}>
            <Ionicons name="images" size={48} color="#fff" />
          </View>
          <Text style={styles.logoText}>Marzlog</Text>
          <Text style={styles.tagline}>{t('login.tagline')}</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <FeatureItem
            icon="search"
            title={t('login.semanticSearch')}
            description={t('login.semanticSearchDesc')}
          />
          <FeatureItem
            icon="time"
            title={t('login.timelineFeature')}
            description={t('login.timelineFeatureDesc')}
          />
          <FeatureItem
            icon="sparkles"
            title={t('login.aiCaptioning')}
            description={t('login.aiCaptioningDesc')}
          />
        </View>

        {/* Login Card */}
        <View style={styles.loginCard}>
          <Text style={styles.loginTitle}>{t('login.getStarted')}</Text>
          <Text style={styles.loginSubtitle}>
            {t('login.subtitle')}
          </Text>

          <View style={styles.buttonContainer}>
            <GoogleLoginButton
              onSuccess={handleSuccess}
              onError={handleError}
            />

            {/* Apple Login Button (Placeholder) */}
            <View style={[styles.appleButton, styles.buttonDisabled]}>
              <Ionicons name="logo-apple" size={20} color="#000" />
              <Text style={styles.appleButtonText}>{t('auth.continueWithApple')}</Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>{t('common.comingSoon')}</Text>
              </View>
            </View>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.termsText}>
            {t('login.termsAgreement')}
          </Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

function FeatureItem({ 
  icon, 
  title, 
  description 
}: { 
  icon: keyof typeof Ionicons.glyphMap; 
  title: string; 
  description: string;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      <View>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  logoArea: {
    alignItems: 'center',
    marginTop: height * 0.08,
    marginBottom: 32,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
  },
  featuresContainer: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  featureDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  loginCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    gap: 12,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  appleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  comingSoonBadge: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  comingSoonText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginLeft: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  termsLink: {
    color: '#6366F1',
    fontWeight: '500',
  },
});
