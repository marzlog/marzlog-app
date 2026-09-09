import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from '../../hooks/useTranslation';
import type { AuthResponse } from '../../types/auth';
import type { LoginButtonHandle } from './LoginButtonHandle';
import {
  EmailRecentlyWithdrawnError,
  AccountAlreadyExistsError,
  AccountExistsDifferentProviderError,
  type RegistrationTypedError,
} from '../../api/auth';

interface Props {
  onSuccess?: (authResponse: AuthResponse) => void;
  onError?: (error: string) => void;
  onTypedError?: (error: RegistrationTypedError) => void;
}

const AppleLoginButton = forwardRef<LoginButtonHandle, Props>(function AppleLoginButton(
  { onSuccess, onError, onTypedError },
  ref,
) {
  const { loginWithApple } = useAuthStore();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const handleAppleLogin = async () => {
    setIsLoading(true);
    try {
      const nonce = Crypto.randomUUID();

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce,
      });

      if (!credential.identityToken) {
        onError?.(t('auth.appleNotSupported'));
        return;
      }

      const response = await loginWithApple(
        credential.identityToken,
        nonce,
        credential.fullName
          ? {
              firstName: credential.fullName.givenName ?? undefined,
              lastName: credential.fullName.familyName ?? undefined,
            }
          : undefined,
      );

      onSuccess?.(response);
    } catch (err: any) {
      // 사용자 취소: 조용히 무시
      if (err?.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      if (
        err instanceof EmailRecentlyWithdrawnError ||
        err instanceof AccountAlreadyExistsError ||
        err instanceof AccountExistsDifferentProviderError
      ) {
        onTypedError?.(err);
        return;
      }
      // B-AUTH-ERROR-CONFLATION: code가 붙어 오는 건 전부 Apple SDK 실패다
      // (서버 왕복 실패는 authStore가 code 없는 Error로 감싸 던지고, typed 409/410은 위에서 처리됨).
      // SDK 실패를 "Apple 로그인 미지원"으로 단정하면 네트워크/일시 장애를 계정·지원 여부 문제로
      // 오표시하고, err.message를 그대로 쓰면 영문 SDK 원문이 노출된다.
      if (typeof err?.code === 'string') {
        onError?.(
          err.code.startsWith('ERR_REQUEST_')
            ? t('error.network')
            : t('error.socialVerifyFailed'),
        );
        return;
      }
      // 서버 왕복 실패는 authStore가 이미 분류·번역한 메시지를 담아 던진다.
      onError?.(err?.message || t('error.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // AccountConflictModal CTA용 — 버튼 탭과 동일 플로우 (nonce/스코프 포함)
  useImperativeHandle(ref, () => ({ trigger: handleAppleLogin }));

  // iOS 전용 (비-iOS에서 trigger 호출 시 signInAsync가 throw → 기존 catch가 안내)
  if (Platform.OS !== 'ios') return null;

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#000" size="small" />
      </View>
    );
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={8}
      style={styles.button}
      onPress={handleAppleLogin}
    />
  );
});

export default AppleLoginButton;

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 44,
  },
  loading: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 8,
  },
});
