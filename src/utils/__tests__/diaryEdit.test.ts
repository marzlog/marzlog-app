import { buildDiaryEditPayload, resolveDiaryEditTarget } from '../diaryEdit';

// B-DIARY-EDIT-PATH-MISMATCH (10차): 편집 저장은 사용자 글(PUT /media/{id})로 간다.
// 시드를 그대로 저장하면 AI 글이 사용자 글로 복제되므로(중복 병기·재생성 후 갈라짐)
// 바뀐 필드만 보낸다. 비우기는 "" 로 보내 사용자 글을 지운다(표시는 AI 일기로 폴백).

describe('buildDiaryEditPayload — dirty-check', () => {
  const seed = { title: '제목', content: '본문' };

  it('무변경이면 전송하지 않는다', () => {
    expect(buildDiaryEditPayload(seed, { ...seed })).toBeNull();
  });

  it('제목만 바꾸면 title 만 보낸다', () => {
    expect(buildDiaryEditPayload(seed, { title: '새 제목', content: '본문' })).toEqual({ title: '새 제목' });
  });

  it('비우면 "" 를 포함해 보낸다', () => {
    const payload = buildDiaryEditPayload(seed, { title: '제목', content: '' });
    expect(payload).toEqual({ content: '' });
    expect(payload).toHaveProperty('content', '');
  });

  it('AI 시드를 수정 없이 저장하면 전송하지 않는다 — AI 글이 사용자 글로 복제되지 않는다', () => {
    const aiSeed = { title: '카페에서 보낸 오후', content: '따뜻한 라떼와 함께한 오후였다.' };
    expect(buildDiaryEditPayload(aiSeed, { ...aiSeed })).toBeNull();
  });
});

describe('resolveDiaryEditTarget — 그룹 저장 대상', () => {
  it('그룹이면 표시 중 이미지 id 로 저장하고 그 이미지의 값을 시드한다 (라우트 id 무관)', () => {
    const routeMedia = { title: null, content: 'AI 그룹 일기' }; // 검색에서 보조 이미지로 진입
    const shownPrimary = { id: 'primary-1', title: '내 제목', content: '내 글' };
    expect(resolveDiaryEditTarget('secondary-2', routeMedia, shownPrimary)).toEqual({
      targetId: 'primary-1',
      seed: { title: '내 제목', content: '내 글' },
    });
  });

  it('단일 카드면 라우트 id 와 상세 값을 쓴다', () => {
    expect(resolveDiaryEditTarget('single-1', { title: 'T', content: null }, null)).toEqual({
      targetId: 'single-1',
      seed: { title: 'T', content: '' },
    });
  });
});
