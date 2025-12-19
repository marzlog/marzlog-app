import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

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

function NativeButton({ onSuccess, onError }: Props) {
  const { mockLogin } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    setIsLoading(true);
    try {
      console.log('[NativeLogin] Using dev-login...');
      await mockLogin();
      console.log('[NativeLogin] Login success!');
      onSuccess?.();
    } catch (e: any) {
      console.log('[NativeLogin] Login error:', e.message);
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
    <TouchableOpacity style={styles.btn} onPress={handlePress}>
      <Ionicons name="logo-google" size={20} color="#4285F4" />
      <Text style={styles.btnText}>Continue with Google (Dev)</Text>
    </TouchableOpacity>
  );
}

export default function GoogleLoginButton(props: Props) {
  return Platform.OS === 'web' ? <WebGoogleButton {...props} /> : <NativeButton {...props} />;
}

const styles = StyleSheet.create({
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 },
  loadingText: { marginLeft: 8, color: '#374151' },
  btn: { backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  btnText: { color: '#333', fontWeight: '600' },
});
