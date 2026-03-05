import * as Sharing from 'expo-sharing';
import { cacheDirectory, downloadAsync, deleteAsync, moveAsync } from 'expo-file-system/legacy';
import { Share, Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';

export const canShare = async (): Promise<boolean> => {
  return await Sharing.isAvailableAsync();
};

export const sharePhoto = async (imageUrl: string): Promise<void> => {
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
  const tempPath = `${cacheDirectory}share_card_${Date.now()}.jpg`;

  try {
    const capturedUri = await captureRef(viewRef, {
      format: 'jpg',
      quality: 0.9,
    });

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
