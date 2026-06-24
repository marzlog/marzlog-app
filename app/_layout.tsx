import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';

import { initializeKakaoSDK } from '@react-native-kakao/core';
import { useColorScheme } from '@/components/useColorScheme';
import { initSentry } from '../src/utils/sentry';
import { setOnConsentRequired } from '../src/api/client';
import { useAuthStore } from '@src/store/authStore';
import { useSettingsStore } from '@src/store/settingsStore';
import { useAppLockStore } from '@src/store/appLockStore';
import { useReminderStore } from '@src/store/reminderStore';
import { DialogProvider } from '@/src/components/ui/Dialog';
import { BiometricLock } from '@/src/components/auth/BiometricLock';
import { resumeUploads } from '@src/services/resumeUploads';
import NetInfo from '@react-native-community/netinfo';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

initSentry();

const kakaoKey = process.env.EXPO_PUBLIC_KAKAO_APP_KEY;
if (kakaoKey && Platform.OS !== 'web') {
  try {
    initializeKakaoSDK(kakaoKey);
  } catch (e) {
    // Kakao SDK init failed — silently ignore
  }
}

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

const ONBOARDING_KEY = '@marzlog_onboarding_completed';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const { isAuthenticated, checkAuth } = useAuthStore();
  const { loadSettings } = useSettingsStore();
  const { isLocked, isEnabled: appLockEnabled, initialize: initAppLock, lock: lockApp } = useAppLockStore();
  const [initialReady, setInitialReady] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const backgroundTimestamp = useRef<number | null>(null);
  const LOCK_THRESHOLD_MS = 30_000;

  // B-DN: 영속 업로드 큐 재개 (포그라운드 복귀/콜드스타트). 중복 실행 가드.
  // 재개는 화면 state와 분리된 순수 함수(resumeUploads) — 훅 인스턴스화 없음.
  const resumeInFlight = useRef(false);
  // B-DN: netinfo "연결 복구" 판정용 — 직전 offline 여부 기억(전환 시에만 재개)
  const wasOfflineRef = useRef(false);

  const triggerResume = async () => {
    if (Platform.OS === 'web') return;
    if (resumeInFlight.current) return;
    const { isAuthenticated: loggedIn, user } = useAuthStore.getState();
    const uid = user?.id;
    if (!loggedIn || !uid) return;
    // B-DN 대응1: 오프라인이면 재개 시도 안 함(헛된 attempts 소모/실패 방지)
    try {
      const net = await NetInfo.fetch();
      const online =
        net.isConnected === true &&
        (net.isInternetReachable === true || net.isInternetReachable === null);
      if (!online) return;
    } catch {
      // NetInfo.fetch 실패 시 보수적으로 진행(막아서 영영 재개 안 되는 것보다 시도가 나음)
    }
    resumeInFlight.current = true;
    try {
      await resumeUploads(uid);
    } catch {
      // resumeUploads 내부에서 job별 보존 처리됨 — 여기서는 크래시만 방지
    } finally {
      resumeInFlight.current = false;
    }
  };

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Check for OTA updates on app start
  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        console.log('[OTA] check start, channel/runtime check');
        const update = await Updates.checkForUpdateAsync();
        console.log('[OTA] checkForUpdate result, isAvailable=', update.isAvailable);
        try {
          const Sentry = require('@sentry/react-native');
          Sentry.captureMessage('[OTA] check result', {
            level: 'info',
            tags: { area: 'ota-check' },
            extra: {
              isAvailable: update.isAvailable,
              currentUpdateId: Updates.updateId ?? 'embedded',
              channel: Updates.channel ?? 'unknown',
              runtimeVersion: Updates.runtimeVersion ?? 'unknown',
              isEmbeddedLaunch: Updates.isEmbeddedLaunch,
            },
          });
        } catch {}
        if (update.isAvailable) {
          console.log('[OTA] fetching...');
          await Updates.fetchUpdateAsync();
          console.log('[OTA] fetched, reloading...');
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.log('[OTA] ERROR:', String((e as Error)?.message ?? e));
        try {
          const Sentry = require('@sentry/react-native');
          Sentry.captureException(e, { tags: { area: 'ota-check' } });
        } catch {}
      }
    })();
  }, []);

  // Check auth status, load settings, app lock, and onboarding state on app start
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        checkAuth(),
        loadSettings(),
        initAppLock(),
      ]);
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        setOnboardingCompleted(value === 'true');
      } catch {
        setOnboardingCompleted(false);
      }
      setInitialReady(true);
    };
    init();
  }, []);

  // Register consent-required callback: backend 403 + code === 'CONSENT_REQUIRED'
  // → redirect to terms-agreement. Mount 1회만 등록. (B-U Phase 4 / B-AE)
  useEffect(() => {
    setOnConsentRequired(() => {
      router.replace('/terms-agreement?from=login');
    });
  }, []);

  // B-DN: 콜드스타트 — 인증 확인 후 업로드 큐 1회 재개
  useEffect(() => {
    if (!initialReady) return;
    triggerResume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialReady, isAuthenticated]);

  // B-DN: 포그라운드 복귀 시 업로드 큐 재개 (앱락 리스너와 분리된 별도 리스너)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        triggerResume();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // B-DN: 네트워크 offline→online 전환 시 재개
  // (앱을 foreground에 켜둔 채 Wi-Fi/데이터만 끊겼다 붙는 경우 — AppState active 공백 보완)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online =
        state.isConnected === true &&
        (state.isInternetReachable === true || state.isInternetReachable === null);
      if (wasOfflineRef.current && online) {
        wasOfflineRef.current = false;
        triggerResume();
      } else if (!online) {
        wasOfflineRef.current = true;
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background → foreground: lock after 30s
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimestamp.current = Date.now();
      }
      if (nextState === 'active') {
        const { isEnabled } = useAppLockStore.getState();
        if (isEnabled && backgroundTimestamp.current) {
          const elapsed = Date.now() - backgroundTimestamp.current;
          if (elapsed > LOCK_THRESHOLD_MS) {
            lockApp();
          }
        }
        backgroundTimestamp.current = null;
      }
    });
    return () => subscription.remove();
  }, []);

  // Notification initialization + deep link handling (native only)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    useReminderStore.getState().initialize();

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        const ALLOWED_SCREENS = ['upload', 'home'];
        if (data?.screen && ALLOWED_SCREENS.includes(data.screen as string)) {
          if (data.screen === 'upload') {
            router.push('/upload');
          }
        }
      });

    if (Platform.OS === 'ios') {
      Notifications.setBadgeCountAsync(0);
    }

    return () => {
      responseSubscription.remove();
    };
  }, []);

  // Single navigation effect: handles initial routing + logout redirect
  useEffect(() => {
    if (!initialReady || !loaded || onboardingCompleted === null) return;

    if (isAuthenticated) {
      const { user } = useAuthStore.getState();
      if (user && (user.app_lang === null || user.app_lang === undefined)) {
        router.replace('/language-select?from=login');  // 언어 미선택 → 1회 선택
      }
      return; // 선택됨 → tabs
    }

    if (!onboardingCompleted) {
      router.replace('/onboarding');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, initialReady, loaded, onboardingCompleted]);

  if (!loaded || !initialReady) {
    return null;
  }

  return (
    <>
      <RootLayoutNav />
      {isAuthenticated && isLocked && <BiometricLock />}
    </>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DialogProvider>
        <Stack>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="intro" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="terms-agreement" options={{ headerShown: false }} />
          <Stack.Screen name="policy/terms" options={{ headerShown: false }} />
          <Stack.Screen name="policy/privacy" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="profile-edit" options={{ headerShown: false }} />
          <Stack.Screen name="upload" options={{ headerShown: false }} />
          <Stack.Screen name="media" options={{ headerShown: false }} />
          <Stack.Screen name="app-info" options={{ headerShown: false }} />
          <Stack.Screen name="withdraw" options={{ headerShown: false }} />
          <Stack.Screen name="withdraw-complete" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="language-select" options={{ headerShown: false }} />
          <Stack.Screen name="bookmarks" options={{ headerShown: false }} />
          <Stack.Screen name="labs" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </DialogProvider>
    </ThemeProvider>
  );
}
