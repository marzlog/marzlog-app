import { resolveDisplayTitle } from '../i18n';
import { isAwaitingAnalysis, isDiaryEditLocked } from '../analysisPolling';

// B-USER-CONTENT-DISPLAY: API 는 title/content 에 사용자 입력 우선 표시값을,
// ai_title/ai_content 에 AI 원값을, title_source/content_source 에 출처를 싣는다.
// 분석 중 게이트·폴링은 AI 원값으로 판정하고, 사용자 제목은 게이트를 우회한다.

const t = (key: string) => key;
const PLACEHOLDER = 'Memories of Sep 15';

describe('resolveDisplayTitle — 사용자 입력 우선', () => {
  it('분석 중이어도 사용자 제목은 그대로 보인다(게이트 우회)', () => {
    expect(
      resolveDisplayTitle(
        {
          language: 'en',
          title: 'Bangkok festival',
          titleSource: 'user',
          content: null,
          aiTitle: PLACEHOLDER,
          aiContent: null,
          analysisStatus: 'done',
        },
        t,
      ),
    ).toBe('Bangkok festival');
  });

  it('사용자 본문만 있고 AI 제목이 임시 제목이면 분석 중으로 가린다 — 판정은 AI 원값', () => {
    expect(
      resolveDisplayTitle(
        {
          language: 'en',
          title: PLACEHOLDER,
          titleSource: 'ai',
          content: 'His Majesty\'s motorcade',
          aiTitle: PLACEHOLDER,
          aiContent: null,
          analysisStatus: 'done',
        },
        t,
      ),
    ).toBe('home.analyzing');
  });

  it('AI 원값 필드가 없는 구 응답은 기존 게이트 그대로다', () => {
    expect(
      resolveDisplayTitle({ language: 'en', title: PLACEHOLDER, content: null, analysisStatus: 'done' }, t),
    ).toBe('home.analyzing');
  });
});

describe('isAwaitingAnalysis — 폴링은 AI 원값 기준', () => {
  it('사용자 본문이 있어도 AI 일기가 아직 없으면 계속 기다린다', () => {
    expect(
      isAwaitingAnalysis({
        title: 'Bangkok festival',
        content: 'With CB',
        aiTitle: PLACEHOLDER,
        aiContent: null,
        analysisStatus: 'done',
      }),
    ).toBe(true);
  });

  it('AI 일기가 완성되면 사용자 값과 무관하게 멈춘다', () => {
    expect(
      isAwaitingAnalysis({
        title: 'Bangkok festival',
        content: 'With CB',
        aiTitle: 'A grand night of music',
        aiContent: 'We dressed up…',
        analysisStatus: 'done',
      }),
    ).toBe(false);
  });
});

describe('isDiaryEditLocked — 4상태 × 사용자 값 유무', () => {
  const states = [
    { name: '분석 중(queued)', analysisStatus: 'queued', aiTitle: null, aiContent: null, lockedWithoutUser: true },
    { name: '분석 중(enrich 창)', analysisStatus: 'done', aiTitle: PLACEHOLDER, aiContent: null, lockedWithoutUser: true },
    { name: '완료', analysisStatus: 'done', aiTitle: 'A quiet walk', aiContent: 'The morning…', lockedWithoutUser: false },
    { name: 'failed', analysisStatus: 'failed', aiTitle: null, aiContent: null, lockedWithoutUser: false },
    { name: '영구 미생성', analysisStatus: 'done', aiTitle: null, aiContent: null, lockedWithoutUser: false },
  ];

  it.each(states)('$name — 사용자 값 없음', ({ analysisStatus, aiTitle, aiContent, lockedWithoutUser }) => {
    expect(
      isDiaryEditLocked({
        title: aiTitle,
        content: aiContent,
        aiTitle,
        aiContent,
        titleSource: aiTitle ? 'ai' : null,
        contentSource: aiContent ? 'ai' : null,
        analysisStatus,
      }),
    ).toBe(lockedWithoutUser);
  });

  it.each(states)('$name — 사용자 제목 있음: 자기 글 편집은 막지 않는다', ({ analysisStatus, aiTitle, aiContent }) => {
    expect(
      isDiaryEditLocked({
        title: 'My own title',
        content: aiContent,
        aiTitle,
        aiContent,
        titleSource: 'user',
        contentSource: aiContent ? 'ai' : null,
        analysisStatus,
      }),
    ).toBe(false);
  });

  it('사용자 본문만 있어도 잠그지 않는다', () => {
    expect(
      isDiaryEditLocked({
        title: PLACEHOLDER,
        content: 'With CB',
        aiTitle: PLACEHOLDER,
        aiContent: null,
        titleSource: 'ai',
        contentSource: 'user',
        analysisStatus: 'running',
      }),
    ).toBe(false);
  });
});
