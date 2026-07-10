import { create } from 'zustand';
import { Platform } from 'react-native';
import * as uploadQueue from '../services/uploadQueue';

/**
 * 영속 업로드 큐 대기 건수 미러 (F-UPLOAD-RESUME-UX).
 *
 * 큐 manifest는 documentDirectory의 JSON 파일이라 반응형 구독이 불가하므로,
 * 큐 변형 지점(enqueue/mark 계열, triggerResume 전후)에서 refreshPendingCount를
 * 호출해 카운트를 미러링한다. UI(홈 배너)는 pendingCount만 selector로 구독하고,
 * 주기 재시도 tick은 getState().pendingCount > 0 선체크로 게이팅한다.
 *
 * pendingCount = listResumable(userId).length — (pending|failed) && attempts < MAX_RESUME_ATTEMPTS.
 */
interface UploadQueueStore {
  pendingCount: number;
  refreshPendingCount: (userId: string | null | undefined) => Promise<void>;
}

export const useUploadQueueStore = create<UploadQueueStore>((set) => ({
  pendingCount: 0,
  refreshPendingCount: async (userId) => {
    if (Platform.OS === 'web' || !userId) {
      set({ pendingCount: 0 });
      return;
    }
    try {
      const jobs = await uploadQueue.listResumable(userId);
      set({ pendingCount: jobs.length });
    } catch {
      // 카운트 갱신 실패는 배너 표시에만 영향 — 기존 값 유지(업로드 흐름 무관)
    }
  },
}));
