/**
 * D10-c — generateDiary 의 tone body. tone 을 주면 {tone}, 없으면 body 없이(구버전과 같은 호출 → 서버가 기본 톤).
 */
jest.mock('../client', () => ({ apiClient: { post: jest.fn(async () => ({ data: { success: true, job_id: 'j', message: 'ok' } })) } }));

import { apiClient } from '../client';
import { generateDiary } from '../media';

const post = apiClient.post as jest.Mock;

beforeEach(() => post.mockClear());

it.each(['sincere', 'literary', 'plain'] as const)('tone %p → body {tone}', async (tone) => {
  await generateDiary('m1', { tone });
  expect(post).toHaveBeenCalledTimes(1);
  expect(post).toHaveBeenCalledWith('/media/m1/generate-diary', { tone });
});

it('tone 없음(복구 재생성·vi/th) → body 없이', async () => {
  await generateDiary('m1');
  await generateDiary('m1', {});
  expect(post.mock.calls).toEqual([['/media/m1/generate-diary'], ['/media/m1/generate-diary']]);
});

it('응답 data 를 그대로 돌려준다', async () => {
  await expect(generateDiary('m1', { tone: 'plain' })).resolves.toEqual({ success: true, job_id: 'j', message: 'ok' });
});
