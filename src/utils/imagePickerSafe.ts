/**
 * Image Picker 안전 래퍼 (D11 · B-IMAGEPICKER-AFTER-CONFIG-CHANGE)
 *
 * Android 는 피커가 떠 있는 동안 설정 변경(글꼴 크기 등)으로 MainActivity 가 다시
 * 만들어질 수 있다. 그러면 launch*Async 의 결과가 비거나(canceled) 예외
 * ("unregistered ActivityResultLauncher")로 끝나고, 사용자가 고른 사진은
 * ImagePicker.getPendingResultAsync() 에 남는다. 여기서 그 결과를 회수한다.
 *
 * - launchPickerSafe: launch 결과가 비거나 예외면 pending 결과를 1회 회수한다.
 *   회수할 것이 없으면 원래 결과/예외를 그대로 돌려준다 — 호출부의 기존 오류 토스트 유지.
 * - usePendingPickerRecovery: 화면이 포커스를 되찾을 때 pending 결과를 1회 회수한다
 *   (액티비티 재생성으로 화면이 다시 마운트된 경우).
 * 예외·회수 사실은 Sentry breadcrumb(category 'image-picker')로만 남긴다. iOS·web 은 no-op.
 */
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { addBreadcrumb } from './sentry';

export const PICKER_BREADCRUMB_CATEGORY = 'image-picker';

export type PickerSource = 'gallery' | 'camera' | 'focus';

function hasAssets(
  result: ImagePicker.ImagePickerResult | ImagePicker.ImagePickerErrorResult | null,
): result is ImagePicker.ImagePickerSuccessResult {
  return !!result && !('code' in result) && !result.canceled && !!result.assets?.length;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120);
}

/** Android 에 남은 피커 결과를 1회 회수한다. 없거나 실패면 null (절대 throw 하지 않음). */
export async function takePendingPickerResult(
  source: PickerSource,
): Promise<ImagePicker.ImagePickerSuccessResult | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const pending = await ImagePicker.getPendingResultAsync();
    if (pending && 'code' in pending) {
      addBreadcrumb(PICKER_BREADCRUMB_CATEGORY, 'pending-error', { source, code: pending.code });
      return null;
    }
    if (!hasAssets(pending)) return null;
    addBreadcrumb(PICKER_BREADCRUMB_CATEGORY, 'pending-recovered', {
      source,
      count: pending.assets.length,
    });
    return pending;
  } catch (error) {
    addBreadcrumb(PICKER_BREADCRUMB_CATEGORY, 'pending-failed', { source, error: errorName(error) });
    return null;
  }
}

/**
 * launch*Async 를 감싼다. 결과가 비었거나 예외면 pending 결과를 회수해 대신 돌려준다.
 * 회수할 것이 없으면 원래 결과를 돌려주거나 원래 예외를 다시 던진다.
 */
export async function launchPickerSafe(
  launch: () => Promise<ImagePicker.ImagePickerResult>,
  source: Exclude<PickerSource, 'focus'>,
): Promise<ImagePicker.ImagePickerResult> {
  let result: ImagePicker.ImagePickerResult;
  try {
    result = await launch();
  } catch (error) {
    addBreadcrumb(PICKER_BREADCRUMB_CATEGORY, 'launch-failed', { source, error: errorName(error) });
    const recovered = await takePendingPickerResult(source);
    if (recovered) return recovered;
    throw error;
  }
  if (hasAssets(result)) return result;
  return (await takePendingPickerResult(source)) ?? result;
}

/**
 * 화면 포커스 복귀 시 pending 결과를 1회 회수해 onRecovered 로 넘긴다.
 * 언마운트 뒤에는 호출하지 않는다(결과는 이미 소비됐으므로 breadcrumb 만 남는다).
 */
export function usePendingPickerRecovery(
  onRecovered: (result: ImagePicker.ImagePickerSuccessResult) => void | Promise<void>,
): void {
  const handlerRef = useRef(onRecovered);
  handlerRef.current = onRecovered;
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      void takePendingPickerResult('focus').then((result) => {
        if (result && mountedRef.current) void handlerRef.current(result);
      });
    }, []),
  );
}
