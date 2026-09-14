import { create } from 'zustand';
import { shouldResetSelectedDate, toLocalDateKey } from '@/src/utils/selectedDate';

/**
 * Timeline state store
 * 홈 화면의 선택된 날짜를 네비게이션 간에 유지
 */

interface TimelineState {
  // 현재 선택된 날짜 (ISO string)
  selectedDateISO: string;

  // 마지막으로 본 미디어의 날짜 (ISO string) - 상세보기에서 돌아올 때 사용
  lastViewedDateISO: string | null;

  // 사용자가 날짜를 명시적으로 고른 날(로컬 키). null = 명시 선택 아님.
  // ★불리언이 아니라 날짜 키다 — 어제 고른 선택이 앱 프로세스에 남아 자정을 넘기면
  //   "오늘 명시 선택"으로 오인되기 때문이다(2026-09-14 recon A, H2).
  selectedByUserOn: string | null;
}

interface TimelineActions {
  setSelectedDate: (date: Date, byUser?: boolean) => void;
  setLastViewedDate: (date: Date | null) => void;
  getSelectedDate: () => Date;
  getLastViewedDate: () => Date | null;

  // 상세보기에서 돌아올 때: lastViewedDate가 있으면 selectedDate로 복원
  restoreFromLastViewed: () => Date | null;

  // 선택 날짜가 오늘이 아니고 오늘의 명시 선택도 아니면 오늘로 되돌린다. 되돌렸으면 그 날짜를 반환.
  resetToTodayIfStale: (now?: Date) => Date | null;

  // 명시 선택 해제 (홈 화면 이탈 시)
  clearUserSelection: () => void;
}

type TimelineStore = TimelineState & TimelineActions;

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  selectedDateISO: new Date().toISOString(),
  lastViewedDateISO: null,
  selectedByUserOn: null,

  setSelectedDate: (date: Date, byUser = false) => {
    set({
      selectedDateISO: date.toISOString(),
      selectedByUserOn: byUser ? toLocalDateKey(new Date()) : get().selectedByUserOn,
    });
  },

  setLastViewedDate: (date: Date | null) => {
    set({ lastViewedDateISO: date ? date.toISOString() : null });
  },

  getSelectedDate: () => {
    return new Date(get().selectedDateISO);
  },

  getLastViewedDate: () => {
    const iso = get().lastViewedDateISO;
    return iso ? new Date(iso) : null;
  },

  restoreFromLastViewed: () => {
    const { lastViewedDateISO } = get();
    if (lastViewedDateISO) {
      // lastViewedDate를 selectedDate로 복원하고 lastViewedDate는 초기화.
      // 복원된 날짜는 사용자가 보던 날짜이므로 명시 선택으로 취급한다.
      set({
        selectedDateISO: lastViewedDateISO,
        lastViewedDateISO: null,
        selectedByUserOn: toLocalDateKey(new Date()),
      });
      return new Date(lastViewedDateISO);
    }
    return null;
  },

  resetToTodayIfStale: (now = new Date()) => {
    const { selectedDateISO, selectedByUserOn } = get();
    if (!shouldResetSelectedDate(new Date(selectedDateISO), now, selectedByUserOn)) {
      return null;
    }
    set({ selectedDateISO: now.toISOString(), selectedByUserOn: null });
    return now;
  },

  clearUserSelection: () => {
    set({ selectedByUserOn: null });
  },
}));

export default useTimelineStore;
