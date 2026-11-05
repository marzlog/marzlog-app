/**
 * 일기 생성·재생성 결과 폴링 — 순수 로직 (RN 비의존, 단위 테스트 대상). B-DIARY-RESULT-NO-POLLING, D10-c2.
 *
 * 종전에는 요청 10초 뒤 1회만 다시 읽어, 10초 넘게 걸린 생성은 결과가 나와도 화면이 "분석 중"으로 남았다.
 * 이제 DIARY_POLL_INTERVAL_MS 마다 상세를 다시 읽고, 일기가 바뀌면(제목·본문·문체·출처 중 하나) 멈춘다.
 * DIARY_POLL_MAX_MS 가 지나도 안 바뀌면 마지막으로 읽은 값을 두고 멈춘다(그 뒤는 화면 포커스·당겨서 새로고침).
 * 화면 언마운트·다른 미디어로 이동·새 폴링 시작이면 isStopped 로 즉시 멈춘다.
 */

export const DIARY_POLL_INTERVAL_MS = 3_000;
export const DIARY_POLL_MAX_MS = 60_000;

/** 결과가 바뀌었는지 비교할 필드 — GET /media/{id} 응답의 일부 */
export interface DiarySnapshot {
  title?: string | null;
  content?: string | null;
  diary_tone?: string | null;
  ai_provider?: string | null;
  ai_title?: string | null;
  ai_content?: string | null;
}

const FIELDS: (keyof DiarySnapshot)[] = ['title', 'content', 'diary_tone', 'ai_provider', 'ai_title', 'ai_content'];

export function diaryChanged(before: DiarySnapshot | null | undefined, after: DiarySnapshot | null | undefined): boolean {
  if (!after) return false;
  if (!before) return true;
  return FIELDS.some((f) => (before[f] ?? null) !== (after[f] ?? null));
}

export type DiaryPollResult = 'changed' | 'timeout' | 'stopped';

export interface DiaryPollDeps<T extends DiarySnapshot> {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  fetch: () => Promise<T>;
  /** 읽을 때마다 화면에 반영 — 진행 상태("분석 중" → 결과)가 폴링 중에도 바로 보이게 */
  onFetched: (latest: T) => void;
  isStopped: () => boolean;
  /** 읽기 실패 기록(폴링은 계속) */
  onError?: (err: unknown) => void;
}

export async function pollDiaryUntilChanged<T extends DiarySnapshot>(
  before: DiarySnapshot | null,
  deps: DiaryPollDeps<T>,
  opts: { intervalMs?: number; maxMs?: number } = {},
): Promise<DiaryPollResult> {
  const intervalMs = opts.intervalMs ?? DIARY_POLL_INTERVAL_MS;
  const maxMs = opts.maxMs ?? DIARY_POLL_MAX_MS;
  const startedAt = deps.now();
  while (true) {
    await deps.sleep(intervalMs);
    if (deps.isStopped()) return 'stopped';
    try {
      const latest = await deps.fetch();
      if (deps.isStopped()) return 'stopped';
      deps.onFetched(latest);
      if (diaryChanged(before, latest)) return 'changed';
    } catch (err) {
      deps.onError?.(err);
    }
    if (deps.now() - startedAt >= maxMs) return 'timeout';
  }
}
