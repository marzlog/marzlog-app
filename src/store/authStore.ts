import { create } from 'zustand';
import { isAxiosError } from 'axios';
import authApi, {
  EmailRecentlyWithdrawnError,
  AccountAlreadyExistsError,
  AccountExistsDifferentProviderError,
  EmailRateLimitedError,
} from '../api/auth';
import { setOnSessionExpired } from '../api/client';
import type { User, AuthState, AuthResponse } from '../types/auth';
import { extractErrorMessage } from '../utils/errorMessages';
import { secureStorage as storage, SECURE_KEYS, isKeychainUnavailableError } from '../utils/secureStorage';
import { captureError, captureMessage } from '../utils/sentry';
import { useSettingsStore, backendToAiMode } from './settingsStore';
import { setLanguage as setI18nLanguage, isSupportedLocale, type SupportedLocale } from '../i18n';
import { registerPushToken, unregisterPushToken } from '../services/pushTokenService';
import { classifyAuthCheckError } from '../api/authErrors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// D6: 부트 인증 확인(/auth/me) 전용 타임아웃. 전역 30초를 그대로 기다리면 응답 없는
// 네트워크에서 콜드스타트가 흰 화면으로 길게 정지한다(전역 apiClient timeout은 불변).
const AUTH_CHECK_TIMEOUT_MS = 10_000;

/** 보류 화면 문구 분기용 — offline: NetInfo가 연결 없음을 확인 / unavailable: 그 외 일시 장애·Keychain 잠금 */
export type AuthCheckDeferredReason = 'offline' | 'unavailable';

// NetInfo가 "연결 없음"을 확정한 경우만 true. 판정 불가(null)·조회 실패는 온라인으로 보고 진행한다.
async function isConfirmedOffline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === false;
  } catch {
    return false;
  }
}

// B-EN-LANG-SYNC: 서버 users.app_lang을 단일 진실로 삼아 로그인/checkAuth 시
// i18n 표시언어와 settingsStore.language(로컬 persist)를 거기에 맞춘다.
// app_lang이 NULL이면 skip → _layout 게이트(language-select)가 처리.
// 서버→로컬 단방향 동기화이므로 서버 push는 하지 않는다(이중 push/루프 방지).
function syncLanguageFromUser(appLang?: SupportedLocale | null) {
  if (!isSupportedLocale(appLang)) return;
  setI18nLanguage(appLang);
  if (useSettingsStore.getState().language !== appLang) {
    // setLanguage는 로컬 persist만(서버 push 없음) → 서버 값으로 안전하게 수렴
    useSettingsStore.getState().setLanguage(appLang).catch(() => {});
  }
}

interface AuthStore extends AuthState {
  /**
   * B-SECURESTORE-LOCKED: 기기 잠금으로 checkAuth가 토큰을 못 읽어 판정이 보류됐음.
   * true인 동안 "미인증"은 확정이 아니다 — 해제 후 재시도로 세션이 되살아날 수 있다.
   */
  authCheckDeferred: boolean;
  /** authCheckDeferred가 true일 때만 의미가 있다 */
  authCheckDeferredReason: AuthCheckDeferredReason | null;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Auth methods
  loginWithGoogle: (idToken: string) => Promise<AuthResponse>;
  loginWithKakao: (accessToken: string) => Promise<AuthResponse>;
  loginWithApple: (identityToken: string, nonce: string, fullName?: { firstName?: string; lastName?: string }) => Promise<AuthResponse>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  sendVerification: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<string>;
  register: (name: string, email: string, password: string, verifyToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  forceLogout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  checkAuth: () => Promise<void>;
  /**
   * /auth/me 재조회로 user 만 갱신(plan 등 서버 SSOT 반영). 실패는 throw — 토큰을 지우지 않는다.
   * checkAuth 는 비-Keychain 오류(일시적 네트워크 포함)에 토큰을 지우므로 결제 직후 재조회에 쓰지 않는다.
   */
  refreshUser: () => Promise<User>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  authCheckDeferred: false,
  authCheckDeferredReason: null,

  // Setters
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Google Login
  loginWithGoogle: async (idToken: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.googleLogin(idToken);

      // Store tokens
      await storage.setItem('access_token', response.tokens.access_token);
      await storage.setItem('refresh_token', response.tokens.refresh_token);

      set({
        user: response.user,
        accessToken: response.tokens.access_token,
        refreshToken: response.tokens.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });

      syncLanguageFromUser(response.user.app_lang);
      registerPushToken().catch(() => {});
      return response;
    } catch (error: any) {
      // B-CF: typed errors는 pass-through (UI에서 분기 처리)
      if (
        error instanceof EmailRecentlyWithdrawnError ||
        error instanceof AccountAlreadyExistsError ||
        error instanceof AccountExistsDifferentProviderError
      ) {
        set({ isLoading: false });
        throw error;
      }
      // B-AUTH-ERROR-CONFLATION: 3번째 인자 = 매핑 무매칭 시 영문 원문 대신 쓸 키.
      // 로그인 경로 한정 안전망 — register/verify는 서버 원문이 유용하므로 넘기지 않는다.
      const message = extractErrorMessage(error, 'Login failed', 'error.loginFailed');
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  // Kakao Login
  loginWithKakao: async (accessToken: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.kakaoLogin(accessToken);

      await storage.setItem('access_token', response.tokens.access_token);
      await storage.setItem('refresh_token', response.tokens.refresh_token);

      set({
        user: response.user,
        accessToken: response.tokens.access_token,
        refreshToken: response.tokens.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });

      syncLanguageFromUser(response.user.app_lang);
      registerPushToken().catch(() => {});
      return response;
    } catch (error: any) {
      // B-CF: typed errors는 pass-through (UI에서 분기 처리)
      if (
        error instanceof EmailRecentlyWithdrawnError ||
        error instanceof AccountAlreadyExistsError ||
        error instanceof AccountExistsDifferentProviderError
      ) {
        set({ isLoading: false });
        throw error;
      }
      // B-AUTH-ERROR-CONFLATION: 3번째 인자 = 매핑 무매칭 시 영문 원문 대신 쓸 키.
      // 로그인 경로 한정 안전망 — register/verify는 서버 원문이 유용하므로 넘기지 않는다.
      const message = extractErrorMessage(error, 'Login failed', 'error.loginFailed');
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // Apple Login
  loginWithApple: async (identityToken: string, nonce: string, fullName?: { firstName?: string; lastName?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.appleLogin(identityToken, nonce, fullName);

      await storage.setItem('access_token', response.tokens.access_token);
      await storage.setItem('refresh_token', response.tokens.refresh_token);

      set({
        user: response.user,
        accessToken: response.tokens.access_token,
        refreshToken: response.tokens.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });

      syncLanguageFromUser(response.user.app_lang);
      registerPushToken().catch(() => {});
      return response;
    } catch (error: any) {
      // B-CF: typed errors는 pass-through (UI에서 분기 처리)
      if (
        error instanceof EmailRecentlyWithdrawnError ||
        error instanceof AccountAlreadyExistsError ||
        error instanceof AccountExistsDifferentProviderError
      ) {
        set({ isLoading: false });
        throw error;
      }
      // B-AUTH-ERROR-CONFLATION: 3번째 인자 = 매핑 무매칭 시 영문 원문 대신 쓸 키.
      // 로그인 경로 한정 안전망 — register/verify는 서버 원문이 유용하므로 넘기지 않는다.
      const message = extractErrorMessage(error, 'Login failed', 'error.loginFailed');
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  // Email Login
  loginWithEmail: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.emailLogin(email, password);

      await storage.setItem('access_token', response.tokens.access_token);
      await storage.setItem('refresh_token', response.tokens.refresh_token);

      set({
        user: response.user,
        accessToken: response.tokens.access_token,
        refreshToken: response.tokens.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });

      syncLanguageFromUser(response.user.app_lang);
      registerPushToken().catch(() => {});
    } catch (error: any) {
      // B-CF: typed errors는 pass-through (UI에서 분기 처리)
      if (
        error instanceof EmailRecentlyWithdrawnError ||
        error instanceof AccountAlreadyExistsError ||
        error instanceof AccountExistsDifferentProviderError
      ) {
        set({ isLoading: false });
        throw error;
      }
      // B-AUTH-ERROR-CONFLATION: 3번째 인자 = 매핑 무매칭 시 영문 원문 대신 쓸 키.
      // 로그인 경로 한정 안전망 — register/verify는 서버 원문이 유용하므로 넘기지 않는다.
      const message = extractErrorMessage(error, 'Login failed', 'error.loginFailed');
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  // Email Register
  register: async (name: string, email: string, password: string, verifyToken?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(name, email, password, verifyToken);

      await storage.setItem('access_token', response.tokens.access_token);
      await storage.setItem('refresh_token', response.tokens.refresh_token);

      set({
        user: response.user,
        accessToken: response.tokens.access_token,
        refreshToken: response.tokens.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });

      syncLanguageFromUser(response.user.app_lang);
      registerPushToken().catch(() => {});
    } catch (error: any) {
      // B-CF: typed errors는 pass-through (UI에서 분기 처리)
      if (
        error instanceof EmailRecentlyWithdrawnError ||
        error instanceof AccountAlreadyExistsError ||
        error instanceof AccountExistsDifferentProviderError ||
        error instanceof EmailRateLimitedError
      ) {
        set({ isLoading: false });
        throw error;
      }
      const message = extractErrorMessage(error, 'Registration failed');
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  // B-CN A.4: send email verification code
  sendVerification: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.sendVerification(email);
      set({ isLoading: false });
    } catch (error: any) {
      if (error instanceof EmailRateLimitedError) {
        set({ isLoading: false });
        throw error;
      }
      const message = extractErrorMessage(error, 'Failed to send verification code');
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  // B-CN A.4: verify email code → verify_token
  verifyCode: async (email: string, code: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.verifyCode(email, code);
      set({ isLoading: false });
      return res.verify_token;
    } catch (error: any) {
      if (error instanceof EmailRateLimitedError) {
        set({ isLoading: false });
        throw error;
      }
      const message = extractErrorMessage(error, 'Invalid verification code');
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  // Logout
  logout: async () => {
    set({ isLoading: true });
    try {
      await unregisterPushToken();
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      await storage.removeItem('access_token');
      await storage.removeItem('refresh_token');

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  // Force logout (no API call — used when session expired)
  forceLogout: async () => {
    await storage.removeItem('access_token');
    await storage.removeItem('refresh_token');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  // Delete Account
  deleteAccount: async () => {
    // SUCCESS path only clears auth state (typed error must propagate).
    // - 412 WITHDRAWAL_CONSENT_REQUIRED / 409 ACTIVE_SUBSCRIPTION:
    //   user must remain logged in to retry consent or cancel subscription
    // - 404 USER_NOT_FOUND: caller (withdraw.tsx) calls forceLogout explicitly
    // B-AJ Phase 3d / B-AU: typed AccountDeletionError thrown by authApi
    // passes through to caller for step-based UI branching.
    await authApi.deleteAccount();

    // Clear auth tokens
    await storage.removeItem('access_token');
    await storage.removeItem('refresh_token');

    // Clear app lock / PIN data
    await storage.removeItem(SECURE_KEYS.PIN_HASH);
    await storage.removeItem(SECURE_KEYS.APP_LOCK_ENABLED);

    // Clear onboarding flag so re-signup shows onboarding again
    await AsyncStorage.removeItem('@marzlog_onboarding_completed');

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  // Check auth on app start
  checkAuth: async () => {
    // authCheckDeferred는 결과가 나올 때까지 유지한다 — 재시도 중에 false로 내리면
    // _layout이 보류 화면 대신 미인증 Stack을 마운트해 로그인으로 밀려난다.
    set({ isLoading: true });
    try {
      const token = await storage.getItem('access_token');

      if (!token) {
        set({ isLoading: false, authCheckDeferred: false, authCheckDeferredReason: null });
        return;
      }

      // D6: 연결 없음이 확정이면 /auth/me 타임아웃을 기다리지 않고 즉시 보류
      if (await isConfirmedOffline()) {
        set({ isLoading: false, authCheckDeferred: true, authCheckDeferredReason: 'offline' });
        return;
      }

      const user = await authApi.getCurrentUser({ timeout: AUTH_CHECK_TIMEOUT_MS });
      const refreshToken = await storage.getItem('refresh_token');

      set({
        user,
        accessToken: token,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        authCheckDeferred: false,
        authCheckDeferredReason: null,
      });

      syncLanguageFromUser(user.app_lang);

      // 앱 재시작 시 푸시 토큰 재등록
      registerPushToken().catch(() => {});

      // TODO: Re-enable with billing-phase2
      // AI mode selector is hidden in settings UI; local stays at default ('precise').
      // Server sync is disabled so a stale analysis_mode (legacy 'light' rows) can't
      // downgrade the user's experience while precision is the only offered tier.
      // if (user.analysis_mode) {
      //   const localMode = backendToAiMode(user.analysis_mode);
      //   if (useSettingsStore.getState().aiMode !== localMode) {
      //     useSettingsStore.getState().syncAIModeFromServer(localMode);
      //   }
      // }
    } catch (e) {
      // B-SECURESTORE-LOCKED: 기기 잠금 중 Keychain 읽기 실패는 "토큰 무효"가 아니다.
      // 여기서 지우면 일시적 잠금이 영구 로그아웃으로 굳는다(deleteValueWithKeyAsync는
      // 네이티브에서 상태를 무시하므로 실패해도 성공처럼 통과한다) → 보존 후 재시도.
      if (isKeychainUnavailableError(e)) {
        set({ isLoading: false, authCheckDeferred: true, authCheckDeferredReason: 'unavailable' });
        captureError(e instanceof Error ? e : new Error(String(e)), {
          scope: 'checkAuth.keychainUnavailable',
        });
        return;
      }
      // D8: 토큰 삭제는 확정 인증 실패에서만. 응답 없음·5xx·인증 저장소 장애는 보존 후 보류.
      const failure = classifyAuthCheckError(e);
      if (failure !== 'auth_failed') {
        const reason: AuthCheckDeferredReason = (await isConfirmedOffline()) ? 'offline' : 'unavailable';
        set({ isLoading: false, authCheckDeferred: true, authCheckDeferredReason: reason });
        // W-SENTRY-OFFLINE-NOISE: 응답 없음(오프라인 등)은 결함이 아닌 정상 거동 — 이슈 알림을 만들지 않게
        // info 로 내리되 건수는 남긴다(W-DEFERRED-SCREEN-ESCAPE 판단 근거). 그 외 사유는 error 유지.
        if (failure === 'no_response') {
          captureMessage('checkAuth deferred: no_response', undefined, {
            level: 'info',
            fingerprint: ['checkAuth-deferred-no-response'],
            tags: {
              scope: 'checkAuth.deferred',
              failure,
              reason,
              ...(isAxiosError(e) && e.code ? { code: e.code } : {}),
            },
          });
          return;
        }
        // 원 오류 대신 분류값만 싣는다 — 요청 헤더(토큰)·응답 본문이 이벤트에 섞이지 않게
        captureError(new Error(`checkAuth deferred: ${failure}`), {
          scope: 'checkAuth.deferred',
          failure,
          reason,
          status: isAxiosError(e) ? e.response?.status : undefined,
          code: isAxiosError(e) ? e.code : undefined,
        });
        return;
      }
      // Clear invalid tokens
      await storage.removeItem('access_token');
      await storage.removeItem('refresh_token');
      set({ isLoading: false, authCheckDeferred: false, authCheckDeferredReason: null });
    }
  },

  refreshUser: async () => {
    const user = await authApi.getCurrentUser();
    set({ user });
    return user;
  },

}));

// Register session expired callback: 401 refresh failure → forceLogout → _layout.tsx redirects to /login
setOnSessionExpired(() => useAuthStore.getState().forceLogout());

export default useAuthStore;
