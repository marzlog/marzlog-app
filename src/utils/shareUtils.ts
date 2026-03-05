import * as Sharing from 'expo-sharing';
import { cacheDirectory, downloadAsync, deleteAsync, moveAsync } from 'expo-file-system/legacy';
import { Share, Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';

export const canShare = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return true;
  return await Sharing.isAvailableAsync();
};

export const sharePhoto = async (imageUrl: string): Promise<void> => {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'marzlog_photo.jpg', { type: 'image/jpeg' });
        await navigator.share({ files: [file], title: 'MarZlog' });
        return;
      } catch {
        // User cancelled or not supported — fallback
      }
    }
    window.open(imageUrl, '_blank');
    return;
  }

  const tempPath = `${cacheDirectory}share_${Date.now()}.jpg`;
  try {
    const downloadResult = await downloadAsync(imageUrl, tempPath);
    await Sharing.shareAsync(downloadResult.uri, {
      mimeType: 'image/jpeg',
      dialogTitle: 'MarZlog',
      ...(Platform.OS === 'ios' && { UTI: 'public.jpeg' }),
    });
  } finally {
    await deleteAsync(tempPath, { idempotent: true }).catch(() => {});
  }
};

export const sharePhotoWithCaption = async (
  viewRef: React.RefObject<any>,
): Promise<void> => {
  if (Platform.OS === 'web') {
    // Web: capture and trigger download
    try {
      const capturedUri = await captureRef(viewRef, { format: 'jpg', quality: 0.9 });
      const link = document.createElement('a');
      link.href = capturedUri;
      link.download = 'marzlog_card.jpg';
      link.click();
    } catch {
      // captureRef may fail on web
    }
    return;
  }

  const tempPath = `${cacheDirectory}share_card_${Date.now()}.jpg`;
  try {
    const capturedUri = await captureRef(viewRef, { format: 'jpg', quality: 0.9 });
    await moveAsync({ from: capturedUri, to: tempPath });
    await Sharing.shareAsync(tempPath, {
      mimeType: 'image/jpeg',
      dialogTitle: 'MarZlog',
    });
  } finally {
    await deleteAsync(tempPath, { idempotent: true }).catch(() => {});
  }
};

export const shareDiary = async (
  title: string,
  content: string,
  imageUrl?: string,
): Promise<void> => {
  const text = `${title}\n\n${content}\n\n-- MarZlog`;

  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text, title });
        return;
      } catch {
        // User cancelled — fallback
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
    return;
  }

  if (imageUrl) {
    const tempPath = `${cacheDirectory}share_diary_${Date.now()}.jpg`;
    try {
      await downloadAsync(imageUrl, tempPath);
      await Sharing.shareAsync(tempPath, {
        mimeType: 'image/jpeg',
        dialogTitle: text.substring(0, 100),
      });
    } finally {
      await deleteAsync(tempPath, { idempotent: true }).catch(() => {});
    }
  } else {
    await Share.share({
      message: text,
      ...(Platform.OS === 'ios' && { title }),
    });
  }
};
