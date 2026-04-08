import { create } from 'zustand';

/**
 * 미디어 메타데이터 변경(emotion/intensity 등)을 다른 화면에 전파하기 위한
 * lightweight broadcaster store.
 *
 * 사용 시나리오: media/[id].tsx에서 emotion 변경 후 setEmotionUpdate(...) 호출.
 * search/timeline/home 화면에서 lastEmotionUpdate를 구독해 결과 리스트의
 * 해당 항목을 in-place patch (전체 refetch 없이 스크롤/state 유지).
 */
interface EmotionUpdate {
  mediaId: string;
  emotion: string;
  intensity: number;
  ts: number;  // 동일 mediaId 재변경 감지용
}

interface MediaUpdatesStore {
  lastEmotionUpdate: EmotionUpdate | null;
  setEmotionUpdate: (mediaId: string, emotion: string, intensity: number) => void;
}

export const useMediaUpdatesStore = create<MediaUpdatesStore>((set) => ({
  lastEmotionUpdate: null,
  setEmotionUpdate: (mediaId, emotion, intensity) =>
    set({
      lastEmotionUpdate: { mediaId, emotion, intensity, ts: Date.now() },
    }),
}));

export default useMediaUpdatesStore;
