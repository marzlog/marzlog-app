/**
 * 알림 화면 휴지통 노출·삭제 스코프 — B-NOTIF-TRASH-SCOPE (14차 재수리 2)
 *
 * 개인 알림 삭제는 서버(`DELETE /notifications`, user 스코프 hard delete)와 결선돼 **실동작**한다.
 * 문제는 노출 범위였다 — 공지 행은 선택 불가 사양이라 "전체"·공지 탭에서 휴지통이 죽은 버튼처럼 보였다.
 * ⇒ 휴지통은 **개인 알림 탭에서만** 노출한다(실동작하는 자리에만 둔다).
 */

export type NotificationTab = 'all' | 'announcements' | 'personal';
export type NotificationSource = 'notification' | 'announcement';

/** 휴지통(삭제 모드 진입) 노출 여부 — 개인 알림 탭 한정 */
export function shouldShowTrash(tab: NotificationTab): boolean {
  return tab === 'personal';
}

/** 삭제 대상으로 선택할 수 있는 행인가 — 시스템 공지는 서버 소유라 제외 */
export function canSelectForDelete(source: NotificationSource): boolean {
  return source === 'notification';
}

/** 삭제 성공 후 목록 반영 */
export function removeDeleted<T extends { id: string }>(items: T[], deletedIds: string[]): T[] {
  if (deletedIds.length === 0) return items;
  const gone = new Set(deletedIds);
  return items.filter((item) => !gone.has(item.id));
}
