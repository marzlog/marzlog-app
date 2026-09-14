import { resolveDetailContent } from '../detailContent';

// F-DUAL-CONTENT-DISPLAY (JJ 2026-09-15): 상세 화면 내용 = 사용자 글 + AI 일기 병기.
// ★판정은 content_source / ai_content 원값 기준 — 표시값 content 로 추론하지 않는다
//   (7차 게이트 충돌의 원인). 구 응답(필드 부재)은 현행 단일 표시를 유지한다.

const USER = '교회끝나고 곤드레밥';
const AI = '둥근 테이블 둘레에 모여 앉아 든든한 점심을 먹었다.';
const PLACEHOLDER = '9월 15일의 기억';

describe('resolveDetailContent — 5케이스 매트릭스', () => {
  it('① 사용자 글 有 / AI 일기 有 → 사용자 글 + 구분 헤더 + AI 일기', () => {
    expect(
      resolveDetailContent({
        content: USER, contentSource: 'user', aiTitle: '배부른 점심시간', aiContent: AI, analysisStatus: 'done',
      }),
    ).toEqual({ primaryText: USER, aiSection: { kind: 'ready', text: AI } });
  });

  it('② 사용자 글 有 / AI 생성 중 → 사용자 글 + 헤더 자리에 분석 중', () => {
    expect(
      resolveDetailContent({
        content: USER, contentSource: 'user', aiTitle: PLACEHOLDER, aiContent: null, analysisStatus: 'done',
      }),
    ).toEqual({ primaryText: USER, aiSection: { kind: 'pending' } });
    expect(
      resolveDetailContent({
        content: USER, contentSource: 'user', aiTitle: null, aiContent: null, analysisStatus: 'running',
      }).aiSection,
    ).toEqual({ kind: 'pending' });
  });

  it('③ 사용자 글 有 / AI 영구 미생성·실패 → 사용자 글만(헤더 없음)', () => {
    expect(
      resolveDetailContent({
        content: USER, contentSource: 'user', aiTitle: null, aiContent: null, analysisStatus: 'done',
      }),
    ).toEqual({ primaryText: USER, aiSection: null });
    expect(
      resolveDetailContent({
        content: USER, contentSource: 'user', aiTitle: null, aiContent: null, analysisStatus: 'failed',
      }).aiSection,
    ).toBeNull();
    // 생성 실패 폴백 문구는 AI 일기가 아니다
    expect(
      resolveDetailContent({
        content: USER, contentSource: 'user', aiTitle: '오늘의 기억', aiContent: '일기 생성에 실패했습니다.',
        aiProvider: 'fallback', analysisStatus: 'done',
      }).aiSection,
    ).toBeNull();
  });

  it('④ 사용자 글 無 / AI 일기 有 → AI 일기만, 구분 헤더 없음(현행)', () => {
    expect(
      resolveDetailContent({
        content: AI, contentSource: 'ai', aiTitle: '배부른 점심시간', aiContent: AI, analysisStatus: 'done',
      }),
    ).toEqual({ primaryText: AI, aiSection: null });
  });

  it('⑤ 사용자 글 無 / AI 생성 중 → 현행(내용 영역 없음, 분석 중은 제목 영역)', () => {
    expect(
      resolveDetailContent({
        content: null, contentSource: null, aiTitle: PLACEHOLDER, aiContent: null, analysisStatus: 'done',
      }),
    ).toEqual({ primaryText: null, aiSection: null });
  });
});

describe('구 응답 폴백', () => {
  it('content_source / ai_content 필드가 없으면 현행 단일 표시다', () => {
    expect(resolveDetailContent({ content: AI, analysisStatus: 'done' })).toEqual({
      primaryText: AI,
      aiSection: null,
    });
  });
});
