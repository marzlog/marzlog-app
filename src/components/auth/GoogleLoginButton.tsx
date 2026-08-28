import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { captureMessage } from '../../utils/sentry';
import { useTranslation } from '@/src/hooks/useTranslation';
import { t as i18nT } from '../../i18n';
import type { AuthResponse } from '../../types/auth';
import type { LoginButtonHandle } from './LoginButtonHandle';
import {
  EmailRecentlyWithdrawnError,
  AccountAlreadyExistsError,
  AccountExistsDifferentProviderError,
  type RegistrationTypedError,
} from '../../api/auth';

// Expo Auth Session 설정
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

// 네이티브 Google Sign-In 설정 — 모듈 스코프 1회.
// 브라우저 왕복 없이 네이티브 계정 선택기를 쓰므로 "앱으로 복귀 실패"가 구조적으로 발생하지 않는다
// (B-GOOGLE-OAUTH-RETURN 근본 해결).
if (Platform.OS !== 'web') {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
}

interface Props {
  onSuccess?: (authResponse: AuthResponse) => void;
  onError?: (error: string) => void;
  onTypedError?: (error: RegistrationTypedError) => void;
  style?: object;
}

function dispatchAuthError(
  e: unknown,
  onTypedError: Props['onTypedError'],
  onError: Props['onError'],
) {
  if (
    e instanceof EmailRecentlyWithdrawnError ||
    e instanceof AccountAlreadyExistsError ||
    e instanceof AccountExistsDifferentProviderError
  ) {
    onTypedError?.(e);
    return;
  }
  const message = e instanceof Error ? e.message : i18nT('error.googleLoginFailed');
  onError?.(message);
}

const WebGoogleButtonInner = forwardRef<LoginButtonHandle, Props>(function WebGoogleButtonInner(
  { onSuccess, onError, onTypedError, style },
  ref,
) {
  const { loginWithGoogle } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        const response = await loginWithGoogle(tokenResponse.access_token);
        onSuccess?.(response);
      } catch (e: unknown) {
        dispatchAuthError(e, onTypedError, onError);
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      onError?.(t('error.googleLoginFailed'));
      setIsLoading(false);
    },
  });

  // AccountConflictModal CTA용 — 버튼 탭과 동일 플로우
  useImperativeHandle(ref, () => ({ trigger: () => login() }));

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#4285F4" />
        <Text style={styles.loadingText}>{t('auth.loggingIn')}</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.googleBtn, style]}
      onPress={() => login()}
      activeOpacity={0.8}
    >
      <Ionicons name="logo-google" size={20} color="#4285F4" />
      <Text style={styles.googleBtnText}>{t('auth.continueWithGoogle')}</Text>
    </TouchableOpacity>
  );
});

const WebGoogleButton = forwardRef<LoginButtonHandle, Props>(function WebGoogleButton(props, ref) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_WEB_CLIENT_ID}>
      <WebGoogleButtonInner {...props} ref={ref} />
    </GoogleOAuthProvider>
  );
});

const NativeGoogleButton = forwardRef<LoginButtonHandle, Props>(function NativeGoogleButton(
  { onSuccess, onError, onTypedError, style },
  ref,
) {
  const { loginWithGoogle } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  // NOTE: 예외를 rethrow하지 말 것 — handlePress catch와 계측/로딩해제가 중복됨
  const handleGoogleLogin = async (idToken: string) => {
    try {
      const response = await loginWithGoogle(idToken);
      onSuccess?.(response);
    } catch (e: unknown) {
      dispatchAuthError(e, onTypedError, onError);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = async () => {
    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        // v16은 사용자 취소를 throw가 아니라 type:'cancelled'로 돌려준다.
        // 네이티브 선택기라 이건 "복귀 실패"가 아니라 진짜 자발 취소 — 안내하지 않는다.
        // 계측 이벤트명은 vc19(완화판) 대비 발생률 비교를 위해 유지한다.
        captureMessage('google_oauth_return_failed', {
          type: 'cancelled',
          platform: Platform.OS,
        });
        setIsLoading(false);
        return;
      }

      const { idToken } = response.data;
      if (!idToken) {
        captureMessage('google_oauth_error', {
          type: 'no_id_token',
          platform: Platform.OS,
        });
        onError?.(t('auth.googleLoginIncomplete'));
        setIsLoading(false);
        return;
      }

      await handleGoogleLogin(idToken);
    } catch (e: unknown) {
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
        // 구형 경로 방어 — v16은 위 cancelled 분기로 처리되지만 코드로도 올 수 있다
        captureMessage('google_oauth_return_failed', {
          type: 'cancelled',
          platform: Platform.OS,
        });
        setIsLoading(false);
        return;
      }
      if (isErrorWithCode(e) && e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        captureMessage('google_oauth_return_failed', {
          type: 'play_services',
          platform: Platform.OS,
        });
        onError?.(t('auth.googleLoginIncomplete'));
        setIsLoading(false);
        return;
      }
      captureMessage('google_oauth_error', {
        type: 'error',
        code: isErrorWithCode(e) ? e.code : undefined,
        error: e instanceof Error ? e.message : undefined,
        platform: Platform.OS,
      });
      dispatchAuthError(e, onTypedError, onError);
      setIsLoading(false);
    }
  };

  // AccountConflictModal CTA용 — 버튼 탭과 동일 플로우
  useImperativeHandle(ref, () => ({ trigger: handlePress }));

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#4285F4" />
        <Text style={styles.loadingText}>{t('auth.loggingIn')}</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.googleBtn, style]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Ionicons name="logo-google" size={20} color="#4285F4" />
      <Text style={styles.googleBtnText}>{t('auth.continueWithGoogle')}</Text>
    </TouchableOpacity>
  );
});

const GoogleLoginButton = forwardRef<LoginButtonHandle, Props>(function GoogleLoginButton(props, ref) {
  return Platform.OS === 'web'
    ? <WebGoogleButton {...props} ref={ref} />
    : <NativeGoogleButton {...props} ref={ref} />;
});

export default GoogleLoginButton;

const styles = StyleSheet.create({
  webGoogleWrapper: {
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    color: '#374151',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 10,
  },
  googleBtnText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
});
