/**
 * useImageUpload Hook
 * - 이미지 선택 (갤러리/카메라)
 * - 업로드 진행 관리
 * - 상태 추적
 */
import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import { AxiosError } from 'axios';
import { uploadImage, prepareUpload, uploadToS3, calculateSHA256, completeGroupUpload, addImagesToGroup } from '../api/upload';
import type { SelectedImage, UploadItem, UploadCompleteResponse, UploadStatus, GroupUploadCompleteResponse, GroupUploadItem } from '../types/upload';
import { getErrorMessage } from '../utils/errorMessages';
import { captureError } from '../utils/sentry';
import { resolveAssetLocation } from '../utils/exif/resolveAssetLocation';
import { resolveCurrentLocation } from '../utils/exif/resolveCurrentLocation';
import { t } from '../i18n';
import { useSettingsStore, aiModeToBackend } from '../store/settingsStore';

function isQuotaExceededError(err: unknown): boolean {
  if (err instanceof AxiosError) {
    return err.response?.status === 413 &&
      err.response?.data?.error_code === 'STORAGE_QUOTA_EXCEEDED';
  }
  return false;
}

const MAX_SELECTION = 5; // 대표 1개 + 서브 4개
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function useImageUpload() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // 갤러리 권한 요청
  const requestPermission = useCallback(async () => {
    if (Platform.OS === 'web') return true;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 선택을 위해 갤러리 접근 권한이 필요합니다.');
      return false;
    }
    return true;
  }, []);

  // 갤러리에서 선택
  const pickFromGallery = useCallback(async (allowMultiple = true): Promise<UploadItem[] | undefined> => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const remainingSlots = MAX_SELECTION - items.length;
    if (remainingSlots <= 0) {
      Alert.alert('최대 선택', `한 번에 최대 ${MAX_SELECTION}장까지 선택할 수 있습니다.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: allowMultiple,
      selectionLimit: remainingSlots,
      quality: 1.0,  // EXIF 보존을 위해 재인코딩 방지
      exif: true,
    });

    if (result.canceled || !result.assets?.length) return;

    const newItems: UploadItem[] = await Promise.all(result.assets.map(async (asset, index) => {
      const { gps, warning } = await resolveAssetLocation(asset);
      if (__DEV__ && warning) {
        console.warn(`[useImageUpload] resolveAssetLocation: ${warning}`);
      }
      return {
        id: `upload_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        uri: asset.uri,
        filename: asset.fileName ?? `photo_${Date.now()}_${index}.jpg`,
        fileSize: asset.fileSize ?? 0,
        mimeType: asset.mimeType ?? 'image/jpeg',
        width: asset.width,
        height: asset.height,
        status: 'idle' as UploadStatus,
        progress: 0,
        isExisting: false, // 새 이미지임을 명시
        clientExif: { ...(asset.exif ?? {}), ...gps },  // iOS quality<1.0 fallback + PHPicker GPS strip 우회
      } as UploadItem;
    }));

    setItems((prev) => [...prev, ...newItems]);
    return newItems;
  }, [items.length, requestPermission]);

  // 카메라로 촬영
  const takePhoto = useCallback(async (): Promise<UploadItem | undefined> => {
    if (Platform.OS === 'web') {
      Alert.alert('알림', '웹에서는 카메라를 사용할 수 없습니다.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 촬영을 위해 카메라 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 1.0,  // EXIF 보존을 위해 재인코딩 방지
      exif: true,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    let { gps, warning } = await resolveAssetLocation(asset);
    if (Object.keys(gps).length === 0) {
      // 카메라 직촬본은 PHAsset이 없어 resolveAssetLocation이 GPS를 얻지 못함.
      // 현재 위치로 fallback (iOS 기본 카메라 앱과 동일한 의미).
      const fallback = await resolveCurrentLocation();
      gps = fallback.gps;
      if (__DEV__ && fallback.warning) {
        console.warn(`[useImageUpload] resolveCurrentLocation: ${fallback.warning}`);
      }
    } else if (__DEV__ && warning) {
      console.warn(`[useImageUpload] resolveAssetLocation: ${warning}`);
    }
    const newItem: UploadItem = {
      id: `upload_${Date.now()}`,
      uri: asset.uri,
      filename: `photo_${Date.now()}.jpg`,
      fileSize: asset.fileSize ?? 0,
      mimeType: asset.mimeType ?? 'image/jpeg',
      width: asset.width,
      height: asset.height,
      status: 'idle',
      progress: 0,
      isExisting: false, // 새 이미지임을 명시
      clientExif: { ...(asset.exif ?? {}), ...gps },  // iOS quality<1.0 fallback + PHPicker GPS strip 우회
    } as UploadItem;

    setItems((prev) => [...prev, newItem]);
    return newItem;
  }, []);

  // 아이템 상태 업데이트 헬퍼
  const updateItem = useCallback((id: string, updates: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  // 업로드 시작 (직접 아이템을 전달받거나 상태에서 가져옴)
  const startUpload = useCallback(async (directItems?: UploadItem[], takenAt?: string): Promise<UploadCompleteResponse[]> => {
    const pendingItems = directItems
      ? directItems.filter((i) => i.status === 'idle' || i.status === 'error')
      : items.filter((i) => i.status === 'idle' || i.status === 'error');

    if (pendingItems.length === 0) {
      Alert.alert('알림', '업로드할 사진이 없습니다.');
      return [];
    }

    setIsUploading(true);
    setError(null);
    const results: UploadCompleteResponse[] = [];

    for (const item of pendingItems) {
      // 파일 크기 체크
      if (item.fileSize > MAX_FILE_SIZE) {
        updateItem(item.id, {
          status: 'error',
          error: '파일이 너무 큽니다 (최대 100MB)',
        });
        continue;
      }

      try {
        updateItem(item.id, { status: 'hashing', progress: 0 });

        const selectedImage: SelectedImage = {
          uri: item.uri,
          filename: item.filename,
          fileSize: item.fileSize,
          width: item.width,
          height: item.height,
          mimeType: item.mimeType,
          clientExif: item.clientExif,
        };

        const result = await uploadImage(
          selectedImage,
          (progress) => updateItem(item.id, { progress }),
          (status) => {
            const statusMap: Record<string, UploadStatus> = {
              '해시 계산 중...': 'hashing',
              '업로드 준비 중...': 'preparing',
              '업로드 중...': 'uploading',
              '분석 요청 중...': 'completing',
              '완료!': 'done',
            };
            updateItem(item.id, { status: statusMap[status] || 'uploading' });
          },
          takenAt  // 캘린더에서 선택한 날짜 전달
        );

        updateItem(item.id, {
          status: 'done',
          progress: 100,
          mediaId: result.media_id,
        });
        results.push(result);
      } catch (err) {
        if (isQuotaExceededError(err)) {
          setQuotaExceeded(true);
          setError(t('storage.quotaExceeded'));
          updateItem(item.id, { status: 'error', error: t('storage.quotaExceeded') });
          break;
        }
        const errorMsg = getErrorMessage(err);
        updateItem(item.id, {
          status: 'error',
          error: errorMsg,
        });
        captureError(err instanceof Error ? err : new Error(String(err)), { context: 'useImageUpload.startUpload', filename: item.filename });
      }
    }

    setIsUploading(false);

    if (results.length > 0) {
      const reusedCount = results.filter((r) => r.status === 'reused').length;
      const newCount = results.length - reusedCount;

      let message = `${results.length}장 업로드 완료!`;
      if (reusedCount > 0) {
        message += `\n(${reusedCount}장은 기존 파일 재사용)`;
      }
      message += '\nAI 분석이 시작됩니다.';
      Alert.alert('업로드 완료', message);
    }

    return results;
  }, [items, updateItem]);

  // 아이템 제거
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  // 완료된 아이템 제거
  const clearCompleted = useCallback(() => {
    setItems((prev) => prev.filter((i) => i.status !== 'done'));
  }, []);

  // 전체 초기화
  const reset = useCallback(() => {
    setItems([]);
    setError(null);
    setQuotaExceeded(false);
  }, []);

  // 그룹 업로드 시작 (여러 이미지를 하나의 그룹으로)
  const startGroupUpload = useCallback(async (
    directItems: UploadItem[],
    primaryIndex: number = 0,
    takenAt?: string,  // 캘린더에서 선택한 날짜
    metadata?: { title?: string; content?: string; memo?: string; emotion?: string; intensity?: number }
  ): Promise<GroupUploadCompleteResponse | null> => {
    if (directItems.length === 0) {
      Alert.alert('알림', '업로드할 사진이 없습니다.');
      return null;
    }

    setIsUploading(true);
    setError(null);

    const uploadedItems: GroupUploadItem[] = [];
    let duplicateCount = 0;

    try {
      // 1. 각 이미지를 S3에 업로드하고 정보 수집
      for (let i = 0; i < directItems.length; i++) {
        const item = directItems[i];

        // 파일 크기 체크
        if (item.fileSize > MAX_FILE_SIZE) {
          throw new Error(`파일이 너무 큽니다: ${item.filename}`);
        }

        updateItem(item.id, { status: 'hashing', progress: 0 });

        // SHA256 해시 계산
        let sha256: string;
        try {
          sha256 = await calculateSHA256(item.uri);
        } catch {
          sha256 = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        }

        updateItem(item.id, { status: 'preparing', progress: 10 });

        // Presigned URL 발급
        const prepareResponse = await prepareUpload({
          filename: item.filename,
          content_type: item.mimeType,
          size: item.fileSize || 1024 * 1024,
          sha256,
          metadata: {
            width: item.width,
            height: item.height,
            ...(item.clientExif ? { client_exif: item.clientExif } : {}),
          },
        });

        // 중복 체크 - skip_upload이면 S3 업로드 건너뛰고 그룹에 포함
        if (prepareResponse.duplicate && prepareResponse.skip_upload) {
          duplicateCount++;

          // S3 업로드 건너뛰고 바로 그룹에 포함
          if (prepareResponse.upload_id && prepareResponse.storage_key) {
            uploadedItems.push({
              upload_id: prepareResponse.upload_id,
              storage_key: prepareResponse.storage_key,
              sha256,
            });
          }
          updateItem(item.id, { status: 'done', progress: 100 });
          continue;
        }

        updateItem(item.id, { status: 'uploading', progress: 15 });

        // S3 업로드
        const uploadUrl = prepareResponse.presigned_put_url || prepareResponse.upload_url;
        if (!uploadUrl) {
          throw new Error('No presigned URL received');
        }

        await uploadToS3(uploadUrl, item.uri, item.mimeType, (progress) => {
          updateItem(item.id, { progress: 15 + Math.round(progress * 0.75) });
        });

        updateItem(item.id, { status: 'completing', progress: 90 });

        // 업로드 정보 수집
        if (prepareResponse.upload_id && prepareResponse.storage_key) {
          uploadedItems.push({
            upload_id: prepareResponse.upload_id,
            storage_key: prepareResponse.storage_key,
            sha256,
          });
        }

        updateItem(item.id, { progress: 95 });
      }

      // 2. 그룹 업로드 완료 API 호출
      if (uploadedItems.length === 0) {
        Alert.alert('알림', '새로 업로드할 사진이 없습니다. (모두 중복)');
        setIsUploading(false);
        return null;
      }

      // primary_index 조정 (중복으로 제외된 이미지 고려)
      const adjustedPrimaryIndex = Math.min(primaryIndex, uploadedItems.length - 1);

      const groupRequestBody = {
        items: uploadedItems,
        primary_index: adjustedPrimaryIndex,
        analysis_mode: aiModeToBackend(useSettingsStore.getState().aiMode),
        taken_at: takenAt,  // 캘린더에서 선택한 날짜
        ...metadata,
      };

      const result = await completeGroupUpload(groupRequestBody);

      // 모든 아이템 완료 처리
      directItems.forEach(item => {
        updateItem(item.id, { status: 'done', progress: 100 });
      });

      let alertMessage = `${result.total_images}장이 업로드되었습니다.`;
      if (duplicateCount > 0) {
        alertMessage += `\n(${duplicateCount}장은 기존 파일 재사용)`;
      }
      alertMessage += '\nAI 분석이 시작됩니다.';

      Alert.alert('업로드 완료', alertMessage);

      setIsUploading(false);
      return result;

    } catch (err) {
      if (isQuotaExceededError(err)) {
        setQuotaExceeded(true);
        setError(t('storage.quotaExceeded'));
        setIsUploading(false);
        return null;
      }
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      captureError(err instanceof Error ? err : new Error(String(err)), { context: 'useImageUpload.startGroupUpload' });
      Alert.alert(t('common.error'), errorMsg);
      setIsUploading(false);
      return null;
    }
  }, [updateItem]);

  // 기존 그룹에 이미지 추가
  const addToExistingGroup = useCallback(async (
    groupId: string,
    newItems: UploadItem[]
  ): Promise<boolean> => {
    // 새 이미지만 필터 (isExisting이 없는 것들)
    const itemsToUpload = newItems.filter((item: any) => !item.isExisting);

    if (itemsToUpload.length === 0) {
      return true;
    }

    setIsUploading(true);
    setError(null);

    const uploadedItems: GroupUploadItem[] = [];

    try {
      // 각 이미지를 S3에 업로드
      for (let i = 0; i < itemsToUpload.length; i++) {
        const item = itemsToUpload[i];

        if (item.fileSize > MAX_FILE_SIZE) {
          throw new Error(`파일이 너무 큽니다: ${item.filename}`);
        }

        updateItem(item.id, { status: 'hashing', progress: 0 });

        // SHA256 해시 계산
        let sha256: string;
        try {
          sha256 = await calculateSHA256(item.uri);
        } catch {
          sha256 = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        }

        updateItem(item.id, { status: 'preparing', progress: 10 });

        // Presigned URL 발급
        const prepareResponse = await prepareUpload({
          filename: item.filename,
          content_type: item.mimeType,
          size: item.fileSize || 1024 * 1024,
          sha256,
          metadata: {
            width: item.width,
            height: item.height,
            ...(item.clientExif ? { client_exif: item.clientExif } : {}),
          },
        });

        // 중복 체크 - skip_upload이면 S3 업로드 건너뛰고 그룹에 포함
        if (prepareResponse.duplicate && prepareResponse.skip_upload) {
          if (prepareResponse.upload_id && prepareResponse.storage_key) {
            uploadedItems.push({
              upload_id: prepareResponse.upload_id,
              storage_key: prepareResponse.storage_key,
              sha256,
            });
          }
          updateItem(item.id, { status: 'done', progress: 100 });
          continue;
        }

        updateItem(item.id, { status: 'uploading', progress: 15 });

        // S3 업로드
        const uploadUrl = prepareResponse.presigned_put_url || prepareResponse.upload_url;
        if (!uploadUrl) {
          throw new Error('No presigned URL received');
        }

        await uploadToS3(uploadUrl, item.uri, item.mimeType, (progress) => {
          updateItem(item.id, { progress: 15 + Math.round(progress * 0.75) });
        });

        updateItem(item.id, { status: 'completing', progress: 90 });

        if (prepareResponse.upload_id && prepareResponse.storage_key) {
          uploadedItems.push({
            upload_id: prepareResponse.upload_id,
            storage_key: prepareResponse.storage_key,
            sha256,
          });
        }

        updateItem(item.id, { progress: 95 });
      }

      // 그룹에 이미지 추가 API 호출
      if (uploadedItems.length > 0) {
        await addImagesToGroup(groupId, { items: uploadedItems });
      }

      // 모든 아이템 완료 처리
      itemsToUpload.forEach(item => {
        updateItem(item.id, { status: 'done', progress: 100 });
      });

      setIsUploading(false);
      return true;

    } catch (err) {
      if (isQuotaExceededError(err)) {
        setQuotaExceeded(true);
        setError(t('storage.quotaExceeded'));
        setIsUploading(false);
        return false;
      }
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      captureError(err instanceof Error ? err : new Error(String(err)), { context: 'useImageUpload.addToExistingGroup' });
      setIsUploading(false);
      return false;
    }
  }, [updateItem]);

  // 통계
  const stats = {
    total: items.length,
    pending: items.filter((i) => i.status === 'idle').length,
    uploading: items.filter((i) => ['hashing', 'preparing', 'uploading', 'completing'].includes(i.status)).length,
    done: items.filter((i) => i.status === 'done').length,
    error: items.filter((i) => i.status === 'error').length,
  };

  return {
    items,
    isUploading,
    error,
    quotaExceeded,
    stats,
    pickFromGallery,
    takePhoto,
    startUpload,
    startGroupUpload,
    addToExistingGroup,
    removeItem,
    clearCompleted,
    reset,
  };
}

// Type alias for external use
export type ImagePickerItem = UploadItem;

export { MAX_SELECTION };
export type { UploadItem };
export default useImageUpload;
