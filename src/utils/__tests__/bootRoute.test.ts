/**
 * bootRoute 단위 테스트 (B-HOME-PREMOUNT)
 *
 * 불변식:
 *  - resolveBootRoute 는 기존 app/_layout.tsx 이동 effect(e24e5a1 기준 326-350행)와 같은 결과를 낸다.
 *  - 스플래시는 판정된 화면에 도착한 뒤에만 내린다(isBootRouteReached).
 *  - (tabs) 는 인증됨 + 언어 선택 완료일 때만 그린다(canShowTabs).
 */
import { canShowTabs, isBootRouteReached, resolveBootRoute, type BootState } from '../bootRoute';

const LANG_SET = { app_lang: 'ko' };
const LANG_NULL = { app_lang: null };
const LANG_MISSING = {};

function state(overrides: Partial<BootState>): BootState {
  return {
    ready: true,
    onboardingCompleted: true,
    isAuthenticated: false,
    authCheckDeferred: false,
    user: null,
    ...overrides,
  };
}

/**
 * 기존 이동 effect 분기의 복제(e24e5a1 app/_layout.tsx 326-350) — 결과 동치 확인용.
 * 'replace:<경로>' | 'none' 으로 행동을 기록한다(language-select 재진입 가드는 pathname 의존이라 제외).
 */
function legacyEffect(s: BootState): string {
  if (!s.ready || s.onboardingCompleted === null) return 'none';
  if (s.isAuthenticated) {
    const u = s.user;
    if (u && (u.app_lang === null || u.app_lang === undefined)) return 'replace:/language-select?from=login';
    return 'none';
  }
  if (s.authCheckDeferred) return 'none';
  return s.onboardingCompleted ? 'replace:/login' : 'replace:/onboarding';
}

function newEffect(s: BootState): string {
  const target = resolveBootRoute(s);
  if (target === 'language-select') return 'replace:/language-select?from=login';
  if (target === 'onboarding') return 'replace:/onboarding';
  if (target === 'login') return 'replace:/login';
  return 'none';
}

describe('resolveBootRoute', () => {
  it('미인증 + 온보딩 미완료 → onboarding', () => {
    expect(resolveBootRoute(state({ onboardingCompleted: false }))).toBe('onboarding');
  });

  it('미인증 + 온보딩 완료 → login', () => {
    expect(resolveBootRoute(state({ onboardingCompleted: true }))).toBe('login');
  });

  it('인증 + app_lang 선택됨 → tabs (온보딩 플래그와 무관)', () => {
    expect(resolveBootRoute(state({ isAuthenticated: true, user: LANG_SET }))).toBe('tabs');
    expect(resolveBootRoute(state({ isAuthenticated: true, user: LANG_SET, onboardingCompleted: false }))).toBe('tabs');
  });

  it('인증 + app_lang 미선택(null·없음) → language-select', () => {
    expect(resolveBootRoute(state({ isAuthenticated: true, user: LANG_NULL }))).toBe('language-select');
    expect(resolveBootRoute(state({ isAuthenticated: true, user: LANG_MISSING }))).toBe('language-select');
  });

  it('인증 + user 아직 없음 → tabs (기존 분기와 같음)', () => {
    expect(resolveBootRoute(state({ isAuthenticated: true, user: null }))).toBe('tabs');
  });

  it('미인증 + 보류 → deferred (온보딩 여부와 무관, 이동 없음)', () => {
    expect(resolveBootRoute(state({ authCheckDeferred: true }))).toBe('deferred');
    expect(resolveBootRoute(state({ authCheckDeferred: true, onboardingCompleted: false }))).toBe('deferred');
  });

  it('인증이 보류보다 우선 — 인증 + 보류 → tabs', () => {
    expect(resolveBootRoute(state({ isAuthenticated: true, authCheckDeferred: true, user: LANG_SET }))).toBe('tabs');
  });

  it('준비 전(ready=false 또는 온보딩 플래그 미확정) → pending', () => {
    expect(resolveBootRoute(state({ ready: false }))).toBe('pending');
    expect(resolveBootRoute(state({ onboardingCompleted: null }))).toBe('pending');
    expect(resolveBootRoute(state({ ready: false, isAuthenticated: true, user: LANG_SET }))).toBe('pending');
  });

  it('모든 입력 조합에서 기존 이동 effect 와 같은 행동', () => {
    const bools = [true, false];
    for (const ready of bools)
      for (const onboardingCompleted of [true, false, null])
        for (const isAuthenticated of bools)
          for (const authCheckDeferred of bools)
            for (const user of [null, LANG_SET, LANG_NULL, LANG_MISSING]) {
              const s: BootState = { ready, onboardingCompleted, isAuthenticated, authCheckDeferred, user };
              expect([s, newEffect(s)]).toEqual([s, legacyEffect(s)]);
            }
  });
});

describe('isBootRouteReached', () => {
  it('pending 은 어디서도 도착 아님', () => {
    expect(isBootRouteReached('pending', '/')).toBe(false);
    expect(isBootRouteReached('pending', '/login')).toBe(false);
  });

  it('deferred·tabs 는 즉시 도착(보류 화면은 Stack 없이, 인증 사용자는 시작 경로 그대로)', () => {
    expect(isBootRouteReached('deferred', '/')).toBe(true);
    expect(isBootRouteReached('tabs', '/')).toBe(true);
  });

  it('딥링크 /paywall: 인증(tabs)이면 바로 도착, 미인증(login)이면 /login 에 도착해야', () => {
    expect(isBootRouteReached('tabs', '/paywall')).toBe(true);
    expect(isBootRouteReached('login', '/paywall')).toBe(false);
    expect(isBootRouteReached('login', '/login')).toBe(true);
  });

  it('미인증 시작 경로(/ = 홈)에서는 도착 아님 — 홈 위에서 스플래시를 내리지 않는다', () => {
    expect(isBootRouteReached('onboarding', '/')).toBe(false);
    expect(isBootRouteReached('login', '/')).toBe(false);
    expect(isBootRouteReached('language-select', '/')).toBe(false);
  });

  it('해당 경로에 도착하면 참', () => {
    expect(isBootRouteReached('onboarding', '/onboarding')).toBe(true);
    expect(isBootRouteReached('login', '/login')).toBe(true);
    expect(isBootRouteReached('language-select', '/language-select')).toBe(true);
  });
});

describe('canShowTabs (4조합)', () => {
  it.each<[boolean, { app_lang?: string | null }, boolean]>([
    [true, LANG_SET, true],
    [true, LANG_NULL, false],
    [false, LANG_SET, false],
    [false, LANG_NULL, false],
  ])('인증=%s, user=%j → %s', (isAuthenticated, user, expected) => {
    expect(canShowTabs(isAuthenticated, user)).toBe(expected);
  });

  it('resolveBootRoute 가 tabs 일 때와 같은 조건(인증됨 기준)', () => {
    for (const user of [null, LANG_SET, LANG_NULL, LANG_MISSING]) {
      const target = resolveBootRoute(state({ isAuthenticated: true, user }));
      expect(canShowTabs(true, user)).toBe(target === 'tabs');
    }
  });
});
