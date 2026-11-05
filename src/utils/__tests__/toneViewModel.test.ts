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
  resolveToneSaveResponse,
  shouldRememberTone,
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
  it('진솔·문학적·간결 순서로 라벨·설명 키를 싣는다', () => {
    const vm = buildToneSheetVM({ lastUsedTone: 'sincere', selected: 'sincere', isPlus: true, showLocks: false });
    expect(vm.cards.map((c) => c.tone)).toEqual(['sincere', 'literary', 'plain']);
    expect(vm.cards.map((c) => c.label.key)).toEqual(['tone.sincere', 'tone.literary', 'tone.plain']);
    expect(vm.cards.map((c) => c.description.key)).toEqual(['tone.sincereDesc', 'tone.literaryDesc', 'tone.plainDesc']);
  });

  it('최근 문체 1장에만 "최근", 선택은 selected 1장', () => {
    const vm = buildToneSheetVM({ lastUsedTone: 'literary', selected: 'plain', isPlus: true, showLocks: false });
    expect(vm.cards.filter((c) => c.isLastUsed).map((c) => c.tone)).toEqual(['literary']);
    expect(vm.cards.filter((c) => c.selected).map((c) => c.tone)).toEqual(['plain']);
  });

  it('최근 문체가 없거나 오염이면 sincere 가 최근', () => {
    for (const lastUsedTone of [null, undefined, 'poetic']) {
      const vm = buildToneSheetVM({ lastUsedTone, selected: 'sincere', isPlus: true, showLocks: false });
      expect(vm.cards.find((c) => c.isLastUsed)?.tone).toBe('sincere');
    }
  });

  it('Free·잠금 표시면 literary·plain 만 잠금, sincere 는 열림', () => {
    const vm = buildToneSheetVM({ lastUsedTone: 'sincere', selected: 'sincere', isPlus: false, showLocks: true });
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
      const vm = buildToneSheetVM({ lastUsedTone: 'sincere', selected: 'sincere', isPlus, showLocks });
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

describe('toneDetailLabel — 상세 "문체: ○○" (D10-c2: sincere 포함 3톤 표시)', () => {
  it.each([
    ['sincere', 'ko', 'tone.sincere'],
    ['literary', 'ko', 'tone.literary'],
    ['plain', 'en', 'tone.plain'],
  ] as const)('%p (%p) → 라벨 %p', (tone, lang, toneKey) => {
    expect(toneDetailLabel(tone, lang)).toEqual({ key: 'mediaDetail.toneLabel', toneKey });
  });

  it.each([
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

describe('buildToneSheetVM.current — 재생성 시트 "지금 문체: ○○" (D10-c2)', () => {
  it.each([
    ['sincere', 'tone.sincere'],
    ['literary', 'tone.literary'],
    ['plain', 'tone.plain'],
  ] as const)('카드 문체 %p → %p', (currentTone, toneKey) => {
    const vm = buildToneSheetVM({ lastUsedTone: 'sincere', selected: 'sincere', isPlus: true, showLocks: false, currentTone });
    expect(vm.current).toEqual({ key: 'tone.currentLabel', toneKey });
  });

  it.each([null, undefined, 'poetic'])('값 없음·허용 밖(%p)이면 줄 생략', (currentTone) => {
    const vm = buildToneSheetVM({ lastUsedTone: 'sincere', selected: 'sincere', isPlus: true, showLocks: false, currentTone });
    expect(vm.current).toBeNull();
  });

  it('설정 시트(currentTone 미전달)는 줄 생략', () => {
    expect(buildToneSheetVM({ lastUsedTone: 'plain', selected: 'plain', isPlus: true, showLocks: true }).current).toBeNull();
  });
});

describe('resolveToneSaveResponse — 재생성 후 최근 문체 저장 판정 (D10-c2 A안)', () => {
  it('응답 diary_tone 이 요청과 같으면 그 값으로 성공', () => {
    expect(resolveToneSaveResponse('literary', { diary_tone: 'literary' })).toEqual({ ok: true, diaryTone: 'literary' });
    expect(resolveToneSaveResponse('sincere', { diary_tone: 'sincere' })).toEqual({ ok: true, diaryTone: 'sincere' });
  });

  it.each([
    [{ diary_tone: 'plain' }, '서버가 다른 값을 돌려줌(이전 값 유지)'],
    [{}, '응답에 diary_tone 없음(구 서버)'],
    [{ diary_tone: null }, 'null'],
    [{ diary_tone: 'poetic' }, '허용 밖'],
    [null, '응답 없음'],
  ] as const)('%p → 실패 (%s)', (response, _why) => {
    expect(resolveToneSaveResponse('literary', response as any)).toEqual({ ok: false });
  });
});

describe('shouldRememberTone — 재생성 후 최근 문체 PATCH 여부 (D10-c2 A안)', () => {
  it('고른 문체가 저장된 값과 다르면 저장', () => {
    expect(shouldRememberTone('plain', 'literary')).toBe(true);
    expect(shouldRememberTone(null, 'plain')).toBe(true);
  });

  it('같으면(값 없음은 sincere 로 본다) PATCH 하지 않는다', () => {
    expect(shouldRememberTone('literary', 'literary')).toBe(false);
    expect(shouldRememberTone(null, 'sincere')).toBe(false);
    expect(shouldRememberTone(undefined, 'sincere')).toBe(false);
  });

  it('문체 없이 재생성(복구·vi/th)하면 저장하지 않는다', () => {
    expect(shouldRememberTone('plain', undefined)).toBe(false);
    expect(shouldRememberTone('plain', null)).toBe(false);
  });
});
