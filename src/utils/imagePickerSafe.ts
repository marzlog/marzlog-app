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
 * - usePendingPickerRecovery: 포커스된 화면에서 pending 결과를 회수한다 — 포커스 시
 *   0ms·1500ms·4000ms 3회 + 포커스 중 AppState 'active' 전환마다 1회(결과를 받으면 중단).
 *   네이티브는 재생성된 액티비티가 STARTED 가 된 뒤에야 결과를 저장하므로 첫 시도가 이를 수 있고,
 *   JS 컨텍스트가 살아 있으면 포커스 이벤트가 오지 않아 AppState 가 유일한 계기다(D11-b).
 * 예외·회수 사실은 Sentry breadcrumb(category 'image-picker')로만 남긴다. iOS·web 은 no-op.
 */
import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { addBreadcrumb } from './sentry';

export const PICKER_BREADCRUMB_CATEGORY = 'image-picker';
/** 포커스 시 회수 시도 시각(ms). 결과를 받으면 남은 시도는 취소한다. */
export const PENDING_RECOVERY_DELAYS_MS = [0, 1500, 4000] as const;

export type PickerSource = 'gallery' | 'camera' | 'focus' | 'reload';

function hasAssets(
  result: ImagePicker.ImagePickerResult | ImagePicker.ImagePickerErrorResult | null,
): result is ImagePicker.ImagePickerSuccessResult {
  return !!result && !('code' in result) && !result.canceled && !!result.assets?.length;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120);
}

type PendingRead = { result: ImagePicker.ImagePickerSuccessResult | null; errorMessage: string | null };

async function readPending(source: PickerSource): Promise<PendingRead> {
  try {
    const pending = await ImagePicker.getPendingResultAsync();
    if (pending && 'code' in pending) {
      addBreadcrumb(PICKER_BREADCRUMB_CATEGORY, 'pending-error', { source, code: pending.code });
      return { result: null, errorMessage: `${pending.code}: ${pending.message ?? ''}`.slice(0, 120) };
    }
    if (!hasAssets(pending)) return { result: null, errorMessage: null };
    addBreadcrumb(PICKER_BREADCRUMB_CATEGORY, 'pending-recovered', {
      source,
      count: pending.assets.length,
    });
    return { result: pending, errorMessage: null };
  } catch (error) {
    addBreadcrumb(PICKER_BREADCRUMB_CATEGORY, 'pending-failed', { source, error: errorName(error) });
    return { result: null, errorMessage: errorName(error) };
  }
}

/** Android 에 남은 피커 결과를 1회 회수한다. 없거나 실패면 null (절대 throw 하지 않음). */
export async function takePendingPickerResult(
  source: PickerSource,
): Promise<ImagePicker.ImagePickerSuccessResult | null> {
  if (Platform.OS !== 'android') return null;
  return (await readPending(source)).result;
}

/** 회수 시도 진단 — dev 콘솔 + breadcrumb 'recovery-attempt' (값은 개수·오류 문구만). */
function logAttempt(attempt: string, read: PendingRead): void {
  const assetsCount = read.result?.assets.length ?? 0;
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[picker-recovery]', attempt, !!read.result, assetsCount, read.errorMessage);
  }
  addBreadcrumb(PICKER_BREADCRUMB_CATEGORY, 'recovery-attempt', {
    attempt,
    hasResult: !!read.result,
    assetsCount,
    errorMessage: read.errorMessage,
  });
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
 * 포커스된 화면에서 pending 결과를 회수해 onRecovered 로 1회 넘긴다.
 * - 포커스 시 PENDING_RECOVERY_DELAYS_MS 시각에 시도, 포커스 중 AppState 'active' 전환마다 1회 추가.
 * - 결과를 받으면 남은 시도를 취소한다. 블러·언마운트 시 타이머·구독 정리.
 * - AppState 구독은 포커스 동안만 — 탭처럼 함께 마운트된 다른 화면이 결과를 먼저 가져가지 않게.
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
      // blurred: 블러·언마운트 뒤에는 아무것도 하지 않는다. 결과를 받으면 남은 타이머만 취소하고
      // AppState 계기는 포커스 동안 계속 둔다(같은 화면에서 다음 피커가 또 끊겨도 회수되게).
      let blurred = false;
      const timers: ReturnType<typeof setTimeout>[] = [];
      const clearTimers = () => {
        timers.forEach(clearTimeout);
        timers.length = 0;
      };
      const attempt = async (label: string) => {
        if (blurred) return;
        const read = await readPending('focus');
        logAttempt(label, read);
        if (!read.result || blurred) return;
        clearTimers();
        if (mountedRef.current) void handlerRef.current(read.result);
      };
      PENDING_RECOVERY_DELAYS_MS.forEach((delay, index) => {
        timers.push(setTimeout(() => void attempt(String(index + 1)), delay));
      });
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') void attempt('appstate');
      });
      return () => {
        blurred = true;
        clearTimers();
        sub.remove();
      };
    }, []),
  );
}
