/**
 * 단일 업로드 메타 동봉·PUT 생략 계약 — B-UPLOAD-METADATA-RACE (12차).
 */
import { needsMetadataPut, toCompleteMetadata } from '../uploadMetadata';

describe('complete 요청 메타', () => {
  it('값이 있는 필드만 싣는다', () => {
    expect(
      toCompleteMetadata({ title: 't', content: '', memo: '힌트', emotion: 'joy', intensity: 9 }),
    ).toEqual({ title: 't', memo: '힌트', emotion: 'joy', intensity: 9 });
  });

  it('감정 미선택 + 힌트 → 메모만 (감정·강도 미전송, 서버 NULL 시드 유지)', () => {
    expect(toCompleteMetadata({ memo: '힌트', emotion: undefined, intensity: 6 })).toEqual({ memo: '힌트' });
  });

  it('메타가 없으면 빈 객체 (구 요청과 동일)', () => {
    expect(toCompleteMetadata(undefined)).toEqual({});
    expect(toCompleteMetadata({ title: '', memo: '' })).toEqual({});
  });
});

describe('후속 PUT 생략', () => {
  const meta = { memo: '힌트', emotion: 'joy', intensity: 6 };

  it('서버가 반영을 확인하면 PUT 을 생략한다', () => {
    expect(needsMetadataPut(meta, { metadata_applied: true })).toBe(false);
  });

  it.each([
    ['멱등 재호출(기존 행)', { metadata_applied: false }],
    ['구 서버(필드 없음)', {}],
    ['응답 없음', undefined],
  ])('%s 이면 PUT 으로 폴백한다', (_label, result) => {
    expect(needsMetadataPut(meta, result as { metadata_applied?: boolean } | undefined)).toBe(true);
  });

  it('보낼 메타가 없으면 PUT 도 없다', () => {
    expect(needsMetadataPut({ memo: '' }, { metadata_applied: false })).toBe(false);
    expect(needsMetadataPut(undefined, undefined)).toBe(false);
  });
});
