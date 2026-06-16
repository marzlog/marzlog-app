import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

/**
 * 네트워크 복구(offline→online) 시 onRecover를 1회 호출하는 훅.
 *
 * - wasOfflineRef로 "직전 offline" 여부를 기억해 online 복귀 전환 엣지에서만 실행
 *   (online 상태가 유지되는 동안 매 이벤트마다 재호출하지 않음).
 * - cbRef로 최신 콜백을 유지 → deps []로 리스너를 1회만 구독(재구독 방지).
 * - Platform.OS === 'web'에서는 no-op.
 */
export function useNetworkResume(onRecover: () => void): void {
  const wasOfflineRef = useRef(false);
  const cbRef = useRef(onRecover);
  cbRef.current = onRecover;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online =
        state.isConnected === true &&
        (state.isInternetReachable === true || state.isInternetReachable === null);
      if (wasOfflineRef.current && online) {
        wasOfflineRef.current = false;
        cbRef.current();
      } else if (!online) {
        wasOfflineRef.current = true;
      }
    });
    return () => unsubscribe();
  }, []);
}

export default useNetworkResume;
