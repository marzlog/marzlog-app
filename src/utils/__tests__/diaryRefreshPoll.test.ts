/**
 * B-DIARY-RESULT-NO-POLLING (D10-c2) — 생성·재생성 결과 폴링: 3초 간격, 바뀌면 멈춤, 최대 60초, 중단 조건.
 * 시계·sleep 은 가짜(즉시 진행).
 */
import {
  DIARY_POLL_INTERVAL_MS,
  DIARY_POLL_MAX_MS,
  diaryChanged,
  pollDiaryUntilChanged,
  type DiarySnapshot,
} from '../diaryRefreshPoll';

function fakeClock() {
  let t = 0;
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms;
    },
  };
}

const BEFORE: DiarySnapshot = { title: '옛 제목', content: '옛 본문', diary_tone: null, ai_provider: 'gemini' };

describe('diaryChanged', () => {
  it('같으면 false, 제목·본문·문체 중 하나라도 바뀌면 true', () => {
    expect(diaryChanged(BEFORE, { ...BEFORE })).toBe(false);
    expect(diaryChanged(BEFORE, { ...BEFORE, content: '새 본문' })).toBe(true);
    expect(diaryChanged(BEFORE, { ...BEFORE, title: '새 제목' })).toBe(true);
    expect(diaryChanged(BEFORE, { ...BEFORE, diary_tone: 'literary' })).toBe(true);
  });

  it('undefined 와 null 은 같은 값으로 본다(필드 부재 응답)', () => {
    expect(diaryChanged({ title: 'a', content: 'b' }, { title: 'a', content: 'b', diary_tone: null })).toBe(false);
  });

  it('이전 값이 없으면 첫 응답에서 바로 변경으로 본다', () => {
    expect(diaryChanged(null, BEFORE)).toBe(true);
    expect(diaryChanged(BEFORE, null)).toBe(false);
  });
});

describe('pollDiaryUntilChanged', () => {
  it('상수는 3초 × 60초', () => {
    expect(DIARY_POLL_INTERVAL_MS).toBe(3000);
    expect(DIARY_POLL_MAX_MS).toBe(60000);
  });

  it('결과가 바뀌면 그 응답을 반영하고 멈춘다 (10초 넘게 걸린 생성도 잡는다)', async () => {
    const clock = fakeClock();
    const fetched: DiarySnapshot[] = [];
    let calls = 0;
    const result = await pollDiaryUntilChanged(BEFORE, {
      ...clock,
      fetch: async () => {
        calls += 1;
        return calls < 5 ? { ...BEFORE } : { ...BEFORE, content: '새 본문', diary_tone: 'literary' };
      },
      onFetched: (latest) => fetched.push(latest),
      isStopped: () => false,
    });
    expect(result).toBe('changed');
    expect(calls).toBe(5); // 15초째 — 종전 10초 1회 재조회로는 놓치던 경우
    expect(fetched[fetched.length - 1]).toMatchObject({ content: '새 본문', diary_tone: 'literary' });
  });

  it('60초 동안 안 바뀌면 timeout — 20회 읽고 멈춘다', async () => {
    const clock = fakeClock();
    let calls = 0;
    const result = await pollDiaryUntilChanged(BEFORE, {
      ...clock,
      fetch: async () => {
        calls += 1;
        return { ...BEFORE };
      },
      onFetched: () => {},
      isStopped: () => false,
    });
    expect(result).toBe('timeout');
    expect(calls).toBe(DIARY_POLL_MAX_MS / DIARY_POLL_INTERVAL_MS);
  });

  it('중단(언마운트·id 변경·새 폴링)이면 다음 읽기 전에 멈추고 반영하지 않는다', async () => {
    const clock = fakeClock();
    let stopped = false;
    let calls = 0;
    const onFetched = jest.fn();
    const result = await pollDiaryUntilChanged(BEFORE, {
      ...clock,
      fetch: async () => {
        calls += 1;
        if (calls === 2) stopped = true; // 두 번째 응답 도착 전에 화면이 닫힘
        return { ...BEFORE };
      },
      onFetched,
      isStopped: () => stopped,
    });
    expect(result).toBe('stopped');
    expect(calls).toBe(2);
    expect(onFetched).toHaveBeenCalledTimes(1); // 닫힌 뒤 도착한 응답은 반영하지 않는다
  });

  it('읽기 실패는 기록하고 폴링을 이어간다', async () => {
    const clock = fakeClock();
    let calls = 0;
    const onError = jest.fn();
    const result = await pollDiaryUntilChanged(BEFORE, {
      ...clock,
      fetch: async () => {
        calls += 1;
        if (calls === 1) throw new Error('network');
        return { ...BEFORE, content: '새 본문' };
      },
      onFetched: () => {},
      isStopped: () => false,
      onError,
    });
    expect(result).toBe('changed');
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
