import { resolvePurchasesSetup } from '../purchasesGuard';

const base = { hasNativeModule: true, iosKey: 'appl_test', androidKey: 'goog_test' };

describe('resolvePurchasesSetup', () => {
  it('iOS 는 iOS 키를 쓴다', () => {
    expect(resolvePurchasesSetup({ ...base, platform: 'ios' })).toEqual({ ok: true, apiKey: 'appl_test' });
  });

  it('Android 는 Android 키를 쓴다', () => {
    expect(resolvePurchasesSetup({ ...base, platform: 'android' })).toEqual({ ok: true, apiKey: 'goog_test' });
  });

  it('web 은 네이티브 모듈·키 유무와 무관하게 skip', () => {
    expect(resolvePurchasesSetup({ ...base, platform: 'web' })).toEqual({ ok: false, reason: 'web' });
  });

  it('네이티브 모듈 부재(RC 도입 전 1.0.2 런타임)는 키가 있어도 skip', () => {
    expect(resolvePurchasesSetup({ ...base, platform: 'ios', hasNativeModule: false })).toEqual({
      ok: false,
      reason: 'no-native-module',
    });
  });

  it('해당 플랫폼 키 미주입이면 skip — 다른 플랫폼 키로 대체하지 않는다', () => {
    expect(resolvePurchasesSetup({ ...base, platform: 'ios', iosKey: undefined })).toEqual({
      ok: false,
      reason: 'no-api-key',
    });
  });

  it('공백뿐인 키는 미주입으로 본다', () => {
    expect(resolvePurchasesSetup({ ...base, platform: 'android', androidKey: '  ' })).toEqual({
      ok: false,
      reason: 'no-api-key',
    });
  });

  it('지원하지 않는 플랫폼은 키 없음으로 skip', () => {
    expect(resolvePurchasesSetup({ ...base, platform: 'windows' })).toEqual({ ok: false, reason: 'no-api-key' });
  });
});
