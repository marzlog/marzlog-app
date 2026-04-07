import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from '../../hooks/useTranslation';

interface Props {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function AppleLoginButton({ onSuccess, onError }: Props) {
  const { loginWithApple } = useAuthStore();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  // iOS 전용
  if (Platform.OS !== 'ios') return null;

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

      await loginWithApple(
        credential.identityToken,
        nonce,
        credential.fullName
          ? {
              firstName: credential.fullName.givenName ?? undefined,
              lastName: credential.fullName.familyName ?? undefined,
            }
          : undefined,
      );

      onSuccess?.();
    } catch (err: any) {
      // 사용자 취소: 조용히 무시
      if (err.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      onError?.(err.message || t('auth.appleNotSupported'));
    } finally {
      setIsLoading(false);
    }
  };

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
}

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
