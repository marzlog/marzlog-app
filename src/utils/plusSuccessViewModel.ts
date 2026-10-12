/**
 * 구독 시작 완료 화면 표시 모델 — 순수 함수 (RN/SDK 비의존). PAYWALL 명세 §3.2, 시안 03-success.png.
 *
 * 변형: trial-started(체험 시작) / charged(바로 결제) / pending(반영 중) / basic(파라미터 없음·오형식 — 표 없이).
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

export type PlusSuccessVariant = 'trial-started' | 'charged' | 'pending' | 'basic';

export interface PlusSuccessRow {
  label: TextRef;
  /** 문구 키 또는 그대로 보여줄 문자열(날짜) */
  value: TextRef | string;
}

export interface PlusSuccessVM {
  variant: PlusSuccessVariant;
  title: TextRef;
  body: TextRef;
  rows: PlusSuccessRow[];
  note: TextRef | null;
}

export interface PlusSuccessVMInput {
  params: PlusSuccessParams | null;
  /** 서버 plan === 'plus' (진입 후 재조회로 바뀔 수 있다) */
  isPlus: boolean;
  /** 서버 plan_expires_at — 체험 종료·다음 결제 날짜 */
  planExpiresAt: string | null | undefined;
  formatDate: (iso: string) => string | null;
}

const TITLE: TextRef = { key: 'plusSuccess.title' };
const BODY: TextRef = { key: 'plusSuccess.body', params: { gb: PLUS_STORAGE_GB } };

export function buildPlusSuccessVM({ params, isPlus, planExpiresAt, formatDate }: PlusSuccessVMInput): PlusSuccessVM {
  if (!params) return { variant: 'basic', title: TITLE, body: BODY, rows: [], note: null };

  // 결제 화면에서 미반영으로 넘어왔어도, 이후 재조회로 plus 가 확인되면 반영 변형으로 바뀐다
  const reflected = params.reflected || isPlus;
  if (!reflected) {
    return { variant: 'pending', title: TITLE, body: { key: 'plusSuccess.pending' }, rows: [], note: null };
  }

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
    return { variant: 'trial-started', title: TITLE, body: BODY, rows, note: { key: 'plusSuccess.noteTrial' } };
  }

  if (date) {
    rows.push({ label: { key: 'plusSuccess.nextCharge' }, value: { key: 'plusSuccess.chargeValue', params: { date, price: params.price } } });
  }
  return { variant: 'charged', title: TITLE, body: BODY, rows, note: { key: 'plusSuccess.note' } };
}

export type PlusSuccessGuard = 'render-nothing' | 'go-home' | 'render';

/**
 * 진입 가드 — 미인증이면 아무것도 그리지 않는다(루트가 로그인으로 보낸다).
 * 파라미터 없이 들어왔는데 서버 plan 이 plus 가 아니면 홈으로 replace.
 */
export function resolvePlusSuccessGuard(input: { isAuthenticated: boolean; hasParams: boolean; isPlus: boolean }): PlusSuccessGuard {
  if (!input.isAuthenticated) return 'render-nothing';
  if (!input.hasParams && !input.isPlus) return 'go-home';
  return 'render';
}
