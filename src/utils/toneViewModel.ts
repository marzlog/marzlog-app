/**
 * 문체(톤) 선택 판정·표시 — 순수 함수 (RN 비의존, 단위 테스트 대상). D10-c.
 *
 * - 시트(ToneSheet): 3카드 표시값(라벨·설명·최근 선택·선택·Plus 잠금)
 * - 재생성: Plus·비복구·문체 UI 언어면 시트, 그 외는 기존 흐름(tone 미전송 → 서버가 users.diary_tone)
 * - 최근 문체 기억(D10-c2 A안): 설정 행 대신, 재생성에 쓴 문체를 users.diary_tone 에 저장해 다음 시트의 미리 선택으로 쓴다
 * - 상세 라벨: diary_tone 이 있으면 sincere 포함 표시, 값 없음(레거시 카드)·허용 밖·vi/th 는 숨김 (D10-c2)
 * - 시트 "지금 문체: ○○": 카드의 diary_tone 이 있을 때만 (D10-c2)
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
  /** 최근에 고른 문체(users.diary_tone) — "최근" 표시 */
  isLastUsed: boolean;
  selected: boolean;
  /** Free 에게 Plus 문체 — "Plus" 표시(고르면 저장 대신 안내) */
  locked: boolean;
}

export interface ToneSheetVM {
  cards: ToneCardVM[];
  /** 시트 상단 "지금 문체: ○○" — 재생성할 카드의 현재 문체. 값 없음이면 null(줄 생략) */
  current: { key: string; toneKey: string } | null;
}

export function buildToneSheetVM(input: {
  /** 최근에 고른 문체(users.diary_tone) — 없으면 sincere */
  lastUsedTone: unknown;
  selected: DiaryTone;
  isPlus: boolean;
  /** 잠금 표시 여부 — 재생성 시트는 Plus 만 열어 false */
  showLocks: boolean;
  /** 재생성할 카드의 현재 문체(GET /media/{id} diary_tone) */
  currentTone?: unknown;
}): ToneSheetVM {
  const lastUsed = resolveDiaryTone(input.lastUsedTone);
  return {
    cards: DIARY_TONES.map((tone) => ({
      tone,
      label: { key: TONE_LABEL_KEYS[tone] },
      description: { key: TONE_DESC_KEYS[tone] },
      isLastUsed: tone === lastUsed,
      selected: tone === input.selected,
      locked: input.showLocks && !input.isPlus && !isFreeTone(tone),
    })),
    current: isDiaryTone(input.currentTone)
      ? { key: 'tone.currentLabel', toneKey: TONE_LABEL_KEYS[input.currentTone] }
      : null,
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

/** 결제 화면 비교표 "문체 선택" 행 — ko/en 만(vi/th 는 문체 UI·혜택 문구 모두 없음) */
export function showToneRow(lang: SupportedLocale | null | undefined): boolean {
  return isToneUiEnabled(lang);
}

/**
 * 상세 "문체: 진솔/문학적/간결" 라벨 — 값 없음(레거시 카드)·허용 밖·문체 UI 미지원 언어면 null.
 * D10-c2: sincere 도 표시한다(어떤 문체로 쓰였는지 항상 알 수 있게).
 * 화면은 t(key, { tone: t(toneKey) }) 로 그린다(t 는 런타임 호출만, 명세 §5).
 */
export function toneDetailLabel(tone: unknown, lang: SupportedLocale | null | undefined): { key: string; toneKey: string } | null {
  if (!isToneUiEnabled(lang) || !isDiaryTone(tone)) return null;
  return { key: 'mediaDetail.toneLabel', toneKey: TONE_LABEL_KEYS[tone] };
}

export type ToneSaveOutcome = { ok: true; diaryTone: DiaryTone } | { ok: false };

/** 재생성에 쓴 문체를 기억할지 — 고른 문체가 지금 저장된 값(없으면 sincere)과 다를 때만 PATCH 한다 */
export function shouldRememberTone(saved: unknown, chosen: DiaryTone | null | undefined): chosen is DiaryTone {
  return !!chosen && resolveDiaryTone(saved) !== chosen;
}

/**
 * 최근 문체 저장(PATCH /auth/me/settings) 응답 판정 — D10-c2.
 * 서버가 돌려준 diary_tone 이 요청한 값이면 성공(스토어에 그 값을 쓴다). 응답에 없거나(구 서버) 다르면 실패 —
 * 실패는 조용히 넘긴다(재생성 결과와 무관, 다음 시트는 서버 값으로 미리 선택).
 */
export function resolveToneSaveResponse(requested: DiaryTone, response: { diary_tone?: unknown } | null | undefined): ToneSaveOutcome {
  const saved = response?.diary_tone;
  if (isDiaryTone(saved) && saved === requested) return { ok: true, diaryTone: saved };
  return { ok: false };
}
