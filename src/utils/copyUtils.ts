import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';
import { cacheDirectory, downloadAsync, deleteAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

/**
 * 텍스트를 시스템 클립보드에 복사
 */
export async function copyText(text: string): Promise<void> {
  if (!text) return;
  await Clipboard.setStringAsync(text);
}

export type SaveImageResult = 'success' | 'denied' | 'error';

/**
 * 이미지를 디바이스 갤러리에 직접 저장 (expo-media-library)
 *
 * Web: 새 탭으로 열기 (download 트리거)
 * Native:
 *   1. iOS만 권한 요청 (denied 시 'denied' 반환)
 *      — Android는 게이트 없이 직행: API 33+는 saveToLibraryAsync가 무권한 동작하고,
 *        READ_MEDIA_* 부재 매니페스트에서는 requestPermissionsAsync가 승인될 수 없음.
 *        API 29~32는 WRITE_EXTERNAL_STORAGE 잔존 경로로 동작.
 *   2. 임시 캐시 디렉토리에 다운로드
 *   3. MediaLibrary.saveToLibraryAsync (갤러리 저장)
 *   4. 임시 파일 정리
 */
export async function saveImageToGallery(imageUrl: string): Promise<SaveImageResult> {
  if (!imageUrl) return 'error';

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(imageUrl, '_blank');
    }
    return 'success';
  }

  try {
    if (Platform.OS === 'ios') {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return 'denied';
    }

    const tempPath = `${cacheDirectory}marzlog_save_${Date.now()}.jpg`;
    try {
      const { uri } = await downloadAsync(imageUrl, tempPath);
      await MediaLibrary.saveToLibraryAsync(uri);
      return 'success';
    } finally {
      await deleteAsync(tempPath, { idempotent: true }).catch(() => {});
    }
  } catch (e) {
    console.error('saveImageToGallery error:', e);
    return 'error';
  }
}
