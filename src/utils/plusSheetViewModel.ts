/**
 * Plus 안내 시트 표시 모델 — 순수 함수 (RN/SDK 비의존). PAYWALL 명세 §3.4, 시안 02-regen-gate·05-storage-full.
 *
 * 문구는 i18n 키·파라미터로만 돌려준다. Plus 여부는 서버 /auth/me plan(PW-1)으로 호출부가 넘긴다.
 *  - regen: 재생성 제한. 체험 줄은 상품 조회가 끝나 eligible === true 일 때만(조회 전에는 줄 없이 먼저 띄운다)
 *  - storage(무료): 용량 초과 → Plus 알아보기 / 다음에 할게요
 *  - storage(Plus): 정리 안내, 결제 유도 없이 "확인" 하나
 */
import { PLUS_STORAGE_GB } from '../constants/plus';
import type { PaywallOfferResult, PaywallTrial } from '../services/purchases';
import { formatBytes } from './formatBytes';
import type { TextRef } from './paywallViewModel';

export type PlusSheetVariant = 'regen' | 'storage';

/** 413 본문의 사용량·한도. 값이 없으면 null → 숫자 줄 숨김 */
export interface QuotaUsage {
  usedBytes: number;
  limitBytes: number;
}

export type PlusSheetRequest = { variant: 'regen' } | { variant: 'storage'; usage: QuotaUsage | null };

export interface PlusSheetVM {
  brand: TextRef;
  title: TextRef;
  body: TextRef;
  trialNote: TextRef | null;
  usage: { label: TextRef; value: TextRef; percent: number } | null;
  /** paywall = 시트 닫고 /paywall?source=… · close = 닫기만 */
  primary: { label: TextRef; action: 'paywall' | 'close' };
  /** "다음에 할게요" — Plus 정리 안내에는 없다 */
  secondary: TextRef | null;
  /** /paywall 의 source(기록용) */
  source: PlusSheetVariant;
}

/** 시트의 체험 줄 근거 — 결제 화면 기본 선택과 같은 연간 플랜. 조회 전·실패면 null */
export function sheetTrialFromOffer(offerResult: PaywallOfferResult | null): PaywallTrial | null {
  return offerResult?.status === 'ok' ? offerResult.offer.annual.trial : null;
}

function trialNote(trial: PaywallTrial | null): TextRef | null {
  if (trial?.eligible !== true) return null;
  return trial.days !== null ? { key: 'plusSheet.trialNote', params: { days: trial.days } } : { key: 'plusSheet.trialNoteGeneric' };
}

export function buildUpsellSheetVM(input: {
  request: PlusSheetRequest;
  isPlus: boolean;
  trial: PaywallTrial | null;
}): PlusSheetVM {
  const { request, isPlus } = input;
  const brand: TextRef = { key: 'paywall.brand' };
  const upsell = { primary: { label: { key: 'plusSheet.cta' }, action: 'paywall' as const }, secondary: { key: 'plusSheet.later' } };

  if (request.variant === 'regen') {
    return {
      brand,
      title: { key: 'plusSheet.regenTitle' },
      body: { key: 'plusSheet.regenBody', params: { gb: PLUS_STORAGE_GB } },
      trialNote: trialNote(input.trial),
      usage: null,
      ...upsell,
      source: 'regen',
    };
  }

  const usage =
    request.usage && request.usage.limitBytes > 0
      ? {
          label: { key: 'plusSheet.storageLabel' },
          value: {
            key: 'plusSheet.usage',
            params: { used: formatBytes(request.usage.usedBytes), limit: formatBytes(request.usage.limitBytes) },
          },
          percent: Math.min(Math.max((request.usage.usedBytes / request.usage.limitBytes) * 100, 0), 100),
        }
      : null;

  if (isPlus) {
    return {
      brand,
      title: { key: 'plusSheet.storageTitle' },
      body: { key: 'plusSheet.storageBodyPlus', params: { gb: PLUS_STORAGE_GB } },
      trialNote: null,
      usage,
      primary: { label: { key: 'plusSheet.confirm' }, action: 'close' },
      secondary: null,
      source: 'storage',
    };
  }

  return {
    brand,
    title: { key: 'plusSheet.storageTitle' },
    body: { key: 'plusSheet.storageBody', params: { gb: PLUS_STORAGE_GB } },
    trialNote: null,
    usage,
    ...upsell,
    source: 'storage',
  };
}
