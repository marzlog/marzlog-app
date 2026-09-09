import { create } from 'zustand';
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
import { captureError } from '../utils/sentry';
import { useSettingsStore, backendToAiMode } from './settingsStore';
import { setLanguage as setI18nLanguage, isSupportedLocale, type SupportedLocale } from '../i18n';
import { registerPushToken, unregisterPushToken } from '../services/pushTokenService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    set({ isLoading: true, authCheckDeferred: false });
    try {
      const token = await storage.getItem('access_token');

      if (!token) {
        set({ isLoading: false });
        return;
      }

      const user = await authApi.getCurrentUser();
      const refreshToken = await storage.getItem('refresh_token');

      set({
        user,
        accessToken: token,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
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
        set({ isLoading: false, authCheckDeferred: true });
        captureError(e instanceof Error ? e : new Error(String(e)), {
          scope: 'checkAuth.keychainUnavailable',
        });
        return;
      }
      // Clear invalid tokens
      await storage.removeItem('access_token');
      await storage.removeItem('refresh_token');
      set({ isLoading: false });
    }
  },

}));

// Register session expired callback: 401 refresh failure → forceLogout → _layout.tsx redirects to /login
setOnSessionExpired(() => useAuthStore.getState().forceLogout());

export default useAuthStore;
