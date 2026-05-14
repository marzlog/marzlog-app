import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { login } from '@react-native-kakao/user';
import { useAuthStore } from '../../store/authStore';
import type { AuthResponse } from '../../types/auth';
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
  style?: object;
}

export default function KakaoLoginButton({ onSuccess, onError, onTypedError, style }: Props) {
  const { loginWithKakao } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  // 카카오 로그인은 네이티브 전용 (웹에서는 미노출)
  if (Platform.OS === 'web') return null;

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    try {
      // 카카오 계정 웹 로그인 (카카오톡 미로그인 기기 대응)
      const result = await login({ useKakaoAccountLogin: true });
      const response = await loginWithKakao(result.accessToken);
      onSuccess?.(response);
    } catch (err: any) {
      const message = err?.message || String(err);
      // 사용자 취소: 조용히 무시
      if (/cancel/i.test(message)) {
        setIsLoading(false);
        return;
      }

      // B-CF: typed errors는 분기 처리 (modal 표시)
      if (
        err instanceof EmailRecentlyWithdrawnError ||
        err instanceof AccountAlreadyExistsError ||
        err instanceof AccountExistsDifferentProviderError
      ) {
        onTypedError?.(err);
        return;
      }

      // 서버 에러 분기
      const status = err?.response?.status;
      if (status === 403) {
        onError?.('사용이 정지된 계정입니다.');
      } else if (status === 400) {
        onError?.('카카오 로그인 처리 중 오류가 발생했습니다.');
      } else {
        onError?.('카카오 로그인에 실패했습니다. 다시 시도해 주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handleKakaoLogin}
      disabled={isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color="rgba(0,0,0,0.85)" size="small" />
      ) : (
        <Text style={styles.buttonText}>카카오로 계속하기</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE500',
    borderRadius: 8,
    width: '100%',
    height: 44,
    gap: 8,
  },
  buttonText: {
    color: 'rgba(0,0,0,0.85)',
    fontSize: 15,
    fontWeight: '600',
  },
});
