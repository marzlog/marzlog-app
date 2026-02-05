import { create } from 'zustand';

/**
 * Timeline state store
 * 홈 화면의 선택된 날짜를 네비게이션 간에 유지
 */

interface TimelineState {
  // 현재 선택된 날짜 (ISO string)
  selectedDateISO: string;

  // 마지막으로 본 미디어의 날짜 (ISO string) - 상세보기에서 돌아올 때 사용
  lastViewedDateISO: string | null;
}

interface TimelineActions {
  setSelectedDate: (date: Date) => void;
  setLastViewedDate: (date: Date | null) => void;
  getSelectedDate: () => Date;
  getLastViewedDate: () => Date | null;

  // 상세보기에서 돌아올 때: lastViewedDate가 있으면 selectedDate로 복원
  restoreFromLastViewed: () => Date | null;
}

type TimelineStore = TimelineState & TimelineActions;

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  selectedDateISO: new Date().toISOString(),
  lastViewedDateISO: null,

  setSelectedDate: (date: Date) => {
    set({ selectedDateISO: date.toISOString() });
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
      // lastViewedDate를 selectedDate로 복원하고 lastViewedDate는 초기화
      set({
        selectedDateISO: lastViewedDateISO,
        lastViewedDateISO: null
      });
      return new Date(lastViewedDateISO);
    }
    return null;
  },
}));

export default useTimelineStore;
