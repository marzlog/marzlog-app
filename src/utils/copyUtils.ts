import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { cacheDirectory, downloadAsync, deleteAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

/**
 * 텍스트를 시스템 클립보드에 복사
 */
export async function copyText(text: string): Promise<void> {
  if (!text) return;
  await Clipboard.setStringAsync(text);
}

/**
 * 이미지를 시스템 share sheet로 공유 (사용자가 "이미지 저장" 선택 가능)
 *
 * Web: 새 탭으로 열기 (download 트리거)
 * Native: 임시 파일 다운로드 → Sharing.shareAsync
 */
export async function shareImage(imageUrl: string): Promise<void> {
  if (!imageUrl) return;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(imageUrl, '_blank');
    }
    return;
  }

  const tempPath = `${cacheDirectory}marzlog_save_${Date.now()}.jpg`;
  try {
    const downloadResult = await downloadAsync(imageUrl, tempPath);
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('Sharing not available on this device');
    }
    await Sharing.shareAsync(downloadResult.uri, {
      mimeType: 'image/jpeg',
      dialogTitle: 'MarZlog',
      ...(Platform.OS === 'ios' && { UTI: 'public.jpeg' }),
    });
  } finally {
    await deleteAsync(tempPath, { idempotent: true }).catch(() => {});
  }
}
