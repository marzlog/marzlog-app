import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert, Platform, Clipboard } from 'react-native';
import { login } from '@react-native-kakao/user';
import { getKeyHashAndroid } from '@react-native-kakao/core';
import { useAuthStore } from '../../store/authStore';

interface Props {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  style?: object;
}

export default function KakaoLoginButton({ onSuccess, onError, style }: Props) {
  const { loginWithKakao } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  // DEBUG: 키 해시 + 앱 키 확인
  useEffect(() => {
    if (Platform.OS === 'android') {
      getKeyHashAndroid().then((hash) => {
        Alert.alert('DEBUG 확인', `appKey: ${process.env.EXPO_PUBLIC_KAKAO_APP_KEY}\nhash: ${hash}`);
      }).catch(() => {});
    }
  }, []);

  // 카카오 로그인은 네이티브 전용 (웹에서는 미노출)
  if (Platform.OS === 'web') return null;

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    try {
      // 카카오 계정 웹 로그인 (카카오톡 미로그인 기기 대응)
      const result = await login({ useKakaoAccountLogin: true });
      // DEBUG: 임시 — access_token 확인용
      Alert.alert('DEBUG', `token: ${result.accessToken?.substring(0, 20)}...`);
      await loginWithKakao(result.accessToken);
      onSuccess?.();
    } catch (err: any) {
      const message = err?.message || String(err);
      // 사용자 취소: 조용히 무시
      if (/cancel/i.test(message)) {
        setIsLoading(false);
        return;
      }

      // DEBUG: 임시 — 에러 상세 표시
      Alert.alert('DEBUG Error', `${message}\n\nstatus: ${err?.response?.status}\ndata: ${JSON.stringify(err?.response?.data)}`);

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
