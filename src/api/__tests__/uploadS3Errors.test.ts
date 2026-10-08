/**
 * upload.ts S3 PUT 오류 형태 테스트 (B-UPLOAD-FAIL-AS-PENDING, 명세 paywall-spec §4)
 *
 * 불변식:
 *  - S3 PUT 실패는 상태 코드를 담은 S3UploadError 로 던지고, 메시지 문자열은 기존 값 그대로.
 *  - 저장된 서명(prepared)이 403 → 새 prepare 로 폴백. 새 서명으로도 403 이면 afterReissue(local).
 *  - 응답 없이 끝난 native PUT 은 NetInfo 로 가른다: 오프라인 확인이면 응답 없음(transient·횟수 불변),
 *    온라인·판별 불가(null·조회 실패)면 원 오류 그대로(local·+1, 5회 상한) — 종전 동작.
 */
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(async () => 'hash'),
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  CryptoEncoding: { HEX: 'hex' },
}));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  uploadAsync: jest.fn(),
  FileSystemUploadType: { BINARY_CONTENT: 0 },
}));
jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: { fetch: jest.fn() } }));
jest.mock('../client', () => ({ apiClient: { post: jest.fn() } }));
jest.mock('../../store/settingsStore', () => ({
  useSettingsStore: { getState: () => ({ aiMode: 'precise' }) },
  aiModeToBackend: () => 'precision',
}));

import * as LegacyFS from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';
import { apiClient } from '../client';
import { uploadImage, uploadToS3 } from '../upload';
import { S3UploadError, classifyUploadFailure, decideJobFailure } from '../../utils/uploadFailure';

const uploadAsync = LegacyFS.uploadAsync as jest.Mock;
const netInfoFetch = NetInfo.fetch as jest.Mock;
const post = apiClient.post as jest.Mock;

const IMAGE = {
  uri: 'file:///doc/upload_queue/a.jpg',
  filename: 'a.jpg',
  fileSize: 1024,
  width: 10,
  height: 10,
  mimeType: 'image/jpeg',
};
const PREPARED = { upload_id: 'old', storage_key: 'k-old', sha256: 'h', presigned_put_url: 'https://s3/old' };

beforeEach(() => {
  jest.clearAllMocks();
  post.mockImplementation(async (url: string) => {
    if (url === '/media/upload/prepare') {
      return { data: { presigned_put_url: 'https://s3/new', upload_id: 'new', storage_key: 'k-new' } };
    }
    return { data: { media_id: 'm1' } };
  });
});

describe('uploadToS3 (native) 오류 형태', () => {
  it('S3 403 → S3UploadError(403, PRESIGNED_EXPIRED)', async () => {
    uploadAsync.mockResolvedValue({ status: 403 });
    const err = await uploadToS3('https://s3/x', IMAGE.uri, 'image/jpeg').catch((e) => e);
    expect(err).toBeInstanceOf(S3UploadError);
    expect(err.status).toBe(403);
    expect(err.message).toBe('PRESIGNED_EXPIRED');
    expect(classifyUploadFailure(err)).toBe('transient');
  });

  it('S3 500 → S3UploadError(500), 메시지 유지 → transient', async () => {
    uploadAsync.mockResolvedValue({ status: 500 });
    const err = await uploadToS3('https://s3/x', IMAGE.uri, 'image/jpeg').catch((e) => e);
    expect(err.message).toBe('S3 upload failed: 500');
    expect(classifyUploadFailure(err)).toBe('transient');
  });

  it('S3 400 → rejected', async () => {
    uploadAsync.mockResolvedValue({ status: 400 });
    const err = await uploadToS3('https://s3/x', IMAGE.uri, 'image/jpeg').catch((e) => e);
    expect(classifyUploadFailure(err)).toBe('rejected');
  });

  it('응답 없이 실패 + 오프라인 확인 → 응답 없음(transient), 재시도 횟수 불변, 원 메시지 유지', async () => {
    uploadAsync.mockRejectedValue(new Error('The Internet connection appears to be offline.'));
    netInfoFetch.mockResolvedValue({ isConnected: false });
    const err = await uploadToS3('https://s3/x', IMAGE.uri, 'image/jpeg').catch((e) => e);
    expect(err).toBeInstanceOf(S3UploadError);
    expect(err.status).toBeNull();
    expect(err.message).toBe('The Internet connection appears to be offline.');
    expect(classifyUploadFailure(err)).toBe('transient');
    expect(decideJobFailure([classifyUploadFailure(err)])).toEqual({ type: 'keep', incrementAttempts: false });
  });

  it('응답 없이 실패 + 온라인 → 원 오류 그대로(local), 재시도 횟수 +1', async () => {
    const original = new Error('Could not connect to the server.');
    uploadAsync.mockRejectedValue(original);
    netInfoFetch.mockResolvedValue({ isConnected: true });
    const err = await uploadToS3('https://s3/x', IMAGE.uri, 'image/jpeg').catch((e) => e);
    expect(err).toBe(original);
    expect(classifyUploadFailure(err)).toBe('local');
    expect(decideJobFailure([classifyUploadFailure(err)])).toEqual({ type: 'keep', incrementAttempts: true });
  });

  it('응답 없이 실패 + 판별 불가(null) → local', async () => {
    const original = new Error('x');
    uploadAsync.mockRejectedValue(original);
    netInfoFetch.mockResolvedValue({ isConnected: null });
    const err = await uploadToS3('https://s3/x', IMAGE.uri, 'image/jpeg').catch((e) => e);
    expect(err).toBe(original);
    expect(classifyUploadFailure(err)).toBe('local');
  });

  it('응답 없이 실패 + NetInfo 조회 실패(throw) → local', async () => {
    const original = new Error('File does not exist');
    uploadAsync.mockRejectedValue(original);
    netInfoFetch.mockRejectedValue(new Error('netinfo unavailable'));
    const err = await uploadToS3('https://s3/x', IMAGE.uri, 'image/jpeg').catch((e) => e);
    expect(err).toBe(original);
    expect(classifyUploadFailure(err)).toBe('local');
    expect(decideJobFailure([classifyUploadFailure(err)])).toEqual({ type: 'keep', incrementAttempts: true });
  });
});

describe('uploadImage 서명 재발급', () => {
  it('저장된 서명 403 → 새 prepare 로 폴백 → 새 서명으로도 403 이면 local(재시도 5회 상한 대상)', async () => {
    uploadAsync.mockResolvedValue({ status: 403 });

    const err = await uploadImage(IMAGE, undefined, undefined, undefined, { prepared: PREPARED }).catch((e) => e);

    expect(post).toHaveBeenCalledWith('/media/upload/prepare', expect.anything());
    expect(uploadAsync).toHaveBeenCalledTimes(2);
    expect(err).toBeInstanceOf(S3UploadError);
    expect(err.afterReissue).toBe(true);
    expect(err.message).toBe('PRESIGNED_EXPIRED');
    expect(classifyUploadFailure(err)).toBe('local');
  });

  it('저장된 서명 403 → 새 서명 PUT 성공이면 완료', async () => {
    uploadAsync.mockResolvedValueOnce({ status: 403 }).mockResolvedValueOnce({ status: 200 });

    const result = await uploadImage(IMAGE, undefined, undefined, undefined, { prepared: PREPARED });

    expect(result).toEqual({ media_id: 'm1' });
  });

  it('재발급 없이(최초 prepare) 403 → 재발급 대상(transient)', async () => {
    uploadAsync.mockResolvedValue({ status: 403 });

    const err = await uploadImage(IMAGE).catch((e) => e);

    expect(uploadAsync).toHaveBeenCalledTimes(1);
    expect(err.afterReissue).toBe(false);
    expect(classifyUploadFailure(err)).toBe('transient');
  });

  it('저장된 서명으로 403 이 아닌 실패는 폴백하지 않고 그대로 던진다', async () => {
    uploadAsync.mockResolvedValue({ status: 500 });

    const err = await uploadImage(IMAGE, undefined, undefined, undefined, { prepared: PREPARED }).catch((e) => e);

    expect(post).not.toHaveBeenCalledWith('/media/upload/prepare', expect.anything());
    expect(err.status).toBe(500);
  });
});
