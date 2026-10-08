/**
 * 부트 라우트 판정 (B-HOME-PREMOUNT).
 *
 * app/_layout.tsx 의 이동 effect 분기를 순수 함수로 옮긴 것 — 결과는 기존 분기와 같다.
 *  - 준비 전(폰트·init·온보딩 플래그 미확정) → pending
 *  - 인증됨: app_lang 미선택이면 language-select, 아니면 tabs
 *  - 미인증 + 인증 확인 보류(Keychain 잠금·오프라인 등) → deferred(보류 화면, Stack 미마운트)
 *  - 미인증: 온보딩 미완료면 onboarding, 아니면 login
 *
 * 스플래시는 판정된 화면에 도착한 뒤에 내린다(isBootRouteReached) — 홈 선노출 방지.
 * RN·Expo 모듈에 의존하지 않는다.
 */

export type BootRoute = 'pending' | 'deferred' | 'tabs' | 'language-select' | 'onboarding' | 'login';

/** 이동 대상 경로(replace 대상만) */
export const BOOT_ROUTE_PATHS = {
  'language-select': '/language-select?from=login',
  onboarding: '/onboarding',
  login: '/login',
} as const;

type BootUser = { app_lang?: string | null } | null | undefined;

export interface BootState {
  /** 폰트 로드 + init 완료(loaded && initialReady) */
  ready: boolean;
  /** null = 아직 읽지 않음 */
  onboardingCompleted: boolean | null;
  isAuthenticated: boolean;
  authCheckDeferred: boolean;
  user: BootUser;
}

function needsLanguageSelect(user: BootUser): boolean {
  return !!user && (user.app_lang === null || user.app_lang === undefined);
}

export function resolveBootRoute(state: BootState): BootRoute {
  if (!state.ready || state.onboardingCompleted === null) return 'pending';
  if (state.isAuthenticated) {
    return needsLanguageSelect(state.user) ? 'language-select' : 'tabs';
  }
  // Keychain·네트워크 보류 중에는 "미인증"이 확정이 아니다 — 이동하지 않고 보류 화면
  if (state.authCheckDeferred) return 'deferred';
  return state.onboardingCompleted ? 'login' : 'onboarding';
}

/** (tabs) 를 그려도 되는지 — 판정이 tabs 일 때만(인증됨 + 언어 선택 완료) */
export function canShowTabs(isAuthenticated: boolean, user: BootUser): boolean {
  return isAuthenticated && !needsLanguageSelect(user);
}

/**
 * 판정된 화면에 도착했는지(스플래시를 내려도 되는지).
 *  - pending: 아직 아님
 *  - deferred: 보류 화면은 Stack 없이 바로 그려진다
 *  - tabs: 인증 사용자 — 시작 경로 그대로(딥링크 /paywall 등 포함)
 *  - 그 외: 해당 경로에 도착했을 때
 */
export function isBootRouteReached(target: BootRoute, pathname: string): boolean {
  switch (target) {
    case 'pending':
      return false;
    case 'deferred':
    case 'tabs':
      return true;
    case 'language-select':
      return pathname.startsWith('/language-select');
    case 'onboarding':
      return pathname.startsWith('/onboarding');
    case 'login':
      return pathname.startsWith('/login');
  }
}
