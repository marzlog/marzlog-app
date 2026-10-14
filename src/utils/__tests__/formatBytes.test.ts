/**
 * formatBytes 단위 테스트 (D6-3 — 더보기 카드·마이페이지 공통 표기)
 */
import { formatBytes } from '../formatBytes';

it.each([
  [0, '0.0 KB'],
  [512 * 1024, '512.0 KB'],
  [1.5 * 1024 * 1024, '1.5 MB'],
  [2 * 1024 * 1024 * 1024, '2.0 GB'],
  [100 * 1024 * 1024 * 1024, '100.0 GB'],
])('%i → %s', (bytes, expected) => {
  expect(formatBytes(bytes)).toBe(expected);
});
