import { isAwaitingAnalysis, shouldKeepPolling } from '../analysisPolling';

// 배경(2026-09-11 실측): 그룹 업로드는 **선행 멤버 job 이 그룹 일기보다 먼저 done** 이 된다
// (실측 06:10:55 done vs 06:11:21 그룹 일기 = 26초 창). 폴링 중단 조건이 analysis_status
// 만 보던 탓에 그 창에서 폴링이 멈췄고, 표시 게이트(`!content && !!title`)는 계속 참이라
// 화면이 "분석 중"에 영구 고착됐다. 지속 조건을 **표시 게이트와 같은 판정**으로 맞춘다.
//
// ★무한 폴링 함정: 그렇다고 `!content` 만 보면 실패 카드·영구 미생성 카드를 영원히
//   폴링한다. v28.48 3차 회귀와 동형의 과잉 적용이므로 탈출구를 명시적으로 고정한다.

const card = (over: Partial<Parameters<typeof isAwaitingAnalysis>[0]> = {}) => ({
  title: null,
  content: null,
  analysisStatus: 'done',
  ...over,
});

describe('isAwaitingAnalysis — 지속 조건', () => {
  it('(a) status=done 인데 임시 제목만 있고 본문이 없으면 계속 기다린다 (그룹 26초 창)', () => {
    expect(isAwaitingAnalysis(card({ title: 'Memories of Sep 11', content: null }))).toBe(true);
  });

  it('(b) 본문이 생기면 끝난다', () => {
    expect(
      isAwaitingAnalysis(card({ title: 'Deep in the afternoon code', content: 'The desk was …' })),
    ).toBe(false);
  });

  it('(c) status=failed 면 본문이 없어도 끝난다 — 무한 폴링 차단', () => {
    expect(
      isAwaitingAnalysis(card({ title: 'Memories of Sep 11', content: null, analysisStatus: 'failed' })),
    ).toBe(false);
  });

  it('queued/running 은 제목·본문이 아직 없어도 계속 기다린다 — 기존 동작 보존', () => {
    expect(isAwaitingAnalysis(card({ analysisStatus: 'queued' }))).toBe(true);
    expect(isAwaitingAnalysis(card({ analysisStatus: 'running' }))).toBe(true);
  });

  it('영구 미생성(done · 제목 無 · 본문 無)은 기다리지 않는다 — 캡션 폴백으로 확정된 카드', () => {
    expect(isAwaitingAnalysis(card({ title: null, content: null, analysisStatus: 'done' }))).toBe(false);
  });
});

describe('shouldKeepPolling — 목록 판정', () => {
  it('하나라도 대기 중이면 폴링한다', () => {
    expect(
      shouldKeepPolling([
        card({ title: 'Deep in the afternoon code', content: '…' }),
        card({ title: 'Memories of Sep 11', content: null }),
      ]),
    ).toBe(true);
  });

  it('전부 끝났으면 폴링하지 않는다', () => {
    expect(
      shouldKeepPolling([
        card({ title: 'Deep in the afternoon code', content: '…' }),
        card({ title: 'Memories of Sep 11', content: null, analysisStatus: 'failed' }),
      ]),
    ).toBe(false);
  });

  it('빈 목록이면 폴링하지 않는다', () => {
    expect(shouldKeepPolling([])).toBe(false);
  });
});
