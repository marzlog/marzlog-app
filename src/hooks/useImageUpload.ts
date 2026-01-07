/**
 * useImageUpload Hook
 * - 이미지 선택 (갤러리/카메라)
 * - 업로드 진행 관리
 * - 상태 추적
 */
import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import { uploadImage, prepareUpload, uploadToS3, calculateSHA256, completeGroupUpload, addImagesToGroup } from '../api/upload';
import type { SelectedImage, UploadItem, UploadCompleteResponse, UploadStatus, GroupUploadCompleteResponse, GroupUploadItem } from '../types/upload';

const MAX_SELECTION = 5; // 대표 1개 + 서브 4개
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function useImageUpload() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      quality: 0.9,
      exif: true,
    });

    if (result.canceled || !result.assets?.length) return;

    const newItems: UploadItem[] = result.assets.map((asset, index) => ({
      id: `upload_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      uri: asset.uri,
      filename: asset.fileName ?? `photo_${Date.now()}_${index}.jpg`,
      fileSize: asset.fileSize ?? 0,
      mimeType: asset.mimeType ?? 'image/jpeg',
      width: asset.width,
      height: asset.height,
      status: 'idle' as UploadStatus,
      progress: 0,
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
      quality: 0.9,
      exif: true,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
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
    };

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
  const startUpload = useCallback(async (directItems?: UploadItem[]): Promise<UploadCompleteResponse[]> => {
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
          }
        );

        updateItem(item.id, {
          status: 'done',
          progress: 100,
          mediaId: result.media_id,
        });
        results.push(result);

        console.log(`✅ 업로드 완료: ${item.filename}, media_id: ${result.media_id}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '업로드 실패';
        updateItem(item.id, {
          status: 'error',
          error: errorMsg,
        });
        console.error(`❌ 업로드 실패: ${item.filename}`, err);
      }
    }

    setIsUploading(false);

    if (results.length > 0) {
      const duplicateCount = results.filter((r) => r.status === 'duplicate').length;
      const newCount = results.length - duplicateCount;

      let message = '';
      if (newCount > 0) message += `${newCount}장 업로드 완료!`;
      if (duplicateCount > 0) message += ` (${duplicateCount}장은 이미 존재)`;
      if (newCount > 0) message += '\nAI 분석이 시작됩니다.';

      Alert.alert('업로드 완료', message.trim());
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
  }, []);

  // 그룹 업로드 시작 (여러 이미지를 하나의 그룹으로)
  const startGroupUpload = useCallback(async (
    directItems: UploadItem[],
    primaryIndex: number = 0
  ): Promise<GroupUploadCompleteResponse | null> => {
    if (directItems.length === 0) {
      Alert.alert('알림', '업로드할 사진이 없습니다.');
      return null;
    }

    setIsUploading(true);
    setError(null);

    const uploadedItems: GroupUploadItem[] = [];

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
          },
        });

        // 중복 체크 - 그룹 업로드에서는 중복도 포함
        if (prepareResponse.duplicate && prepareResponse.existing_media_id) {
          console.log(`[GroupUpload] Duplicate found: ${item.filename}`);
          updateItem(item.id, { status: 'done', progress: 100, mediaId: prepareResponse.existing_media_id });
          continue; // 중복은 그룹에 포함하지 않음
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

      const result = await completeGroupUpload({
        items: uploadedItems,
        primary_index: adjustedPrimaryIndex,
        analysis_mode: 'light',
      });

      // 모든 아이템 완료 처리
      directItems.forEach(item => {
        updateItem(item.id, { status: 'done', progress: 100 });
      });

      console.log(`✅ 그룹 업로드 완료: ${result.total_images}장, group_id: ${result.group_id}`);

      Alert.alert(
        '업로드 완료',
        `${result.total_images}장이 그룹으로 업로드되었습니다.\nAI 분석이 시작됩니다.`
      );

      setIsUploading(false);
      return result;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '그룹 업로드 실패';
      setError(errorMsg);
      console.error('❌ 그룹 업로드 실패:', err);
      Alert.alert('오류', errorMsg);
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
      console.log('[GroupUpload] No new images to add');
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
          },
        });

        // 중복 체크
        if (prepareResponse.duplicate && prepareResponse.existing_media_id) {
          console.log(`[GroupUpload] Duplicate found: ${item.filename}`);
          updateItem(item.id, { status: 'done', progress: 100, mediaId: prepareResponse.existing_media_id });
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
        const result = await addImagesToGroup(groupId, { items: uploadedItems });
        console.log(`✅ 그룹에 ${result.added_images}장 추가됨, total: ${result.total_images}`);
      }

      // 모든 아이템 완료 처리
      itemsToUpload.forEach(item => {
        updateItem(item.id, { status: 'done', progress: 100 });
      });

      setIsUploading(false);
      return true;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '이미지 추가 실패';
      setError(errorMsg);
      console.error('❌ 그룹 이미지 추가 실패:', err);
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
