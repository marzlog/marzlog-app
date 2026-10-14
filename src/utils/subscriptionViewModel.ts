/**
 * 설정 구독 화면 표시 모델 — 순수 함수 (RN/SDK 비의존). PAYWALL 명세 §3.3, 시안 04-subscription-settings.png.
 *
 * PW-1: Plus 여부는 서버 /auth/me plan 만 본다. plan_status·plan_store·plan_expires_at 은 표시용.
 * 문구는 i18n 키·파라미터로만 돌려준다. 날짜 문자열은 호출부가 주입한 formatDate(formatLongDate)로 만든다.
 * 체험 여부·월간/연간 구분은 /auth/me 에 없어 표시하지 않는다(W-AUTHME-PERIOD-FIELDS, Build 34 제외).
 */
import { FREE_STORAGE_GB, PLUS_STORAGE_GB } from '../constants/plus';
import type { PaywallOfferResult } from '../services/purchases';
import { formatBytes } from './formatBytes';
import type { TextRef } from './paywallViewModel';

export type DeviceStore = 'apple' | 'google' | null;

/** 현재 기기의 스토어 — iOS 는 App Store, Android 는 Google Play, 그 외(web)는 없음 */
export function deviceStoreOf(platform: string): DeviceStore {
  if (platform === 'ios') return 'apple';
  if (platform === 'android') return 'google';
  return null;
}

const STORE_NAME_KEYS: Record<'apple' | 'google', string> = {
  apple: 'subscription.storeApple',
  google: 'subscription.storeGoogle',
};

export interface SubscriptionVMInput {
  plan: string | null | undefined;
  planStatus: string | null | undefined;
  planStore: string | null | undefined;
  planExpiresAt: string | null | undefined;
  deviceStore: DeviceStore;
  /** 무료일 때만 조회한다. null = 아직 없음 */
  offerResult: PaywallOfferResult | null;
  /** /users/storage. null = 불러오는 중·실패 → 막대 영역 숨김 */
  storage: { used_bytes: number; limit_bytes: number; used_percentage: number } | null;
  formatDate: (iso: string) => string | null;
}

export type SubscriptionState = 'free' | 'active' | 'cancelled' | 'grace' | 'unknown';

export interface SubscriptionVM {
  state: SubscriptionState;
  planLabel: TextRef;
  /** 현재 플랜 아래 상태 줄(갱신일·해지 예약·결제 확인·날짜만) */
  statusLines: TextRef[];
  storage: { usage: TextRef; percent: number } | null;
  /** 무료일 때만. priceLine 은 상품 조회 성공 시에만 */
  plusCard: { title: TextRef; description: TextRef; priceLine: TextRef | null; cta: TextRef } | null;
  /** 스토어에서 구독 관리 행 — plan==='plus' && (plan_store 없음 || 현재 기기 스토어와 같음) */
  manageVisible: boolean;
  /** 다른 스토어에서 시작한 구독 안내({{store}} 는 storeNameKey 를 t() 한 값) */
  otherStore: { key: string; storeNameKey: string } | null;
  footnote: TextRef;
}

function knownStore(store: string | null | undefined): 'apple' | 'google' | null {
  return store === 'apple' || store === 'google' ? store : null;
}

export function resolveSubscriptionState(plan: unknown, planStatus: unknown): SubscriptionState {
  if (plan !== 'plus') return 'free';
  if (planStatus === 'active' || planStatus === 'cancelled' || planStatus === 'grace') return planStatus;
  // null·없음·여유 시간 안의 expired·알 수 없는 값 → 날짜만
  return 'unknown';
}

/** 관리 행 표시 조건(D6 판정 1) */
export function isManageVisible(plan: unknown, planStore: string | null | undefined, deviceStore: DeviceStore): boolean {
  if (plan !== 'plus') return false;
  const store = knownStore(planStore);
  return store === null || store === deviceStore;
}

export function buildSubscriptionVM(input: SubscriptionVMInput): SubscriptionVM {
  const state = resolveSubscriptionState(input.plan, input.planStatus);
  const isPlus = state !== 'free';
  const date = input.planExpiresAt ? input.formatDate(input.planExpiresAt) : null;

  const statusLines: TextRef[] = [];
  if (state === 'active' && date) statusLines.push({ key: 'subscription.renewsOn', params: { date } });
  if (state === 'cancelled' && date) statusLines.push({ key: 'subscription.cancelledUntil', params: { date } });
  if (state === 'grace') {
    statusLines.push({ key: 'subscription.graceNotice' });
    if (date) statusLines.push({ key: 'paywall.activeUntil', params: { date } });
  }
  if (state === 'unknown' && date) statusLines.push({ key: 'paywall.activeUntil', params: { date } });

  const offer = input.offerResult?.status === 'ok' ? input.offerResult.offer : null;
  const plusCard = isPlus
    ? null
    : {
        title: { key: 'paywall.brand' },
        description: { key: 'paywall.subhead', params: { gb: PLUS_STORAGE_GB } },
        priceLine: offer
          ? { key: 'subscription.plusCardPrice', params: { monthly: offer.monthly.priceString, annual: offer.annual.priceString } }
          : null,
        cta: { key: 'subscription.cta' },
      };

  const store = knownStore(input.planStore);
  const otherStore =
    isPlus && store !== null && store !== input.deviceStore
      ? { key: 'subscription.otherStore', storeNameKey: STORE_NAME_KEYS[store] }
      : null;

  return {
    state,
    planLabel: { key: isPlus ? 'subscription.planPlus' : 'subscription.planFree' },
    statusLines,
    storage: input.storage
      ? {
          usage: {
            key: 'subscription.usage',
            params: { used: formatBytes(input.storage.used_bytes), limit: formatBytes(input.storage.limit_bytes) },
          },
          percent: Math.min(Math.max(input.storage.used_percentage, 0), 100),
        }
      : null,
    plusCard,
    manageVisible: isManageVisible(input.plan, input.planStore, input.deviceStore),
    otherStore,
    footnote: { key: 'subscription.footnote', params: { gb: FREE_STORAGE_GB } },
  };
}
