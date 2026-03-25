/**
 * Push Token Registration Service
 * - Android 알림 채널 설정
 * - Expo Push Token 발급 → 백엔드 등록
 * - 로그아웃 시 토큰 비활성화
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import apiClient from '../api/client';

let _currentPushToken: string | null = null;

/**
 * Android 알림 채널 설정 (Android 8.0+ 필수)
 */
async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'MarZlog 알림',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#8B5CF6',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });
}

/**
 * Expo Push Token 발급 + 백엔드 등록
 * 실제 기기에서만 동작, 시뮬레이터는 건너뜀
 */
export async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    // Android 채널 먼저 설정
    await setupAndroidNotificationChannel();

    if (!Device.isDevice) {
      console.log('[Push] 실제 기기에서만 동작합니다');
      return;
    }

    // 권한 확인
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[Push] 알림 권한 거부됨');
      return;
    }

    // Expo Push Token 발급 (projectId 명시)
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '992b64cc-e784-4984-8e08-fdc26f45088b',
    });
    const token = tokenData.data;
    const platform = Platform.OS as 'ios' | 'android';

    _currentPushToken = token;

    // 백엔드에 등록
    await apiClient.post('/push/register', { token, platform });
    console.log('[Push] 토큰 등록 완료:', token.substring(0, 30) + '...');
  } catch (error) {
    console.error('[Push] 등록 실패:', error);
  }
}

/**
 * 로그아웃 시 푸시 토큰 비활성화
 */
export async function unregisterPushToken(): Promise<void> {
  if (!_currentPushToken) return;

  try {
    await apiClient.delete('/push/token', {
      data: { token: _currentPushToken },
    });
    console.log('[Push] 토큰 비활성화 완료');
  } catch {
    // 로그아웃 시 실패해도 무시
  }
  _currentPushToken = null;
}

/**
 * 현재 등록된 토큰 반환
 */
export function getCurrentPushToken(): string | null {
  return _currentPushToken;
}
