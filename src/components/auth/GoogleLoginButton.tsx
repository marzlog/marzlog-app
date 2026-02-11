import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';

// Expo Auth Session 설정
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

interface Props {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

function WebGoogleButton({ onSuccess, onError }: Props) {
  const { loginWithGoogle } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleSuccess = async (response: any) => {
    if (!response.credential) {
      onError?.('No credential');
      return;
    }
    setIsLoading(true);
    try {
      await loginWithGoogle(response.credential);
      onSuccess?.();
    } catch (e: any) {
      onError?.(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#4285F4" />
        <Text style={styles.loadingText}>로그인 중...</Text>
      </View>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_WEB_CLIENT_ID}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => onError?.('Login failed')}
        theme="outline"
        size="large"
        width="300"
      />
    </GoogleOAuthProvider>
  );
}

function NativeGoogleButton({ onSuccess, onError }: Props) {
  const { loginWithGoogle } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  // expo-auth-session Google OAuth 설정
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  // OAuth 응답 처리
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.idToken) {
        handleGoogleLogin(authentication.idToken);
      } else if (authentication?.accessToken) {
        // ID Token이 없으면 Access Token으로 사용자 정보 조회 후 처리
        fetchUserInfoAndLogin(authentication.accessToken);
      }
    } else if (response?.type === 'error') {
      console.log('[NativeGoogleLogin] Error:', response.error);
      onError?.(response.error?.message || 'Google 로그인 실패');
      setIsLoading(false);
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
      console.log('[NativeGoogleLogin] Cancelled');
      setIsLoading(false);
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    try {
      console.log('[NativeGoogleLogin] Got ID token, logging in...');
      await loginWithGoogle(idToken);
      console.log('[NativeGoogleLogin] Login success!');
      onSuccess?.();
    } catch (e: any) {
      console.log('[NativeGoogleLogin] Login error:', e.message);
      onError?.(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserInfoAndLogin = async (accessToken: string) => {
    try {
      console.log('[NativeGoogleLogin] Fetching user info with access token...');
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoResponse.json();
      console.log('[NativeGoogleLogin] User info:', userInfo.email);

      // Access Token을 ID Token처럼 사용 (백엔드에서 처리 필요할 수 있음)
      // 또는 백엔드에 별도의 access token 처리 엔드포인트 필요
      await loginWithGoogle(accessToken);
      onSuccess?.();
    } catch (e: any) {
      console.log('[NativeGoogleLogin] Error fetching user info:', e.message);
      onError?.(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = async () => {
    if (!request) {
      onError?.('Google 로그인을 준비 중입니다...');
      return;
    }
    setIsLoading(true);
    console.log('[NativeGoogleLogin] Starting Google OAuth...');
    await promptAsync();
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#4285F4" />
        <Text style={styles.loadingText}>로그인 중...</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.googleBtn, !request && styles.btnDisabled]}
      onPress={handlePress}
      disabled={!request}
    >
      <Ionicons name="logo-google" size={20} color="#4285F4" />
      <Text style={styles.googleBtnText}>Google 계정으로 계속하기</Text>
    </TouchableOpacity>
  );
}

export default function GoogleLoginButton(props: Props) {
  return Platform.OS === 'web' ? <WebGoogleButton {...props} /> : <NativeGoogleButton {...props} />;
}

const styles = StyleSheet.create({
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
    height: 52,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 10,
  },
  googleBtnText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
