/**
 * 디바이스 OCR 래퍼.
 *
 * 라이브러리: @react-native-ml-kit/text-recognition v2.0.0
 *   - iOS/Android 공통: Google ML Kit Text Recognition
 *   - 한국어 모듈: TextRecognitionKorean 8.0.0
 *   - 온디바이스 처리, 외부 서버 호출 없음
 *
 * 입력: 이미지 URL (https://, file://)
 * 출력: { status, text, ... } - 백엔드 PATCH /media/{id}/ocr 페이로드와 호환
 *
 * 50KB 컷: 백엔드 OcrUpdateRequest UTF-8 50KB 한도 안전망.
 * 한국어 50KB ≈ 12,500자라 사진 1장에서 도달 사실상 불가.
 */
import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';

const OCR_TEXT_BYTE_LIMIT = 50_000;

export type DeviceOcrResult =
  | { status: 'done'; text: string; truncated: boolean }
  | { status: 'no_text'; text: '' }
  | { status: 'failed'; error: Error };

export async function runDeviceOcr(imageUri: string): Promise<DeviceOcrResult> {
  try {
    const result = await TextRecognition.recognize(imageUri, TextRecognitionScript.KOREAN);
    const rawText = (result?.text ?? '').trim();

    if (rawText.length === 0) {
      return { status: 'no_text', text: '' };
    }

    const { text, truncated } = truncateUtf8(rawText, OCR_TEXT_BYTE_LIMIT);
    return { status: 'done', text, truncated };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * UTF-8 바이트 한도로 트렁케이트 (한글 경계 보존).
 */
function truncateUtf8(text: string, byteLimit: number): { text: string; truncated: boolean } {
  const encoded = new TextEncoder().encode(text);
  if (encoded.byteLength <= byteLimit) {
    return { text, truncated: false };
  }

  const decoder = new TextDecoder('utf-8', { fatal: false });
  let cut = byteLimit;
  while (cut > 0) {
    const slice = encoded.subarray(0, cut);
    const decoded = decoder.decode(slice);
    const reencoded = new TextEncoder().encode(decoded);
    if (reencoded.byteLength <= cut) {
      return { text: decoded, truncated: true };
    }
    cut -= 1;
  }
  return { text: '', truncated: true };
}
