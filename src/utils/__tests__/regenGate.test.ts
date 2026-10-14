/**
 * 재생성 Plus 게이트 판정 단위 테스트 (PAYWALL 명세 §3.4 regen, D7-2)
 */
import {
  isPlusRequiredError,
  isRecoveryRegeneration,
  resolvePlusRequiredFollowUp,
  resolveRegenAction,
} from '../regenGate';

const NORMAL = { ai_provider: 'gemini', content: '오늘은 바다에 갔다.', ai_content: '오늘은 바다에 갔다.', analysis_status: 'completed' };

describe('isRecoveryRegeneration — 서버 is_recovery_regeneration 4조건', () => {
  it('정상 일기 → 복구 아님', () => {
    expect(isRecoveryRegeneration(NORMAL)).toBe(false);
  });

  it('② ai_provider = fallback', () => {
    expect(isRecoveryRegeneration({ ...NORMAL, ai_provider: 'fallback' })).toBe(true);
  });

  it('①③ AI 본문 없음(null) — ai_content 기준', () => {
    expect(isRecoveryRegeneration({ ...NORMAL, ai_content: null })).toBe(true);
  });

  it('구 API(ai_content 없음)는 content 로 본다', () => {
    expect(isRecoveryRegeneration({ ai_provider: 'gemini', content: null, analysis_status: 'completed' })).toBe(true);
    expect(isRecoveryRegeneration({ ai_provider: 'gemini', content: '본문', analysis_status: 'completed' })).toBe(false);
  });

  it('사용자가 본문을 고쳐도 AI 원본이 없으면 복구(ai_content 우선)', () => {
    expect(isRecoveryRegeneration({ ...NORMAL, content: '내가 쓴 글', ai_content: null })).toBe(true);
  });

  it('④ 최신 작업 실패(analysis_status = failed)', () => {
    expect(isRecoveryRegeneration({ ...NORMAL, analysis_status: 'failed' })).toBe(true);
  });

  it('너그럽게 — 빈 문자열·공백, 백엔드 fallback 문구 접두', () => {
    expect(isRecoveryRegeneration({ ...NORMAL, ai_content: '   ' })).toBe(true);
    expect(isRecoveryRegeneration({ ...NORMAL, ai_content: 'AI 일기를 생성하지 못했어요' })).toBe(true);
    expect(isRecoveryRegeneration({ ...NORMAL, ai_content: undefined, content: 'Could not generate the diary.' })).toBe(true);
  });
});

describe('resolveRegenAction', () => {
  it.each([
    [false, true, 'regenerate'], // 무료 복구
    [true, true, 'regenerate'],
    [true, false, 'regenerate'], // Plus
    [false, false, 'sheet'], // 무료 정상 일기
  ] as const)('isPlus=%p, isRecovery=%p → %s', (isPlus, isRecovery, expected) => {
    expect(resolveRegenAction({ isPlus, isRecovery })).toBe(expected);
  });
});

describe('isPlusRequiredError', () => {
  const err = (status: number, data: unknown) => ({ response: { status, data } });

  it('403 + detail.code PLUS_REQUIRED', () => {
    expect(isPlusRequiredError(err(403, { detail: { code: 'PLUS_REQUIRED', feature: 'diary_regeneration' } }))).toBe(true);
  });

  it('다른 403·다른 상태·형식 오류·응답 없음 → false', () => {
    expect(isPlusRequiredError(err(403, { detail: { code: 'CONSENT_REQUIRED' } }))).toBe(false);
    expect(isPlusRequiredError(err(403, { detail: 'PLUS_REQUIRED' }))).toBe(false);
    expect(isPlusRequiredError(err(400, { detail: { code: 'PLUS_REQUIRED' } }))).toBe(false);
    expect(isPlusRequiredError(new Error('network'))).toBe(false);
    expect(isPlusRequiredError(null)).toBe(false);
  });
});

describe('resolvePlusRequiredFollowUp — 반영 지연이면 재시도 1회', () => {
  it.each([
    [true, false, 'retry'],
    [true, true, 'sheet'],
    [false, false, 'sheet'],
    [false, true, 'sheet'],
  ] as const)('refreshedIsPlus=%p, alreadyRetried=%p → %s', (refreshedIsPlus, alreadyRetried, expected) => {
    expect(resolvePlusRequiredFollowUp({ refreshedIsPlus, alreadyRetried })).toBe(expected);
  });
});
