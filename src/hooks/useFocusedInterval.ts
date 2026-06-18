/**
 * Dan Abramov useInterval 패턴 + @react-navigation useIsFocused 통합.
 *
 * 동작:
 * - delay=null → polling 비활성
 * - delay=number + isFocused=true → setInterval 등록
 * - delay 또는 isFocused 변화 → 자동 재등록/해제
 * - callback은 ref로 최신 유지 (stale closure 회피)
 * - 화면 unfocus 시 자동 cleanup (메모리 누수 무관)
 *
 * 참고: https://overreacted.io/making-setinterval-declarative-with-react-hooks/
 *
 * B-DK fix(2026-06-18): 홈 'AI 분석중' 무한 표시 race condition 회피.
 * 옵션 B의 useFocusEffect 안 setInterval 등록은 hasPendingAnalysisRef stale로 실패.
 * useInterval은 delay state 변화로 자동 등록되어 race 회피.
 */
import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';

export function useFocusedInterval(
  callback: () => void,
  delay: number | null,
): void {
  const savedCallback = useRef(callback);
  const isFocused = useIsFocused();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null || !isFocused) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay, isFocused]);
}
