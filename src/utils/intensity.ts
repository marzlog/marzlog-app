/**
 * 감정 강도(intensity) 표기 유틸
 *
 * 척도는 백엔드 마이그레이션 021에서 1-5 → 1-10 으로 확장됐다(구 값 ×2).
 * 5-6 은 '보통' 구간이라 부사를 붙이지 않고 감정어만 노출한다.
 */

/**
 * intensity 값에 대응하는 부사 i18n 키를 돌려준다.
 * 범위 밖(0, 11+)·falsy·비정수 잡값은 null — 호출부는 부사를 숨기고 감정어만 쓴다.
 */
export function intensityAdverbKey(v: number): string | null {
  if (!v || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  if (n < 1 || n > 10) return null;
  if (n <= 2) return 'mediaDetail.intensitySlight';   // 1-2  살짝
  if (n <= 4) return 'mediaDetail.intensityALittle';  // 3-4  약간
  if (n <= 6) return null;                            // 5-6  부사 없음
  if (n <= 8) return 'mediaDetail.intensityQuite';    // 7-8  꽤
  return 'mediaDetail.intensityVery';                 // 9-10 매우
}

export default intensityAdverbKey;
