import { useCallback } from 'react';
import { useNavigation, useRouter } from 'expo-router';
import { TABS_ROUTE_NAME, resolveHomeReturn } from '@src/utils/homeReturn';

/**
 * 홈으로 돌아가기(B-HOME-DUPLICATE-ON-REPLACE) — 스택 아래의 기존 (tabs) 까지 되돌리고, 없으면 교체한다.
 * 이 화면이 속한 스택(루트 Stack)의 경로 이름으로 판정한다(resolveHomeReturn).
 */
export function useReturnHome() {
  const router = useRouter();
  const navigation = useNavigation();
  return useCallback(() => {
    const names = (navigation.getState()?.routes ?? []).map((r) => r.name);
    if (resolveHomeReturn(names) === 'dismiss-to-tabs') router.dismissTo(`/${TABS_ROUTE_NAME}` as '/(tabs)');
    else router.replace(`/${TABS_ROUTE_NAME}` as '/(tabs)');
  }, [navigation, router]);
}
