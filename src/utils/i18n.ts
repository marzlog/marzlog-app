export const getLocalizedTitle = (
  title: string | null | undefined,
  title_en: string | null | undefined,
  language: string
): string => {
  if (language === 'en') {
    return title_en || title || '';
  }
  return title || title_en || '';
};

/**
 * 워커 enrich 가 넣은 임시 제목인지 판별한다.
 *
 * 일기 생성 경로는 title 과 content 를 **같은 UPDATE/INSERT 문에서 함께** 쓰고
 * (`workers/analyzer/tasks.py` 단독 954-962 / 그룹 684-692), enrich 는 **title 만**
 * 쓴다(`tasks_enrich_addon.py:119`, `WHERE title IS NULL`). 그래서
 * "제목은 있는데 본문이 없다" = 아직 일기가 없고 enrich 임시 제목만 붙은 상태다.
 * 그 제목은 캡션 언어 기준 ko/en 으로 고정 생성되므로 사용자 언어가 아니다.
 *
 * ★ content 만으로 판단하면 안 된다 — 일기가 끝내 생성되지 않아 title·content 가
 *   둘 다 없고 caption 만 남은 카드(job=done)까지 "분석 중"으로 가로채기 때문이다.
 */
export const isEnrichPlaceholderTitle = (
  title: string | null | undefined,
  content: string | null | undefined,
): boolean => !!title && !content;

export type DisplayTitleInput = {
  title?: string | null;
  titleEn?: string | null;
  content?: string | null;
  captionKo?: string | null;
  caption?: string | null;
  analysisStatus?: string | null;
  language: string;
};

/**
 * 카드 목록에 표시할 제목을 결정한다(순수 함수).
 *
 * 우선순위: enrich 임시 제목 차단 → 제목 → 캡션 → 분석 상태 → 제목 없음
 */
export const resolveDisplayTitle = (
  input: DisplayTitleInput,
  t: (key: string) => string,
): string => {
  const { title, titleEn, content, captionKo, caption, analysisStatus, language } = input;

  if (isEnrichPlaceholderTitle(title, content)) {
    return analysisStatus === 'failed' ? t('home.analysisFailed') : t('home.analyzing');
  }

  const resolved = getLocalizedTitle(title, titleEn, language) || captionKo || caption;
  if (resolved) return resolved;

  if (analysisStatus === 'queued' || analysisStatus === 'running') return t('home.analyzing');
  if (analysisStatus === 'failed') return t('home.analysisFailed');
  return t('common.noTitle');
};
