import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { triggerResume } from '@src/services/resumeUploads';
import { RESUME_INTERVAL_MS } from '@src/constants/upload';
import { useUploadQueueStore } from '@src/store/uploadQueueStore';
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
  const pathname = usePathname();
  const { loadSettings } = useSettingsStore();
  const { isLocked, isEnabled: appLockEnabled, initialize: initAppLock, lock: lockApp } = useAppLockStore();
  const [initialReady, setInitialReady] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const backgroundTimestamp = useRef<number | null>(null);
  const LOCK_THRESHOLD_MS = 30_000;

  // B-DN: 영속 업로드 큐 재개 트리거는 src/services/resumeUploads.ts의 triggerResume으로
  // 이동(F-UPLOAD-RESUME-UX — 홈 배너 수동 재시도와 공유). in-flight/오프라인 가드 내장.

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
          Sentry.addBreadcrumb({
            category: 'ota-check',
            message: '[OTA] check result',
            level: 'info',
            data: {
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

  // B-DN: 네트워크 online 이벤트 시 재개
  // (앱을 foreground에 켜둔 채 Wi-Fi/데이터만 끊겼다 붙는 경우 — AppState active 공백 보완)
  // F-UPLOAD-RESUME-UX: wasOfflineRef(직전 offline 관측 필수) 조건 제거 — offline 순간을
  // 놓쳐도 회복 이벤트면 재개. 중복 호출은 triggerResume의 in-flight/오프라인 가드가 흡수.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online =
        state.isConnected === true &&
        (state.isInternetReachable === true || state.isInternetReachable === null);
      if (online) {
        triggerResume();
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // F-UPLOAD-RESUME-UX: 대기 큐 존재 시 주기 재시도.
  // ★B-DK 교훈: setInterval은 deps=[] 단일 등록 불변 — 게이팅은 getState() 선체크로만.
  // pendingCount === 0이면 tick은 no-op(listResumable 파일 I/O 없음). cleanup에서 clearInterval(B-DL).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const timer = setInterval(() => {
      if (useUploadQueueStore.getState().pendingCount > 0) {
        triggerResume();
      }
    }, RESUME_INTERVAL_MS);
    return () => clearInterval(timer);
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
      const u = useAuthStore.getState().user;
      if (u && (u.app_lang === null || u.app_lang === undefined)) {
        // B-EN-GATE(안 A): 이미 language-select면 재replace 금지 → 재진입 루프 차단
        if (!pathname.startsWith('/language-select')) {
          router.replace('/language-select?from=login');  // 언어 미선택 → 1회 선택
        }
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootLayoutNav />
      {isAuthenticated && isLocked && <BiometricLock />}
    </GestureHandlerRootView>
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
