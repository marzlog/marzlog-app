/**
 * D10-c 문체 선택 — 시트 표시값·선택, 재생성 흐름, 설정 Free 잠금, 상세 라벨.
 * (jest 는 node 환경 — ToneSheet 렌더는 표시값을 만드는 buildToneSheetVM 으로 확인한다)
 */
import {
  DEFAULT_DIARY_TONE,
  DIARY_TONES,
  isDiaryTone,
  isToneUiEnabled,
  resolveDiaryTone,
} from '../../constants/diaryTones';
import {
  TONE_DESC_KEYS,
  TONE_LABEL_KEYS,
  buildToneSheetVM,
  resolveRegenToneFlow,
  resolveSettingsToneChange,
  showToneRow,
  toneDetailLabel,
} from '../toneViewModel';

describe('톤 정본 — 백엔드 app/constants/diary_tones.py 와 같다', () => {
  it('sincere|literary|plain, 기본 sincere', () => {
    expect(DIARY_TONES).toEqual(['sincere', 'literary', 'plain']);
    expect(DEFAULT_DIARY_TONE).toBe('sincere');
  });

  it.each([null, undefined, '', 'poetic', 'SINCERE', 1])('허용 밖(%p)은 기본 톤 — 서버 resolve_tone 과 같다', (v) => {
    expect(isDiaryTone(v)).toBe(false);
    expect(resolveDiaryTone(v)).toBe('sincere');
  });

  it.each([
    ['ko', true],
    ['en', true],
    ['vi', false],
    ['th', false],
    [null, false],
    [undefined, false],
  ] as const)('문체 UI 언어 %p → %p (vi/th 는 전부 숨김)', (lang, expected) => {
    expect(isToneUiEnabled(lang)).toBe(expected);
  });
});

describe('buildToneSheetVM — 3카드', () => {
  it('정성·문학적·간결 순서로 라벨·설명 키를 싣는다', () => {
    const vm = buildToneSheetVM({ defaultTone: 'sincere', selected: 'sincere', isPlus: true, showLocks: false });
    expect(vm.cards.map((c) => c.tone)).toEqual(['sincere', 'literary', 'plain']);
    expect(vm.cards.map((c) => c.label.key)).toEqual(['tone.sincere', 'tone.literary', 'tone.plain']);
    expect(vm.cards.map((c) => c.description.key)).toEqual(['tone.sincereDesc', 'tone.literaryDesc', 'tone.plainDesc']);
  });

  it('현재 기본 문체 1장에만 "기본", 선택은 selected 1장', () => {
    const vm = buildToneSheetVM({ defaultTone: 'literary', selected: 'plain', isPlus: true, showLocks: false });
    expect(vm.cards.filter((c) => c.isDefault).map((c) => c.tone)).toEqual(['literary']);
    expect(vm.cards.filter((c) => c.selected).map((c) => c.tone)).toEqual(['plain']);
  });

  it('기본 문체가 없거나 오염이면 sincere 가 기본', () => {
    for (const defaultTone of [null, undefined, 'poetic']) {
      const vm = buildToneSheetVM({ defaultTone, selected: 'sincere', isPlus: true, showLocks: false });
      expect(vm.cards.find((c) => c.isDefault)?.tone).toBe('sincere');
    }
  });

  it('Free·잠금 표시면 literary·plain 만 잠금, sincere 는 열림', () => {
    const vm = buildToneSheetVM({ defaultTone: 'sincere', selected: 'sincere', isPlus: false, showLocks: true });
    expect(vm.cards.map((c) => [c.tone, c.locked])).toEqual([
      ['sincere', false],
      ['literary', true],
      ['plain', true],
    ]);
  });

  it('Plus 이거나 잠금 표시를 끄면 잠금 없음', () => {
    for (const [isPlus, showLocks] of [
      [true, true],
      [false, false],
    ] as const) {
      const vm = buildToneSheetVM({ defaultTone: 'sincere', selected: 'sincere', isPlus, showLocks });
      expect(vm.cards.some((c) => c.locked)).toBe(false);
    }
  });
});

describe('resolveRegenToneFlow — 재생성 흐름', () => {
  it('Plus·비복구·ko/en → 문체 시트', () => {
    expect(resolveRegenToneFlow({ isPlus: true, isRecovery: false, lang: 'ko' })).toBe('tone-sheet');
    expect(resolveRegenToneFlow({ isPlus: true, isRecovery: false, lang: 'en' })).toBe('tone-sheet');
  });

  it.each([
    [{ isPlus: true, isRecovery: true, lang: 'ko' }, '실패 복구는 시트 없이 기존대로'],
    [{ isPlus: false, isRecovery: true, lang: 'ko' }, 'Free 복구도 기존대로'],
    [{ isPlus: false, isRecovery: false, lang: 'ko' }, 'Free 는 시트 대상 아님(앞단에서 PlusUpsellSheet)'],
    [{ isPlus: true, isRecovery: false, lang: 'vi' }, 'vi 는 숨김(기본 톤)'],
    [{ isPlus: true, isRecovery: false, lang: 'th' }, 'th 는 숨김(기본 톤)'],
  ] as const)('%p → direct (%s)', (input, _why) => {
    expect(resolveRegenToneFlow(input)).toBe('direct');
  });
});

describe('resolveSettingsToneChange — 설정 기본 문체(Free 잠금)', () => {
  it('Free 가 literary·plain 을 고르면 upsell(변경 안 함)', () => {
    expect(resolveSettingsToneChange({ current: 'sincere', next: 'literary', isPlus: false })).toBe('upsell');
    expect(resolveSettingsToneChange({ current: 'sincere', next: 'plain', isPlus: false })).toBe('upsell');
  });

  it('Free 가 sincere 로 되돌리는 것은 저장(해지 뒤 남은 Plus 문체 정리)', () => {
    expect(resolveSettingsToneChange({ current: 'literary', next: 'sincere', isPlus: false })).toBe('save');
  });

  it('Plus 는 모든 문체 저장', () => {
    for (const next of DIARY_TONES) {
      const current = next === 'plain' ? 'sincere' : 'plain';
      expect(resolveSettingsToneChange({ current, next, isPlus: true })).toBe('save');
    }
  });

  it('같은 값이면 noop — 값 없음은 sincere 로 본다', () => {
    expect(resolveSettingsToneChange({ current: 'literary', next: 'literary', isPlus: true })).toBe('noop');
    expect(resolveSettingsToneChange({ current: null, next: 'sincere', isPlus: false })).toBe('noop');
    expect(resolveSettingsToneChange({ current: undefined, next: 'sincere', isPlus: true })).toBe('noop');
  });
});

describe('toneDetailLabel — 상세 "문체: ○○"', () => {
  it('literary·plain 은 라벨', () => {
    expect(toneDetailLabel('literary', 'ko')).toEqual({ key: 'mediaDetail.toneLabel', toneKey: 'tone.literary' });
    expect(toneDetailLabel('plain', 'en')).toEqual({ key: 'mediaDetail.toneLabel', toneKey: 'tone.plain' });
  });

  it.each([
    ['sincere', 'ko'],
    [null, 'ko'],
    [undefined, 'ko'],
    ['poetic', 'ko'],
    ['literary', 'vi'],
    ['literary', 'th'],
  ] as const)('표시 안 함 (%p, %p)', (tone, lang) => {
    expect(toneDetailLabel(tone, lang)).toBeNull();
  });
});

it.each([
  ['ko', true],
  ['en', true],
  ['vi', false],
  ['th', false],
  [null, false],
] as const)('비교표 "문체 선택" 행 — %p → %p', (lang, expected) => {
  expect(showToneRow(lang)).toBe(expected);
});

it('라벨·설명 키 표는 톤 3개를 모두 덮는다', () => {
  expect(Object.keys(TONE_LABEL_KEYS).sort()).toEqual([...DIARY_TONES].sort());
  expect(Object.keys(TONE_DESC_KEYS).sort()).toEqual([...DIARY_TONES].sort());
});
