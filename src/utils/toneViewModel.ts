/**
 * 문체(톤) 선택 판정·표시 — 순수 함수 (RN 비의존, 단위 테스트 대상). D10-c.
 *
 * - 시트(ToneSheet): 3카드 표시값(라벨·설명·현재 기본·선택·Plus 잠금)
 * - 재생성: Plus·비복구·문체 UI 언어면 시트, 그 외는 기존 흐름(tone 미전송 → 서버가 기본 톤)
 * - 설정 기본 문체: Free 가 sincere 외를 고르면 저장하지 않고 Plus 안내
 * - 상세 라벨: sincere·없음·vi/th 는 표시하지 않음
 */
import type { SupportedLocale } from '../i18n';
import { DIARY_TONES, isDiaryTone, isFreeTone, isToneUiEnabled, resolveDiaryTone, type DiaryTone } from '../constants/diaryTones';
import type { TextRef } from './paywallViewModel';

export const TONE_LABEL_KEYS: Record<DiaryTone, string> = {
  sincere: 'tone.sincere',
  literary: 'tone.literary',
  plain: 'tone.plain',
};

export const TONE_DESC_KEYS: Record<DiaryTone, string> = {
  sincere: 'tone.sincereDesc',
  literary: 'tone.literaryDesc',
  plain: 'tone.plainDesc',
};

export interface ToneCardVM {
  tone: DiaryTone;
  label: TextRef;
  description: TextRef;
  /** 사용자 기본 문체(users.diary_tone) — "기본" 표시 */
  isDefault: boolean;
  selected: boolean;
  /** Free 에게 Plus 문체 — "Plus" 표시(고르면 저장 대신 안내) */
  locked: boolean;
}

export interface ToneSheetVM {
  cards: ToneCardVM[];
}

export function buildToneSheetVM(input: {
  defaultTone: unknown;
  selected: DiaryTone;
  isPlus: boolean;
  /** 잠금 표시 여부 — 설정은 true, 재생성(Plus 만 시트를 연다)은 false */
  showLocks: boolean;
}): ToneSheetVM {
  const defaultTone = resolveDiaryTone(input.defaultTone);
  return {
    cards: DIARY_TONES.map((tone) => ({
      tone,
      label: { key: TONE_LABEL_KEYS[tone] },
      description: { key: TONE_DESC_KEYS[tone] },
      isDefault: tone === defaultTone,
      selected: tone === input.selected,
      locked: input.showLocks && !input.isPlus && !isFreeTone(tone),
    })),
  };
}

export type RegenToneFlow = 'tone-sheet' | 'direct';

/**
 * 재생성 게이트(resolveRegenAction)를 통과한 뒤 — 문체 시트를 띄울지.
 * 실패 복구 재생성은 시트 없이 기존대로(서버도 복구는 기본 톤 강제), Free 는 여기 오기 전에 안내 시트.
 */
export function resolveRegenToneFlow(input: { isPlus: boolean; isRecovery: boolean; lang: SupportedLocale | null | undefined }): RegenToneFlow {
  if (input.isRecovery || !input.isPlus || !isToneUiEnabled(input.lang)) return 'direct';
  return 'tone-sheet';
}

export type SettingsToneChange = 'save' | 'upsell' | 'noop';

/** 설정 기본 문체 선택 결과 — 같은 값이면 noop, Free 의 Plus 문체는 upsell(변경 안 함) */
export function resolveSettingsToneChange(input: { current: unknown; next: DiaryTone; isPlus: boolean }): SettingsToneChange {
  if (resolveDiaryTone(input.current) === input.next) return 'noop';
  if (!input.isPlus && !isFreeTone(input.next)) return 'upsell';
  return 'save';
}

/** 결제 화면 비교표 "문체 선택" 행 — ko/en 만(vi/th 는 문체 UI·혜택 문구 모두 없음) */
export function showToneRow(lang: SupportedLocale | null | undefined): boolean {
  return isToneUiEnabled(lang);
}

/**
 * 상세 "문체: 문학적" 라벨 — sincere·값 없음·허용 밖·문체 UI 미지원 언어면 null.
 * 화면은 t(key, { tone: t(toneKey) }) 로 그린다(t 는 런타임 호출만, 명세 §5).
 */
export function toneDetailLabel(tone: unknown, lang: SupportedLocale | null | undefined): { key: string; toneKey: string } | null {
  if (!isToneUiEnabled(lang) || !isDiaryTone(tone) || isFreeTone(tone)) return null;
  return { key: 'mediaDetail.toneLabel', toneKey: TONE_LABEL_KEYS[tone] };
}
