import { create } from 'zustand';
import type { PlusSheetRequest } from '../utils/plusSheetViewModel';

/**
 * Plus 안내 시트 열기·닫기(PAYWALL 명세 §3.4, D7-1).
 * 시트 본체는 루트 레이아웃에 하나만 둔다 — 업로드가 끝나면 홈으로 이동하므로(용량 초과 ⑤),
 * 화면이 바뀌어도 시트가 남도록 화면 밖 스토어로 연다. 같은 요청이 겹치면 마지막 것이 남는다.
 */
interface PlusSheetStore {
  request: PlusSheetRequest | null;
  open: (request: PlusSheetRequest) => void;
  close: () => void;
}

export const usePlusSheetStore = create<PlusSheetStore>((set) => ({
  request: null,
  open: (request) => set({ request }),
  close: () => set({ request: null }),
}));
