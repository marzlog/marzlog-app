/**
 * 상세 일기 편집 저장 결정 (순수 함수) — B-DIARY-EDIT-PATH-MISMATCH (10차).
 *
 * 편집은 사용자 글(`PUT /media/{id}` → media.title/content)을 쓴다. AI 일기(recall_cards)는
 * 재생성으로만 바뀐다(F-DUAL-CONTENT 정책).
 *
 * ★바뀐 필드만 보낸다 — 시드(표시값)를 그대로 보내면 AI 글이 사용자 글로 복제돼
 *   병기 화면에 같은 글이 두 번 보이고, 재생성 후엔 옛 AI 글이 사용자 칸에 남는다.
 *   비우기는 "" 로 보낸다(서버는 빈 값을 '없음'으로 보고 AI 일기 표시로 폴백).
 */
export type DiaryDraft = { title: string; content: string };

type DiaryValues = { title?: string | null; content?: string | null };

/** 시드 대비 바뀐 필드만 담는다. 바뀐 게 없으면 null — 호출 생략. */
export const buildDiaryEditPayload = (
  initial: DiaryDraft,
  current: DiaryDraft,
): Partial<DiaryDraft> | null => {
  const payload: Partial<DiaryDraft> = {};
  if (current.title !== initial.title) payload.title = current.title;
  if (current.content !== initial.content) payload.content = current.content;
  return Object.keys(payload).length > 0 ? payload : null;
};

/**
 * 저장 대상 id 와 시드. 그룹이면 표시 중 이미지(편집 버튼 노출 기준과 같은 대표) 기준이다 —
 * 검색에서 보조 이미지로 진입하면 라우트 id 는 보조라, 그 값으로 시드·저장하면 대표의 사용자 글을
 * 보조 이미지 값으로 덮거나 타임라인(대표 행 기준)에 안 보이는 행에 쓴다.
 */
export const resolveDiaryEditTarget = (
  routeId: string,
  media: DiaryValues | null | undefined,
  currentImage: (DiaryValues & { id: string | number }) | null | undefined,
): { targetId: string; seed: DiaryDraft } => {
  const source = currentImage ?? media;
  return {
    targetId: currentImage ? String(currentImage.id) : routeId,
    seed: { title: source?.title || '', content: source?.content || '' },
  };
};
