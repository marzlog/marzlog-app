/**
 * 구독 시작 완료 화면 표시 모델 — 순수 함수 (RN/SDK 비의존). PAYWALL 명세 §3.2, 시안 03-success.png.
 *
 * 변형: trial-started(체험 시작) / charged(바로 결제) / pending(반영 중) / basic(파라미터 없음·오형식 — 표 없이).
 * pending(D5-b-2): 결제·복원 후 30초 안에 서버 반영이 확인되지 않은 상태. 안내 + 구매 복원 + 닫기.
 *   결제 화면 구매 → reflected=0 파라미터, 결제 화면 복원 → restore=1 파라미터(복원 확인 안내부터 시작).
 * 문구는 i18n 키·파라미터로만 돌려준다. 날짜 문자열은 호출부가 주입한 formatDate 로 만든다.
 */
import { PLUS_STORAGE_GB } from '../constants/plus';
import type { TextRef } from './paywallViewModel';

export type PlusSuccessKind = 'annual' | 'monthly';

export interface PlusSuccessParams {
  kind: PlusSuccessKind;
  trial: boolean;
  price: string;
  reflected: boolean;
}

/** 라우트 파라미터 → 검증된 값. 하나라도 없거나 형식이 틀리면 null(안전한 기본 화면). */
export function parsePlusSuccessParams(raw: Record<string, unknown>): PlusSuccessParams | null {
  const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);
  const kind = one(raw.kind);
  const trial = one(raw.trial);
  const price = one(raw.price);
  const reflected = one(raw.reflected);
  if (kind !== 'annual' && kind !== 'monthly') return null;
  if (trial !== '1' && trial !== '0') return null;
  if (reflected !== '1' && reflected !== '0') return null;
  if (typeof price !== 'string' || price.trim() === '') return null;
  return { kind, trial: trial === '1', price, reflected: reflected === '1' };
}

/** 결제 화면 → 완료 화면 이동 파라미터(문자열) */
export function toPlusSuccessRouteParams(p: PlusSuccessParams): Record<string, string> {
  return { kind: p.kind, trial: p.trial ? '1' : '0', price: p.price, reflected: p.reflected ? '1' : '0' };
}

/** 결제 화면 복원 후 30초 안에 미반영 → 완료 화면 pending(복원 확인 안내)으로 보내는 파라미터 */
export const PLUS_SUCCESS_RESTORE_PARAMS: Record<string, string> = { restore: '1' };

export interface PlusSuccessEntry {
  params: PlusSuccessParams | null;
  /** 결제 화면 복원에서 왔다(구매 파라미터 없음) */
  fromRestore: boolean;
}

export function parsePlusSuccessEntry(raw: Record<string, unknown>): PlusSuccessEntry {
  const restore = Array.isArray(raw.restore) ? raw.restore[0] : raw.restore;
  return { params: parsePlusSuccessParams(raw), fromRestore: restore === '1' };
}

/**
 * 반영 중 화면의 복원 진행 단계.
 *  - idle: 안내만 / restoring: 복원·반영 확인 중(버튼 스피너, 닫기 잠금)
 *  - restore-checked: 활성 구독 있음, 30초 안에 미반영 / restore-none: RC 에 활성 구독 없음
 *  - restore-failed: 복원 호출 실패 / identity-mismatch: 신원 대조 차단(D5-b-3)
 */
export type PlusPendingPhase = 'idle' | 'restoring' | 'restore-checked' | 'restore-none' | 'restore-failed' | 'identity-mismatch';

export interface PlusPendingVM {
  notice: TextRef | null;
  restore: { enabled: boolean; loading: boolean };
  closeEnabled: boolean;
}

const PENDING_NOTICE: Record<PlusPendingPhase, TextRef | null> = {
  idle: null,
  restoring: null,
  'restore-checked': { key: 'plusSuccess.restoreChecked' },
  'restore-none': { key: 'paywall.restoreNone' },
  'restore-failed': { key: 'plusSuccess.restoreFailed' },
  'identity-mismatch': { key: 'plusSuccess.identityMismatch' },
};

export function buildPlusPendingVM(phase: PlusPendingPhase): PlusPendingVM {
  const busy = phase === 'restoring';
  return { notice: PENDING_NOTICE[phase], restore: { enabled: !busy, loading: busy }, closeEnabled: !busy };
}

/** 첫 단계 — 결제 화면 복원에서 왔으면 "구매 내역을 확인했어요" 안내부터 */
export function initialPendingPhase(fromRestore: boolean): PlusPendingPhase {
  return fromRestore ? 'restore-checked' : 'idle';
}

export type PlusSuccessVariant = 'trial-started' | 'charged' | 'pending' | 'basic';

export interface PlusSuccessRow {
  label: TextRef;
  /** 문구 키 또는 그대로 보여줄 문자열(날짜) */
  value: TextRef | string;
}

export interface PlusSuccessVM {
  variant: PlusSuccessVariant;
  /** check = 시작됨, time = 반영 중 */
  icon: 'check' | 'time';
  title: TextRef;
  body: TextRef;
  rows: PlusSuccessRow[];
  note: TextRef | null;
  /** pending 변형에서만 — 안내·구매 복원·닫기 */
  pending: PlusPendingVM | null;
}

export interface PlusSuccessVMInput {
  params: PlusSuccessParams | null;
  /** 결제 화면 복원에서 왔다(params 없음) */
  fromRestore?: boolean;
  pendingPhase?: PlusPendingPhase;
  /** 서버 plan === 'plus' (진입 후 재조회로 바뀔 수 있다) */
  isPlus: boolean;
  /** 서버 plan_expires_at — 체험 종료·다음 결제 날짜 */
  planExpiresAt: string | null | undefined;
  formatDate: (iso: string) => string | null;
}

const TITLE: TextRef = { key: 'plusSuccess.title' };
const BODY: TextRef = { key: 'plusSuccess.body', params: { gb: PLUS_STORAGE_GB } };

const BASE = { icon: 'check' as const, pending: null };

export function buildPlusSuccessVM({
  params,
  fromRestore = false,
  pendingPhase = 'idle',
  isPlus,
  planExpiresAt,
  formatDate,
}: PlusSuccessVMInput): PlusSuccessVM {
  // 결제 화면에서 미반영으로 넘어왔어도, 이후 재조회(복귀·복원)로 plus 가 확인되면 반영 변형으로 바뀐다
  const reflected = isPlus || (params?.reflected ?? !fromRestore);
  if (!reflected) {
    return {
      variant: 'pending',
      icon: 'time',
      title: { key: 'plusSuccess.pendingTitle' },
      body: { key: 'plusSuccess.pending' },
      rows: [],
      note: null,
      pending: buildPlusPendingVM(pendingPhase),
    };
  }

  if (!params) return { ...BASE, variant: 'basic', title: TITLE, body: BODY, rows: [], note: null };

  const date = planExpiresAt ? formatDate(planExpiresAt) : null;
  const rows: PlusSuccessRow[] = [
    { label: { key: 'plusSuccess.plan' }, value: { key: params.kind === 'annual' ? 'plusSuccess.planAnnual' : 'plusSuccess.planMonthly' } },
  ];

  if (params.trial) {
    // 체험 중 plan_expires_at = 체험 종료 시각(명세 가정 A2) = 첫 결제일
    if (date) {
      rows.push({ label: { key: 'plusSuccess.trialEnds' }, value: date });
      rows.push({ label: { key: 'plusSuccess.firstCharge' }, value: { key: 'plusSuccess.chargeValue', params: { date, price: params.price } } });
    }
    return { ...BASE, variant: 'trial-started', title: TITLE, body: BODY, rows, note: { key: 'plusSuccess.noteTrial' } };
  }

  if (date) {
    rows.push({ label: { key: 'plusSuccess.nextCharge' }, value: { key: 'plusSuccess.chargeValue', params: { date, price: params.price } } });
  }
  return { ...BASE, variant: 'charged', title: TITLE, body: BODY, rows, note: { key: 'plusSuccess.note' } };
}

export type PlusSuccessGuard = 'render-nothing' | 'go-home' | 'render';

/**
 * 진입 가드 — 미인증이면 아무것도 그리지 않는다(루트가 로그인으로 보낸다).
 * 파라미터 없이 들어왔는데 서버 plan 이 plus 가 아니면 홈으로 replace.
 * hasParams 는 구매 파라미터 또는 복원 진입(restore=1)이 있으면 true.
 */
export function resolvePlusSuccessGuard(input: { isAuthenticated: boolean; hasParams: boolean; isPlus: boolean }): PlusSuccessGuard {
  if (!input.isAuthenticated) return 'render-nothing';
  if (!input.hasParams && !input.isPlus) return 'go-home';
  return 'render';
}
