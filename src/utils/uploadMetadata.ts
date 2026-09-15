/**
 * 단일 업로드 메타 동봉 규약 — B-UPLOAD-METADATA-RACE (12차)
 *
 * 이전에는 complete → (서버 enqueue) → PUT /media/{id} 순서라, 워커가 PUT 보다 먼저 행을 읽으면
 * 메모·감정이 없는 것으로 판정돼 감정 추정·힌트가 빠졌다(실측 76ms 차).
 * 이제 메타를 complete 요청에 실어 행 생성 시점에 반영하고, 후속 PUT 은
 * **서버가 반영을 확인(metadata_applied=true)했을 때만** 생략한다.
 *   - 멱등 재호출(이미 생성된 행)·구 서버는 metadata_applied 가 없거나 false → PUT 폴백
 *   - PUT 계약은 그대로다(생략 여부만 바뀐다)
 *
 * ★jest(ts-jest, node)에서 실행되므로 RN/`@/` 별칭 없이 순수 TS 로 둔다.
 */

export type UploadMetadata = {
  title?: string;
  content?: string;
  memo?: string;
  emotion?: string;
  intensity?: number;
};

/** complete 요청에 실을 메타 — 값이 있는 필드만. 감정이 없으면 강도도 싣지 않는다. */
export function toCompleteMetadata(meta?: UploadMetadata | null): UploadMetadata {
  const out: UploadMetadata = {};
  if (!meta) return out;
  if (meta.title) out.title = meta.title;
  if (meta.content) out.content = meta.content;
  if (meta.memo) out.memo = meta.memo;
  if (meta.emotion) {
    out.emotion = meta.emotion;
    if (typeof meta.intensity === 'number') out.intensity = meta.intensity;
  }
  return out;
}

/** complete 이후 PUT /media/{id} 가 필요한가 — 보낼 메타가 있고 서버 반영 확인이 없을 때만. */
export function needsMetadataPut(
  meta: UploadMetadata | null | undefined,
  result: { metadata_applied?: boolean } | null | undefined,
): boolean {
  if (Object.keys(toCompleteMetadata(meta)).length === 0) return false;
  return result?.metadata_applied !== true;
}
