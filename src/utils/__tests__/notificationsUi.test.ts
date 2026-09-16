/**
 * 알림 화면 휴지통 노출·삭제 스코프 계약 — B-NOTIF-TRASH-SCOPE (14차 재수리 2)
 *
 * 원 판정 "UI no-op" 은 오진이었다 — 개인 알림 삭제는 서버 API(`DELETE /notifications`)와
 * 결선돼 **실동작**했고, 공지 행만 선택 불가 사양이라 "전체" 탭에서 죽은 버튼처럼 보였을 뿐이다.
 * 그래서 노출을 **개인 알림 탭 한정**으로 좁힌다(죽은 버튼 금지 · 실동작 유지).
 */
import { canSelectForDelete, removeDeleted, shouldShowTrash } from '../notificationsUi';

describe('휴지통 노출', () => {
  it('개인 알림 탭에서만 보인다', () => {
    expect(shouldShowTrash('personal')).toBe(true);
  });

  it.each(['announcements', 'all'] as const)('%s 탭에서는 숨는다', (tab) => {
    expect(shouldShowTrash(tab)).toBe(false);
  });
});

describe('삭제 스코프', () => {
  it('개인 알림 행만 선택된다', () => {
    expect(canSelectForDelete('notification')).toBe(true);
    expect(canSelectForDelete('announcement')).toBe(false);
  });
});

describe('삭제 후 목록 반영', () => {
  const list = [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }];

  it('삭제한 id 가 목록에서 빠진다', () => {
    expect(removeDeleted(list, ['n2']).map((n) => n.id)).toEqual(['n1', 'n3']);
  });

  it('여러 건·미존재 id 혼재도 안전하다', () => {
    expect(removeDeleted(list, ['n1', 'n3', 'zzz']).map((n) => n.id)).toEqual(['n2']);
  });

  it('빈 삭제 목록은 원본을 그대로 둔다', () => {
    expect(removeDeleted(list, [])).toHaveLength(3);
  });
});
