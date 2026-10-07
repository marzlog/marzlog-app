import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureError } from './sentry';

/**
 * D1 1단계: 설치 표식.
 *
 * iOS Keychain 토큰은 앱 삭제 후에도 남지만 AsyncStorage는 함께 지워진다.
 * 최초 실행 시각을 AsyncStorage에 남겨 두면 "토큰은 있는데 표식이 없음"을 재설치 신호로 쓸 수 있다.
 * 이번 단계는 기록만 한다 — 토큰 정리·분기 등 동작 변경 없음.
 * logout/탈퇴 경로에서 지우지 않는다(지우면 다음 실행이 재설치로 오인된다).
 */
export const INSTALL_MARKER_KEY = '@marzlog_install_marker';

/** 표식이 없을 때만 최초 기록 시각(ISO)을 저장한다. 실패는 삼키고 계측만 — 부트를 막지 않는다. */
export async function ensureInstallMarker(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(INSTALL_MARKER_KEY);
    if (existing !== null) return;
    await AsyncStorage.setItem(INSTALL_MARKER_KEY, new Date().toISOString());
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { scope: 'installMarker.ensure' });
  }
}
