/**
 * AI 일기 재생성 Plus 게이트 판정 — 순수 함수 (RN 비의존). PAYWALL 명세 §3.4 regen, D7-2.
 *
 * 무료 복구 재생성은 서버 entitlement.is_recovery_regeneration 4조건과 맞춘다:
 *   ① recall_card 없음 ② ai_provider = 'fallback' ③ content IS NULL ④ 최신 job failed.
 * 앱은 ①③을 "AI 본문 없음", ④를 analysis_status === 'failed'(서버 media.jobs[0].status)로 본다.
 * 판정은 너그럽게 한다 — 앱이 복구로 잘못 보내도 서버 403 PLUS_REQUIRED 가 최종 판단이고 시트로 이어진다.
 * 반대로 앱이 막으면 무료 복구를 잃는다. 그래서 빈 문자열·백엔드 fallback 문구 접두도 복구로 본다.
 */

// 백엔드 diary_generator.py 의 fallback 문구와 동기(B-REGEN-FALLBACK-SYNC). 백엔드 문구가 바뀌면 함께 갱신
export const DIARY_FALLBACK_PREFIXES = ['AI 일기를 생성하지 못했', 'Could not generate the diary'] as const;

export interface RegenMediaLike {
  ai_provider?: string | null;
  content?: string | null;
  /** AI 원본 본문 — 구 API 응답에는 없다(undefined) → content 로 대신 본다 */
  ai_content?: string | null;
  analysis_status?: string | null;
}

export function isRecoveryRegeneration(media: RegenMediaLike): boolean {
  if (media.ai_provider === 'fallback') return true;
  if (media.analysis_status === 'failed') return true;
  const aiContent = media.ai_content !== undefined ? media.ai_content : media.content;
  if (aiContent == null || aiContent.trim() === '') return true;
  return DIARY_FALLBACK_PREFIXES.some((prefix) => aiContent.startsWith(prefix) || !!media.content?.startsWith(prefix));
}

export type RegenAction = 'regenerate' | 'sheet';

/** ① 복구 → 통과 ② Plus 아님 → 시트 ③ 그 외 → 재생성 (PW-1: isPlus 는 /auth/me plan) */
export function resolveRegenAction(input: { isPlus: boolean; isRecovery: boolean }): RegenAction {
  if (input.isRecovery) return 'regenerate';
  return input.isPlus ? 'regenerate' : 'sheet';
}

/** 서버 403 {"detail": {"code": "PLUS_REQUIRED", ...}} (routers/media.py generate-diary) */
export function isPlusRequiredError(err: unknown): boolean {
  const response = (err as { response?: { status?: unknown; data?: unknown } } | null | undefined)?.response;
  if (response?.status !== 403) return false;
  const detail = (response.data as { detail?: unknown } | null | undefined)?.detail;
  return typeof detail === 'object' && detail !== null && (detail as { code?: unknown }).code === 'PLUS_REQUIRED';
}

/**
 * 403 PLUS_REQUIRED 뒤 처리 — refreshUser 결과가 plus 면(반영 지연: 앱은 plus 를 몰랐고 서버는 막았다가 이제 안다)
 * 시트 대신 재시도 1회. 재시도도 403 이면 시트.
 */
export function resolvePlusRequiredFollowUp(input: { refreshedIsPlus: boolean; alreadyRetried: boolean }): 'retry' | 'sheet' {
  return input.refreshedIsPlus && !input.alreadyRetried ? 'retry' : 'sheet';
}
