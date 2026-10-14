/**
 * Plus 안내 시트 표시 모델 단위 테스트 (PAYWALL 명세 §3.4, D7-1)
 */
import type { PaywallOfferResult, PaywallTrial } from '../../services/purchases';
import { buildUpsellSheetVM, sheetTrialFromOffer } from '../plusSheetViewModel';

const GB = 1024 * 1024 * 1024;
const TRIAL_14: PaywallTrial = { eligible: true, days: 14 };
const TRIAL_GENERIC: PaywallTrial = { eligible: true, days: null };

describe('regen', () => {
  const regen = (trial: PaywallTrial | null, isPlus = false) => buildUpsellSheetVM({ request: { variant: 'regen' }, isPlus, trial });

  it('기본 구성 — 브랜드·제목·본문(100GB)·Plus 알아보기(source=regen)·다음에 할게요', () => {
    expect(regen(null)).toEqual({
      brand: { key: 'paywall.brand' },
      title: { key: 'plusSheet.regenTitle' },
      body: { key: 'plusSheet.regenBody', params: { gb: 100 } },
      trialNote: null,
      usage: null,
      primary: { label: { key: 'plusSheet.cta' }, action: 'paywall' },
      secondary: { key: 'plusSheet.later' },
      source: 'regen',
    });
  });

  it('체험 줄 — 일수 있음 / 일수 불명 / 자격 없음·불명·조회 전', () => {
    expect(regen(TRIAL_14).trialNote).toEqual({ key: 'plusSheet.trialNote', params: { days: 14 } });
    expect(regen(TRIAL_GENERIC).trialNote).toEqual({ key: 'plusSheet.trialNoteGeneric' });
    expect(regen({ eligible: false, days: null }).trialNote).toBeNull();
    expect(regen({ eligible: null, days: null }).trialNote).toBeNull();
    expect(regen(null).trialNote).toBeNull();
  });
});

describe('storage', () => {
  const usage = { usedBytes: 2 * GB, limitBytes: 2 * GB };

  it('무료 — 제목·본문(100GB)·막대(413 값)·Plus 알아보기(source=storage)·다음에 할게요, 체험 줄 없음', () => {
    const vm = buildUpsellSheetVM({ request: { variant: 'storage', usage }, isPlus: false, trial: TRIAL_14 });
    expect(vm.title).toEqual({ key: 'plusSheet.storageTitle' });
    expect(vm.body).toEqual({ key: 'plusSheet.storageBody', params: { gb: 100 } });
    expect(vm.usage).toEqual({
      label: { key: 'plusSheet.storageLabel' },
      value: { key: 'plusSheet.usage', params: { used: '2.0 GB', limit: '2.0 GB' } },
      percent: 100,
    });
    expect(vm.trialNote).toBeNull();
    expect(vm.primary).toEqual({ label: { key: 'plusSheet.cta' }, action: 'paywall' });
    expect(vm.secondary).toEqual({ key: 'plusSheet.later' });
    expect(vm.source).toBe('storage');
  });

  it('413 본문에 값이 없으면 숫자 줄 숨김', () => {
    expect(buildUpsellSheetVM({ request: { variant: 'storage', usage: null }, isPlus: false, trial: null }).usage).toBeNull();
    expect(
      buildUpsellSheetVM({ request: { variant: 'storage', usage: { usedBytes: 1, limitBytes: 0 } }, isPlus: false, trial: null }).usage,
    ).toBeNull();
  });

  it('막대는 0~100 으로 고정', () => {
    const vm = buildUpsellSheetVM({ request: { variant: 'storage', usage: { usedBytes: 3 * GB, limitBytes: 2 * GB } }, isPlus: false, trial: null });
    expect(vm.usage?.percent).toBe(100);
  });

  it('Plus — 정리 안내(storageBodyPlus), 결제 유도 없이 확인 하나', () => {
    const vm = buildUpsellSheetVM({ request: { variant: 'storage', usage: { usedBytes: 100 * GB, limitBytes: 100 * GB } }, isPlus: true, trial: TRIAL_14 });
    expect(vm.body).toEqual({ key: 'plusSheet.storageBodyPlus', params: { gb: 100 } });
    expect(vm.primary).toEqual({ label: { key: 'plusSheet.confirm' }, action: 'close' });
    expect(vm.secondary).toBeNull();
    expect(vm.trialNote).toBeNull();
    expect(vm.usage?.value).toEqual({ key: 'plusSheet.usage', params: { used: '100.0 GB', limit: '100.0 GB' } });
  });
});

describe('sheetTrialFromOffer', () => {
  it('조회 성공 → 연간 플랜 체험, 그 외 null', () => {
    const ok: PaywallOfferResult = {
      status: 'ok',
      offer: {
        annual: { priceString: '₩44,000', perMonthPriceString: null, trial: TRIAL_14 },
        monthly: { priceString: '₩5,500', perMonthPriceString: null, trial: { eligible: false, days: null } },
        annualDiscountPercent: 33,
      },
    };
    expect(sheetTrialFromOffer(ok)).toEqual(TRIAL_14);
    expect(sheetTrialFromOffer({ status: 'load_failed' })).toBeNull();
    expect(sheetTrialFromOffer({ status: 'unavailable' })).toBeNull();
    expect(sheetTrialFromOffer(null)).toBeNull();
  });
});
